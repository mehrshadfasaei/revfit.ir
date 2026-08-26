"""
API اصلی فروشگاه.

اجرا:
    uvicorn main:app --reload --port 8000

بعد از اجرا:
    مستندات خودکار API:  http://127.0.0.1:8000/docs
    لیست محصولات:        http://127.0.0.1:8000/api/products
"""

import os
import random
import string
import uuid
import html
import io
import hmac
import hashlib
import base64
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_, inspect, text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from PIL import Image

from database import Base, engine, get_db, IS_SQLITE
from security_utils import get_real_ip, security_logger, get_lockout_minutes
import models
import schemas
import sms
import email_notify
import auth as customer_auth

# متغیرهای محیطی رو از فایل .env (کنار همین main.py) می‌خونه.
# روی هاست واقعی (لیارا و امثالش)، این متغیرها معمولاً از
# پنل خود هاست ست می‌شن، نه از فایل .env - بدون مشکل کار می‌کنه.
load_dotenv()

def clear_stale_database_locks():
    """
    اگه یه دیپلوی قبلی کرش کرده باشه، ممکنه یه اتصال نیمه‌باز
    به دیتابیس جا گذاشته باشه که هنوز قفل رو یه جدول نگه داشته -
    و همین قفل جلوی هر عملیات جدیدی (حتی یه SELECT ساده، یا
    حتی create_all پایین‌تر) رو می‌گیره. این تابع، قبل از هر
    کاری، هر اتصال دیگه‌ای (غیر از خودمون) به همین دیتابیس رو
    می‌بنده تا این‌جور قفل‌های یتیم‌مونده خودکار پاک بشن. فقط
    روی PostgreSQL معنی داره (SQLite اصلاً این مفهوم رو نداره).
    """

    if IS_SQLITE:
        return

    try:
        with engine.connect() as conn:
            conn.execute(text("""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = current_database()
                  AND pid != pg_backend_pid()
            """))
            conn.commit()
        print("✅ اتصال‌های قدیمی/نیمه‌باز احتمالی به دیتابیس بسته شدن")
    except Exception as e:
        print(f"⚠️  پاک‌کردن اتصال‌های قدیمی با خطا مواجه شد (ادامه می‌دیم): {e}")


clear_stale_database_locks()

# ساخت جدول‌ها (اگه وجود نداشته باشن)
Base.metadata.create_all(bind=engine)


def auto_migrate_missing_columns():
    """
    create_all() فقط جدول‌های کاملاً جدید رو می‌سازه؛ اگه یه
    ستون تازه به یه مدل اضافه کنیم ولی جدولش از قبل روی دیتابیس
    (مخصوصاً PostgreSQL واقعی که دیتای واقعی داره) وجود داشته
    باشه، create_all دست‌نخورده ولش می‌کنه - و بک‌اند موقع
    استفاده از اون ستون کرش می‌کنه.

    این تابع خودش چک می‌کنه هر جدول چه ستون‌هایی کم داره و با
    ALTER TABLE اضافه‌شون می‌کنه - هم روی PostgreSQL هم SQLite
    کار می‌کنه. جایگزین کامل Alembic نیست، ولی برای اضافه‌کردن
    ستون‌های ساده (که همیشه کاری هست که اینجا می‌کنیم) کافیه.
    """

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue  # جدول کاملاً جدیده، create_all خودش ساختتش

        existing_columns = {col["name"] for col in inspector.get_columns(table.name)}

        for column in table.columns:
            if column.name in existing_columns:
                continue

            col_type = column.type.compile(dialect=engine.dialect)

            default_clause = ""
            if column.default is not None and getattr(column.default, "is_scalar", False):
                default_value = column.default.arg
                if isinstance(default_value, bool):
                    default_clause = f" DEFAULT {'TRUE' if default_value else 'FALSE'}"
                elif isinstance(default_value, (int, float)):
                    default_clause = f" DEFAULT {default_value}"
                elif isinstance(default_value, str):
                    default_clause = f" DEFAULT '{default_value}'"

            try:
                with engine.connect() as conn:
                    conn.execute(text(
                        f"ALTER TABLE {table.name} ADD COLUMN {column.name} {col_type}{default_clause}"
                    ))
                    conn.commit()
                print(f"✅ ستون {column.name} به جدول {table.name} اضافه شد (auto-migrate)")
            except Exception as e:
                print(f"⚠️  اضافه‌کردن ستون {column.name} به جدول {table.name} با خطا مواجه شد: {e}")


try:
    auto_migrate_missing_columns()
except Exception as e:
    # حتی اگه این مرحله fail بشه، نباید کل بک‌اند بالا نیاد -
    # فقط لاگش می‌کنیم و ادامه می‌دیم (بخش‌هایی از سایت که به
    # اون ستون خاص نیاز ندارن، همچنان درست کار می‌کنن)
    print(f"⚠️  auto-migrate با خطا مواجه شد (بک‌اند همچنان بالا میاد): {e}")

app = FastAPI(title="Guardian Shop API")

# ---------------------------------------------------------
#   سرو مستقیم پوشه‌ی images توسط خودِ بک‌اند

#   قبلاً چون فرانت‌اند و بک‌اند روی یه سرور بودن، مسیر نسبی
#   (../images/...) کافی بود. الان که هرکدوم روی یه دامنه‌ی
#   جدان (فرانت روی گیت‌هاب، بک‌اند روی Render)، عکس‌هایی که
#   از پنل ادمین آپلود می‌شن باید از خودِ همین بک‌اند قابل
#   دسترسی باشن، با یه آدرس کامل.
# ---------------------------------------------------------

IMAGES_DIR_FOR_MOUNT = Path(__file__).resolve().parent.parent / "images"
IMAGES_DIR_FOR_MOUNT.mkdir(exist_ok=True)

app.mount("/images", StaticFiles(directory=IMAGES_DIR_FOR_MOUNT), name="images")

# ---------------------------------------------------------
#   RATE LIMITING (جلوگیری از Brute Force و اسپم درخواست)
# ---------------------------------------------------------

limiter = Limiter(key_func=get_real_ip)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ---------------------------------------------------------
#   جلوگیری از افشای خطاهای داخلی پایتون به کاربر نهایی
#   (پیام کامل خطا فقط توی ترمینال خودت چاپ می‌شه، نه
#   توی جوابی که کاربر می‌بینه)
# ---------------------------------------------------------

@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"⚠️  خطای داخلی سرور: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "مشکلی توی سرور پیش اومد. لطفاً بعداً دوباره امتحان کن."}
    )


# ---------------------------------------------------------
#   محدودیت حجم کل درخواست - جلوی ارسال یه پیام غول‌پیکر رو
#   می‌گیره (حتی قبل از خوندن کاملش)، تا کسی نتونه با فرستادن
#   یه متن خیلی طولانی، سرور رو کند/مشغول کنه. سقف رو یه‌کم
#   بالاتر از حداکثر عکس (۵ مگابایت) گذاشتیم که آپلود عکس خراب
#   نشه.
# ---------------------------------------------------------

MAX_REQUEST_BODY_BYTES = 7 * 1024 * 1024   # ۷ مگابایت


@app.middleware("http")
async def limit_request_body_size(request: Request, call_next):
    content_length = request.headers.get("content-length")

    if content_length and int(content_length) > MAX_REQUEST_BODY_BYTES:
        return JSONResponse(
            status_code=413,
            content={"detail": "حجم درخواست خیلی زیاده."}
        )

    return await call_next(request)


# ---------------------------------------------------------
#   هدرهای امنیتی HTTP (طبق OWASP Secure Headers Project)
#   این هدرها روی هر پاسخی که بک‌اند می‌ده اضافه می‌شن و به
#   مرورگر می‌گن چه رفتار امن‌تری داشته باشه.
# ---------------------------------------------------------

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # فقط وقتی روی HTTPS واقعی (نه لوکال‌هاست) اجرا بشه معنی داره؛
    # روی هاست واقعی مرورگر رو مجبور می‌کنه همیشه از HTTPS استفاده کنه
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"

    return response

# CORS: فقط آدرس‌هایی که توی ALLOWED_ORIGINS (با کاما جدا) هستن
# اجازه‌ی دسترسی به API رو دارن. برای توسعه‌ی محلی، آدرس سرور
# استاتیک (http://127.0.0.1:5500) رو اینجا داریم.
# موقع دیپلوی، این متغیر رو توی پنل هاست بک‌اند به آدرس واقعی
# فرانت‌اند عوض کن، مثلاً:
# ALLOWED_ORIGINS=https://guardianshop.liara.app
allowed_origins_env = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://127.0.0.1:5500,http://localhost:5500"
)
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    # لازم برای کوکی httpOnly رفرش‌توکن حساب کاربری مشتری‌ها (cross-origin).
    # چون allow_origins یه لیست مشخصه (نه "*")، امن باقی می‌مونه.
    allow_credentials=True,
)


# ---------------------------------------------------------
#   ADMIN AUTH (رمز به‌صورت هش‌شده - bcrypt)

#   به‌جای اینکه رمز رو مستقیم متن‌ساده جایی نگه داریم، فقط
#   هَش (bcrypt) رمز رو داریم. حتی اگه فایل .env لو بره، رمز
#   واقعی از روی هش قابل بازیابی نیست.

#   موقع دیپلوی حتماً ADMIN_PASSWORD_HASH رو توی پنل هاست
#   بک‌اند ست کن (نه خود رمز رو، بلکه هَشش رو - پایین‌تر
#   توضیح دادم چطور بسازیش).
# ---------------------------------------------------------

import bcrypt

ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")

if not ADMIN_PASSWORD_HASH:
    # عمداً هیچ رمز پیش‌فرضی نمی‌ذاریم - چون این کد روی گیت‌هاب
    # پابلیکه، اگه یه رمز پیش‌فرض ثابت اینجا می‌نوشتیم، هرکسی
    # می‌تونست ببینتش. به‌جاش، اگه این متغیر ست نشده باشه،
    # ترجیح می‌دیم بک‌اند اصلاً بالا نیاد (خطای واضح بده) تا
    # اینکه بی‌سروصدا یه رمز شناخته‌شده رو قبول کنه.
    raise RuntimeError(
        "ADMIN_PASSWORD_HASH ست نشده! برای امنیت، بدون این متغیر بک‌اند اجرا نمی‌شه. "
        "با hash_password.py یه رمز بساز و توی .env یا Environment Variables هاست قرارش بده."
    )

def check_admin_password(submitted_password: str) -> bool:
    try:
        return bcrypt.checkpw(submitted_password.encode(), ADMIN_PASSWORD_HASH.encode())
    except Exception:
        return False


# ---------------------------------------------------------
#   ADMIN SESSION TOKEN (به‌جای برگردوندن خودِ رمز عبور)

#   قبلاً موقع لاگین، خودِ رمزی که کاربر تایپ کرده بود به‌عنوان
#   "کلید" برمی‌گشت و همیشگی معتبر بود - یعنی اگه یه‌جا (مثلاً
#   localStorage مرورگر، از طریق XSS یا بدافزار) لو می‌رفت، رمز
#   واقعی حساب لو رفته بود، برای همیشه.
#
#   حالا به‌جاش یه توکن امضاشده (HMAC-SHA256) با تاریخ انقضا
#   می‌سازیم. حتی اگه این توکن لو بره، فقط تا چند ساعت معتبره و
#   رمز واقعی توش نیست. برای امضا از یه کلید مخفی سمت سرور
#   استفاده می‌شه (ترجیحاً ADMIN_SESSION_SECRET جدا، وگرنه از
#   روی خودِ هَش رمز مشتق می‌شه - چیزی که کاربر نهایی هیچ‌وقت
#   نمی‌بینتش).
# ---------------------------------------------------------

ADMIN_SESSION_SECRET = os.environ.get("ADMIN_SESSION_SECRET") or hashlib.sha256(
    ADMIN_PASSWORD_HASH.encode()
).hexdigest()

ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60  # ۸ ساعت؛ بعدش باید دوباره لاگین کنی


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_admin_token() -> str:
    payload_bytes = json.dumps({"exp": time.time() + ADMIN_SESSION_TTL_SECONDS}).encode()
    payload_b64 = _b64url_encode(payload_bytes)
    signature = hmac.new(ADMIN_SESSION_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_admin_token(token: str) -> bool:
    try:
        payload_b64, signature = token.split(".", 1)
        expected_signature = hmac.new(ADMIN_SESSION_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return False

        payload = json.loads(_b64url_decode(payload_b64))
        return payload.get("exp", 0) > time.time()
    except Exception:
        return False


def verify_admin(request: Request, x_admin_key: str = Header(default=None)):
    if not x_admin_key or not verify_admin_token(x_admin_key):
        security_logger.info(f"تلاش ناموفق دسترسی ادمین از IP {get_real_ip(request)}")
        raise HTTPException(status_code=401, detail="نشست منقضی شده - لطفاً دوباره وارد شو")
    return True


@app.post("/api/admin/login")
@limiter.limit("10/minute")
def admin_login(request: Request, payload: dict, db: Session = Depends(get_db)):
    ip = get_real_ip(request)
    submitted = payload.get("password", "")

    attempt = db.query(models.LoginAttempt).filter(models.LoginAttempt.ip_address == ip).first()
    if not attempt:
        attempt = models.LoginAttempt(ip_address=ip, failed_count=0, lockout_count=0)
        db.add(attempt)
        db.flush()

    now = datetime.utcnow()

    # اگه الان توی دوره‌ی قفل هستیم، اصلاً رمز رو چک نمی‌کنیم
    if attempt.locked_until and now < attempt.locked_until:
        remaining_seconds = int((attempt.locked_until - now).total_seconds())
        remaining_minutes = max(1, remaining_seconds // 60 + (1 if remaining_seconds % 60 else 0))
        security_logger.info(f"تلاش لاگین در حین قفل‌بودن از IP {ip}")
        raise HTTPException(
            status_code=429,
            detail={
                "message": f"به‌خاطر تلاش‌های ناموفق زیاد، فعلاً قفله. حدود {remaining_minutes} دقیقه‌ی دیگه دوباره امتحان کن.",
                "retryAfterSeconds": remaining_seconds
            }
        )

    if check_admin_password(submitted):
        # لاگین موفق - همه‌چیز رو صفر کن
        attempt.failed_count = 0
        attempt.lockout_count = 0
        attempt.locked_until = None
        attempt.updated_at = now
        db.commit()

        security_logger.info(f"لاگین موفق ادمین از IP {ip}")
        return {"key": create_admin_token()}

    # رمز اشتباه بود
    attempt.failed_count += 1
    attempt.updated_at = now

    security_logger.info(f"لاگین ناموفق ادمین از IP {ip} (تلاش {attempt.failed_count} از این دوره)")

    if attempt.failed_count >= 3:
        attempt.lockout_count += 1
        lockout_minutes = get_lockout_minutes(attempt.lockout_count)
        attempt.locked_until = now + timedelta(minutes=lockout_minutes)
        attempt.failed_count = 0

        db.commit()

        security_logger.info(f"قفل‌شدن IP {ip} برای {lockout_minutes} دقیقه (دور {attempt.lockout_count})")

        raise HTTPException(
            status_code=429,
            detail={
                "message": f"۳ بار رمز اشتباه زدی. برای {lockout_minutes} دقیقه قفل شدی.",
                "retryAfterSeconds": lockout_minutes * 60
            }
        )

    db.commit()
    raise HTTPException(status_code=401, detail="رمز اشتباهه")


# ---------------------------------------------------------
#   IMAGE UPLOAD (برای پنل ادمین - آپلود عکس محصول جدید)
# ---------------------------------------------------------

IMAGES_DIR = Path(__file__).resolve().parent.parent / "images"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_SIZE_MB = 5


EXTENSION_TO_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


@app.post("/api/admin/upload-image", dependencies=[Depends(verify_admin)])
@limiter.limit("20/minute")
async def upload_image(request: Request, file: UploadFile = File(...), db: Session = Depends(get_db)):
    extension = Path(file.filename).suffix.lower() or ".png"

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="فقط فایل تصویری (jpg, png, webp, gif) مجازه")

    contents = await file.read()

    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"حجم عکس نباید بیشتر از {MAX_IMAGE_SIZE_MB} مگابایت باشه")

    # چک واقعی محتوا: مطمئن می‌شیم فایل واقعاً یه عکس معتبره،
    # نه یه فایل مخرب که فقط پسوندش رو عکس گذاشتن
    try:
        image = Image.open(io.BytesIO(contents))
        image.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="فایل آپلودشده یه عکس معتبر نیست")

    # عکس رو مستقیم توی دیتابیس ذخیره می‌کنیم (نه روی دیسک سرور) -
    # چون دیسک هاست‌های رایگان موقتیه و با هر دیپلوی پاک می‌شه،
    # ولی خودِ دیتابیس (روی PostgreSQL) دائمیه.
    image_id = uuid.uuid4().hex

    db_image = models.StoredImage(
        id=image_id,
        content_type=EXTENSION_TO_MIME.get(extension, "application/octet-stream"),
        data=contents,
    )
    db.add(db_image)
    db.commit()

    # آدرس کامل، چون فرانت‌اند ممکنه روی یه دامنه‌ی کاملاً جدا باشه
    # (مثلاً گیت‌هاب پیجز) و مسیر نسبی دیگه کار نمی‌کنه
    return {"path": f"{str(request.base_url).rstrip('/')}/api/images/{image_id}"}


@app.get("/api/images/{image_id}")
def get_stored_image(image_id: str, db: Session = Depends(get_db)):
    db_image = db.query(models.StoredImage).filter(models.StoredImage.id == image_id).first()

    if not db_image:
        raise HTTPException(status_code=404, detail="عکس پیدا نشد")

    return Response(
        content=db_image.data,
        media_type=db_image.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"}
    )


# ---------------------------------------------------------
#   SEED: اگه جدول محصولات خالیه، همون ۴ محصول واقعی رو بریز توش
# ---------------------------------------------------------
def seed_products():
    db = next(get_db())
    if db.query(models.Product).count() > 0:
        return

    real_products = [
        {"title": "تی‌شرت مسیر موتورسواری", "price": 450000, "category": "تی‌شرت",
         "image": "../images//product1.png", "rating": 4.8, "sales": 412},
        {"title": "هودی کلاسیک بایکر", "price": 890000, "category": "هودی",
         "image": "../images//product2.png", "rating": 4.5, "sales": 355},
        {"title": "تی‌شرت طرح جمجمه رایدر", "price": 480000, "category": "تی‌شرت",
         "image": "../images//product3.png", "rating": 4.9, "sales": 501},
        {"title": "هودی طرح عقاب موتورسوار", "price": 950000, "category": "هودی",
         "image": "../images//product4.png", "rating": 4.6, "sales": 289},
    ]

    for p in real_products:
        db_product = models.Product(**p)
        db.add(db_product)
        db.flush()

        for size in ["S", "M", "L", "XL", "2XL"]:
            db.add(models.ProductStock(product_id=db_product.id, size=size, quantity=10))

    db.commit()


seed_products()


# ---------------------------------------------------------
#   PRODUCTS (خواندن - عمومی)
# ---------------------------------------------------------

@app.get("/api/products", response_model=list[schemas.ProductOut])
def list_products(search: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Product).filter(models.Product.is_archived == False)

    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(models.Product.title.ilike(like), models.Product.category.ilike(like))
        )

    return query.all()


@app.get("/api/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.is_archived == False
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")
    return product


@app.get("/api/admin/products", response_model=list[schemas.ProductOut], dependencies=[Depends(verify_admin)])
def list_all_products_for_admin(db: Session = Depends(get_db)):
    """برخلاف /api/products (که فقط عمومیه)، این یکی محصولات
    بایگانی‌شده رو هم نشون می‌ده - چون خودِ ادمین باید بتونه
    ببینتشون و در صورت نیاز دوباره فعالشون کنه."""

    return db.query(models.Product).all()


# ---------------------------------------------------------
#   PRODUCTS (نوشتن - فقط ادمین)
# ---------------------------------------------------------

@app.post("/api/products", response_model=schemas.ProductOut, dependencies=[Depends(verify_admin)])
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    data = product.dict()
    image_urls = data.pop("images", [])
    stock_items = data.pop("stock", [])

    data["title"] = sanitize_text(data["title"])
    data["category"] = sanitize_text(data["category"])
    if data.get("description"):
        data["description"] = sanitize_text(data["description"])

    db_product = models.Product(**data)
    db.add(db_product)
    db.flush()  # تا db_product.id پر بشه

    for i, url in enumerate(image_urls):
        db.add(models.ProductImage(product_id=db_product.id, image_url=url, sort_order=i))

    for item in stock_items:
        db.add(models.ProductStock(product_id=db_product.id, size=item["size"], quantity=max(0, item["quantity"])))

    db.commit()
    db.refresh(db_product)
    return db_product


@app.put("/api/products/{product_id}", response_model=schemas.ProductOut, dependencies=[Depends(verify_admin)])
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")

    for field, value in product.dict(exclude_unset=True).items():

        if field in ("title", "category", "description") and value is not None:
            value = sanitize_text(value)

        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)
    return db_product


@app.delete("/api/products/{product_id}", dependencies=[Depends(verify_admin)])
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")

    # اگه این محصول توی یه سفارش قبلی (حتی قدیمی) استفاده شده،
    # نمی‌شه واقعاً حذفش کرد - چون سفارش‌ها باید سابقه‌شون دست‌نخورده
    # بمونه. به‌جاش فقط «بایگانی»ش می‌کنیم: از فروشگاه محو می‌شه
    # (دیگه مشتری‌ها نمی‌بیننش) ولی خودِ رکورد و سفارش‌های قدیمیش
    # سالم می‌مونن.
    has_order_history = db.query(models.OrderItem).filter(
        models.OrderItem.product_id == product_id
    ).first() is not None

    if has_order_history:
        db_product.is_archived = True
        db.commit()
        return {"deleted": False, "archived": True, "detail": "این محصول توی سفارش‌های قبلی استفاده شده، برای همین به‌جای حذف کامل، بایگانی شد (دیگه توی فروشگاه نشون داده نمی‌شه)."}

    db.delete(db_product)
    db.commit()
    return {"deleted": True, "archived": False}


# ---------------------------------------------------------
#   PRODUCT STOCK (موجودی واقعی هر سایز - فقط ادمین)
# ---------------------------------------------------------

def sync_in_stock_flag(db: Session, product_id: int):
    """وقتی موجودی همه‌ی سایزهای یه محصول صفر بشه، خودکار
    in_stock رو False می‌کنه؛ وقتی دوباره موجودی برگرده، خودکار
    True می‌کنه - دیگه لازم نیست ادمین دستی این تیک رو بزنه/برداره."""

    total = db.query(models.ProductStock).filter(
        models.ProductStock.product_id == product_id
    ).with_entities(models.ProductStock.quantity).all()

    total_quantity = sum(q[0] for q in total)

    has_any_size_rows = len(total) > 0

    if has_any_size_rows:
        db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
        if db_product:
            db_product.in_stock = total_quantity > 0


@app.put("/api/products/{product_id}/stock", response_model=schemas.ProductOut, dependencies=[Depends(verify_admin)])
def update_product_stock(product_id: int, payload: schemas.ProductStockUpdate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")

    for item in payload.stock:
        db_stock = db.query(models.ProductStock).filter(
            models.ProductStock.product_id == product_id,
            models.ProductStock.size == item.size
        ).first()

        quantity = max(0, item.quantity)

        if db_stock:
            db_stock.quantity = quantity
        else:
            db.add(models.ProductStock(product_id=product_id, size=item.size, quantity=quantity))

    db.flush()
    sync_in_stock_flag(db, product_id)

    db.commit()
    db.refresh(db_product)
    return db_product


# ---------------------------------------------------------
#   PRODUCT GALLERY IMAGES (فقط ادمین)
# ---------------------------------------------------------

@app.post("/api/products/{product_id}/images", response_model=schemas.ProductImageOut, dependencies=[Depends(verify_admin)])
def add_product_image(product_id: int, payload: schemas.ProductImageCreate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="محصول پیدا نشد")

    current_count = db.query(models.ProductImage).filter(models.ProductImage.product_id == product_id).count()

    db_image = models.ProductImage(product_id=product_id, image_url=payload.image_url, sort_order=current_count)
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image


@app.delete("/api/products/{product_id}/images/{image_id}", dependencies=[Depends(verify_admin)])
def delete_product_image(product_id: int, image_id: int, db: Session = Depends(get_db)):
    db_image = db.query(models.ProductImage).filter(
        models.ProductImage.id == image_id,
        models.ProductImage.product_id == product_id
    ).first()

    if not db_image:
        raise HTTPException(status_code=404, detail="عکس پیدا نشد")

    db.delete(db_image)
    db.commit()
    return {"deleted": True}


# ---------------------------------------------------------
#   ORDERS (خواندن - فقط ادمین)
# ---------------------------------------------------------

@app.get("/api/admin/orders", response_model=list[schemas.OrderOut], dependencies=[Depends(verify_admin)])
def list_orders(db: Session = Depends(get_db)):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).all()


# ---------------------------------------------------------
#   DASHBOARD STATS (فقط ادمین)
# ---------------------------------------------------------

from zoneinfo import ZoneInfo

TEHRAN_TZ = ZoneInfo("Asia/Tehran")


@app.get("/api/admin/stats", dependencies=[Depends(verify_admin)])
def get_dashboard_stats(db: Session = Depends(get_db)):
    now_tehran = datetime.now(TEHRAN_TZ)

    today_start_tehran = now_tehran.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start_tehran = now_tehran.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # چون created_at به‌وقت UTC ذخیره شده، مرزهای «امروز»/«این ماه» رو
    # هم به UTC تبدیل می‌کنیم تا مقایسه درست انجام بشه
    today_start_utc = today_start_tehran.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    month_start_utc = month_start_tehran.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

    all_orders = db.query(models.Order).all()

    today_orders = [o for o in all_orders if o.created_at >= today_start_utc]
    month_orders = [o for o in all_orders if o.created_at >= month_start_utc]

    def summarize(orders):
        return {
            "count": len(orders),
            "revenue": sum(o.total for o in orders)
        }

    # پرفروش‌ترین محصولات بر اساس تعداد واقعی فروخته‌شده
    top_products = db.query(models.Product).filter(models.Product.sales > 0).order_by(
        models.Product.sales.desc()
    ).limit(5).all()

    # محصولاتی که موجودیشون کمه (هر سایز ۳ یا کمتر) - برای هشدار سریع
    low_stock_rows = db.query(models.ProductStock).filter(
        models.ProductStock.quantity > 0,
        models.ProductStock.quantity <= 3
    ).all()

    low_stock_items = []
    for row in low_stock_rows:
        product = db.query(models.Product).filter(models.Product.id == row.product_id).first()
        if product:
            low_stock_items.append({
                "product_id": product.id,
                "title": product.title,
                "size": row.size,
                "quantity": row.quantity
            })

    return {
        "today": summarize(today_orders),
        "this_month": summarize(month_orders),
        "all_time": summarize(all_orders),
        "top_products": [
            {"id": p.id, "title": p.title, "sales": p.sales, "image": p.image}
            for p in top_products
        ],
        "low_stock": low_stock_items
    }


# ---------------------------------------------------------
#   CLIENT ERROR LOGGING

#   فرانت‌اند هر خطای واقعی که توی مرورگر مشتری‌ها اتفاق میفته
#   رو می‌فرسته اینجا؛ ما لاگش می‌کنیم تا توی پنل ادمین ببینیم
#   کاربرا دقیقاً به چه مشکلاتی برخوردن.
# ---------------------------------------------------------

@app.post("/api/log-error")
@limiter.limit("20/minute")
def log_client_error(request: Request, payload: schemas.ErrorLogCreate, db: Session = Depends(get_db)):
    db_log = models.ErrorLog(
        message=sanitize_text(payload.message)[:1000],
        page_url=sanitize_text(payload.pageUrl)[:500] if payload.pageUrl else None,
        user_agent=sanitize_text(payload.userAgent)[:500] if payload.userAgent else None,
        stack=sanitize_text(payload.stack)[:2000] if payload.stack else None,
    )
    db.add(db_log)
    db.commit()
    return {"logged": True}


@app.get("/api/admin/error-logs", response_model=list[schemas.ErrorLogOut], dependencies=[Depends(verify_admin)])
def list_error_logs(db: Session = Depends(get_db)):
    return db.query(models.ErrorLog).order_by(models.ErrorLog.created_at.desc()).limit(200).all()


@app.delete("/api/admin/error-logs", dependencies=[Depends(verify_admin)])
def clear_error_logs(db: Session = Depends(get_db)):
    db.query(models.ErrorLog).delete()
    db.commit()
    return {"cleared": True}


# ---------------------------------------------------------
#   CONTACT FORM (پیام‌های صفحه‌ی «تماس با ما»)
# ---------------------------------------------------------

@app.post("/api/contact")
@limiter.limit("5/minute")
def submit_contact_message(request: Request, payload: schemas.ContactMessageCreate, db: Session = Depends(get_db)):
    if payload.website:
        # Honeypot ضدربات - این فیلد باید همیشه خالی باشه
        security_logger.info(f"پیام تماس مشکوک به ربات از IP {get_real_ip(request)}")
        raise HTTPException(status_code=400, detail="ارسال پیام با مشکل مواجه شد")

    db_message = models.ContactMessage(
        name=sanitize_text(payload.name)[:200],
        contact_info=sanitize_text(payload.contactInfo)[:200],
        subject=sanitize_text(payload.subject)[:300] if payload.subject else None,
        message=sanitize_text(payload.message)[:3000],
    )
    db.add(db_message)
    db.commit()
    return {"sent": True}


@app.get("/api/admin/contact-messages", response_model=list[schemas.ContactMessageOut], dependencies=[Depends(verify_admin)])
def list_contact_messages(db: Session = Depends(get_db)):
    return db.query(models.ContactMessage).order_by(models.ContactMessage.created_at.desc()).all()


@app.put("/api/admin/contact-messages/{message_id}/read", dependencies=[Depends(verify_admin)])
def mark_contact_message_read(message_id: int, db: Session = Depends(get_db)):
    db_message = db.query(models.ContactMessage).filter(models.ContactMessage.id == message_id).first()
    if not db_message:
        raise HTTPException(status_code=404, detail="پیام پیدا نشد")
    db_message.is_read = True
    db.commit()
    return {"updated": True}


@app.delete("/api/admin/contact-messages/{message_id}", dependencies=[Depends(verify_admin)])
def delete_contact_message(message_id: int, db: Session = Depends(get_db)):
    db_message = db.query(models.ContactMessage).filter(models.ContactMessage.id == message_id).first()
    if not db_message:
        raise HTTPException(status_code=404, detail="پیام پیدا نشد")
    db.delete(db_message)
    db.commit()
    return {"deleted": True}


ALLOWED_STATUSES = ["pending", "paid", "shipped", "delivered"]


@app.put("/api/admin/orders/{order_number}/status", response_model=schemas.OrderOut, dependencies=[Depends(verify_admin)])
def update_order_status(order_number: str, payload: schemas.OrderStatusUpdate, db: Session = Depends(get_db)):
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"وضعیت نامعتبره. یکی از این‌ها باید باشه: {ALLOWED_STATUSES}")

    order = db.query(models.Order).filter(models.Order.order_number == order_number).first()
    if not order:
        raise HTTPException(status_code=404, detail="سفارش پیدا نشد")

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


# ---------------------------------------------------------
#   ORDERS (ثبت - عمومی، از صفحه‌ی checkout)
# ---------------------------------------------------------

SHIPPING_COST = 250000                                   # نرخ ثابت پیش‌فرض (وقتی به تیپاکس وصل نیستیم)

TIPAX_API_KEY = os.environ.get("TIPAX_API_KEY")


def get_shipping_cost(postal_code: str) -> int:
    """اگه TIPAX_API_KEY توی .env ست شده باشه، سعی می‌کنه هزینه‌ی
    واقعی ارسال رو از API ای‌تیپاکس (eTipax) بگیره. اگه ست نشده
    بود یا درخواست fail شد، همون نرخ ثابت رو برمی‌گردونه - یعنی
    سایت هیچ‌وقت به‌خاطر قطعی این سرویس از کار نمی‌افته.

    نکته‌ی مهم: آدرس و پارامترهای دقیق زیر باید بعد از ثبت‌نام
    توی eTipax و گرفتن مستندات API واقعی، تنظیم بشه - چون بدون
    حساب کاربری امکان تست مسیر دقیق وجود نداشت.
    """

    if not TIPAX_API_KEY:
        return SHIPPING_COST

    try:
        response = requests.post(
            "https://api.etipax.ir/v1/pricing",   # TODO: با مستندات واقعی eTipax تطبیق بده
            headers={"Authorization": f"Bearer {TIPAX_API_KEY}"},
            json={"destination_postal_code": postal_code},
            timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            estimated = data.get("price")
            if estimated:
                return int(estimated)

    except Exception as e:
        print(f"⚠️  گرفتن هزینه‌ی ارسال از تیپاکس با خطا مواجه شد: {e}")

    return SHIPPING_COST


def sanitize_text(value):
    """ورودی‌های متنی کاربر رو امن می‌کنه (جلوگیری از XSS) —
    کاراکترهای HTML خطرناک رو به معادل امنشون تبدیل می‌کنه."""

    if value is None:
        return value
    return html.escape(str(value).strip())


def generate_order_number():
    digits = "".join(random.choices(string.digits, k=6))
    return f"GS-{digits}"


@app.post("/api/orders", response_model=schemas.OrderOut)
@limiter.limit("10/minute")
def create_order(
    request: Request,
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_customer: models.Customer = Depends(customer_auth.get_optional_customer),
):
    if order.website:
        # فیلد Honeypot پر شده - یعنی احتمالاً یه ربات فرم رو پر کرده، نه آدم
        security_logger.info(f"سفارش مشکوک به ربات از IP {get_real_ip(request)}")
        raise HTTPException(status_code=400, detail="ثبت سفارش با مشکل مواجه شد")

    if not order.items:
        raise HTTPException(status_code=400, detail="سبد خرید خالیه")

    # قیمت و عنوان هر قلم رو از خودِ دیتابیس می‌گیریم، نه از چیزی
    # که مرورگر مشتری فرستاده - وگرنه یه نفر می‌تونست با دستکاری
    # درخواست، قیمت دلخواه خودش رو جای قیمت واقعی محصول بفرسته.
    verified_items = []

    for item in order.items:
        db_product = db.query(models.Product).filter(models.Product.id == item.id).first()

        if not db_product:
            raise HTTPException(status_code=400, detail=f"محصولی با شناسه‌ی {item.id} پیدا نشد")

        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="تعداد سفارش باید حداقل ۱ باشه")

        verified_items.append({
            "id": db_product.id,
            "title": db_product.title,          # عنوان واقعی از دیتابیس، نه ورودی کاربر
            "price": db_product.price,           # قیمت واقعی از دیتابیس، نه ورودی کاربر
            "size": item.size,
            "quantity": item.quantity,
        })

    # قبل از هرکاری، مطمئن می‌شیم موجودی همه‌ی اقلام کافیه -
    # وگرنه کل سفارش رد می‌شه (نه اینکه نصفه‌نیمه ثبت بشه)
    stock_rows_to_update = []

    for item in verified_items:
        if not item["size"]:
            continue

        # قفل سطح ردیف - تا وقتی این تراکنش تموم نشده، هیچ سفارش
        # دیگه‌ای نمی‌تونه همزمان همین ردیف موجودی رو بخونه/تغییر
        # بده. بدون این قفل، دو نفر می‌تونستن همزمان آخرین واحد
        # موجودی یه سایز رو سفارش بدن و هردو موفق بشن (فروش بیش
        # از موجودی واقعی) - این ریسک روی SQLite کم‌تر بود چون خودش
        # قفل کلی سطح فایل داشت، ولی روی PostgreSQL واقعی که چندتا
        # درخواست واقعاً همزمان اجرا می‌شن، این قفل ضروریه.
        db_stock = db.query(models.ProductStock).filter(

            models.ProductStock.product_id == item["id"],
            models.ProductStock.size == item["size"]
        ).with_for_update().first()

        available = db_stock.quantity if db_stock else 0

        if available < item["quantity"]:
            raise HTTPException(
                status_code=400,
                detail=f"موجودی «{item['title']}» سایز {item['size']} کافی نیست (فقط {available} عدد موجوده)"
            )

        stock_rows_to_update.append((db_stock, item["quantity"]))

    subtotal = sum(item["price"] * item["quantity"] for item in verified_items)

    estimated_shipping = get_shipping_cost(order.postalCode)

    is_cod_shipping = order.shippingPaymentType == "cod"

    # اگه مشتری «پس‌کرایه» رو انتخاب کرده، هزینه‌ی ارسال به مبلغ
    # قابل‌پرداخت آنلاین اضافه نمی‌شه (مستقیم به مأمور پست/تیپاکس
    # نقدی پرداخت می‌کنه)؛ ولی برای اطلاع خودمون توی سفارش ثبت می‌شه
    shipping_charged = 0 if is_cod_shipping else estimated_shipping

    total = subtotal + shipping_charged

    db_order = models.Order(
        order_number=generate_order_number(),
        customer_id=current_customer.id if current_customer else None,
        full_name=sanitize_text(order.fullName),
        phone=sanitize_text(order.phone),
        province=sanitize_text(order.province),
        city=sanitize_text(order.city),
        address=sanitize_text(order.address),
        postal_code=sanitize_text(order.postalCode),
        payment_method=order.paymentMethod,
        notes=sanitize_text(order.notes) if order.notes else None,
        subtotal=subtotal,
        shipping=shipping_charged,
        shipping_payment_type=order.shippingPaymentType or "prepaid",
        shipping_estimated=estimated_shipping,
        total=total,
    )
    db.add(db_order)
    db.flush()  # تا db_order.id پر بشه

    for item in verified_items:
        db.add(models.OrderItem(
            order_id=db_order.id,
            product_id=item["id"],
            title=sanitize_text(item["title"]),
            price=item["price"],
            size=sanitize_text(item["size"]) if item["size"] else None,
            quantity=item["quantity"],
        ))

        db_product_for_sales = db.query(models.Product).filter(models.Product.id == item["id"]).first()
        if db_product_for_sales:
            db_product_for_sales.sales = (db_product_for_sales.sales or 0) + item["quantity"]

    # موجودی رو کم کن (فقط بعد از اینکه مطمئن شدیم همه‌چیز کافیه)
    affected_product_ids = set()

    for db_stock, qty in stock_rows_to_update:
        db_stock.quantity -= qty
        affected_product_ids.add(db_stock.product_id)

    db.flush()

    for product_id in affected_product_ids:
        sync_in_stock_flag(db, product_id)

    db.commit()
    db.refresh(db_order)

    try:
        sms.send_order_confirmation_sms(db_order.phone, db_order.order_number)
    except Exception as e:
        print(f"⚠️  ارسال پیامک تأیید سفارش با خطا مواجه شد: {e}")

    try:
        email_notify.send_new_order_email(db_order)
    except Exception as e:
        print(f"⚠️  ارسال ایمیل اطلاع‌رسانی سفارش با خطا مواجه شد: {e}")

    return db_order


@app.get("/api/orders/{order_number}", response_model=schemas.OrderOut)
@limiter.limit("10/minute")
def get_order(request: Request, order_number: str, phone: str, db: Session = Depends(get_db)):
    """پیگیری سفارش - برای جلوگیری از اینکه هرکسی فقط با حدس‌زدن
    شماره سفارش، اطلاعات یه مشتری دیگه رو ببینه، شماره تماسی که
    موقع ثبت سفارش داده شده هم باید مطابقت داشته باشه."""

    order = db.query(models.Order).filter(models.Order.order_number == order_number).first()

    if not order or order.phone != phone.strip():
        # پیام یکسان برای «سفارش نیست» و «شماره غلط» تا کسی نتونه
        # با آزمون‌وخطا بفهمه یه شماره سفارش واقعیه یا نه
        raise HTTPException(status_code=404, detail="سفارشی با این مشخصات پیدا نشد")

    return order


# ---------------------------------------------------------
#   حساب کاربری مشتری (ثبت‌نام / ورود / پروفایل / تاریخچه‌ی سفارش)

#   جزئیات معماری امنیتی توی backend/auth.py توضیح داده شده.
#   خلاصه: access token کوتاه‌مدت (۱۵ دقیقه، تو بدنه‌ی جواب)،
#   refresh token بلندمدت (۳۰ روز، فقط تو یه کوکی httpOnly که
#   جاوااسکریپت اصلاً بهش دسترسی نداره، و rotate می‌شه هر بار
#   استفاده بشه).
# ---------------------------------------------------------

def _issue_customer_session(db: Session, response: Response, customer: models.Customer, request: Request) -> dict:
    """بعد از تأیید ایمیل/ورود موفق/رفرش، یه access token جدید +
    یه refresh token جدید (rotate) صادر می‌کنه."""

    access_token = customer_auth.create_access_token(customer.id)

    raw_refresh = customer_auth.create_refresh_token_value()
    db.add(models.CustomerSession(
        id=str(uuid.uuid4()),
        customer_id=customer.id,
        token_hash=customer_auth.hash_token(raw_refresh),
        user_agent=request.headers.get("user-agent"),
        expires_at=customer_auth.refresh_token_expiry(),
    ))
    db.commit()

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        max_age=customer_auth.REFRESH_TOKEN_TTL_DAYS * 24 * 3600,
        httponly=True,
        secure=True,
        samesite="none",
        path="/api/auth",
    )

    return {"accessToken": access_token, "customer": customer}


def _issue_verification_code(db: Session, email: str, purpose: str):
    """کدهای قبلی همون ایمیل/purpose رو بی‌اثر می‌کنه (فقط آخرین
    کد معتبره) و یه کد جدید می‌سازه و ایمیل می‌کنه."""

    db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.purpose == purpose,
    ).delete()

    code = customer_auth.generate_verification_code()
    db.add(models.VerificationCode(
        email=email,
        code_hash=customer_auth.hash_code(code),
        purpose=purpose,
        expires_at=customer_auth.verification_code_expiry(),
    ))
    db.commit()

    try:
        email_notify.send_verification_email(email, code, purpose)
    except Exception as e:
        print(f"⚠️  ارسال ایمیل کد تأیید با خطا مواجه شد: {e}")


@app.post("/api/auth/register")
@limiter.limit("5/minute")
def register_customer(request: Request, payload: schemas.CustomerRegister, db: Session = Depends(get_db)):
    email = payload.email.lower()

    if not customer_auth.is_password_strong_enough(payload.password):
        raise HTTPException(status_code=400, detail="رمز عبور باید حداقل ۸ کاراکتر باشه و فقط عدد نباشه.")

    existing = db.query(models.Customer).filter(models.Customer.email == email).first()

    if existing and existing.email_verified:
        raise HTTPException(status_code=400, detail="این ایمیل قبلاً ثبت شده. اگه حسابته، وارد شو.")

    if existing:
        # حساب هست ولی ایمیلش هنوز تأیید نشده - اطلاعات/رمز رو آپدیت و کد جدید بفرست
        existing.password_hash = customer_auth.hash_password(payload.password)
        existing.full_name = sanitize_text(payload.fullName)
        existing.phone = sanitize_text(payload.phone)
    else:
        db.add(models.Customer(
            email=email,
            password_hash=customer_auth.hash_password(payload.password),
            full_name=sanitize_text(payload.fullName),
            phone=sanitize_text(payload.phone),
            email_verified=False,
        ))

    db.commit()

    _issue_verification_code(db, email, purpose="register")

    return {"message": "کد تأیید به ایمیلت ارسال شد."}


@app.post("/api/auth/resend-code")
@limiter.limit("3/minute")
def resend_verification_code(request: Request, payload: schemas.ResendCodeRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    customer = db.query(models.Customer).filter(models.Customer.email == email).first()

    if customer and not customer.email_verified:
        _issue_verification_code(db, email, purpose="register")

    # پیام یکسان چه حسابی در انتظار تأیید باشه چه نه
    return {"message": "اگه حسابی با این ایمیل در انتظار تأیید باشه، کد جدید ارسال شد."}


@app.post("/api/auth/verify-email", response_model=schemas.AuthTokenOut)
@limiter.limit("10/minute")
def verify_email(request: Request, response: Response, payload: schemas.VerifyEmailRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()

    customer = db.query(models.Customer).filter(models.Customer.email == email).first()

    code_row = db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.purpose == "register",
    ).order_by(models.VerificationCode.created_at.desc()).first()

    if not customer or not code_row or code_row.expires_at < datetime.utcnow() or code_row.attempts >= 5:
        raise HTTPException(status_code=400, detail="کد نامعتبره یا منقضی شده")

    if not hmac.compare_digest(customer_auth.hash_code(payload.code), code_row.code_hash):
        code_row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="کد اشتباهه")

    customer.email_verified = True
    db.delete(code_row)

    # سفارش‌های مهمانی که قبلاً با همین شماره تماس ثبت شده بودن، خودکار به این حساب وصل می‌شن
    db.query(models.Order).filter(
        models.Order.phone == customer.phone,
        models.Order.customer_id.is_(None),
    ).update({"customer_id": customer.id})

    db.commit()

    security_logger.info(f"ثبت‌نام و تأیید ایمیل موفق: {email}")

    return _issue_customer_session(db, response, customer, request)


@app.post("/api/auth/login", response_model=schemas.AuthTokenOut)
@limiter.limit("10/minute")
def login_customer(request: Request, response: Response, payload: schemas.CustomerLogin, db: Session = Depends(get_db)):
    email = payload.email.lower()
    ip_key = f"login:ip:{get_real_ip(request)}"
    email_key = f"login:email:{email}"

    for key in (ip_key, email_key):
        locked, retry_after = customer_auth.check_lockout(db, key)
        if locked:
            remaining_minutes = max(1, retry_after // 60 + (1 if retry_after % 60 else 0))
            security_logger.info(f"تلاش ورود مشتری در حین قفل‌بودن ({key})")
            raise HTTPException(status_code=429, detail={
                "message": f"به‌خاطر تلاش‌های ناموفق زیاد، فعلاً قفله. حدود {remaining_minutes} دقیقه‌ی دیگه دوباره امتحان کن.",
                "retryAfterSeconds": retry_after,
            })

    customer = db.query(models.Customer).filter(models.Customer.email == email).first()

    # عمداً یه پیام یکسان برای «ایمیل نیست»/«رمز غلط»/«تأیید نشده» -
    # تا کسی نتونه با آزمون‌وخطا بفهمه کدوم ایمیل‌ها تو سیستم ثبت‌نامن
    if not customer or not customer.email_verified or not customer_auth.check_password(payload.password, customer.password_hash):
        lockout_minutes = customer_auth.record_failed_attempt(db, ip_key)
        customer_auth.record_failed_attempt(db, email_key)
        security_logger.info(f"ورود ناموفق مشتری از IP {get_real_ip(request)} برای {email}")

        if lockout_minutes:
            raise HTTPException(status_code=429, detail={
                "message": f"چند بار اطلاعات اشتباه وارد کردی. برای {lockout_minutes} دقیقه قفل شدی.",
                "retryAfterSeconds": lockout_minutes * 60,
            })

        raise HTTPException(status_code=401, detail="ایمیل یا رمز عبور اشتباهه")

    customer_auth.reset_attempts(db, ip_key)
    customer_auth.reset_attempts(db, email_key)
    security_logger.info(f"ورود موفق مشتری {email} از IP {get_real_ip(request)}")

    return _issue_customer_session(db, response, customer, request)


@app.post("/api/auth/refresh", response_model=schemas.AuthTokenOut, dependencies=[Depends(customer_auth.require_csrf_header)])
def refresh_session(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        raise HTTPException(status_code=401, detail="نشست پیدا نشد")

    token_hash = customer_auth.hash_token(raw_refresh)
    session = db.query(models.CustomerSession).filter(models.CustomerSession.token_hash == token_hash).first()

    if not session or session.revoked_at or session.expires_at < datetime.utcnow():
        if session and session.revoked_at:
            # یه refresh token باطل‌شده دوباره استفاده شده - یعنی احتمالاً
            # دزدیده شده؛ برای احتیاط همه‌ی نشست‌های همین مشتری رو باطل کن
            db.query(models.CustomerSession).filter(
                models.CustomerSession.customer_id == session.customer_id,
                models.CustomerSession.revoked_at.is_(None),
            ).update({"revoked_at": datetime.utcnow()})
            db.commit()
            security_logger.info(f"احتمال سرقت refresh token - نشست‌های مشتری {session.customer_id} باطل شدن")

        response.delete_cookie(key="refresh_token", path="/api/auth")
        raise HTTPException(status_code=401, detail="نشست منقضی شده - دوباره وارد شو")

    customer = db.query(models.Customer).filter(models.Customer.id == session.customer_id).first()
    if not customer:
        raise HTTPException(status_code=401, detail="حساب کاربری پیدا نشد")

    session.revoked_at = datetime.utcnow()  # rotate: این‌یکی باطل، یه توکن جدید صادر می‌شه
    db.commit()

    return _issue_customer_session(db, response, customer, request)


@app.post("/api/auth/logout", dependencies=[Depends(customer_auth.require_csrf_header)])
def logout_customer(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_refresh = request.cookies.get("refresh_token")

    if raw_refresh:
        token_hash = customer_auth.hash_token(raw_refresh)
        session = db.query(models.CustomerSession).filter(models.CustomerSession.token_hash == token_hash).first()
        if session and not session.revoked_at:
            session.revoked_at = datetime.utcnow()
            db.commit()

    response.delete_cookie(key="refresh_token", path="/api/auth")
    return {"message": "خارج شدی"}


@app.post("/api/auth/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()
    customer = db.query(models.Customer).filter(
        models.Customer.email == email,
        models.Customer.email_verified == True,  # noqa: E712
    ).first()

    if customer:
        _issue_verification_code(db, email, purpose="reset_password")

    # پیام یکسان چه ایمیل ثبت‌نام‌شده باشه چه نه
    return {"message": "اگه حسابی با این ایمیل وجود داشته باشه، کد بازیابی ارسال شد."}


@app.post("/api/auth/reset-password")
@limiter.limit("10/minute")
def reset_password(request: Request, payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    email = payload.email.lower()

    if not customer_auth.is_password_strong_enough(payload.newPassword):
        raise HTTPException(status_code=400, detail="رمز عبور باید حداقل ۸ کاراکتر باشه و فقط عدد نباشه.")

    customer = db.query(models.Customer).filter(models.Customer.email == email).first()

    code_row = db.query(models.VerificationCode).filter(
        models.VerificationCode.email == email,
        models.VerificationCode.purpose == "reset_password",
    ).order_by(models.VerificationCode.created_at.desc()).first()

    if not customer or not code_row or code_row.expires_at < datetime.utcnow() or code_row.attempts >= 5:
        raise HTTPException(status_code=400, detail="کد نامعتبره یا منقضی شده")

    if not hmac.compare_digest(customer_auth.hash_code(payload.code), code_row.code_hash):
        code_row.attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="کد اشتباهه")

    customer.password_hash = customer_auth.hash_password(payload.newPassword)
    db.delete(code_row)

    # بعد از عوض‌شدن رمز، همه‌ی نشست‌های فعال باطل بشن (خروج اجباری از همه‌جا)
    db.query(models.CustomerSession).filter(
        models.CustomerSession.customer_id == customer.id,
        models.CustomerSession.revoked_at.is_(None),
    ).update({"revoked_at": datetime.utcnow()})

    db.commit()

    security_logger.info(f"بازنشانی رمز موفق برای {email}")

    return {"message": "رمز عبورت با موفقیت تغییر کرد."}


@app.get("/api/account/me", response_model=schemas.CustomerOut)
def get_my_account(customer: models.Customer = Depends(customer_auth.get_current_customer)):
    return customer


@app.put("/api/account/me", response_model=schemas.CustomerOut)
def update_my_account(
    payload: schemas.CustomerUpdate,
    customer: models.Customer = Depends(customer_auth.get_current_customer),
    db: Session = Depends(get_db),
):
    if payload.fullName:
        customer.full_name = sanitize_text(payload.fullName)
    if payload.phone:
        customer.phone = sanitize_text(payload.phone)

    db.commit()
    db.refresh(customer)
    return customer


@app.get("/api/account/orders", response_model=list[schemas.OrderOut])
def get_my_orders(
    customer: models.Customer = Depends(customer_auth.get_current_customer),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Order)
        .filter(models.Order.customer_id == customer.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )
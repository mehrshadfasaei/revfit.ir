"""
احراز هویت حساب کاربری مشتری‌ها (جدا از پنل ادمین که تو main.py
یه رمز مشترک ساده داره).

معماری امنیتی:
- Access token: کوتاه‌مدت (۱۵ دقیقه)، امضاشده با HMAC (دقیقاً
  همون الگوی create_admin_token/verify_admin_token تو main.py،
  اینجا برای مشتری تکرار شده)، توی بدنه‌ی جواب برمی‌گرده و فقط
  تو حافظه‌ی مرورگر (نه localStorage) نگه داشته می‌شه.
- Refresh token: بلندمدت (۳۰ روز)، یه مقدار تصادفی مات (نه
  امضاشده - چون اعتبارش با lookup تو دیتابیس چک می‌شه، نه
  signature)، فقط هَشش (sha256) تو دیتابیس ذخیره می‌شه، و خودِ
  مقدار خام توی یه کوکی httpOnly می‌شینه که جاوااسکریپت اصلاً
  بهش دسترسی نداره.
- هر بار refresh token استفاده بشه، rotate می‌شه (توکن قبلی
  باطل، یه توکن جدید صادر) - اگه یه توکن قدیمی/باطل‌شده دوباره
  استفاده بشه، یعنی احتمالاً دزدیده شده.
"""

import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

import models
from database import get_db
from security_utils import get_lockout_minutes

# ---------------------------------------------------------
#   کلید امضای توکن‌ها

#   ترجیحاً AUTH_TOKEN_SECRET رو جدا ست کن (پنل هاست)؛ اگه ست
#   نشده باشه، از روی ADMIN_PASSWORD_HASH مشتق می‌شه (که خودش
#   الزامیه و بک‌اند بدونش بالا نمیاد) - پس همیشه یه مقدار معتبر
#   و قابل‌پیش‌بینی‌نبودن داریم، بدون نیاز به تنظیم اضافه.
# ---------------------------------------------------------

AUTH_TOKEN_SECRET = os.environ.get("AUTH_TOKEN_SECRET") or hashlib.sha256(
    (os.environ.get("ADMIN_PASSWORD_HASH") or "revfit-fallback-secret").encode()
).hexdigest()

ACCESS_TOKEN_TTL_SECONDS = 15 * 60          # ۱۵ دقیقه
REFRESH_TOKEN_TTL_DAYS = 30                  # ۳۰ روز

# هدر سفارشی که فرانت‌اند رو درخواست‌های متکی به کوکی (refresh/logout)
# می‌فرسته - محافظت CSRF: یه سایت دیگه نمی‌تونه بدون preflight (که
# فقط برای origin های توی ALLOWED_ORIGINS تأیید می‌شه) این هدر رو ست کنه.
CSRF_HEADER_NAME = "x-client"
CSRF_HEADER_VALUE = "revfit-web"


def _b64url_encode(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(data: str):
    import base64
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


# ---------------------------------------------------------
#   ACCESS TOKEN
# ---------------------------------------------------------

def create_access_token(customer_id: int) -> str:
    payload_bytes = json.dumps({
        "sub": customer_id,
        "type": "access",
        "exp": time.time() + ACCESS_TOKEN_TTL_SECONDS,
    }).encode()
    payload_b64 = _b64url_encode(payload_bytes)
    signature = hmac.new(AUTH_TOKEN_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{signature}"


def verify_access_token(token: str):
    """اگه معتبر بود، customer_id رو برمی‌گردونه؛ وگرنه None."""
    try:
        payload_b64, signature = token.split(".", 1)
        expected_signature = hmac.new(AUTH_TOKEN_SECRET.encode(), payload_b64.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return None

        payload = json.loads(_b64url_decode(payload_b64))

        if payload.get("type") != "access":
            return None
        if payload.get("exp", 0) <= time.time():
            return None

        return payload.get("sub")
    except Exception:
        return None


# ---------------------------------------------------------
#   REFRESH TOKEN (مقدار تصادفی مات، نه امضاشده - چون اعتبارش
#   با lookup هَشش تو جدول customer_sessions چک می‌شه)
# ---------------------------------------------------------

def create_refresh_token_value() -> str:
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode()).hexdigest()


def refresh_token_expiry() -> datetime:
    return datetime.utcnow() + timedelta(days=REFRESH_TOKEN_TTL_DAYS)


# ---------------------------------------------------------
#   وابستگی‌های FastAPI برای endpoint های محافظت‌شده
# ---------------------------------------------------------

def get_current_customer(authorization: str = Header(default=None), db: Session = Depends(get_db)) -> models.Customer:
    """برای endpoint هایی که حتماً باید لاگین باشی (حساب کاربری)."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="لطفاً وارد حساب کاربری‌ت بشو")

    customer_id = verify_access_token(authorization[len("Bearer "):])
    if not customer_id:
        raise HTTPException(status_code=401, detail="نشست منقضی شده - لطفاً دوباره وارد شو")

    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=401, detail="حساب کاربری پیدا نشد")

    return customer


def get_optional_customer(authorization: str = Header(default=None), db: Session = Depends(get_db)):
    """برای endpoint هایی مثل ثبت سفارش که هم مهمون هم عضو می‌تونه
    استفاده کنه - اگه توکن معتبر بود مشتری رو برمی‌گردونه، وگرنه
    None (بدون خطا، رفتار مهمون ادامه پیدا می‌کنه)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None

    customer_id = verify_access_token(authorization[len("Bearer "):])
    if not customer_id:
        return None

    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()


def require_csrf_header(request: Request):
    """برای endpoint هایی که به کوکی refresh متکی‌ان (refresh/logout)."""
    if request.headers.get(CSRF_HEADER_NAME) != CSRF_HEADER_VALUE:
        raise HTTPException(status_code=403, detail="درخواست نامعتبر")


# ---------------------------------------------------------
#   رمز عبور (bcrypt - دقیقاً همون الگوی رمز ادمین)
# ---------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except Exception:
        return False


def is_password_strong_enough(password: str) -> bool:
    """حداقل ۸ کاراکتر و نه فقط عدد (جلوی رمزهای ضعیف مثل
    "12345678" رو می‌گیره، بدون این‌که برای کاربر واقعی سخت‌گیر
    غیرمنطقی باشه)."""
    return len(password) >= 8 and not password.isdigit()


# ---------------------------------------------------------
#   کد تأیید ۶ رقمی (ثبت‌نام / فراموشی رمز)
# ---------------------------------------------------------

def generate_verification_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def verification_code_expiry(minutes: int = 10) -> datetime:
    return datetime.utcnow() + timedelta(minutes=minutes)


# ---------------------------------------------------------
#   قفل تدریجی (نسخه‌ی عمومی‌شده‌ی همون منطق admin_login تو main.py،
#   روی جدول AuthAttempt به‌جای LoginAttempt - با یه `key` دلخواه
#   مثل "login:ip:1.2.3.4" یا "login:email:x@y.com")
# ---------------------------------------------------------

def check_lockout(db: Session, key: str):
    """اگه الان قفله (True, ثانیه‌های باقی‌مونده) برمی‌گردونه؛
    وگرنه (False, None)."""
    attempt = db.query(models.AuthAttempt).filter(models.AuthAttempt.key == key).first()
    if not attempt or not attempt.locked_until:
        return False, None

    now = datetime.utcnow()
    if now < attempt.locked_until:
        return True, int((attempt.locked_until - now).total_seconds())

    return False, None


def record_failed_attempt(db: Session, key: str):
    """یه تلاش ناموفق ثبت می‌کنه؛ بعد از ۳ بار پشت‌سرهم، قفل
    تدریجی فعال می‌شه. (lockout_minutes اگه تازه قفل شده، وگرنه None) برمی‌گردونه."""
    attempt = db.query(models.AuthAttempt).filter(models.AuthAttempt.key == key).first()
    if not attempt:
        attempt = models.AuthAttempt(key=key, failed_count=0, lockout_count=0)
        db.add(attempt)
        db.flush()

    now = datetime.utcnow()
    attempt.failed_count += 1
    attempt.updated_at = now

    lockout_minutes = None
    if attempt.failed_count >= 3:
        attempt.lockout_count += 1
        lockout_minutes = get_lockout_minutes(attempt.lockout_count)
        attempt.locked_until = now + timedelta(minutes=lockout_minutes)
        attempt.failed_count = 0

    db.commit()
    return lockout_minutes


def reset_attempts(db: Session, key: str):
    attempt = db.query(models.AuthAttempt).filter(models.AuthAttempt.key == key).first()
    if attempt:
        attempt.failed_count = 0
        attempt.lockout_count = 0
        attempt.locked_until = None
        attempt.updated_at = datetime.utcnow()
        db.commit()

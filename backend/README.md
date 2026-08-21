# Guardian Shop API

بک‌اند فروشگاه با Python (FastAPI) و دیتابیس SQLite (فایل ساده، بعداً قابل مهاجرت به MySQL/PostgreSQL).

## نصب

```bash
cd backend
pip install -r requirements.txt
```

## تنظیمات امنیتی (فایل .env)

یه فایل `.env` کنار `main.py` هست که رمز ادمین و آدرس‌های مجاز رو نگه می‌داره:

```
ADMIN_PASSWORD=رمز-قوی-تو
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

⚠️ **این فایل هرگز نباید آپلود بشه** (نه گیت‌هاب، نه هیچ‌جای دیگه) — توی `.gitignore`
و `.dockerignore` هم گذاشته شده که خودکار نادیده گرفته بشه. اگه یه نفر دیگه
بخواد این پروژه رو اجرا کنه، باید از روی `.env.example` یه `.env` جدید با
رمز خودش بسازه.

**موقع دیپلوی روی هاست واقعی (لیارا و امثالش):** این فایل رو آپلود نکن؛
به‌جاش همین دو مقدار (`ADMIN_PASSWORD`, `ALLOWED_ORIGINS`) رو توی پنل
Environment Variables خود هاست وارد کن (`ALLOWED_ORIGINS` رو اون‌موقع به
آدرس واقعی فرانت‌اندت عوض کن).

## اجرا

```bash
uvicorn main:app --reload --port 8000
```

بعد از اجرا:

- لیست محصولات: http://127.0.0.1:8000/api/products
- مستندات خودکار (Swagger): http://127.0.0.1:8000/docs

اولین بار که اجرا می‌کنی، خودش یه فایل `shop.db` می‌سازه و ۴ محصول واقعی
(زنگ نگهبان/گرگ/جمجمه/عقاب) رو توش می‌ریزه.

## نکته‌ی مهم درباره‌ی فرانت‌اند

فایل‌های HTML (`index.html`, `products.html`, ...) الان به
`http://127.0.0.1:8000` فچ می‌زنن. برای اینکه این کار درست جواب بده،
**فرانت‌اند رو هم باید از یه سرور محلی سرو کنی، نه با دابل‌کلیک روی فایل.**
چون بعضی مرورگرها fetch از `file://` رو به `http://` مسدود می‌کنن.

ساده‌ترین راه:

```bash
cd html
python -m http.server 5500
```

بعد برو به: `http://127.0.0.1:5500/index.html`

یا از اکستنشن **Live Server** توی VS Code استفاده کن.

## اگه بک‌اند خاموش باشه چی می‌شه؟

`shop-data.js` طوری نوشته شده که اگه نتونه به بک‌اند وصل بشه، خودکار
از یه دیتای نمادین (mock) استفاده می‌کنه تا سایت خراب نشه — فقط توی
Console مرورگر یه هشدار می‌بینی.

## اضافه/ویرایش محصول

فعلاً پنل ادمین نداریم؛ برای اضافه‌کردن محصول جدید یا ویرایش قیمت،
فعلاً باید مستقیم توی `main.py` (تابع `seed_products`) دستکاری کنی،
یا یه اندپوینت `POST /api/products` جدید اضافه کنیم — بگو اگه لازمه
مرحله‌ی بعدی همینو بسازیم.

## ساختار جدول‌ها

- **products**: id, title, price, category, image, rating, reviews, sales, created_at
- **orders**: id, order_number, full_name, phone, province, city, address,
  postal_code, payment_method, subtotal, shipping, total, status, created_at
- **order_items**: id, order_id, product_id, title, price, quantity
  (عنوان/قیمت لحظه‌ی خرید ذخیره می‌شه، حتی اگه بعداً قیمت محصول عوض بشه)

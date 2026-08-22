"""
ارسال ایمیل به صاحب فروشگاه هر بار که سفارش جدیدی ثبت می‌شه.

با Brevo (قبلاً Sendinblue) کار می‌کنه - یه سرویس ایمیل ترنزکشنال
رایگان (تا ۳۰۰ ایمیل در روز) که از طریق HTTPS کار می‌کنه، نه SMTP.

⚠️ چرا SMTP معمولی (مثل جیمیل) کار نمی‌کنه: هاست‌های رایگان
مثل Render، اتصال خروجی SMTP (پورت ۵۸۷) رو کامل مسدود می‌کنن
(برای جلوگیری از سوءاستفاده/اسپم) - این محدودیت خودِ هاسته، نه
تنظیمات ما. Brevo چون از طریق یه API عادی HTTPS کار می‌کنه (مثل
همون کاوه‌نگار برای پیامک)، این مشکل رو نداره.

برای فعال‌سازی:
1. برو brevo.com و ثبت‌نام کن (رایگانه)
2. توی پنل، برو: Settings (⚙️ بالا راست) → SMTP & API → API Keys
3. یه API Key جدید بساز (دکمه‌ی "Generate a new API key")
4. توی فایل .env این‌و اضافه کن:
   BREVO_API_KEY=همون-کلید-تو
   OWNER_EMAIL=ایمیلی-که-میخوای-اطلاعیه-بیاد@gmail.com
   SENDER_EMAIL=یه-ایمیل-فرستنده (می‌تونه همون OWNER_EMAIL باشه)

اگه این متغیرها ست نشده باشن، ایمیل اصلاً ارسال نمی‌شه ولی سایت
کرش نمی‌کنه - فقط توی لاگ بک‌اند یه هشدار می‌بینی.
"""

import os
import requests

BREVO_API_KEY = os.environ.get("BREVO_API_KEY")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL") or OWNER_EMAIL


def send_new_order_email(order) -> bool:
    """
    ایمیل اطلاع‌رسانی سفارش جدید رو برای صاحب فروشگاه می‌فرسته.
    `order` همون آبجکت مدل Order ـه (بعد از ذخیره توی دیتابیس).

    اگه متغیرهای لازم ست نشده باشن یا ارسال fail بشه، فقط False
    برمی‌گردونه و لاگ می‌کنه - خطا throw نمی‌کنه تا ثبت سفارش رو
    خراب نکنه.
    """

    if not (BREVO_API_KEY and OWNER_EMAIL and SENDER_EMAIL):
        print("⚠️  متغیرهای BREVO_API_KEY / OWNER_EMAIL / SENDER_EMAIL ست نشدن؛ ایمیل ارسال نشد.")
        return False

    items_html = "".join(
        f"<li>{item.title}"
        f"{f' (سایز {item.size})' if item.size else ''}"
        f" × {item.quantity} — {item.price * item.quantity:,} تومان</li>"
        for item in order.items
    )

    shipping_note = "پس‌کرایه (مشتری موقع تحویل پرداخت می‌کنه)" if order.shipping_payment_type == "cod" else f"{order.shipping:,} تومان"

    html_body = f"""
    <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.8;">
        <h2>🛍️ سفارش جدید ثبت شد</h2>
        <p><b>کد پیگیری:</b> {order.order_number}</p>
        <p><b>مشتری:</b> {order.full_name} — {order.phone}</p>
        <p><b>آدرس:</b> {order.province}، {order.city}، {order.address} (کدپستی: {order.postal_code})</p>
        <p><b>روش پرداخت:</b> {order.payment_method}</p>
        <p><b>هزینه‌ی ارسال:</b> {shipping_note}</p>
        {f'<p><b>توضیحات مشتری:</b> {order.notes}</p>' if order.notes else ''}
        <h3>اقلام سفارش:</h3>
        <ul>{items_html}</ul>
        <p style="font-size:16px;"><b>مبلغ قابل‌پرداخت:</b> {order.total:,} تومان</p>
        <p style="color:#888;font-size:12px;">این ایمیل خودکار از سایت RevFit ارسال شده.</p>
    </div>
    """

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": BREVO_API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "sender": {"email": SENDER_EMAIL, "name": "RevFit"},
                "to": [{"email": OWNER_EMAIL}],
                "subject": f"🛍️ سفارش جدید: {order.order_number}",
                "htmlContent": html_body,
            },
            timeout=10,
        )

        if response.status_code in (200, 201):
            return True

        print(f"⚠️  خطا در ارسال ایمیل: {response.status_code} - {response.text}")
        return False

    except Exception as e:
        print(f"⚠️  ارسال ایمیل سفارش با خطا مواجه شد: {e}")
        return False


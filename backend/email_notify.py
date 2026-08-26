"""
ارسال ایمیل (اطلاع‌رسانی سفارش جدید به صاحب فروشگاه + کد تأیید
ثبت‌نام/فراموشی رمز به خودِ مشتری‌ها).

با Resend کار می‌کنه - یه سرویس ایمیل ترنزکشنال رایگان (تا ۳٬۰۰۰
ایمیل در ماه، بدون نیاز به کارت اعتباری) که از طریق HTTPS API کار
می‌کنه، نه SMTP.

⚠️ چرا SMTP معمولی (مثل جیمیل) کار نمی‌کنه: هاست‌های رایگان
مثل Render، اتصال خروجی SMTP (پورت ۵۸۷) رو کامل مسدود می‌کنن
(برای جلوگیری از سوءاستفاده/اسپم) - این محدودیت خودِ هاسته، نه
تنظیمات ما. Resend چون از طریق یه API عادی HTTPS کار می‌کنه (مثل
همون کاوه‌نگار برای پیامک)، این مشکل رو نداره.

برای فعال‌سازی:
1. برو resend.com و ثبت‌نام کن (رایگانه، کارت لازم نیست)
2. توی پنل، برو: API Keys → Create API Key
3. توی فایل .env این‌و اضافه کن:
   RESEND_API_KEY=همون-کلید-تو
   OWNER_EMAIL=ایمیلی-که-میخوای-اطلاعیه-بیاد@gmail.com
   SENDER_EMAIL=یه-ایمیل-فرستنده

   نکته‌ی مهم درباره‌ی SENDER_EMAIL: تا وقتی یه دامنه‌ی خودت رو
   توی Resend (بخش Domains) verify نکردی، فقط می‌تونی از آدرس
   تستی خودِ Resend بفرستی: onboarding@resend.dev - این آدرس
   فقط برای تست/توسعه‌ست (محدودیت داره، فقط به ایمیل خودِ حساب
   Resend می‌رسه)؛ برای ارسال واقعی به مشتری‌ها، باید یه دامنه
   (مثلاً از همون revfit.ir) رو verify کنی.

اگه این متغیرها ست نشده باشن، ایمیل اصلاً ارسال نمی‌شه ولی سایت
کرش نمی‌کنه - فقط توی لاگ بک‌اند یه هشدار می‌بینی.
"""

import os
import requests

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL") or OWNER_EMAIL

RESEND_API_URL = "https://api.resend.com/emails"


def _send_via_resend(to_email: str, subject: str, html_body: str) -> bool:
    """کمکی مشترک بین دو تابع پایین - یه درخواست ساده به Resend API."""

    try:
        response = requests.post(
            RESEND_API_URL,
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": f"RevFit <{SENDER_EMAIL}>",
                "to": [to_email],
                "subject": subject,
                "html": html_body,
            },
            timeout=10,
        )

        if response.status_code in (200, 201):
            return True

        print(f"⚠️  خطا در ارسال ایمیل: {response.status_code} - {response.text}")
        return False

    except Exception as e:
        print(f"⚠️  ارسال ایمیل با خطا مواجه شد: {e}")
        return False


def send_new_order_email(order) -> bool:
    """
    ایمیل اطلاع‌رسانی سفارش جدید رو برای صاحب فروشگاه می‌فرسته.
    `order` همون آبجکت مدل Order ـه (بعد از ذخیره توی دیتابیس).

    اگه متغیرهای لازم ست نشده باشن یا ارسال fail بشه، فقط False
    برمی‌گردونه و لاگ می‌کنه - خطا throw نمی‌کنه تا ثبت سفارش رو
    خراب نکنه.
    """

    if not (RESEND_API_KEY and OWNER_EMAIL and SENDER_EMAIL):
        print("⚠️  متغیرهای RESEND_API_KEY / OWNER_EMAIL / SENDER_EMAIL ست نشدن؛ ایمیل ارسال نشد.")
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

    return _send_via_resend(OWNER_EMAIL, f"🛍️ سفارش جدید: {order.order_number}", html_body)


def send_verification_email(to_email: str, code: str, purpose: str) -> bool:
    """
    کد ۶ رقمی ثبت‌نام یا فراموشی رمز رو برای خودِ مشتری می‌فرسته
    (برخلاف send_new_order_email که همیشه برای OWNER_EMAIL می‌رفت).
    فقط به RESEND_API_KEY و SENDER_EMAIL نیاز داره (نه OWNER_EMAIL،
    چون گیرنده اینجا مشتریه نه صاحب فروشگاه).

    مثل تابع بالا، اگه چیزی fail بشه یا متغیرها ست نشده باشن،
    فقط False برمی‌گردونه - خطا throw نمی‌کنه تا جریان ثبت‌نام/
    فراموشی رمز رو خراب نکنه.
    """

    if not (RESEND_API_KEY and SENDER_EMAIL):
        print("⚠️  متغیرهای RESEND_API_KEY / SENDER_EMAIL ست نشدن؛ ایمیل تأیید ارسال نشد.")
        return False

    title = "تأیید ایمیل" if purpose == "register" else "بازیابی رمز عبور"
    intro = (
        "برای تکمیل ثبت‌نام، این کد رو وارد کن:"
        if purpose == "register"
        else "برای بازیابی رمز عبورت، این کد رو وارد کن:"
    )

    html_body = f"""
    <div style="font-family:Tahoma,Arial,sans-serif;direction:rtl;text-align:right;line-height:1.8;">
        <h2>{title}</h2>
        <p>{intro}</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">{code}</p>
        <p style="color:#888;font-size:13px;">این کد تا ۱۰ دقیقه‌ی دیگه معتبره. اگه خودت این درخواست رو نداده بودی، این ایمیل رو نادیده بگیر.</p>
    </div>
    """

    return _send_via_resend(to_email, f"کد تأیید RevFit: {code}", html_body)

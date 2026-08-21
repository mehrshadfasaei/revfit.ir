"""
ارسال ایمیل به صاحب فروشگاه هر بار که سفارش جدیدی ثبت می‌شه.

با Gmail (بدون نیاز به سرویس پولی جدا) کار می‌کنه. برای فعال‌سازی:

1. یه ایمیل جیمیل که خودت بهش دسترسی داری آماده کن (می‌تونه همون
   ایمیل شخصیت باشه یا یه ایمیل مخصوص فروشگاه).
2. برو به: https://myaccount.google.com/apppasswords
   (باید اول "تأیید دومرحله‌ای" یا 2-Step Verification روی
   اکانت جیمیلت روشن باشه، وگرنه این صفحه در دسترس نیست.)
3. یه "App Password" جدید بساز (اسمش رو مثلاً "RevFit" بذار).
   یه رمز ۱۶ کاراکتری بهت می‌ده - این با رمز عادی جیمیلت فرق داره.
4. توی فایل .env این‌هارو اضافه کن:

   SMTP_EMAIL=همون-ایمیل-جیمیلت@gmail.com
   SMTP_PASSWORD=همون-رمز-16-کاراکتری-App-Password
   OWNER_EMAIL=ایمیلی-که-میخوای-اطلاعیه-بیاد@gmail.com

   (OWNER_EMAIL می‌تونه همون SMTP_EMAIL باشه یا یه ایمیل دیگه -
   مثلاً می‌تونی از یه ایمیل مخصوص فروشگاه بفرستی ولی خودت با
   جیمیل شخصیت دریافت کنی.)

اگه این متغیرها ست نشده باشن، ایمیل اصلاً ارسال نمی‌شه ولی سایت
کرش نمی‌کنه - فقط توی لاگ بک‌اند یه هشدار می‌بینی. یعنی امن‌تره
تا وقتی ایمیل رو راه‌اندازی نکردی، بقیه‌ی سایت (ثبت سفارش) بدون
مشکل کار کنه.
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_EMAIL = os.environ.get("SMTP_EMAIL")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL")

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def send_new_order_email(order) -> bool:
    """
    ایمیل اطلاع‌رسانی سفارش جدید رو برای صاحب فروشگاه می‌فرسته.
    `order` همون آبجکت مدل Order ـه (بعد از ذخیره توی دیتابیس).

    اگه متغیرهای SMTP ست نشده باشن یا ارسال fail بشه، فقط False
    برمی‌گردونه و لاگ می‌کنه - خطا throw نمی‌کنه تا ثبت سفارش رو
    خراب نکنه.
    """

    if not (SMTP_EMAIL and SMTP_PASSWORD and OWNER_EMAIL):
        print("⚠️  متغیرهای SMTP_EMAIL / SMTP_PASSWORD / OWNER_EMAIL ست نشدن؛ ایمیل ارسال نشد.")
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

    message = MIMEMultipart("alternative")
    message["Subject"] = f"🛍️ سفارش جدید: {order.order_number}"
    message["From"] = SMTP_EMAIL
    message["To"] = OWNER_EMAIL
    message.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, OWNER_EMAIL, message.as_string())
        return True

    except Exception as e:
        print(f"⚠️  ارسال ایمیل سفارش با خطا مواجه شد: {e}")
        return False

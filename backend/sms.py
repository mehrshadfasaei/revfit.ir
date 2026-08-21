"""
ارسال پیامک با کاوه‌نگار (Kavenegar).

برای فعال‌سازی:
1. توی kavenegar.com ثبت‌نام کن (اکانت آزمایشی رایگانه)
2. از پنل، بخش "وب‌سرویس" → API-KEY رو کپی کن
3. توی فایل .env این‌و اضافه کن:
   KAVENEGAR_API_KEY=همون-کلید-تو

اگه این متغیر ست نشده باشه، پیامک اصلاً ارسال نمی‌شه ولی سایت
کرش نمی‌کنه - فقط توی لاگ بک‌اند یه هشدار می‌بینی. یعنی امن‌تره
تا وقتی سرویس پیامک رو راه‌اندازی نکردی، بقیه‌ی سایت (ثبت سفارش)
بدون مشکل کار کنه.
"""

import os
import requests

KAVENEGAR_API_KEY = os.environ.get("KAVENEGAR_API_KEY")


def send_order_confirmation_sms(phone: str, order_number: str) -> bool:
    """
    پیامک تأیید سفارش رو می‌فرسته. اگه API-KEY ست نشده باشه یا
    درخواست fail بشه، فقط False برمی‌گردونه و لاگ می‌کنه - خطا
    throw نمی‌کنه تا ثبت سفارش رو خراب نکنه.
    """

    if not KAVENEGAR_API_KEY:
        print("⚠️  KAVENEGAR_API_KEY ست نشده؛ پیامک ارسال نشد.")
        return False

    message = f"سفارش شما با موفقیت ثبت شد.\nکد پیگیری: {order_number}\nفروشگاه گاردین شاپ"

    url = f"https://api.kavenegar.com/v1/{KAVENEGAR_API_KEY}/sms/send.json"

    try:
        response = requests.post(
            url,
            data={"receptor": phone, "message": message},
            timeout=10
        )
        result = response.json()

        if response.status_code == 200:
            return True

        print(f"⚠️  خطا در ارسال پیامک: {result}")
        return False

    except Exception as e:
        print(f"⚠️  ارسال پیامک با خطا مواجه شد: {e}")
        return False

"""
ابزارهای امنیتی مشترک - هم پنل ادمین ازشون استفاده می‌کنه هم
سیستم حساب کاربری مشتری‌ها (backend/auth.py). این‌ها رو از
main.py جدا کردیم تا auth.py بتونه بدون import چرخشی
(circular import) بهشون دسترسی داشته باشه.
"""

import logging
from pathlib import Path

from fastapi import Request


def get_real_ip(request: Request) -> str:
    """Render (مثل بیشتر هاست‌های ابری) درخواست‌ها رو از پشت یه
    پروکسی رد می‌کنه؛ یعنی request.client.host ممکنه IP خودِ
    پروکسی رو بده، نه IP واقعی بازدیدکننده - که برای همه یکسانه
    و کل سیستم Rate Limit/قفل لاگین رو بی‌اثر می‌کنه. به‌جاش از
    هدر X-Forwarded-For استفاده می‌کنیم.

    نکته‌ی مهم امنیتی: این هدر می‌تونه چندتا IP با کاما جدا داشته
    باشه. مقدار اول همیشه چیزیه که خودِ کلاینت (مرورگر/اسکریپت)
    می‌تونه دستی بفرسته - یعنی قابل جعله! پروکسی مطمئن (Render)
    IP واقعی رو به‌عنوان آخرین مقدار زنجیره اضافه می‌کنه، پس باید
    همیشه آخرین مقدار رو بخونیم، نه اولی."""

    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


# لاگ رویدادهای امنیتی (تلاش‌های لاگین ادمین/مشتری، قفل‌شدن‌ها،
# رفتار مشکوک به ربات و...) - فایل security.log کنار همین فایل.
security_logger = logging.getLogger("security")
security_logger.setLevel(logging.INFO)
_log_handler = logging.FileHandler(Path(__file__).resolve().parent / "security.log", encoding="utf-8")
_log_handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
security_logger.addHandler(_log_handler)


# مدت زمان قفل (به دقیقه) بر اساس چندمین‌بار قفل‌شدنه - هر دور طولانی‌تر می‌شه.
# هم برای قفل لاگین ادمین استفاده می‌شه هم برای ثبت‌نام/ورود/فراموشی رمز مشتری‌ها.
LOCKOUT_DURATIONS_MINUTES = [3, 5, 10, 20, 40, 60]


def get_lockout_minutes(lockout_count: int) -> int:
    index = min(lockout_count - 1, len(LOCKOUT_DURATIONS_MINUTES) - 1)
    return LOCKOUT_DURATIONS_MINUTES[max(index, 0)]

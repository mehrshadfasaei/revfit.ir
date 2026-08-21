"""
هروقت خواستی رمز پنل ادمین رو عوض کنی، این اسکریپت رو اجرا کن:

    python hash_password.py

رمز جدیدت رو وارد کن، یه رشته‌ی هش‌شده بهت می‌ده - همون رشته رو
(دقیقاً همون‌طور که هست، با $2b$ شروع می‌شه) کپی کن و توی فایل .env
جای مقدار ADMIN_PASSWORD_HASH بذار. بعد بک‌اند رو ری‌استارت کن.
"""

import bcrypt
import getpass

password = getpass.getpass("رمز جدید ادمین رو وارد کن (روی صفحه دیده نمی‌شه): ")
confirm = getpass.getpass("دوباره وارد کن برای تأیید: ")

if password != confirm:
    print("❌ دوتا رمز یکی نبودن. دوباره امتحان کن.")
else:
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    print("\n✅ این‌و کپی کن و توی .env جای ADMIN_PASSWORD_HASH بذار:\n")
    print(hashed)
    print()

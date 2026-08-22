"""
اتصال به دیتابیس.

اگه متغیر محیطی DATABASE_URL ست شده باشه (مثلاً یه دیتابیس
PostgreSQL واقعی روی Render)، از همون استفاده می‌کنیم - این
دیتابیس مستقل از دیسک موقت سرویسه، یعنی با هر دیپلوی جدید
پاک نمی‌شه.

اگه ست نشده باشه (مثلاً موقع اجرای لوکال روی کامپیوتر خودت)،
خودکار می‌ره سراغ همون فایل ساده‌ی SQLite قبلی (shop.db) - یعنی
برای تست لوکال هیچی عوض نمی‌شه و نیازی به نصب/راه‌اندازی
PostgreSQL روی کامپیوتر خودت نیست.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./shop.db")

# Render آدرس Postgres رو با پیشوند postgres:// می‌ده، ولی SQLAlchemy
# جدید postgresql:// می‌خواد - خودکار تبدیلش می‌کنیم
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_SQLITE = DATABASE_URL.startswith("sqlite")

# check_same_thread فقط برای SQLite لازمه
connect_args = {"check_same_thread": False} if IS_SQLITE else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """هر ریکوئست یه session جدا می‌گیره و در آخر می‌بندتش."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
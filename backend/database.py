"""
اتصال به دیتابیس.

فعلاً SQLite (یه فایل ساده به اسم shop.db کنار همین کدها).
اگه بعداً خواستی به MySQL/PostgreSQL مهاجرت کنی، فقط کافیه
DATABASE_URL رو عوض کنی؛ چون از SQLAlchemy استفاده می‌کنیم
بقیه‌ی کد (models.py, main.py) دست نخورده کار می‌کنه.

مثال برای PostgreSQL بعداً:
DATABASE_URL = "postgresql://user:password@localhost/shop_db"

مثال برای MySQL بعداً:
DATABASE_URL = "mysql+pymysql://user:password@localhost/shop_db"
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./shop.db"

# check_same_thread فقط برای SQLite لازمه
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """هر ریکوئست یه session جدا می‌گیره و در آخر می‌بندتش."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

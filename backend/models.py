"""
مدل‌های دیتابیس (جدول‌ها).

Product      -> همون محصولاتی که توی shop-data.js mock بودن
Order        -> هر سفارش ثبت‌شده از صفحه‌ی checkout.html
OrderItem    -> ردیف‌های داخل هر سفارش (کدوم محصول، چند عدد)
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    price = Column(Integer, nullable=False)          # تومان
    category = Column(String, nullable=False)
    image = Column(String, nullable=False)            # عکس اصلی/کاور (برای سازگاری با بقیه‌ی سایت)
    description = Column(Text, nullable=True)          # توضیحات دستی ادمین (اگه خالی باشه، سایت خودکار می‌سازه)
    in_stock = Column(Boolean, default=True)            # موجود/ناموجود (کل محصول)
    out_of_stock_sizes = Column(String, nullable=True)  # سایزهای ناموجود، با کاما جدا (مثلاً "M,XL")
    rating = Column(Float, default=4.8)
    sales = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    images = relationship(
        "ProductImage",
        back_populates="product",
        cascade="all, delete-orphan",
        order_by="ProductImage.sort_order"
    )

    stock = relationship(
        "ProductStock",
        back_populates="product",
        cascade="all, delete-orphan"
    )


class ProductStock(Base):
    """موجودی واقعی هر سایز از هر محصول. هر بار سفارشی ثبت بشه،
    این عدد کم می‌شه؛ وقتی صفر بشه، اون سایز خودکار ناموجود
    نشون داده می‌شه."""

    __tablename__ = "product_stock"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    size = Column(String, nullable=False)
    quantity = Column(Integer, default=0, nullable=False)

    product = relationship("Product", back_populates="stock")


class ProductImage(Base):
    """گالری چندعکسی هر محصول (برای صفحه‌ی جزئیات محصول)."""

    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    image_url = Column(String, nullable=False)
    sort_order = Column(Integer, default=0)

    product = relationship("Product", back_populates="images")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)

    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    province = Column(String, nullable=False)
    city = Column(String, nullable=False)
    address = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    notes = Column(Text, nullable=True)                # توضیحات اختیاری مشتری

    payment_method = Column(String, nullable=False)   # online | cod
    subtotal = Column(Integer, nullable=False)
    shipping = Column(Integer, nullable=False)          # مبلغی که واقعاً به کل سفارش اضافه شد (اگه پس‌کرایه باشه صفره)
    shipping_payment_type = Column(String, default="prepaid")   # prepaid | cod (پس‌کرایه)
    shipping_estimated = Column(Integer, nullable=True)          # تخمین واقعی هزینه ارسال (چه پرداخت‌شده باشه چه نه)
    total = Column(Integer, nullable=False)

    status = Column(String, default="pending")        # pending | paid | shipped | delivered
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)

    title = Column(String, nullable=False)     # snapshot از اسم محصول لحظه‌ی خرید
    price = Column(Integer, nullable=False)    # snapshot از قیمت لحظه‌ی خرید
    size = Column(String, nullable=True)       # سایز انتخابی (مثلاً M, L, XL)
    quantity = Column(Integer, nullable=False)

    order = relationship("Order", back_populates="items")


class ErrorLog(Base):
    """خطاهایی که واقعاً توی مرورگر مشتری‌ها اتفاق میفته - نه
    خطاهای بک‌اند. اینا معمولاً چیزایی هستن که خودمون موقع تست
    محلی هیچ‌وقت نمی‌بینیم (مثلاً یه مرورگر خاص، یه اتصال کند،
    یه دکمه که یه‌جا شکسته)."""

    __tablename__ = "error_logs"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(String, nullable=False)
    page_url = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    stack = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ContactMessage(Base):
    """پیام‌هایی که مشتری از صفحه‌ی «تماس با ما» می‌فرسته."""

    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    contact_info = Column(String, nullable=False)   # ایمیل یا شماره تماس
    subject = Column(String, nullable=True)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class LoginAttempt(Base):
    """قفل تدریجی لاگین ادمین بر اساس IP.

    هر ۳ تلاش ناموفق پشت‌سرهم، یه دوره‌ی قفل فعال می‌شه که هر
    بار طولانی‌تر از قبلیه (۳ دقیقه، ۵ دقیقه، ۱۰ دقیقه، ...).
    با یه لاگین موفق، همه‌چیز از نو صفر می‌شه."""

    __tablename__ = "login_attempts"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, nullable=False, unique=True, index=True)
    failed_count = Column(Integer, default=0)
    lockout_count = Column(Integer, default=0)     # چندمین بار قفل شده (برای تعیین مدت زمان بعدی)
    locked_until = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
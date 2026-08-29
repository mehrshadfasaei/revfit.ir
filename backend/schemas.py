"""
اسکیمای پایدنتیک - شکل دقیق دیتایی که API می‌گیره/برمی‌گردونه.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional


class ProductImageOut(BaseModel):
    id: int
    image_url: str

    class Config:
        orm_mode = True


class ProductStockOut(BaseModel):
    size: str
    quantity: int

    class Config:
        orm_mode = True


class ProductStockItem(BaseModel):
    size: str
    quantity: int


class ProductOut(BaseModel):
    id: int
    title: str
    price: int
    category: str
    image: str
    description: Optional[str] = None
    in_stock: bool = True
    is_archived: bool = False
    rating: float
    sales: int
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_active: bool = False
    final_price: int   # قیمت واقعی بعد از تخفیف (اگه تخفیفی نباشه، همون price)
    review_count: int = 0
    average_rating: Optional[float] = None   # میانگین نظرات واقعی - اگه نظری نباشه None (فرانت به rating برمی‌گرده)
    images: List[ProductImageOut] = []
    stock: List[ProductStockOut] = []

    class Config:
        orm_mode = True


class ProductCreate(BaseModel):
    title: str
    price: int
    category: str
    image: str
    description: Optional[str] = None
    in_stock: bool = True
    rating: float = 4.8
    sales: int = 0
    discount_type: Optional[str] = None      # "percent" | "fixed" | None
    discount_value: Optional[float] = None
    discount_active: bool = False
    images: List[str] = []          # آدرس عکس‌های اضافه‌ی گالری (غیر از عکس اصلی)
    stock: List[ProductStockItem] = []   # موجودی هر سایز


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[int] = None
    category: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    in_stock: Optional[bool] = None
    is_archived: Optional[bool] = None
    rating: Optional[float] = None
    sales: Optional[int] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    discount_active: Optional[bool] = None


class ProductImageCreate(BaseModel):
    image_url: str


class ProductStockUpdate(BaseModel):
    stock: List[ProductStockItem]


class OrderStatusUpdate(BaseModel):
    status: str


class OrderItemIn(BaseModel):
    id: int          # product id
    title: str = Field(..., max_length=200)
    price: int
    size: Optional[str] = Field(None, max_length=10)
    quantity: int


class OrderCreate(BaseModel):
    fullName: str = Field(..., max_length=100)
    phone: str = Field(..., max_length=20)
    province: str = Field(..., max_length=50)
    city: str = Field(..., max_length=50)
    address: str = Field(..., max_length=300)
    postalCode: str = Field(..., max_length=20)
    paymentMethod: str = Field(..., max_length=30)
    notes: Optional[str] = Field(None, max_length=500)
    shippingPaymentType: Optional[str] = "prepaid"    # prepaid | cod (پس‌کرایه)
    website: Optional[str] = Field(None, max_length=200)    # honeypot ضدربات - نباید هیچ‌وقت پر باشه
    couponCode: Optional[str] = Field(None, max_length=50)
    items: List[OrderItemIn]


class OrderItemOut(BaseModel):
    title: str
    price: int
    size: Optional[str] = None
    quantity: int

    class Config:
        orm_mode = True


class OrderOut(BaseModel):
    order_number: str
    full_name: str
    phone: str
    province: str
    city: str
    address: str
    postal_code: str
    payment_method: str
    notes: Optional[str] = None
    subtotal: int
    shipping: int
    shipping_payment_type: str = "prepaid"
    shipping_estimated: Optional[int] = None
    coupon_code: Optional[str] = None
    coupon_discount: int = 0
    total: int
    status: str
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        orm_mode = True


# ---------------------------------------------------------
#   کد تخفیف (کوپن)
# ---------------------------------------------------------

class CouponOut(BaseModel):
    id: int
    code: str
    discount_type: str
    discount_value: float
    min_order_amount: Optional[int] = None
    active: bool
    usage_count: int
    created_at: datetime

    class Config:
        orm_mode = True


class CouponCreate(BaseModel):
    code: str = Field(..., min_length=2, max_length=50)
    discount_type: str
    discount_value: float
    min_order_amount: Optional[int] = None
    active: bool = True


class CouponUpdate(BaseModel):
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    min_order_amount: Optional[int] = None
    active: Optional[bool] = None


class CouponValidateRequest(BaseModel):
    code: str = Field(..., max_length=50)
    subtotal: int


class CouponValidateResponse(BaseModel):
    valid: bool
    message: str
    discount_amount: int = 0


class ErrorLogCreate(BaseModel):
    message: str = Field(..., max_length=1000)
    pageUrl: Optional[str] = Field(None, max_length=500)
    userAgent: Optional[str] = Field(None, max_length=500)
    stack: Optional[str] = Field(None, max_length=2000)


class ErrorLogOut(BaseModel):
    id: int
    message: str
    page_url: Optional[str] = None
    user_agent: Optional[str] = None
    stack: Optional[str] = None
    created_at: datetime

    class Config:
        orm_mode = True


class ContactMessageCreate(BaseModel):
    name: str = Field(..., max_length=100)
    contactInfo: str = Field(..., max_length=100)
    subject: Optional[str] = Field(None, max_length=150)
    message: str = Field(..., max_length=1000)
    website: Optional[str] = Field(None, max_length=200)    # honeypot ضدربات


class ContactMessageOut(BaseModel):
    id: int
    name: str
    contact_info: str
    subject: Optional[str] = None
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True


# ---------------------------------------------------------
#   حساب کاربری مشتری
# ---------------------------------------------------------

EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


class CustomerRegister(BaseModel):
    email: str = Field(..., max_length=200, pattern=EMAIL_PATTERN)
    password: str = Field(..., min_length=8, max_length=100)
    fullName: str = Field(..., max_length=100)
    phone: str = Field(..., max_length=20)


class VerifyEmailRequest(BaseModel):
    email: str = Field(..., max_length=200, pattern=EMAIL_PATTERN)
    code: str = Field(..., min_length=6, max_length=6)


class ResendCodeRequest(BaseModel):
    email: str = Field(..., max_length=200, pattern=EMAIL_PATTERN)


class CustomerLogin(BaseModel):
    email: str = Field(..., max_length=200, pattern=EMAIL_PATTERN)
    password: str = Field(..., max_length=100)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., max_length=200, pattern=EMAIL_PATTERN)


class ResetPasswordRequest(BaseModel):
    email: str = Field(..., max_length=200, pattern=EMAIL_PATTERN)
    code: str = Field(..., min_length=6, max_length=6)
    newPassword: str = Field(..., min_length=8, max_length=100)


class CustomerOut(BaseModel):
    id: int
    email: str
    full_name: str
    phone: str

    class Config:
        orm_mode = True


class AuthTokenOut(BaseModel):
    accessToken: str
    customer: CustomerOut


class CustomerUpdate(BaseModel):
    fullName: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


# ---------------------------------------------------------
#   نظر و امتیاز واقعی مشتری‌ها (verified purchase reviews)
# ---------------------------------------------------------

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewOut(BaseModel):
    id: int
    customer_name: str    # نام ماسک‌شده (مثلاً «علی ر.») - نه اسم کامل، برای حریم خصوصی
    rating: int
    comment: Optional[str] = None
    created_at: datetime


class CanReviewOut(BaseModel):
    can_review: bool
    reason: Optional[str] = None    # وقتی can_review=false، چرا (برای نمایش به کاربر)


class AdminReviewOut(BaseModel):
    id: int
    product_id: int
    product_title: str
    customer_name: str    # اینجا (فقط برای ادمین) اسم کامل نشون داده می‌شه، نه ماسک‌شده
    rating: int
    comment: Optional[str] = None
    created_at: datetime

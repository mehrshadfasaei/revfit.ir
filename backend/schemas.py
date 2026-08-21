"""
اسکیمای پایدنتیک - شکل دقیق دیتایی که API می‌گیره/برمی‌گردونه.
"""

from pydantic import BaseModel
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
    rating: float
    sales: int
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
    images: List[str] = []          # آدرس عکس‌های اضافه‌ی گالری (غیر از عکس اصلی)
    stock: List[ProductStockItem] = []   # موجودی هر سایز


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[int] = None
    category: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    in_stock: Optional[bool] = None
    rating: Optional[float] = None
    sales: Optional[int] = None


class ProductImageCreate(BaseModel):
    image_url: str


class ProductStockUpdate(BaseModel):
    stock: List[ProductStockItem]


class OrderStatusUpdate(BaseModel):
    status: str


class OrderItemIn(BaseModel):
    id: int          # product id
    title: str
    price: int
    size: Optional[str] = None
    quantity: int


class OrderCreate(BaseModel):
    fullName: str
    phone: str
    province: str
    city: str
    address: str
    postalCode: str
    paymentMethod: str
    notes: Optional[str] = None
    shippingPaymentType: Optional[str] = "prepaid"    # prepaid | cod (پس‌کرایه)
    website: Optional[str] = None    # honeypot ضدربات - نباید هیچ‌وقت پر باشه
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
    total: int
    status: str
    created_at: datetime
    items: List[OrderItemOut]

    class Config:
        orm_mode = True

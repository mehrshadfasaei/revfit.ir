import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { getMergedCart, saveCart, getCartTotals, SHIPPING_COST } from "../lib/cart";
import { formatPrice } from "../lib/format";
import { getProductById } from "../lib/api";
import { showToast } from "../lib/toast";

/**
 * پورت‌شده از html/cart.html + js/cart.js — رندر و منطق دقیقاً
 * همون، فقط به‌جای innerHTML/event-delegation از کامپوننت و
 * onClick استفاده شده.
 */
export default function Cart() {
    const [cart, setCart] = useState(() => getMergedCart());
    const navigate = useNavigate();

    function updateCart(next) {
        saveCart(next);
        setCart(next);
    }

    async function handleQtyPlus(item) {
        const product = await getProductById(item.id);
        const stockForSize =
            item.size && product?.stock ? (product.stock.find((s) => s.size === item.size)?.quantity ?? 0) : Infinity;

        if (item.quantity >= stockForSize) {
            showToast(`⚠️ فقط ${stockForSize} عدد از این سایز موجوده`);
            return;
        }

        updateCart(cart.map((i) => (i === item ? { ...i, quantity: i.quantity + 1 } : i)));
    }

    function handleQtyMinus(item) {
        if (item.quantity <= 1) return;
        updateCart(cart.map((i) => (i === item ? { ...i, quantity: i.quantity - 1 } : i)));
    }

    function handleRemove(item) {
        updateCart(cart.filter((i) => i !== item));
        showToast("🗑️ محصول از سبد خرید حذف شد");
    }

    const { subtotal, total } = getCartTotals(cart);

    return (
        <>
            <PageBanner title="سبد خرید" className="cart-banner" />

            <section className="cart-section">
                <div className="container">
                    {cart.length > 0 && (
                        <div className="cart-layout" id="cartLayout" style={{ display: "grid" }}>
                            <div className="cart-items">
                                {cart.map((item) => (
                                    <div className="cart-item" data-id={item.id} data-size={item.size || ""} key={`${item.id}-${item.size || ""}`}>
                                        <Link to={`/product/${item.id}`} className="cart-item-image-link">
                                            <img src={item.image} alt={item.title} />
                                        </Link>

                                        <div className="cart-item-info">
                                            <Link to={`/product/${item.id}`}>
                                                <h3>{item.title}</h3>
                                            </Link>
                                            {item.size && <span className="cart-item-size">سایز: {item.size}</span>}
                                            <span className="price">{formatPrice(item.price)} تومان</span>
                                        </div>

                                        <div className="cart-item-quantity">
                                            <button className="qty-minus" data-id={item.id} data-size={item.size || ""} onClick={() => handleQtyMinus(item)}>
                                                −
                                            </button>
                                            <input type="text" value={item.quantity} readOnly />
                                            <button className="qty-plus" data-id={item.id} data-size={item.size || ""} onClick={() => handleQtyPlus(item)}>
                                                +
                                            </button>
                                        </div>

                                        <span className="cart-item-subtotal">{formatPrice(item.price * item.quantity)} تومان</span>

                                        <button
                                            className="cart-item-remove"
                                            data-id={item.id}
                                            data-size={item.size || ""}
                                            title="حذف"
                                            onClick={() => handleRemove(item)}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="cart-summary">
                                <h3>خلاصه سفارش</h3>
                                <div className="summary-row">
                                    <span>جمع جزء</span>
                                    <span>{formatPrice(subtotal)} تومان</span>
                                </div>
                                <div className="summary-row">
                                    <span>هزینه ارسال</span>
                                    <span>{formatPrice(SHIPPING_COST)} تومان</span>
                                </div>
                                <div className="summary-row summary-total">
                                    <span>مبلغ قابل پرداخت</span>
                                    <span>{formatPrice(total)} تومان</span>
                                </div>
                                <button className="checkout-btn" id="checkoutBtn" onClick={() => navigate("/checkout")}>
                                    ادامه فرآیند خرید <i className="fa-solid fa-arrow-left"></i>
                                </button>
                                <Link to="/products" className="continue-link">
                                    <i className="fa-solid fa-arrow-right"></i> ادامه‌ی خرید از محصولات
                                </Link>
                            </div>
                        </div>
                    )}

                    {cart.length === 0 && (
                        <div className="cart-empty-state show" id="cartEmptyState">
                            <i className="fa-solid fa-cart-shopping"></i>
                            <p>سبد خرید شما خالیه</p>
                            <Link to="/products" className="btn-continue-shopping">
                                مشاهده محصولات
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}

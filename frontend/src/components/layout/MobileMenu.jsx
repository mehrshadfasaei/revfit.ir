import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navActiveClass = ({ isActive }) => (isActive ? "active-link" : undefined);

/**
 * لیست ناوبری (".nav-links") — هم توی هدر دسکتاپ رندر می‌شه هم
 * (با همون کلاس‌ها) به منوی موبایل تبدیل می‌شه، چون امروز هم
 * یه المان یکسانه که با کلاس "active" روی موبایل باز/بسته می‌شه.
 *
 * پورت‌شده از html/index.html هدر + js/common.js's مدیریت
 * ".menu-btn"/".nav-links.active".
 *
 * تصمیم یکسان‌سازی: آیتم علاقه‌مندی‌ها همه‌جا نشون داده می‌شه
 * (قبلاً فقط توی wishlist.html بود).
 */
export default function MobileMenu({ open, onClose, onOpenSearch, cartCount }) {
    const { isLoggedIn } = useAuth();

    return (
        <ul className={`nav-links${open ? " active" : ""}`}>
            <li className="mobile-menu-header">
                <button className="mobile-menu-close" id="mobileMenuClose" onClick={onClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </li>

            <li
                className="mobile-menu-search-row"
                id="mobileMenuSearchTrigger"
                onClick={() => {
                    onClose();
                    onOpenSearch();
                }}
            >
                <i className="fa-solid fa-magnifying-glass"></i> جستجوی محصول...
            </li>

            <li>
                <NavLink to="/" end className={navActiveClass} onClick={onClose}>
                    خانه
                </NavLink>
            </li>
            <li>
                <NavLink to="/products" className={navActiveClass} onClick={onClose}>
                    محصولات
                </NavLink>
            </li>
            <li>
                <NavLink to="/about" className={navActiveClass} onClick={onClose}>
                    درباره ما
                </NavLink>
            </li>
            <li>
                <NavLink to="/contact" className={navActiveClass} onClick={onClose}>
                    تماس با ما
                </NavLink>
            </li>

            <li className="mobile-menu-link">
                <NavLink to="/wishlist" onClick={onClose}>
                    <i className="fa-regular fa-heart"></i> علاقه‌مندی‌ها
                </NavLink>
            </li>

            <li className="mobile-menu-link">
                <NavLink to={isLoggedIn ? "/account" : "/login"} onClick={onClose}>
                    <i className="fa-regular fa-user"></i> {isLoggedIn ? "حساب کاربری" : "ورود / ثبت‌نام"}
                </NavLink>
            </li>

            <li className="mobile-menu-link">
                <NavLink to="/cart" onClick={onClose}>
                    <i className="fa-solid fa-cart-shopping"></i> سبد خرید{" "}
                    <span className="cart-count mobile-cart-count" style={{ display: cartCount > 0 ? "inline-flex" : "none" }}>
                        {cartCount}
                    </span>
                </NavLink>
            </li>
        </ul>
    );
}

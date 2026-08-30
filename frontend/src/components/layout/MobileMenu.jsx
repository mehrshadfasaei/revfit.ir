import { useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getProducts } from "../../lib/api";

const navActiveClass = ({ isActive }) => (isActive ? "active-link" : undefined);

/**
 * لیست ناوبری (".nav-links") — هم توی هدر دسکتاپ رندر می‌شه هم
 * (با همون کلاس‌ها) به منوی موبایل تبدیل می‌شه، چون امروز هم
 * یه المان یکسانه که با کلاس "active" روی موبایل باز/بسته می‌شه.
 *
 * پورت‌شده از html/index.html هدر + js/common.js's مدیریت
 * ".menu-btn"/".nav-links.active".
 */
export default function MobileMenu({ open, onClose, onOpenSearch, cartCount }) {
    const { isLoggedIn } = useAuth();

    // زیرمنوی دسته‌بندی‌ها (فیچر جدیده) - با زدن رو «محصولات» باز
    // می‌شه، دسته‌بندی‌ها رو فقط همون لحظه‌ی اول‌بار باز شدن
    // می‌گیریم (نه رو هر لود صفحه، چون MobileMenu تو همه‌ی
    // صفحه‌ها رندر می‌شه و اکثر وقت‌ها اصلاً باز نمی‌شه - گرفتنش
    // رو هر لود صفحه یعنی یه درخواست اضافی مفت‌ومجانی به بک‌اند).
    // چون خودِ دسته‌بندی‌ها از روی محصولات واقعی استخراج می‌شن،
    // هر دسته‌ی جدیدی که ادمین اضافه کنه خودکار این‌جا هم میاد.
    const [productsMenuOpen, setProductsMenuOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const categoriesFetchedRef = useRef(false);

    function handleToggleProductsMenu() {
        const next = !productsMenuOpen;
        setProductsMenuOpen(next);

        if (next && !categoriesFetchedRef.current) {
            categoriesFetchedRef.current = true;
            setLoadingCategories(true);

            getProducts().then((products) => {
                setCategories([...new Set(products.map((p) => p.category))].sort());
                setLoadingCategories(false);
            });
        }
    }

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

            {/* دسکتاپ: همون لینک ساده‌ی قبلی، بدون زیرمنو - ".nav-links" هم
                منوی موبایل هم نوار ناوبری دسکتاپه، پس این <li> با CSS
                فقط رو دسکتاپ دیده می‌شه (رجوع کن به .desktop-products-link) */}
            <li className="desktop-products-link">
                <NavLink to="/products" className={navActiveClass} onClick={onClose}>
                    محصولات
                </NavLink>
            </li>

            {/* موبایل: دکمه‌ی بازکننده‌ی زیرمنوی دسته‌بندی‌ها - با CSS فقط
                رو موبایل دیده می‌شه (رجوع کن به .mobile-menu-expandable) */}
            <li className="mobile-menu-expandable">
                <button
                    type="button"
                    className={`mobile-menu-expand-trigger${productsMenuOpen ? " open" : ""}`}
                    onClick={handleToggleProductsMenu}
                >
                    محصولات
                    <i className="fa-solid fa-chevron-down"></i>
                </button>

                {productsMenuOpen && (
                    <ul className="mobile-category-submenu">
                        <li>
                            <NavLink to="/products" end className={navActiveClass} onClick={onClose}>
                                همه محصولات
                            </NavLink>
                        </li>

                        {loadingCategories && <li className="mobile-category-loading">در حال بارگذاری...</li>}

                        {!loadingCategories &&
                            categories.map((c) => (
                                <li key={c}>
                                    <NavLink to={`/products?category=${encodeURIComponent(c)}`} onClick={onClose}>
                                        {c}
                                    </NavLink>
                                </li>
                            ))}
                    </ul>
                )}
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

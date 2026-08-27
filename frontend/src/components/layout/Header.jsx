import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import { useCartBadge } from "../../hooks/useCartBadge";
import { useAuth } from "../../context/AuthContext";

/**
 * پورت‌شده از html/index.html هدر + js/common.js (منوی موبایل،
 * cart badge). دکمه‌ی حساب کاربری فیچر جدیده - به /account (اگه
 * لاگین باشی) یا /login (اگه نباشی) می‌ره.
 *
 * دو حالت رندر داره (درخواست کاربر): تو دسکتاپ کنار لوگو یه
 * دکمه‌ی مستطیلی با متنه، تو موبایل همون آیکون تنهاست (مثل قبل
 * از اضافه‌شدن دکمه) و جاش تو nav-icons می‌مونه. کدوم یکی دیده
 * می‌شه با CSS (media query) کنترل می‌شه، نه جاوااسکریپت.
 */
export default function Header({ onOpenSearch }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const cartCount = useCartBadge();
    const { isLoggedIn } = useAuth();
    const accountTo = isLoggedIn ? "/account" : "/login";
    const accountLabel = isLoggedIn ? "حساب من" : "ورود";

    return (
        <header className="with-marquee">
            <div className="container">
                <nav>
                    <div className="logo-account-wrap">
                        <div className="logo">
                            <Link to="/">
                                <img src="/images/logo1_transparent.png" alt="Logo" />
                            </Link>
                        </div>

                        <NavLink to={accountTo} className="header-account-btn" title="حساب کاربری">
                            <i className="fa-solid fa-user"></i>
                            <span>{accountLabel}</span>
                        </NavLink>
                    </div>

                    <MobileMenu
                        open={menuOpen}
                        onClose={() => setMenuOpen(false)}
                        onOpenSearch={onOpenSearch}
                        cartCount={cartCount}
                    />

                    <div className="nav-icons">
                        <a
                            href="#"
                            className="search-trigger"
                            id="searchTrigger"
                            onClick={(e) => {
                                e.preventDefault();
                                onOpenSearch();
                            }}
                        >
                            <i className="fa-solid fa-magnifying-glass"></i>
                        </a>

                        <NavLink to={accountTo} className="header-account-icon-mobile" title="حساب کاربری">
                            <i className="fa-solid fa-user"></i>
                        </NavLink>

                        <Link to="/cart" className="cart-icon-link">
                            <i className="fa-solid fa-cart-shopping"></i>
                            <span
                                className="cart-count"
                                id="cartCount"
                                style={{ display: cartCount > 0 ? "flex" : "none" }}
                            >
                                {cartCount}
                            </span>
                        </Link>
                    </div>

                    <div className="menu-btn" onClick={() => setMenuOpen((v) => !v)}>
                        <i className="fa-solid fa-bars"></i>
                    </div>
                </nav>
            </div>
        </header>
    );
}

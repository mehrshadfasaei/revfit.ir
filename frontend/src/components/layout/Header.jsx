import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import { useCartBadge } from "../../hooks/useCartBadge";
import { useAuth } from "../../context/AuthContext";

const navActiveClass = ({ isActive }) => (isActive ? "active-link" : undefined);

/**
 * پورت‌شده از html/index.html هدر + js/common.js (منوی موبایل،
 * cart badge). آیکون حساب کاربری فیچر جدیده - به /account (اگه
 * لاگین باشی) یا /login (اگه نباشی) می‌ره.
 */
export default function Header({ onOpenSearch }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const cartCount = useCartBadge();
    const { isLoggedIn } = useAuth();

    return (
        <header className="with-marquee">
            <div className="container">
                <nav>
                    <div className="logo">
                        <Link to="/">
                            <img src="/images/logo1_transparent.png" alt="Logo" />
                        </Link>
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

                        <NavLink to={isLoggedIn ? "/account" : "/login"} className={navActiveClass} title="حساب کاربری">
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

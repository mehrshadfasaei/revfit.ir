import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import MobileMenu from "./MobileMenu";
import { useCartBadge } from "../../hooks/useCartBadge";

const navActiveClass = ({ isActive }) => (isActive ? "active-link" : undefined);

/**
 * پورت‌شده از html/index.html هدر + js/common.js (منوی موبایل،
 * cart badge). تصمیم یکسان‌سازی: آیکون قلب (wishlist) توی
 * nav-icons همه‌جا نشون داده می‌شه (قبلاً فقط توی wishlist.html
 * بود).
 */
export default function Header({ onOpenSearch }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const cartCount = useCartBadge();

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

                        <NavLink to="/wishlist" className={navActiveClass}>
                            <i className="fa-solid fa-heart"></i>
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

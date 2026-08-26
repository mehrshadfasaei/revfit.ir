import { useState } from "react";
import { Outlet } from "react-router-dom";
import PageLoader from "./PageLoader";
import MarqueeBanner from "./MarqueeBanner";
import Header from "./Header";
import Footer from "./Footer";
import BackToTop from "./BackToTop";
import ScrollProgressBar from "./ScrollProgressBar";
import SearchOverlay from "./SearchOverlay";
import Toast from "../ui/Toast";

/**
 * شِل مشترک — دقیقاً همون chunk-ی که امروز روی هر ۱۳ صفحه‌ی
 * html/*.html عیناً تکرار می‌شد (هدر/مارکی/فوتر/overlayها).
 */
export default function Layout() {
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <>
            <PageLoader />
            <MarqueeBanner />
            <Header onOpenSearch={() => setSearchOpen(true)} />

            <Outlet />

            <Footer />

            <BackToTop />

            <a href="https://t.me/revfit" target="_blank" rel="noreferrer" className="telegram-float">
                <i className="fab fa-telegram"></i>
            </a>

            <ScrollProgressBar />

            <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

            <Toast />
        </>
    );
}

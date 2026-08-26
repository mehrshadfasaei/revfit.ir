import { useEffect, useState } from "react";

/**
 * پورت‌شده از js/common.js — نمایش بعد از ۴۰۰px اسکرول،
 * کلیک برمی‌گردونه بالای صفحه.
 */
export default function BackToTop() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            setShow(scrollTop > 400);
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <button id="topBtn" className={show ? "show" : ""} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <i className="fa-solid fa-arrow-up"></i>
        </button>
    );
}

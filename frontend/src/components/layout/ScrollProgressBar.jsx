import { useEffect, useState } from "react";

/**
 * پورت‌شده از js/common.js — عرض نوار رو متناسب با درصد
 * اسکرول صفحه تنظیم می‌کنه.
 */
export default function ScrollProgressBar() {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

            if (scrollHeight > 0) {
                setWidth((scrollTop / scrollHeight) * 100);
            }
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return <div id="progress-bar" style={{ width: `${width}%` }}></div>;
}

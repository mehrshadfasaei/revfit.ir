import { useEffect, useState } from "react";

/**
 * پورت‌شده از js/common.js — روی window "load" (+ یه fallback
 * ۵ ثانیه‌ای) کلاس "loaded" رو اضافه می‌کنه تا اسپینر محو بشه.
 */
export default function PageLoader() {
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (document.readyState === "complete") {
            setLoaded(true);
            return;
        }

        const onLoad = () => setLoaded(true);
        window.addEventListener("load", onLoad);

        const failsafe = setTimeout(() => setLoaded(true), 5000);

        return () => {
            window.removeEventListener("load", onLoad);
            clearTimeout(failsafe);
        };
    }, []);

    return (
        <div className={`page-loader${loaded ? " loaded" : ""}`} id="pageLoader">
            <div className="loader-spinner"></div>
        </div>
    );
}

import { useEffect, useRef, useState } from "react";

/**
 * پورت‌شده از shop-data.js's showToast() — یه‌بار توی Layout
 * مونت می‌شه و به window event "toast:show" (پخش‌شده از
 * lib/toast.js) گوش می‌ده. تایمینگ دقیقاً همون قبلیه: بعد از
 * ۱۰۰ms کلاس "show" اضافه می‌شه، بعد از ۲۵۰۰ms حذف می‌شه، و
 * ۳۰۰ms بعدش از DOM برداشته می‌شه.
 */
export default function Toast() {
    const [toasts, setToasts] = useState([]);
    const idRef = useRef(0);

    useEffect(() => {
        function onShow(e) {
            const id = idRef.current++;
            const message = e.detail.message;

            setToasts((list) => [...list, { id, message, show: false }]);

            setTimeout(() => {
                setToasts((list) => list.map((t) => (t.id === id ? { ...t, show: true } : t)));
            }, 100);

            setTimeout(() => {
                setToasts((list) => list.map((t) => (t.id === id ? { ...t, show: false } : t)));

                setTimeout(() => {
                    setToasts((list) => list.filter((t) => t.id !== id));
                }, 300);
            }, 2500);
        }

        window.addEventListener("toast:show", onShow);
        return () => window.removeEventListener("toast:show", onShow);
    }, []);

    return (
        <>
            {toasts.map((t) => (
                <div key={t.id} className={`toast${t.show ? " show" : ""}`} dangerouslySetInnerHTML={{ __html: t.message }} />
            ))}
        </>
    );
}

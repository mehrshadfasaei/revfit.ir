import { useEffect, useRef, useState } from "react";

/**
 * جایگزین product.js's ماژول-سطح IntersectionObserver
 * (scrollObserver) که روی ".related-card, .payment-box"
 * کلاس "show" رو یه‌بار (وقتی وارد viewport می‌شن) اضافه
 * می‌کرد. همون رفتار: پیش‌فرض IntersectionObserver
 * (بدون threshold/rootMargin خاص)، یه‌بار true می‌شه و
 * دیگه false نمی‌شه.
 */
export function useInView() {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || inView) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) setInView(true);
            });
        });

        observer.observe(el);

        return () => observer.disconnect();
    }, [inView]);

    return [ref, inView];
}

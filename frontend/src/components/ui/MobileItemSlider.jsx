import { useCallback, useEffect, useRef, useState } from "react";

/**
 * پورت‌شده از js/home.js's initMobileItemSlider() — روی دسکتاپ
 * اثری نداره (CSS فقط زیر ۷۶۸px این کلاس‌ها رو معنی می‌ده).
 * توی کد قدیم یه تابع عمومی بود که ۴ بار (features/counter/
 * instagram-grid/featured-products) صدا زده می‌شد؛ اینجا همون
 * منطق یه هوک شده که هر مصرف‌کننده صدا می‌زنه، و کلاس
 * "mobile-slide-active" رو خودش روی آیتم جاری می‌ذاره؛
 * <MobileSliderDots/> هم جایگزین dots-ی می‌شه که قبلاً با
 * insertAdjacentElement("afterend", ...) بعد از container
 * ساخته می‌شد.
 */
export function useMobileItemSlider(itemCount, intervalMs = 8000) {
    const [current, setCurrent] = useState(0);
    const timerRef = useRef(null);

    const resetTimer = useCallback(() => {
        clearInterval(timerRef.current);

        if (itemCount > 0) {
            timerRef.current = setInterval(() => {
                setCurrent((c) => (c + 1) % itemCount);
            }, intervalMs);
        }
    }, [itemCount, intervalMs]);

    useEffect(() => {
        setCurrent(0);
        resetTimer();

        return () => clearInterval(timerRef.current);
    }, [itemCount, resetTimer]);

    const goTo = useCallback(
        (index) => {
            setCurrent(index);
            resetTimer();
        },
        [resetTimer],
    );

    return { current, goTo };
}

export default function MobileSliderDots({ count, current, onSelect }) {
    if (count === 0) return null;

    return (
        <div className="mobile-slider-dots">
            {Array.from({ length: count }, (_, i) => (
                <button
                    key={i}
                    type="button"
                    className={`mobile-slider-dot${i === current ? " active" : ""}`}
                    onClick={() => onSelect(i)}
                />
            ))}
        </div>
    );
}

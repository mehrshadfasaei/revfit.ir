import { useEffect, useState } from "react";
import { getCartCount } from "../lib/cart";

/**
 * تعداد سبد خرید برای badge توی هدر/منوی موبایل.
 *
 * جایگزین common.js's updateCartBadge() (که مستقیم DOM رو
 * می‌گشت). دو تا محرک دقیقاً مثل قبل رعایت شده:
 *  - "cart:updated" (همون تب — وقتی addToCart/saveCart صدا زده می‌شه)
 *  - "storage" با key==="cart" (تب دیگه)
 */
export function useCartBadge() {
    const [count, setCount] = useState(() => getCartCount());

    useEffect(() => {
        const refresh = () => setCount(getCartCount());

        const onStorage = (e) => {
            if (e.key === "cart") refresh();
        };

        window.addEventListener("cart:updated", refresh);
        window.addEventListener("storage", onStorage);

        refresh();

        return () => {
            window.removeEventListener("cart:updated", refresh);
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    return count;
}

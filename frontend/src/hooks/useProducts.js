import { useEffect, useState } from "react";
import { getProducts } from "../lib/api";

/**
 * fetch-on-mount wrapper around lib/api.getProducts — هر جا امروز
 * getProducts() صدا زده می‌شد (renderFeaturedProducts, applyFilters,
 * ...) با این هوک جایگزین می‌شه.
 *
 * عمداً کش/استور مشترک نداره (مثل قبل، هر مصرف‌کننده fetch تازه‌ی
 * خودش رو می‌زنه) — پارامتری برای re-fetch نداریم چون چیزی که
 * لیست محصولات رو عوض کنه امروز وجود نداره.
 */
export function useProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);

        getProducts().then((data) => {
            if (!cancelled) {
                setProducts(data);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return { products, loading };
}

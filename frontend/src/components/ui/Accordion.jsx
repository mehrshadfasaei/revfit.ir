import { useState } from "react";

/**
 * پورت‌شده از js/faq.js و js/product.js's آکاردئون (منطقشون
 * دقیقاً یکی بود، اینجا یه کامپوننت مشترک). هر آیتم state باز/بسته
 * خودش رو نگه می‌داره.
 */
export default function Accordion({ title, defaultOpen = false, children }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <>
            <button
                type="button"
                className={`accordion-header${open ? " active" : ""}`}
                onClick={() => setOpen((v) => !v)}
            >
                <span>{title}</span>
                <span className="accordion-icon">{open ? "−" : "+"}</span>
            </button>

            <div className={`accordion-body${open ? " open" : ""}`}>{children}</div>
        </>
    );
}

import { Link } from "react-router-dom";

/**
 * پورت‌شده از ".page-banner" که تکرار می‌شد بالای about/products/
 * product/faq/privacy/shipping/terms/track-order/cart/checkout/
 * contact.
 */
export default function PageBanner({ title, className }) {
    return (
        <section className={`page-banner${className ? ` ${className}` : ""}`}>
            <div className="container">
                <h1>{title}</h1>
                <div className="breadcrumb">
                    <Link to="/">خانه</Link>
                    <i className="fa-solid fa-chevron-left"></i>
                    <span>{title}</span>
                </div>
            </div>
        </section>
    );
}

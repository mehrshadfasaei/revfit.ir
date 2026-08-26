/**
 * وضعیت‌های سفارش و متادیتای نمایششون - بین TrackOrder.jsx و
 * Account.jsx (تاریخچه‌ی سفارش‌های حساب کاربری) مشترکه.
 */

export const STATUS_ORDER = ["pending", "paid", "shipped", "delivered"];

export const STATUS_STEPS = [
    { step: "pending", icon: "fa-file-circle-check", label: "ثبت سفارش" },
    { step: "paid", icon: "fa-money-check-dollar", label: "در حال پردازش" },
    { step: "shipped", icon: "fa-truck-fast", label: "ارسال شده" },
    { step: "delivered", icon: "fa-box-open", label: "تحویل داده شده" },
];

export function formatOrderDate(createdAt) {
    try {
        return new Date(createdAt).toLocaleDateString("fa-IR");
    } catch (err) {
        return new Date(createdAt).toISOString().slice(0, 10);
    }
}

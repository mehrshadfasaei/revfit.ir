/**
 * استاتیک، پورت‌شده از html/index.html (بین همه‌ی صفحات یکسانه).
 */
export default function MarqueeBanner() {
    return (
        <div className="marquee-banner">
            <div className="marquee-track">
                <div className="marquee-group">
                    <span>۱۰٪ تخفیف برای خرید دوم</span>
                    <span>ارسال رایگان با خرید دو محصول</span>
                    <span>۱۰٪ تخفیف برای خرید دوم</span>
                </div>
                <div className="marquee-group" aria-hidden="true">
                    <span>۱۰٪ تخفیف برای خرید دوم</span>
                    <span>ارسال رایگان با خرید دو محصول</span>
                    <span>۱۰٪ تخفیف برای خرید دوم</span>
                </div>
            </div>
        </div>
    );
}

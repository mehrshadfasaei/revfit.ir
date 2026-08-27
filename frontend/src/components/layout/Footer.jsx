import { Link } from "react-router-dom";

/**
 * پورت‌شده از html/index.html فوتر.
 */
export default function Footer() {
    return (
        <footer>
            <div className="container">
                <div className="footer-grid">
                    <div>
                        <img src="/images/logo2_transparent.png" alt="RevFit" className="footer-logo" />
                        <p>فروشگاه تخصصی پوشاک موتورسواری</p>
                    </div>

                    <div>
                        <h3>لینک ها</h3>
                        <ul>
                            <li><Link to="/">خانه</Link></li>
                            <li><Link to="/products">محصولات</Link></li>
                            <li><Link to="/about">درباره ما</Link></li>
                            <li><Link to="/contact">تماس</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3>پشتیبانی</h3>
                        <ul>
                            <li><Link to="/terms">قوانین</Link></li>
                            <li><Link to="/privacy">حریم خصوصی</Link></li>
                            <li><Link to="/shipping">شرایط ارسال</Link></li>
                            <li><Link to="/faq">سوالات متداول</Link></li>
                            <li><Link to="/track-order">پیگیری سفارش</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3>ارتباط با ما</h3>
                        <p>09369538587</p>
                        <p>guardianshop@gmail.com</p>
                        <div className="socials">
                            <a href="#"><i className="fab fa-instagram"></i></a>
                            <a href="#"><i className="fab fa-telegram"></i></a>
                            <a href="#"><i className="fab fa-whatsapp"></i></a>
                        </div>
                    </div>
                </div>

                <div className="copyright">© 2026 تمامی حقوق محفوظ است.</div>
            </div>
        </footer>
    );
}

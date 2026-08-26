import { useRef, useState } from "react";
import PageBanner from "../components/ui/PageBanner";
import { API_BASE_URL } from "../lib/api";
import { showToast } from "../lib/toast";

/**
 * پورت‌شده از html/contact.html + js/contact.js. مثل قبل از
 * FormData روی خودِ فرم (uncontrolled) استفاده می‌کنیم، نه
 * controlled state — رفتار اعتبارسنجی/ارسال دقیقاً یکیه.
 */
export default function Contact() {
    const formRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);
    const [errorFields, setErrorFields] = useState(new Set());

    async function handleSubmit(e) {
        e.preventDefault();

        const form = formRef.current;
        const requiredFields = form.querySelectorAll("[required]");

        let isValid = true;
        const nextErrors = new Set();

        requiredFields.forEach((field) => {
            if (!field.value.trim()) {
                isValid = false;
                nextErrors.add(field.name);
            }
        });

        setErrorFields(nextErrors);

        if (!isValid) {
            showToast("⚠️ لطفاً فیلدهای اجباری رو پر کن");
            return;
        }

        const formData = new FormData(form);
        setSubmitting(true);

        try {
            const res = await fetch(`${API_BASE_URL}/api/contact`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    contactInfo: formData.get("contact"),
                    subject: formData.get("subject") || null,
                    message: formData.get("message"),
                    website: formData.get("website") || "",
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "ارسال پیام با مشکل مواجه شد");
            }

            showToast("✅ پیامت ارسال شد؛ به‌زودی باهات تماس می‌گیریم");
            form.reset();
        } catch (err) {
            console.error(err);
            showToast(`⚠️ ${err.message || "ارسال پیام با مشکل مواجه شد؛ مطمئن شو بک‌اند روشنه"}`);
        } finally {
            setSubmitting(false);
        }
    }

    const errClass = (name) => (errorFields.has(name) ? " field-error" : "");

    return (
        <>
            <PageBanner title="تماس با ما" />

            <section className="contact-info-section">
                <div className="container">
                    <div className="contact-info-grid">
                        <div className="contact-info-card">
                            <i className="fa-solid fa-phone"></i>
                            <h3>شماره تماس</h3>
                            <p dir="ltr">0936 953 8587</p>
                        </div>
                        <div className="contact-info-card">
                            <i className="fa-solid fa-envelope"></i>
                            <h3>ایمیل</h3>
                            <p>guardianshop@gmail.com</p>
                        </div>
                        <div className="contact-info-card">
                            <i className="fa-solid fa-location-dot"></i>
                            <h3>آدرس</h3>
                            <p>ایران، تهران</p>
                        </div>
                        <div className="contact-info-card">
                            <i className="fa-solid fa-clock"></i>
                            <h3>ساعات پاسخگویی</h3>
                            <p>شنبه تا پنجشنبه، ۹ تا ۱۸</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="contact-form-section">
                <div className="container">
                    <div className="contact-form-layout">
                        <div className="checkout-box contact-form-box">
                            <h3>
                                <i className="fa-solid fa-message"></i> پیام بفرست
                            </h3>

                            <form id="contactForm" className="checkout-form" ref={formRef} onSubmit={handleSubmit}>
                                {/* Honeypot: کاربر واقعی این‌و نمی‌بینه و پر نمی‌کنه */}
                                <input type="text" name="website" className="honeypot-field" tabIndex="-1" autoComplete="off" />

                                <div className="form-row">
                                    <label>
                                        نام و نام خانوادگی
                                        <input type="text" name="name" required maxLength={100} placeholder="نامتو بنویس" className={errClass("name")} />
                                    </label>
                                    <label>
                                        ایمیل یا شماره تماس
                                        <input type="text" name="contact" required maxLength={100} placeholder="ایمیل یا موبایل" className={errClass("contact")} />
                                    </label>
                                </div>

                                <label>
                                    موضوع
                                    <input type="text" name="subject" maxLength={150} placeholder="موضوع پیام (اختیاری)" />
                                </label>

                                <label>
                                    پیام شما
                                    <textarea name="message" rows={5} required maxLength={1000} placeholder="پیامتو اینجا بنویس..." className={errClass("message")}></textarea>
                                </label>

                                <button type="submit" className="checkout-btn" disabled={submitting}>
                                    {submitting ? (
                                        "در حال ارسال..."
                                    ) : (
                                        <>
                                            ارسال پیام <i className="fa-solid fa-paper-plane"></i>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        <div className="contact-social-box">
                            <h3>ما رو دنبال کن</h3>
                            <p>برای دیدن جدیدترین محصولات و آفرها، توی شبکه‌های اجتماعی همراهمون باش.</p>
                            <div className="contact-social-links">
                                <a href="#">
                                    <i className="fab fa-instagram"></i> اینستاگرام
                                </a>
                                <a href="#">
                                    <i className="fab fa-telegram"></i> تلگرام
                                </a>
                                <a href="#">
                                    <i className="fab fa-whatsapp"></i> واتساپ
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

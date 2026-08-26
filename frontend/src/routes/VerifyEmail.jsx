import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { useAuth } from "../context/AuthContext";

export default function VerifyEmail() {
    const { verifyEmail, resendCode } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [email] = useState(searchParams.get("email") || "");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendMessage, setResendMessage] = useState("");

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await verifyEmail({ email, code: code.trim() });
            navigate("/account");
        } catch (err) {
            setError(err.message || "کد نامعتبره");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleResend() {
        setResendMessage("");
        try {
            const data = await resendCode(email);
            setResendMessage(data.message);
            setResendCooldown(60);
        } catch (err) {
            setError(err.message || "ارسال دوباره‌ی کد با مشکل مواجه شد");
        }
    }

    if (!email) {
        return (
            <>
                <PageBanner title="تأیید ایمیل" />
                <section className="auth-page">
                    <div className="container">
                        <div className="auth-card-wrap">
                            <p className="auth-error">آدرس ایمیل مشخص نیست. از صفحه‌ی ثبت‌نام دوباره امتحان کن.</p>
                        </div>
                    </div>
                </section>
            </>
        );
    }

    return (
        <>
            <PageBanner title="تأیید ایمیل" />

            <section className="auth-page">
                <div className="container">
                    <div className="auth-card-wrap">
                        <form className="checkout-box checkout-form" onSubmit={handleSubmit}>
                            <h1>تأیید ایمیل</h1>
                            <p className="auth-subtext">
                                یه کد ۶ رقمی به <strong dir="ltr">{email}</strong> فرستادیم. اینجا واردش کن.
                            </p>

                            {error && <p className="auth-error">{error}</p>}
                            {resendMessage && <p className="auth-success">{resendMessage}</p>}

                            <label>
                                کد تأیید
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    required
                                    minLength={6}
                                    maxLength={6}
                                    className="verify-code-input"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                                    dir="ltr"
                                    placeholder="------"
                                />
                            </label>

                            <button type="submit" className="checkout-btn" disabled={submitting || code.length !== 6}>
                                {submitting ? "در حال بررسی..." : "تأیید"}
                            </button>

                            <p className="auth-links" style={{ justifyContent: "center" }}>
                                {resendCooldown > 0 ? (
                                    <span>ارسال دوباره تا {resendCooldown} ثانیه‌ی دیگه</span>
                                ) : (
                                    <button type="button" onClick={handleResend} style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>
                                        ارسال دوباره‌ی کد
                                    </button>
                                )}
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

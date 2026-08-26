import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { useAuth } from "../context/AuthContext";

export default function ForgotPassword() {
    const { forgotPassword } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            const data = await forgotPassword(email.trim().toLowerCase());
            setMessage(data.message);
            setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`), 1200);
        } catch (err) {
            setError(err.message || "درخواست با مشکل مواجه شد");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <PageBanner title="فراموشی رمز عبور" />

            <section className="auth-page">
                <div className="container">
                    <div className="auth-card-wrap">
                        <form className="checkout-box checkout-form" onSubmit={handleSubmit}>
                            <h1>فراموشی رمز عبور</h1>
                            <p className="auth-subtext">ایمیلت رو وارد کن تا کد بازیابی رو برات بفرستیم.</p>

                            {error && <p className="auth-error">{error}</p>}
                            {message && <p className="auth-success">{message}</p>}

                            <label>
                                ایمیل
                                <input type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                            </label>

                            <button type="submit" className="checkout-btn" disabled={submitting}>
                                {submitting ? "در حال ارسال..." : "ارسال کد بازیابی"}
                            </button>

                            <p className="auth-links" style={{ justifyContent: "center" }}>
                                <Link to="/login">بازگشت به ورود</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

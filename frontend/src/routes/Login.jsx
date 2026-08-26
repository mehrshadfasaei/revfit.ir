import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { useAuth } from "../context/AuthContext";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await login({ email: email.trim().toLowerCase(), password });
            const redirectTo = location.state?.from || "/account";
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message || "ورود با مشکل مواجه شد");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <PageBanner title="ورود" />

            <section className="auth-page">
                <div className="container">
                    <div className="auth-card-wrap">
                        <form className="checkout-box checkout-form" onSubmit={handleSubmit}>
                            <h1>ورود به حساب کاربری</h1>

                            {error && <p className="auth-error">{error}</p>}

                            <label>
                                ایمیل
                                <input type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                            </label>

                            <label>
                                رمز عبور
                                <input type="password" required maxLength={100} value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
                            </label>

                            <button type="submit" className="checkout-btn" disabled={submitting}>
                                {submitting ? "در حال ورود..." : "ورود"}
                            </button>

                            <p className="auth-links">
                                <Link to="/forgot-password">رمزت رو فراموش کردی؟</Link>
                                <Link to="/register">ساخت حساب جدید</Link>
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

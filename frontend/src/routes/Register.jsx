import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (password.length < 8 || /^\d+$/.test(password)) {
            setError("رمز عبور باید حداقل ۸ کاراکتر باشه و فقط عدد نباشه.");
            return;
        }

        setSubmitting(true);

        try {
            await register({ email: email.trim().toLowerCase(), password, fullName: fullName.trim(), phone: phone.trim() });
            navigate(`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        } catch (err) {
            setError(err.message || "ثبت‌نام با مشکل مواجه شد");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <PageBanner title="ثبت‌نام" />

            <section className="auth-page">
                <div className="container">
                    <div className="auth-card-wrap">
                        <form className="checkout-box checkout-form" onSubmit={handleSubmit}>
                            <h1>ساخت حساب کاربری</h1>

                            {error && <p className="auth-error">{error}</p>}

                            <label>
                                نام و نام خانوادگی
                                <input type="text" required maxLength={100} value={fullName} onChange={(e) => setFullName(e.target.value)} />
                            </label>

                            <label>
                                ایمیل
                                <input type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                            </label>

                            <label>
                                شماره تماس
                                <input type="tel" required maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" />
                            </label>

                            <label>
                                رمز عبور
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    maxLength={100}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    dir="ltr"
                                    placeholder="حداقل ۸ کاراکتر"
                                />
                            </label>

                            <button type="submit" className="checkout-btn" disabled={submitting}>
                                {submitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
                            </button>

                            <p className="auth-links" style={{ justifyContent: "center" }}>
                                <span>
                                    حساب داری؟ <Link to="/login">وارد شو</Link>
                                </span>
                            </p>
                        </form>
                    </div>
                </div>
            </section>
        </>
    );
}

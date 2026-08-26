import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
    const { resetPassword } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [email, setEmail] = useState(searchParams.get("email") || "");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (newPassword.length < 8 || /^\d+$/.test(newPassword)) {
            setError("رمز عبور باید حداقل ۸ کاراکتر باشه و فقط عدد نباشه.");
            return;
        }

        setSubmitting(true);

        try {
            await resetPassword({ email: email.trim().toLowerCase(), code: code.trim(), newPassword });
            navigate("/login");
        } catch (err) {
            setError(err.message || "بازنشانی رمز با مشکل مواجه شد");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <>
            <PageBanner title="بازنشانی رمز عبور" />

            <section className="auth-page">
                <div className="container">
                    <div className="auth-card-wrap">
                        <form className="checkout-box checkout-form" onSubmit={handleSubmit}>
                            <h1>بازنشانی رمز عبور</h1>

                            {error && <p className="auth-error">{error}</p>}

                            <label>
                                ایمیل
                                <input type="email" required maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
                            </label>

                            <label>
                                کد بازیابی
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

                            <label>
                                رمز عبور جدید
                                <input
                                    type="password"
                                    required
                                    minLength={8}
                                    maxLength={100}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    dir="ltr"
                                    placeholder="حداقل ۸ کاراکتر"
                                />
                            </label>

                            <button type="submit" className="checkout-btn" disabled={submitting}>
                                {submitting ? "در حال ثبت..." : "تغییر رمز عبور"}
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

import { API_BASE_URL } from "./api";

/*====================================
        AUTH API CALLS (حساب کاربری مشتری)

        همه‌ی این‌ها credentials:"include" دارن چون refresh/logout
        به کوکی httpOnly متکی‌ان (باید cross-origin رد و بدل بشه).
        فقط refresh/logout هدر X-Client هم می‌فرستن - محافظت CSRF
        سمت بک‌اند (backend/auth.py's require_csrf_header).
====================================*/

async function authRequest(path, body, { csrf = false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (csrf) headers["X-Client"] = "revfit-web";

    const res = await fetch(`${API_BASE_URL}${path}`, {
        method: "POST",
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        const detail = data?.detail;
        const message = typeof detail === "string" ? detail : detail?.message;

        const error = new Error(message || "درخواست با مشکل مواجه شد");
        error.status = res.status;
        error.retryAfterSeconds = detail?.retryAfterSeconds;

        throw error;
    }

    return data;
}

export function register({ email, password, fullName, phone }) {
    return authRequest("/api/auth/register", { email, password, fullName, phone });
}

export function resendCode(email) {
    return authRequest("/api/auth/resend-code", { email });
}

export function verifyEmail({ email, code }) {
    return authRequest("/api/auth/verify-email", { email, code });
}

export function login({ email, password }) {
    return authRequest("/api/auth/login", { email, password });
}

export function refresh() {
    return authRequest("/api/auth/refresh", undefined, { csrf: true });
}

export function logout() {
    return authRequest("/api/auth/logout", undefined, { csrf: true });
}

export function forgotPassword(email) {
    return authRequest("/api/auth/forgot-password", { email });
}

export function resetPassword({ email, code, newPassword }) {
    return authRequest("/api/auth/reset-password", { email, code, newPassword });
}

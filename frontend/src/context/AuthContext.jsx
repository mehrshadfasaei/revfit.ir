import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as authApi from "../lib/auth";
import { API_BASE_URL } from "../lib/api";

const AuthContext = createContext(null);

/**
 * نشست مشتری فقط تو حافظه‌ی React نگه داشته می‌شه (نه
 * localStorage) - جزئیات معماری امنیتی توی backend/auth.py
 * توضیح داده شده. موقع لود اولیه‌ی اپ، یه‌بار silent refresh
 * می‌زنیم (از روی کوکی httpOnly) تا اگه کاربر قبلاً لاگین کرده
 * بوده، دوباره مجبور به وارد کردن رمز نشه.
 */
export function AuthProvider({ children }) {
    const [customer, setCustomer] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const accessTokenRef = useRef(null);

    useEffect(() => {
        accessTokenRef.current = accessToken;
    }, [accessToken]);

    useEffect(() => {
        let cancelled = false;

        authApi
            .refresh()
            .then((data) => {
                if (cancelled) return;
                setAccessToken(data.accessToken);
                setCustomer(data.customer);
            })
            .catch(() => {
                // نشست فعالی نبود - طبیعیه، کاربر مهمونه
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const applySession = useCallback((data) => {
        setAccessToken(data.accessToken);
        setCustomer(data.customer);
    }, []);

    const register = useCallback((payload) => authApi.register(payload), []);
    const resendCode = useCallback((email) => authApi.resendCode(email), []);
    const forgotPassword = useCallback((email) => authApi.forgotPassword(email), []);
    const resetPassword = useCallback((payload) => authApi.resetPassword(payload), []);

    const verifyEmail = useCallback(
        async (payload) => {
            const data = await authApi.verifyEmail(payload);
            applySession(data);
            return data;
        },
        [applySession],
    );

    const login = useCallback(
        async (payload) => {
            const data = await authApi.login(payload);
            applySession(data);
            return data;
        },
        [applySession],
    );

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } catch (e) {
            // حتی اگه درخواست fail بشه، سمت کلاینت رو پاک کن
        }
        setAccessToken(null);
        setCustomer(null);
    }, []);

    // fetch محافظت‌شده - هدر Authorization رو خودکار اضافه می‌کنه؛
    // اگه ۴۰۱ بگیره (access token ۱۵ دقیقه‌ای منقضی شده)، یه‌بار
    // silent refresh می‌کنه و دوباره امتحان می‌کنه - کاربر چیزی
    // حس نمی‌کنه، فقط اگه refresh هم fail بشه لاگ‌اوت می‌شه.
    const authFetch = useCallback(
        async (path, options = {}) => {
            const doFetch = (token) =>
                fetch(`${API_BASE_URL}${path}`, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });

            let res = await doFetch(accessTokenRef.current);

            if (res.status === 401) {
                try {
                    const data = await authApi.refresh();
                    applySession(data);
                    res = await doFetch(data.accessToken);
                } catch (e) {
                    setAccessToken(null);
                    setCustomer(null);
                }
            }

            return res;
        },
        [applySession],
    );

    const value = {
        customer,
        accessToken,
        loading,
        isLoggedIn: !!customer,
        register,
        resendCode,
        verifyEmail,
        login,
        logout,
        forgotPassword,
        resetPassword,
        authFetch,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth باید داخل AuthProvider استفاده بشه");
    return ctx;
}

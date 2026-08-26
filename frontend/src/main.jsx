import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { logClientError } from "./lib/api";

/*====================================
        CLIENT ERROR LOGGING

        پورت‌شده از js/common.js — همون دو تا
        window listener، همون logClientError.
====================================*/

window.addEventListener("error", (e) => {
    logClientError(e.message || "خطای ناشناخته", { stack: e.error?.stack });
});

window.addEventListener("unhandledrejection", (e) => {
    logClientError(`Promise rejection: ${e.reason?.message || e.reason}`, { stack: e.reason?.stack });
});

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </StrictMode>,
);

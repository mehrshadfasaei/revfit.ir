/*====================================
        TOAST (pub/sub)

        جایگزین DOM-injection قدیمی shop-data.js's
        showToast(). هر جای اپ می‌تونه showToast(msg)
        رو صدا بزنه؛ کامپوننت <Toast/> (یه‌بار توی
        Layout مونت می‌شه) با یه window event بهش
        گوش می‌ده و رندرش می‌کنه.
====================================*/

export function showToast(message) {
    window.dispatchEvent(new CustomEvent("toast:show", { detail: { message } }));
}

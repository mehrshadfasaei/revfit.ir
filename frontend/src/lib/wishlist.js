/*====================================
        پورت‌شده از js/wishlist.js —
        همون کلید localStorage ("wishlist")،
        همون شکل داده (آرایه‌ای از id عددی).
====================================*/

export function getWishlistIds() {
    return JSON.parse(localStorage.getItem("wishlist")) || [];
}

export function removeFromWishlist(id) {
    const wishlist = getWishlistIds().filter((wishId) => wishId !== id);

    localStorage.setItem("wishlist", JSON.stringify(wishlist));
}

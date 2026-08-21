/*====================================
        CLIENT ERROR LOGGING

        هر خطای واقعی که توی مرورگر مشتری‌ها اتفاق میفته
        (خطای جاوااسکریپت، fetch شکست‌خورده و...) رو
        می‌فرسته بک‌اند تا توی پنل ادمین ببینیمش.
====================================*/

function logClientError(message, extra = {}){

    try{

        if(typeof API_BASE_URL === "undefined") return;

        fetch(`${API_BASE_URL}/api/log-error`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({

                message: String(message).slice(0, 1000),

                pageUrl: window.location.href,

                userAgent: navigator.userAgent,

                stack: extra.stack ? String(extra.stack).slice(0, 2000) : null

            }),

            keepalive: true

        }).catch(() => {});   // اگه خودِ لاگ‌فرستادن هم fail بشه، دیگه کاری نمی‌کنیم (جلوگیری از حلقه‌ی بی‌نهایت)

    }catch(e){}

}

window.addEventListener("error", (e) => {

    logClientError(e.message || "خطای ناشناخته", { stack: e.error?.stack });

});

window.addEventListener("unhandledrejection", (e) => {

    logClientError(`Promise rejection: ${e.reason?.message || e.reason}`, { stack: e.reason?.stack });

});


/*====================================
        PAGE LOADER

        وقتی کل صفحه (عکس‌ها هم) کامل لود شد،
        اسپینر رو محو می‌کنه.
====================================*/

window.addEventListener("load", () => {

    const pageLoader = document.getElementById("pageLoader");

    if(pageLoader) pageLoader.classList.add("loaded");

});

// حالت اطمینان: اگه بعد از ۵ ثانیه هنوز لود نشده بود، مجبورش کن محو بشه
setTimeout(() => {

    const pageLoader = document.getElementById("pageLoader");

    if(pageLoader) pageLoader.classList.add("loaded");

}, 5000);


/*====================================
        MOBILE MENU TOGGLE

        این فایل توی همه‌ی صفحات (index.html,
        products.html, ...) لود می‌شه چون
        هدر/فوتر مشترکه.
====================================*/

const menuBtn   = document.querySelector(".menu-btn");

const navLinks  = document.querySelector(".nav-links");

if(menuBtn && navLinks){

    menuBtn.addEventListener("click", () => {

        navLinks.classList.toggle("active");

    });

    navLinks.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            navLinks.classList.remove("active");

        });

    });

}

const mobileMenuClose = document.getElementById("mobileMenuClose");

if(mobileMenuClose && navLinks){

    mobileMenuClose.addEventListener("click", () => {

        navLinks.classList.remove("active");

    });

}

const mobileMenuSearchTrigger = document.getElementById("mobileMenuSearchTrigger");

if(mobileMenuSearchTrigger && navLinks){

    mobileMenuSearchTrigger.addEventListener("click", () => {

        navLinks.classList.remove("active");

        openSearchOverlay();

    });

}


/*====================================
        CART COUNT BADGE

        عدد کنار آیکون سبد خرید توی هدر.
        هر جا (products.js یا بعداً یه
        صفحه‌ی دیگه) که آیتمی به
        localStorage.cart اضافه/کم می‌شه،
        کافیه updateCartBadge() صدا زده بشه.
====================================*/

function getCartCount(){

    const cart = JSON.parse(localStorage.getItem("cart")) || [];

    return cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

}

function updateCartBadge(){

    const count = getCartCount();

    document.querySelectorAll(".cart-count").forEach(badge => {

        badge.textContent = count;

        const isMobileMenuBadge = badge.classList.contains("mobile-cart-count");

        badge.style.display = count > 0 ? (isMobileMenuBadge ? "inline-flex" : "flex") : "none";

    });

}

document.addEventListener("DOMContentLoaded", updateCartBadge);

// اگه توی یه تب دیگه سبد خرید عوض بشه، همینجا هم آپدیت می‌شه
window.addEventListener("storage", (e) => {

    if(e.key === "cart") updateCartBadge();

});


/*====================================
        GLOBAL SEARCH OVERLAY

        این بخش به shop-data.js وابسته‌ست
        (باید قبل از common.js لینک بشه)
        چون از getProducts()/formatPrice()
        استفاده می‌کنه.
====================================*/

const searchTrigger  = document.getElementById("searchTrigger");

const searchOverlay  = document.getElementById("searchOverlay");

const searchCloseBtn = document.getElementById("searchClose");

const globalSearchInput = document.getElementById("globalSearchInput");

const searchResultsEl   = document.getElementById("searchResults");

function openSearchOverlay(){

    if(!searchOverlay) return;

    searchOverlay.classList.add("show");

    document.body.style.overflow = "hidden";

    setTimeout(() => globalSearchInput && globalSearchInput.focus(), 100);

}

function closeSearchOverlay(){

    if(!searchOverlay) return;

    searchOverlay.classList.remove("show");

    document.body.style.overflow = "";

}

if(searchTrigger){

    searchTrigger.addEventListener("click", (e) => {

        e.preventDefault();

        openSearchOverlay();

    });

}

if(searchCloseBtn){

    searchCloseBtn.addEventListener("click", closeSearchOverlay);

}

if(searchOverlay){

    searchOverlay.addEventListener("click", (e) => {

        if(e.target === searchOverlay) closeSearchOverlay();

    });

}

document.addEventListener("keydown", (e) => {

    if(e.key === "Escape" && searchOverlay && searchOverlay.classList.contains("show")){

        closeSearchOverlay();

    }

});

async function runGlobalSearch(term){

    if(!searchResultsEl) return;

    const query = term.trim().toLowerCase();

    if(query === ""){

        searchResultsEl.innerHTML = "";

        return;

    }

    const products = await getProducts();

    const matches = products.filter(p =>

        p.title.toLowerCase().includes(query) ||

        p.category.toLowerCase().includes(query)

    ).slice(0, 6);

    if(matches.length === 0){

        searchResultsEl.innerHTML = `<p class="search-empty">محصولی با این عنوان پیدا نشد.</p>`;

        return;

    }

    searchResultsEl.innerHTML = matches.map(p => `

        <a href="product.html?id=${p.id}" class="search-result-item">

            <img src="${p.image}" alt="${p.title}">

            <div>

                <h4>${p.title}</h4>

                <span>${formatPrice(p.price)} تومان</span>

            </div>

        </a>

    `).join("");

}

if(globalSearchInput){

    let globalSearchTimer;

    globalSearchInput.addEventListener("input", (e) => {

        clearTimeout(globalSearchTimer);

        globalSearchTimer = setTimeout(() => runGlobalSearch(e.target.value), 250);

    });

    globalSearchInput.addEventListener("keydown", (e) => {

        if(e.key === "Enter" && e.target.value.trim() !== ""){

            window.location.href = `products.html?search=${encodeURIComponent(e.target.value.trim())}`;

        }

    });

}


/*====================================
        BACK TO TOP + SCROLL PROGRESS BAR

        این دوتا توی همه‌ی صفحات هستن ولی
        تا الان هیچ‌جا JS نداشتن.
====================================*/

const topBtn      = document.getElementById("topBtn");

const progressBar = document.getElementById("progress-bar");

window.addEventListener("scroll", () => {

    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;

    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if(topBtn){

        topBtn.classList.toggle("show", scrollTop > 400);

    }

    if(progressBar && scrollHeight > 0){

        progressBar.style.width = `${(scrollTop / scrollHeight) * 100}%`;

    }

});

if(topBtn){

    topBtn.addEventListener("click", () => {

        window.scrollTo({ top: 0, behavior: "smooth" });

    });

}

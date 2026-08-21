/*====================================
        SHARED PRODUCT DATA SOURCE

        از بک‌اند واقعی (FastAPI + SQLite) می‌خونه.

        نکته‌ی مهم درباره‌ی هاست رایگان (Render):
        سرویس رایگان بعد از چند دقیقه بی‌کاری می‌خوابه؛
        اولین درخواست بعد از خواب ممکنه ۳۰-۵۰ ثانیه طول
        بکشه یا حتی یه‌بار fail بشه. برای همین یه‌بار
        دیگه امتحان می‌کنیم قبل از اینکه تسلیم بشیم -
        و اگه واقعاً در دسترس نبود، به‌جای نشون‌دادن
        محصولات ساختگی/قدیمی (که قبلاً می‌کرد و گیج‌کننده
        بود)، صادقانه یه آرایه‌ی خالی برمی‌گردونیم تا هر
        صفحه خودش پیام «اتصال برقرار نشد» رو نشون بده.
====================================*/

const API_BASE_URL = "https://revfit-ir.onrender.com";

const PLACEHOLDER_RATING  = 4.8;


async function getProducts(retryCount = 0){

    try{

        const res = await fetch(`${API_BASE_URL}/api/products`);

        if(!res.ok) throw new Error("API error");

        return await res.json();

    }catch(err){

        if(retryCount < 2){

            console.warn(`⚠️ اتصال به بک‌اند برقرار نشد؛ تلاش دوباره... (${retryCount + 1}/2)`);

            await new Promise(resolve => setTimeout(resolve, 4000));

            return getProducts(retryCount + 1);

        }

        console.error("❌ اتصال به بک‌اند بعد از چند تلاش هم برقرار نشد.", err);

        if(typeof logClientError === "function"){

            logClientError(`getProducts failed after retries: ${err.message}`, { stack: err.stack });

        }

        return [];

    }

}

async function getProductById(id){

    const products = await getProducts();

    return products.find(p => p.id === Number(id)) || null;

}


/*====================================
        SHARED HELPERS
====================================*/

function formatPrice(number){

    return number.toLocaleString("fa-IR");

}

function renderStars(rating){

    let html = "";

    const full = Math.floor(rating);

    const hasHalf = rating - full >= 0.5;

    for(let i = 0; i < 5; i++){

        if(i < full){

            html += `<i class="fa-solid fa-star"></i>`;

        }else if(i === full && hasHalf){

            html += `<i class="fa-solid fa-star-half-stroke"></i>`;

        }else{

            html += `<i class="fa-regular fa-star"></i>`;

        }

    }

    return html;

}

function showToast(message){

    const toast = document.createElement("div");

    toast.className = "toast";

    toast.innerHTML = message;

    document.body.appendChild(toast);

    setTimeout(()=> toast.classList.add("show"), 100);

    setTimeout(()=>{

        toast.classList.remove("show");

        setTimeout(()=> toast.remove(), 300);

    }, 2500);

}

function addToCart(product, quantity = 1){

    const cartItem = {

        id: product.id,

        title: product.title,

        price: product.price,

        image: product.image,

        size: product.size || null,

        quantity: quantity

    };

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    cart.push(cartItem);

    localStorage.setItem("cart", JSON.stringify(cart));

    if(typeof updateCartBadge === "function") updateCartBadge();

    showToast("🛒 محصول به سبد خرید اضافه شد");

}


/*====================================
        SHARED CART HELPERS

        (استفاده‌شده توسط cart.js و checkout.js)
====================================*/

const SHIPPING_COST = 250000; // نمادین - بعداً از قوانین ارسال واقعی محاسبه می‌شه

function getMergedCart(){

    const raw = JSON.parse(localStorage.getItem("cart")) || [];

    const merged = [];

    raw.forEach(item => {

        const existing = merged.find(m => m.id === item.id && (m.size || null) === (item.size || null));

        if(existing){

            existing.quantity += item.quantity || 1;

        }else{

            merged.push({ ...item, quantity: item.quantity || 1 });

        }

    });

    return merged;

}

function saveCart(items){

    localStorage.setItem("cart", JSON.stringify(items));

    if(typeof updateCartBadge === "function") updateCartBadge();

}

function getCartTotals(cart){

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const shipping = cart.length > 0 ? SHIPPING_COST : 0;

    return { subtotal, shipping, total: subtotal + shipping };

}

/*====================================
        SHARED PRODUCT DATA SOURCE

        الان از بک‌اند واقعی (FastAPI + SQLite)
        می‌خونه. اگه بک‌اند بالا نبود (مثلاً
        هنوز uvicorn رو اجرا نکردی)، خودکار
        از همین mockProducts به‌عنوان fallback
        استفاده می‌کنه تا صفحه خراب نشه.

        نکته‌ی مهم: چون این صفحات با file://
        باز می‌شن، بعضی مرورگرها fetch از
        file:// به http://localhost رو محدود
        می‌کنن. برای اجرای درست، فرانت‌اند رو
        هم از یه سرور محلی سرو کن، مثلاً:
        python -m http.server 5500
        یا اکستنشن Live Server توی VS Code.
====================================*/

const API_BASE_URL = "http://127.0.0.1:8000";

const PLACEHOLDER_RATING  = 4.8;


// fallback نمادین - فقط وقتی بک‌اند در دسترس نباشه استفاده می‌شه
const mockProducts = [

    { id:1, title:"تی‌شرت مسیر موتورسواری", price:450000, category:"تی‌شرت", image:"../images//product1.png", sales:412, createdAt:"2026-06-20" },
    { id:2, title:"هودی کلاسیک بایکر",      price:890000, category:"هودی",   image:"../images//product2.png", sales:355, createdAt:"2026-05-11" },
    { id:3, title:"تی‌شرت طرح جمجمه رایدر", price:480000, category:"تی‌شرت", image:"../images//product3.png", sales:501, createdAt:"2026-07-02" },
    { id:4, title:"هودی طرح عقاب موتورسوار", price:950000, category:"هودی",  image:"../images//product4.png", sales:289, createdAt:"2026-04-18" }

];

async function getProducts(){

    try{

        const res = await fetch(`${API_BASE_URL}/api/products`);

        if(!res.ok) throw new Error("API error");

        return await res.json();

    }catch(err){

        console.warn("⚠️ اتصال به بک‌اند برقرار نشد؛ از دیتای نمادین استفاده می‌شه.", err);

        return mockProducts;

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

/*====================================
        MOCK DATA SOURCE

        وقتی بک‌اند آماده شد، فقط بدنه‌ی
        getProducts() رو با یه fetch واقعی
        عوض کن؛ بقیه‌ی کد بدون تغییر کار می‌کنه.

        مثال جایگزینی بعدی:

        async function getProducts(){
            const res = await fetch("/api/products");
            return res.json();
        }
====================================*/

/*====================================
        PLACEHOLDER RATING (نمادین)

        تا وقتی نظرات واقعی از دیتابیس نیومده،
        همه محصولات همین مقدار ثابت رو نشون می‌دن.

        وقتی به دیتابیس وصل شدی، کافیه توی آبجکت
        هر محصول فیلدهای rating و reviews واقعی
        رو برگردونی؛ چون رندر پایین‌تر اول سراغ
        product.rating می‌ره و فقط در نبودش از
        این مقدار ثابت استفاده می‌کنه.
====================================*/

const PLACEHOLDER_RATING  = 4.8;

const PLACEHOLDER_REVIEWS = 120;


const mockProducts = [

    { id:1, title:"باکس موتور سیکلت مکعبی Hkt پلیمری",          price:980000,  category:"باکس", image:"../images//cat1.jpg", sales:412, createdAt:"2026-06-20" },
    { id:2, title:"باکس موتور سیکلت مکعبی ردلاین Redline پلیمری مشکی قرمز", price:1080000, category:"باکس", image:"../images//cat2.jpg", sales:355, createdAt:"2026-05-11" },
    { id:3, title:"باکس موتور سیکلت مکعبی فلزی ردلاین Redline", price:1480000, category:"باکس", image:"../images//cat3.jpg", sales:501, createdAt:"2026-07-02" },
    { id:4, title:"باکس موتور سیکلت فلزی ردلاین Redline طرح X", price:1980000, category:"باکس", image:"../images//cat4.jpg", sales:289, createdAt:"2026-04-18" }

];

async function getProducts(){

    // فعلاً از دیتای mock بالا؛ بعداً با fetch به API واقعی جایگزین می‌شه.

    return mockProducts;

}


/*====================================
        STATE
====================================*/

const state = {

    all:[],

    filtered:[],

    search:"",

    sort:"newest",

    page:1,

    perPage:8,

    wishlist: JSON.parse(localStorage.getItem("wishlist")) || [],

    quickViewQuantity:1,

    quickViewProduct:null

};


/*====================================
        HELPERS
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

function sortProducts(list, sortKey){

    const sorted = [...list];

    switch(sortKey){

        case "cheapest":

            sorted.sort((a,b)=> a.price - b.price);

            break;

        case "expensive":

            sorted.sort((a,b)=> b.price - a.price);

            break;

        case "bestseller":

            sorted.sort((a,b)=> b.sales - a.sales);

            break;

        case "newest":

        default:

            sorted.sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

    }

    return sorted;

}

function applyFilters(){

    let list = state.all;

    if(state.search.trim() !== ""){

        const term = state.search.trim().toLowerCase();

        list = list.filter(p =>

            p.title.toLowerCase().includes(term) ||

            p.category.toLowerCase().includes(term)

        );

    }

    list = sortProducts(list, state.sort);

    state.filtered = list;

    state.page = 1;

    render();

}


/*====================================
        RENDER: PRODUCT CARDS
====================================*/

function renderGrid(){

    const grid = document.getElementById("productsGrid");

    const emptyState = document.getElementById("emptyState");

    if(!grid || !emptyState) return;

    grid.innerHTML = "";

    const start = (state.page - 1) * state.perPage;

    const pageItems = state.filtered.slice(start, start + state.perPage);

    if(pageItems.length === 0){

        emptyState.classList.add("show");

        grid.style.display = "none";

        return;

    }

    emptyState.classList.remove("show");

    grid.style.display = "grid";

    pageItems.forEach(product => {

        const isWished = state.wishlist.includes(product.id);

        const rating  = product.rating  ?? PLACEHOLDER_RATING;

        const reviews = product.reviews ?? PLACEHOLDER_REVIEWS;

        const card = document.createElement("div");

        card.className = "product-card";

        card.innerHTML = `

            <div class="product-image">

                <span class="brand-badge">GS</span>

                <a href="product.html?id=${product.id}">

                    <img src="${product.image}" alt="${product.title}">

                </a>

            </div>

            <div class="product-info">

                <h3>${product.title}</h3>

                <div class="product-rating">

                    <span class="stars">${renderStars(rating)}</span>

                    <span class="review-count">(${reviews})</span>

                </div>

                <span class="price">${formatPrice(product.price)} تومان</span>

            </div>

            <div class="product-actions">

                <button class="action-icon quick-view-btn" data-id="${product.id}" title="نمای سریع">

                    <i class="fa-solid fa-magnifying-glass"></i>

                </button>

                <button class="add-to-cart-btn" data-id="${product.id}">

                    افزودن به سبد خرید

                </button>

                <button class="action-icon card-wishlist-btn ${isWished ? "active" : ""}" data-id="${product.id}" title="علاقه‌مندی">

                    <i class="fa-${isWished ? "solid" : "regular"} fa-heart"></i>

                </button>

            </div>

        `;

        grid.appendChild(card);

    });

}


/*====================================
        RENDER: RESULT COUNT
====================================*/

function renderResultCount(){

    const el = document.getElementById("resultCount");

    if(!el) return;

    el.textContent = `${state.filtered.length} محصول یافت شد`;

}


/*====================================
        RENDER: PAGINATION
====================================*/

function renderPagination(){

    const pagination = document.getElementById("pagination");

    if(!pagination) return;

    pagination.innerHTML = "";

    const totalPages = Math.ceil(state.filtered.length / state.perPage);

    if(totalPages <= 1) return;

    const prevBtn = document.createElement("button");

    prevBtn.innerHTML = `<i class="fa-solid fa-chevron-right"></i>`;

    prevBtn.disabled = state.page === 1;

    prevBtn.addEventListener("click", () => goToPage(state.page - 1));

    pagination.appendChild(prevBtn);

    for(let i = 1; i <= totalPages; i++){

        const btn = document.createElement("button");

        btn.textContent = i;

        if(i === state.page) btn.classList.add("active");

        btn.addEventListener("click", () => goToPage(i));

        pagination.appendChild(btn);

    }

    const nextBtn = document.createElement("button");

    nextBtn.innerHTML = `<i class="fa-solid fa-chevron-left"></i>`;

    nextBtn.disabled = state.page === totalPages;

    nextBtn.addEventListener("click", () => goToPage(state.page + 1));

    pagination.appendChild(nextBtn);

}

function goToPage(page){

    state.page = page;

    render();

    const toolbarSection = document.querySelector(".shop-toolbar-section");

    if(toolbarSection) toolbarSection.scrollIntoView({behavior:"smooth", block:"start"});

}


/*====================================
        MASTER RENDER
====================================*/

function render(){

    renderGrid();

    renderResultCount();

    renderPagination();

}


/*====================================
        ADD TO CART (delegated)
====================================*/

function addToCart(product, quantity = 1){

    const cartItem = {

        id: product.id,

        title: product.title,

        price: product.price,

        image: product.image,

        quantity: quantity

    };

    let cart = JSON.parse(localStorage.getItem("cart")) || [];

    cart.push(cartItem);

    localStorage.setItem("cart", JSON.stringify(cart));

    showToast("🛒 محصول به سبد خرید اضافه شد");

}

function toggleWishlist(id, btnEl){

    const index = state.wishlist.indexOf(id);

    const icon = btnEl.querySelector("i");

    if(index === -1){

        state.wishlist.push(id);

        btnEl.classList.add("active");

        icon.classList.remove("fa-regular");

        icon.classList.add("fa-solid");

        showToast("❤️ محصول به علاقه‌مندی‌ها اضافه شد");

    }else{

        state.wishlist.splice(index, 1);

        btnEl.classList.remove("active");

        icon.classList.remove("fa-solid");

        icon.classList.add("fa-regular");

        showToast("❌ محصول از علاقه‌مندی‌ها حذف شد");

    }

    localStorage.setItem("wishlist", JSON.stringify(state.wishlist));

}

const productsGridEl = document.getElementById("productsGrid");

if(productsGridEl){

    productsGridEl.addEventListener("click", (e) => {

        const cartBtn = e.target.closest(".add-to-cart-btn");

        const wishBtn = e.target.closest(".card-wishlist-btn");

        const quickBtn = e.target.closest(".quick-view-btn");

        if(cartBtn){

            const product = state.all.find(p => p.id === Number(cartBtn.dataset.id));

            if(product) addToCart(product, 1);

            return;

        }

        if(wishBtn){

            toggleWishlist(Number(wishBtn.dataset.id), wishBtn);

            return;

        }

        if(quickBtn){

            openQuickView(Number(quickBtn.dataset.id));

            return;

        }

    });

}


/*====================================
        QUICK VIEW MODAL
====================================*/

const qvOverlay = document.getElementById("quickViewOverlay");

function openQuickView(id){

    if(!qvOverlay) return;

    const product = state.all.find(p => p.id === id);

    if(!product) return;

    state.quickViewProduct = product;

    state.quickViewQuantity = 1;

    document.getElementById("qvImage").src = product.image;

    document.getElementById("qvImage").alt = product.title;

    document.getElementById("qvTitle").textContent = product.title;

    document.getElementById("qvStars").innerHTML = renderStars(product.rating ?? PLACEHOLDER_RATING);

    document.getElementById("qvReviews").textContent = `(${product.reviews ?? PLACEHOLDER_REVIEWS} نظر)`;

    document.getElementById("qvPrice").textContent = `${formatPrice(product.price)} تومان`;

    document.getElementById("qvQuantity").value = 1;

    document.getElementById("qvDetailLink").href = `product.html?id=${product.id}`;

    qvOverlay.classList.add("show");

    document.body.style.overflow = "hidden";

}

function closeQuickView(){

    if(!qvOverlay) return;

    qvOverlay.classList.remove("show");

    document.body.style.overflow = "";

}

const qvCloseBtn = document.getElementById("quickViewClose");

if(qvCloseBtn) qvCloseBtn.addEventListener("click", closeQuickView);

if(qvOverlay){

    qvOverlay.addEventListener("click", (e) => {

        if(e.target === qvOverlay) closeQuickView();

    });

}

document.addEventListener("keydown", (e) => {

    if(e.key === "Escape" && qvOverlay && qvOverlay.classList.contains("show")) closeQuickView();

});

const qvPlusBtn = document.getElementById("qvPlus");

if(qvPlusBtn){

    qvPlusBtn.addEventListener("click", () => {

        state.quickViewQuantity++;

        document.getElementById("qvQuantity").value = state.quickViewQuantity;

    });

}

const qvMinusBtn = document.getElementById("qvMinus");

if(qvMinusBtn){

    qvMinusBtn.addEventListener("click", () => {

        if(state.quickViewQuantity > 1){

            state.quickViewQuantity--;

            document.getElementById("qvQuantity").value = state.quickViewQuantity;

        }

    });

}

const qvAddCartBtn = document.getElementById("qvAddCart");

if(qvAddCartBtn){

    qvAddCartBtn.addEventListener("click", () => {

        if(!state.quickViewProduct) return;

        addToCart(state.quickViewProduct, state.quickViewQuantity);

        closeQuickView();

    });

}


/*====================================
        SEARCH (debounced)
====================================*/

let searchTimer;

const productSearchEl = document.getElementById("productSearch");

if(productSearchEl){

    productSearchEl.addEventListener("input", (e) => {

        clearTimeout(searchTimer);

        searchTimer = setTimeout(() => {

            state.search = e.target.value;

            applyFilters();

        }, 300);

    });

}


/*====================================
        SORT
====================================*/

const productSortEl = document.getElementById("productSort");

if(productSortEl){

    productSortEl.addEventListener("change", (e) => {

        state.sort = e.target.value;

        applyFilters();

    });

}


/*====================================
        INIT
====================================*/

(async function init(){

    state.all = await getProducts();

    applyFilters();

})();
/*====================================
        این فایل به shop-data.js وابسته‌ست
        (باید قبل از این فایل لینک بشه):
        mockProducts, getProducts, formatPrice,
        renderStars, showToast, addToCart,
        PLACEHOLDER_RATING, PLACEHOLDER_REVIEWS
====================================*/


/*====================================
        STATE
====================================*/

const state = {

    all:[],

    filtered:[],

    search:"",

    sort:"newest",

    page:1,

    perPage:8

};


/*====================================
        HELPERS (specific to this page)
====================================*/

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

        const rating  = product.rating  ?? PLACEHOLDER_RATING;

        const card = document.createElement("div");

        card.className = "product-card";

        const isOutOfStock = product.in_stock === false;

        const secondImage = (product.images && product.images.length > 0) ? product.images[0].image_url : null;

        card.innerHTML = `

            <div class="product-image">

                <span class="brand-badge">GS</span>

                <a href="product.html?id=${product.id}">

                    <img src="${product.image}" alt="${product.title}" class="product-image-main ${isOutOfStock ? "is-out-of-stock" : ""}">

                    ${secondImage ? `<img src="${secondImage}" alt="${product.title}" class="product-image-hover">` : ''}

                </a>

                ${isOutOfStock ? '<span class="sold-out-overlay">ناموجود</span>' : ''}

            </div>

            <a href="product.html?id=${product.id}" class="product-info">

                <h3>${product.title}</h3>

                <div class="product-rating">

                    <span class="stars">${renderStars(rating)}</span>

                </div>

                <span class="price">${formatPrice(product.price)} تومان</span>

                ${isOutOfStock ? '<span class="card-out-of-stock-label">ناموجود</span>' : ''}

            </a>

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

    const urlParams = new URLSearchParams(window.location.search);

    const searchFromUrl = urlParams.get("search");

    if(searchFromUrl){

        state.search = searchFromUrl;

        if(productSearchEl) productSearchEl.value = searchFromUrl;

    }

    applyFilters();

})();
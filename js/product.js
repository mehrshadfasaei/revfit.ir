/*====================================
        این فایل به shop-data.js وابسته‌ست
        (باید قبل از این فایل لینک بشه):
        getProductById, getProducts, formatPrice,
        renderStars, showToast, addToCart,
        PLACEHOLDER_RATING
====================================*/

let currentProduct   = null;

let selectedQuantity = 1;

let currentStockBySize = {};


/*====================================
        SMALL DOM HELPERS
====================================*/

function setText(id, value){

    const el = document.getElementById(id);

    if(el) el.textContent = value;

}

function setHTML(id, value){

    const el = document.getElementById(id);

    if(el) el.innerHTML = value;

}


/*====================================
        LOAD PRODUCT BY ?id= FROM URL
====================================*/

function getProductIdFromUrl(){

    const params = new URLSearchParams(window.location.search);

    return params.get("id");

}

async function loadProduct(){

    const id = getProductIdFromUrl();

    const product = await getProductById(id);

    if(!product){

        // محصولی با این شناسه پیدا نشد؛ برگرد به لیست محصولات

        window.location.href = "products.html";

        return;

    }

    currentProduct = product;

    renderProduct(product);

    renderRelatedProducts(product);

}

function renderProduct(product){

    const rating  = product.rating  ?? PLACEHOLDER_RATING;

    document.title = `${product.title} | Moto Store`;

    setText("productTitle", product.title);

    setText("breadcrumbTitle", product.title);

    setText("productPrice", `${formatPrice(product.price)} تومان`);

    setHTML("productStars", renderStars(rating));

    /* اگه ادمین برای این محصول توضیحات دستی نوشته باشه، همون استفاده
       می‌شه؛ وگرنه یه توضیح خودکار ساده ساخته می‌شه. */

    const hasManualDescription = product.description && product.description.trim() !== "";

    const autoShortDesc = `${product.title} از دسته «${product.category}»، با کیفیت ساخت بالا و طراحی مقاوم — انتخابی مطمئن برای موتورسواران.`;

    const shortDesc = hasManualDescription ? product.description : autoShortDesc;

    setText("productDescription", shortDesc);

    setText("productFullDescription", hasManualDescription

        ? product.description

        : `${autoShortDesc} این محصول با بهترین متریال روز بازار تولید شده و تحت تست‌های استاندارد کیفیت و دوام قرار گرفته. مناسب استفاده روزمره و سفرهای طولانی، با دوخت مقاوم و پارچه‌ی باکیفیت.`

    );

    setHTML("productSpecs", `

        <li><span>دسته‌بندی</span><span>${product.category}</span></li>

        <li><span>کد محصول</span><span>GS-${String(product.id).padStart(4,"0")}</span></li>

        <li><span>وضعیت</span><span class="${product.in_stock === false ? "spec-out-of-stock" : "spec-in-stock"}">${product.in_stock === false ? "ناموجود" : "موجود"}</span></li>

    `);

    /* گالری: اگه محصول عکس‌های واقعی توی گالری داشته باشه (از پنل ادمین
       اضافه‌شده)، همونا رو نشون می‌ده. وگرنه فقط عکس اصلی رو تنها
       تامنیل نشون می‌ده (بدون تکرار الکی). */

    const galleryUrls = (product.images && product.images.length > 0)

        ? product.images.map(img => img.image_url)

        : [];

    const gallery = [product.image, ...galleryUrls];

    const mainImageEl = document.querySelector(".main-image img");

    const thumbsEl = document.getElementById("productThumbs");

    if(mainImageEl){

        mainImageEl.src = product.image;

        mainImageEl.alt = product.title;

    }

    if(thumbsEl){

        if(gallery.length > 1){

            thumbsEl.innerHTML = gallery.map((src, i) =>

                `<img src="${src}" alt="${product.title}" class="${i === 0 ? "active" : ""}">`

            ).join("");

            thumbsEl.style.display = "flex";

        }else{

            thumbsEl.innerHTML = "";

            thumbsEl.style.display = "none";

        }

    }

    bindGalleryClicks();

    /* وضعیت موجودی */

    const isOutOfStock = product.in_stock === false;

    const addCartBtnEl = document.querySelector(".add-cart");

    const buyNowBtnEl = document.getElementById("buyNowBtn");

    const stockBadgeEl = document.getElementById("stockBadge");

    if(stockBadgeEl){

        stockBadgeEl.style.display = isOutOfStock ? "inline-block" : "none";

    }

    if(isOutOfStock){

        if(addCartBtnEl){

            addCartBtnEl.disabled = true;

            addCartBtnEl.innerHTML = `<i class="fa-solid fa-ban"></i> ناموجود`;

        }

        if(buyNowBtnEl){

            buyNowBtnEl.disabled = true;

            buyNowBtnEl.style.display = "none";

        }

    }

    /* سایزهای ناموجود بر اساس موجودی واقعی (حتی وقتی خود محصول
       کلاً موجوده، ممکنه فقط یه سایز خاصش تموم شده باشه) */

    currentStockBySize = {};

    (product.stock || []).forEach(s => { currentStockBySize[s.size] = s.quantity; });

    document.querySelectorAll(".size-btn").forEach(btn => {

        const qty = currentStockBySize[btn.dataset.size] ?? 0;

        if(qty <= 0){

            btn.classList.add("size-unavailable");

            btn.disabled = true;

            btn.title = "این سایز ناموجوده";

        }else{

            btn.classList.remove("size-unavailable");

            btn.disabled = false;

            btn.title = qty <= 3 ? `فقط ${qty} عدد باقی مونده` : "";

        }

    });

}

function renderRelatedProducts(product){

    const container = document.getElementById("relatedGrid");

    if(!container) return;

    getProducts().then(all => {

        const related = all.filter(p => p.id !== product.id).slice(0, 3);

        container.innerHTML = related.map(p => `

            <a href="product.html?id=${p.id}" class="related-card">

                <img src="${p.image}" alt="${p.title}">

                <h4>${p.title}</h4>

                <span class="price">${formatPrice(p.price)} تومان</span>

            </a>

        `).join("");

        // چون این کارت‌ها بعد از راه‌اندازی اولیه‌ی observer ساخته می‌شن،
        // باید جدا observe بشن وگرنه انیمیشن ظاهرشدنشون هیچ‌وقت اجرا نمی‌شه
        container.querySelectorAll(".related-card").forEach(el => {

            if(typeof scrollObserver !== "undefined"){

                scrollObserver.observe(el);

            }else{

                el.classList.add("show");

            }

        });

    });

}


/*====================================
        IMAGE GALLERY
====================================*/

function bindGalleryClicks(){

    const thumbnails = document.querySelectorAll(".thumbs img");

    const mainImage = document.querySelector(".main-image img");

    if(!mainImage) return;

    thumbnails.forEach(thumb => {

        thumb.addEventListener("click", () => {

            thumbnails.forEach(item => item.classList.remove("active"));

            thumb.classList.add("active");

            mainImage.src = thumb.src;

        });

    });

}


/*====================================
        QUANTITY
====================================*/

const minusBtn = document.querySelector(".quantity button:first-child");

const plusBtn  = document.querySelector(".quantity button:last-child");

const quantityInput = document.querySelector(".quantity input");

if(plusBtn && minusBtn && quantityInput){

    plusBtn.addEventListener("click", () => {

        const maxQty = selectedSize ? (currentStockBySize[selectedSize] ?? 0) : Infinity;

        if(selectedQuantity >= maxQty){

            showToast(`⚠️ فقط ${maxQty} عدد از این سایز موجوده`);

            return;

        }

        selectedQuantity++;

        quantityInput.value = selectedQuantity;

    });

    minusBtn.addEventListener("click", () => {

        if(selectedQuantity > 1){

            selectedQuantity--;

            quantityInput.value = selectedQuantity;

        }

    });

}


/*====================================
        PRODUCT TABS
====================================*/

const tabButtons  = document.querySelectorAll(".tab-btn");

const tabContents = document.querySelectorAll(".tab-content");

tabButtons.forEach(button => {

    button.addEventListener("click", () => {

        tabButtons.forEach(btn => btn.classList.remove("active"));

        tabContents.forEach(tab => tab.classList.remove("active"));

        button.classList.add("active");

        const target = document.getElementById(button.dataset.tab);

        if(target) target.classList.add("active");

    });

});


/*====================================
        SHARE
====================================*/

const shareBtn = document.querySelector(".share-btn");

if(shareBtn){

    shareBtn.addEventListener("click", () => {

        if(navigator.share && currentProduct){

            navigator.share({ title: currentProduct.title, url: window.location.href });

        }else{

            navigator.clipboard.writeText(window.location.href);

            showToast("🔗 لینک محصول کپی شد");

        }

    });

}


/*====================================
        SIZE SELECTOR
====================================*/

let selectedSize = null;

const sizeButtons = document.querySelectorAll(".size-btn");

sizeButtons.forEach(btn => {

    btn.addEventListener("click", () => {

        sizeButtons.forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        selectedSize = btn.dataset.size;

        const displayEl = document.getElementById("selectedSizeDisplay");

        if(displayEl) displayEl.textContent = `سایز انتخابی: ${selectedSize} ✓`;

        // چون موجودی سایز جدید ممکنه کمتر از تعداد فعلی باشه
        const maxQty = currentStockBySize[selectedSize] ?? 0;

        selectedQuantity = Math.min(1, maxQty) || 1;

        const qtyInputEl = document.querySelector(".quantity input");

        if(qtyInputEl) qtyInputEl.value = selectedQuantity;

    });

});

function requireSizeSelected(){

    if(selectedSize) return true;

    showToast("⚠️ لطفاً یه سایز انتخاب کن");

    const sizeOptionsEl = document.getElementById("sizeOptions");

    if(sizeOptionsEl){

        sizeOptionsEl.classList.add("size-error");

        setTimeout(() => sizeOptionsEl.classList.remove("size-error"), 1200);

    }

    return false;

}


/*====================================
        ADD TO CART
====================================*/

const addCartBtn = document.querySelector(".add-cart");

if(addCartBtn){

    addCartBtn.addEventListener("click", () => {

        if(!currentProduct) return;

        if(!requireSizeSelected()) return;

        addToCart({ ...currentProduct, size: selectedSize }, selectedQuantity);

    });

}


/*====================================
        BUY NOW
====================================*/

const buyNowBtn = document.getElementById("buyNowBtn");

if(buyNowBtn){

    buyNowBtn.addEventListener("click", () => {

        if(!currentProduct) return;

        if(!requireSizeSelected()) return;

        addToCart({ ...currentProduct, size: selectedSize }, selectedQuantity);

        window.location.href = "checkout.html";

    });

}



/*====================================
        IMAGE ZOOM
====================================*/

const mainImageContainer = document.querySelector(".main-image");

if(mainImageContainer){

    const zoomImg = mainImageContainer.querySelector("img");

    mainImageContainer.addEventListener("mousemove", (e) => {

        const rect = mainImageContainer.getBoundingClientRect();

        const x = ((e.clientX - rect.left) / rect.width) * 100;

        const y = ((e.clientY - rect.top) / rect.height) * 100;

        zoomImg.style.transformOrigin = `${x}% ${y}%`;

        zoomImg.style.transform = "scale(2)";

    });

    mainImageContainer.addEventListener("mouseleave", () => {

        zoomImg.style.transformOrigin = "center";

        zoomImg.style.transform = "scale(1)";

    });

}


/*====================================
        ACCORDION (مشخصات / ارسال و بازگشت)
====================================*/

document.querySelectorAll(".accordion-header").forEach(header => {

    header.addEventListener("click", () => {

        const body = document.getElementById(`accordion${header.dataset.accordion.charAt(0).toUpperCase()}${header.dataset.accordion.slice(1)}`);

        const icon = header.querySelector(".accordion-icon");

        const isOpen = header.classList.contains("active");

        header.classList.toggle("active", !isOpen);

        if(body) body.classList.toggle("open", !isOpen);

        if(icon) icon.textContent = isOpen ? "+" : "−";

    });

});


/*====================================
        SCROLL ANIMATION
====================================*/

const scrollObserver = new IntersectionObserver((entries) => {

    entries.forEach(entry => {

        if(entry.isIntersecting) entry.target.classList.add("show");

    });

});

document.querySelectorAll(".related-card, .payment-box").forEach(el => {

    scrollObserver.observe(el);

});


/*====================================
        INIT
====================================*/

loadProduct();

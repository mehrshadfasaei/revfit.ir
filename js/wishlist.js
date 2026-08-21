/*====================================
        این فایل به shop-data.js و common.js
        وابسته‌ست (باید قبلش لینک بشن):
        getProducts, formatPrice, renderStars,
        showToast, addToCart, PLACEHOLDER_RATING,
        PLACEHOLDER_REVIEWS
====================================*/

function getWishlistIds(){

    return JSON.parse(localStorage.getItem("wishlist")) || [];

}

function removeFromWishlist(id){

    const wishlist = getWishlistIds().filter(wishId => wishId !== id);

    localStorage.setItem("wishlist", JSON.stringify(wishlist));

}

async function renderWishlist(){

    const grid = document.getElementById("wishlistGrid");

    const emptyState = document.getElementById("wishlistEmptyState");

    if(!grid || !emptyState) return;

    const wishlistIds = getWishlistIds();

    const allProducts = await getProducts();

    const wishlistProducts = allProducts.filter(p => wishlistIds.includes(p.id));

    if(wishlistProducts.length === 0){

        grid.style.display = "none";

        emptyState.classList.add("show");

        return;

    }

    grid.style.display = "grid";

    emptyState.classList.remove("show");

    grid.innerHTML = wishlistProducts.map(product => {

        const rating  = product.rating  ?? PLACEHOLDER_RATING;

        const reviews = product.reviews ?? PLACEHOLDER_REVIEWS;

        return `

            <div class="product-card">

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

                    <button class="action-icon card-wishlist-btn active" data-id="${product.id}" title="حذف از علاقه‌مندی‌ها">

                        <i class="fa-solid fa-heart"></i>

                    </button>

                    <button class="add-to-cart-btn" data-id="${product.id}">

                        افزودن به سبد خرید

                    </button>

                </div>

            </div>

        `;

    }).join("");

}

const wishlistGridEl = document.getElementById("wishlistGrid");

if(wishlistGridEl){

    wishlistGridEl.addEventListener("click", async (e) => {

        const removeBtn = e.target.closest(".card-wishlist-btn");

        const cartBtn = e.target.closest(".add-to-cart-btn");

        if(removeBtn){

            const id = Number(removeBtn.dataset.id);

            removeFromWishlist(id);

            showToast("❌ محصول از علاقه‌مندی‌ها حذف شد");

            renderWishlist();

            return;

        }

        if(cartBtn){

            const id = Number(cartBtn.dataset.id);

            const allProducts = await getProducts();

            const product = allProducts.find(p => p.id === id);

            if(product) addToCart(product, 1);

            return;

        }

    });

}


/*====================================
        INIT
====================================*/

renderWishlist();

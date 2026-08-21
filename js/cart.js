/*====================================
        این فایل به shop-data.js و common.js
        وابسته‌ست (باید قبلش لینک بشن):
        formatPrice, showToast, updateCartBadge,
        getMergedCart, saveCart, getCartTotals,
        SHIPPING_COST
====================================*/


/*====================================
        RENDER
====================================*/

function renderCart(){

    const cart = getMergedCart();

    const layout = document.getElementById("cartLayout");

    const emptyState = document.getElementById("cartEmptyState");

    if(!layout || !emptyState) return;

    if(cart.length === 0){

        layout.style.display = "none";

        emptyState.classList.add("show");

        return;

    }

    layout.style.display = "grid";

    emptyState.classList.remove("show");

    const { subtotal, total } = getCartTotals(cart);

    layout.innerHTML = `

        <div class="cart-items">

            ${cart.map(item => `

                <div class="cart-item" data-id="${item.id}" data-size="${item.size || ""}">

                    <a href="product.html?id=${item.id}" class="cart-item-image-link">

                        <img src="${item.image}" alt="${item.title}">

                    </a>

                    <div class="cart-item-info">

                        <a href="product.html?id=${item.id}"><h3>${item.title}</h3></a>

                        ${item.size ? `<span class="cart-item-size">سایز: ${item.size}</span>` : ""}

                        <span class="price">${formatPrice(item.price)} تومان</span>

                    </div>

                    <div class="cart-item-quantity">

                        <button class="qty-minus" data-id="${item.id}" data-size="${item.size || ""}">−</button>

                        <input type="text" value="${item.quantity}" readonly>

                        <button class="qty-plus" data-id="${item.id}" data-size="${item.size || ""}">+</button>

                    </div>

                    <span class="cart-item-subtotal">${formatPrice(item.price * item.quantity)} تومان</span>

                    <button class="cart-item-remove" data-id="${item.id}" data-size="${item.size || ""}" title="حذف">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            `).join("")}

        </div>

        <div class="cart-summary">

            <h3>خلاصه سفارش</h3>

            <div class="summary-row">

                <span>جمع جزء</span>

                <span>${formatPrice(subtotal)} تومان</span>

            </div>

            <div class="summary-row">

                <span>هزینه ارسال</span>

                <span>${formatPrice(SHIPPING_COST)} تومان</span>

            </div>

            <div class="summary-row summary-total">

                <span>مبلغ قابل پرداخت</span>

                <span>${formatPrice(total)} تومان</span>

            </div>

            <button class="checkout-btn" id="checkoutBtn">

                ادامه فرآیند خرید <i class="fa-solid fa-arrow-left"></i>

            </button>

            <a href="products.html" class="continue-link">

                <i class="fa-solid fa-arrow-right"></i> ادامه‌ی خرید از محصولات

            </a>

        </div>

    `;

}


/*====================================
        EVENTS (delegated)
====================================*/

const cartLayoutEl = document.getElementById("cartLayout");

if(cartLayoutEl){

    cartLayoutEl.addEventListener("click", async (e) => {

        const plusBtn   = e.target.closest(".qty-plus");

        const minusBtn  = e.target.closest(".qty-minus");

        const removeBtn = e.target.closest(".cart-item-remove");

        const checkoutBtn = e.target.closest("#checkoutBtn");

        if(plusBtn || minusBtn){

            const id = Number((plusBtn || minusBtn).dataset.id);

            const size = (plusBtn || minusBtn).dataset.size || null;

            const cart = getMergedCart();

            const item = cart.find(i => i.id === id && (i.size || null) === size);

            if(!item) return;

            if(plusBtn){

                const product = await getProductById(id);

                const stockForSize = size && product?.stock

                    ? (product.stock.find(s => s.size === size)?.quantity ?? 0)

                    : Infinity;

                if(item.quantity >= stockForSize){

                    showToast(`⚠️ فقط ${stockForSize} عدد از این سایز موجوده`);

                    return;

                }

                item.quantity++;

            }

            if(minusBtn && item.quantity > 1) item.quantity--;

            saveCart(cart);

            renderCart();

            return;

        }

        if(removeBtn){

            const id = Number(removeBtn.dataset.id);

            const size = removeBtn.dataset.size || null;

            const cart = getMergedCart().filter(i => !(i.id === id && (i.size || null) === size));

            saveCart(cart);

            renderCart();

            showToast("🗑️ محصول از سبد خرید حذف شد");

            return;

        }

        if(checkoutBtn){

            window.location.href = "checkout.html";

            return;

        }

    });

}


/*====================================
        INIT
====================================*/

renderCart();
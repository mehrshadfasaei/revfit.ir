/*====================================
        این فایل به shop-data.js و common.js
        وابسته‌ست (باید قبلش لینک بشن):
        formatPrice, showToast, updateCartBadge,
        getMergedCart, getCartTotals
====================================*/


/*====================================
        RENDER ORDER SUMMARY
====================================*/

let orderPlaced = false;

function renderCheckoutSummary(){

    if(orderPlaced) return;

    const cart = getMergedCart();

    if(cart.length === 0){

        window.location.href = "cart.html";

        return;

    }

    const { subtotal, shipping } = getCartTotals(cart);

    const shippingTypeInput = document.querySelector('input[name="shippingPaymentType"]:checked');

    const isCodShipping = shippingTypeInput?.value === "cod";

    const itemsEl = document.getElementById("checkoutItems");

    if(itemsEl){

        itemsEl.innerHTML = cart.map(item => `

            <div class="checkout-item">

                <img src="${item.image}" alt="${item.title}">

                <div class="checkout-item-info">

                    <h4>${item.title}</h4>

                    <span>${item.size ? `سایز: ${item.size} | ` : ""}تعداد: ${item.quantity}</span>

                </div>

                <span class="checkout-item-price">${formatPrice(item.price * item.quantity)} تومان</span>

            </div>

        `).join("");

    }

    setEl("checkoutSubtotal", `${formatPrice(subtotal)} تومان`);

    setEl("checkoutShipping", isCodShipping ? "پس‌کرایه" : `${formatPrice(shipping)} تومان`);

    setEl("checkoutTotal", `${formatPrice(isCodShipping ? subtotal : subtotal + shipping)} تومان`);

}

document.querySelectorAll('input[name="shippingPaymentType"]').forEach(input => {

    input.addEventListener("change", renderCheckoutSummary);

});

function setEl(id, value){

    const el = document.getElementById(id);

    if(el) el.textContent = value;

}


/*====================================
        FORM VALIDATION + SUBMIT
====================================*/

const checkoutForm = document.getElementById("checkoutForm");

if(checkoutForm){

    checkoutForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const requiredFields = checkoutForm.querySelectorAll("[required]");

        let isValid = true;

        requiredFields.forEach(field => {

            if(!field.value.trim()){

                isValid = false;

                field.classList.add("field-error");

            }else{

                field.classList.remove("field-error");

            }

        });

        if(!isValid){

            showToast("⚠️ لطفاً همه‌ی فیلدهای اجباری رو پر کن");

            return;

        }

        const phone = checkoutForm.querySelector('[name="phone"]').value.trim();

        if(!/^0\d{10}$/.test(phone)){

            checkoutForm.querySelector('[name="phone"]').classList.add("field-error");

            showToast("⚠️ شماره تماس رو درست وارد کن (مثلاً ۰۹۱۲۳۴۵۶۷۸۹)");

            return;

        }

        const agreeTermsEl = document.getElementById("agreeTerms");

        if(agreeTermsEl && !agreeTermsEl.checked){

            showToast("⚠️ برای ثبت سفارش، باید قوانین رو بپذیری");

            return;

        }

        placeOrder();

    });

}

async function placeOrder(){

    const cart = getMergedCart();

    const formData = new FormData(checkoutForm);

    const submitBtn = checkoutForm.closest(".checkout-layout").querySelector(".checkout-btn");

    if(submitBtn){

        submitBtn.disabled = true;

        submitBtn.textContent = "در حال ثبت سفارش...";

    }

    const payload = {

        fullName: formData.get("fullName"),

        phone: formData.get("phone"),

        province: formData.get("province"),

        city: formData.get("city"),

        address: formData.get("address"),

        postalCode: formData.get("postalCode"),

        paymentMethod: formData.get("payment"),

        shippingPaymentType: formData.get("shippingPaymentType") || "prepaid",

        notes: formData.get("notes") || null,

        website: formData.get("website") || "",

        items: cart.map(item => ({

            id: item.id,

            title: item.title,

            price: item.price,

            size: item.size || null,

            quantity: item.quantity

        }))

    };

    try{

        const res = await fetch(`${API_BASE_URL}/api/orders`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify(payload)

        });

        if(!res.ok){

            const errData = await res.json().catch(() => null);

            throw new Error(errData?.detail || "سفارش ثبت نشد");

        }

        const order = await res.json();

        orderPlaced = true;

        localStorage.removeItem("cart");

        if(typeof updateCartBadge === "function") updateCartBadge();

        setEl("orderNumber", order.order_number);

        document.getElementById("checkoutFormState").style.display = "none";

        document.getElementById("checkoutSuccessState").classList.add("show");

        window.scrollTo({ top: 0, behavior: "smooth" });

    }catch(err){

        console.error(err);

        showToast(`⚠️ ${err.message || "ثبت سفارش با مشکل مواجه شد؛ مطمئن شو بک‌اند روشنه"}`);

        if(submitBtn){

            submitBtn.disabled = false;

            submitBtn.innerHTML = `ثبت سفارش <i class="fa-solid fa-arrow-left"></i>`;

        }

    }

}


/*====================================
        INIT
====================================*/

renderCheckoutSummary();
/*====================================
        این فایل به shop-data.js وابسته‌ست
        (باید قبل از این فایل لینک بشه):
        formatPrice, API_BASE_URL
====================================*/

const STATUS_ORDER = ["pending", "paid", "shipped", "delivered"];

const trackOrderForm = document.getElementById("trackOrderForm");

const errorEl = document.getElementById("trackOrderError");

const resultEl = document.getElementById("trackOrderResult");

if(trackOrderForm){

    trackOrderForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        errorEl.textContent = "";

        resultEl.style.display = "none";

        const formData = new FormData(trackOrderForm);

        const orderNumber = formData.get("orderNumber").trim();

        const phone = formData.get("phone").trim();

        const submitBtn = trackOrderForm.querySelector(".track-order-submit");

        submitBtn.disabled = true;

        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> در حال جستجو...`;

        try{

            const res = await fetch(`${API_BASE_URL}/api/orders/${encodeURIComponent(orderNumber)}?phone=${encodeURIComponent(phone)}`);

            if(!res.ok){

                const errData = await res.json().catch(() => null);

                throw new Error(errData?.detail || "سفارشی با این مشخصات پیدا نشد");

            }

            const order = await res.json();

            renderOrderResult(order);

        }catch(err){

            errorEl.textContent = `⚠️ ${err.message}`;

        }finally{

            submitBtn.disabled = false;

            submitBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> پیگیری سفارش`;

        }

    });

}

function renderOrderResult(order){

    document.getElementById("resultOrderNumber").textContent = order.order_number;

    document.getElementById("resultOrderDate").textContent = new Date(order.created_at).toLocaleDateString("fa-IR");

    document.getElementById("resultOrderTotal").textContent = `${formatPrice(order.total)} تومان`;

    const currentIndex = STATUS_ORDER.indexOf(order.status);

    document.querySelectorAll(".order-timeline-step").forEach(stepEl => {

        const stepIndex = STATUS_ORDER.indexOf(stepEl.dataset.step);

        stepEl.classList.remove("done", "current");

        if(stepIndex < currentIndex) stepEl.classList.add("done");

        if(stepIndex === currentIndex) stepEl.classList.add("current");

    });

    const itemsEl = document.getElementById("trackOrderItems");

    itemsEl.innerHTML = `

        <h4>اقلام سفارش</h4>

        <ul>

            ${order.items.map(item => `

                <li>

                    <span>${item.title}${item.size ? ` (سایز ${item.size})` : ""} × ${item.quantity}</span>

                    <span>${formatPrice(item.price * item.quantity)} تومان</span>

                </li>

            `).join("")}

        </ul>

    `;

    resultEl.style.display = "block";

    resultEl.scrollIntoView({ behavior: "smooth", block: "start" });

}

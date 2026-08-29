const API_BASE_URL = "https://revfit-ir.onrender.com";

window.addEventListener("load", () => {

    const pageLoader = document.getElementById("pageLoader");

    if(pageLoader) pageLoader.classList.add("loaded");

});

setTimeout(() => {

    const pageLoader = document.getElementById("pageLoader");

    if(pageLoader) pageLoader.classList.add("loaded");

}, 5000);

let allProducts = [];


/*====================================
        HELPERS
====================================*/

function formatPrice(number){

    return Number(number).toLocaleString("fa-IR");

}

function getAdminKey(){

    return localStorage.getItem("adminKey");

}

function adminHeaders(extra = {}){

    return { "X-Admin-Key": getAdminKey(), ...extra };

}


/*====================================
        FETCH WITH RETRY

        بک‌اند رایگان Render بعد از چند دقیقه بی‌کاری می‌خوابه؛
        اولین درخواست بعد از خواب ممکنه fail بشه (ERR_FAILED)
        تا سرویس کامل بیدار بشه. این تابع اگه fetch در سطح
        شبکه fail بشه (نه یه پاسخ خطا مثل 401/404، بلکه واقعاً
        قطع اتصال)، یه‌بار دیگه با کمی فاصله امتحان می‌کنه.
====================================*/

async function fetchWithRetry(url, options = {}, retries = 2){

    try{

        const res = await fetch(url, options);

        // اگه این یه درخواست ادمین‌محور بود (هدر X-Admin-Key داشت) و بک‌اند
        // ۴۰۱ برگردوند، یعنی توکن نشست منقضی شده (هر ۸ ساعت طبیعیه) -
        // خودکار برگرد به صفحه‌ی لاگین به‌جای این‌که فقط یه خطای گنگ
        // تو کنسول بمونه.
        if(res.status === 401 && options.headers && options.headers["X-Admin-Key"]){

            localStorage.removeItem("adminKey");

            if(typeof showLogin === "function") showLogin("نشست شما منقضی شده؛ دوباره وارد شو.");

        }

        return res;

    }catch(err){

        if(retries > 0){

            await new Promise(resolve => setTimeout(resolve, 4000));

            return fetchWithRetry(url, options, retries - 1);

        }

        throw err;

    }

}


/*====================================
        LOGIN / LOGOUT
====================================*/

const loginScreen = document.getElementById("adminLoginScreen");

const dashboard   = document.getElementById("adminDashboard");

function showDashboard(){

    loginScreen.style.display = "none";

    dashboard.classList.add("show");

    loadDashboardStats();

    loadProducts();

    loadOrders();

    loadContactMessages();

}


/*====================================
        DASHBOARD STATS
====================================*/

async function loadDashboardStats(){

    const cardsEl = document.getElementById("dashboardCards");

    const topEl = document.getElementById("dashboardTopProducts");

    const lowStockEl = document.getElementById("dashboardLowStock");

    if(!cardsEl) return;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/stats`, {

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("خطا در دریافت آمار");

        const stats = await res.json();

        cardsEl.innerHTML = `

            <div class="admin-summary-card">

                <span class="admin-summary-number">${stats.today.count}</span>

                <span class="admin-summary-label">سفارش امروز</span>

                <span class="admin-summary-sub">${formatPrice(stats.today.revenue)} تومان</span>

            </div>

            <div class="admin-summary-card">

                <span class="admin-summary-number">${stats.this_month.count}</span>

                <span class="admin-summary-label">سفارش این ماه</span>

                <span class="admin-summary-sub">${formatPrice(stats.this_month.revenue)} تومان</span>

            </div>

            <div class="admin-summary-card">

                <span class="admin-summary-number">${stats.all_time.count}</span>

                <span class="admin-summary-label">کل سفارش‌ها</span>

                <span class="admin-summary-sub">${formatPrice(stats.all_time.revenue)} تومان</span>

            </div>

        `;

        if(topEl){

            topEl.innerHTML = stats.top_products.length > 0

                ? stats.top_products.map((p, i) => `

                    <li>

                        <span class="admin-top-rank">${i + 1}</span>

                        <img src="${p.image}" alt="${p.title}">

                        <span class="admin-top-title">${p.title}</span>

                        <span class="admin-top-sales">${p.sales} فروش</span>

                    </li>

                `).join("")

                : `<li class="admin-empty-row-inline">هنوز فروشی ثبت نشده.</li>`;

        }

        if(lowStockEl){

            lowStockEl.innerHTML = stats.low_stock.length > 0

                ? stats.low_stock.map(item => `

                    <li>

                        <span class="admin-top-title">${item.title}</span>

                        <span class="admin-low-stock-size">سایز ${item.size}</span>

                        <span class="admin-low-stock-qty">${item.quantity} عدد مونده</span>

                    </li>

                `).join("")

                : `<li class="admin-empty-row-inline">همه‌چیز موجودی کافی داره ✅</li>`;

        }

    }catch(err){

        console.error(err);

        cardsEl.innerHTML = `<p class="admin-empty-row-inline">اتصال به بک‌اند برقرار نشد.</p>`;

    }

}

function showLogin(message){

    dashboard.classList.remove("show");

    loginScreen.style.display = "flex";

    if(message){

        document.getElementById("adminLoginError").textContent = message;

    }

}

// اگه قبلاً لاگین کرده (کلید توی localStorage هست)، مستقیم بریم داشبورد
if(getAdminKey()){

    showDashboard();

}


/*====================================
        LOGIN LOCKOUT COUNTDOWN
====================================*/

const loginSubmitBtn = document.querySelector('#adminLoginForm button[type="submit"]');

let lockoutInterval = null;

function formatMMSS(totalSeconds){

    const m = Math.floor(totalSeconds / 60);

    const s = totalSeconds % 60;

    return `${m}:${String(s).padStart(2, "0")}`;

}

function startLockoutCountdown(retryAfterSeconds, message){

    const errorEl = document.getElementById("adminLoginError");

    const lockoutEndsAt = Date.now() + retryAfterSeconds * 1000;

    localStorage.setItem("adminLockoutEndsAt", lockoutEndsAt);

    if(lockoutInterval) clearInterval(lockoutInterval);

    loginSubmitBtn.disabled = true;

    const tick = () => {

        const remaining = Math.ceil((lockoutEndsAt - Date.now()) / 1000);

        if(remaining <= 0){

            clearInterval(lockoutInterval);

            lockoutInterval = null;

            loginSubmitBtn.disabled = false;

            loginSubmitBtn.textContent = "ورود";

            errorEl.textContent = "";

            localStorage.removeItem("adminLockoutEndsAt");

            return;

        }

        loginSubmitBtn.textContent = `امتحان دوباره تا ${formatMMSS(remaining)}`;

        errorEl.textContent = message || "";

    };

    tick();

    lockoutInterval = setInterval(tick, 1000);

}

// اگه صفحه رفرش بشه وسط یه قفل فعال، همون تایمر رو ادامه بده
const savedLockoutEndsAt = Number(localStorage.getItem("adminLockoutEndsAt"));

if(savedLockoutEndsAt && savedLockoutEndsAt > Date.now()){

    startLockoutCountdown(Math.ceil((savedLockoutEndsAt - Date.now()) / 1000), "به‌خاطر تلاش‌های ناموفق زیاد، فعلاً قفله.");

}


document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    if(loginSubmitBtn.disabled) return;

    const password = document.getElementById("adminPassword").value;

    const errorEl = document.getElementById("adminLoginError");

    errorEl.textContent = "";

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/login`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ password })

        });

        if(!res.ok){

            const errData = await res.json().catch(() => null);

            const detail = errData?.detail;

            if(res.status === 429 && detail?.retryAfterSeconds){

                startLockoutCountdown(detail.retryAfterSeconds, detail.message);

            }else{

                errorEl.textContent = (typeof detail === "string" ? detail : detail?.message) || "رمز اشتباهه";

            }

            return;

        }

        const data = await res.json();

        localStorage.setItem("adminKey", data.key);

        showDashboard();

    }catch(err){

        console.error(err);

        errorEl.textContent = "اتصال به بک‌اند برقرار نشد؛ مطمئن شو uvicorn روشنه";

    }

});

document.getElementById("adminLogoutBtn").addEventListener("click", () => {

    localStorage.removeItem("adminKey");

    showLogin();

});


/*====================================
        TABS
====================================*/

document.querySelectorAll(".admin-nav-link").forEach(link => {

    link.addEventListener("click", (e) => {

        e.preventDefault();

        document.querySelectorAll(".admin-nav-link").forEach(l => l.classList.remove("active"));

        document.querySelectorAll(".admin-tab-content").forEach(t => t.classList.remove("active"));

        link.classList.add("active");

        document.getElementById(`tab-${link.dataset.tab}`).classList.add("active");

        if(link.dataset.tab === "error-logs") loadErrorLogs();

        if(link.dataset.tab === "messages") loadContactMessages();

        if(link.dataset.tab === "coupons") loadCoupons();

    });

});


/*====================================
        PRODUCTS TABLE
====================================*/

async function loadProducts(){

    const tbody = document.getElementById("adminProductsTableBody");

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/products`, {

            headers: adminHeaders()

        });

        allProducts = await res.json();

        renderInventoryTab();

        if(allProducts.length === 0){

            tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="8">هنوز محصولی ثبت نشده.</td></tr>`;

            return;

        }

        tbody.innerHTML = allProducts.map(p => {

            const hasDiscount = p.discount_active && p.final_price != null && p.final_price < p.price;

            const priceCell = hasDiscount
                ? `<span class="admin-price-old">${formatPrice(p.price)} تومان</span><span class="admin-price-new">${formatPrice(p.final_price)} تومان</span>`
                : `${formatPrice(p.price)} تومان`;

            return `

            <tr class="${p.is_archived ? "admin-row-archived" : ""}">

                <td><img src="${p.image}" alt="${p.title}"></td>

                <td>${p.title}${p.is_archived ? '<span class="admin-archived-badge">بایگانی‌شده</span>' : ""}${hasDiscount ? '<span class="admin-discount-badge">🔥 تخفیف</span>' : ""}</td>

                <td>${p.category}</td>

                <td>${priceCell}</td>

                <td>${p.rating} ⭐</td>

                <td>${p.sales}</td>

                <td>

                    ${(() => {

                        if(p.is_archived) return `<span class="admin-stock-badge out">بایگانی</span>`;

                        const totalStock = (p.stock || []).reduce((sum, s) => sum + s.quantity, 0);

                        const isOut = p.in_stock === false || totalStock === 0;

                        return `<span class="admin-stock-badge ${isOut ? "out" : "in"}">${isOut ? "ناموجود" : `${totalStock} عدد`}</span>`;

                    })()}

                </td>

                <td>

                    <div class="admin-table-actions">

                        <button class="admin-action-btn edit" data-id="${p.id}" title="ویرایش">

                            <i class="fa-solid fa-pen"></i>

                        </button>

                        ${p.is_archived

                            ? `<button class="admin-action-btn unarchive" data-id="${p.id}" title="فعال‌کردن دوباره"><i class="fa-solid fa-rotate-left"></i></button>`

                            : `<button class="admin-action-btn delete" data-id="${p.id}" title="حذف"><i class="fa-solid fa-trash"></i></button>`

                        }

                    </div>

                </td>

            </tr>

        `;

        }).join("");

    }catch(err){

        console.error(err);

        tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="8">اتصال به بک‌اند برقرار نشد.</td></tr>`;

    }

}


/*====================================
        INVENTORY TAB
====================================*/

const SIZE_ORDER = ["S", "M", "L", "XL", "2XL"];

function renderInventoryTab(){

    const summaryEl = document.getElementById("inventorySummary");

    const tbody = document.getElementById("adminInventoryTableBody");

    if(!summaryEl || !tbody) return;

    const totalProducts = allProducts.length;

    let totalStockAll = 0;

    let outOfStockCount = 0;

    allProducts.forEach(p => {

        const total = (p.stock || []).reduce((sum, s) => sum + s.quantity, 0);

        totalStockAll += total;

        if(p.in_stock === false || total === 0) outOfStockCount++;

    });

    summaryEl.innerHTML = `

        <div class="admin-summary-card">

            <span class="admin-summary-number">${totalProducts}</span>

            <span class="admin-summary-label">تعداد محصولات</span>

        </div>

        <div class="admin-summary-card">

            <span class="admin-summary-number">${totalStockAll}</span>

            <span class="admin-summary-label">مجموع موجودی (همه سایزها)</span>

        </div>

        <div class="admin-summary-card ${outOfStockCount > 0 ? "warning" : ""}">

            <span class="admin-summary-number">${outOfStockCount}</span>

            <span class="admin-summary-label">محصول ناموجود</span>

        </div>

    `;

    if(totalProducts === 0){

        tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="8">هنوز محصولی ثبت نشده.</td></tr>`;

        return;

    }

    tbody.innerHTML = allProducts.map(p => {

        const stockBySize = {};

        (p.stock || []).forEach(s => { stockBySize[s.size] = s.quantity; });

        const total = SIZE_ORDER.reduce((sum, size) => sum + (stockBySize[size] || 0), 0);

        const sizeCells = SIZE_ORDER.map(size => {

            const qty = stockBySize[size] || 0;

            const cls = qty === 0 ? "zero" : (qty <= 3 ? "low" : "");

            return `<td><input type="number" min="0" class="admin-inventory-input ${cls}" data-size="${size}" value="${qty}"></td>`;

        }).join("");

        return `

            <tr data-product-id="${p.id}">

                <td>${p.title}</td>

                ${sizeCells}

                <td class="admin-inventory-total"><strong>${total}</strong></td>

                <td>

                    <button type="button" class="admin-action-btn admin-inventory-save" data-id="${p.id}" title="ذخیره">

                        <i class="fa-solid fa-floppy-disk"></i>

                    </button>

                </td>

            </tr>

        `;

    }).join("");

}

document.getElementById("adminInventoryTableBody").addEventListener("input", (e) => {

    const input = e.target.closest(".admin-inventory-input");

    if(!input) return;

    const qty = Number(input.value) || 0;

    input.classList.remove("zero", "low");

    if(qty === 0) input.classList.add("zero");

    else if(qty <= 3) input.classList.add("low");

    const row = input.closest("tr");

    const total = Array.from(row.querySelectorAll(".admin-inventory-input"))

        .reduce((sum, el) => sum + (Number(el.value) || 0), 0);

    row.querySelector(".admin-inventory-total strong").textContent = total;

});

document.getElementById("adminInventoryTableBody").addEventListener("click", async (e) => {

    const saveBtn = e.target.closest(".admin-inventory-save");

    if(!saveBtn) return;

    const productId = saveBtn.dataset.id;

    const row = saveBtn.closest("tr");

    const stockItems = Array.from(row.querySelectorAll(".admin-inventory-input")).map(input => ({

        size: input.dataset.size,

        quantity: Number(input.value) || 0

    }));

    saveBtn.disabled = true;

    const icon = saveBtn.querySelector("i");

    icon.className = "fa-solid fa-spinner fa-spin";

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/products/${productId}/stock`, {

            method: "PUT",

            headers: adminHeaders({ "Content-Type": "application/json" }),

            body: JSON.stringify({ stock: stockItems })

        });

        if(!res.ok) throw new Error("آپدیت موجودی با مشکل مواجه شد");

        const updated = await res.json();

        const idx = allProducts.findIndex(p => p.id === Number(productId));

        if(idx !== -1) allProducts[idx] = updated;

        icon.className = "fa-solid fa-check";

        setTimeout(() => { icon.className = "fa-solid fa-floppy-disk"; }, 1500);

    }catch(err){

        console.error(err);

        alert("ذخیره‌ی موجودی با مشکل مواجه شد.");

        icon.className = "fa-solid fa-floppy-disk";

    }finally{

        saveBtn.disabled = false;

    }

});


/*====================================
        ERROR LOGS TAB
====================================*/

function escapeHtml(str){

    const div = document.createElement("div");

    div.textContent = str;

    return div.innerHTML;

}

function renderSafePageUrlLink(pageUrl){

    if(!pageUrl) return "-";

    try{

        const parsed = new URL(pageUrl);

        // فقط لینک‌های واقعی http/https رو قابل‌کلیک می‌کنیم - هر
        // چیز دیگه‌ای (مثلاً javascript:...) فقط به‌عنوان متن ساده
        // نشون داده می‌شه، نه یه لینک قابل‌کلیک
        if(parsed.protocol !== "http:" && parsed.protocol !== "https:"){

            return escapeHtml(pageUrl);

        }

        return `<a href="${escapeHtml(parsed.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(parsed.pathname)}</a>`;

    }catch{

        return escapeHtml(pageUrl);

    }

}

async function loadErrorLogs(){

    const tbody = document.getElementById("adminErrorLogsTableBody");

    if(!tbody) return;

    tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="4">در حال بارگذاری...</td></tr>`;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/error-logs`, {

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("خطا در دریافت لاگ‌ها");

        const logs = await res.json();

        if(logs.length === 0){

            tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="4">تا الان هیچ خطایی ثبت نشده ✅</td></tr>`;

            return;

        }

        tbody.innerHTML = logs.map(log => `

            <tr>

                <td>${formatTehranDateTime(log.created_at)}</td>

                <td>${log.message}</td>

                <td>${renderSafePageUrlLink(log.page_url)}</td>

                <td style="font-size:11px;color:var(--secondary);">${log.user_agent || "-"}</td>

            </tr>

        `).join("");

    }catch(err){

        console.error(err);

        tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="4">اتصال به بک‌اند برقرار نشد.</td></tr>`;

    }

}

const clearErrorLogsBtn = document.getElementById("clearErrorLogsBtn");

if(clearErrorLogsBtn){

    clearErrorLogsBtn.addEventListener("click", async () => {

        if(!confirm("مطمئنی می‌خوای همه‌ی لاگ‌های خطا رو پاک کنی؟")) return;

        try{

            const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/error-logs`, {

                method: "DELETE",

                headers: adminHeaders()

            });

            if(!res.ok) throw new Error("پاک‌کردن با مشکل مواجه شد");

            loadErrorLogs();

        }catch(err){

            console.error(err);

            alert("پاک‌کردن لاگ‌ها با مشکل مواجه شد.");

        }

    });

}


/*====================================
        CONTACT MESSAGES
====================================*/

let currentMessages = [];

async function loadContactMessages(){

    const listEl = document.getElementById("adminMessagesList");

    const badgeEl = document.getElementById("unreadMessagesBadge");

    if(!listEl) return;

    listEl.innerHTML = `<p class="admin-empty-row-inline">در حال بارگذاری...</p>`;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/contact-messages`, {

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("خطا در دریافت پیام‌ها");

        currentMessages = await res.json();

        const unreadCount = currentMessages.filter(m => !m.is_read).length;

        if(badgeEl){

            if(unreadCount > 0){

                badgeEl.textContent = unreadCount;

                badgeEl.style.display = "inline-flex";

            }else{

                badgeEl.style.display = "none";

            }

        }

        if(currentMessages.length === 0){

            listEl.innerHTML = `<p class="admin-empty-row-inline">هنوز پیامی از مشتری‌ها نیومده.</p>`;

            return;

        }

        listEl.innerHTML = currentMessages.map(msg => `

            <div class="admin-message-card ${msg.is_read ? "" : "unread"}" data-id="${msg.id}">

                <div class="admin-message-card-top">

                    <span class="admin-message-sender">${msg.name}${!msg.is_read ? '<span class="admin-message-dot"></span>' : ""}</span>

                    <span class="admin-message-date">${formatTehranDateTime(msg.created_at)}</span>

                </div>

                <div class="admin-message-subject">${msg.subject || "(بدون موضوع)"}</div>

                <div class="admin-message-preview">${msg.message}</div>

            </div>

        `).join("");

    }catch(err){

        console.error(err);

        listEl.innerHTML = `<p class="admin-empty-row-inline">اتصال به بک‌اند برقرار نشد.</p>`;

    }

}

const messageModalOverlay = document.getElementById("messageModalOverlay");

let currentOpenMessageId = null;

document.getElementById("adminMessagesList")?.addEventListener("click", async (e) => {

    const card = e.target.closest(".admin-message-card");

    if(!card) return;

    const id = Number(card.dataset.id);

    const msg = currentMessages.find(m => m.id === id);

    if(!msg) return;

    currentOpenMessageId = id;

    document.getElementById("messageDetailDate").textContent = `دریافت‌شده در ${formatTehranDateTime(msg.created_at)}`;

    document.getElementById("messageDetailSender").textContent = `${msg.name} — ${msg.contact_info}`;

    document.getElementById("messageDetailSubject").textContent = msg.subject || "(بدون موضوع)";

    document.getElementById("messageDetailBody").textContent = msg.message;

    messageModalOverlay.classList.add("show");

    if(!msg.is_read){

        try{

            await fetchWithRetry(`${API_BASE_URL}/api/admin/contact-messages/${id}/read`, {

                method: "PUT",

                headers: adminHeaders()

            });

            msg.is_read = true;

            loadContactMessages();

        }catch(err){

            console.error(err);

        }

    }

});

document.getElementById("messageModalClose")?.addEventListener("click", () => {

    messageModalOverlay.classList.remove("show");

});

messageModalOverlay?.addEventListener("click", (e) => {

    if(e.target === messageModalOverlay) messageModalOverlay.classList.remove("show");

});

document.getElementById("deleteMessageBtn")?.addEventListener("click", async () => {

    if(!currentOpenMessageId) return;

    if(!confirm("مطمئنی می‌خوای این پیام رو حذف کنی؟")) return;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/contact-messages/${currentOpenMessageId}`, {

            method: "DELETE",

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("حذف با مشکل مواجه شد");

        messageModalOverlay.classList.remove("show");

        loadContactMessages();

    }catch(err){

        console.error(err);

        alert("حذف پیام با مشکل مواجه شد.");

    }

});


document.getElementById("adminProductsTableBody").addEventListener("click", (e) => {

    const editBtn = e.target.closest(".edit");

    const deleteBtn = e.target.closest(".delete");

    const unarchiveBtn = e.target.closest(".unarchive");

    if(editBtn) openProductModal(Number(editBtn.dataset.id));

    if(deleteBtn) deleteProduct(Number(deleteBtn.dataset.id));

    if(unarchiveBtn) unarchiveProduct(Number(unarchiveBtn.dataset.id));

});


/*====================================
        COUPONS (کد تخفیف - فیچر جدیده)
====================================*/

let allCoupons = [];

async function loadCoupons(){

    const tbody = document.getElementById("adminCouponsTableBody");

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/coupons`, {

            headers: adminHeaders()

        });

        allCoupons = await res.json();

        if(allCoupons.length === 0){
            tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="6">هنوز کد تخفیفی ثبت نشده.</td></tr>`;
            return;
        }

        tbody.innerHTML = allCoupons.map(c => {

            const typeLabel = c.discount_type === "percent" ? `${c.discount_value}٪` : `${formatPrice(c.discount_value)} تومان`;

            return `
            <tr>
                <td><strong>${c.code}</strong></td>
                <td>${typeLabel}</td>
                <td>${c.min_order_amount ? formatPrice(c.min_order_amount) + " تومان" : "—"}</td>
                <td>${c.usage_count}</td>
                <td><span class="admin-stock-badge ${c.active ? "in" : "out"}">${c.active ? "فعال" : "غیرفعال"}</span></td>
                <td>
                    <div class="admin-table-actions">
                        <button class="admin-action-btn edit" data-id="${c.id}" title="ویرایش">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="admin-action-btn delete" data-id="${c.id}" title="حذف">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;

        }).join("");

    }catch(err){

        tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="6">اتصال به بک‌اند برقرار نشد.</td></tr>`;

    }

}

const couponModalOverlay = document.getElementById("couponModalOverlay");
const couponForm = document.getElementById("couponForm");

function openCouponModal(id = null){

    couponForm.reset();

    document.getElementById("couponId").value = "";

    if(id){

        const coupon = allCoupons.find(c => c.id === id);

        document.getElementById("couponModalTitle").textContent = "ویرایش کد تخفیف";
        document.getElementById("couponId").value = coupon.id;
        document.getElementById("couponCodeInput").value = coupon.code;
        document.getElementById("couponCodeInput").disabled = true;   // بعد از ساخته‌شدن، خودِ کد قابل تغییر نیست (فقط نوع/مقدار/وضعیت)
        document.getElementById("couponTypeInput").value = coupon.discount_type;
        document.getElementById("couponValueInput").value = coupon.discount_value;
        document.getElementById("couponMinOrderInput").value = coupon.min_order_amount ?? "";
        document.getElementById("couponActiveInput").checked = coupon.active;

    }else{

        document.getElementById("couponModalTitle").textContent = "افزودن کد تخفیف جدید";
        document.getElementById("couponCodeInput").disabled = false;

    }

    couponModalOverlay.classList.add("show");

}

function closeCouponModal(){
    couponModalOverlay.classList.remove("show");
}

document.getElementById("openAddCouponBtn").addEventListener("click", () => openCouponModal());
document.getElementById("couponModalClose").addEventListener("click", closeCouponModal);
couponModalOverlay.addEventListener("click", (e) => { if(e.target === couponModalOverlay) closeCouponModal(); });

couponForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const submitBtn = couponForm.querySelector(".admin-form-submit");
    submitBtn.disabled = true;
    submitBtn.textContent = "در حال ذخیره...";

    const id = document.getElementById("couponId").value;
    const type = document.getElementById("couponTypeInput").value;
    const value = Number(document.getElementById("couponValueInput").value);
    const minOrderRaw = document.getElementById("couponMinOrderInput").value;

    if(type === "percent" && (value <= 0 || value > 100)){
        alert("درصد تخفیف باید بین ۱ تا ۱۰۰ باشه.");
        submitBtn.disabled = false;
        submitBtn.textContent = "ذخیره کد تخفیف";
        return;
    }

    if(type === "fixed" && value <= 0){
        alert("مبلغ تخفیف باید بزرگ‌تر از صفر باشه.");
        submitBtn.disabled = false;
        submitBtn.textContent = "ذخیره کد تخفیف";
        return;
    }

    try{

        if(id){

            const payload = {
                discount_type: type,
                discount_value: value,
                min_order_amount: minOrderRaw === "" ? null : Number(minOrderRaw),
                active: document.getElementById("couponActiveInput").checked,
            };

            const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/coupons/${id}`, {
                method: "PUT",
                headers: adminHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload)
            });

            if(!res.ok){
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "ویرایش با مشکل مواجه شد");
            }

        }else{

            const payload = {
                code: document.getElementById("couponCodeInput").value,
                discount_type: type,
                discount_value: value,
                min_order_amount: minOrderRaw === "" ? null : Number(minOrderRaw),
                active: document.getElementById("couponActiveInput").checked,
            };

            const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/coupons`, {
                method: "POST",
                headers: adminHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify(payload)
            });

            if(!res.ok){
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.detail || "ثبت کد تخفیف با مشکل مواجه شد");
            }

        }

        closeCouponModal();
        loadCoupons();

    }catch(err){

        alert(err.message || "ذخیره‌ی کد تخفیف با مشکل مواجه شد.");

    }finally{

        submitBtn.disabled = false;
        submitBtn.textContent = "ذخیره کد تخفیف";

    }

});

async function deleteCoupon(id){

    if(!confirm("مطمئنی می‌خوای این کد تخفیف رو حذف کنی؟")) return;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/coupons/${id}`, {
            method: "DELETE",
            headers: adminHeaders()
        });

        if(!res.ok) throw new Error("خطا در حذف");

        loadCoupons();

    }catch(err){

        alert("حذف کد تخفیف با مشکل مواجه شد.");

    }

}

document.getElementById("adminCouponsTableBody").addEventListener("click", (e) => {

    const editBtn = e.target.closest(".edit");
    const deleteBtn = e.target.closest(".delete");

    if(editBtn) openCouponModal(Number(editBtn.dataset.id));
    if(deleteBtn) deleteCoupon(Number(deleteBtn.dataset.id));

});

async function deleteProduct(id){

    if(!confirm("مطمئنی می‌خوای این محصول رو حذف کنی؟")) return;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/products/${id}`, {

            method: "DELETE",

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("خطا در حذف");

        const data = await res.json();

        if(data.archived){

            alert("این محصول توی سفارش‌های قبلی استفاده شده، برای همین به‌جای حذف کامل، بایگانی شد. دیگه توی فروشگاه نشون داده نمی‌شه، ولی هروقت خواستی می‌تونی از همین جدول دوباره فعالش کنی.");

        }

        loadProducts();

    }catch(err){

        alert("حذف محصول با مشکل مواجه شد.");

    }

}

async function unarchiveProduct(id){

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/products/${id}`, {

            method: "PUT",

            headers: adminHeaders({ "Content-Type": "application/json" }),

            body: JSON.stringify({ is_archived: false })

        });

        if(!res.ok) throw new Error("خطا در فعال‌کردن دوباره");

        loadProducts();

    }catch(err){

        alert("فعال‌کردن دوباره‌ی محصول با مشکل مواجه شد.");

    }

}


/*====================================
        ADD/EDIT MODAL
====================================*/

const productModalOverlay = document.getElementById("productModalOverlay");

const productForm = document.getElementById("productForm");

let pendingCreateFiles = [];

let currentEditingProductId = null;

let currentGalleryImages = [];   // [{id, image_url, isCover}]

function renderGalleryPreview(){

    const container = document.getElementById("productGalleryPreview");

    const items = [];

    const canDeleteCover = currentGalleryImages.length > 1;

    currentGalleryImages.forEach(img => {

        const removeBtn = img.isCover

            ? (canDeleteCover

                ? `<button type="button" class="admin-gallery-remove" data-image-id="cover" title="حذف (عکس بعدی جای این میاد)"><i class="fa-solid fa-xmark"></i></button>`

                : `<button type="button" class="admin-gallery-remove admin-gallery-remove-disabled" title="حداقل یه عکس باید بمونه؛ اول یه عکس دیگه اضافه کن"><i class="fa-solid fa-xmark"></i></button>`)

            : `<button type="button" class="admin-gallery-remove" data-image-id="${img.id}"><i class="fa-solid fa-xmark"></i></button>`;

        items.push(`

            <div class="admin-gallery-item">

                <img src="${img.image_url}" alt="">

                ${img.isCover ? '<span class="admin-gallery-cover-badge">کاور</span>' : ''}

                ${removeBtn}

            </div>

        `);

    });

    pendingCreateFiles.forEach((file, i) => {

        items.push(`

            <div class="admin-gallery-item">

                <img src="${URL.createObjectURL(file)}" alt="">

                ${i === 0 && currentGalleryImages.length === 0 ? '<span class="admin-gallery-cover-badge">کاور</span>' : ''}

                <button type="button" class="admin-gallery-remove" data-pending-index="${i}"><i class="fa-solid fa-xmark"></i></button>

            </div>

        `);

    });

    container.innerHTML = items.length > 0

        ? items.join("")

        : `<span class="admin-gallery-empty" id="productGalleryEmptyText">هنوز عکسی انتخاب نشده</span>`;

}

function populateCategorySelect(selectedCategory){

    const select = document.getElementById("productCategorySelect");

    const newInput = document.getElementById("productCategoryNewInput");

    const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

    select.innerHTML = uniqueCategories.map(cat =>

        `<option value="${cat}">${cat}</option>`

    ).join("") + `<option value="__new__">+ افزودن دسته‌بندی جدید</option>`;

    if(selectedCategory && uniqueCategories.includes(selectedCategory)){

        select.value = selectedCategory;

        newInput.style.display = "none";

    }else if(selectedCategory){

        // دسته‌بندی‌ای که دیگه بین محصولات نیست (یا محصول تازه‌ست)
        select.value = "__new__";

        newInput.style.display = "block";

        newInput.value = selectedCategory;

    }else{

        select.value = uniqueCategories.length > 0 ? uniqueCategories[0] : "__new__";

        newInput.style.display = select.value === "__new__" ? "block" : "none";

    }

}

document.getElementById("productCategorySelect").addEventListener("change", (e) => {

    const newInput = document.getElementById("productCategoryNewInput");

    newInput.style.display = e.target.value === "__new__" ? "block" : "none";

    if(e.target.value === "__new__") newInput.value = "";

});

/**
 * تخفیف/جشنواره (فیچر جدیده) - نمایش/مخفی‌کردن فیلدهای نوع و
 * مقدار تخفیف بر اساس تیک «تخفیف فعال باشه»، و یه پیش‌نمایش
 * زنده‌ی «قیمت نهایی» زیرش که با تایپ‌کردن آپدیت می‌شه (فقط
 * برای راهنمایی چشمی ادمین - محاسبه‌ی واقعی و اعتبارسنجی نهایی
 * همیشه سمت سرور انجام می‌شه).
 */
function updateDiscountFieldsVisibility(){

    const active = document.getElementById("productDiscountActiveInput").checked;
    const fieldsRow = document.getElementById("discountFieldsRow");
    const preview = document.getElementById("discountFinalPricePreview");

    fieldsRow.style.display = active ? "grid" : "none";

    if(!active){
        preview.style.display = "none";
        return;
    }

    const price = Number(document.getElementById("productPriceInput").value) || 0;
    const type = document.getElementById("productDiscountTypeInput").value;
    const value = Number(document.getElementById("productDiscountValueInput").value) || 0;

    if(price <= 0 || value <= 0){
        preview.style.display = "none";
        return;
    }

    const finalPrice = type === "percent"
        ? Math.round(price - (price * value / 100))
        : Math.round(price - value);

    preview.style.display = "flex";
    preview.innerHTML = finalPrice > 0 && finalPrice < price
        ? `<i class="fa-solid fa-tag"></i> قیمت نهایی بعد از تخفیف: <strong>${formatPrice(finalPrice)} تومان</strong>`
        : `<i class="fa-solid fa-triangle-exclamation"></i> مقدار تخفیف نامعتبره (باید کمتر از قیمت محصول باشه)`;
}

["productDiscountActiveInput", "productDiscountTypeInput", "productDiscountValueInput", "productPriceInput"].forEach(id => {
    document.getElementById(id).addEventListener("input", updateDiscountFieldsVisibility);
});

function openProductModal(id = null){

    productForm.reset();

    pendingCreateFiles = [];

    currentGalleryImages = [];

    currentEditingProductId = id;

    if(id){

        const product = allProducts.find(p => p.id === id);

        document.getElementById("productModalTitle").textContent = "ویرایش محصول";

        document.getElementById("productId").value = product.id;

        document.getElementById("productTitleInput").value = product.title;

        document.getElementById("productPriceInput").value = product.price;

        populateCategorySelect(product.category);

        document.getElementById("productRatingInput").value = product.rating;

        document.getElementById("productDescriptionInput").value = product.description || "";

        document.getElementById("productInStockInput").checked = product.in_stock !== false;

        document.getElementById("productDiscountActiveInput").checked = product.discount_active === true;

        document.getElementById("productDiscountTypeInput").value = product.discount_type || "percent";

        document.getElementById("productDiscountValueInput").value = product.discount_value ?? "";

        currentGalleryImages = [

            { id: null, image_url: product.image, isCover: true },

            ...(product.images || []).map(img => ({ id: img.id, image_url: img.image_url, isCover: false }))

        ];

    }else{

        document.getElementById("productModalTitle").textContent = "افزودن محصول جدید";

        document.getElementById("productId").value = "";

        populateCategorySelect(null);

    }

    updateDiscountFieldsVisibility();

    renderGalleryPreview();

    productModalOverlay.classList.add("show");

}

function closeProductModal(){

    productModalOverlay.classList.remove("show");

}

document.getElementById("openAddProductBtn").addEventListener("click", () => openProductModal());

document.getElementById("productModalClose").addEventListener("click", closeProductModal);

productModalOverlay.addEventListener("click", (e) => {

    if(e.target === productModalOverlay) closeProductModal();

});

function showUploadProgress(){

    const wrap = document.getElementById("uploadProgressWrap");

    const bar = document.getElementById("uploadProgressBar");

    const text = document.getElementById("uploadProgressText");

    if(wrap) wrap.style.display = "flex";

    if(bar) bar.style.width = "0%";

    if(text) text.textContent = "۰٪";

}

function updateUploadProgress(percent){

    const bar = document.getElementById("uploadProgressBar");

    const text = document.getElementById("uploadProgressText");

    if(bar) bar.style.width = `${percent}%`;

    if(text) text.textContent = `${percent}٪`;

}

function hideUploadProgress(){

    const wrap = document.getElementById("uploadProgressWrap");

    if(wrap) wrap.style.display = "none";

}

function uploadImageFile(file){

    // از fetch استفاده نمی‌کنیم چون نمی‌تونه پیشرفت آپلود رو
    // گزارش بده؛ XMLHttpRequest این قابلیت رو داره (upload.onprogress)
    return new Promise((resolve, reject) => {

        const formData = new FormData();

        formData.append("file", file);

        const xhr = new XMLHttpRequest();

        xhr.open("POST", `${API_BASE_URL}/api/admin/upload-image`);

        xhr.setRequestHeader("X-Admin-Key", getAdminKey());

        xhr.upload.addEventListener("progress", (e) => {

            if(e.lengthComputable){

                const percent = Math.round((e.loaded / e.total) * 100);

                updateUploadProgress(percent);

            }

        });

        xhr.addEventListener("load", () => {

            if(xhr.status >= 200 && xhr.status < 300){

                updateUploadProgress(100);

                try{

                    resolve(JSON.parse(xhr.responseText).path);

                }catch(err){

                    reject(new Error("پاسخ نامعتبر از سرور"));

                }

            }else{

                reject(new Error("آپلود عکس با مشکل مواجه شد"));

            }

        });

        xhr.addEventListener("error", () => reject(new Error("آپلود عکس با مشکل مواجه شد - اتصال قطع شد")));

        xhr.send(formData);

    });

}

document.getElementById("productImageFile").addEventListener("change", async (e) => {

    const files = Array.from(e.target.files);

    if(files.length === 0) return;

    if(currentEditingProductId){

        // توی حالت ویرایش، عکس‌های جدید بلافاصله آپلود و به گالری اضافه می‌شن
        showUploadProgress();

        for(const file of files){

            try{

                const path = await uploadImageFile(file);

                const res = await fetchWithRetry(`${API_BASE_URL}/api/products/${currentEditingProductId}/images`, {

                    method: "POST",

                    headers: adminHeaders({ "Content-Type": "application/json" }),

                    body: JSON.stringify({ image_url: path })

                });

                if(!res.ok) throw new Error("افزودن عکس با مشکل مواجه شد");

                const newImage = await res.json();

                currentGalleryImages.push({ id: newImage.id, image_url: newImage.image_url, isCover: false });

            }catch(err){

                console.error(err);

                alert("افزودن یکی از عکس‌ها با مشکل مواجه شد.");

            }

        }

        hideUploadProgress();

        renderGalleryPreview();

        loadProducts();

    }else{

        // توی حالت افزودن محصول جدید، عکس‌ها فقط ذخیره می‌شن تا موقع ثبت نهایی
        pendingCreateFiles.push(...files);

        renderGalleryPreview();

    }

    e.target.value = "";

});

document.getElementById("productGalleryPreview").addEventListener("click", async (e) => {

    const removeBtn = e.target.closest(".admin-gallery-remove");

    if(!removeBtn) return;

    if(removeBtn.classList.contains("admin-gallery-remove-disabled")){

        alert("حداقل یه عکس باید برای محصول بمونه. اول یه عکس دیگه اضافه کن، بعد این‌و حذف کن.");

        return;

    }

    if(removeBtn.dataset.imageId === "cover"){

        // حذف عکس کاور: عکس بعدیِ گالری جاش می‌شینه
        const nextImage = currentGalleryImages.find(img => !img.isCover);

        if(!nextImage) return;

        try{

            const updateRes = await fetchWithRetry(`${API_BASE_URL}/api/products/${currentEditingProductId}`, {

                method: "PUT",

                headers: adminHeaders({ "Content-Type": "application/json" }),

                body: JSON.stringify({ image: nextImage.image_url })

            });

            if(!updateRes.ok) throw new Error("تغییر عکس اصلی با مشکل مواجه شد");

            const deleteRes = await fetchWithRetry(`${API_BASE_URL}/api/products/${currentEditingProductId}/images/${nextImage.id}`, {

                method: "DELETE",

                headers: adminHeaders()

            });

            if(!deleteRes.ok) throw new Error("حذف عکس با مشکل مواجه شد");

            currentGalleryImages = currentGalleryImages

                .filter(img => img.id !== nextImage.id)

                .map(img => img.isCover ? { ...img, image_url: nextImage.image_url } : img);

            renderGalleryPreview();

            loadProducts();

            alert("✅ عکس کاور عوض شد");

        }catch(err){

            console.error(err);

            alert("تغییر عکس کاور با مشکل مواجه شد.");

        }

    }else if(removeBtn.dataset.imageId){

        // حذف عکس واقعی از سرور (گالری محصول در حال ویرایش)
        const imageId = removeBtn.dataset.imageId;

        try{

            const res = await fetchWithRetry(`${API_BASE_URL}/api/products/${currentEditingProductId}/images/${imageId}`, {

                method: "DELETE",

                headers: adminHeaders()

            });

            if(!res.ok) throw new Error("حذف عکس با مشکل مواجه شد");

            currentGalleryImages = currentGalleryImages.filter(img => String(img.id) !== imageId);

            renderGalleryPreview();

            loadProducts();

        }catch(err){

            console.error(err);

            alert("حذف عکس با مشکل مواجه شد.");

        }

    }else if(removeBtn.dataset.pendingIndex !== undefined){

        // حذف یه فایل هنوز آپلودنشده از لیست انتظار
        const index = Number(removeBtn.dataset.pendingIndex);

        pendingCreateFiles.splice(index, 1);

        renderGalleryPreview();

    }

});

productForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    const submitBtn = productForm.querySelector(".admin-form-submit");

    submitBtn.disabled = true;

    submitBtn.textContent = "در حال ذخیره...";

    try{

        const id = document.getElementById("productId").value;

        const categorySelect = document.getElementById("productCategorySelect");

        const categoryValue = categorySelect.value === "__new__"

            ? document.getElementById("productCategoryNewInput").value.trim()

            : categorySelect.value;

        if(!categoryValue){

            alert("لطفاً یه دسته‌بندی انتخاب کن یا بنویس.");

            submitBtn.disabled = false;

            submitBtn.textContent = "ذخیره محصول";

            return;

        }

        const price = Number(document.getElementById("productPriceInput").value);
        const discountActive = document.getElementById("productDiscountActiveInput").checked;
        const discountType = document.getElementById("productDiscountTypeInput").value;
        const discountValueRaw = document.getElementById("productDiscountValueInput").value;
        const discountValue = discountValueRaw === "" ? null : Number(discountValueRaw);

        if(discountActive){

            if(discountValue === null || discountValue <= 0){
                alert("برای فعال‌کردن تخفیف، باید مقدار تخفیف رو وارد کنی.");
                submitBtn.disabled = false;
                submitBtn.textContent = "ذخیره محصول";
                return;
            }

            if(discountType === "percent" && discountValue > 100){
                alert("درصد تخفیف نمی‌تونه بیشتر از ۱۰۰ باشه.");
                submitBtn.disabled = false;
                submitBtn.textContent = "ذخیره محصول";
                return;
            }

            if(discountType === "fixed" && discountValue >= price){
                alert("مبلغ تخفیف باید کمتر از قیمت محصول باشه.");
                submitBtn.disabled = false;
                submitBtn.textContent = "ذخیره محصول";
                return;
            }

        }

        const payload = {

            title: document.getElementById("productTitleInput").value,

            price: price,

            category: categoryValue,

            description: document.getElementById("productDescriptionInput").value || null,

            in_stock: document.getElementById("productInStockInput").checked,

            rating: Number(document.getElementById("productRatingInput").value),

            discount_active: discountActive,

            discount_type: discountActive ? discountType : null,

            discount_value: discountActive ? discountValue : null

        };

        let isNewProduct = false;

        if(id){

            // ویرایش - عکس‌ها از قبل (بلافاصله موقع انتخاب) مدیریت شدن. موجودی هم دیگه اینجا نیست، توی تب موجودیه
            const res = await fetchWithRetry(`${API_BASE_URL}/api/products/${id}`, {

                method: "PUT",

                headers: adminHeaders({ "Content-Type": "application/json" }),

                body: JSON.stringify(payload)

            });

            if(!res.ok) throw new Error("ویرایش با مشکل مواجه شد");

        }else{

            // افزودن جدید - حداقل یه عکس اجباریه
            if(pendingCreateFiles.length === 0){

                alert("لطفاً حداقل یه عکس برای محصول انتخاب کن.");

                submitBtn.disabled = false;

                submitBtn.textContent = "ذخیره محصول";

                return;

            }

            const uploadedPaths = [];

            showUploadProgress();

            for(const file of pendingCreateFiles){

                const path = await uploadImageFile(file);

                uploadedPaths.push(path);

            }

            hideUploadProgress();

            payload.image = uploadedPaths[0];

            payload.images = uploadedPaths.slice(1);

            payload.sales = 0;

            const res = await fetchWithRetry(`${API_BASE_URL}/api/products`, {

                method: "POST",

                headers: adminHeaders({ "Content-Type": "application/json" }),

                body: JSON.stringify(payload)

            });

            if(!res.ok) throw new Error("افزودن با مشکل مواجه شد");

            isNewProduct = true;

        }

        closeProductModal();

        await loadProducts();

        // محصول تازه اضافه شد - ببریم تب موجودی تا همون‌جا موجودیش رو تنظیم کنه
        if(isNewProduct){

            const inventoryNavLink = document.querySelector('.admin-nav-link[data-tab="inventory"]');

            if(inventoryNavLink) inventoryNavLink.click();

        }

    }catch(err){

        console.error(err);

        alert("ذخیره محصول با مشکل مواجه شد. مطمئن شو بک‌اند روشنه.");

    }finally{

        hideUploadProgress();

        submitBtn.disabled = false;

        submitBtn.textContent = "ذخیره محصول";

    }

});


/*====================================
        ORDERS TABLE
====================================*/

/*====================================
        نمایش تاریخ/ساعت به‌وقت تهران

        بک‌اند تاریخ رو به‌وقت UTC ذخیره می‌کنه؛ اگه مستقیم
        new Date() بخوریمش، مرورگر اشتباهی به‌عنوان زمان محلی
        می‌خونتش. این تابع صریحاً می‌گه رشته UTCه (با اضافه‌کردن Z
        اگه نداشت)، بعد با timeZone:"Asia/Tehran" نمایشش می‌ده -
        یعنی همیشه درست نشون می‌ده، فارغ از اینکه کامپیوتر
        خودمون روی چه ساعتی تنظیم شده.
====================================*/

function parseUTCDate(dateString){

    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(dateString);

    return new Date(hasTimezone ? dateString : dateString + "Z");

}

function formatTehranDate(dateString){

    return parseUTCDate(dateString).toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });

}

function formatTehranDateTime(dateString){

    const d = parseUTCDate(dateString);

    const date = d.toLocaleDateString("fa-IR", { timeZone: "Asia/Tehran" });

    const time = d.toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });

    return `${date} ساعت ${time}`;

}


const statusLabels = {

    pending: "در انتظار",

    paid: "پرداخت‌شده",

    shipped: "ارسال‌شده",

    delivered: "تحویل‌شده"

};

let allOrders = [];

async function loadOrders(){

    const tbody = document.getElementById("adminOrdersTableBody");

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/orders`, {

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("خطا در دریافت سفارش‌ها");

        const orders = await res.json();

        allOrders = orders;

        if(orders.length === 0){

            tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="7">هنوز سفارشی ثبت نشده.</td></tr>`;

            return;

        }

        tbody.innerHTML = orders.map(o => `

            <tr>

                <td>${o.order_number}</td>

                <td>${o.full_name}</td>

                <td dir="ltr">${o.phone}</td>

                <td>${formatPrice(o.total)} تومان</td>

                <td>

                    <select class="admin-status-select status-${o.status}" data-order="${o.order_number}">

                        ${Object.entries(statusLabels).map(([value, label]) =>

                            `<option value="${value}" ${value === o.status ? "selected" : ""}>${label}</option>`

                        ).join("")}

                    </select>

                </td>

                <td>${formatTehranDate(o.created_at)}</td>

                <td>

                    <button class="admin-action-btn" data-order-detail="${o.order_number}" title="مشاهده جزئیات">

                        <i class="fa-solid fa-eye"></i>

                    </button>

                </td>

            </tr>

        `).join("");

    }catch(err){

        console.error(err);

        tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="7">اتصال به بک‌اند برقرار نشد.</td></tr>`;

    }

}


/*====================================
        ORDER DETAIL MODAL
====================================*/

const orderDetailOverlay = document.getElementById("orderDetailOverlay");

function openOrderDetail(orderNumber){

    if(!orderDetailOverlay) return;

    const order = allOrders.find(o => o.order_number === orderNumber);

    if(!order) return;

    document.getElementById("orderDetailNumber").textContent = order.order_number;

    document.getElementById("orderDetailDate").textContent = `ثبت‌شده در ${formatTehranDateTime(order.created_at)}`;

    document.getElementById("orderDetailCustomer").innerHTML =

        `${order.full_name}<br><span dir="ltr">${order.phone}</span>`;

    document.getElementById("orderDetailAddress").textContent =

        `${order.province}، ${order.city}، ${order.address} (کدپستی: ${order.postal_code})`;

    const paymentLabels = { zarinpal: "درگاه زرین‌پال", saman: "درگاه بانک سامان" };

    document.getElementById("orderDetailPayment").textContent =

        paymentLabels[order.payment_method] || order.payment_method;

    const shippingPaymentEl = document.getElementById("orderDetailPayment");

    if(order.shipping_payment_type === "cod"){

        shippingPaymentEl.innerHTML += ` <span class="admin-cod-badge">پس‌کرایه (خودش موقع تحویل پرداخت می‌کنه)</span>`;

    }

    const notesSection = document.getElementById("orderDetailNotesSection");

    if(order.notes && order.notes.trim() !== ""){

        document.getElementById("orderDetailNotes").textContent = order.notes;

        notesSection.style.display = "block";

    }else{

        notesSection.style.display = "none";

    }

    document.getElementById("orderDetailItems").innerHTML = order.items.map(item => `

        <li>

            <span>${item.title}${item.size ? ` (سایز ${item.size})` : ""} × ${item.quantity}</span>

            <span>${formatPrice(item.price * item.quantity)} تومان</span>

        </li>

    `).join("");

    document.getElementById("orderDetailSubtotal").textContent = `${formatPrice(order.subtotal)} تومان`;

    document.getElementById("orderDetailShipping").textContent = `${formatPrice(order.shipping)} تومان`;

    document.getElementById("orderDetailTotal").textContent = `${formatPrice(order.total)} تومان`;

    orderDetailOverlay.classList.add("show");

}

function closeOrderDetail(){

    if(orderDetailOverlay) orderDetailOverlay.classList.remove("show");

}

const orderDetailCloseBtn = document.getElementById("orderDetailClose");

if(orderDetailCloseBtn) orderDetailCloseBtn.addEventListener("click", closeOrderDetail);

if(orderDetailOverlay){

    orderDetailOverlay.addEventListener("click", (e) => {

        if(e.target === orderDetailOverlay) closeOrderDetail();

    });

}

document.getElementById("adminOrdersTableBody").addEventListener("click", (e) => {

    const detailBtn = e.target.closest("[data-order-detail]");

    if(detailBtn) openOrderDetail(detailBtn.dataset.orderDetail);

});

document.getElementById("adminOrdersTableBody").addEventListener("change", async (e) => {

    const select = e.target.closest(".admin-status-select");

    if(!select) return;

    const orderNumber = select.dataset.order;

    const newStatus = select.value;

    select.disabled = true;

    try{

        const res = await fetchWithRetry(`${API_BASE_URL}/api/admin/orders/${orderNumber}/status`, {

            method: "PUT",

            headers: adminHeaders({ "Content-Type": "application/json" }),

            body: JSON.stringify({ status: newStatus })

        });

        if(!res.ok) throw new Error("خطا در تغییر وضعیت");

        select.className = `admin-status-select status-${newStatus}`;

    }catch(err){

        console.error(err);

        alert("تغییر وضعیت سفارش با مشکل مواجه شد.");

        loadOrders();

    }finally{

        select.disabled = false;

    }

});

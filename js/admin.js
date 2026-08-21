const API_BASE_URL = "http://127.0.0.1:8000";

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

        const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {

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

document.getElementById("adminLoginForm").addEventListener("submit", async (e) => {

    e.preventDefault();

    const password = document.getElementById("adminPassword").value;

    const errorEl = document.getElementById("adminLoginError");

    errorEl.textContent = "";

    try{

        const res = await fetch(`${API_BASE_URL}/api/admin/login`, {

            method: "POST",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ password })

        });

        if(!res.ok){

            errorEl.textContent = "رمز اشتباهه";

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

    });

});


/*====================================
        PRODUCTS TABLE
====================================*/

async function loadProducts(){

    const tbody = document.getElementById("adminProductsTableBody");

    try{

        const res = await fetch(`${API_BASE_URL}/api/products`);

        allProducts = await res.json();

        renderInventoryTab();

        if(allProducts.length === 0){

            tbody.innerHTML = `<tr class="admin-empty-row"><td colspan="8">هنوز محصولی ثبت نشده.</td></tr>`;

            return;

        }

        tbody.innerHTML = allProducts.map(p => `

            <tr>

                <td><img src="${p.image}" alt="${p.title}"></td>

                <td>${p.title}</td>

                <td>${p.category}</td>

                <td>${formatPrice(p.price)} تومان</td>

                <td>${p.rating} ⭐</td>

                <td>${p.sales}</td>

                <td>

                    ${(() => {

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

                        <button class="admin-action-btn delete" data-id="${p.id}" title="حذف">

                            <i class="fa-solid fa-trash"></i>

                        </button>

                    </div>

                </td>

            </tr>

        `).join("");

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

        const res = await fetch(`${API_BASE_URL}/api/products/${productId}/stock`, {

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


document.getElementById("adminProductsTableBody").addEventListener("click", (e) => {

    const editBtn = e.target.closest(".edit");

    const deleteBtn = e.target.closest(".delete");

    if(editBtn) openProductModal(Number(editBtn.dataset.id));

    if(deleteBtn) deleteProduct(Number(deleteBtn.dataset.id));

});

async function deleteProduct(id){

    if(!confirm("مطمئنی می‌خوای این محصول رو حذف کنی؟")) return;

    try{

        const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {

            method: "DELETE",

            headers: adminHeaders()

        });

        if(!res.ok) throw new Error("خطا در حذف");

        loadProducts();

    }catch(err){

        alert("حذف محصول با مشکل مواجه شد.");

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

        currentGalleryImages = [

            { id: null, image_url: product.image, isCover: true },

            ...(product.images || []).map(img => ({ id: img.id, image_url: img.image_url, isCover: false }))

        ];

    }else{

        document.getElementById("productModalTitle").textContent = "افزودن محصول جدید";

        document.getElementById("productId").value = "";

        populateCategorySelect(null);

    }

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

async function uploadImageFile(file){

    const formData = new FormData();

    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/api/admin/upload-image`, {

        method: "POST",

        headers: adminHeaders(),

        body: formData

    });

    if(!res.ok) throw new Error("آپلود عکس با مشکل مواجه شد");

    const data = await res.json();

    return data.path;

}

document.getElementById("productImageFile").addEventListener("change", async (e) => {

    const files = Array.from(e.target.files);

    if(files.length === 0) return;

    if(currentEditingProductId){

        // توی حالت ویرایش، عکس‌های جدید بلافاصله آپلود و به گالری اضافه می‌شن
        for(const file of files){

            try{

                const path = await uploadImageFile(file);

                const res = await fetch(`${API_BASE_URL}/api/products/${currentEditingProductId}/images`, {

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

            const updateRes = await fetch(`${API_BASE_URL}/api/products/${currentEditingProductId}`, {

                method: "PUT",

                headers: adminHeaders({ "Content-Type": "application/json" }),

                body: JSON.stringify({ image: nextImage.image_url })

            });

            if(!updateRes.ok) throw new Error("تغییر عکس اصلی با مشکل مواجه شد");

            const deleteRes = await fetch(`${API_BASE_URL}/api/products/${currentEditingProductId}/images/${nextImage.id}`, {

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

            const res = await fetch(`${API_BASE_URL}/api/products/${currentEditingProductId}/images/${imageId}`, {

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

        const payload = {

            title: document.getElementById("productTitleInput").value,

            price: Number(document.getElementById("productPriceInput").value),

            category: categoryValue,

            description: document.getElementById("productDescriptionInput").value || null,

            in_stock: document.getElementById("productInStockInput").checked,

            rating: Number(document.getElementById("productRatingInput").value)

        };

        let isNewProduct = false;

        if(id){

            // ویرایش - عکس‌ها از قبل (بلافاصله موقع انتخاب) مدیریت شدن. موجودی هم دیگه اینجا نیست، توی تب موجودیه
            const res = await fetch(`${API_BASE_URL}/api/products/${id}`, {

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

            for(const file of pendingCreateFiles){

                const path = await uploadImageFile(file);

                uploadedPaths.push(path);

            }

            payload.image = uploadedPaths[0];

            payload.images = uploadedPaths.slice(1);

            payload.sales = 0;

            const res = await fetch(`${API_BASE_URL}/api/products`, {

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

        const res = await fetch(`${API_BASE_URL}/api/admin/orders`, {

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

        const res = await fetch(`${API_BASE_URL}/api/admin/orders/${orderNumber}/status`, {

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
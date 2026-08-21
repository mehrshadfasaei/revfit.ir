/*====================================
        این فایل به shop-data.js و common.js
        وابسته‌ست (باید قبلش لینک بشن)
====================================*/


/*====================================
        HERO SLIDER
====================================*/

const sliderSlides = document.querySelectorAll(".slider-slide");

const sliderDots   = document.querySelectorAll(".slider-dot");

if(sliderSlides.length > 0){

    let currentSlide = 0;

    let sliderTimer;

    function goToSlide(index){

        sliderSlides.forEach(slide => slide.classList.remove("active"));

        sliderDots.forEach(dot => dot.classList.remove("active"));

        sliderSlides[index].classList.add("active");

        if(sliderDots[index]) sliderDots[index].classList.add("active");

        currentSlide = index;

    }

    function nextSlide(){

        const next = (currentSlide + 1) % sliderSlides.length;

        goToSlide(next);

    }

    function startSliderTimer(){

        sliderTimer = setInterval(nextSlide, 4000);

    }

    function resetSliderTimer(){

        clearInterval(sliderTimer);

        startSliderTimer();

    }

    sliderDots.forEach(dot => {

        dot.addEventListener("click", () => {

            goToSlide(Number(dot.dataset.slide));

            resetSliderTimer();

        });

    });

    startSliderTimer();

}


/*====================================
        FEATURED PRODUCTS (داینامیک)

        ۴ تا از آخرین محصولاتی که اضافه شدن
        (بزرگ‌ترین id یعنی جدیدترین محصول).
====================================*/

async function renderFeaturedProducts(){

    const grid = document.getElementById("featuredProductsGrid");

    if(!grid) return;

    try{

        const allProducts = await getProducts();

        const featured = [...allProducts]

            .sort((a, b) => b.id - a.id)

            .slice(0, 4);

        grid.innerHTML = featured.map(product => {

            const secondImage = (product.images && product.images.length > 0) ? product.images[0].image_url : null;

            return `

            <div class="product-card">

                <div class="product-image">

                    <a href="product.html?id=${product.id}">

                        <img src="${product.image}" alt="${product.title}" class="product-image-main">

                        ${secondImage ? `<img src="${secondImage}" alt="${product.title}" class="product-image-hover">` : ''}

                    </a>

                    ${product.in_stock === false ? '<span class="out-of-stock-badge">ناموجود</span>' : ''}

                </div>

                <div class="product-info">

                    <a href="product.html?id=${product.id}"><h3>${product.title}</h3></a>

                    <a href="product.html?id=${product.id}" class="home-view-product">

                        مشاهده محصول

                    </a>

                </div>

            </div>

        `;

        }).join("");

        initMobileItemSlider("#featuredProductsGrid", ".product-card", 5000);

    }catch(err){

        console.error("خطا در بارگذاری محصولات ویژه:", err);

    }

}

renderFeaturedProducts();


/*====================================
        MOBILE ITEM SLIDER (عمومی)

        روی دسکتاپ اثری نداره (چون CSS فقط
        زیر ۷۶۸px این کلاس‌ها رو معنی می‌ده).
        هر ۸ ثانیه خودکار عوض می‌شه، و با
        نقطه‌های پایین هم می‌شه دستی ورق زد.
====================================*/

function initMobileItemSlider(containerSelector, itemSelector, intervalMs = 8000){

    const container = document.querySelector(containerSelector);

    if(!container) return;

    const items = container.querySelectorAll(itemSelector);

    if(items.length === 0) return;

    // اگه از قبل نقطه‌ها ساخته شده (مثلاً رندر دوباره‌ی محصولات ویژه)، پاکشون کن
    const existingDots = container.parentElement.querySelector(`.mobile-slider-dots[data-for="${containerSelector}"]`);

    if(existingDots) existingDots.remove();

    const dotsWrap = document.createElement("div");

    dotsWrap.className = "mobile-slider-dots";

    dotsWrap.dataset.for = containerSelector;

    items.forEach((item, i) => {

        const dot = document.createElement("button");

        dot.type = "button";

        dot.className = "mobile-slider-dot" + (i === 0 ? " active" : "");

        dot.addEventListener("click", () => goToItem(i));

        dotsWrap.appendChild(dot);

    });

    container.insertAdjacentElement("afterend", dotsWrap);

    const dots = dotsWrap.querySelectorAll(".mobile-slider-dot");

    let current = 0;

    let timer;

    function showItem(index){

        items[current].classList.remove("mobile-slide-active");

        dots[current].classList.remove("active");

        current = index;

        items[current].classList.add("mobile-slide-active");

        dots[current].classList.add("active");

    }

    function goToItem(index){

        showItem(index);

        resetTimer();

    }

    function nextItem(){

        showItem((current + 1) % items.length);

    }

    function resetTimer(){

        clearInterval(timer);

        timer = setInterval(nextItem, intervalMs);

    }

    items.forEach((item, i) => item.classList.toggle("mobile-slide-active", i === 0));

    resetTimer();

}

initMobileItemSlider(".features .container", ".feature");

initMobileItemSlider(".counter .container", ".counter-box");

initMobileItemSlider(".instagram-grid", "img");


/*====================================
        NEWSLETTER FORM
====================================*/

const newsletterForm = document.getElementById("newsletterForm");

if(newsletterForm){

    newsletterForm.addEventListener("submit", (e) => {

        e.preventDefault();

        const emailInput = newsletterForm.querySelector('input[type="email"]');

        if(!emailInput.value.trim()){

            showToast("⚠️ ایمیلتو وارد کن");

            return;

        }

        /* نمادین: فعلاً ایمیل جایی ذخیره نمی‌شه.
           بعداً باید به یه سرویس خبرنامه یا API
           خودت وصل بشه. */

        showToast("✅ عضویت شما با موفقیت ثبت شد");

        newsletterForm.reset();

    });

}
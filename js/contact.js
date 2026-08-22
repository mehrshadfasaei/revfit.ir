/*====================================
        این فایل به shop-data.js وابسته‌ست
        (برای showToast, API_BASE_URL) - باید قبلش لینک بشه
====================================*/

const contactForm = document.getElementById("contactForm");

if(contactForm){

    contactForm.addEventListener("submit", async (e) => {

        e.preventDefault();

        const requiredFields = contactForm.querySelectorAll("[required]");

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

            showToast("⚠️ لطفاً فیلدهای اجباری رو پر کن");

            return;

        }

        const submitBtn = contactForm.querySelector('button[type="submit"]');

        const formData = new FormData(contactForm);

        submitBtn.disabled = true;

        submitBtn.textContent = "در حال ارسال...";

        try{

            const res = await fetch(`${API_BASE_URL}/api/contact`, {

                method: "POST",

                headers: { "Content-Type": "application/json" },

                body: JSON.stringify({

                    name: formData.get("name"),

                    contactInfo: formData.get("contact"),

                    subject: formData.get("subject") || null,

                    message: formData.get("message"),

                    website: formData.get("website") || ""

                })

            });

            if(!res.ok){

                const errData = await res.json().catch(() => null);

                throw new Error(errData?.detail || "ارسال پیام با مشکل مواجه شد");

            }

            showToast("✅ پیامت ارسال شد؛ به‌زودی باهات تماس می‌گیریم");

            contactForm.reset();

        }catch(err){

            console.error(err);

            showToast(`⚠️ ${err.message || "ارسال پیام با مشکل مواجه شد؛ مطمئن شو بک‌اند روشنه"}`);

        }finally{

            submitBtn.disabled = false;

            submitBtn.innerHTML = `ارسال پیام <i class="fa-solid fa-paper-plane"></i>`;

        }

    });

}

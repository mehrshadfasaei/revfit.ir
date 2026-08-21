/*====================================
        این فایل به shop-data.js وابسته‌ست
        (برای showToast) - باید قبلش لینک بشه
====================================*/

const contactForm = document.getElementById("contactForm");

if(contactForm){

    contactForm.addEventListener("submit", (e) => {

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

        /* نمادین: فعلاً پیام واقعاً جایی ارسال نمی‌شه.
           وقتی بک‌اند آماده شد، اینجا باید یه fetch به
           API ثبت پیام یا سرویس ایمیل (مثل Formspree/EmailJS)
           بزنی. */

        showToast("✅ پیامت ارسال شد؛ به‌زودی باهات تماس می‌گیریم");

        contactForm.reset();

    });

}

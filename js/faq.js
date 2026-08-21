/*====================================
        FAQ ACCORDION
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

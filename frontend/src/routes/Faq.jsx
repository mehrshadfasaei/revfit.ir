import PageBanner from "../components/ui/PageBanner";
import Accordion from "../components/ui/Accordion";

const FAQS = [
    {
        q: "چطور می‌تونم سفارشم رو پیگیری کنم؟",
        a: "بعد از ثبت سفارش، یه کد پیگیری از طریق پیامک برات ارسال می‌شه. با این کد می‌تونی از طریق تماس با پشتیبانی وضعیت سفارشت رو بپرسی.",
    },
    {
        q: "سایزبندی محصولات چطوره؟",
        a: "سایزها از S تا 2XL موجودن. اگه بین دو سایز مردد بودی، توصیه می‌کنیم سایز بزرگ‌تر رو انتخاب کنی، چون بیشتر محصولات ما برش relaxed دارن.",
    },
    {
        q: "امکان تغییر سفارش بعد از ثبت هست؟",
        a: "تا قبل از ارسال سفارش، از طریق تماس با پشتیبانی می‌تونی درخواست تغییر یا لغو بدی. بعد از ارسال، فقط با قوانین بازگشت کالا قابل پیگیریه.",
    },
    {
        q: "روش‌های پرداخت چیه؟",
        a: "می‌تونی از درگاه پرداخت آنلاین (کارت بانکی) یا پرداخت در محل هنگام تحویل استفاده کنی.",
    },
    {
        q: "چطور می‌تونم با پشتیبانی تماس بگیرم؟",
        a: "از طریق صفحه‌ی «تماس با ما» یا شماره‌ی درج‌شده در فوتر سایت می‌تونی با ما در ارتباط باشی.",
    },
];

/**
 * پورت‌شده از html/faq.html + js/faq.js — با <Accordion/> مشترک
 * (همون کامپوننتی که توی PDP هم استفاده می‌شه).
 */
export default function Faq() {
    return (
        <>
            <PageBanner title="سوالات متداول" />

            <section className="static-page">
                <div className="container">
                    <div className="product-accordion static-faq">
                        {FAQS.map((item, i) => (
                            <div className="accordion-item" key={i}>
                                <Accordion title={item.q} defaultOpen={i === 0}>
                                    <p className="accordion-text">{item.a}</p>
                                </Accordion>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}

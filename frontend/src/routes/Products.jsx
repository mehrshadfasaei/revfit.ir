import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import ProductCard from "../components/ui/ProductCard";
import ProductCardSkeleton from "../components/ui/ProductCardSkeleton";
import Pagination from "../components/ui/Pagination";
import { useProducts } from "../hooks/useProducts";

const PER_PAGE = 8;
const SKELETON_COUNT = 8;

function sortProducts(list, sortKey) {
    const sorted = [...list];

    switch (sortKey) {
        case "cheapest":
            sorted.sort((a, b) => a.price - b.price);
            break;
        case "expensive":
            sorted.sort((a, b) => b.price - a.price);
            break;
        case "bestseller":
            sorted.sort((a, b) => b.sales - a.sales);
            break;
        case "newest":
        default:
            // نکته: محصولات API فیلد createdAt ندارن، پس این مقایسه
            // همیشه NaN می‌ده و عملاً ترتیب رو دست‌نخورده نگه می‌داره —
            // همون رفتار (نه چندان مفید) کد قدیمی js/products.js، عیناً حفظ شده.
            sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return sorted;
}

/**
 * پورت‌شده از html/products.html + js/products.js.
 */
export default function Products() {
    const { products, loading } = useProducts();
    const [searchParams] = useSearchParams();

    const [search, setSearch] = useState(() => searchParams.get("search") || "");
    const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
    const [sort, setSort] = useState("newest");
    const [page, setPage] = useState(1);
    const debounceRef = useRef(null);
    const toolbarRef = useRef(null);

    // فیلتر دسته‌بندی/قیمت (فیچر جدیده) - دسته‌بندی از خودِ لیست
    // محصولات استخراج می‌شه (نه یه لیست ثابت جایی)، پس هر دسته‌ای
    // که ادمین اضافه کنه خودکار این‌جا هم ظاهر می‌شه
    const [category, setCategory] = useState("all");
    const [priceMinInput, setPriceMinInput] = useState("");
    const [priceMaxInput, setPriceMaxInput] = useState("");
    const [priceMin, setPriceMin] = useState("");
    const [priceMax, setPriceMax] = useState("");
    // دو ref جدا برای دو تایمر جدا - وگرنه اگه کاربر سریع از فیلد
    // «از» به فیلد «تا» بره (مثلاً با Tab)، تایمر دومی اولی رو
    // clear می‌کنه و مقدار «از» هیچ‌وقت واقعاً اعمال نمی‌شه
    const priceMinDebounceRef = useRef(null);
    const priceMaxDebounceRef = useRef(null);

    const categories = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);

    const hasActiveFilters = category !== "all" || priceMin !== "" || priceMax !== "";

    function handleSearchInput(e) {
        const value = e.target.value;
        setSearchInput(value);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setSearch(value);
            setPage(1);
        }, 300);
    }

    function handleSortChange(e) {
        setSort(e.target.value);
        setPage(1);
    }

    function handleCategoryChange(next) {
        setCategory(next);
        setPage(1);
    }

    function handlePriceInputChange(setter, valueSetter, debounceRef) {
        return (e) => {
            const value = e.target.value;
            setter(value);

            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                valueSetter(value);
                setPage(1);
            }, 400);
        };
    }

    function handleClearFilters() {
        setCategory("all");
        setPriceMinInput("");
        setPriceMaxInput("");
        setPriceMin("");
        setPriceMax("");
        setPage(1);
    }

    const filtered = useMemo(() => {
        let list = products;

        if (search.trim() !== "") {
            const term = search.trim().toLowerCase();
            list = list.filter((p) => p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
        }

        if (category !== "all") {
            list = list.filter((p) => p.category === category);
        }

        // final_price همیشه قیمت واقعیه (اگه تخفیف فعال باشه، همون
        // قیمت تخفیف‌خورده) - فیلتر قیمت هم باید رو همین اعمال بشه،
        // نه رو price خام، وگرنه محصول تخفیف‌دار که قیمت نهاییش تو
        // بازه‌ست ولی قیمت اصلیش نیست، غلط فیلتر می‌شد
        if (priceMin !== "") {
            const min = Number(priceMin);
            list = list.filter((p) => (p.final_price ?? p.price) >= min);
        }

        if (priceMax !== "") {
            const max = Number(priceMax);
            list = list.filter((p) => (p.final_price ?? p.price) <= max);
        }

        return sortProducts(list, sort);
    }, [products, search, sort, category, priceMin, priceMax]);

    const backendDown = !loading && products.length === 0;

    const pageItems = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    function goToPage(n) {
        setPage(n);
        toolbarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    return (
        <>
            <PageBanner title="محصولات" />

            <section className="shop-toolbar-section" ref={toolbarRef}>
                <div className="container">
                    <div className="shop-toolbar">
                        <div className="toolbar-search">
                            <i className="fa-solid fa-magnifying-glass"></i>
                            <input
                                type="text"
                                id="productSearch"
                                placeholder="جستجوی محصول..."
                                value={searchInput}
                                onChange={handleSearchInput}
                            />
                        </div>

                        <div className="toolbar-result">
                            <span id="resultCount">{filtered.length} محصول یافت شد</span>
                        </div>

                        <div className="toolbar-sort">
                            <label htmlFor="productSort">مرتب‌سازی:</label>
                            <select id="productSort" value={sort} onChange={handleSortChange}>
                                <option value="newest">جدیدترین</option>
                                <option value="cheapest">ارزان‌ترین</option>
                                <option value="expensive">گران‌ترین</option>
                                <option value="bestseller">پرفروش‌ترین</option>
                            </select>
                        </div>
                    </div>

                    {/* فیلتر دسته‌بندی/قیمت (فیچر جدیده) */}
                    <div className="shop-filters">
                        <div className="filter-categories">
                            <button
                                className={`filter-chip${category === "all" ? " active" : ""}`}
                                onClick={() => handleCategoryChange("all")}
                            >
                                همه دسته‌ها
                            </button>
                            {categories.map((c) => (
                                <button
                                    key={c}
                                    className={`filter-chip${category === c ? " active" : ""}`}
                                    onClick={() => handleCategoryChange(c)}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>

                        <div className="filter-price">
                            <label>
                                از
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="حداقل قیمت"
                                    value={priceMinInput}
                                    onChange={handlePriceInputChange(setPriceMinInput, setPriceMin, priceMinDebounceRef)}
                                />
                            </label>
                            <label>
                                تا
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="حداکثر قیمت"
                                    value={priceMaxInput}
                                    onChange={handlePriceInputChange(setPriceMaxInput, setPriceMax, priceMaxDebounceRef)}
                                />
                            </label>

                            {hasActiveFilters && (
                                <button type="button" className="filter-clear-btn" onClick={handleClearFilters}>
                                    <i className="fa-solid fa-xmark"></i> پاک کردن فیلترها
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="products shop-products">
                <div className="container">
                    {loading && (
                        <div className="products-grid" id="productsGrid">
                            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                                <ProductCardSkeleton key={i} variant="grid" />
                            ))}
                        </div>
                    )}

                    {!loading && pageItems.length > 0 && (
                        <div className="products-grid" id="productsGrid">
                            {pageItems.map((product) => (
                                <ProductCard key={product.id} product={product} variant="grid" />
                            ))}
                        </div>
                    )}

                    {!loading && pageItems.length === 0 && (
                        <div className="empty-state show" id="emptyState">
                            <i className="fa-solid fa-box-open"></i>
                            <p>
                                {backendDown
                                    ? "⚠️ در حال حاضر اتصال به فروشگاه برقرار نیست. لطفاً چند لحظه دیگه دوباره امتحان کن."
                                    : "محصولی با این مشخصات پیدا نشد."}
                            </p>
                        </div>
                    )}

                    <Pagination page={page} totalItems={filtered.length} perPage={PER_PAGE} onPageChange={goToPage} />
                </div>
            </section>
        </>
    );
}

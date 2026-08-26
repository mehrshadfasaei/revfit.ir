import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import ProductCard from "../components/ui/ProductCard";
import Pagination from "../components/ui/Pagination";
import { useProducts } from "../hooks/useProducts";

const PER_PAGE = 8;

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

    const filtered = useMemo(() => {
        let list = products;

        if (search.trim() !== "") {
            const term = search.trim().toLowerCase();
            list = list.filter((p) => p.title.toLowerCase().includes(term) || p.category.toLowerCase().includes(term));
        }

        return sortProducts(list, sort);
    }, [products, search, sort]);

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
                </div>
            </section>

            <section className="products shop-products">
                <div className="container">
                    {pageItems.length > 0 && (
                        <div className="products-grid" id="productsGrid">
                            {pageItems.map((product) => (
                                <ProductCard key={product.id} product={product} variant="grid" />
                            ))}
                        </div>
                    )}

                    {pageItems.length === 0 && (
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

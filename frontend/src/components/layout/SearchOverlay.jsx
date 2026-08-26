import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts } from "../../lib/api";
import { formatPrice } from "../../lib/format";

/**
 * پورت‌شده از js/common.js's openSearchOverlay/closeSearchOverlay/
 * runGlobalSearch. Enter همچنان به /products?search=<term> می‌ره؛
 * نتایج به /product/:id لینک می‌شن (مسیر تمیز جدید، به‌جای
 * product.html?id=).
 */
export default function SearchOverlay({ open, onClose }) {
    const [term, setTerm] = useState("");
    const [results, setResults] = useState(null); // null = هنوز جستجویی نشده
    const inputRef = useRef(null);
    const debounceRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;

        const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);

        const onKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);

        document.body.style.overflow = "hidden";

        return () => {
            clearTimeout(focusTimer);
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) {
            setTerm("");
            setResults(null);
        }
    }, [open]);

    function runSearch(value) {
        const query = value.trim().toLowerCase();

        if (query === "") {
            setResults(null);
            return;
        }

        getProducts().then((products) => {
            const matches = products
                .filter((p) => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query))
                .slice(0, 6);

            setResults(matches);
        });
    }

    function handleInput(e) {
        const value = e.target.value;
        setTerm(value);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(value), 250);
    }

    function handleKeyDown(e) {
        if (e.key === "Enter" && term.trim() !== "") {
            onClose();
            navigate(`/products?search=${encodeURIComponent(term.trim())}`);
        }
    }

    return (
        <div
            className={`search-overlay${open ? " show" : ""}`}
            id="searchOverlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="search-box">
                <button className="search-close" id="searchClose" onClick={onClose}>
                    <i className="fa-solid fa-xmark"></i>
                </button>

                <div className="search-input-wrap">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        ref={inputRef}
                        type="text"
                        id="globalSearchInput"
                        placeholder="جستجوی محصول..."
                        autoComplete="off"
                        value={term}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                <div className="search-results" id="searchResults">
                    {results !== null && results.length === 0 && <p className="search-empty">محصولی با این عنوان پیدا نشد.</p>}

                    {results !== null &&
                        results.map((p) => (
                            <a
                                key={p.id}
                                href={`/product/${p.id}`}
                                className="search-result-item"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onClose();
                                    navigate(`/product/${p.id}`);
                                }}
                            >
                                <img src={p.image} alt={p.title} />
                                <div>
                                    <h4>{p.title}</h4>
                                    <span>{formatPrice(p.price)} تومان</span>
                                </div>
                            </a>
                        ))}
                </div>
            </div>
        </div>
    );
}

/**
 * پورت‌شده از js/products.js's renderPagination().
 */
export default function Pagination({ page, totalItems, perPage, onPageChange }) {
    const totalPages = Math.ceil(totalItems / perPage);

    if (totalPages <= 1) return null;

    return (
        <div id="pagination">
            <button disabled={page === 1} onClick={() => onPageChange(page - 1)}>
                <i className="fa-solid fa-chevron-right"></i>
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} className={n === page ? "active" : undefined} onClick={() => onPageChange(n)}>
                    {n}
                </button>
            ))}

            <button disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
                <i className="fa-solid fa-chevron-left"></i>
            </button>
        </div>
    );
}

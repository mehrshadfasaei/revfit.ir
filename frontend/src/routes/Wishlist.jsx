import { useState } from "react";
import { Link } from "react-router-dom";
import PageBanner from "../components/ui/PageBanner";
import ProductCard from "../components/ui/ProductCard";
import { useProducts } from "../hooks/useProducts";
import { getWishlistIds, removeFromWishlist } from "../lib/wishlist";
import { addToCart } from "../lib/cart";
import { showToast } from "../lib/toast";

/**
 * پورت‌شده از html/wishlist.html + js/wishlist.js.
 */
export default function Wishlist() {
    const { products } = useProducts();
    const [wishlistIds, setWishlistIds] = useState(() => getWishlistIds());

    const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

    function handleRemove(id) {
        removeFromWishlist(id);
        setWishlistIds(getWishlistIds());
        showToast("❌ محصول از علاقه‌مندی‌ها حذف شد");
    }

    function handleAddToCart(product) {
        addToCart(product, 1);
    }

    return (
        <>
            <PageBanner title="علاقه‌مندی‌ها" />

            <section className="products shop-products">
                <div className="container">
                    {wishlistProducts.length > 0 && (
                        <div className="products-grid" id="wishlistGrid">
                            {wishlistProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                    variant="wishlist"
                                    onRemoveFromWishlist={handleRemove}
                                    onAddToCart={handleAddToCart}
                                />
                            ))}
                        </div>
                    )}

                    {wishlistProducts.length === 0 && (
                        <div className="empty-state show" id="wishlistEmptyState">
                            <i className="fa-regular fa-heart"></i>
                            <p>هنوز محصولی به علاقه‌مندی‌هات اضافه نکردی.</p>
                            <Link to="/products" className="btn-continue-shopping">
                                مشاهده محصولات
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}

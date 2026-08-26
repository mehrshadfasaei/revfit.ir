/**
 * پورت‌شده از shop-data.js's renderStars() — همون منطق پر/نیم/خالی.
 */
export default function Stars({ rating }) {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.5;

    const icons = [];
    for (let i = 0; i < 5; i++) {
        if (i < full) {
            icons.push(<i key={i} className="fa-solid fa-star"></i>);
        } else if (i === full && hasHalf) {
            icons.push(<i key={i} className="fa-solid fa-star-half-stroke"></i>);
        } else {
            icons.push(<i key={i} className="fa-regular fa-star"></i>);
        }
    }

    return <>{icons}</>;
}

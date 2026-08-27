import { Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./routes/Home";
import Products from "./routes/Products";
import ProductDetail from "./routes/ProductDetail";
import Cart from "./routes/Cart";
import Checkout from "./routes/Checkout";
import CheckoutSuccess from "./routes/CheckoutSuccess";
import About from "./routes/About";
import Contact from "./routes/Contact";
import Faq from "./routes/Faq";
import Privacy from "./routes/Privacy";
import Shipping from "./routes/Shipping";
import Terms from "./routes/Terms";
import TrackOrder from "./routes/TrackOrder";
import Login from "./routes/Login";
import Register from "./routes/Register";
import VerifyEmail from "./routes/VerifyEmail";
import ForgotPassword from "./routes/ForgotPassword";
import ResetPassword from "./routes/ResetPassword";
import Account from "./routes/Account";

function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/checkout/success" element={<CheckoutSuccess />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<Faq />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/shipping" element={<Shipping />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/track-order" element={<TrackOrder />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/account" element={<Account />} />
            </Route>
        </Routes>
    );
}

export default App;

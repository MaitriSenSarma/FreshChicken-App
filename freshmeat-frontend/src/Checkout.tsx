import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, MapPin, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import "./Checkout.css";

type CartItem = { name: string; pack: string; quantity: number; price: number };
type DeliveryDetails = { fullName: string; phone: string; apartment: string; flatNumber: string; floor?: string; landmark?: string };

const DELIVERY_FEE = 30;
const FREE_DELIVERY_AT = 499;

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>(() => readJson<CartItem[]>("freshmeat-cart", []));
  const [address, setAddress] = useState<DeliveryDetails | null>(() => readJson<DeliveryDetails | null>("freshmeat-delivery-address", null));
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("freshmeat-cart", JSON.stringify(items));
  }, [items]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_AT ? 0 : DELIVERY_FEE;
  const total = subtotal + deliveryFee;

  function changeQuantity(index: number, change: number) {
    setItems((current) => current.map((item, i) => i === index ? { ...item, quantity: Math.max(1, Math.min(20, item.quantity + change)) } : item));
  }

  function placeOrder() {
    setError("");
    if (items.length === 0) {
      setError("Your cart is empty. Add a product before checkout.");
      return;
    }
    if (!address?.fullName || !address?.phone || !address?.apartment || !address?.flatNumber) {
      setError("Please save your delivery address first.");
      return;
    }
    setPlacing(true);
    const order = {
      orderId: `FM${Date.now().toString().slice(-8)}`,
      items,
      address,
      paymentMethod,
      instructions: instructions.trim(),
      subtotal,
      deliveryFee,
      total,
      status: "Order Placed",
      createdAt: new Date().toISOString(),
    };
    window.localStorage.setItem("freshmeat-last-order", JSON.stringify(order));
    const previousOrders = readJson<Record<string, unknown>[]>("freshmeat-orders", []);
    window.localStorage.setItem("freshmeat-orders", JSON.stringify([order, ...previousOrders]));
    window.localStorage.setItem("freshmeat-cart", JSON.stringify([]));
    window.location.href = "/order-confirmation";
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <button className="checkout-back" onClick={() => { window.location.href = "/?openCart=1"; }} aria-label="Back to cart"><ArrowLeft size={19} /></button>
        <a href="/" className="checkout-brand"><span className="checkout-brand-mark">F</span><span>Fresh<span>Meat</span></span></a>
        <div className="checkout-secure"><ShieldCheck size={17} /> Secure checkout</div>
      </header>

      <section className="checkout-hero">
        <div><span className="checkout-eyebrow">ALMOST THERE</span><h1>Checkout <span>your order</span></h1><p>Review your items and delivery details before placing your order.</p></div>
        <div className="checkout-hero-icon"><ShoppingBag size={38} /></div>
      </section>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-card">
            <div className="checkout-section-heading"><span className="checkout-step">1</span><div><h2>Delivery address</h2><p>Where should we deliver your order?</p></div></div>
            {address ? (
              <div className="checkout-address-box"><MapPin size={21} /><div><strong>{address.fullName}</strong><p>{address.flatNumber}{address.floor ? `, ${address.floor}` : ""}, {address.apartment}</p>{address.landmark && <p>Landmark: {address.landmark}</p>}<small>+91 {address.phone}</small></div><button onClick={() => { window.location.href = "/address"; }}>Change</button></div>
            ) : (
              <div className="checkout-address-missing"><MapPin size={22} /><div><strong>No saved delivery address</strong><p>Add and save your address to continue.</p><button onClick={() => { window.location.href = "/address"; }}>Add delivery address</button></div></div>
            )}
          </section>

          <section className="checkout-card">
            <div className="checkout-section-heading"><span className="checkout-step">2</span><div><h2>Order items</h2><p>{items.reduce((sum, item) => sum + item.quantity, 0)} item(s) in your cart</p></div></div>
            {items.length === 0 ? <div className="checkout-empty"><ShoppingBag size={35} /><strong>Your cart is empty</strong><p>Add some fresh products before checkout.</p><button onClick={() => { window.location.href = "/products"; }}>Browse products</button></div> : (
              <div className="checkout-items">{items.map((item, index) => (
                <article className="checkout-item" key={`${item.name}-${item.pack}-${index}`}>
                  <div className="checkout-product-icon"><ShoppingBag size={21} /></div>
                  <div className="checkout-item-info"><strong>{item.name}</strong><span>{item.pack}</span><b>₹{item.price} <small>/ pack</small></b></div>
                  <div className="checkout-quantity"><button onClick={() => changeQuantity(index, -1)} disabled={item.quantity <= 1} aria-label="Decrease quantity"><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => changeQuantity(index, 1)} disabled={item.quantity >= 20} aria-label="Increase quantity"><Plus size={14} /></button></div>
                  <strong className="checkout-line-total">₹{item.price * item.quantity}</strong>
                </article>
              ))}</div>
            )}
          </section>

          <section className="checkout-card">
            <div className="checkout-section-heading"><span className="checkout-step">3</span><div><h2>Payment method</h2><p>Choose how you would like to pay.</p></div></div>
            <label className={`checkout-payment-option ${paymentMethod === "cod" ? "selected" : ""}`}><input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} /><span className="checkout-payment-symbol">₹</span><span><strong>Cash on Delivery</strong><small>Pay when your order arrives</small></span><CheckCircle2 size={19} /></label>
            <label className="checkout-payment-option checkout-payment-disabled"><input type="radio" name="payment" value="online" disabled /><span className="checkout-payment-symbol">↗</span><span><strong>Online payment</strong><small>Coming soon</small></span></label>
            <label className="checkout-instructions"><span>Delivery instructions (optional)</span><textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Anything the delivery partner should know?" rows={3} maxLength={250} /></label>
          </section>
        </div>

        <aside className="checkout-summary-card">
          <h2>Bill details</h2>
          <div className="checkout-summary-row"><span>Item total</span><strong>₹{subtotal}</strong></div>
          <div className="checkout-summary-row"><span>Delivery fee</span><strong>{deliveryFee === 0 ? <span className="checkout-free">FREE</span> : `₹${deliveryFee}`}</strong></div>
          {subtotal > 0 && subtotal < FREE_DELIVERY_AT && <p className="checkout-delivery-tip">Add ₹{FREE_DELIVERY_AT - subtotal} more for free delivery.</p>}
          <div className="checkout-summary-total"><span>To pay</span><strong>₹{total}</strong></div>
          <div className="checkout-cod-note"><Truck size={18} /><span>Pay securely when your order is delivered.</span></div>
          {error && <p className="checkout-error" role="alert">{error}</p>}
          <button className="checkout-place-order" onClick={placeOrder} disabled={placing || items.length === 0}>{placing ? "Placing order…" : "Place order"}<span>→</span></button>
          <p className="checkout-terms">By placing your order, you agree to our terms and delivery policy.</p>
          <button className="checkout-back-to-cart" onClick={() => { window.location.href = "/?openCart=1"; }}>Back to cart</button>
        </aside>
      </div>
      <footer className="checkout-footer"><a href="/" className="checkout-brand"><span className="checkout-brand-mark">F</span><span>Fresh<span>Meat</span></span></a><span>© {new Date().getFullYear()} FreshMeat</span></footer>
    </main>
  );
}

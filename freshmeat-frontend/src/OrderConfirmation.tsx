import { ArrowRight, CheckCircle2, ClipboardList, MapPin, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import "./OrderConfirmation.css";

type CartItem = { name: string; pack: string; quantity: number; price: number };
type DeliveryDetails = { fullName: string; phone: string; apartment: string; flatNumber: string; floor?: string; landmark?: string };
type OrderDetails = {
  orderId: string;
  items: CartItem[];
  address: DeliveryDetails;
  paymentMethod: string;
  instructions?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
};

function readOrder(): OrderDetails | null {
  try {
    const saved = window.localStorage.getItem("freshmeat-last-order");
    return saved ? (JSON.parse(saved) as OrderDetails) : null;
  } catch {
    return null;
  }
}

export default function OrderConfirmation() {
  const order = readOrder();

  if (!order) {
    return (
      <main className="confirmation-page">
        <header className="confirmation-header"><a href="/" className="confirmation-brand"><span className="confirmation-brand-mark">F</span><span>Fresh<span>Meat</span></span></a></header>
        <section className="confirmation-empty">
          <ShoppingBag size={42} />
          <h1>No recent order found</h1>
          <p>Place an order first, and your confirmation details will appear here.</p>
          <button onClick={() => { window.location.href = "/products"; }}>Browse products <ArrowRight size={17} /></button>
        </section>
      </main>
    );
  }

  const addressLine = `${order.address.flatNumber}${order.address.floor ? `, ${order.address.floor}` : ""}, ${order.address.apartment}`;
  const createdDate = new Date(order.createdAt);
  const readableDate = Number.isNaN(createdDate.getTime()) ? "Just now" : createdDate.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="confirmation-page">
      <header className="confirmation-header">
        <a href="/" className="confirmation-brand" aria-label="FreshMeat home"><span className="confirmation-brand-mark">F</span><span>Fresh<span>Meat</span></span></a>
        <span className="confirmation-secure"><CheckCircle2 size={17} /> Order status</span>
      </header>

      <section className="confirmation-success-hero">
        <div className="confirmation-success-icon"><CheckCircle2 size={43} strokeWidth={2.2} /></div>
        <span className="confirmation-eyebrow">THANK YOU FOR CHOOSING FRESHMEAT</span>
        <h1>Your order is <span>placed!</span></h1>
        <p>Thanks, {order.address.fullName}. We have saved your order details.</p>
        <div className="confirmation-order-number"><span>ORDER ID</span><strong>{order.orderId}</strong><button onClick={() => { void navigator.clipboard?.writeText(order.orderId); }} aria-label="Copy order ID"><ClipboardList size={17} /> Copy</button></div>
        <small className="confirmation-created">Placed on {readableDate}</small>
      </section>

      <div className="confirmation-layout">
        <section className="confirmation-card confirmation-items-card">
          <div className="confirmation-card-heading"><PackageCheck size={21} /><div><h2>Order summary</h2><p>{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</p></div></div>
          <div className="confirmation-items">
            {order.items.map((item, index) => (
              <article className="confirmation-item" key={`${item.name}-${item.pack}-${index}`}>
                <div className="confirmation-item-icon"><ShoppingBag size={21} /></div>
                <div className="confirmation-item-info"><strong>{item.name}</strong><span>{item.pack} · Qty {item.quantity}</span><small>₹{item.price} per pack</small></div>
                <strong className="confirmation-item-total">₹{item.price * item.quantity}</strong>
              </article>
            ))}
          </div>
          <div className="confirmation-bill-row"><span>Item total</span><strong>₹{order.subtotal}</strong></div>
          <div className="confirmation-bill-row"><span>Delivery fee</span><strong>{order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}</strong></div>
          <div className="confirmation-bill-total"><span>Total payable</span><strong>₹{order.total}</strong></div>
          <div className="confirmation-payment"><span className="confirmation-payment-icon">₹</span><div><strong>Cash on Delivery</strong><small>Pay when your order arrives</small></div><span className="confirmation-cod">COD</span></div>
        </section>

        <aside className="confirmation-side-column">
          <section className="confirmation-card confirmation-address-card">
            <div className="confirmation-card-heading"><MapPin size={21} /><div><h2>Delivery address</h2><p>We'll deliver your order here.</p></div></div>
            <strong>{order.address.fullName}</strong>
            <p>{addressLine}</p>
            {order.address.landmark && <p>Landmark: {order.address.landmark}</p>}
            <small>+91 {order.address.phone}</small>
            {order.instructions && <div className="confirmation-instructions"><strong>Delivery instructions</strong><p>{order.instructions}</p></div>}
          </section>
          <section className="confirmation-next-card">
            <div className="confirmation-truck-icon"><Truck size={24} /></div>
            <h2>What's next?</h2>
            <p>We'll prepare your order and update its status as it moves toward delivery.</p>
            <div className="confirmation-status"><span className="confirmation-status-dot" /><span><strong>{order.status}</strong><small>Current demo status</small></span></div>
            <button onClick={() => { window.location.href = "/track-order"; }}>Track my order <ArrowRight size={17} /></button>
          </section>
        </aside>
      </div>

      <div className="confirmation-bottom-actions"><button className="confirmation-primary" onClick={() => { window.location.href = "/track-order"; }}>Track my order <ArrowRight size={17} /></button><button className="confirmation-secondary" onClick={() => { window.location.href = "/products"; }}>Continue shopping</button></div>
      <footer className="confirmation-footer"><a href="/" className="confirmation-brand"><span className="confirmation-brand-mark">F</span><span>Fresh<span>Meat</span></span></a><span>© {new Date().getFullYear()} FreshMeat</span></footer>
    </main>
  );
}

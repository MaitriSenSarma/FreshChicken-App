import { useMemo } from "react";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Package, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import "./OrderTracking.css";

type OrderItem = { name: string; pack: string; quantity: number; price: number };
type DeliveryAddress = { fullName: string; phone: string; apartment: string; flatNumber: string; floor?: string; landmark?: string };
type Order = {
  orderId: string;
  items: OrderItem[];
  address: DeliveryAddress;
  paymentMethod?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
};

const steps = [
  { title: "Order placed", detail: "We've received your order.", icon: CheckCircle2 },
  { title: "Order confirmed", detail: "The store confirms your order.", icon: PackageCheck },
  { title: "Preparing your order", detail: "Your items are being prepared.", icon: Package },
  { title: "Out for delivery", detail: "Your order is on its way.", icon: Truck },
  { title: "Delivered", detail: "Enjoy your fresh order!", icon: CheckCircle2 },
];

function readOrder(): Order | null {
  try {
    const raw = localStorage.getItem("freshmeat-last-order");
    return raw ? (JSON.parse(raw) as Order) : null;
  } catch {
    return null;
  }
}

export default function OrderTracking() {
  const order = useMemo(() => readOrder(), []);
  const currentStep = useMemo(() => {
    const status = (order?.status || "Order Placed").toLowerCase();
    if (status.includes("deliver") && !status.includes("out for")) return 4;
    if (status.includes("out for")) return 3;
    if (status.includes("prepar")) return 2;
    if (status.includes("confirm")) return 1;
    return 0;
  }, [order]);

  if (!order) {
    return (
      <main className="tracking-page">
        <header className="tracking-header"><a href="/" className="tracking-brand"><span className="tracking-brand-mark">F</span><span>Fresh<span>Meat</span></span></a></header>
        <section className="tracking-empty"><PackageCheck size={42} /><h1>No order to track yet</h1><p>Place an order first. Your latest order will appear here.</p><button onClick={() => { window.location.href = "/products"; }}>Browse products</button></section>
      </main>
    );
  }

  const date = new Date(order.createdAt);
  const addressLine = `${order.address.flatNumber}${order.address.floor ? `, ${order.address.floor}` : ""}, ${order.address.apartment}`;

  return (
    <main className="tracking-page">
      <header className="tracking-header">
        <button className="tracking-back" onClick={() => { window.location.href = "/order-confirmation"; }} aria-label="Back to order confirmation"><ArrowLeft size={19} /></button>
        <a href="/" className="tracking-brand"><span className="tracking-brand-mark">F</span><span>Fresh<span>Meat</span></span></a>
        <span className="tracking-secure"><Truck size={17} /> Order tracking</span>
      </header>

      <section className="tracking-hero">
        <div className="tracking-hero-icon"><Truck size={36} /></div>
        <span className="tracking-eyebrow">YOUR FRESH ORDER</span>
        <h1>Track your <span>order</span></h1>
        <p>Follow your order's progress from placement to delivery.</p>
      </section>

      <div className="tracking-layout">
        <section className="tracking-card tracking-progress-card">
          <div className="tracking-order-heading">
            <div><span className="tracking-muted-label">ORDER ID</span><h2>{order.orderId}</h2><p>Placed on {Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div>
            <span className="tracking-status-pill"><Clock3 size={15} /> {order.status || "Order Placed"}</span>
          </div>
          <div className="tracking-timeline">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const complete = index <= currentStep;
              const active = index === currentStep;
              return <div className={`tracking-step ${complete ? "complete" : "upcoming"} ${active ? "active" : ""}`} key={step.title}>
                <div className="tracking-step-marker"><Icon size={19} /></div>
                {index < steps.length - 1 && <div className="tracking-step-line" />}
                <div className="tracking-step-copy"><strong>{step.title}</strong><p>{step.detail}</p>{active && <small>Current demo status</small>}</div>
              </div>;
            })}
          </div>
          <p className="tracking-demo-note">Status updates are a demo for now. Live updates will work after connecting the order status to the Django backend.</p>
        </section>

        <aside className="tracking-side">
          <section className="tracking-card">
            <div className="tracking-card-title"><MapPin size={20} /><h2>Delivery address</h2></div>
            <strong>{order.address.fullName}</strong>
            <p>{addressLine}</p>
            {order.address.landmark && <p>Landmark: {order.address.landmark}</p>}
            <small>+91 {order.address.phone}</small>
          </section>
          <section className="tracking-card">
            <div className="tracking-card-title"><ShoppingBag size={20} /><h2>Order summary</h2></div>
            <div className="tracking-items">{order.items.map((item, index) => <div className="tracking-item" key={`${item.name}-${item.pack}-${index}`}><div><strong>{item.name}</strong><small>{item.pack} × {item.quantity}</small></div><b>₹{item.price * item.quantity}</b></div>)}</div>
            <div className="tracking-total-row"><span>Item total</span><strong>₹{order.subtotal}</strong></div>
            <div className="tracking-total-row"><span>Delivery fee</span><strong>{order.deliveryFee === 0 ? "FREE" : `₹${order.deliveryFee}`}</strong></div>
            <div className="tracking-grand-total"><span>Total payable</span><strong>₹{order.total}</strong></div>
            <div className="tracking-payment"><span>Payment</span><strong>{order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod || "Cash on Delivery"}</strong></div>
          </section>
        </aside>
      </div>
      <div className="tracking-bottom-actions"><button className="tracking-primary" onClick={() => { window.location.href = "/products"; }}>Continue shopping</button><button className="tracking-secondary" onClick={() => { window.location.href = "/"; }}>Back to home</button></div>
      <footer className="tracking-footer"><a href="/" className="tracking-brand"><span className="tracking-brand-mark">F</span><span>Fresh<span>Meat</span></span></a><span>© {new Date().getFullYear()} FreshMeat</span></footer>
    </main>
  );
}

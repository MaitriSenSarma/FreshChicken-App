
import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";

import api from "./api";
import "./OrderTracking.css";

// -------------------- TYPES --------------------

type OrderItem = {
  productId?: number;
  packId?: number;
  name: string;
  pack: string;
  quantity: number;
  price: number;
};

type DeliveryAddress = {
  fullName: string;
  phone: string;
  apartment: string;
  flatNumber: string;
  floor?: string;
  landmark?: string;
};

type Order = {
  orderId: number | string;
  items: OrderItem[];
  address: DeliveryAddress;
  paymentMethod?: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: string;
  createdAt: string;
};

type TrackingEvent = {
  id: number;
  status: string;
  status_display: string;
  note: string;
  created_at: string;
};

type TrackingResponse = {
  order_id: number;
  current_status: string;
  current_status_display: string;
  created_at: string;
  updated_at: string;
  history: TrackingEvent[];
};

// -------------------- TRACKING STEPS --------------------

const steps = [
  {
    status: "pending",
    title: "Order placed",
    detail: "We've received your order.",
    icon: CheckCircle2,
  },
  {
    status: "confirmed",
    title: "Order confirmed",
    detail: "The store confirms your order.",
    icon: PackageCheck,
  },
  {
    status: "preparing",
    title: "Preparing your order",
    detail: "Your items are being prepared.",
    icon: Package,
  },
  {
    status: "out_for_delivery",
    title: "Out for delivery",
    detail: "Your order is on its way.",
    icon: Truck,
  },
  {
    status: "delivered",
    title: "Delivered",
    detail: "Enjoy your fresh order!",
    icon: CheckCircle2,
  },
];

// -------------------- READ SAVED ORDER --------------------

function readOrder(): Order | null {
  try {
    const raw = localStorage.getItem("freshmeat-last-order");

    return raw ? (JSON.parse(raw) as Order) : null;
  } catch (error) {
    console.error("Unable to read saved order:", error);
    return null;
  }
}

// -------------------- MAIN COMPONENT --------------------

export default function OrderTracking() {
  const order = useMemo(() => readOrder(), []);

  const [tracking, setTracking] =
    useState<TrackingResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // -------------------- FETCH TRACKING FROM DJANGO --------------------

  async function loadTracking() {
    if (!order?.orderId) {
      setError("Order information not found.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get<TrackingResponse>(
        `/orders/${order.orderId}/tracking/`
      );

      setTracking(response.data);
    } catch (err: any) {
      console.error("Failed to load order tracking:", err);

      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else if (err.response?.status === 404) {
        setError("Order not found.");
      } else {
        setError("Unable to load live tracking. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Load tracking when the page opens
  useEffect(() => {
    loadTracking();
  }, [order?.orderId]);

  // -------------------- CURRENT STATUS --------------------

  const currentStatus =
    tracking?.current_status || order?.status || "pending";

  const currentStep = steps.findIndex(
    (step) => step.status === currentStatus
  );

  const isCancelled = currentStatus === "cancelled";

  // -------------------- DATE FORMAT --------------------

  function formatDate(dateValue: string) {
    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
      return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  // -------------------- NO ORDER --------------------

  if (!order) {
    return (
      <main className="tracking-page">
        <header className="tracking-header">
          <a href="/" className="tracking-brand">
            <span className="tracking-brand-mark">F</span>
            <span>
              Fresh<span>Meat</span>
            </span>
          </a>
        </header>

        <section className="tracking-empty">
          <PackageCheck size={42} />

          <h1>No order to track yet</h1>

          <p>
            Place an order first. Your latest order will appear here.
          </p>

          <button
            onClick={() => {
              window.location.href = "/products";
            }}
          >
            Browse products
          </button>
        </section>
      </main>
    );
  }

  // -------------------- DELIVERY ADDRESS --------------------

  const addressLine = [
    order.address.flatNumber,
    order.address.floor,
    order.address.apartment,
  ]
    .filter(Boolean)
    .join(", ");

  const orderDate = formatDate(order.createdAt);

  // -------------------- MAIN UI --------------------

  return (
    <main className="tracking-page">

      {/* HEADER */}

      <header className="tracking-header">

        <button
          className="tracking-back"
          onClick={() => {
            window.location.href = "/my-orders";
          }}
          aria-label="Back to My Orders"
        >
          <ArrowLeft size={19} />
        </button>

        <a href="/" className="tracking-brand">
          <span className="tracking-brand-mark">F</span>

          <span>
            Fresh<span>Meat</span>
          </span>
        </a>

        <span className="tracking-secure">
          <Truck size={17} />
          Order tracking
        </span>

      </header>

      {/* HERO */}

      <section className="tracking-hero">

        <div className="tracking-hero-icon">
          <Truck size={36} />
        </div>

        <span className="tracking-eyebrow">
          YOUR FRESH ORDER
        </span>

        <h1>
          Track your <span>order</span>
        </h1>

        <p>
          Follow your order's progress from placement to delivery.
        </p>

      </section>

      <div className="tracking-layout">

        {/* LEFT SIDE - ORDER PROGRESS */}

        <section className="tracking-card tracking-progress-card">

          <div className="tracking-order-heading">

            <div>
              <span className="tracking-muted-label">
                ORDER ID
              </span>

              <h2>#{order.orderId}</h2>

              <p>Placed on {orderDate}</p>
            </div>

            <span className="tracking-status-pill">
              <Clock3 size={15} />

              {tracking
                ? tracking.current_status_display
                : order.status}
            </span>

          </div>

          {/* REFRESH BUTTON */}

          <button
            className="tracking-refresh"
            onClick={loadTracking}
            disabled={loading}
          >
            <RefreshCw
              size={15}
              className={loading ? "tracking-spin" : ""}
            />

            {loading ? "Refreshing..." : "Refresh status"}
          </button>

          {/* API ERROR */}

          {error && (
            <div className="tracking-demo-note">
              <p>{error}</p>

              <button onClick={loadTracking}>
                Try again
              </button>
            </div>
          )}

          {/* TRACKING TIMELINE */}

          <div className="tracking-timeline">

            {isCancelled ? (
              <div className="tracking-cancelled">
                <Clock3 size={22} />

                <div>
                  <strong>Order cancelled</strong>

                  <p>
                    This order will not proceed to delivery.
                  </p>
                </div>
              </div>
            ) : (
              steps.map((step, index) => {

                const Icon = step.icon;

                const complete =
                  currentStep >= 0 && index <= currentStep;

                const active = index === currentStep;

                const event = tracking?.history.find(
                  (item) => item.status === step.status
                );

                return (
                  <div
                    className={`tracking-step ${
                      complete ? "complete" : "upcoming"
                    } ${active ? "active" : ""}`}
                    key={step.status}
                  >

                    <div className="tracking-step-marker">
                      <Icon size={19} />
                    </div>

                    {index < steps.length - 1 && (
                      <div className="tracking-step-line" />
                    )}

                    <div className="tracking-step-copy">

                      <strong>{step.title}</strong>

                      <p>
                        {event?.note || step.detail}
                      </p>

                      {event && (
                        <small>
                          {formatDate(event.created_at)}
                        </small>
                      )}

                      {active && (
                        <small>
                          Current status
                        </small>
                      )}

                    </div>

                  </div>
                );
              })
            )}

          </div>

          {loading && !tracking && (
            <p className="tracking-demo-note">
              Loading live order status...
            </p>
          )}

        </section>

        {/* RIGHT SIDE */}

        <aside className="tracking-side">

          {/* DELIVERY ADDRESS */}

          <section className="tracking-card">

            <div className="tracking-card-title">
              <MapPin size={20} />

              <h2>Delivery address</h2>
            </div>

            <strong>
              {order.address.fullName}
            </strong>

            <p>{addressLine}</p>

            {order.address.landmark && (
              <p>
                Landmark: {order.address.landmark}
              </p>
            )}

            <small>
              +91 {order.address.phone}
            </small>

          </section>

          {/* ORDER SUMMARY */}

          <section className="tracking-card">

            <div className="tracking-card-title">
              <ShoppingBag size={20} />

              <h2>Order summary</h2>
            </div>

            <div className="tracking-items">

              {order.items.map((item, index) => (

                <div
                  className="tracking-item"
                  key={`${item.name}-${item.pack}-${index}`}
                >

                  <div>
                    <strong>{item.name}</strong>

                    <small>
                      {item.pack} × {item.quantity}
                    </small>
                  </div>

                  <b>
                    ₹{item.price * item.quantity}
                  </b>

                </div>

              ))}

            </div>

            <div className="tracking-total-row">
              <span>Item total</span>

              <strong>₹{order.subtotal}</strong>
            </div>

            <div className="tracking-total-row">
              <span>Delivery fee</span>

              <strong>
                {order.deliveryFee === 0
                  ? "FREE"
                  : `₹${order.deliveryFee}`}
              </strong>
            </div>

            <div className="tracking-grand-total">
              <span>Total payable</span>

              <strong>₹{order.total}</strong>
            </div>

            <div className="tracking-payment">
              <span>Payment</span>

              <strong>
                {order.paymentMethod === "cod"
                  ? "Cash on Delivery"
                  : order.paymentMethod || "Cash on Delivery"}
              </strong>
            </div>

          </section>

        </aside>

      </div>

      {/* BOTTOM BUTTONS */}

      <div className="tracking-bottom-actions">

        <button
          className="tracking-primary"
          onClick={() => {
            window.location.href = "/products";
          }}
        >
          Continue shopping
        </button>

        <button
          className="tracking-secondary"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          Back to home
        </button>

      </div>

      {/* FOOTER */}

      <footer className="tracking-footer">

        <a href="/" className="tracking-brand">

          <span className="tracking-brand-mark">F</span>

          <span>
            Fresh<span>Meat</span>
          </span>

        </a>

        <span>
          © {new Date().getFullYear()} FreshMeat
        </span>

      </footer>

    </main>
  );
}

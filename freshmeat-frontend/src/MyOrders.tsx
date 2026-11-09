
import { useEffect, useState } from "react";
import { ArrowLeft, Package, RefreshCw } from "lucide-react";
import api from "./api";
import "./MyOrders.css";

type OrderItem = {
  id: number;
  product_name: string;
  pack_size: string;
  unit_price: string;
  quantity: number;
  line_total: string;
};

type CustomerOrder = {
  id: number;
  status: string;
  status_display: string;
  payment_method: string;
  payment_method_display: string;
  payment_status: string;
  total_amount: string;
  apartment_name: string;
  delivery_pincode: string;
  flat_number: string;
  floor: string;
  landmark: string;
  phone: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
};

function MyOrders() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<CustomerOrder[]>("/orders/");
      setOrders(response.data);
    } catch (err: any) {
      console.error("Failed to load orders:", err);

      if (err.response?.status === 401) {
        setError("Your login session has expired. Please log in again.");
      } else {
        setError("Could not load your orders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!localStorage.getItem("freshmeat-access-token")) {
      setError("Please log in to view your orders.");
      setLoading(false);
      return;
    }

    loadOrders();
  }, []);

  function statusClass(status: string) {
    if (status === "delivered") return "order-status delivered";
    if (status === "cancelled") return "order-status cancelled";
    if (status === "pending") return "order-status pending";
    return "order-status processing";
  }

  if (loading) {
    return (
      <main className="my-orders-page">
        <p className="orders-message">Loading your orders...</p>
      </main>
    );
  }

  return (
    <main className="my-orders-page">
      <div className="orders-heading">
        <button
          className="orders-back"
          onClick={() => (window.location.href = "/")}
        >
          <ArrowLeft size={18} /> Back to shopping
        </button>

        <h1>My Orders</h1>
        <p>Track your deliveries and view your order history.</p>
      </div>

      {error && (
        <div className="orders-message" role="alert">
          <p>{error}</p>

          <button
            className="orders-retry"
            onClick={() => {
              if (!localStorage.getItem("freshmeat-access-token")) {
                window.location.href = "/";
              } else {
                loadOrders();
              }
            }}
          >
            {localStorage.getItem("freshmeat-access-token")
              ? "Try again"
              : "Go to login"}
          </button>
        </div>
      )}

      {!error && orders.length === 0 && (
        <div className="orders-empty">
          <Package size={48} />
          <h2>No orders yet</h2>
          <p>Your placed orders will appear here.</p>
          <button onClick={() => (window.location.href = "/products")}>
            Start shopping
          </button>
        </div>
      )}

      {!error && orders.length > 0 && (
        <>
          <div className="orders-toolbar">
            <span>{orders.length} order(s)</span>

            <button
              className="orders-refresh"
              onClick={loadOrders}
              disabled={loading}
            >
              <RefreshCw size={16} /> Refresh status
            </button>
          </div>

          <div className="orders-list">
            {orders.map((order) => (
              <article className="customer-order-card" key={order.id}>
                <div className="customer-order-top">
                  <div>
                    <h2>Order #{order.id}</h2>
                    <p>
                      {new Date(order.created_at).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <span className={statusClass(order.status)}>
                    {order.status_display}
                  </span>
                </div>

                <div className="customer-order-items">
                  {order.items.map((item) => (
                    <div className="customer-order-item" key={item.id}>
                      <div>
                        <strong>{item.product_name}</strong>
                        <p>
                          {item.pack_size} × {item.quantity}
                        </p>
                      </div>

                      <strong>₹{item.line_total}</strong>
                    </div>
                  ))}
                </div>

                <div className="customer-order-summary">
                  <div>
                    <span>Total amount</span>
                    <strong>₹{order.total_amount}</strong>
                  </div>

                  <div>
                    <span>Payment</span>
                    <span>{order.payment_method_display}</span>
                  </div>

                  <div>
                    <span>Payment status</span>
                    <span>{order.payment_status}</span>
                  </div>
                </div>

                <div className="customer-order-address">
                  <strong>Delivery address</strong>
                  <p>
                    {order.flat_number}, {order.apartment_name}
                    {order.floor ? `, Floor ${order.floor}` : ""}
                  </p>
                  <p>
                    PIN: {order.delivery_pincode} · Phone: {order.phone}
                  </p>
                  {order.landmark && <p>Landmark: {order.landmark}</p>}
                </div>
                <button
  className="track-order-button"
  onClick={() => {
    window.location.href = `/order-tracking/${order.id}`;
  }}
>
  <Package size={17} />
  Track Order
</button>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

export default MyOrders;

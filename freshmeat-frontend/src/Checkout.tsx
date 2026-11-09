
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import "./Checkout.css";
import api from "./api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type CartItem = {
  productId: number;
  name: string;
  pack: string;
  packId: number;
  quantity: number;
  price: number;
};

type DeliveryDetails = {
  fullName: string;
  phone: string;
  apartment: string;
  apartmentId: number | null;
  apartmentPincode: string;
  flatNumber: string;
  floor?: string;
  landmark?: string;
};

type CheckoutResponse = {
  order_id: number;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal_amount: string;
  discount_amount: string;
  coupon_code?: string;
  total_amount: string;
  delivery_fee: string;
  created_at: string;
};

type RazorpayOrderResponse = {
  key: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_id: number;
};

const DELIVERY_FEE = 30;
const FREE_DELIVERY_AT = 499;
const PENDING_ONLINE_CHECKOUT_KEY = "freshmeat-pending-online-checkout";

function readJson<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function Checkout() {
  const [items, setItems] = useState<CartItem[]>(() =>
    readJson<CartItem[]>("freshmeat-cart", [])
  );

  const [address, setAddress] = useState<DeliveryDetails | null>(() =>
    readJson<DeliveryDetails | null>("freshmeat-delivery-address", null)
  );

  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    subtotalAtApplication: number;
  } | null>(null);

  useEffect(() => {
    window.localStorage.setItem("freshmeat-cart", JSON.stringify(items));
  }, [items]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ),
    [items]
  );

  const deliveryFee =
    subtotal === 0 || subtotal >= FREE_DELIVERY_AT
      ? 0
      : DELIVERY_FEE;

  const couponDiscount =
    appliedCoupon &&
    appliedCoupon.subtotalAtApplication === subtotal
      ? Math.min(appliedCoupon.discountAmount, subtotal)
      : 0;

  const total = Math.max(0, subtotal - couponDiscount) + deliveryFee;

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    setCouponError("");

    if (!code) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    if (subtotal <= 0) {
      setCouponError("Add products to your cart before applying a coupon.");
      return;
    }

    setCouponLoading(true);

    try {
      const response = await api.post("/coupons/validate/", {
        code,
        subtotal: subtotal.toFixed(2),
      });

      const data = response.data ?? {};

      const rawDiscount =
        data.discount_amount ??
        data.discount ??
        data.discount_value_applied;

      const discountAmount = Number(rawDiscount);

      const isValid =
        data.is_valid ??
        data.valid ??
        data.success ??
        Number.isFinite(discountAmount);

      if (
        !isValid ||
        !Number.isFinite(discountAmount) ||
        discountAmount <= 0
      ) {
        setAppliedCoupon(null);
        setCouponError(
          data.message ||
            data.detail ||
            "This coupon is invalid or does not apply to your order."
        );
        return;
      }

      setAppliedCoupon({
        code,
        discountAmount: Math.min(discountAmount, subtotal),
        subtotalAtApplication: subtotal,
      });

      setCouponInput(code);
      setCouponError("");
    } catch (err: any) {
      const data = err?.response?.data;

      const message =
        data?.message ||
        data?.detail ||
        (Array.isArray(data?.code) ? data.code[0] : data?.code) ||
        (Array.isArray(data?.non_field_errors)
          ? data.non_field_errors[0]
          : "");

      setAppliedCoupon(null);

      setCouponError(
        typeof message === "string" && message
          ? message
          : "Could not validate this coupon. Please check the code and try again."
      );
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  }

  function changeQuantity(index: number, change: number) {
    setItems((current) =>
      current.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(20, item.quantity + change)
              ),
            }
          : item
      )
    );
  }

  function saveSuccessfulOrder(
    checkoutData: CheckoutResponse,
    verifiedPayment?: any
  ) {
    const order = {
      orderId: checkoutData.order_id,
      items,
      address,
      paymentMethod,
      instructions: instructions.trim(),
      subtotal: Number(checkoutData.subtotal_amount ?? subtotal),
      discount: Number(checkoutData.discount_amount ?? couponDiscount),
      couponCode: checkoutData.coupon_code ?? appliedCoupon?.code ?? "",
      deliveryFee: Number(checkoutData.delivery_fee ?? deliveryFee),
      total: Number(checkoutData.total_amount ?? total),
      status: checkoutData.status,
      paymentStatus:
        verifiedPayment?.payment_status ??
        checkoutData.payment_status,
      createdAt: checkoutData.created_at,
    };

    window.localStorage.setItem(
      "freshmeat-last-order",
      JSON.stringify(order)
    );

    window.localStorage.removeItem(PENDING_ONLINE_CHECKOUT_KEY);

    const previousOrders = readJson<Record<string, unknown>[]>(
      "freshmeat-orders",
      []
    );

    window.localStorage.setItem(
      "freshmeat-orders",
      JSON.stringify([order, ...previousOrders])
    );

    window.localStorage.setItem("freshmeat-cart", JSON.stringify([]));
    setItems([]);

    window.location.href = "/order-confirmation";
  }

  function getErrorMessage(err: any, fallback: string) {
    const data = err?.response?.data;

    if (err?.response?.status === 401) {
      return "Please log in again before placing your order.";
    }

    if (data && typeof data === "object") {
      return (
        data.error ||
        data.message ||
        data.detail ||
        (Array.isArray(data.non_field_errors)
          ? data.non_field_errors[0]
          : "") ||
        Object.values(data).flat(Infinity).find(
          (value) => typeof value === "string"
        ) ||
        fallback
      );
    }

    return fallback;
  }

  async function startOnlinePayment(checkoutData: CheckoutResponse) {
    const scriptLoaded = await loadRazorpayScript();

    if (!scriptLoaded) {
      setError(
        "Could not load the payment service. Please check your internet connection and try again."
      );
      setPlacing(false);
      return;
    }

    // Ask Django to create or retrieve the Razorpay order.
    const response = await api.post<RazorpayOrderResponse>(
      "/payments/create-order/",
      {
        order_id: checkoutData.order_id,
      }
    );

    const paymentOrder = response.data;

    if (
      !paymentOrder.key ||
      !paymentOrder.razorpay_order_id ||
      !paymentOrder.amount
    ) {
      throw new Error("Invalid payment details received from the server.");
    }

    const options = {
      key: paymentOrder.key,
      amount: paymentOrder.amount,
      currency: paymentOrder.currency,
      name: "FreshMeat",
      description: "FreshMeat Order Payment",
      order_id: paymentOrder.razorpay_order_id,

      prefill: {
        name: address?.fullName || "",
        contact: address?.phone || "",
      },

      notes: {
        order_id: String(checkoutData.order_id),
      },

      theme: {
        color: "#198754",
      },

      handler: async function (razorpayResponse: any) {
        try {
          setError("");

          // Send payment details to Django.
          const verifyResponse = await api.post(
            "/payments/verify/",
            {
              order_id: checkoutData.order_id,
              razorpay_payment_id:
                razorpayResponse.razorpay_payment_id,
              razorpay_order_id:
                razorpayResponse.razorpay_order_id,
              razorpay_signature:
                razorpayResponse.razorpay_signature,
            }
          );

          // Only a confirmed "paid" response means success.
          if (verifyResponse.data.payment_status === "paid") {
            saveSuccessfulOrder(
              checkoutData,
              verifyResponse.data
            );
            return;
          }

          // A captured payment awaiting refund is NOT a successful order.
          setError(
            verifyResponse.data.message ||
              "Payment was received, but your order is not confirmed. Please contact support."
          );
        } catch (err: any) {
          const message = getErrorMessage(
            err,
            "Payment verification could not be completed. Please contact support before trying to pay again."
          );

          setError(
            `${message} Do not make another payment until your payment status is checked.`
          );
        } finally {
          setPlacing(false);
        }
      },

      modal: {
        ondismiss: function () {
          setPlacing(false);
          setError(
            "Payment window closed. Your cart is still saved. You can try again."
          );
        },
      },
    };

    const razorpay = new window.Razorpay(options);

    razorpay.on("payment.failed", function (response: any) {
      setPlacing(false);

      setError(
        response?.error?.description ||
          "Payment failed. Your cart is still saved. Please try again."
      );
    });

    razorpay.open();
  }

  async function placeOrder() {
    setError("");

    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    if (
      !address?.fullName ||
      !address?.phone ||
      !address?.apartment ||
      !address?.flatNumber
    ) {
      setError("Please save your delivery address first.");
      return;
    }

    if (!address.apartmentId) {
      setError(
        "This apartment is not connected to the approved delivery list yet. Please select a configured apartment."
      );
      return;
    }

    if (
      items.some(
        (item) =>
          !Number.isInteger(item.productId) ||
          item.productId <= 0
      )
    ) {
      setError(
        "A cart item is missing its product ID. Remove it and add the product again from the Products page."
      );
      return;
    }

    setPlacing(true);

    try {
      const checkoutPayload = {
        apartment_id: address.apartmentId,
        payment_method: paymentMethod,
        delivery_pincode: address.apartmentPincode,
        flat_number: address.flatNumber,
        floor: address.floor || "",
        landmark: address.landmark || "",
        phone: address.phone,

        items: items.map((item) => ({
          product_id: item.productId,
          pack_id: item.packId,
          quantity: item.quantity,
        })),

        coupon_code:
          appliedCoupon &&
          appliedCoupon.subtotalAtApplication === subtotal
            ? appliedCoupon.code
            : "",
      };

      let checkoutData: CheckoutResponse;

      if (paymentMethod === "online") {
        // Reuse the same pending Django order when the cart and delivery
        // details have not changed since the previous payment attempt.
        const savedDraft = readJson<{
          payload: typeof checkoutPayload;
          checkoutData: CheckoutResponse;
        } | null>(PENDING_ONLINE_CHECKOUT_KEY, null);

        const canReuseDraft = Boolean(
          savedDraft &&
            JSON.stringify(savedDraft.payload) ===
              JSON.stringify(checkoutPayload) &&
            savedDraft.checkoutData?.order_id
        );

        if (savedDraft && canReuseDraft) {
          checkoutData = savedDraft.checkoutData;
        } else {
          const response = await api.post<CheckoutResponse>(
            "/checkout/",
            checkoutPayload
          );
          checkoutData = response.data;

          // Save the pending order before opening Razorpay so a cancelled
          // payment or page refresh can reuse this same order.
          window.localStorage.setItem(
            PENDING_ONLINE_CHECKOUT_KEY,
            JSON.stringify({
              payload: checkoutPayload,
              checkoutData,
            })
          );
        }

        // Continue to Razorpay. Do not clear the cart here.
        await startOnlinePayment(checkoutData);
        return;
      }

      // COD orders are created normally and do not use the online draft.
      const response = await api.post<CheckoutResponse>(
        "/checkout/",
        checkoutPayload
      );
      checkoutData = response.data;

      // COD order: Django has created the order successfully.
      saveSuccessfulOrder(checkoutData);
    } catch (err: any) {
      setError(
        getErrorMessage(
          err,
          "Could not place your order. Check your delivery address and products."
        )
      );
      setPlacing(false);
    }
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <button
          className="checkout-back"
          onClick={() => {
            window.location.href = "/?openCart=1";
          }}
          aria-label="Back to cart"
        >
          <ArrowLeft size={19} />
        </button>

        <a href="/" className="checkout-brand">
          <span className="checkout-brand-mark">F</span>
          <span>
            Fresh<span>Meat</span>
          </span>
        </a>

        <div className="checkout-secure">
          <ShieldCheck size={17} /> Secure checkout
        </div>
      </header>

      <section className="checkout-hero">
        <div>
          <span className="checkout-eyebrow">ALMOST THERE</span>
          <h1>
            Checkout <span>your order</span>
          </h1>
          <p>
            Review your items and delivery details before placing your order.
          </p>
        </div>

        <div className="checkout-hero-icon">
          <ShoppingBag size={38} />
        </div>
      </section>

      <div className="checkout-layout">
        <div className="checkout-main">
          <section className="checkout-card">
            <div className="checkout-section-heading">
              <span className="checkout-step">1</span>
              <div>
                <h2>Delivery address</h2>
                <p>Where should we deliver your order?</p>
              </div>
            </div>

            {address ? (
              <div className="checkout-address-box">
                <MapPin size={21} />
                <div>
                  <strong>{address.fullName}</strong>
                  <p>
                    {address.flatNumber}
                    {address.floor ? `, ${address.floor}` : ""},{" "}
                    {address.apartment}
                  </p>
                  {address.landmark && (
                    <p>Landmark: {address.landmark}</p>
                  )}
                  <small>+91 {address.phone}</small>
                </div>
                <button
                  onClick={() => {
                    window.location.href = "/address";
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="checkout-address-missing">
                <MapPin size={22} />
                <div>
                  <strong>No saved delivery address</strong>
                  <p>Add and save your address to continue.</p>
                  <button
                    onClick={() => {
                      window.location.href = "/address";
                    }}
                  >
                    Add delivery address
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="checkout-card">
            <div className="checkout-section-heading">
              <span className="checkout-step">2</span>
              <div>
                <h2>Order items</h2>
                <p>
                  {items.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )}{" "}
                  item(s) in your cart
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="checkout-empty">
                <ShoppingBag size={35} />
                <strong>Your cart is empty</strong>
                <p>Add some fresh products before checkout.</p>
                <button
                  onClick={() => {
                    window.location.href = "/products";
                  }}
                >
                  Browse products
                </button>
              </div>
            ) : (
              <div className="checkout-items">
                {items.map((item, index) => (
                  <article
                    className="checkout-item"
                    key={`${item.name}-${item.pack}-${index}`}
                  >
                    <div className="checkout-product-icon">
                      <ShoppingBag size={21} />
                    </div>

                    <div className="checkout-item-info">
                      <strong>{item.name}</strong>
                      <span>{item.pack}</span>
                      <b>
                        ₹{item.price} <small>/ pack</small>
                      </b>
                    </div>

                    <div className="checkout-quantity">
                      <button
                        onClick={() => changeQuantity(index, -1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        onClick={() => changeQuantity(index, 1)}
                        disabled={item.quantity >= 20}
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <strong className="checkout-line-total">
                      ₹{item.price * item.quantity}
                    </strong>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="checkout-card">
            <div className="checkout-section-heading">
              <span className="checkout-step">3</span>
              <div>
                <h2>Payment method</h2>
                <p>Choose how you would like to pay.</p>
              </div>
            </div>

            <label
              className={`checkout-payment-option ${
                paymentMethod === "cod" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => setPaymentMethod("cod")}
                disabled={placing}
              />

              <span className="checkout-payment-symbol">₹</span>

              <span>
                <strong>Cash on Delivery</strong>
                <small>Pay when your order arrives</small>
              </span>

              {paymentMethod === "cod" && <CheckCircle2 size={19} />}
            </label>

            <label
              className={`checkout-payment-option ${
                paymentMethod === "online" ? "selected" : ""
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="online"
                checked={paymentMethod === "online"}
                onChange={() => setPaymentMethod("online")}
                disabled={placing}
              />

              <span className="checkout-payment-symbol">↗</span>

              <span>
                <strong>Online payment</strong>
                <small>Pay using UPI, cards, or net banking</small>
              </span>

              {paymentMethod === "online" && (
                <CheckCircle2 size={19} />
              )}
            </label>

            <label className="checkout-instructions">
              <span>Delivery instructions (optional)</span>
              <textarea
                value={instructions}
                onChange={(event) =>
                  setInstructions(event.target.value)
                }
                placeholder="Anything the delivery partner should know?"
                rows={3}
                maxLength={250}
              />
            </label>
          </section>
        </div>

        <aside className="checkout-summary-card">
          <h2>Bill details</h2>

          <div className="checkout-summary-row">
            <span>Item total</span>
            <strong>₹{subtotal.toFixed(2)}</strong>
          </div>

          <div className="checkout-summary-row">
            <span>Delivery fee</span>
            <strong>
              {deliveryFee === 0 ? (
                <span className="checkout-free">FREE</span>
              ) : (
                `₹${deliveryFee}`
              )}
            </strong>
          </div>

          {subtotal > 0 && subtotal < FREE_DELIVERY_AT && (
            <p className="checkout-delivery-tip">
              Add ₹{FREE_DELIVERY_AT - subtotal} more for free delivery.
            </p>
          )}

          <section className="checkout-coupon-box">
            <label htmlFor="checkout-coupon-code">
              Have a coupon code?
            </label>

            <div className="checkout-coupon-controls">
              <input
                id="checkout-coupon-code"
                type="text"
                value={couponInput}
                onChange={(event) => {
                  setCouponInput(event.target.value.toUpperCase());
                  setCouponError("");
                  if (appliedCoupon) setAppliedCoupon(null);
                }}
                placeholder="Enter coupon code"
                maxLength={50}
                autoComplete="off"
                disabled={couponLoading || placing}
              />

              {appliedCoupon &&
              appliedCoupon.subtotalAtApplication === subtotal ? (
                <button
                  type="button"
                  onClick={removeCoupon}
                  disabled={couponLoading || placing}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={applyCoupon}
                  disabled={
                    couponLoading ||
                    placing ||
                    !couponInput.trim()
                  }
                >
                  {couponLoading ? "Checking…" : "Apply"}
                </button>
              )}
            </div>

            {appliedCoupon &&
              appliedCoupon.subtotalAtApplication === subtotal && (
                <p className="checkout-coupon-success" role="status">
                  <CheckCircle2 size={15} /> {appliedCoupon.code} applied
                  — you save ₹{couponDiscount.toFixed(2)}
                </p>
              )}

            {couponError && (
              <p className="checkout-coupon-error" role="alert">
                {couponError}
              </p>
            )}

            {appliedCoupon &&
              appliedCoupon.subtotalAtApplication !== subtotal && (
                <p className="checkout-coupon-error" role="status">
                  Your cart changed. Please apply the coupon again.
                </p>
              )}
          </section>

          {couponDiscount > 0 && (
            <div className="checkout-summary-row checkout-discount-row">
              <span>Coupon discount</span>
              <strong>−₹{couponDiscount.toFixed(2)}</strong>
            </div>
          )}

          <div className="checkout-summary-total">
            <span>To pay</span>
            <strong>₹{total.toFixed(2)}</strong>
          </div>

          <div className="checkout-cod-note">
            <Truck size={18} />
            <span>
              {paymentMethod === "cod"
                ? "Pay when your order is delivered."
                : "You will be redirected to secure online payment."}
            </span>
          </div>

          {error && (
            <p className="checkout-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="checkout-place-order"
            onClick={placeOrder}
            disabled={placing || items.length === 0}
          >
            {placing
              ? paymentMethod === "online"
                ? "Opening payment…"
                : "Placing order…"
              : paymentMethod === "online"
                ? "Pay now"
                : "Place order"}
            <span>→</span>
          </button>

          <p className="checkout-terms">
            By placing your order, you agree to our terms and delivery policy.
          </p>

          <button
            className="checkout-back-to-cart"
            onClick={() => {
              window.location.href = "/?openCart=1";
            }}
          >
            Back to cart
          </button>
        </aside>
      </div>

      <footer className="checkout-footer">
        <a href="/" className="checkout-brand">
          <span className="checkout-brand-mark">F</span>
          <span>
            Fresh<span>Meat</span>
          </span>
        </a>

        <span>© {new Date().getFullYear()} FreshMeat</span>
      </footer>
    </main>
  );
}

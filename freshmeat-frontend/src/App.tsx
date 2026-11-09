import { useEffect, useState } from "react";

import Login from "./Login";

import Address from "./Address";

import Products from "./Products";

import Checkout from "./Checkout";

import OrderConfirmation from "./OrderConfirmation";

import OrderTracking from "./OrderTracking";

import Admin from "./Admin";

import MyOrders from "./MyOrders";
import TermsAndConditions from "./TermsAndConditions";

import api from "./api";

import {

  MapPin,

  Search,

  Layers,

  UserRound,

  ShoppingCart,

  ChevronDown,

  ChevronLeft,

  ChevronRight,

  Plus,

  ArrowRight,

  Star,

  Mail,

  Phone,

  Clock,

  Tag,

  Menu,

  X,

  CheckCircle2,

  Package,

} from "lucide-react";

import "./App.css";

type HomeBanner = {

  id: number;

  eyebrow: string;

  title: string;

  description: string;

  button: string;

  image: string;

  background: string;

};

const fallbackSlides: HomeBanner[] = [

  {

    eyebrow: "FRESHNESS YOU CAN TASTE",

    title: "Fresh cuts.\nDelivered fresh.",

    description: "Quality chicken, carefully selected for your everyday meals.",

    button: "Shop chicken",

    image:

      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1600&q=85",

    background: "slide-purple",

  },

  {

    eyebrow: "GOOD FOOD STARTS HERE",

    title: "Make every\nmeal special.",

    description: "Find your favourite cuts, ready for your kitchen.",

    button: "Explore products",

    image:

      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=1600&q=85",

    background: "slide-peach",

  },

  {

    eyebrow: "YOUR KITCHEN, YOUR WAY",

    title: "Fresh choices.\nEvery day.",

    description: "Choose your cuts and pack sizes in just a few clicks.",

    button: "Order today",

    image:

      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1600&q=85",

    background: "slide-green",

  },

];

type HomePack = {

  id: number;

  label: string;

  price: number;

  originalPrice?: number;

};

type HomeProduct = {

  id: number;

  name: string;

  weight: string;

  price: number;

  oldPrice: number;

  image: string;

  tag: string;

  packs: HomePack[];

};

type ApiHomeProduct = {

  id: number;

  name: string;

  description: string;

  category_name: string;

  image: string | null;

  pack_size: string;

  price: string;

  original_price: string | null;

  is_active: boolean;

  packs?: {

    id: number;

    pack_size: string;

    price: string;

    original_price: string | null;

  }[];

};

type ApprovedApartment = {

  id: number;

  name: string;

  area: string;

  full_address: string;

  pincode: string;

  latitude: string | null;

  longitude: string | null;

};

const FALLBACK_PRODUCT_IMAGE =

  "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=700&q=85";

const categories = [

  "Curry Cut Pieces",

  "Chicken Boneless – Mini Bites",

  "Drumsticks",

  "Country Chicken with Skin",

  "Chicken Breast Boneless",

  "Chicken Mince (Keema)",

  "Chicken Leg with Thigh",

  "Chicken Liver",

];

type ApiHomeCoupon = {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string | number;
  minimum_order_amount?: string | number;
  expires_at?: string | null;
  is_active: boolean;
};

type HomeCoupon = {
  id: number;
  code: string;
  title: string;
  description: string;
  detail: string;
  color: string;
};

const couponColors = ["coupon-lilac", "coupon-peach", "coupon-green"];

const HOMEPAGE_REVIEW_COUNT = 178;

type HomeReview = {

  id: number;

  name: string;

  initials: string;

  text: string;

  rating: number;

  meta: string;

};

function App() {

  const [products, setProducts] = useState<HomeProduct[]>([]);

  const [productLoadError, setProductLoadError] = useState("");

  const [reviews, setReviews] = useState<HomeReview[]>([]);

  const [slideIndex, setSlideIndex] = useState(0);

  const [slides, setSlides] = useState<HomeBanner[]>(fallbackSlides);

  const [search, setSearch] = useState("");

  const [locationOpen, setLocationOpen] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState(() => {

    try {

      const saved = window.localStorage.getItem("freshca-selected-apartment");

      if (!saved) return "";

      const parsed = JSON.parse(saved) as { name?: string };

      return parsed.name ?? "";

    } catch {

      return "";

    }

  });

  const [locationSearch, setLocationSearch] = useState("");

  const [apartments, setApartments] = useState<ApprovedApartment[]>([]);

  const [apartmentsLoading, setApartmentsLoading] = useState(false);

  const [apartmentsError, setApartmentsError] = useState("");

type SharedCartItem = {

  productId: number;

  packId: number;

  name: string;

  pack: string;

  quantity: number;

  price: number;

};

  const [cartItems, setCartItems] = useState<SharedCartItem[]>(() => {

    try {

      const saved = window.localStorage.getItem("freshmeat-cart");

      return saved ? (JSON.parse(saved) as SharedCartItem[]) : [];

    } catch {

      return [];

    }

  });

  const [cartCount, setCartCount] = useState(() => {

    try {

      const saved = window.localStorage.getItem("freshmeat-cart");

      const items = saved ? (JSON.parse(saved) as SharedCartItem[]) : [];

      return items.reduce((total, item) => total + item.quantity, 0);

    } catch {

      return 0;

    }

  });

  const [activeProduct, setActiveProduct] = useState<HomeProduct | null>(null);

  const [selectedPackIndex, setSelectedPackIndex] = useState(0);

  const [packQuantity, setPackQuantity] = useState(1);

  const [cartNotice, setCartNotice] = useState("");

  const [cartOpen, setCartOpen] = useState(false);

  const [loginOpen, setLoginOpen] = useState(false);

  const [signedInUser, setSignedInUser] = useState(() => {

  return localStorage.getItem("freshmeat-user") || "";

});

  const [copiedCoupon, setCopiedCoupon] = useState("");
  const [coupons, setCoupons] = useState<HomeCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load active coupons created by the admin from Django.
  useEffect(() => {
    let cancelled = false;

    async function loadPublicCoupons() {
      setCouponsLoading(true);
      setCouponsError("");

      try {
        const response = await api.get<any>("/coupons/");
        const data = response.data;
        const couponList: ApiHomeCoupon[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const mapped: HomeCoupon[] = couponList
          .filter((coupon) => {
            if (!coupon.is_active) return false;
            if (!coupon.expires_at) return true;
            const expiry = new Date(`${coupon.expires_at}T00:00:00`);
            return !Number.isNaN(expiry.getTime()) && expiry >= today;
          })
          .map((coupon, index) => {
            const value = Number(coupon.discount_value);
            const minimum = Number(coupon.minimum_order_amount ?? 0);
            const isPercentage = coupon.discount_type === "percentage";
            const title = isPercentage
              ? `${value}% OFF`
              : `₹${value.toLocaleString("en-IN")} OFF`;
            const description = minimum > 0
              ? `On orders above ₹${minimum.toLocaleString("en-IN")}`
              : "Use this coupon at checkout";
            const detail = coupon.expires_at
              ? `Valid until ${new Date(`${coupon.expires_at}T00:00:00`).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : "A little extra savings on your order";

            return {
              id: coupon.id,
              code: coupon.code,
              title,
              description,
              detail,
              color: couponColors[index % couponColors.length],
            };
          });

        if (!cancelled) setCoupons(mapped);
      } catch (error) {
        console.error("Failed to load homepage coupons:", error);
        if (!cancelled) {
          setCoupons([]);
          setCouponsError("Offers are temporarily unavailable. Please try again later.");
        }
      } finally {
        if (!cancelled) setCouponsLoading(false);
      }
    }

    loadPublicCoupons();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {

    let cancelled = false;

    async function loadProducts() {

      try {

        const response = await api.get<ApiHomeProduct[]>("/products/");

        const mapped: HomeProduct[] = response.data

          .filter((item) => item.is_active)

          .map((item) => {

            const configuredPacks: HomePack[] = (item.packs ?? []).map((pack) => ({

              id: pack.id,

              label: pack.pack_size,

              price: Number(pack.price),

              ...(pack.original_price !== null

                ? { originalPrice: Number(pack.original_price) }

                : {}),

            }));

            // Use legacy product-level price only when no pack records exist yet.

            const packs = configuredPacks.length

              ? configuredPacks

              : [{

                  id: 0,

                  label: item.pack_size,

                  price: Number(item.price),

                  ...(item.original_price !== null

                    ? { originalPrice: Number(item.original_price) }

                    : {}),

                }];

            const firstPack = packs[0];

            return {

              id: item.id,

              name: item.name,

              weight: firstPack?.label ?? item.pack_size,

              price: firstPack?.price ?? Number(item.price),

              oldPrice: firstPack?.originalPrice ?? firstPack?.price ?? Number(item.price),

              image: item.image

                ? item.image.startsWith("http")

                  ? item.image

                  : `http://127.0.0.1:8000${item.image}`

                : FALLBACK_PRODUCT_IMAGE,

              tag: "Fresh pick",

              packs,

            };

          });

        if (!cancelled) {

          setProducts(mapped);

          setProductLoadError("");

        }

      } catch (error) {

        console.error("Failed to load FRESHCA products:", error);

        if (!cancelled) {

          setProductLoadError("Products could not be loaded. Please check the Django server.");

        }

      }

    }

    loadProducts();

    return () => {

      cancelled = true;

    };

  }, []);

  // Load only reviews approved by the admin from Django.

  // The public endpoint should return approved reviews only.

  useEffect(() => {

    let cancelled = false;

    async function loadApprovedReviews() {

      try {

        const response = await api.get<any>("/reviews/");

        const data = response.data;

        const reviewList = Array.isArray(data)

          ? data

          : Array.isArray(data?.results)

            ? data.results

            : [];

        const approvedReviews: HomeReview[] = reviewList

          .map((review: any) => {

            const customerName =

              review.customer_name ||

              review.customer?.name ||

              review.customer?.username ||

              "Customer";

            const initials = customerName

              .trim()

              .split(/\s+/)

              .slice(0, 2)

              .map((part: string) => part.charAt(0).toUpperCase())

              .join("") || "CU";

            const createdAt = review.created_at

              ? new Date(review.created_at).toLocaleDateString("en-IN", {

                  day: "numeric",

                  month: "short",

                  year: "numeric",

                })

              : "";

            return {

              id: review.id,

              name: customerName,

              initials,

              text: review.comment || review.text || "",

              rating: Math.max(1, Math.min(5, Number(review.rating) || 5)),

              meta: review.product_name || review.product?.name || createdAt || "Verified customer",

            };

          })

          .filter((review: HomeReview) => review.text.trim().length > 0);

        if (!cancelled) {

          setReviews(approvedReviews);

        }

      } catch (error) {

        console.error("Failed to load approved customer reviews:", error);

        // Do not show sample/demo reviews if the API is unavailable.

        if (!cancelled) setReviews([]);

      }

    }

    loadApprovedReviews();

    return () => {

      cancelled = true;

    };

  }, []);

  // Load published homepage banners from Django. The fallback slides are used

  // only while the API is unavailable; an empty successful response hides the hero.

  useEffect(() => {

    let cancelled = false;

    async function loadBanners() {

      try {

        const response = await api.get<any>("/banners/");

        const data = response.data;

        const bannerList = Array.isArray(data)

          ? data

          : Array.isArray(data?.results)

            ? data.results

            : [];

        const backgroundClasses = ["slide-purple", "slide-peach", "slide-green"];

        const fallbackImages = fallbackSlides.map((slide) => slide.image);

        const mapped: HomeBanner[] = bannerList.map((banner: any, index: number) => {

          const rawImage = banner.image_url || banner.image || "";

          const image = rawImage

            ? rawImage.startsWith("http")

              ? rawImage

              : `http://127.0.0.1:8000${rawImage.startsWith("/") ? "" : "/"}${rawImage}`

            : fallbackImages[index % fallbackImages.length];

          return {

            id: banner.id,

            eyebrow: "FRESHCA SPECIALS",

            title: banner.title || "Fresh choices for your kitchen.",

            description: banner.subtitle || "",

            button: banner.button_text || "Shop chicken",

            image,

            background: backgroundClasses[index % backgroundClasses.length],

          };

        });

        if (!cancelled) {

          setSlides(mapped);

          setSlideIndex(0);

        }

      } catch (error) {

        console.error("Failed to load homepage banners:", error);

        // Keep the existing design slides as a graceful fallback if Django is unavailable.

      }

    }

    loadBanners();

    return () => {

      cancelled = true;

    };

  }, []);

  useEffect(() => {

    let cancelled = false;

    async function loadApartments() {

      setApartmentsLoading(true);

      setApartmentsError("");

      try {

        const response = await api.get<ApprovedApartment[]>("/apartments/");

        if (!cancelled) {

          setApartments(response.data);

        }

      } catch (error) {

        console.error("Failed to load approved apartments:", error);

        if (!cancelled) {

          setApartments([]);

          setApartmentsError("Delivery locations could not be loaded. Please check the Django server.");

        }

      } finally {

        if (!cancelled) {

          setApartmentsLoading(false);

        }

      }

    }

    loadApartments();

    return () => {

      cancelled = true;

    };

  }, []);

  useEffect(() => {

    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {

      setSlideIndex((current) => (current + 1) % slides.length);

    }, 5000);

    return () => window.clearInterval(timer);

  }, [slides.length]);

  useEffect(() => {

    window.localStorage.setItem("freshmeat-cart", JSON.stringify(cartItems));

    setCartCount(cartItems.reduce((total, item) => total + item.quantity, 0));

  }, [cartItems]);

  useEffect(() => {

    const params = new URLSearchParams(window.location.search);

    if (params.get("openCart") === "1") {

      setCartOpen(true);

      window.history.replaceState({}, "", window.location.pathname);

    }

  }, []);

  const filteredApartments = apartments.filter((apartment) => {

    const query = locationSearch.trim().toLowerCase();

    if (!query) return true;

    return (

      apartment.name.toLowerCase().includes(query) ||

      apartment.pincode.includes(query) ||

      apartment.area.toLowerCase().includes(query)

    );

  });

  const currentSlide = slides.length > 0 ? slides[slideIndex % slides.length] : null;

  const visibleProducts = products.filter((product) =>

    product.name.toLowerCase().includes(search.trim().toLowerCase())

  );

  const copyCoupon = async (code: string) => {

    try {

      await navigator.clipboard.writeText(code);

      setCopiedCoupon(code);

      window.setTimeout(() => setCopiedCoupon(""), 2000);

    } catch {

      setCopiedCoupon("");

      window.prompt("Copy this coupon code:", code);

    }

  };

  if (window.location.pathname === "/terms-and-conditions") {
    return <TermsAndConditions />;
  }

  if (window.location.pathname === "/address") {

    return <Address />;

  }

    if (window.location.pathname === "/admin") {

  return <Admin />;

  }

  if (window.location.pathname === "/checkout") {

    return <Checkout />;

  }

  if (window.location.pathname === "/order-confirmation") {

    return <OrderConfirmation />;

  }

  if (window.location.pathname === "/track-order") {

    return <OrderTracking />;

  }

  if (window.location.pathname === "/my-orders") {

  return <MyOrders />;

}

if (window.location.pathname.startsWith("/order-tracking/")) {

  return <OrderTracking />;

}

  if (window.location.pathname === "/products") {

    return (

      <Products

        sharedCartCount={cartItems.reduce((total, item) => total + item.quantity, 0)}

        onBack={() => { window.location.href = "/"; }}

        onCartClick={() => { window.location.href = "/?openCart=1"; }}

        onAddToCart={(item) => {

const newItem: SharedCartItem = {

  productId: item.product.id,

  packId: item.pack.id,

  name: item.product.name,

  pack: item.pack.weight,

  quantity: item.quantity,

  price: item.pack.price,

};

          setCartItems((current) => {

            const existingIndex = current.findIndex(

              (row) => row.name === newItem.name && row.pack === newItem.pack

            );

            if (existingIndex >= 0) {

              return current.map((row, index) =>

                index === existingIndex

                  ? { ...row, quantity: Math.min(20, row.quantity + newItem.quantity) }

                  : row

              );

            }

            return [...current, newItem];

          });

        }}

      />

    );

  }

  return (

    <div className="app">

    <div className="announcement-bar">

       <span>Fresh picks for your kitchen, every day.</span>

        <span className="announcement-right">

          <Phone size={13} /> Customer care: add client phone number

        </span>

      </div>

      <header className="header">

        <a className="brand brand-logo" href="#home" aria-label="Freshca home">

          <span className="brand-name">FRESHCA</span>

        </a>

        <button

          className="location-button"

          onClick={() => { setLocationSearch(""); setLocationOpen(true); }}

          aria-label="Select delivery location"

        >

          <MapPin size={21} />

          <span>

            <small>DELIVER TO</small>

            <strong>{selectedLocation || "Select apartment"}</strong>

          </span>

          <ChevronDown size={15} />

        </button>

        <label className="search-box">

          <Search size={19} />

          <input

            value={search}

            onChange={(event) => {

              setSearch(event.target.value);

              document

                .getElementById("products")

                ?.scrollIntoView({ behavior: "smooth", block: "start" });

            }}

            placeholder="Search chicken products..."

            aria-label="Search chicken products"

          />

          {search && (

            <button

              className="clear-search"

              onClick={() => setSearch("")}

              aria-label="Clear search"

            >

              <X size={15} />

            </button>

          )}

        </label>

        <nav className={`header-nav ${mobileMenuOpen ? "nav-open" : ""}`}>

          <div className="category-wrap">

            <button

              className={`header-action ${categoriesOpen ? "active" : ""}`}

              onClick={() => setCategoriesOpen((open) => !open)}

            >

              <Layers size={19} />

              <span>Categories</span>

              <ChevronDown size={14} />

            </button>

            {categoriesOpen && (

              <div className="category-dropdown">

                <h3>Shop Chicken</h3>

                {categories.map((category) => (

                  <button

                    key={category}

                    onClick={() => {

                      setSearch(category.split(" – ")[0]);

                      setCategoriesOpen(false);

                      setMobileMenuOpen(false);

                      document

                        .getElementById("products")

                        ?.scrollIntoView({ behavior: "smooth" });

                    }}

                  >

                    {category}

                    <ChevronRight size={14} />

                  </button>

                ))}

              </div>

            )}

          </div>

          <button className="header-action" onClick={() => setLoginOpen(true)}>

            <UserRound size={19} />

            <span>{signedInUser || "Login"}</span>

          </button>

          <button

            className="header-action cart-action"

            onClick={() => setCartOpen(true)}

          >

            <ShoppingCart size={20} />

            <span>Cart</span>

            {cartCount > 0 && <b className="cart-count">{cartCount}</b>}

          </button>

        </nav>

        <button

          className="mobile-menu"

          aria-label="Toggle navigation"

          onClick={() => setMobileMenuOpen((open) => !open)}

        >

          {mobileMenuOpen ? <X size={23} /> : <Menu size={23} />}

        </button>

        <button

  className="header-action"

  onClick={() => {

    if (!localStorage.getItem("freshmeat-access-token")) {

      setLoginOpen(true);

      return;

    }

    window.location.href = "/my-orders";

  }}

>

  <Package size={19} />

  <span>My Orders</span>

</button>

        {/* Admin dashboard entry point. Admin API endpoints still enforce staff permissions. */}

        <button

          type="button"

          className="header-action"

          onClick={() => {

            window.location.href = "/admin";

          }}

          aria-label="Open admin dashboard"

        >

          <Package size={19} />

          <span>Admin Dashboard</span>

        </button>

      </header>

      <main id="home">

        {currentSlide && (

        <section className={`hero ${currentSlide.background}`}>

          <div className="hero-content" key={currentSlide.title}>

            <span className="eyebrow">

              <span className="eyebrow-dot" />

              {currentSlide.eyebrow}

            </span>

            <h1>

              {currentSlide.title.split("\n").map((line, index) => (

                <span key={line}>

                  {line}

                  {index === 0 && <br />}

                </span>

              ))}

            </h1>

            <p>{currentSlide.description}</p>

            <a

              className="hero-button"

              href="#products"

              onClick={() => setSearch("")}

            >

              {currentSlide.button} <ArrowRight size={17} />

            </a>

            <div className="hero-trust">

              <span><CheckCircle2 size={15} /> Carefully selected cuts</span>

              <span><CheckCircle2 size={15} /> Convenient ordering</span>

            </div>

          </div>

          <div className="hero-image-wrap">

            <img

              className="hero-image"

              src={currentSlide.image}

              alt="Chicken food photography"

            />

            <div className="hero-image-label">

              <span className="label-icon"><CheckCircle2 size={19} /></span>

              <span>

                <strong>Fresh choices</strong>

                <small>Made for everyday meals</small>

              </span>

            </div>

          </div>

          <button

            className="slide-arrow slide-prev"

            onClick={() =>

              setSlideIndex((current) => (current - 1 + slides.length) % slides.length)

            }

            aria-label="Previous banner"

          >

            <ChevronLeft size={22} />

          </button>

          <button

            className="slide-arrow slide-next"

            onClick={() => setSlideIndex((current) => (current + 1) % slides.length)}

            aria-label="Next banner"

          >

            <ChevronRight size={22} />

          </button>

          <div className="slide-dots" aria-label="Banner slides">

            {slides.map((slide, index) => (

              <button

                key={slide.title}

                className={index === slideIndex ? "dot active-dot" : "dot"}

                onClick={() => setSlideIndex(index)}

                aria-label={`Show banner ${index + 1}`}

              />

            ))}

          </div>

        </section>

        )}

        <section className="benefits-strip">

          <div className="benefit">

            <span className="benefit-icon"><CheckCircle2 size={21} /></span>

            <span><strong>Carefully selected</strong><small>Quality-focused choices</small></span>

          </div>

          <div className="benefit">

            <span className="benefit-icon"><ShoppingCart size={21} /></span>

            <span><strong>Easy ordering</strong><small>Simple shopping experience</small></span>

          </div>

          <div className="benefit">

            <span className="benefit-icon"><Clock size={21} /></span>

            <span><strong>Choose your slot</strong><small>Delivery options at checkout</small></span>

          </div>

          <div className="benefit">

            <span className="benefit-icon"><MapPin size={21} /></span>

            <span><strong>Apartment delivery</strong><small>Check your location first</small></span>

          </div>

        </section>

        <section className="coupon-section">

          <div className="section-heading coupon-heading">

            <div>

              <span className="section-kicker">A LITTLE EXTRA FOR YOU</span>

              <h2>Good food. Better savings.</h2>

              <p>Pick an offer and use its code at checkout.</p>

            </div>

            <span className="coupon-heading-icon"><Tag size={27} /></span>

          </div>

          {couponsLoading ? (
            <p className="coupon-note">Loading current offers…</p>
          ) : couponsError ? (
            <p className="coupon-note" role="status">{couponsError}</p>
          ) : coupons.length > 0 ? (
            <div className="coupon-grid">
              {coupons.map((coupon) => (
                <article className={`coupon-card ${coupon.color}`} key={coupon.id}>
                  <div className="coupon-art"><Tag size={23} /></div>
                  <div className="coupon-copy">
                    <span className="coupon-label">SPECIAL OFFER</span>
                    <h3>{coupon.title}</h3>
                    <p>{coupon.description}</p>
                    <small>{coupon.detail}</small>
                  </div>
                  <div className="coupon-divider" />
                  <button
                    className="coupon-code"
                    onClick={() => copyCoupon(coupon.code)}
                    aria-label={`Copy coupon ${coupon.code}`}
                  >
                    <span>{coupon.code}</span>
                    <span className="copy-label">
                      {copiedCoupon === coupon.code ? (
                        <><CheckCircle2 size={14} /> Copied</>
                      ) : (
                        "Copy code"
                      )}
                    </span>
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="coupon-note">No active offers right now. Please check back soon!</p>
          )}
        </section>

        <section className="products-section" id="products">

          <div className="section-heading">

            <div>

              <span className="section-kicker">FRESH PICKS FOR YOUR KITCHEN</span>

              <h2>Our chicken selection</h2>

              <p>Find your favourite cuts for your next delicious meal.</p>

            </div>

            <a

              className="text-link"

              href="#products"

              onClick={() => setSearch("")}

            >

              View all products <ArrowRight size={16} />

            </a>

          </div>

          {productLoadError && <p role="alert">{productLoadError}</p>}

          <div className="product-grid">

            {visibleProducts.map((product) => (

              <article className="product-card" key={product.id}>

                <div className="product-image">

                  <img src={product.image} alt={product.name} loading="lazy" />

                  <span className="fresh-tag">{product.tag}</span>

                  <button

                    className="quick-add"

                    onClick={() => { setActiveProduct(product); setSelectedPackIndex(0); setPackQuantity(1); setCartNotice(""); }}

                    aria-label={`Add ${product.name} to cart`}

                  >

                    <Plus size={19} />

                  </button>

                </div>

                <div className="product-info">

                  <span className="product-weight">{product.weight}</span>

                  <h3>{product.name}</h3>

                  <div className="product-bottom">

                    <div className="price-group">

                      <strong>₹{product.price}</strong>

                      {product.oldPrice > product.price && <del>₹{product.oldPrice}</del>}

                    </div>

                    <button

                      className="add-button"

                      onClick={() => { setActiveProduct(product); setSelectedPackIndex(0); setPackQuantity(1); setCartNotice(""); }}

                    >

                      <Plus size={15} /> Add

                    </button>

                  </div>

                </div>

              </article>

            ))}

            {visibleProducts.length === 0 && (

              <div className="empty-results">

                <Search size={28} />

                <h3>No products found</h3>

                <p>Try another search term.</p>

                <button className="add-button" onClick={() => setSearch("")}>

                  Show all products

                </button>

              </div>

            )}

          </div>

          <div className="product-bottom-cta">

            <span>Found your favourite cut?</span>

            <a href="#products" onClick={() => setSearch("")}>

              Explore the selection <ArrowRight size={16} />

            </a>

          </div>

        </section>

        <section className="reviews-section">

            <div className="reviews-intro">

              <span className="section-kicker">KIND WORDS</span>

              <h2>Made for your kitchen.</h2>

              <p>

                We want every shopping experience to feel simple, convenient and welcoming.

              </p>

              <div className="review-rating">

                <div className="rating-stars">

                  {[1, 2, 3, 4, 5].map((star) => (

                    <Star key={star} size={17} fill="currentColor" />

                  ))}

                </div>

                <span>{HOMEPAGE_REVIEW_COUNT} customer reviews</span>

              </div>

            </div>

            <div className="review-grid">

              {reviews.map((review) => (

                <article className="review-card" key={review.id}>

                  <div className="review-top">

                    <span className="quote-mark">“</span>

                    <div className="review-stars">

                      {Array.from({ length: review.rating }, (_, index) => (

                        <Star key={index} size={13} fill="currentColor" />

                      ))}

                    </div>

                  </div>

                  <p>{review.text}</p>

                  <div className="review-person">

                    <span className="review-avatar">{review.initials}</span>

                    <span>

                      <strong>{review.name}</strong>

                      <small>{review.meta}</small>

                    </span>

                  </div>

                </article>

              ))}

            </div>

        </section>

        <section className="newsletter-section">

          <div className="newsletter-icon"><Mail size={23} /></div>

          <div className="newsletter-copy">

            <h2>Stay in the loop.</h2>

            <p>Be the first to hear about offers and new additions.</p>

          </div>

          <form

            className="newsletter-form"

            onSubmit={(event) => {

              event.preventDefault();

              alert("Newsletter signup will be connected to the backend later.");

            }}

          >

            <input

              type="email"

              placeholder="Enter your email address"

              aria-label="Email address"

              required

            />

            <button type="submit">Keep me updated <ArrowRight size={16} /></button>

          </form>

        </section>

      </main>

      <footer className="footer">

        <div className="footer-main">

          <div className="footer-brand-column">

            <a className="brand footer-brand brand-logo" href="#home" aria-label="Freshca home">

              <span className="brand-name">FRESHCA</span>

            </a>

            <p className="footer-description">

              Thoughtful choices for your kitchen. Explore chicken cuts and find what works for your next meal.

            </p>

            <h4 className="store-heading">GET THE APP</h4>

            <div className="store-buttons">

              <a

                className="store-button"

                href="https://www.apple.com/app-store/"

                target="_blank"

                rel="noreferrer"

              >

                <span className="store-logo apple-logo">A</span>

                <span><small>Download on the</small><strong>App Store</strong></span>

              </a>

              <a

                className="store-button"

                href="https://play.google.com/store"

                target="_blank"

                rel="noreferrer"

              >

                <span className="play-symbol">▶</span>

                <span><small>GET IT ON</small><strong>Google Play</strong></span>

              </a>

            </div>

          </div>

          <div className="footer-links-column">
            <h3>Useful Links</h3>
            <a href="/terms-and-conditions">
              Terms &amp; Conditions
            </a>
          </div>

          <div className="footer-contact">

  <h3>Contact Us</h3>

  <p>

    Have questions about your order? Get in touch with our team.

  </p>

  <a href="mailto:support@example.com">

    <Mail size={16} />

    support@example.com

  </a>

  <a href="tel:+910000000000">

    <Phone size={16} />

    +91 00000 00000

  </a>

</div>

        </div>

        <div className="footer-bottom">

          <span>© {new Date().getFullYear()} FreshMeat. All rights reserved.</span>

          <span>Made with care for your kitchen.</span>

        </div>

      </footer>

      {cartOpen && (

        <div className="cart-overlay" onMouseDown={(event) => {

          if (event.target === event.currentTarget) setCartOpen(false);

        }}>

          <section className="cart-dialog" role="dialog" aria-modal="true" aria-labelledby="cart-dialog-title">

            <div className="cart-dialog-header">

              <div>

                <h2 id="cart-dialog-title">Your Cart</h2>

                <p>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} item(s) in your cart</p>

              </div>

              <button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart"><X size={21} /></button>

            </div>

            {cartItems.length === 0 ? (

              <div className="cart-empty">

                <ShoppingCart size={42} />

                <h3>Your cart is empty</h3>

                <p>Add your favourite FreshMeat products to get started.</p>

                <button onClick={() => setCartOpen(false)}>Continue shopping</button>

              </div>

            ) : (

              <>

                <div className="cart-item-list">

                  {cartItems.map((item, index) => (

                    <article className="cart-item" key={`${item.name}-${item.pack}-${index}`}>

                      <div className="cart-item-icon"><ShoppingCart size={22} /></div>

                      <div className="cart-item-info">

                        <h3>{item.name}</h3>

                        <p>{item.pack}</p>

                        <strong>₹{item.price} <span>per pack</span></strong>

                        <div className="cart-item-quantity">

                          <button aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity <= 1} onClick={() => {

                            setCartItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row));

                            setCartCount((count) => Math.max(0, count - 1));

                          }}>−</button>

                          <span>{item.quantity}</span>

                          <button aria-label={`Increase ${item.name} quantity`} onClick={() => {

                            setCartItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: Math.min(20, row.quantity + 1) } : row));

                            setCartCount((count) => count + 1);

                          }}>+</button>

                        </div>

                      </div>

                      <div className="cart-item-total">

                        <strong>₹{item.price * item.quantity}</strong>

                        <button className="cart-remove" onClick={() => {

                          setCartItems((current) => current.filter((_, rowIndex) => rowIndex !== index));

                          setCartCount((count) => Math.max(0, count - item.quantity));

                        }}>Remove</button>

                      </div>

                    </article>

                  ))}

                </div>

                <div className="cart-summary">

                  <div><span>Subtotal</span><strong>₹{cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)}</strong></div>

                  <p>Delivery charges, if applicable, will be calculated at checkout.</p>

                  <button onClick={() => {

                    setCartOpen(false);

                    window.location.href = "/checkout";

                  }}>Continue to checkout <ArrowRight size={18} /></button>

                  <button className="cart-continue-shopping" onClick={() => setCartOpen(false)}>Continue shopping</button>

                </div>

              </>

            )}

          </section>

        </div>

      )}

      {cartNotice && (

        <div className="pack-toast" role="status">

          <CheckCircle2 size={20} />

          <span>{cartNotice}</span>

          <button onClick={() => setCartNotice("")} aria-label="Dismiss message"><X size={17} /></button>

        </div>

      )}

      {activeProduct && (

        <div className="pack-overlay" onMouseDown={(event) => {

          if (event.target === event.currentTarget) setActiveProduct(null);

        }}>

          <section className="pack-dialog" role="dialog" aria-modal="true" aria-labelledby="pack-dialog-title">

            <button className="pack-dialog-close" onClick={() => setActiveProduct(null)} aria-label="Close"><X size={20} /></button>

            <h2 id="pack-dialog-title">{activeProduct.name}</h2>

            <p className="pack-dialog-subtitle">Select your preferred pack size</p>

            <div className="pack-choice-list">

              {activeProduct.packs.map((pack, index) => (

                <button key={pack.label} className={`pack-choice ${selectedPackIndex === index ? "selected" : ""}`} onClick={() => setSelectedPackIndex(index)}>

                  <span className="pack-choice-radio" />

                  <span className="pack-choice-label">{pack.label}</span>

                  <span className="pack-choice-prices">

                    {pack.originalPrice != null && pack.originalPrice > pack.price && <del>₹{pack.originalPrice}</del>}

                    <strong>₹{pack.price}</strong>

                  </span>

                </button>

              ))}

            </div>

            <div className="pack-quantity-line">

              <strong>Quantity</strong>

              <div className="pack-quantity-controls">

                <button onClick={() => setPackQuantity((q) => Math.max(1, q - 1))} disabled={packQuantity <= 1} aria-label="Decrease quantity">−</button>

                <span>{packQuantity}</span>

                <button onClick={() => setPackQuantity((q) => Math.min(20, q + 1))} disabled={packQuantity >= 20} aria-label="Increase quantity">+</button>

              </div>

            </div>

            <button className="pack-add-to-cart" onClick={() => {

              const choice = activeProduct.packs[selectedPackIndex];

              if (!choice) return;

              const lineTotal = choice.price * packQuantity;

              setCartItems((items) => [...items, {

                productId: activeProduct.id,

                packId: choice.id,

                name: activeProduct.name,

                pack: choice.label,

                quantity: packQuantity,

                price: choice.price,

              }]);

              setCartCount((count) => count + packQuantity);

              setCartNotice(`${activeProduct.name} · ${choice.label} · Qty ${packQuantity} · Total ₹${lineTotal} added to cart`);

              setActiveProduct(null);

            }}>

              ADD TO CART – ₹{(activeProduct.packs[selectedPackIndex]?.price ?? 0) * packQuantity}

            </button>

          </section>

        </div>

      )}

      {loginOpen && (

        <Login

          onClose={() => setLoginOpen(false)}

        onLogin={(userLabel) => {

        let displayName = "My Account";

        try {

          const user =

      typeof userLabel === "string"

        ? JSON.parse(userLabel)

        : userLabel;

    if (typeof user === "string") {

      displayName = user;

    } else if (user && typeof user === "object") {

      displayName =

        user.label ||

        user.email ||

        user.username ||

        "My Account";

    }

  } catch {

    displayName =

      typeof userLabel === "string"

        ? userLabel

        : "My Account";

  }

  localStorage.setItem("freshmeat-user", displayName);

  setSignedInUser(displayName);

  setLoginOpen(false);

}}

        />

      )}

      {locationOpen && (

        <div className="modal-backdrop" onClick={() => setLocationOpen(false)}>

          <section

            className="location-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="location-title"

            onClick={(event) => event.stopPropagation()}

          >

            <button

              className="modal-close"

              onClick={() => setLocationOpen(false)}

              aria-label="Close location selection"

            >

              <X size={21} />

            </button>

            <span className="modal-pin"><MapPin size={25} /></span>

            <h2 id="location-title">Where should we deliver?</h2>

              <p>Select your apartment to check delivery availability.</p>

              <label className="location-search-box">

                <Search size={18} aria-hidden="true" />

                <input

                  type="text"

                  value={locationSearch}

                  onChange={(event) => setLocationSearch(event.target.value)}

                  placeholder="Search apartment name or PIN code"

                  aria-label="Search apartment name or PIN code"

                  autoComplete="off"

                />

                {locationSearch && (

                  <button

                    type="button"

                    className="location-search-clear"

                    onClick={() => setLocationSearch("")}

                    aria-label="Clear apartment search"

                  >

                    <X size={16} />

                  </button>

                )}

              </label>

              <div className="location-results" aria-live="polite">

                {apartmentsLoading ? (

                  <div className="location-empty">

                    <MapPin size={22} />

                    <strong>Loading apartments…</strong>

                    <span>Please wait while we fetch approved delivery locations.</span>

                  </div>

                ) : apartmentsError ? (

                  <div className="location-empty" role="alert">

                    <MapPin size={22} />

                    <strong>Unable to load locations</strong>

                    <span>{apartmentsError}</span>

                    <button type="button" onClick={() => {

                      setLocationOpen(false);

                      window.location.reload();

                    }}>Refresh page</button>

                  </div>

                ) : filteredApartments.length > 0 ? (

                  filteredApartments.map((apartment) => (

                    <button

                      type="button"

                      className="apartment-option"

                      key={apartment.id}

                      onClick={() => {

                        setSelectedLocation(apartment.name);

                        window.localStorage.setItem(

                          "freshca-selected-apartment",

                          JSON.stringify(apartment)

                        );

                        setLocationSearch("");

                        setLocationOpen(false);

                      }}

                    >

                      <span className="apartment-option-copy">

                        <strong>{apartment.name}</strong>

                        <small>

                          {apartment.area ? `${apartment.area} · ` : ""}

                          PIN code: {apartment.pincode}

                        </small>

                      </span>

                      <ChevronRight size={18} />

                    </button>

                  ))

                ) : (

                  <div className="location-empty">

                    <MapPin size={22} />

                    <strong>

                      {apartments.length === 0

                        ? "No approved apartments available"

                        : "No approved apartment found"}

                    </strong>

                    <span>

                      {apartments.length === 0

                        ? "Ask the admin to add and approve delivery locations."

                        : "Try another apartment name or PIN code."}

                    </span>

                  </div>

                )}

              </div>

              <small className="demo-note">

                {apartmentsLoading

                  ? "Loading approved delivery locations…"

                  : `${apartments.length} approved apartment(s) available. Delivery is limited to the approved list.`}

              </small>

          </section>

        </div>

      )}

    </div>

  );

}

export default App;

import { useEffect, useState } from "react";

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

} from "lucide-react";

import "./App.css";

const slides = [

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

const products = [

  {

    id: 1,

    name: "Curry Cut Pieces",

    weight: "500 g",

    price: 179,

    oldPrice: 219,

    image:

      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=700&q=85",

    tag: "Bestseller",

  },

  {

    id: 2,

    name: "Chicken Boneless",

    weight: "500 g",

    price: 249,

    oldPrice: 289,

    image:

      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=700&q=85",

    tag: "Easy to cook",

  },

  {

    id: 3,

    name: "Chicken Drumsticks",

    weight: "500 g",

    price: 199,

    oldPrice: 239,

    image:

      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=700&q=85",

    tag: "Popular",

  },

  {

    id: 4,

    name: "Chicken Breast Boneless",

    weight: "500 g",

    price: 229,

    oldPrice: 269,

    image:

      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=700&q=85",

    tag: "Lean cut",

  },

  {

    id: 5,

    name: "Chicken Mince (Keema)",

    weight: "500 g",

    price: 219,

    oldPrice: 249,

    image:

      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=700&q=85",

    tag: "Kitchen favourite",

  },

  {

    id: 6,

    name: "Chicken Leg with Thigh",

    weight: "500 g",

    price: 209,

    oldPrice: 249,

    image:

      "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=700&q=85",

    tag: "Juicy cut",

  },

  {

    id: 7,

    name: "Chicken Liver",

    weight: "250 g",

    price: 89,

    oldPrice: 109,

    image:

      "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=700&q=85",

    tag: "Everyday pick",

  },

  {

    id: 8,

    name: "Chicken Mini Bites",

    weight: "500 g",

    price: 239,

    oldPrice: 279,

    image:

      "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=700&q=85",

    tag: "Quick meals",

  },

];

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

const coupons = [

  {

    code: "FRESH10",

    title: "10% OFF",

    description: "On your first order",

    detail: "A fresh start to your first order.",

    color: "coupon-lilac",

  },

  {

    code: "SAVE100",

    title: "₹100 OFF",

    description: "On orders above ₹799",

    detail: "More favourites, more savings.",

    color: "coupon-peach",

  },

  {

    code: "MEATLOVE",

    title: "EXTRA SAVINGS",

    description: "Use this coupon at checkout",

    detail: "A little something for your next meal.",

    color: "coupon-green",

  },

];

const reviews = [

  {

    name: "A happy home cook",

    initials: "HC",

    text: "The website is easy to browse, and the product selection makes meal planning simple.",

    rating: 5,

    meta: "Sample review",

  },

  {

    name: "Everyday food lover",

    initials: "EF",

    text: "I like being able to compare cuts and pack sizes before adding anything to my cart.",

    rating: 5,

    meta: "Sample review",

  },

  {

    name: "Weekend chef",

    initials: "WC",

    text: "A clean shopping experience with everything organised in one place.",

    rating: 5,

    meta: "Sample review",

  },

  {

    name: "Busy family cook",

    initials: "BF",

    text: "The simple layout makes it easy to find products for different recipes.",

    rating: 5,

    meta: "Sample review",

  },

];

function App() {

  const [slideIndex, setSlideIndex] = useState(0);

  const [search, setSearch] = useState("");

  const [locationOpen, setLocationOpen] = useState(false);

  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const [selectedLocation, setSelectedLocation] = useState("");

  const [cartCount, setCartCount] = useState(0);

  const [copiedCoupon, setCopiedCoupon] = useState("");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {

    const timer = window.setInterval(() => {

      setSlideIndex((current) => (current + 1) % slides.length);

    }, 5000);

    return () => window.clearInterval(timer);

  }, []);

  const currentSlide = slides[slideIndex];

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

  return (

    <div className="app">

      <div className="announcement-bar">

        <span>Fresh picks for your kitchen, every day.</span>

        <span className="announcement-right">

          <Phone size={13} /> Customer care: add client phone number

        </span>

      </div>

      <header className="header">

        <a className="brand" href="#home" aria-label="FreshMeat home">

          Fresh<span>Meat</span>

          <small>FRESHNESS FIRST</small>

        </a>

        <button

          className="location-button"

          onClick={() => setLocationOpen(true)}

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

          <button className="header-action" onClick={() => alert("Login page will be added in the next step.")}>

            <UserRound size={19} />

            <span>Login</span>

          </button>

          <button

            className="header-action cart-action"

            onClick={() => alert(`You have added ${cartCount} item(s). The full cart page is coming next.`)}

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

      </header>

      <main id="home">

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

          <div className="coupon-grid">

            {coupons.map((coupon) => (

              <article className={`coupon-card ${coupon.color}`} key={coupon.code}>

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

          <p className="coupon-note">

            Demo coupons only. Confirm actual offers, eligibility and discount rules with the client.

          </p>

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

          <div className="product-grid">

            {visibleProducts.map((product) => (

              <article className="product-card" key={product.id}>

                <div className="product-image">

                  <img src={product.image} alt={product.name} loading="lazy" />

                  <span className="fresh-tag">{product.tag}</span>

                  <button

                    className="quick-add"

                    onClick={() => setCartCount((count) => count + 1)}

                    aria-label={`Add ${product.name} to cart`}

                  >

                    <Plus size={19} />

                  </button>

                </div>

                <div className="product-info">

                  <span className="product-weight">{product.weight} pack</span>

                  <h3>{product.name}</h3>

                  <div className="product-bottom">

                    <div className="price-group">

                      <strong>₹{product.price}</strong>

                      <del>₹{product.oldPrice}</del>

                    </div>

                    <button

                      className="add-button"

                      onClick={() => setCartCount((count) => count + 1)}

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

              <span>Customer reviews section</span>

            </div>

          </div>

          <div className="review-grid">

            {reviews.map((review) => (

              <article className="review-card" key={review.initials}>

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

          <p className="reviews-disclaimer">

            Sample review content for layout preview. Replace with genuine customer feedback before launch.

          </p>

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

            <a className="brand footer-brand" href="#home">

              Fresh<span>Meat</span>

              <small>FRESHNESS FIRST</small>

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

  <a href="https://www.licious.in/why-licious" target="_blank" rel="noreferrer">

    Why Licious?

  </a>

  <a href="https://www.licious.in/refer/tc" target="_blank" rel="noreferrer">

    Refer &amp; Earn

  </a>

  <a href="https://www.licious.in/licious-cash" target="_blank" rel="noreferrer">

    Licious Cash &amp; Cash+

  </a>

  <a href="https://www.licious.in/careers" target="_blank" rel="noreferrer">

    Careers

  </a>

  <a href="https://www.licious.in/blog" target="_blank" rel="noreferrer">

    Blog

  </a>

  <a href="https://www.licious.in/about-us" target="_blank" rel="noreferrer">

    About Us

  </a>

  <a href="https://www.licious.in/bug-bounty-guidelines" target="_blank" rel="noreferrer">

    Bug Bounty Guidelines

  </a>

  <a href="https://www.licious.in/terms" target="_blank" rel="noreferrer">

    Terms &amp; Conditions

  </a>

  <a href="https://www.licious.in/faq" target="_blank" rel="noreferrer">

    FAQ

  </a>

  <a href="https://www.licious.in/privacy-policy" target="_blank" rel="noreferrer">

    Privacy Policy

  </a>

  <a href="https://www.licious.in/cancel-and-reschedule-policy" target="_blank" rel="noreferrer">

    Cancellation &amp; Reschedule Policy

  </a>

  <a href="https://www.licious.in/fssc-certificate" target="_blank" rel="noreferrer">

    FSSC 22000 Certification

  </a>

  <a href="https://www.licious.in/csr-policy" target="_blank" rel="noreferrer">

    CSR Policy

  </a>

  <a href="https://www.licious.in/sitemap" target="_blank" rel="noreferrer">

    Sitemap

  </a>

  <a href="https://www.licious.in/notices" target="_blank" rel="noreferrer">

    Notices

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

            {["Apartment A", "Apartment B", "Apartment C"].map((location) => (

              <button

                className="apartment-option"

                key={location}

                onClick={() => {

                  setSelectedLocation(location);

                  setLocationOpen(false);

                }}

              >

                <span>{location}</span>

                <ChevronRight size={18} />

              </button>

            ))}

            <small className="demo-note">

              Sample apartments only. Replace these with the approved delivery list from your client.

            </small>

          </section>

        </div>

      )}

    </div>

  );

}

export default App;

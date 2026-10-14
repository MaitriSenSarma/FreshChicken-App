import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity, BadgePercent, BarChart3, Check, ChevronDown, CircleUserRound,
  ClipboardList, Image as ImageIcon, LayoutDashboard, LogOut, Menu, MessageSquare,
  Package, Pencil, Plus, Search, Settings, ShieldCheck, ShoppingBag, Trash2,
  Truck, Upload, Users, X, MapPin, Eye, EyeOff
} from "lucide-react";
import "./Admin.css";

type Product = {
  id: number; name: string; category: string; pack: string; price: number;
  oldPrice: number; stock: number; active: boolean; image: string;
};
type Banner = {
  id: number; title: string; subtitle: string; button: string; image: string; active: boolean;
};
type Review = {
  id: number; customer: string; product: string; rating: number; comment: string; date: string; approved: boolean;
};
type Customer = {
  id: number; name: string; email: string; phone: string; orders: number; status: "Active" | "Blocked";
};
type Order = {
  id: string; customer: string; apartment: string; total: number; date: string;
  status: "Placed" | "Confirmed" | "Preparing" | "Dispatched" | "Delivered" | "Cancelled";
};
type Apartment = { id: number; name: string; area: string; active: boolean };
type Coupon = { id: number; code: string; type: "Percentage" | "Fixed"; value: number; minimum: number; expiry: string; active: boolean };

const initialProducts: Product[] = [
  { id: 1, name: "Curry Cut Pieces", category: "Curry Cut Pieces", pack: "500 g", price: 179, oldPrice: 219, stock: 24, active: true, image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80" },
  { id: 2, name: "Chicken Boneless – Mini Bites", category: "Chicken Boneless", pack: "500 g", price: 249, oldPrice: 289, stock: 16, active: true, image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=80" },
  { id: 3, name: "Chicken Drumsticks", category: "Drumsticks", pack: "500 g", price: 199, oldPrice: 239, stock: 8, active: true, image: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=600&q=80" },
];
const initialBanners: Banner[] = [
  { id: 1, title: "Fresh cuts. Delivered fresh.", subtitle: "Quality chicken for everyday meals.", button: "Shop chicken", image: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=80", active: true },
];
const initialReviews: Review[] = [
  { id: 1, customer: "Aarav S.", product: "Curry Cut Pieces", rating: 5, comment: "Easy to order and the pack size was just right.", date: "2026-10-10", approved: true },
  { id: 2, customer: "Priya M.", product: "Chicken Boneless – Mini Bites", rating: 4, comment: "Good selection. Please add more pack sizes.", date: "2026-10-12", approved: false },
];
const initialCustomers: Customer[] = [
  { id: 1, name: "Aarav Sharma", email: "aarav@example.com", phone: "98XXXXXX12", orders: 4, status: "Active" },
  { id: 2, name: "Priya Mukherjee", email: "priya@example.com", phone: "97XXXXXX45", orders: 2, status: "Active" },
];
const initialOrders: Order[] = [
  { id: "FM-1024", customer: "Aarav Sharma", apartment: "Green View Apartments", total: 458, date: "14 Oct 2026", status: "Placed" },
  { id: "FM-1023", customer: "Priya Mukherjee", apartment: "Sunrise Residency", total: 699, date: "14 Oct 2026", status: "Preparing" },
  { id: "FM-1022", customer: "Rohan D.", apartment: "Lake Gardens Housing", total: 329, date: "13 Oct 2026", status: "Delivered" },
];
const initialApartments: Apartment[] = [
  { id: 1, name: "Green View Apartments", area: "New Town", active: true },
  { id: 2, name: "Sunrise Residency", area: "Rajarhat", active: true },
  { id: 3, name: "Lake Gardens Housing", area: "Lake Gardens", active: true },
  { id: 4, name: "Royal Heights", area: "Salt Lake", active: false },
];
const initialCoupons: Coupon[] = [
  { id: 1, code: "FRESH10", type: "Percentage", value: 10, minimum: 399, expiry: "2026-12-31", active: true },
  { id: 2, code: "SAVE50", type: "Fixed", value: 50, minimum: 599, expiry: "2026-11-30", active: true },
];
const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
};
const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

type Section = "Overview" | "Products & Inventory" | "Homepage Banners" | "Customer Reviews" | "Customers" | "Orders" | "Delivery Apartments" | "Coupons & Offers" | "Reports" | "Settings";

export default function Admin() {
  const [section, setSection] = useState<Section>("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>(() => read("freshmeat-admin-products", initialProducts));
  const [banners, setBanners] = useState<Banner[]>(() => read("freshmeat-admin-banners", initialBanners));
  const [reviews, setReviews] = useState<Review[]>(() => read("freshmeat-admin-reviews", initialReviews));
  const [customers, setCustomers] = useState<Customer[]>(() => read("freshmeat-admin-customers", initialCustomers));
  const [orders, setOrders] = useState<Order[]>(() => read("freshmeat-admin-orders", initialOrders));
  const [apartments, setApartments] = useState<Apartment[]>(() => read("freshmeat-admin-apartments", initialApartments));
  const [coupons, setCoupons] = useState<Coupon[]>(() => read("freshmeat-admin-coupons", initialCoupons));
  const [notice, setNotice] = useState("");
  const [productModal, setProductModal] = useState(false);
  const [bannerModal, setBannerModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [productDraft, setProductDraft] = useState({ name: "", category: "Curry Cut Pieces", pack: "500 g", price: "179", oldPrice: "219", stock: "10", image: "" });
  const [bannerDraft, setBannerDraft] = useState({ title: "", subtitle: "", button: "Shop chicken", image: "" });
  const [apartmentDraft, setApartmentDraft] = useState({ name: "", area: "" });
  const [couponDraft, setCouponDraft] = useState({ code: "", type: "Percentage" as "Percentage" | "Fixed", value: "10", minimum: "399", expiry: "" });

  useEffect(() => { localStorage.setItem("freshmeat-admin-products", JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem("freshmeat-admin-banners", JSON.stringify(banners)); }, [banners]);
  useEffect(() => { localStorage.setItem("freshmeat-admin-reviews", JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem("freshmeat-admin-customers", JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem("freshmeat-admin-orders", JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem("freshmeat-admin-apartments", JSON.stringify(apartments)); }, [apartments]);
  useEffect(() => { localStorage.setItem("freshmeat-admin-coupons", JSON.stringify(coupons)); }, [coupons]);
  useEffect(() => { if (!notice) return; const t = window.setTimeout(() => setNotice(""), 2800); return () => window.clearTimeout(t); }, [notice]);

  const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
    { label: "Overview", icon: LayoutDashboard }, { label: "Products & Inventory", icon: Package },
    { label: "Homepage Banners", icon: ImageIcon }, { label: "Customer Reviews", icon: MessageSquare },
    { label: "Customers", icon: Users }, { label: "Orders", icon: ShoppingBag },
    { label: "Delivery Apartments", icon: MapPin }, { label: "Coupons & Offers", icon: BadgePercent },
    { label: "Reports", icon: BarChart3 }, { label: "Settings", icon: Settings },
  ];
  const activeOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
  const revenue = orders.filter(o => o.status === "Delivered").reduce((sum, o) => sum + o.total, 0);
  const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const filteredCustomers = useMemo(() => customers.filter(c => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const filteredOrders = useMemo(() => orders.filter(o => `${o.id} ${o.customer} ${o.apartment}`.toLowerCase().includes(query.toLowerCase())), [orders, query]);

  function openNewProduct() {
    setEditingProduct(null); setProductDraft({ name: "", category: "Curry Cut Pieces", pack: "500 g", price: "179", oldPrice: "219", stock: "10", image: "" }); setProductModal(true);
  }
  function openEditProduct(product: Product) {
    setEditingProduct(product); setProductDraft({ name: product.name, category: product.category, pack: product.pack, price: String(product.price), oldPrice: String(product.oldPrice), stock: String(product.stock), image: product.image }); setProductModal(true);
  }
  function productImageChanged(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Please choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setNotice("Choose an image smaller than 2 MB for this demo."); return; }
    const reader = new FileReader(); reader.onload = () => setProductDraft(d => ({ ...d, image: String(reader.result) })); reader.readAsDataURL(file);
  }
  function bannerImageChanged(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { setNotice("Please choose an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { setNotice("Choose an image smaller than 2 MB for this demo."); return; }
    const reader = new FileReader(); reader.onload = () => setBannerDraft(d => ({ ...d, image: String(reader.result) })); reader.readAsDataURL(file);
  }
  function saveProduct(e: FormEvent) {
    e.preventDefault();
    if (!productDraft.name.trim()) { setNotice("Enter a product name."); return; }
    const item: Product = { id: editingProduct?.id ?? Date.now(), name: productDraft.name.trim(), category: productDraft.category, pack: productDraft.pack.trim() || "500 g", price: Number(productDraft.price) || 0, oldPrice: Number(productDraft.oldPrice) || 0, stock: Math.max(0, Number(productDraft.stock) || 0), active: editingProduct?.active ?? true, image: productDraft.image || "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80" };
    setProducts(old => editingProduct ? old.map(p => p.id === editingProduct.id ? item : p) : [item, ...old]);
    setProductModal(false); setNotice(editingProduct ? "Product updated in demo data." : "Product added to demo data.");
  }
  function saveBanner(e: FormEvent) {
    e.preventDefault(); if (!bannerDraft.title.trim()) { setNotice("Enter a banner heading."); return; }
    const item: Banner = { id: editingBanner?.id ?? Date.now(), title: bannerDraft.title.trim(), subtitle: bannerDraft.subtitle.trim(), button: bannerDraft.button.trim() || "Shop chicken", image: bannerDraft.image || "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=1200&q=80", active: editingBanner?.active ?? true };
    setBanners(old => editingBanner ? old.map(b => b.id === editingBanner.id ? item : b) : [item, ...old]); setBannerModal(false); setNotice("Banner saved in demo data.");
  }
  function openBanner(banner?: Banner) {
    setEditingBanner(banner ?? null);
    setBannerDraft(banner ? { title: banner.title, subtitle: banner.subtitle, button: banner.button, image: banner.image } : { title: "", subtitle: "", button: "Shop chicken", image: "" });
    setBannerModal(true);
  }
  function updateOrderStatus(id: string, status: Order["status"]) { setOrders(old => old.map(o => o.id === id ? { ...o, status } : o)); setNotice(`${id} status updated in demo data.`); }
  function addApartment(e: FormEvent) {
    e.preventDefault(); if (!apartmentDraft.name.trim()) return;
    setApartments(old => [{ id: Date.now(), name: apartmentDraft.name.trim(), area: apartmentDraft.area.trim(), active: true }, ...old]); setApartmentDraft({ name: "", area: "" }); setNotice("Apartment added to demo list.");
  }
  function addCoupon(e: FormEvent) {
    e.preventDefault(); if (!couponDraft.code.trim()) return;
    setCoupons(old => [{ id: Date.now(), code: couponDraft.code.trim().toUpperCase(), type: couponDraft.type, value: Number(couponDraft.value) || 0, minimum: Number(couponDraft.minimum) || 0, expiry: couponDraft.expiry, active: true }, ...old]); setCouponDraft({ code: "", type: "Percentage", value: "10", minimum: "399", expiry: "" }); setNotice("Coupon added to demo data.");
  }
  const toggleProduct = (id: number) => setProducts(old => old.map(p => p.id === id ? { ...p, active: !p.active } : p));
  const toggleBanner = (id: number) => setBanners(old => old.map(b => b.id === id ? { ...b, active: !b.active } : b));
  const toggleApartment = (id: number) => setApartments(old => old.map(a => a.id === id ? { ...a, active: !a.active } : a));
  const toggleCoupon = (id: number) => setCoupons(old => old.map(c => c.id === id ? { ...c, active: !c.active } : c));

  return (
    <div className="fm-admin">
      <aside className={`fm-sidebar ${mobileNav ? "fm-sidebar-open" : ""}`}>
        <a className="fm-brand" href="/" aria-label="FreshMeat home"><span className="fm-brand-mark">F</span><span>Fresh<span>Meat</span><small>ADMIN CONSOLE</small></span></a>
        <div className="fm-admin-label">WORKSPACE</div>
        <nav className="fm-nav">
          {nav.map(item => { const Icon = item.icon; return <button key={item.label} className={section === item.label ? "active" : ""} onClick={() => { setSection(item.label); setQuery(""); setMobileNav(false); }}><Icon size={18} /><span>{item.label}</span>{item.label === "Orders" && activeOrders > 0 && <b>{activeOrders}</b>}</button>; })}
        </nav>
        <div className="fm-sidebar-bottom"><ShieldCheck size={17} /><span><strong>Admin preview</strong><small>Demo mode · not connected</small></span></div>
      </aside>

      <main className="fm-main">
        <header className="fm-topbar">
          <button className="fm-mobile-menu" onClick={() => setMobileNav(v => !v)} aria-label="Toggle navigation"><Menu size={21} /></button>
          <div><span className="fm-breadcrumb">FreshMeat / Admin</span><h1>{section}</h1></div>
          <div className="fm-top-actions"><span className="fm-demo-pill"><Activity size={14} /> Demo mode</span><div className="fm-admin-avatar"><CircleUserRound size={22} /><span><strong>Store Admin</strong><small>Administrator</small></span><ChevronDown size={15} /></div></div>
        </header>

        <div className="fm-content">
          {section === "Overview" && <>
            <div className="fm-welcome"><div><span className="fm-eyebrow">STORE OVERVIEW</span><h2>Good evening 👋</h2><p>Here’s what’s happening with your FreshMeat store.</p></div><button className="fm-primary" onClick={() => { setSection("Products & Inventory"); openNewProduct(); }}><Plus size={17} /> Add product</button></div>
            <div className="fm-stat-grid">
              <Stat icon={<ShoppingBag />} label="Total orders" value={String(orders.length)} foot={`${activeOrders} need attention`} />
              <Stat icon={<IndianRupeeIcon />} label="Delivered revenue" value={money(revenue)} foot="From demo orders" />
              <Stat icon={<Package />} label="Active products" value={String(products.filter(p => p.active).length)} foot={`${products.filter(p => p.stock <= 10).length} low-stock items`} />
              <Stat icon={<Users />} label="Customers" value={String(customers.length)} foot="Demo customer records" />
            </div>
            <div className="fm-overview-grid">
              <section className="fm-panel"><div className="fm-panel-heading"><div><h3>Recent orders</h3><p>Latest activity from your store</p></div><button className="fm-text-button" onClick={() => setSection("Orders")}>View all</button></div><div className="fm-table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.slice(0,4).map(o => <tr key={o.id}><td><strong>{o.id}</strong><small>{o.date}</small></td><td>{o.customer}</td><td>{money(o.total)}</td><td><Status value={o.status} /></td></tr>)}</tbody></table></div></section>
              <section className="fm-panel"><div className="fm-panel-heading"><div><h3>Inventory alerts</h3><p>Products with 10 or fewer packs</p></div><button className="fm-text-button" onClick={() => setSection("Products & Inventory")}>Manage</button></div>{products.filter(p => p.stock <= 10).map(p => <div className="fm-stock-alert" key={p.id}><img src={p.image} alt="" /><span><strong>{p.name}</strong><small>{p.stock} packs left</small></span><span className="fm-low-stock">Low stock</span></div>)}{!products.some(p => p.stock <= 10) && <p className="fm-empty-inline">No low-stock products right now.</p>}</section>
            </div>
            <div className="fm-quick-grid">{[{label:"Manage banners",icon:<ImageIcon />,to:"Homepage Banners" as Section},{label:"Moderate reviews",icon:<MessageSquare />,to:"Customer Reviews" as Section},{label:"Delivery apartments",icon:<MapPin />,to:"Delivery Apartments" as Section},{label:"Create coupon",icon:<BadgePercent />,to:"Coupons & Offers" as Section}].map(q => <button key={q.label} className="fm-quick-card" onClick={() => setSection(q.to)}>{q.icon}<span>{q.label}</span><span className="fm-quick-arrow">↗</span></button>)}</div>
          </>}

          {section === "Products & Inventory" && <>
            <div className="fm-page-heading"><div><h2>Products & inventory</h2><p>Manage product photos, pack sizes, prices and stock.</p></div><button className="fm-primary" onClick={openNewProduct}><Plus size={17} /> Add product</button></div>
            <div className="fm-toolbar"><label className="fm-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products..." /></label><span>{filteredProducts.length} products</span></div>
            <div className="fm-panel fm-table-wrap"><table><thead><tr><th>Product</th><th>Category / pack</th><th>Price</th><th>Stock</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{filteredProducts.map(p => <tr key={p.id}><td><div className="fm-product-cell"><img src={p.image} alt={p.name} /><span><strong>{p.name}</strong><small>ID: {p.id}</small></span></div></td><td>{p.category}<small>{p.pack}</small></td><td><strong>{money(p.price)}</strong>{p.oldPrice > p.price && <small className="fm-old-price">{money(p.oldPrice)}</small>}</td><td><span className={p.stock <= 10 ? "fm-stock-number warning" : "fm-stock-number"}>{p.stock}</span></td><td><Status value={p.active ? "Active" : "Hidden"} /></td><td><div className="fm-row-actions"><button title="Edit product" onClick={() => openEditProduct(p)}><Pencil size={16} /></button><button title={p.active ? "Hide product" : "Show product"} onClick={() => toggleProduct(p.id)}>{p.active ? <EyeOff size={16} /> : <Eye size={16} />}</button><button title="Remove product" onClick={() => { if (confirm(`Remove ${p.name} from demo products?`)) setProducts(old => old.filter(x => x.id !== p.id)); }}><Trash2 size={16} /></button></div></td></tr>)}</tbody></table>{filteredProducts.length === 0 && <p className="fm-empty-inline">No matching products.</p>}</div>
          </>}

          {section === "Homepage Banners" && <>
            <div className="fm-page-heading"><div><h2>Homepage banners</h2><p>Upload promotional images and manage homepage slides.</p></div><button className="fm-primary" onClick={() => openBanner()}><Plus size={17} /> Add banner</button></div>
            <div className="fm-banner-grid">{banners.map(b => <article className="fm-banner-card" key={b.id}><div className="fm-banner-image" style={{ backgroundImage: `linear-gradient(90deg, rgba(31,16,46,.78), rgba(31,16,46,.08)), url("${b.image}")` }}><span className="fm-banner-preview-label">HOMEPAGE PREVIEW</span><h3>{b.title}</h3><p>{b.subtitle}</p><span className="fm-banner-cta">{b.button} →</span></div><div className="fm-banner-card-footer"><Status value={b.active ? "Active" : "Hidden"} /><div className="fm-row-actions"><button onClick={() => openBanner(b)} title="Edit banner"><Pencil size={16} /></button><button onClick={() => toggleBanner(b.id)} title={b.active ? "Hide banner" : "Show banner"}>{b.active ? <EyeOff size={16} /> : <Eye size={16} />}</button><button onClick={() => { if (confirm("Delete this demo banner?")) setBanners(old => old.filter(x => x.id !== b.id)); }} title="Delete banner"><Trash2 size={16} /></button></div></div></article>)}</div>
            <div className="fm-note"><ImageIcon size={18} /><span><strong>Image upload in demo mode</strong><small>Images are stored in this browser only. We’ll move uploads to Django media storage after the backend is ready.</small></span></div>
          </>}

          {section === "Customer Reviews" && <>
            <div className="fm-page-heading"><div><h2>Customer reviews</h2><p>Review feedback and approve what appears publicly.</p></div><div className="fm-review-summary"><strong>{reviews.filter(r => r.approved).length}</strong><span>published</span></div></div>
            <div className="fm-review-list">{reviews.map(r => <article className="fm-review-card" key={r.id}><div className="fm-review-avatar">{r.customer.split(" ").map(s => s[0]).slice(0,2).join("")}</div><div className="fm-review-body"><div className="fm-review-top"><div><strong>{r.customer}</strong><small>{r.product} · {r.date}</small></div><div className="fm-stars">{"★".repeat(r.rating)}<span>{"★".repeat(5-r.rating)}</span></div></div><p>{r.comment}</p><div className="fm-review-footer"><Status value={r.approved ? "Published" : "Pending"} /><div className="fm-row-actions"><button onClick={() => setReviews(old => old.map(x => x.id === r.id ? { ...x, approved: !x.approved } : x))}>{r.approved ? <><EyeOff size={15} /> Hide</> : <><Check size={15} /> Approve</>}</button><button onClick={() => { if (confirm("Delete this demo review?")) setReviews(old => old.filter(x => x.id !== r.id)); }}><Trash2 size={15} /> Delete</button></div></div></div></article>)}</div>
            <div className="fm-note"><ShieldCheck size={18} /><span><strong>Review integrity</strong><small>In production, we’ll link reviews to completed orders and record moderation actions.</small></span></div>
          </>}

          {section === "Customers" && <>
            <div className="fm-page-heading"><div><h2>Customer accounts</h2><p>View customer details, order counts and account status.</p></div><span className="fm-count-pill">{customers.length} customers</span></div>
            <div className="fm-toolbar"><label className="fm-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, email or phone..." /></label></div>
            <div className="fm-panel fm-table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Orders</th><th>Account</th><th>Action</th></tr></thead><tbody>{filteredCustomers.map(c => <tr key={c.id}><td><div className="fm-customer-cell"><span className="fm-customer-avatar">{c.name.split(" ").map(s => s[0]).slice(0,2).join("")}</span><span><strong>{c.name}</strong><small>{c.email}</small></span></div></td><td>{c.phone}</td><td>{c.orders}</td><td><Status value={c.status} /></td><td><button className="fm-secondary small" onClick={() => setCustomers(old => old.map(x => x.id === c.id ? { ...x, status: x.status === "Active" ? "Blocked" : "Active" } : x))}>{c.status === "Active" ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>
            <div className="fm-note"><ShieldCheck size={18} /><span><strong>Privacy first</strong><small>Customer details shown here are demo records. Production access will be restricted to authorized administrators.</small></span></div>
          </>}

          {section === "Orders" && <>
            <div className="fm-page-heading"><div><h2>Order management</h2><p>Track orders and update their delivery status.</p></div><span className="fm-count-pill">{activeOrders} active orders</span></div>
            <div className="fm-toolbar"><label className="fm-search"><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search order, customer or apartment..." /></label></div>
            <div className="fm-panel fm-table-wrap"><table><thead><tr><th>Order</th><th>Customer / apartment</th><th>Date</th><th>Total</th><th>Status</th><th>Update status</th></tr></thead><tbody>{filteredOrders.map(o => <tr key={o.id}><td><strong>{o.id}</strong></td><td><strong>{o.customer}</strong><small>{o.apartment}</small></td><td>{o.date}</td><td><strong>{money(o.total)}</strong></td><td><Status value={o.status} /></td><td><select className="fm-status-select" value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value as Order["status"])}>{["Placed","Confirmed","Preparing","Dispatched","Delivered","Cancelled"].map(s => <option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div>
          </>}

          {section === "Delivery Apartments" && <>
            <div className="fm-page-heading"><div><h2>Approved delivery apartments</h2><p>Only active apartments should be selectable during checkout.</p></div><span className="fm-count-pill">{apartments.filter(a => a.active).length} active</span></div>
            <form className="fm-inline-form" onSubmit={addApartment}><label>Apartment name<input required value={apartmentDraft.name} onChange={e => setApartmentDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Orchid Enclave" /></label><label>Area / locality<input value={apartmentDraft.area} onChange={e => setApartmentDraft(d => ({ ...d, area: e.target.value }))} placeholder="e.g. New Town" /></label><button className="fm-primary" type="submit"><Plus size={16} /> Add apartment</button></form>
            <div className="fm-panel fm-table-wrap"><table><thead><tr><th>Apartment</th><th>Area</th><th>Delivery availability</th><th>Action</th></tr></thead><tbody>{apartments.map(a => <tr key={a.id}><td><strong>{a.name}</strong></td><td>{a.area || "—"}</td><td><Status value={a.active ? "Active" : "Unavailable"} /></td><td><button className="fm-secondary small" onClick={() => toggleApartment(a.id)}>{a.active ? "Deactivate" : "Activate"}</button></td></tr>)}</tbody></table></div>
            <div className="fm-note"><Truck size={18} /><span><strong>Checkout validation</strong><small>This is demo data only. The Django API will enforce apartment approval on the server, even if someone bypasses the frontend.</small></span></div>
          </>}

          {section === "Coupons & Offers" && <>
            <div className="fm-page-heading"><div><h2>Coupons & offers</h2><p>Configure discounts, minimum cart value and expiry dates.</p></div><span className="fm-count-pill">{coupons.filter(c => c.active).length} active offers</span></div>
            <form className="fm-inline-form fm-coupon-form" onSubmit={addCoupon}><label>Coupon code<input required value={couponDraft.code} onChange={e => setCouponDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="FRESH15" /></label><label>Discount type<select value={couponDraft.type} onChange={e => setCouponDraft(d => ({ ...d, type: e.target.value as "Percentage" | "Fixed" }))}><option>Percentage</option><option>Fixed</option></select></label><label>Value<input required type="number" min="1" value={couponDraft.value} onChange={e => setCouponDraft(d => ({ ...d, value: e.target.value }))} /></label><label>Minimum order ₹<input type="number" min="0" value={couponDraft.minimum} onChange={e => setCouponDraft(d => ({ ...d, minimum: e.target.value }))} /></label><label>Expiry date<input type="date" value={couponDraft.expiry} onChange={e => setCouponDraft(d => ({ ...d, expiry: e.target.value }))} /></label><button className="fm-primary" type="submit"><Plus size={16} /> Create coupon</button></form>
            <div className="fm-coupon-grid">{coupons.map(c => <article className="fm-coupon-card" key={c.id}><div className="fm-coupon-icon"><BadgePercent size={22} /></div><div className="fm-coupon-code">{c.code}</div><h3>{c.type === "Percentage" ? `${c.value}% off` : `${money(c.value)} off`}</h3><p>Minimum order {money(c.minimum)}</p><small>Expires: {c.expiry || "Not set"}</small><div className="fm-coupon-footer"><Status value={c.active ? "Active" : "Paused"} /><button className="fm-secondary small" onClick={() => toggleCoupon(c.id)}>{c.active ? "Pause" : "Activate"}</button><button className="fm-icon-button" title="Delete coupon" onClick={() => setCoupons(old => old.filter(x => x.id !== c.id))}><Trash2 size={15} /></button></div></article>)}</div>
          </>}

          {section === "Reports" && <>
            <div className="fm-page-heading"><div><h2>Store reports</h2><p>A simple snapshot based on the current demo orders.</p></div><button className="fm-secondary" onClick={() => { const csv = ["Order,Customer,Apartment,Date,Total,Status", ...orders.map(o => [o.id, `"${o.customer}"`, `"${o.apartment}"`, o.date, o.total, o.status].join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); const a = document.createElement("a"); a.href = url; a.download = "freshmeat-demo-orders.csv"; a.click(); URL.revokeObjectURL(url); }}><ClipboardList size={16} /> Export demo orders CSV</button></div>
            <div className="fm-stat-grid"><Stat icon={<ShoppingBag />} label="Orders recorded" value={String(orders.length)} foot="All demo statuses" /><Stat icon={<IndianRupeeIcon />} label="Delivered revenue" value={money(revenue)} foot="Delivered orders only" /><Stat icon={<Package />} label="Units in stock" value={String(products.reduce((n,p) => n + p.stock,0))} foot="Across demo products" /><Stat icon={<BadgePercent />} label="Active coupons" value={String(coupons.filter(c => c.active).length)} foot="Demo offers" /></div>
            <section className="fm-panel"><div className="fm-panel-heading"><div><h3>Order status breakdown</h3><p>Count of demo orders by status</p></div></div><div className="fm-bars">{(["Placed","Confirmed","Preparing","Dispatched","Delivered","Cancelled"] as const).map(s => { const n = orders.filter(o => o.status === s).length; const width = orders.length ? Math.max(5, n / orders.length * 100) : 0; return <div className="fm-bar-row" key={s}><span>{s}</span><div className="fm-bar-track"><i style={{ width: `${width}%` }} /></div><strong>{n}</strong></div>; })}</div></section>
          </>}

          {section === "Settings" && <>
            <div className="fm-page-heading"><div><h2>Store settings</h2><p>Basic storefront settings preview.</p></div></div>
            <section className="fm-panel fm-settings"><div><div className="fm-settings-icon"><Settings size={20} /></div><span><strong>Store identity</strong><small>Brand name: FreshMeat</small></span><Status value="Configured" /></div><div><div className="fm-settings-icon"><Truck size={20} /></div><span><strong>Delivery fee</strong><small>Demo rule: ₹30 under ₹499, free above ₹499</small></span><Status value="Demo rule" /></div><div><div className="fm-settings-icon"><ShieldCheck size={20} /></div><span><strong>Administrator security</strong><small>Real admin login and permissions will be implemented with Django.</small></span><Status value="Not connected" /></div><div><div className="fm-settings-icon"><ImageIcon size={20} /></div><span><strong>Media storage</strong><small>Demo uploads remain in this browser. Production storage comes later.</small></span><Status value="Demo mode" /></div></section>
          </>}
        </div>
        <footer className="fm-footer"><span>© {new Date().getFullYear()} FreshMeat Admin</span><span><span className="fm-footer-dot" /> Frontend preview · Data stored in this browser</span></footer>
      </main>

      {productModal && <div className="fm-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setProductModal(false); }}><form className="fm-modal" onSubmit={saveProduct}><div className="fm-modal-heading"><div><span className="fm-eyebrow">CATALOGUE</span><h2>{editingProduct ? "Edit product" : "Add product"}</h2></div><button type="button" className="fm-icon-button" onClick={() => setProductModal(false)}><X size={20} /></button></div><label>Product name<input required value={productDraft.name} onChange={e => setProductDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Chicken Breast Boneless" /></label><div className="fm-form-two"><label>Category<select value={productDraft.category} onChange={e => setProductDraft(d => ({ ...d, category: e.target.value }))}>{["Curry Cut Pieces","Chicken Boneless","Drumsticks","Country Chicken with Skin","Chicken Breast Boneless","Chicken Mince (Keema)","Chicken Leg with Thigh","Chicken Liver"].map(c => <option key={c}>{c}</option>)}</select></label><label>Pack size<input value={productDraft.pack} onChange={e => setProductDraft(d => ({ ...d, pack: e.target.value }))} placeholder="500 g" /></label></div><div className="fm-form-three"><label>Offer price ₹<input required type="number" min="0" value={productDraft.price} onChange={e => setProductDraft(d => ({ ...d, price: e.target.value }))} /></label><label>Original price ₹<input type="number" min="0" value={productDraft.oldPrice} onChange={e => setProductDraft(d => ({ ...d, oldPrice: e.target.value }))} /></label><label>Stock packs<input required type="number" min="0" value={productDraft.stock} onChange={e => setProductDraft(d => ({ ...d, stock: e.target.value }))} /></label></div><label className="fm-upload-label"><span><Upload size={18} /> Upload product photo <small>PNG, JPG or WEBP · up to 2 MB for demo</small></span><input type="file" accept="image/*" onChange={productImageChanged} /></label>{productDraft.image && <div className="fm-upload-preview"><img src={productDraft.image} alt="Product preview" /><span>Image preview</span><button type="button" onClick={() => setProductDraft(d => ({ ...d, image: "" }))}>Remove</button></div>}<div className="fm-modal-actions"><button type="button" className="fm-secondary" onClick={() => setProductModal(false)}>Cancel</button><button className="fm-primary" type="submit"><Check size={16} /> Save product</button></div></form></div>}

      {bannerModal && <div className="fm-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setBannerModal(false); }}><form className="fm-modal" onSubmit={saveBanner}><div className="fm-modal-heading"><div><span className="fm-eyebrow">STOREFRONT</span><h2>{editingBanner ? "Edit banner" : "Add homepage banner"}</h2></div><button type="button" className="fm-icon-button" onClick={() => setBannerModal(false)}><X size={20} /></button></div><label>Banner heading<input required value={bannerDraft.title} onChange={e => setBannerDraft(d => ({ ...d, title: e.target.value }))} placeholder="Fresh cuts. Delivered fresh." /></label><label>Description<input value={bannerDraft.subtitle} onChange={e => setBannerDraft(d => ({ ...d, subtitle: e.target.value }))} placeholder="Quality chicken for everyday meals." /></label><label>Button text<input value={bannerDraft.button} onChange={e => setBannerDraft(d => ({ ...d, button: e.target.value }))} /></label><label className="fm-upload-label"><span><Upload size={18} /> Upload banner image <small>Landscape image recommended · up to 2 MB for demo</small></span><input type="file" accept="image/*" onChange={bannerImageChanged} /></label>{bannerDraft.image && <div className="fm-upload-preview fm-upload-preview-wide"><img src={bannerDraft.image} alt="Banner preview" /><span>Banner preview</span><button type="button" onClick={() => setBannerDraft(d => ({ ...d, image: "" }))}>Remove</button></div>}<div className="fm-modal-actions"><button type="button" className="fm-secondary" onClick={() => setBannerModal(false)}>Cancel</button><button className="fm-primary" type="submit"><Check size={16} /> Save banner</button></div></form></div>}
      {notice && <div className="fm-toast"><Check size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
    </div>
  );
}

function IndianRupeeIcon() {
  return <span className="fm-rupee-icon">₹</span>;
}
function Stat({ icon, label, value, foot }: { icon: React.ReactNode; label: string; value: string; foot: string }) {
  return <article className="fm-stat-card"><div className="fm-stat-top"><span>{icon}</span><small>{label}</small></div><strong className="fm-stat-value">{value}</strong><p>{foot}</p></article>;
}
function Status({ value }: { value: string }) {
  const className = value.toLowerCase().replaceAll(" ", "-");
  return <span className={`fm-status ${className}`}><i />{value}</span>;
}

import { useEffect, useMemo, useState } from "react";
import {
  Activity, BadgePercent, BarChart3, Check, CircleUserRound,
  ClipboardList, Image as ImageIcon, LayoutDashboard, Menu,
  MessageSquare, Package, Search, Settings, ShieldCheck,
  ShoppingBag, Truck, Users, MapPin, RefreshCw, Eye, EyeOff,
  Pencil, Trash2, Plus, X
} from "lucide-react";
import api from "./api";
import "./Admin.css";

/* -------------------- TYPES -------------------- */

type Section =
  | "Overview"
  | "Products & Inventory"
  | "Homepage Banners"
  | "Customer Reviews"
  | "Customers"
  | "Orders"
  | "Delivery Apartments"
  | "Coupons & Offers"
  | "Reports"
  | "Settings";

type ProductPack = {
  id?: number;
  pack_size: string;
  price: number;
  original_price: number | null;
  is_active: boolean;
};

type Product = {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId: number;
  pack: string;
  price: number;
  oldPrice: number;
  stock: number;
  active: boolean;
  image: string;
  packs: ProductPack[];
};

type BackendCategory = {
  id: number;
  name: string;
};

type BackendProduct = {
  id: number;
  name: string;
  description: string;
  category: number;
  category_name: string;
  pack_size: string;
  price: string | number;
  original_price: string | number | null;
  stock_quantity: number;
  image: string | null;
  is_active: boolean;
  packs: {
    id: number;
    pack_size: string;
    price: string | number;
    original_price: string | number | null;
    is_active: boolean;
  }[];
};

type Banner = {
  id: number;
  title: string;
  subtitle: string;
  button_text: string;
  image: string;
  image_url?: string | null;
  is_active: boolean;
};

type Review = {
  id: number;
  customer: string;
  product: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
};

type BackendReview = {
  id: number;
  customer_name: string;
  customer_email: string;
  product: number;
  product_name: string;
  rating: number;
  comment: string;
  approved: boolean;
  created_at: string;
};

type BackendCustomer = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
};

type Apartment = {
  id: number;
  name: string;
  area: string;
  full_address: string;
  pincode: string;
  latitude: string | number | null;
  longitude: string | number | null;
  is_approved: boolean;
  is_active: boolean;
  created_at?: string;
};

type Coupon = {
  id: number;
  code: string;
  type: "Percentage" | "Fixed";
  value: number;
  minimum: number;
  expiry: string;
  active: boolean;
  usedCount: number;
  maxUses: number | null;
};

type BackendCoupon = {
  id: number;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: string | number;
  minimum_order_amount: string | number;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
};

type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

type BackendOrder = {
  id: number;
  customer_email: string;
  status: OrderStatus;
  status_display: string;
  payment_method: string;
  payment_method_display: string;
  payment_status: string;
  total_amount: string | number;
  apartment_name: string;
  delivery_pincode: string;
  flat_number: string;
  floor: string;
  landmark: string;
  phone: string;
  items: {
    id: number;
    product_name?: string;
    product?: string;
    pack_size?: string;
    quantity: number;
    unit_price: string | number;
    line_total?: string | number;
  }[];
  created_at: string;
  updated_at: string;
};

/* -------------------- DEMO DATA -------------------- */

const fallbackImage =
  "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=80";

const money = (amount: number) =>
  `₹${amount.toLocaleString("en-IN")}`;

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: []
};

const statusLabels: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled"
};

/* -------------------- ADMIN COMPONENT -------------------- */

export default function Admin() {
  const [section, setSection] = useState<Section>("Overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  // Products and categories are loaded from Django, not localStorage.
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<BackendCategory[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  // Homepage banners are loaded and saved through Django.
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [bannersError, setBannersError] = useState("");
  const [savingBanner, setSavingBanner] = useState(false);
  // Customer reviews are loaded and managed through Django.
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState("");
  const [updatingReviewId, setUpdatingReviewId] = useState<number | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({
    customer: "",
    product: "",
    rating: "5",
    comment: "",
    approved: false
  });
  // Real Django customers
  const [customers, setCustomers] = useState<BackendCustomer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customersError, setCustomersError] = useState("");
  const [customerStatusFilter, setCustomerStatusFilter] = useState<"all" | "active" | "blocked">("all");
  const [updatingCustomerId, setUpdatingCustomerId] = useState<number | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [apartmentsLoading, setApartmentsLoading] = useState(false);
  const [apartmentsError, setApartmentsError] = useState("");
  const [savingApartment, setSavingApartment] = useState(false);
  const [editingApartmentId, setEditingApartmentId] = useState<number | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState("");
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [updatingCouponId, setUpdatingCouponId] = useState<number | null>(null);

  // Real Django orders
  const [backendOrders, setBackendOrders] = useState<BackendOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Product and banner forms
  const [productModal, setProductModal] = useState(false);
  const [bannerModal, setBannerModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [productDraft, setProductDraft] = useState({
    name: "",
    description: "",
    category: "",
    pack: "500 g",
    price: "179",
    oldPrice: "219",
    stock: "10"
  });

  const [productPacksDraft, setProductPacksDraft] = useState<Array<{
    id?: number;
    pack_size: string;
    price: string;
    original_price: string;
    is_active: boolean;
  }>>([{ pack_size: "500 g", price: "179", original_price: "219", is_active: true }]);

  const [bannerDraft, setBannerDraft] = useState({
    title: "",
    subtitle: "",
    button_text: "Shop chicken",
    imageFile: null as File | null,
    imagePreview: ""
  });

  const emptyApartmentDraft = {
    name: "",
    area: "",
    full_address: "",
    pincode: "",
    latitude: "",
    longitude: "",
    is_approved: false,
    is_active: true
  };
  const [apartmentDraft, setApartmentDraft] = useState(emptyApartmentDraft);

  const [couponDraft, setCouponDraft] = useState({
    code: "",
    type: "Percentage" as "Percentage" | "Fixed",
    value: "10",
    minimum: "399",
    expiry: ""
  });

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  /* -------------------- NAVIGATION -------------------- */

  const nav: { label: Section; icon: typeof LayoutDashboard }[] = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Products & Inventory", icon: Package },
    { label: "Homepage Banners", icon: ImageIcon },
    { label: "Customer Reviews", icon: MessageSquare },
    { label: "Customers", icon: Users },
    { label: "Orders", icon: ShoppingBag },
    { label: "Delivery Apartments", icon: MapPin },
    { label: "Coupons & Offers", icon: BadgePercent },
    { label: "Reports", icon: BarChart3 },
    { label: "Settings", icon: Settings }
  ];

  /* -------------------- REAL DJANGO PRODUCT API -------------------- */

  function mapBackendProduct(product: BackendProduct): Product {
    const primaryPack = product.packs?.[0];

    return {
      id: product.id,
      name: product.name,
      description: product.description || "",
      category: product.category_name || "",
      categoryId: product.category,
      pack: primaryPack?.pack_size || product.pack_size || "",
      price: Number(primaryPack?.price ?? product.price ?? 0),
      oldPrice: Number(
        primaryPack?.original_price ?? product.original_price ?? 0
      ),
      stock: Number(product.stock_quantity || 0),
      active: Boolean(product.is_active),
      image: product.image || fallbackImage,
      packs: (product.packs || []).map(pack => ({
        id: pack.id,
        pack_size: pack.pack_size,
        price: Number(pack.price),
        original_price: pack.original_price === null ? null : Number(pack.original_price),
        is_active: pack.is_active,
      })),
    };
  }

  async function fetchBackendProducts() {
    setProductsLoading(true);
    setProductsError("");

    try {
      // Load products first so a category endpoint issue does not hide the catalogue.
      const productResponse = await api.get("/admin/products/");
      const productData = productResponse.data;

      const productList: BackendProduct[] = Array.isArray(productData)
        ? productData
        : Array.isArray(productData?.results)
          ? productData.results
          : [];

      setProducts(productList.map(mapBackendProduct));

      try {
        const categoryResponse = await api.get("/admin/categories/");
        const categoryData = categoryResponse.data;
        const categoryList: BackendCategory[] = Array.isArray(categoryData)
          ? categoryData
          : Array.isArray(categoryData?.results)
            ? categoryData.results
            : [];
        setCategories(categoryList);
      } catch (categoryError: any) {
        console.error("Category loading error:", categoryError?.response?.data || categoryError);
        setCategories([]);
        setProductsError(
          "Products loaded, but categories could not be loaded. Check GET /api/admin/categories/."
        );
      }
    } catch (error: any) {
      console.error("Product loading error:", error?.response?.data || error);
      setProductsError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load products. Check your admin login and API endpoint."
      );
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => {
    fetchBackendProducts();
  }, []);

  /* -------------------- REAL DJANGO CUSTOMER API -------------------- */

  async function fetchBackendCustomers() {
    setCustomersLoading(true);
    setCustomersError("");

    try {
      const params: Record<string, string> = {};
      if (query.trim()) params.search = query.trim();
      if (customerStatusFilter !== "all") params.status = customerStatusFilter;

      const response = await api.get("/admin/customers/", { params });
      const data = response.data;
      const list: BackendCustomer[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setCustomers(list);
    } catch (error: any) {
      console.error("Customer loading error:", error?.response?.data || error);
      setCustomersError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load customers. Please log in with your admin account."
      );
    } finally {
      setCustomersLoading(false);
    }
  }

  async function updateCustomerStatus(customer: BackendCustomer) {
    const nextActive = !customer.is_active;
    const action = nextActive ? "unblock" : "block";

    if (!window.confirm(`Are you sure you want to ${action} ${customer.email || customer.username}?`)) {
      return;
    }

    setUpdatingCustomerId(customer.id);
    setCustomersError("");

    try {
      await api.patch(`/admin/customers/${customer.id}/status/`, {
        is_active: nextActive
      });
      setNotice(
        nextActive
          ? "Customer account activated successfully."
          : "Customer account blocked successfully."
      );
      await fetchBackendCustomers();
    } catch (error: any) {
      console.error("Customer status update error:", error?.response?.data || error);
      setCustomersError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to update customer account.")
      );
    } finally {
      setUpdatingCustomerId(null);
    }
  }

  useEffect(() => {
    if (section === "Customers") {
      fetchBackendCustomers();
    }
    // Fetch when the customer section or its filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, query, customerStatusFilter]);

  /* -------------------- REAL DJANGO DELIVERY APARTMENT API -------------------- */

  async function fetchBackendApartments() {
    setApartmentsLoading(true);
    setApartmentsError("");
    try {
      const response = await api.get("/admin/apartments/");
      const data = response.data;
      const list: Apartment[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];
      setApartments(list);
    } catch (error: any) {
      console.error("Apartment loading error:", error?.response?.data || error);
      setApartmentsError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load apartments. Check your admin login and API endpoint."
      );
    } finally {
      setApartmentsLoading(false);
    }
  }

  useEffect(() => {
    fetchBackendApartments();
  }, []);

  function startEditApartment(apartment: Apartment) {
    setEditingApartmentId(apartment.id);
    setApartmentDraft({
      name: apartment.name || "",
      area: apartment.area || "",
      full_address: apartment.full_address || "",
      pincode: apartment.pincode || "",
      latitude: apartment.latitude == null ? "" : String(apartment.latitude),
      longitude: apartment.longitude == null ? "" : String(apartment.longitude),
      is_approved: Boolean(apartment.is_approved),
      is_active: Boolean(apartment.is_active)
    });
  }

  function resetApartmentForm() {
    setEditingApartmentId(null);
    setApartmentDraft(emptyApartmentDraft);
  }

  async function saveApartment(e: React.FormEvent) {
    e.preventDefault();
    if (!apartmentDraft.name.trim()) {
      setNotice("Enter an apartment name.");
      return;
    }

    const payload = {
      name: apartmentDraft.name.trim(),
      area: apartmentDraft.area.trim(),
      full_address: apartmentDraft.full_address.trim(),
      pincode: apartmentDraft.pincode.trim(),
      is_approved: apartmentDraft.is_approved,
      is_active: apartmentDraft.is_active
    };

    setSavingApartment(true);
    setApartmentsError("");
    try {
      if (editingApartmentId !== null) {
        await api.patch(`/admin/apartments/${editingApartmentId}/`, payload);
        setNotice("Apartment updated successfully.");
      } else {
        await api.post("/admin/apartments/", payload);
        setNotice("Apartment added successfully.");
      }
      resetApartmentForm();
      await fetchBackendApartments();
    } catch (error: any) {
      console.error("Apartment save error:", error?.response?.data || error);
      const data = error?.response?.data;
      setApartmentsError(
        typeof data === "string" ? data : data ? JSON.stringify(data) : "Unable to save apartment."
      );
    } finally {
      setSavingApartment(false);
    }
  }

  async function updateApartment(id: number, changes: Partial<Apartment>, successMessage: string) {
    setApartmentsError("");
    try {
      await api.patch(`/admin/apartments/${id}/`, changes);
      setNotice(successMessage);
      await fetchBackendApartments();
    } catch (error: any) {
      console.error("Apartment update error:", error?.response?.data || error);
      setApartmentsError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to update apartment.")
      );
    }
  }

  async function deactivateApartment(id: number) {
    if (!window.confirm("Deactivate this apartment? It will no longer be available during checkout.")) return;
    setApartmentsError("");
    try {
      await api.delete(`/admin/apartments/${id}/`);
      setNotice("Apartment deactivated successfully.");
      await fetchBackendApartments();
    } catch (error: any) {
      console.error("Apartment deactivation error:", error?.response?.data || error);
      setApartmentsError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to deactivate apartment.")
      );
    }
  }

  /* -------------------- REAL DJANGO CUSTOMER REVIEW API -------------------- */

  async function fetchBackendReviews() {
    setReviewsLoading(true);
    setReviewsError("");

    try {
      const response = await api.get("/admin/reviews/");
      const data = response.data;
      const list: BackendReview[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setReviews(list.map(review => ({
        id: review.id,
        customer: review.customer_name || review.customer_email || "Customer",
        product: review.product_name || "Product",
        rating: Math.min(5, Math.max(0, Number(review.rating) || 0)),
        comment: review.comment || "",
        date: review.created_at
          ? new Date(review.created_at).toLocaleDateString("en-IN")
          : "",
        approved: Boolean(review.approved)
      })));
    } catch (error: any) {
      console.error("Review loading error:", error?.response?.data || error);
      setReviewsError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load customer reviews. Please log in with your admin account."
      );
    } finally {
      setReviewsLoading(false);
    }
  }

  async function addBackendReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setReviewsError("");

    if (!reviewDraft.customer || !reviewDraft.product || !reviewDraft.comment.trim()) {
      setReviewsError("Select a customer and product, and enter the review text.");
      return;
    }

    setSavingReview(true);
    try {
      await api.post("/admin/reviews/", {
        customer: Number(reviewDraft.customer),
        product: Number(reviewDraft.product),
        rating: Number(reviewDraft.rating),
        comment: reviewDraft.comment.trim(),
        approved: reviewDraft.approved
      });
      setReviewDraft({ customer: "", product: "", rating: "5", comment: "", approved: false });
      setNotice("Review saved to the database successfully.");
      await fetchBackendReviews();
    } catch (error: any) {
      console.error("Review creation error:", error?.response?.data || error);
      const data = error?.response?.data;
      setReviewsError(
        data ? (typeof data === "string" ? data : JSON.stringify(data)) : "Unable to save review. Check your admin login and review API."
      );
    } finally {
      setSavingReview(false);
    }
  }

  async function changeReviewApproval(reviewId: number, approved: boolean) {
    setUpdatingReviewId(reviewId);
    setReviewsError("");

    try {
      await api.patch(`/admin/reviews/${reviewId}/`, { approved });
      setNotice(approved ? "Review approved successfully." : "Review hidden successfully.");
      await fetchBackendReviews();
    } catch (error: any) {
      console.error("Review status update error:", error?.response?.data || error);
      setReviewsError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to update review.")
      );
    } finally {
      setUpdatingReviewId(null);
    }
  }

  async function deleteBackendReview(reviewId: number) {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;

    setUpdatingReviewId(reviewId);
    setReviewsError("");

    try {
      await api.delete(`/admin/reviews/${reviewId}/`);
      setNotice("Review deleted successfully.");
      await fetchBackendReviews();
    } catch (error: any) {
      console.error("Review deletion error:", error?.response?.data || error);
      setReviewsError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to delete review.")
      );
    } finally {
      setUpdatingReviewId(null);
    }
  }

  useEffect(() => {
    if (section === "Customer Reviews") {
      fetchBackendReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  /* -------------------- REAL ORDER API -------------------- */

  async function fetchBackendOrders() {
    setOrdersLoading(true);
    setOrdersError("");

    try {
      const response = await api.get("/admin/orders/");
      const data = response.data;

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setBackendOrders(list);
    } catch (error: any) {
      setOrdersError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load orders. Please log in with your admin account."
      );
    } finally {
      setOrdersLoading(false);
    }
  }

  useEffect(() => {
    fetchBackendOrders();
  }, []);

  useEffect(() => {
    fetchBackendCustomers();
    // Load real customer count for the Overview dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeBackendOrderStatus(
    orderId: number,
    newStatus: OrderStatus
  ) {
    setUpdatingOrderId(orderId);
    setOrdersError("");

    try {
      await api.patch(`/admin/orders/${orderId}/status/`, {
        status: newStatus,
        note: `Order status updated to ${statusLabels[newStatus]}.`
      });

      setNotice(`Order #${orderId} updated successfully.`);
      await fetchBackendOrders();
    } catch (error: any) {
      setOrdersError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to update order status."
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const activeOrders = backendOrders.filter(
    order => !["delivered", "cancelled"].includes(order.status)
  ).length;

  const deliveredRevenue = backendOrders
    .filter(order => order.status === "delivered")
    .reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

  const filteredOrders = useMemo(() => {
    const search = query.trim().toLowerCase();

    return backendOrders.filter(order =>
      String(order.id).includes(search) ||
      (order.customer_email || "").toLowerCase().includes(search) ||
      (order.apartment_name || "").toLowerCase().includes(search) ||
      (order.phone || "").toLowerCase().includes(search)
    );
  }, [backendOrders, query]);

  const filteredProducts = products.filter(product =>
    `${product.name} ${product.category}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  const activeCustomerCount = customers.filter(customer => customer.is_active).length;

  const customerDisplayName = (customer: BackendCustomer) => {
    const fullName = `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    return fullName || customer.username || customer.email || `Customer #${customer.id}`;
  };

  /* -------------------- PRODUCT FUNCTIONS -------------------- */

  function openNewProduct() {
    setEditingProduct(null);
    setProductDraft({
      name: "",
      description: "",
      category: categories[0]?.name || "",
      pack: "500 g",
      price: "179",
      oldPrice: "219",
      stock: "10",
    });
    setProductPacksDraft([
      { pack_size: "500 g", price: "179", original_price: "219", is_active: true }
    ]);
    setProductModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductDraft({
      name: product.name,
      description: product.description,
      category: product.category,
      pack: product.pack,
      price: String(product.price),
      oldPrice: String(product.oldPrice),
      stock: String(product.stock),
    });
    setProductPacksDraft(
      product.packs.length
        ? product.packs.map(pack => ({
            id: pack.id,
            pack_size: pack.pack_size,
            price: String(pack.price),
            original_price: pack.original_price === null ? "" : String(pack.original_price),
            is_active: pack.is_active,
          }))
        : [{ pack_size: product.pack || "500 g", price: String(product.price), original_price: product.oldPrice ? String(product.oldPrice) : "", is_active: true }]
    );
    setProductModal(true);
  }

  function updatePackDraft(index: number, field: "pack_size" | "price" | "original_price", value: string) {
    setProductPacksDraft(current => current.map((pack, i) =>
      i === index ? { ...pack, [field]: value } : pack
    ));
  }

  function addPackDraft() {
    setProductPacksDraft(current => [
      ...current,
      { pack_size: "", price: "", original_price: "", is_active: true }
    ]);
  }

  function removePackDraft(index: number) {
    if (productPacksDraft.length === 1) {
      setNotice("A product must have at least one pack size.");
      return;
    }
    setProductPacksDraft(current => current.filter((_, i) => i !== index));
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();

    if (!productDraft.name.trim()) {
      setNotice("Enter a product name.");
      return;
    }

    const selectedCategory = categories.find(
      category => category.name === productDraft.category
    );
    if (!selectedCategory) {
      setNotice("Please select a valid category.");
      return;
    }

    const stock = Number(productDraft.stock);
    if (!Number.isInteger(stock) || stock < 0) {
      setNotice("Enter a valid whole-number stock quantity.");
      return;
    }

    if (!productPacksDraft.length) {
      setNotice("Add at least one pack size.");
      return;
    }

    const packs = [];
    for (let index = 0; index < productPacksDraft.length; index++) {
      const pack = productPacksDraft[index];
      const price = Number(pack.price);
      const originalPrice = pack.original_price.trim() === ""
        ? null
        : Number(pack.original_price);

      if (!pack.pack_size.trim() || !Number.isFinite(price) || price < 0 ||
          (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < 0))) {
        setNotice(`Check pack ${index + 1}: enter a size and valid prices.`);
        return;
      }

      packs.push({
        ...(pack.id ? { id: pack.id } : {}),
        pack_size: pack.pack_size.trim(),
        price: price.toFixed(2),
        original_price: originalPrice === null ? null : originalPrice.toFixed(2),
        is_active: pack.is_active,
      });
    }

    const firstPack = packs[0];
    const payload = {
      name: productDraft.name.trim(),
      description: productDraft.description.trim(),
      category: selectedCategory.id,
      packs,
      // Keep legacy product price fields aligned with the first pack.
      price: firstPack.price,
      original_price: firstPack.original_price,
      stock_quantity: stock,
      is_active: editingProduct?.active ?? true,
    };

    try {
      if (editingProduct) {
        await api.patch(`/admin/products/${editingProduct.id}/`, payload);
        setNotice("Product and pack sizes updated successfully.");
      } else {
        await api.post("/admin/products/", payload);
        setNotice("Product and pack sizes added successfully.");
      }

      setProductModal(false);
      await fetchBackendProducts();
    } catch (error: any) {
      console.error("Product save error:", error?.response?.data || error);
      const data = error?.response?.data;
      setNotice(
        typeof data === "string"
          ? data
          : data
            ? JSON.stringify(data)
            : "Unable to save product. Check your connection and admin permissions."
      );
    }
  }

  async function toggleProduct(id: number) {
    const product = products.find(item => item.id === id);
    if (!product) return;

    try {
      await api.patch(`/admin/products/${id}/`, {
        is_active: !product.active,
      });
      setNotice(
        product.active
          ? "Product deactivated successfully."
          : "Product activated successfully."
      );
      await fetchBackendProducts();
    } catch (error: any) {
      console.error("Product visibility error:", error?.response?.data || error);
      setNotice(
        error?.response?.data?.detail ||
        "Unable to update product visibility."
      );
    }
  }

  async function deleteProduct(id: number) {
    if (!window.confirm("Deactivate this product? It will be hidden from customers but retained for order history.")) {
      return;
    }

    try {
      await api.delete(`/admin/products/${id}/`);
      setNotice("Product deactivated successfully.");
      await fetchBackendProducts();
    } catch (error: any) {
      console.error("Product deactivation error:", error?.response?.data || error);
      setNotice(
        error?.response?.data?.detail ||
        "Unable to deactivate product."
      );
    }
  }

  /* -------------------- REAL DJANGO BANNER API -------------------- */

  async function fetchBackendBanners() {
    setBannersLoading(true);
    setBannersError("");
    try {
      const response = await api.get("/admin/banners/");
      const data = response.data;
      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];
      const list: Banner[] = rawList.map(item => ({
        ...item,
        image: item.image_url || item.image || ""
      }));
      setBanners(list);
    } catch (error: any) {
      console.error("Banner loading error:", error?.response?.data || error);
      setBannersError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load banners. Check your admin login and GET /api/admin/banners/."
      );
    } finally {
      setBannersLoading(false);
    }
  }

  useEffect(() => {
    if (section === "Homepage Banners") fetchBackendBanners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  function openBanner(banner?: Banner) {
    setEditingBanner(banner ?? null);
    setBannerDraft({
      title: banner?.title ?? "",
      subtitle: banner?.subtitle ?? "",
      button_text: banner?.button_text ?? "Shop chicken",
      imageFile: null,
      imagePreview: banner?.image ?? ""
    });
    setBannerModal(true);
  }

  async function saveBanner(e: React.FormEvent) {
    e.preventDefault();
    if (!bannerDraft.title.trim()) {
      setNotice("Enter a banner heading.");
      return;
    }
    if (!editingBanner && !bannerDraft.imageFile) {
      setNotice("Please select a banner image.");
      return;
    }

    const formData = new FormData();
    formData.append("title", bannerDraft.title.trim());
    formData.append("subtitle", bannerDraft.subtitle.trim());
    formData.append("button_text", bannerDraft.button_text.trim());
    formData.append("is_active", String(editingBanner?.is_active ?? true));
    if (bannerDraft.imageFile) formData.append("image", bannerDraft.imageFile);

    setSavingBanner(true);
    setBannersError("");
    try {
      if (editingBanner) {
        await api.patch(`/admin/banners/${editingBanner.id}/`, formData);
        setNotice("Banner updated successfully.");
      } else {
        await api.post("/admin/banners/", formData);
        setNotice("Banner created successfully.");
      }
      setBannerModal(false);
      await fetchBackendBanners();
    } catch (error: any) {
      console.error("Banner save error:", error?.response?.data || error);
      const data = error?.response?.data;
      setBannersError(
        typeof data === "string" ? data : data ? JSON.stringify(data) : "Unable to save banner."
      );
    } finally {
      setSavingBanner(false);
    }
  }

  async function toggleBanner(banner: Banner) {
    setBannersError("");
    try {
      await api.patch(`/admin/banners/${banner.id}/`, {
        is_active: !banner.is_active
      });
      setNotice(banner.is_active ? "Banner hidden from homepage." : "Banner activated on homepage.");
      await fetchBackendBanners();
    } catch (error: any) {
      console.error("Banner status update error:", error?.response?.data || error);
      setBannersError(error?.response?.data?.detail || "Unable to update banner status.");
    }
  }

  async function deleteBanner(id: number) {
    if (!window.confirm("Delete this homepage banner? This cannot be undone.")) return;
    setBannersError("");
    try {
      await api.delete(`/admin/banners/${id}/`);
      setNotice("Banner deleted successfully.");
      await fetchBackendBanners();
    } catch (error: any) {
      console.error("Banner delete error:", error?.response?.data || error);
      setBannersError(error?.response?.data?.detail || "Unable to delete banner.");
    }
  }

  /* -------------------- OTHER FUNCTIONS -------------------- */

  /* -------------------- REAL DJANGO COUPON API -------------------- */

  function mapBackendCoupon(coupon: BackendCoupon): Coupon {
    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.discount_type === "percentage" ? "Percentage" : "Fixed",
      value: Number(coupon.discount_value),
      minimum: Number(coupon.minimum_order_amount),
      expiry: coupon.expires_at || "",
      active: Boolean(coupon.is_active),
      usedCount: Number(coupon.used_count || 0),
      maxUses: coupon.max_uses
    };
  }

  async function fetchBackendCoupons() {
    setCouponsLoading(true);
    setCouponsError("");

    try {
      const response = await api.get("/admin/coupons/");
      const data = response.data;
      const list: BackendCoupon[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.results)
          ? data.results
          : [];

      setCoupons(list.map(mapBackendCoupon));
    } catch (error: any) {
      console.error("Coupon loading error:", error?.response?.data || error);
      setCouponsError(
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Unable to load coupons. Check your admin login and GET /api/admin/coupons/."
      );
    } finally {
      setCouponsLoading(false);
    }
  }

  useEffect(() => {
    if (section === "Coupons & Offers") {
      fetchBackendCoupons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  async function addCoupon(e: React.FormEvent) {
    e.preventDefault();
    setCouponsError("");

    const value = Number(couponDraft.value);
    const minimum = Number(couponDraft.minimum);

    if (!couponDraft.code.trim()) {
      setCouponsError("Enter a coupon code.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0 ||
        (couponDraft.type === "Percentage" && value > 100)) {
      setCouponsError("Enter a valid discount. Percentage must be between 1 and 100.");
      return;
    }
    if (!Number.isFinite(minimum) || minimum < 0) {
      setCouponsError("Enter a valid minimum order amount.");
      return;
    }

    const payload = {
      code: couponDraft.code.trim().toUpperCase(),
      discount_type: couponDraft.type === "Percentage" ? "percentage" : "fixed",
      discount_value: value.toFixed(2),
      minimum_order_amount: minimum.toFixed(2),
      expires_at: couponDraft.expiry || null,
      is_active: true
    };

    setSavingCoupon(true);
    try {
      await api.post("/admin/coupons/", payload);
      setCouponDraft({
        code: "",
        type: "Percentage",
        value: "10",
        minimum: "399",
        expiry: ""
      });
      setNotice("Coupon saved to the database successfully.");
      await fetchBackendCoupons();
    } catch (error: any) {
      console.error("Coupon creation error:", error?.response?.data || error);
      const data = error?.response?.data;
      setCouponsError(
        typeof data === "string"
          ? data
          : data
            ? JSON.stringify(data)
            : "Unable to create coupon. Check your admin login and coupon API."
      );
    } finally {
      setSavingCoupon(false);
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    setUpdatingCouponId(coupon.id);
    setCouponsError("");

    try {
      await api.patch(`/admin/coupons/${coupon.id}/`, {
        is_active: !coupon.active
      });
      setNotice(coupon.active ? "Coupon paused successfully." : "Coupon activated successfully.");
      await fetchBackendCoupons();
    } catch (error: any) {
      console.error("Coupon status update error:", error?.response?.data || error);
      setCouponsError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to update coupon.")
      );
    } finally {
      setUpdatingCouponId(null);
    }
  }

  async function deleteCoupon(id: number) {
    if (!window.confirm("Delete this coupon permanently?")) return;

    setUpdatingCouponId(id);
    setCouponsError("");
    try {
      await api.delete(`/admin/coupons/${id}/`);
      setNotice("Coupon deleted successfully.");
      await fetchBackendCoupons();
    } catch (error: any) {
      console.error("Coupon deletion error:", error?.response?.data || error);
      setCouponsError(
        error?.response?.data?.detail ||
        (error?.response?.data ? JSON.stringify(error.response.data) : "Unable to delete coupon.")
      );
    } finally {
      setUpdatingCouponId(null);
    }
  }

  /* -------------------- MAIN UI -------------------- */

  return (
    <div className="fm-admin">

      <aside className={`fm-sidebar ${mobileNav ? "fm-sidebar-open" : ""}`}>
        <a className="fm-brand" href="/">
          <span className="fm-brand-mark">F</span>
          <span>
            Fresh<span>Meat</span>
            <small>ADMIN CONSOLE</small>
          </span>
        </a>

        <div className="fm-admin-label">WORKSPACE</div>

        <nav className="fm-nav">
          {nav.map(item => {
            const Icon = item.icon;

            return (
              <button
                key={item.label}
                className={section === item.label ? "active" : ""}
                onClick={() => {
                  setSection(item.label);
                  setQuery("");
                  setMobileNav(false);
                  if (item.label === "Orders") fetchBackendOrders();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.label === "Orders" && activeOrders > 0 && (
                  <b>{activeOrders}</b>
                )}
              </button>
            );
          })}
        </nav>

        <div className="fm-sidebar-bottom">
          <ShieldCheck size={17} />
          <span>
            <strong>Admin console</strong>
                 <small>Products & orders connected to Django</small>
          </span>
        </div>
      </aside>

      <main className="fm-main">

        <header className="fm-topbar">
          <button
            className="fm-mobile-menu"
            onClick={() => setMobileNav(v => !v)}
            aria-label="Toggle navigation"
          >
            <Menu size={21} />
          </button>

          <div>
            <span className="fm-breadcrumb">FreshMeat / Admin</span>
            <h1>{section}</h1>
          </div>

          <div className="fm-top-actions">
            <span className="fm-demo-pill">
              <Activity size={14} /> Admin panel
            </span>

            <div className="fm-admin-avatar">
              <CircleUserRound size={22} />
              <span>
                <strong>Store Admin</strong>
                <small>Administrator</small>
              </span>
            </div>
          </div>
        </header>

        <div className="fm-content">

          {/* OVERVIEW */}

          {section === "Overview" && (
            <>
              <div className="fm-welcome">
                <div>
                  <span className="fm-eyebrow">STORE OVERVIEW</span>
                  <h2>Good evening 👋</h2>
                  <p>Here’s what’s happening with your FreshMeat store.</p>
                </div>

                <button
                  className="fm-primary"
                  onClick={() => {
                    setSection("Products & Inventory");
                    openNewProduct();
                  }}
                >
                  <Plus size={17} /> Add product
                </button>
              </div>

              <div className="fm-stat-grid">
                <Stat
                  icon={<ShoppingBag />}
                  label="Total orders"
                  value={String(backendOrders.length)}
                  foot={`${activeOrders} active orders`}
                />

                <Stat
                  icon={<span>₹</span>}
                  label="Delivered revenue"
                  value={money(deliveredRevenue)}
                  foot="Real Django orders"
                />

                <Stat
                  icon={<Package />}
                  label="Active products"
                  value={String(products.filter(p => p.active).length)}
                  foot={`${products.filter(p => p.stock <= 10).length} low-stock items`}
                />

                <Stat
                  icon={<Users />}
                  label="Customers"
                  value={String(customers.length)}
                  foot={`${activeCustomerCount} active in current customer list`}
                />
              </div>

              <div className="fm-overview-grid">
                <section className="fm-panel">
                  <div className="fm-panel-heading">
                    <div>
                      <h3>Recent orders</h3>
                      <p>Latest orders from Django</p>
                    </div>
                    <button
                      className="fm-text-button"
                      onClick={() => {
                        setSection("Orders");
                        fetchBackendOrders();
                      }}
                    >
                      View all
                    </button>
                  </div>

                  <div className="fm-table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {backendOrders.slice(0, 5).map(order => (
                          <tr key={order.id}>
                            <td><strong>#{order.id}</strong></td>
                            <td>{order.customer_email}</td>
                            <td>{money(Number(order.total_amount))}</td>
                            <td>
                              <Status value={statusLabels[order.status]} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {backendOrders.length === 0 && (
                      <p className="fm-empty-inline">
                        {ordersLoading ? "Loading orders..." : "No orders found."}
                      </p>
                    )}
                  </div>
                </section>

                <section className="fm-panel">
                  <div className="fm-panel-heading">
                    <div>
                      <h3>Inventory alerts</h3>
                       <p>Products with 10 or fewer units in stock</p>
                    </div>
                  </div>

                  {products.filter(p => p.stock <= 10).map(p => (
                    <div className="fm-stock-alert" key={p.id}>
                      <img src={p.image} alt="" />
                      <span>
                        <strong>{p.name}</strong>
                         <small>{p.stock} units left</small>
                      </span>
                      <span className="fm-low-stock">Low stock</span>
                    </div>
                  ))}
                </section>
              </div>
            </>
          )}

          {/* PRODUCTS */}

          {section === "Products & Inventory" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Products & inventory</h2>
                  <p>Manage products, prices and stock.</p>
                </div>
                <div className="fm-row-actions">
                  <button
                    className="fm-secondary"
                    onClick={fetchBackendProducts}
                    disabled={productsLoading}
                  >
                    <RefreshCw size={16} />
                    {productsLoading ? "Loading..." : "Refresh products"}
                  </button>
                  <button className="fm-primary" onClick={openNewProduct}>
                    <Plus size={17} /> Add product
                  </button>
                </div>
              </div>

              <div className="fm-toolbar">
                <label className="fm-search">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search products..."
                  />
                </label>
                <span>{filteredProducts.length} products</span>
              </div>

              {productsError && (
                <div className="fm-note">
                  <ShieldCheck size={18} />
                  <span>{productsError}</span>
                </div>
              )}

              {productsLoading && (
                <div className="fm-panel fm-empty-inline">
                  Loading products from Django...
                </div>
              )}

              <div className="fm-panel fm-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category / pack</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Visibility</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!productsLoading && filteredProducts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="fm-product-cell">
                            <img src={p.image} alt={p.name} />
                            <span>
                              <strong>{p.name}</strong>
                              <small>ID: {p.id}</small>
                            </span>
                          </div>
                        </td>
                        <td>{p.category}<small>{p.pack}</small></td>
                        <td>{money(p.price)}</td>
                        <td>{p.stock}</td>
                        <td><Status value={p.active ? "Active" : "Hidden"} /></td>
                        <td>
                          <div className="fm-row-actions">
                            <button onClick={() => openEditProduct(p)} title="Edit">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => toggleProduct(p.id)} title="Toggle visibility">
                              {p.active ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                            <button
                              onClick={() => deleteProduct(p.id)}
                              title="Deactivate product"
                              disabled={productsLoading}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!productsLoading && filteredProducts.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <p className="fm-empty-inline">
                            {productsError
                              ? "Products could not be loaded."
                              : "No products found. Add your first product."}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* BANNERS */}

          {section === "Homepage Banners" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Homepage banners</h2>
                  <p>Manage promotional banners stored in your Django database.</p>
                </div>
                <div className="fm-row-actions">
                  <button className="fm-secondary" onClick={fetchBackendBanners} disabled={bannersLoading}>
                    <RefreshCw size={16} /> {bannersLoading ? "Loading..." : "Refresh banners"}
                  </button>
                  <button className="fm-primary" onClick={() => openBanner()}>
                    <Plus size={17} /> Add banner
                  </button>
                </div>
              </div>

              {bannersError && <div className="fm-note"><ShieldCheck size={18} /><span>{bannersError}</span></div>}
              {bannersLoading && <div className="fm-panel fm-empty-inline">Loading banners from Django...</div>}

              <div className="fm-banner-grid">
                {!bannersLoading && banners.map(b => (
                  <article className="fm-banner-card" key={b.id}>
                    <div
                      className="fm-banner-image"
                      style={{
                        backgroundImage: `linear-gradient(90deg, rgba(31,16,46,.78), rgba(31,16,46,.08)), url("${b.image || fallbackImage}")`
                      }}
                    >
                      <span className="fm-banner-preview-label">HOMEPAGE PREVIEW</span>
                      <h3>{b.title}</h3>
                      <p>{b.subtitle}</p>
                      <span className="fm-banner-cta">{b.button_text} →</span>
                    </div>
                    <div className="fm-banner-card-footer">
                      <Status value={b.is_active ? "Active" : "Hidden"} />
                      <div className="fm-row-actions">
                        <button onClick={() => openBanner(b)} title="Edit banner"><Pencil size={16} /></button>
                        <button onClick={() => toggleBanner(b)} title={b.is_active ? "Hide banner" : "Activate banner"}>
                          {b.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={() => deleteBanner(b.id)} title="Delete banner"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!bannersLoading && banners.length === 0 && (
                <div className="fm-panel fm-empty-inline">{bannersError ? "Banners could not be loaded." : "No banners found. Add your first homepage banner."}</div>
              )}
            </>
          )}

          {/* REVIEWS */}

          {section === "Customer Reviews" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Customer reviews</h2>
                  <p>Add a review, save it to Django, and choose whether it is published.</p>
                </div>
                <button type="button" className="fm-secondary-button" onClick={() => { fetchBackendReviews(); fetchBackendCustomers(); fetchBackendProducts(); }} disabled={reviewsLoading}>
                  <RefreshCw size={15} /> {reviewsLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <form className="fm-panel" onSubmit={addBackendReview} style={{ marginBottom: 20, padding: 20 }}>
                <div className="fm-modal-heading" style={{ marginBottom: 16 }}>
                  <div>
                    <span className="fm-eyebrow">ADMINISTRATOR</span>
                    <h3 style={{ margin: "5px 0 0" }}>Add a customer review</h3>
                  </div>
                </div>
                <div className="fm-form-two">
                  <label>
                    Customer
                    <select required value={reviewDraft.customer} onChange={e => setReviewDraft(d => ({ ...d, customer: e.target.value }))}>
                      <option value="">Select customer</option>
                      {customers.filter(c => c.is_active).map(c => (
                        <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.username} ({c.email})</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Product
                    <select required value={reviewDraft.product} onChange={e => setReviewDraft(d => ({ ...d, product: e.target.value }))}>
                      <option value="">Select product</option>
                      {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Rating
                    <select value={reviewDraft.rating} onChange={e => setReviewDraft(d => ({ ...d, rating: e.target.value }))}>
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} / 5 stars</option>)}
                    </select>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <input type="checkbox" checked={reviewDraft.approved} onChange={e => setReviewDraft(d => ({ ...d, approved: e.target.checked }))} />
                    Publish on homepage immediately
                  </label>
                </div>
                <label style={{ display: "block", marginTop: 14 }}>
                  Review
                  <textarea required rows={3} value={reviewDraft.comment} onChange={e => setReviewDraft(d => ({ ...d, comment: e.target.value }))} placeholder="Write the customer's feedback..." />
                </label>
                <div className="fm-modal-actions" style={{ marginTop: 14 }}>
                  <button className="fm-primary-button" type="submit" disabled={savingReview || customers.length === 0 || products.length === 0}>
                    <Plus size={16} /> {savingReview ? "Saving..." : "Save review"}
                  </button>
                </div>
                {(customers.length === 0 || products.length === 0) && <p style={{ marginTop: 10 }}>Customer or product list is empty. Refresh or check the Customers and Products APIs.</p>}
              </form>

              {reviewsError && (
                <div className="fm-panel fm-empty-inline" role="alert">
                  {reviewsError}
                </div>
              )}

              {reviewsLoading && reviews.length === 0 && (
                <div className="fm-panel fm-empty-inline">Loading customer reviews...</div>
              )}

              {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                <div className="fm-panel fm-empty-inline">No customer reviews found yet.</div>
              )}

              <div className="fm-review-list">
                {reviews.map(r => (
                  <article className="fm-review-card" key={r.id}>
                    <div className="fm-review-avatar">
                      {r.customer.slice(0, 1).toUpperCase()}
                    </div>

                    <div className="fm-review-body">
                      <div className="fm-review-top">
                        <div>
                          <strong>{r.customer}</strong>
                          <small>{r.product} · {r.date}</small>
                        </div>
                        <div className="fm-stars">
                          {"★".repeat(r.rating)}
                          <span>{"★".repeat(5 - r.rating)}</span>
                        </div>
                      </div>

                      <p>{r.comment}</p>

                      <div className="fm-review-footer">
                        <Status value={r.approved ? "Published" : "Pending"} />
                        <div className="fm-row-actions">
                          <button
                            disabled={updatingReviewId === r.id}
                            onClick={() => changeReviewApproval(r.id, !r.approved)}
                          >
                            {r.approved ? <EyeOff size={15} /> : <Check size={15} />}
                            {updatingReviewId === r.id
                              ? "Updating..."
                              : r.approved ? "Hide" : "Approve"}
                          </button>
                          <button
                            disabled={updatingReviewId === r.id}
                            onClick={() => deleteBackendReview(r.id)}
                          >
                            <Trash2 size={15} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {/* CUSTOMERS */}

          {section === "Customers" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Customer accounts</h2>
                  <p>View registered customers and manage account access from Django.</p>
                </div>
                <button
                  className="fm-secondary"
                  type="button"
                  onClick={fetchBackendCustomers}
                  disabled={customersLoading}
                >
                  <RefreshCw size={16} />
                  {customersLoading ? "Loading..." : "Refresh customers"}
                </button>
              </div>

              <div className="fm-toolbar">
                <label className="fm-search">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search name, username or email..."
                  />
                </label>

                <select
                  className="fm-status-select"
                  value={customerStatusFilter}
                  onChange={e => setCustomerStatusFilter(e.target.value as "all" | "active" | "blocked")}
                  aria-label="Filter customers by account status"
                >
                  <option value="all">All customers</option>
                  <option value="active">Active customers</option>
                  <option value="blocked">Blocked customers</option>
                </select>

                <span>{customers.length} customers</span>
              </div>

              {customersError && (
                <div className="fm-note">
                  <ShieldCheck size={18} />
                  <span>{customersError}</span>
                </div>
              )}

              <div className="fm-panel fm-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Username</th>
                      <th>Joined</th>
                      <th>Last login</th>
                      <th>Account</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!customersLoading && customers.map(customer => (
                      <tr key={customer.id}>
                        <td>
                          <strong>{customerDisplayName(customer)}</strong>
                          <small>{customer.email || "No email provided"}</small>
                        </td>
                        <td>{customer.username || "—"}</td>
                        <td>
                          {customer.date_joined
                            ? new Date(customer.date_joined).toLocaleDateString("en-IN")
                            : "—"}
                        </td>
                        <td>
                          {customer.last_login
                            ? new Date(customer.last_login).toLocaleString("en-IN")
                            : "Never"}
                        </td>
                        <td>
                          <Status value={customer.is_active ? "Active" : "Blocked"} />
                        </td>
                        <td>
                          <button
                            className="fm-secondary small"
                            type="button"
                            disabled={updatingCustomerId === customer.id}
                            onClick={() => updateCustomerStatus(customer)}
                          >
                            {updatingCustomerId === customer.id
                              ? "Updating..."
                              : customer.is_active
                                ? "Block"
                                : "Unblock"}
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!customersLoading && customers.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <p className="fm-empty-inline">
                            {customersError
                              ? "Customers could not be loaded."
                              : "No customers found."}
                          </p>
                        </td>
                      </tr>
                    )}

                    {customersLoading && (
                      <tr>
                        <td colSpan={6}>
                          <p className="fm-empty-inline">Loading customers from Django...</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* REAL DJANGO ORDERS */}

          {section === "Orders" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Order management</h2>
                  <p>Manage real customer orders from your Django database.</p>
                </div>

                <button
                  className="fm-primary"
                  onClick={fetchBackendOrders}
                  disabled={ordersLoading}
                >
                  <RefreshCw size={16} />
                  {ordersLoading ? "Loading..." : "Refresh orders"}
                </button>
              </div>

              <div className="fm-toolbar">
                <label className="fm-search">
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search order ID, email or apartment..."
                  />
                </label>

                <span>{filteredOrders.length} orders</span>
              </div>

              {ordersError && (
                <div className="fm-note">
                  <ShieldCheck size={18} />
                  <span>{ordersError}</span>
                </div>
              )}

              {ordersLoading ? (
                <div className="fm-panel fm-empty-inline">
                  Loading customer orders...
                </div>
              ) : (
                <div className="fm-panel fm-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Customer</th>
                        <th>Delivery address</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Update status</th>
                        <th>Details</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map(order => (
                        <tr key={order.id}>
                          <td><strong>#{order.id}</strong></td>

                          <td>
                            <strong>{order.customer_email}</strong>
                            <small>{order.phone}</small>
                          </td>

                          <td>
                            <strong>{order.apartment_name}</strong>
                            <small>
                              Flat {order.flat_number || "—"},
                              {" "}Floor {order.floor || "—"}
                            </small>
                          </td>

                          <td>
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString("en-IN")
                              : "—"}
                          </td>

                          <td>
                            <strong>{money(Number(order.total_amount || 0))}</strong>
                          </td>

                          <td>
                            <Status value={statusLabels[order.status]} />
                          </td>

                          <td>
                            <select
                              className="fm-status-select"
                              value={order.status}
                              disabled={
                                updatingOrderId === order.id ||
                                allowedTransitions[order.status].length === 0
                              }
                              onChange={e =>
                                changeBackendOrderStatus(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                            >
                              <option value={order.status}>
                                {statusLabels[order.status]}
                              </option>

                              {allowedTransitions[order.status].map(status => (
                                <option key={status} value={status}>
                                  {statusLabels[status]}
                                </option>
                              ))}
                            </select>

                            {updatingOrderId === order.id && (
                              <small>Updating...</small>
                            )}
                          </td>

                          <td>
                            <button
                              className="fm-secondary small"
                              onClick={() => {
                                const itemDetails = (order.items || []).map(item => {
                                  const name = item.product_name || item.product || "Product";
                                  const total = item.line_total
                                    ? money(Number(item.line_total))
                                    : money(Number(item.unit_price) * item.quantity);

                                  return `${name} (${item.pack_size || ""}) x ${item.quantity} = ${total}`;
                                }).join("\n");

                                window.alert(
                                  `Order #${order.id}\n\n` +
                                  `Customer: ${order.customer_email}\n` +
                                  `Phone: ${order.phone}\n` +
                                  `Apartment: ${order.apartment_name}\n` +
                                  `Flat: ${order.flat_number || "N/A"}\n` +
                                  `Floor: ${order.floor || "N/A"}\n` +
                                  `Landmark: ${order.landmark || "N/A"}\n` +
                                  `Pincode: ${order.delivery_pincode || "N/A"}\n` +
                                  `Payment: ${order.payment_method_display || order.payment_method}\n` +
                                  `Payment status: ${order.payment_status}\n` +
                                  `Total: ${money(Number(order.total_amount))}\n\n` +
                                  `Products:\n${itemDetails || "No item details available"}`
                                );
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredOrders.length === 0 && (
                    <p className="fm-empty-inline">
                      {ordersError ? "Orders could not be loaded." : "No customer orders found."}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* APARTMENTS */}

          {section === "Delivery Apartments" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Delivery apartments</h2>
                  <p>Manage apartment addresses, approval and checkout availability from Django.</p>
                </div>
                <button
                  className="fm-secondary"
                  type="button"
                  onClick={fetchBackendApartments}
                  disabled={apartmentsLoading}
                >
                  <RefreshCw size={16} />
                  {apartmentsLoading ? "Loading..." : "Refresh apartments"}
                </button>
              </div>

              <form className="fm-inline-form" onSubmit={saveApartment}>
                <label>
                  Apartment name
                  <input required value={apartmentDraft.name}
                    onChange={e => setApartmentDraft(d => ({ ...d, name: e.target.value }))}
                    placeholder="Apartment name" />
                </label>
                <label>
                  Area / locality
                  <input value={apartmentDraft.area}
                    onChange={e => setApartmentDraft(d => ({ ...d, area: e.target.value }))}
                    placeholder="Area / locality" />
                </label>
                <label>
                  PIN code
                  <input value={apartmentDraft.pincode} maxLength={10}
                    onChange={e => setApartmentDraft(d => ({ ...d, pincode: e.target.value }))}
                    placeholder="PIN code" />
                </label>
                <label>
                  Full address
                  <input value={apartmentDraft.full_address}
                    onChange={e => setApartmentDraft(d => ({ ...d, full_address: e.target.value }))}
                    placeholder="Full address" />
                </label>
                <div className="fm-row-actions">
                  <label className="fm-check-label">
                    <input type="checkbox" checked={apartmentDraft.is_approved}
                      onChange={e => setApartmentDraft(d => ({ ...d, is_approved: e.target.checked }))} />
                    Approved for checkout
                  </label>
                  <label className="fm-check-label">
                    <input type="checkbox" checked={apartmentDraft.is_active}
                      onChange={e => setApartmentDraft(d => ({ ...d, is_active: e.target.checked }))} />
                    Active
                  </label>
                </div>
                <div className="fm-row-actions">
                  <button className="fm-primary" type="submit" disabled={savingApartment}>
                    <Plus size={16} /> {savingApartment ? "Saving..." : editingApartmentId !== null ? "Save changes" : "Add apartment"}
                  </button>
                  {editingApartmentId !== null && (
                    <button className="fm-secondary" type="button" onClick={resetApartmentForm}>
                      Cancel edit
                    </button>
                  )}
                </div>
              </form>

              {apartmentsError && (
                <div className="fm-note">
                  <ShieldCheck size={18} />
                  <span>{apartmentsError}</span>
                </div>
              )}

              <div className="fm-panel fm-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Apartment</th>
                      <th>Area / address</th>
                      <th>PIN code</th>
                      <th>Approval</th>
                      <th>Availability</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!apartmentsLoading && apartments.map(apartment => (
                      <tr key={apartment.id}>
                        <td>
                          <strong>{apartment.name}</strong>
                          <small>ID: {apartment.id}</small>
                        </td>
                        <td>
                          {apartment.area || "—"}
                          <small>{apartment.full_address || "No full address added"}</small>
                        </td>
                        <td>{apartment.pincode || "—"}</td>
                        <td>
                          <Status value={apartment.is_approved ? "Approved" : "Pending"} />
                        </td>
                        <td>
                          <Status value={apartment.is_active ? "Active" : "Inactive"} />
                        </td>
                        <td>
                          <div className="fm-row-actions">
                            <button type="button" title="Edit apartment" onClick={() => startEditApartment(apartment)}>
                              <Pencil size={16} />
                            </button>
                            <button type="button" className="fm-secondary small"
                              onClick={() => updateApartment(
                                apartment.id,
                                { is_approved: !apartment.is_approved },
                                apartment.is_approved ? "Apartment approval removed." : "Apartment approved."
                              )}>
                              {apartment.is_approved ? "Reject" : "Approve"}
                            </button>
                            <button type="button" className="fm-secondary small"
                              onClick={() => updateApartment(
                                apartment.id,
                                { is_active: !apartment.is_active },
                                apartment.is_active ? "Apartment deactivated." : "Apartment activated."
                              )}>
                              {apartment.is_active ? "Deactivate" : "Activate"}
                            </button>
                            {apartment.is_active && (
                              <button type="button" title="Deactivate apartment" onClick={() => deactivateApartment(apartment.id)}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!apartmentsLoading && apartments.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <p className="fm-empty-inline">
                            {apartmentsError ? "Apartments could not be loaded." : "No apartments found. Add your first apartment."}
                          </p>
                        </td>
                      </tr>
                    )}
                    {apartmentsLoading && (
                      <tr><td colSpan={6}><p className="fm-empty-inline">Loading apartments from Django...</p></td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* COUPONS */}

          {section === "Coupons & Offers" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Coupons & offers</h2>
                  <p>Manage discounts and promotional codes saved in your Django database.</p>
                </div>
                <button
                  className="fm-secondary"
                  type="button"
                  onClick={fetchBackendCoupons}
                  disabled={couponsLoading}
                >
                  <RefreshCw size={16} /> {couponsLoading ? "Loading..." : "Refresh coupons"}
                </button>
              </div>

              {couponsError && (
                <div className="fm-note" role="alert">
                  <ShieldCheck size={18} />
                  <span>{couponsError}</span>
                </div>
              )}

              <form className="fm-inline-form fm-coupon-form" onSubmit={addCoupon}>
                <label>
                  Coupon code
                  <input
                    required
                    value={couponDraft.code}
                    onChange={e => setCouponDraft(d => ({ ...d, code: e.target.value.toUpperCase() }))}
                    placeholder="FRESH15"
                  />
                </label>

                <label>
                  Discount type
                  <select
                    value={couponDraft.type}
                    onChange={e => setCouponDraft(d => ({
                      ...d,
                      type: e.target.value as "Percentage" | "Fixed"
                    }))}
                  >
                    <option>Percentage</option>
                    <option>Fixed</option>
                  </select>
                </label>

                <label>
                  Value
                  <input
                    type="number"
                    min="1"
                    value={couponDraft.value}
                    onChange={e => setCouponDraft(d => ({ ...d, value: e.target.value }))}
                  />
                </label>

                <label>
                  Minimum order ₹
                  <input
                    type="number"
                    min="0"
                    value={couponDraft.minimum}
                    onChange={e => setCouponDraft(d => ({ ...d, minimum: e.target.value }))}
                  />
                </label>

                <label>
                  Expiry
                  <input
                    type="date"
                    value={couponDraft.expiry}
                    onChange={e => setCouponDraft(d => ({ ...d, expiry: e.target.value }))}
                  />
                </label>

                <button className="fm-primary" type="submit" disabled={savingCoupon}>
                  <Plus size={16} /> {savingCoupon ? "Saving..." : "Create coupon"}
                </button>
              </form>

              {couponsLoading && coupons.length === 0 && (
                <div className="fm-panel fm-empty-inline">Loading coupons from Django...</div>
              )}

              <div className="fm-coupon-grid">
                {coupons.map(c => (
                  <article className="fm-coupon-card" key={c.id}>
                    <div className="fm-coupon-icon">
                      <BadgePercent size={22} />
                    </div>
                    <div className="fm-coupon-code">{c.code}</div>
                    <h3>{c.type === "Percentage" ? `${c.value}% off` : `${money(c.value)} off`}</h3>
                    <p>Minimum order {money(c.minimum)}</p>
                    <small>Expires: {c.expiry || "Not set"}</small>
                    <small>Uses: {c.usedCount}{c.maxUses === null ? " / Unlimited" : ` / ${c.maxUses}`}</small>
                    <div className="fm-coupon-footer">
                      <Status value={c.active ? "Active" : "Paused"} />
                      <button
                        type="button"
                        className="fm-secondary small"
                        disabled={updatingCouponId === c.id}
                        onClick={() => toggleCoupon(c)}
                      >
                        {updatingCouponId === c.id ? "Updating..." : c.active ? "Pause" : "Activate"}
                      </button>
                      <button
                        type="button"
                        className="fm-icon-button"
                        disabled={updatingCouponId === c.id}
                        onClick={() => deleteCoupon(c.id)}
                        title="Delete coupon"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!couponsLoading && coupons.length === 0 && (
                <div className="fm-panel fm-empty-inline">
                  {couponsError ? "Coupons could not be loaded." : "No coupons found. Create your first coupon."}
                </div>
              )}
            </>
          )}

          {/* REPORTS */}

          {section === "Reports" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Store reports</h2>
                  <p>Summary based on real Django orders and inventory.</p>
                </div>

                <button
                  className="fm-secondary"
                  onClick={() => {
                    const csv = [
                      "Order,Customer,Apartment,Total,Status",
                      ...backendOrders.map(o =>
                        [
                          o.id,
                          `"${o.customer_email}"`,
                          `"${o.apartment_name}"`,
                          o.total_amount,
                          o.status
                        ].join(",")
                      )
                    ].join("\n");

                    const url = URL.createObjectURL(
                      new Blob([csv], { type: "text/csv" })
                    );

                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "freshmeat-orders.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <ClipboardList size={16} /> Export orders CSV
                </button>
              </div>

              <div className="fm-stat-grid">
                <Stat icon={<ShoppingBag />} label="Orders" value={String(backendOrders.length)} foot="Real orders" />
                <Stat icon={<span>₹</span>} label="Delivered revenue" value={money(deliveredRevenue)} foot="Delivered orders only" />
                <Stat icon={<Package />} label="Units in demo stock" value={String(products.reduce((n, p) => n + p.stock, 0))} foot="Demo products" />
                <Stat icon={<BadgePercent />} label="Active coupons" value={String(coupons.filter(c => c.active).length)} foot="Coupons stored in Django" />
              </div>

              <section className="fm-panel">
                <div className="fm-panel-heading">
                  <div>
                    <h3>Order status breakdown</h3>
                    <p>Real order counts by status</p>
                  </div>
                </div>

                <div className="fm-bars">
                  {(Object.keys(statusLabels) as OrderStatus[]).map(status => {
                    const count = backendOrders.filter(o => o.status === status).length;
                    const width = backendOrders.length
                      ? Math.max(0, count / backendOrders.length * 100)
                      : 0;

                    return (
                      <div className="fm-bar-row" key={status}>
                        <span>{statusLabels[status]}</span>
                        <div className="fm-bar-track">
                          <i style={{ width: `${width}%` }} />
                        </div>
                        <strong>{count}</strong>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {/* SETTINGS */}

          {section === "Settings" && (
            <>
              <div className="fm-page-heading">
                <div>
                  <h2>Store settings</h2>
                  <p>Basic storefront settings preview.</p>
                </div>
              </div>

              <section className="fm-panel fm-settings">
                <div>
                  <div className="fm-settings-icon"><Settings size={20} /></div>
                  <span><strong>Store identity</strong><small>Brand name: FreshMeat</small></span>
                  <Status value="Configured" />
                </div>

                <div>
                  <div className="fm-settings-icon"><Truck size={20} /></div>
                  <span><strong>Delivery fee</strong><small>Demo rule: ₹30 under ₹499, free above ₹499</small></span>
                  <Status value="Demo rule" />
                </div>

                <div>
                  <div className="fm-settings-icon"><ShieldCheck size={20} /></div>
                  <span><strong>Administrator security</strong><small>Django admin APIs protect order management.</small></span>
                  <Status value="Connected" />
                </div>

                <div>
                  <div className="fm-settings-icon"><ImageIcon size={20} /></div>
                  <span><strong>Media storage</strong><small>Banner uploads are stored through Django media storage; product uploads are pending.</small></span>
                  <Status value="Partially connected" />
                </div>
              </section>
            </>
          )}

        </div>

        <footer className="fm-footer">
          <span>© {new Date().getFullYear()} FreshMeat Admin</span>
          <span>Frontend dashboard · Django products & orders connected</span>
        </footer>
      </main>

      {/* PRODUCT MODAL */}

      {productModal && (
        <div
          className="fm-modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setProductModal(false);
          }}
        >
          <form className="fm-modal" onSubmit={saveProduct}>
            <div className="fm-modal-heading">
              <div>
                <span className="fm-eyebrow">CATALOGUE</span>
                <h2>{editingProduct ? "Edit product" : "Add product"}</h2>
              </div>
              <button
                type="button"
                className="fm-icon-button"
                onClick={() => setProductModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <label>
              Product name
              <input
                required
                value={productDraft.name}
                onChange={e => setProductDraft(d => ({ ...d, name: e.target.value }))}
              />
            </label>

            <label>
              Product description
              <textarea
                value={productDraft.description}
                onChange={e => setProductDraft(d => ({ ...d, description: e.target.value }))}
                placeholder="Enter product description"
                rows={3}
              />
            </label>

            <label>
              Category
              <select
                required
                value={productDraft.category}
                onChange={e => setProductDraft(d => ({ ...d, category: e.target.value }))}
              >
                <option value="">Select category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="fm-modal-heading" style={{ marginTop: 8 }}>
              <div>
                <h3>Pack sizes and prices</h3>
                <p className="fm-empty-inline">Each pack has its own price. All packs share the product stock.</p>
              </div>
              <button type="button" className="fm-secondary" onClick={addPackDraft}>
                <Plus size={15} /> Add pack
              </button>
            </div>

            {productPacksDraft.map((pack, index) => (
              <div key={pack.id ?? `new-${index}`} className="fm-form-three" style={{ alignItems: "end", marginBottom: 10 }}>
                <label>
                  Pack size
                  <input
                    required
                    placeholder="e.g. 250 g"
                    value={pack.pack_size}
                    onChange={e => updatePackDraft(index, "pack_size", e.target.value)}
                  />
                </label>
                <label>
                  Selling price ₹
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={pack.price}
                    onChange={e => updatePackDraft(index, "price", e.target.value)}
                  />
                </label>
                <label>
                  Original price ₹
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Optional"
                    value={pack.original_price}
                    onChange={e => updatePackDraft(index, "original_price", e.target.value)}
                  />
                </label>
                <button type="button" className="fm-secondary" onClick={() => removePackDraft(index)} disabled={productPacksDraft.length === 1}>
                  <Trash2 size={15} /> Remove
                </button>
              </div>
            ))}

            <label>
              Common stock quantity (shared by all packs)
              <input
                required
                type="number"
                min="0"
                step="1"
                value={productDraft.stock}
                onChange={e => setProductDraft(d => ({ ...d, stock: e.target.value }))}
              />
            </label>

            <p className="fm-empty-inline">
              Product image upload will be added separately. Existing images are preserved when editing.
            </p>

            <div className="fm-modal-actions">
              <button
                type="button"
                className="fm-secondary"
                onClick={() => setProductModal(false)}
              >
                Cancel
              </button>
              <button className="fm-primary" type="submit">
                <Check size={16} /> Save product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BANNER MODAL */}

      {bannerModal && (
        <div
          className="fm-modal-backdrop"
          onMouseDown={e => {
            if (e.target === e.currentTarget) setBannerModal(false);
          }}
        >
          <form className="fm-modal" onSubmit={saveBanner}>
            <div className="fm-modal-heading">
              <div>
                <span className="fm-eyebrow">STOREFRONT</span>
                <h2>{editingBanner ? "Edit banner" : "Add homepage banner"}</h2>
              </div>
              <button
                type="button"
                className="fm-icon-button"
                onClick={() => setBannerModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <label>
              Banner heading
              <input
                required
                value={bannerDraft.title}
                onChange={e => setBannerDraft(d => ({ ...d, title: e.target.value }))}
              />
            </label>

            <label>
              Description
              <input
                value={bannerDraft.subtitle}
                onChange={e => setBannerDraft(d => ({ ...d, subtitle: e.target.value }))}
              />
            </label>

            <label>
              Button text
              <input
                value={bannerDraft.button_text}
                onChange={e => setBannerDraft(d => ({ ...d, button_text: e.target.value }))}
              />
            </label>

            <label>
              Banner image
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0] ?? null;
                  setBannerDraft(d => ({
                    ...d,
                    imageFile: file,
                    imagePreview: file ? URL.createObjectURL(file) : d.imagePreview
                  }));
                }}
              />
              <small>{editingBanner ? "Choose a new image only if you want to replace the existing one." : "Choose an image for this banner."}</small>
            </label>
            {bannerDraft.imagePreview && (
              <img
                src={bannerDraft.imagePreview}
                alt="Banner preview"
                style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 10 }}
              />
            )}

            <div className="fm-modal-actions">
              <button
                type="button"
                className="fm-secondary"
                onClick={() => setBannerModal(false)}
              >
                Cancel
              </button>
              <button className="fm-primary" type="submit" disabled={savingBanner}>
                <Check size={16} /> {savingBanner ? "Saving..." : "Save banner"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* NOTIFICATION */}

      {notice && (
        <div className="fm-toast">
          <Check size={17} />
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}

    </div>
  );
}

/* -------------------- REUSABLE COMPONENTS -------------------- */

function Stat({
  icon,
  label,
  value,
  foot
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  foot: string;
}) {
  return (
    <article className="fm-stat-card">
      <div className="fm-stat-top">
        <span>{icon}</span>
        <small>{label}</small>
      </div>
      <strong className="fm-stat-value">{value}</strong>
      <p>{foot}</p>
    </article>
  );
}

function Status({ value }: { value: string }) {
  const className = value.toLowerCase().replaceAll(" ", "-");

  return (
    <span className={`fm-status ${className}`}>
      <i />
      {value}
    </span>
  );
}

import { useEffect, useMemo, useState } from "react";
import api from "./api";

import {

  ArrowLeft,

  ChevronDown,

  Heart,

  Minus,

  Plus,

  Search,

  ShoppingCart,

  SlidersHorizontal,

  X,

} from "lucide-react";

import "./Products.css";

type Pack = {

  weight: string;

  price: number;

  originalPrice?: number;

};

type Product = {

  id: number;

  name: string;

  category: string;

  description: string;

  image: string;

  packs: Pack[];

  popular?: boolean;

};

type ApiProduct = {
  id: number;
  name: string;
  category_name: string;
  description: string;
  image: string | null;
  pack_size: string;
  price: string;
  original_price: string | null;
  stock_quantity: number;
  is_active: boolean;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=700&auto=format&fit=crop&q=80";

const categories = [

  "All Products",

  "Curry Cut Pieces",

  "Chicken Boneless - Mini Bites",

  "Drumsticks",

  "Country Chicken with Skin",

  "Chicken Breast Boneless",

  "Chicken Mince (Keema)",

  "Chicken Leg with Thigh",

  "Chicken Liver",

];

type CartItem = {

  product: Product;

  pack: Pack;

  quantity: number;

};

type ProductsProps = {

  onBack?: () => void;

  onCartClick?: () => void;

  onAddToCart?: (item: CartItem) => void;

};

export default function Products({

  onBack,

  onCartClick,

  onAddToCart,

}: ProductsProps) {

  const [category, setCategory] = useState("All Products");
  const [products, setProducts] = useState<Product[]>([]);

  const [search, setSearch] = useState("");

  const [sort, setSort] = useState("featured");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(

    null

  );

  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);

  const [quantity, setQuantity] = useState(1);

  const [cartCount, setCartCount] = useState(0);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const [favorites, setFavorites] = useState<number[]>([]);

  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        const response = await api.get<ApiProduct[]>("/products/");

        const mappedProducts: Product[] = response.data.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category_name,
          description: item.description,
          image: item.image
            ? item.image.startsWith("http")
              ? item.image
              : `http://127.0.0.1:8000${item.image}`
            : FALLBACK_IMAGE,
          packs: [
            {
              weight: item.pack_size,
              price: Number(item.price),
              ...(item.original_price !== null
                ? { originalPrice: Number(item.original_price) }
                : {}),
            },
          ],
        }));

        if (isMounted) {
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error("Failed to load FreshMeat products:", error);

        if (isMounted) {
          setNotice(
            "Unable to load products. Please check that the Django server is running."
          );
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {

    const result = products.filter((product) => {

      const matchesCategory =

        category === "All Products" || product.category === category;

      const matchesSearch = (

        product.name +

        " " +

        product.category

      )

        .toLowerCase()

        .includes(search.toLowerCase());

      return matchesCategory && matchesSearch;

    });

    if (sort === "low") {

      result.sort((a, b) => a.packs[0].price - b.packs[0].price);

    } else if (sort === "high") {

      result.sort((a, b) => b.packs[0].price - a.packs[0].price);

    } else if (sort === "name") {

      result.sort((a, b) => a.name.localeCompare(b.name));

    }

    return result;

  }, [category, search, sort]);

  function openPackSelector(product: Product) {

    setSelectedProduct(product);

    setSelectedPack(product.packs[0]);

    setQuantity(1);

    setNotice("");

  }

  function addSelectedProduct() {

    if (!selectedProduct || !selectedPack) return;

    const item: CartItem = {

      product: selectedProduct,

      pack: selectedPack,

      quantity,

    };

    if (onAddToCart) {

      onAddToCart(item);

    } else {

      setCartItems((current) => {

        const existing = current.find(

          (cartItem) =>

            cartItem.product.id === item.product.id &&

            cartItem.pack.weight === item.pack.weight

        );

        if (existing) {

          return current.map((cartItem) =>

            cartItem.product.id === item.product.id &&

            cartItem.pack.weight === item.pack.weight

              ? { ...cartItem, quantity: cartItem.quantity + item.quantity }

              : cartItem

          );

        }

        return [...current, item];

      });

      setCartCount((count) => count + quantity);

      setNotice(

        `Added to cart: ${selectedProduct.name} | Pack: ${selectedPack.weight} | Quantity: ${quantity} | Total: ₹${selectedPack.price * quantity}`

      );

    }

    setSelectedProduct(null);

    setSelectedPack(null);

    setQuantity(1);

  }

  function toggleFavorite(id: number) {

    setFavorites((current) =>

      current.includes(id)

        ? current.filter((item) => item !== id)

        : [...current, id]

    );

  }

  return (

    <main className="products-page">

      <header className="products-header">

        <button

          className="products-back"

          onClick={onBack ?? (() => window.history.back())}

          aria-label="Go back"

        >

          <ArrowLeft size={19} />

        </button>

        <a className="products-brand" href="/" aria-label="FreshMeat home">

          <span className="products-brand-mark">F</span>

          <span>Fresh<span>Meat</span></span>

        </a>

        <div className="products-search">

          <Search size={19} />

          <input

            type="search"

            placeholder="Search chicken products..."

            value={search}

            onChange={(event) => setSearch(event.target.value)}

            aria-label="Search products"

          />

          {search && (

            <button onClick={() => setSearch("")} aria-label="Clear search">

              <X size={16} />

            </button>

          )}

        </div>

        <button

          className="products-cart-button"

          onClick={onCartClick ?? (() => setNotice(

            cartItems.length

              ? cartItems.map((item) => `${item.product.name} — ${item.pack.weight} × ${item.quantity}: ₹${item.pack.price * item.quantity}`).join(" | ") + ` | Subtotal: ₹${cartItems.reduce((sum, item) => sum + item.pack.price * item.quantity, 0)}`

              : "Your cart is empty."

          ))}

        >

          <ShoppingCart size={20} />

          <span>Cart</span>

          {cartCount > 0 && <b>{cartCount}</b>}

        </button>

      </header>

      <section className="products-hero">

        <div>

          <span className="products-eyebrow">FRESH PICKS FOR YOU</span>

          <h1>Good food starts with <span>good chicken.</span></h1>

          <p>Find your favourite cuts for everyday meals and special recipes.</p>

        </div>

        <div className="products-hero-art" aria-hidden="true">🍗</div>

      </section>

      <div className="products-breadcrumb">

        <a href="/">Home</a>

        <span>/</span>

        <span>Chicken</span>

        <span>/</span>

        <strong>{category}</strong>

      </div>

      <section className="products-content">

        <aside className="products-sidebar">

          <h2>Categories</h2>

          <div className="products-category-list">

            {categories.map((item) => (

              <button

                key={item}

                className={category === item ? "active" : ""}

                onClick={() => setCategory(item)}

              >

                <span>{item}</span>

                {category === item && <span className="category-dot" />}

              </button>

            ))}

          </div>

          <div className="products-sidebar-note">

            <span>💜</span>

            <p>Choose the cuts that make your next meal special.</p>

          </div>

        </aside>

        <section className="products-results">

          <div className="products-title-row">

            <div>

              <h2>

                {category === "All Products" ? "Chicken Products" : category}

              </h2>

              <p>

                {filteredProducts.length} products found

              </p>

            </div>

            <label className="products-sort">

              <SlidersHorizontal size={17} />

              <span>Sort:</span>

              <select

                value={sort}

                onChange={(event) => setSort(event.target.value)}

                aria-label="Sort products"

              >

                <option value="featured">Featured</option>

                <option value="low">Price: Low to High</option>

                <option value="high">Price: High to Low</option>

                <option value="name">Name: A to Z</option>

              </select>

              <ChevronDown size={15} />

            </label>

          </div>

          {notice && (

            <div className="products-notice" role="status">

              <span>{notice}</span>

              <button onClick={() => setNotice("")} aria-label="Dismiss">

                <X size={16} />

              </button>

            </div>

          )}

          {filteredProducts.length > 0 ? (

            <div className="products-grid">

              {filteredProducts.map((product) => (

                <article className="product-card" key={product.id}>

                  <div className="product-image-wrap">

                    <img

                      src={product.image}

                      alt={product.name}

                      loading="lazy"

                    />

                    {product.popular && (

                      <span className="product-tag">Popular</span>

                    )}

                    <button

                      className={`product-favorite ${

                        favorites.includes(product.id) ? "favorited" : ""

                      }`}

                      onClick={() => toggleFavorite(product.id)}

                      aria-label={

                        favorites.includes(product.id)

                          ? "Remove from favourites"

                          : "Add to favourites"

                      }

                    >

                      <Heart

                        size={18}

                        fill={

                          favorites.includes(product.id)

                            ? "currentColor"

                            : "none"

                        }

                      />

                    </button>

                  </div>

                  <div className="product-card-content">

                    <span className="product-category-label">

                      {product.category}

                    </span>

                    <h3>{product.name}</h3>

                    <p className="product-description">

                      {product.description}

                    </p>

                    <div className="product-price-row">

                      <div>

                        <strong>₹{product.packs[0].price}</strong>

                        <span> / {product.packs[0].weight}</span>

                      </div>

                    </div>

                    <button

                      className="product-add-button"

                      onClick={() => openPackSelector(product)}

                    >

                      <Plus size={17} />

                      Choose pack

                    </button>

                  </div>

                </article>

              ))}

            </div>

          ) : (

            <div className="products-empty">

              <span>🔎</span>

              <h3>No products found</h3>

              <p>Try another search or select a different category.</p>

              <button

                className="product-add-button"

                onClick={() => {

                  setSearch("");

                  setCategory("All Products");

                }}

              >

                Show all products

              </button>

            </div>

          )}

        </section>

      </section>

      <footer className="products-footer">

        <a className="products-brand" href="/">

          <span className="products-brand-mark">F</span>

          <span>Fresh<span>Meat</span></span>

        </a>

        <p>Fresh choices for your everyday cooking.</p>

        <span>© {new Date().getFullYear()} FreshMeat</span>

      </footer>

      {selectedProduct && selectedPack && (

        <div

          className="pack-modal-overlay"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              setSelectedProduct(null);

            }

          }}

        >

          <section

            className="pack-modal"

            role="dialog"

            aria-modal="true"

            aria-labelledby="pack-modal-title"

          >

            <button

              className="pack-modal-close"

              onClick={() => setSelectedProduct(null)}

              aria-label="Close"

            >

              <X size={21} />

            </button>

            <div className="pack-modal-content">

              <h2 id="pack-modal-title">{selectedProduct.category}</h2>

              <h3>Choose your preferred pack size</h3>

              <div className="pack-options">

                {selectedProduct.packs.map((pack) => (

                  <button

                    key={pack.weight}

                    className={

                      selectedPack.weight === pack.weight ? "selected" : ""

                    }

                    onClick={() => setSelectedPack(pack)}

                  >

                    <span>{pack.weight}</span>

                    <span className="pack-price-values">

                      {pack.originalPrice != null && pack.originalPrice > pack.price && (

                        <del>₹{pack.originalPrice}</del>

                      )}

                      <strong>₹{pack.price}</strong>

                    </span>

                  </button>

                ))}

              </div>

              <div className="pack-quantity-row">

                <span>Quantity</span>

                <div className="pack-quantity">

                  <button

                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}

                    disabled={quantity <= 1}

                    aria-label="Decrease quantity"

                  >

                    <Minus size={16} />

                  </button>

                  <strong>{quantity}</strong>

                  <button

                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}

                    disabled={quantity >= 20}

                    aria-label="Increase quantity"

                  >

                    <Plus size={16} />

                  </button>

                </div>

              </div>

              <button

                className="pack-confirm-button"

                onClick={addSelectedProduct}

              >

                ADD TO CART – ₹{selectedPack.price * quantity}

              </button>

              <small className="pack-demo-note">

                Offer prices shown are sample prices.

              </small>

            </div>

          </section>

        </div>

      )}

    </main>

  );

}

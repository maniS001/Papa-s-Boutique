import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useNavigate,
  useLocation,
  useParams,
} from "react-router-dom";
import "./styles.css";
import { whatsappNumber } from "./config";

const heroImages = [
  {
    url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1800&q=85",
    title: "Kurtis & Ethnic Suits",
  },
  {
    url: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1800&q=85",
    title: "Dupattas & Leggings",
  },
  {
    url: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1800&q=85",
    title: "Designer Boutique Collection",
  },
  {
    url: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=1800&q=85",
    title: "Indian Traditional Fashion",
  },
];

const fallbackProducts = [
  {
    id: "rose-midi",
    slug: "rose-garden-midi",
    name: "Rose Garden Midi",
    collection: "Kurtis",
    price: 4890,
    description:
      "A softly structured midi dress in a rose garden print, finished with a square neckline and a flowing skirt.",
    sizes: ["XS", "S", "M", "L"],
    colours: ["Rose", "Ivory"],
    stock: { XS: 3, S: 7, M: 5, L: 2 },
    image:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=1000&q=85",
    featured: true,
    published: true,
  },
  {
    id: "saffron-silk",
    slug: "saffron-silk-slip",
    name: "Saffron Silk Slip",
    collection: "Dupatta",
    price: 7290,
    description:
      "An elegant bias-cut satin slip dress with a low back and delicate adjustable straps.",
    sizes: ["S", "M", "L"],
    colours: ["Saffron"],
    stock: { S: 4, M: 6, L: 3 },
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=1000&q=85",
    featured: true,
    published: true,
  },
  {
    id: "linen-wrap",
    slug: "linen-wrap-dress",
    name: "Linen Wrap Dress",
    collection: "Leggings",
    price: 3990,
    description:
      "Breathable linen with a flattering adjustable wrap waist for effortless days out.",
    sizes: ["XS", "S", "M", "L", "XL"],
    colours: ["Oat", "Terracotta"],
    stock: { XS: 4, S: 8, M: 8, L: 4, XL: 2 },
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=85",
    featured: false,
    published: true,
  },
];

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
const api = async (path, options) => {
  const response = await fetch(`/api/${path}`, options);
  if (!response.ok)
    throw new Error(
      (await response.json().catch(() => ({}))).error || "Something went wrong",
    );
  return response.json();
};
const whatsappOrderUrl = (product) => {
  const message = `Hello PAPA'S BOUTIQUE, I would like to order this dress:\n\n*${product.name}*\nCollection: ${product.collection}\nPrice: ${money(product.price)}\nProduct: ${window.location.href}`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

function Header({ categories = [], onSelectCategory }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = React.useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCategoryClick = (cat) => {
    setDropdownOpen(false);
    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }
    if (onSelectCategory) onSelectCategory(cat);
    if (location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header>
      <Link className="brand logo" to="/" aria-label="PAPA'S BOUTIQUE home">
        <img src="/papa-boutique-logo.png" alt="PAPA'S BOUTIQUE" />
      </Link>
      <nav className="nav-menu">
        <div className="dropdown-container" ref={dropdownRef}>
          <button
            type="button"
            className="dropdown-trigger"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            Collections ▾
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu">
              <button
                type="button"
                onMouseDown={() => handleCategoryClick("All")}
                onClick={() => handleCategoryClick("All")}
              >
                All Collections
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onMouseDown={() => handleCategoryClick(cat)}
                  onClick={() => handleCategoryClick(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
function ProductCard({ product }) {
  return (
    <Link className="card" to={`/product/${product.slug}`}>
      <img src={product.image} alt={product.name} />
      <div>
        <p>{product.collection}</p>
        <h3>{product.name}</h3>
        <strong>{money(product.price)}</strong>
      </div>
    </Link>
  );
}
function Search({ value, onChange }) {
  return (
    <label className="search">
      <span aria-hidden="true">⌕</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search dresses, kurtis, dupattas..."
        aria-label="Search dresses or collections"
      />
    </label>
  );
}
function HeroCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % heroImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % heroImages.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  return (
    <section className="hero-carousel">
      {heroImages.map((img, index) => (
        <div
          key={img.url}
          className={`hero-slide ${index === currentIndex ? "active" : ""}`}
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(35, 25, 15, 0.6), rgba(35, 25, 15, 0.2)), url('${img.url}')`,
          }}
        />
      ))}
      <div className="hero-content">
        <p className="eyebrow">The new summer edit</p>
        <h1>
          PAPA'S
          <br />
          BOUTIQUE
        </h1>
        <p className="lede">
          Thoughtfully chosen Kurtis, Dupattas, Leggings &amp; silhouettes for beautiful moments.
        </p>
        <button
          type="button"
          className="button"
          onClick={(e) => {
            e.currentTarget.blur();
            document.getElementById("collections")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          Explore the collection
        </button>
      </div>
      <button className="carousel-arrow prev" onClick={prevSlide} aria-label="Previous Slide">
        ‹
      </button>
      <button className="carousel-arrow next" onClick={nextSlide} aria-label="Next Slide">
        ›
      </button>
      <div className="carousel-dots">
        {heroImages.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? "active" : ""}`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
function Home({ selectedCategory, setFilter, categories, products, visible, search, setSearch }) {
  return (
    <>
      <HeroCarousel />
      <main id="collections">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shop the boutique</p>
            <h2>New arrivals</h2>
          </div>
          <Search value={search} onChange={setSearch} />
        </div>
        <div className="category-header">
          <p className="category-subtitle">Filter by Category:</p>
        </div>
        <div className="filters">
          {["All", ...categories].map((collection) => (
            <button
              onClick={() => setFilter(collection)}
              className={selectedCategory === collection ? "active" : ""}
              key={collection}
            >
              {collection}
            </button>
          ))}
        </div>
        {visible.length ? (
          <div className="grid">
            {visible.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        ) : (
          <p className="empty">No items match that search or category.</p>
        )}
      </main>
    </>
  );
}
function ImageLightbox({ images, currentIndex, onClose, onSelectIndex }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")
        onSelectIndex((currentIndex - 1 + images.length) % images.length);
      if (e.key === "ArrowRight")
        onSelectIndex((currentIndex + 1) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, images.length, onClose, onSelectIndex]);

  if (!images || !images.length) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close lightbox">
          ✕
        </button>
        <span className="lightbox-counter">
          {currentIndex + 1} / {images.length}
        </span>
        <div className="lightbox-img-wrapper">
          <img
            src={images[currentIndex]}
            alt={`Enlarged view ${currentIndex + 1}`}
            className="lightbox-main-img"
          />
        </div>
        {images.length > 1 && (
          <>
            <button
              type="button"
              className="lightbox-arrow prev"
              onClick={() => onSelectIndex((currentIndex - 1 + images.length) % images.length)}
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              className="lightbox-arrow next"
              onClick={() => onSelectIndex((currentIndex + 1) % images.length)}
              aria-label="Next image"
            >
              ›
            </button>
            <div className="lightbox-thumbs">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`lightbox-thumb ${idx === currentIndex ? "active" : ""}`}
                  onClick={() => onSelectIndex(idx)}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    api(`products/${slug}`)
      .then(({ product }) => {
        setProduct(product);
        setActiveImageIndex(0);
      })
      .catch(() =>
        setProduct(fallbackProducts.find((item) => item.slug === slug)),
      );
  }, [slug]);

  if (!product) return <main className="notice">Loading dress details…</main>;

  const imagesList = product.images?.length
    ? product.images
    : product.image
    ? [product.image]
    : [];

  const activeImage = imagesList[activeImageIndex] || imagesList[0] || product.image;

  const totalStock = Object.values(product.stock || {}).reduce(
    (total, qty) => total + Number(qty),
    0,
  );

  return (
    <main className="product">
      <div className="product-gallery">
        <div
          className="main-image-wrapper"
          onClick={() => setLightboxOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && setLightboxOpen(true)}
          aria-label="Click to view enlarged images"
        >
          <img src={activeImage} alt={product.name} className="product-main-img" />
          <div className="zoom-hint">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
            Click to enlarge
          </div>
        </div>
        {imagesList.length > 1 && (
          <div className="product-thumb-row">
            {imagesList.map((img, idx) => (
              <button
                key={idx}
                type="button"
                className={`product-thumb-btn ${idx === activeImageIndex ? "active" : ""}`}
                onClick={() => setActiveImageIndex(idx)}
              >
                <img src={img} alt={`${product.name} preview ${idx + 1}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      <section>
        <Link className="back" to="/">
          ← Back to collection
        </Link>
        <p className="eyebrow">{product.collection}</p>
        <h1>{product.name}</h1>
        <h2>{money(product.price)}</h2>
        <p className="description">{product.description}</p>
        <div className="detail">
          <span>Available sizes</span>
          <div>
            {product.sizes.map((size) => (
              <b key={size}>{size}</b>
            ))}
          </div>
        </div>
        <div className="detail">
          <span>Colours</span>
          <p>{product.colours.join(" · ")}</p>
        </div>
        <p className={totalStock ? "in-stock" : "sold-out"}>
          {totalStock
            ? `${totalStock} pieces currently in stock`
            : "Currently sold out"}
        </p>
        <a
          className="button whatsapp"
          href={whatsappOrderUrl(product)}
          target="_blank"
          rel="noreferrer"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path
              d="M16 3a13 13 0 0 0-11.1 19.7L3 29l6.5-1.7A13 13 0 1 0 16 3Zm0 23.6a10.5 10.5 0 0 1-5.3-1.4l-.4-.2-3.8 1 1-3.7-.3-.4A10.5 10.5 0 1 1 16 26.6Zm5.8-7.8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2s-.8 1-1 1.2c-.2.2-.4.2-.7 0a8.6 8.6 0 0 1-2.5-1.5 9.3 9.3 0 0 1-1.7-2.1c-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6 0-.2-.7-1.7-1-2.3-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.5s-1.2 1.1-1.2 2.8 1.2 3.3 1.4 3.5a12.3 12.3 0 0 0 4.7 4.2c.7.3 1.2.6 1.6.7.7.2 1.4.2 1.9.1.6-.1 1.9-.8 2.1-1.6.3-.8.3-1.5.2-1.6-.1-.2-.3-.3-.6-.5Z"
              fill="currentColor"
            />
          </svg>
          Order on WhatsApp
        </a>
      </section>

      {lightboxOpen && (
        <ImageLightbox
          images={imagesList}
          currentIndex={activeImageIndex}
          onClose={() => setLightboxOpen(false)}
          onSelectIndex={setActiveImageIndex}
        />
      )}
    </main>
  );
}

const blank = {
  name: "",
  collection: "",
  price: "",
  description: "",
  sizes: "S, M, L",
  colours: "",
  stock: "S:0, M:0, L:0",
  image: "",
  images: [],
  featured: false,
  published: true,
};

function MultiImageUploader({ images = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const inputRef = React.useRef(null);

  const handleFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
    const files = Array.from(fileList);

    for (const file of files) {
      if (!allowed.includes(file.type)) {
        setUploadError(`Unsupported file type (${file.name}). Please use JPEG, PNG, WebP, GIF, or AVIF.`);
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setUploadError(`File ${file.name} is too large. Maximum size is 8 MB.`);
        return;
      }
    }

    setUploading(true);
    const newUrls = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("image", file);
        const response = await fetch("/api/admin/upload", { method: "POST", body: formData });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed.");
        if (data.url) newUrls.push(data.url);
      }
      onChange([...images, ...newUrls]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange([...images, trimmed]);
    setUrlInput("");
  };

  const removeImage = (indexToRemove) => {
    onChange(images.filter((_, idx) => idx !== indexToRemove));
  };

  const setPrimary = (index) => {
    if (index === 0) return;
    const item = images[index];
    const rest = images.filter((_, idx) => idx !== index);
    onChange([item, ...rest]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length) handleFiles(files);
  };

  return (
    <div className="image-uploader">
      <div
        className={`upload-drop-zone${uploading ? " uploading" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload images from device"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <span className="upload-spinner" aria-label="Uploading…">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="40 20" /></svg>
            Uploading images…
          </span>
        ) : (
          <span className="upload-prompt">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="24" height="24"><path d="M12 16V8m0 0-3 3m3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            Click to upload <span>multiple images</span> or drag &amp; drop
            <em>Select multiple photos of Kurtis, Dupattas, details · max 8 MB each</em>
          </span>
        )}
      </div>
      {uploadError && <p className="upload-error">{uploadError}</p>}
      <div className="upload-url-row">
        <span className="upload-divider">or add an image URL</span>
        <div className="url-add-group">
          <input
            type="text"
            placeholder="https://… or /api/images/…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())}
            aria-label="Image URL"
          />
          <button type="button" className="button-secondary" onClick={addUrl}>
            Add Image
          </button>
        </div>
      </div>
      {images.length > 0 && (
        <div className="multi-image-grid">
          {images.map((img, idx) => (
            <div key={idx} className="multi-image-card">
              <img src={img} alt={`Product photo ${idx + 1}`} />
              <div className="card-badge">{idx === 0 ? "Primary" : `#${idx + 1}`}</div>
              {idx !== 0 && (
                <button
                  type="button"
                  className="make-primary-btn"
                  onClick={() => setPrimary(idx)}
                  title="Set as main image"
                >
                  Set Main
                </button>
              )}
              <button
                type="button"
                className="preview-clear"
                onClick={() => removeImage(idx)}
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Admin() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const load = () =>
    api("admin/products")
      .then(({ products }) => {
        setProducts(products);
        setLoggedIn(true);
      })
      .catch(() => setLoggedIn(false));
  useEffect(load, []);
  const login = async (event) => {
    event.preventDefault();
    try {
      await api("auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      await load();
    } catch (error) {
      setMessage(error.message);
    }
  };
  const save = async (event) => {
    event.preventDefault();
    const toList = (value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    const stock = Object.fromEntries(
      draft.stock
        .split(",")
        .map((part) => part.trim().split(":"))
        .filter(([size, quantity]) => size && quantity !== undefined)
        .map(([size, quantity]) => [size.trim(), Number(quantity)]),
    );
    const imagesList = draft.images?.length
      ? draft.images
      : draft.image
      ? [draft.image]
      : [];
    const primaryImage = imagesList[0] || "";

    try {
      await api("admin/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          id: editing?.id,
          slug: editing?.slug,
          price: Number(draft.price),
          image: primaryImage,
          images: imagesList,
          sizes: toList(draft.sizes),
          colours: toList(draft.colours),
          stock,
        }),
      });
      setDraft(blank);
      setEditing(null);
      setMessage("Collection saved.");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };
  const edit = (product) => {
    const imagesList = product.images?.length
      ? product.images
      : product.image
      ? [product.image]
      : [];

    setEditing(product);
    setDraft({
      ...product,
      images: imagesList,
      image: imagesList[0] || "",
      sizes: product.sizes.join(", "),
      colours: product.colours.join(", "),
      stock: Object.entries(product.stock)
        .map(([size, quantity]) => `${size}:${quantity}`)
        .join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const remove = async (id) => {
    if (!confirm("Remove this item from the collection?")) return;
    await api(`admin/products/${id}`, { method: "DELETE" });
    load();
  };
  if (!loggedIn)
    return (
      <main className="login">
        <form onSubmit={login}>
          <p className="eyebrow">Private area</p>
          <h1>Boutique admin</h1>
          <p>Sign in to manage collections and inventory.</p>
          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {message && <p className="error">{message}</p>}
          <button className="button">Sign in</button>
        </form>
      </main>
    );
  return (
    <main className="admin">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Inventory workspace</p>
          <h1>{editing ? "Edit item" : "Add a new item"}</h1>
        </div>
        <button
          className="text-button"
          onClick={async () => {
            await api("auth/logout", { method: "POST" });
            navigate("/");
          }}
        >
          Sign out
        </button>
      </div>
      <form className="editor" onSubmit={save}>
        <label>
          Item name
          <input
            required
            type="text"
            value={draft.name}
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
          />
        </label>
        <label className="collection-input-group">
          Category / Collection
          <input
            required
            type="text"
            placeholder="e.g. Kurtis, Leggings, Dupatta..."
            value={draft.collection}
            onChange={(event) =>
              setDraft({ ...draft, collection: event.target.value })
            }
          />
          <div className="category-presets">
            <span className="preset-label">Quick select:</span>
            {["Kurtis", "Leggings", "Dupatta", "Sarees", "Summer Edit", "Occasion", "Everyday Ease"].map(
              (cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`preset-chip ${draft.collection === cat ? "active" : ""}`}
                  onClick={() => setDraft({ ...draft, collection: cat })}
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </label>
        {[
          ["price", "Price (₹)"],
          ["sizes", "Sizes, separated by commas"],
          ["colours", "Colours, separated by commas"],
          ["stock", "Stock, e.g. S:4, M:2"],
        ].map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              required={key !== "colours"}
              type={key === "price" ? "number" : "text"}
              value={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value })
              }
            />
          </label>
        ))}
        <label className="wide">
          Product Images (Upload multiple photos)
          <MultiImageUploader
            images={draft.images?.length ? draft.images : (draft.image ? [draft.image] : [])}
            onChange={(imgs) => setDraft({ ...draft, images: imgs, image: imgs[0] || "" })}
          />
        </label>
        <label className="wide">
          Description
          <textarea
            required
            value={draft.description}
            onChange={(event) =>
              setDraft({ ...draft, description: event.target.value })
            }
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) =>
              setDraft({ ...draft, published: event.target.checked })
            }
          />{" "}
          Publish on storefront
        </label>
        <button className="button">
          {editing ? "Update dress" : "Add dress"}
        </button>
        {editing && (
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setEditing(null);
              setDraft(blank);
            }}
          >
            Cancel edit
          </button>
        )}
        <p>{message}</p>
      </form>

      {/* Category Management Overview */}
      <div className="admin-category-panel">
        <h2>Categories Overview</h2>
        <div className="category-badges">
          {Array.from(new Set(products.map((p) => p.collection))).map((cat) => {
            const count = products.filter((p) => p.collection === cat).length;
            return (
              <div key={cat} className="category-badge">
                <span className="cat-name">{cat}</span>
                <span className="cat-count">{count} {count === 1 ? "item" : "items"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <h2>Current catalogue</h2>
      <div className="inventory">
        {products.map((product) => (
          <article key={product.id}>
            <img src={product.image} alt="" />
            <div>
              <p>{product.collection}</p>
              <h3>{product.name}</h3>
              <span>
                {Object.values(product.stock).reduce(
                  (sum, qty) => sum + Number(qty),
                  0,
                )}{" "}
                in stock · {product.published ? "Published" : "Hidden"}
              </span>
            </div>
            <button onClick={() => edit(product)}>Edit</button>
            <button className="danger" onClick={() => remove(product.id)}>
              Remove
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
function App() {
  const [products, setProducts] = useState(fallbackProducts);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const refreshProducts = () => {
    api("products")
      .then(({ products }) => setProducts(products))
      .catch(() => {});
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const categories = Array.from(
    new Set(products.map((product) => product.collection))
  ).filter(Boolean);

  const visible = products.filter((product) => {
    const matchesCollection =
      filter === "All" ||
      product.collection?.trim().toLowerCase() === filter?.trim().toLowerCase();
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      [product.name, product.collection, ...(product.colours || [])]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesCollection && matchesSearch;
  });

  return (
    <>
      <Header
        categories={categories}
        onSelectCategory={(cat) => setFilter(cat)}
      />
      <Routes>
        <Route
          path="/"
          element={
            <Home
              selectedCategory={filter}
              setFilter={setFilter}
              categories={categories}
              products={products}
              visible={visible}
              search={search}
              setSearch={setSearch}
            />
          }
        />
        <Route path="/product/:slug" element={<ProductDetail />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <footer>
        © {new Date().getFullYear()} PAPA'S BOUTIQUE · Curated with care
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

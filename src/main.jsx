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
        <Link to="/" className="hero-logo-link" aria-label="PAPA'S BOUTIQUE home">
          <img
            src="/papa-boutique-logo.png"
            alt="PAPA'S BOUTIQUE Logo"
            className="hero-logo-img"
          />
        </Link>
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
  const [shareCopied, setShareCopied] = useState(false);

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

  const handleShare = async () => {
    if (!product) return;
    const shareData = {
      title: `${product.name} | PAPA'S BOUTIQUE`,
      text: `Take a look at "${product.name}" (${product.collection}) for ${money(product.price)} at PAPA'S BOUTIQUE!`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch {
      alert("Product link: " + window.location.href);
    }
  };

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
        <div className="product-action-row">
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
          <button
            type="button"
            className={`button share-btn ${shareCopied ? "copied" : ""}`}
            onClick={handleShare}
            title="Share this dress with friends or family"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            {shareCopied ? "✓ Link Copied!" : "Share Dress"}
          </button>
        </div>
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
  buyPrice: "",
  fixedPrice: "",
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

function exportInventoryToExcel(products) {
  let totalAvailableStock = 0;
  let totalSoldUnits = 0;
  let totalBuyVal = 0;
  let totalFixedVal = 0;
  let totalSoldVal = 0;
  let totalProfit = 0;

  const rowsHtml = products.map((p, idx) => {
    const availableStock = Object.values(p.stock || {}).reduce((sum, q) => sum + (Number(q) || 0), 0);
    const buyPrice = Number(p.buyPrice) || 0;
    const fixedPrice = Number(p.fixedPrice || p.price) || 0;
    const soldCount = Number(p.soldCount) || 0;
    const soldRevenue = Number(p.totalSoldRevenue) || 0;
    const profit = soldRevenue - (buyPrice * soldCount);

    totalAvailableStock += availableStock;
    totalSoldUnits += soldCount;
    totalBuyVal += buyPrice * (availableStock + soldCount);
    totalFixedVal += fixedPrice * availableStock;
    totalSoldVal += soldRevenue;
    totalProfit += profit;

    const imgUrl = (p.images && p.images[0]) || p.image || "";
    const fullImgUrl = imgUrl.startsWith("http") ? imgUrl : `${window.location.origin}${imgUrl}`;

    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${fullImgUrl ? `<a href="${fullImgUrl}" target="_blank">View Photo</a>` : "No Image"}</td>
        <td><b>${p.name}</b></td>
        <td>${p.collection || "Uncategorized"}</td>
        <td style="text-align:center;">${p.published ? "Active (Visible)" : "Disabled (Hidden)"}</td>
        <td style="text-align:right;">${availableStock}</td>
        <td style="text-align:right;">₹${buyPrice.toLocaleString("en-IN")}</td>
        <td style="text-align:right;">₹${fixedPrice.toLocaleString("en-IN")}</td>
        <td style="text-align:right;">${soldCount}</td>
        <td style="text-align:right;">₹${soldRevenue.toLocaleString("en-IN")}</td>
        <td style="text-align:right; font-weight:bold; color:${profit >= 0 ? "#1b6f3a" : "#a23a3e"};">₹${profit.toLocaleString("en-IN")}</td>
      </tr>
    `;
  }).join("");

  const summaryHtml = `
    <tr style="background-color:#d4e6d4; font-weight:bold;">
      <td colspan="5" style="text-align:right;">TOTALS:</td>
      <td style="text-align:right;">${totalAvailableStock}</td>
      <td style="text-align:right;">₹${totalBuyVal.toLocaleString("en-IN")}</td>
      <td style="text-align:right;">₹${totalFixedVal.toLocaleString("en-IN")}</td>
      <td style="text-align:right;">${totalSoldUnits}</td>
      <td style="text-align:right;">₹${totalSoldVal.toLocaleString("en-IN")}</td>
      <td style="text-align:right; color:#1b6f3a;">₹${totalProfit.toLocaleString("en-IN")}</td>
    </tr>
  `;

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Inventory</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <style>
          th { background-color: #212018; color: #ffffff; padding: 10px; font-family: sans-serif; font-size: 13px; text-align: left; }
          td { padding: 8px; font-family: sans-serif; font-size: 12px; border: 1px solid #ddd; }
          .title { font-size: 18px; font-weight: bold; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <h2 class="title">PAPA'S BOUTIQUE - Complete Inventory & Sales Report</h2>
        <p style="font-family:sans-serif; font-size:12px; color:#555;">Generated on: ${new Date().toLocaleString("en-IN")}</p>
        <table border="1">
          <thead>
            <tr>
              <th>#</th>
              <th>Product Image</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Status</th>
              <th>Available Stock</th>
              <th>Buy Price (Unit)</th>
              <th>Fixed Price (Retail)</th>
              <th>Total Sold Count</th>
              <th>Total Sold Revenue</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            ${summaryHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Papas_Boutique_Inventory_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

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

function SoldModal({ product, onClose, onSoldSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [soldPrice, setSoldPrice] = useState(product.fixedPrice || product.price || "");
  const [selectedSize, setSelectedSize] = useState(product.sizes?.[0] || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalStock = Object.values(product.stock || {}).reduce((sum, q) => sum + (Number(q) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const qty = Number(quantity);
    const sp = Number(soldPrice);

    if (qty <= 0) {
      setErrorMsg("Please enter a valid quantity (1 or more).");
      return;
    }
    if (qty > totalStock) {
      setErrorMsg(`Cannot sell ${qty} units. Only ${totalStock} available in stock.`);
      return;
    }
    if (sp < 0 || isNaN(sp)) {
      setErrorMsg("Please enter a valid Sold Price.");
      return;
    }

    setLoading(true);
    try {
      const response = await api(`admin/products/${product.id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: qty,
          soldPrice: sp,
          size: selectedSize,
        }),
      });

      if (response.autoDisabled) {
        alert(`⚠️ Alert: Stock is now 0!\n"${product.name}" has been sold out and automatically disabled from the website storefront.`);
      } else {
        alert(`✅ Sale recorded successfully!\n${qty} piece(s) sold at ₹${sp}. Remaining stock: ${response.remainingStock}`);
      }

      onSoldSuccess();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to record sale.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Record Sale · {product.name}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="sold-form">
          <p className="sold-meta">
            Available Stock: <b>{totalStock} pcs</b> · Buy Price: <b>₹{product.buyPrice || 0}</b> · Fixed Price: <b>₹{product.fixedPrice || product.price || 0}</b>
          </p>

          {product.sizes && product.sizes.length > 0 && (
            <label>
              Select Size
              <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                {product.sizes.map((s) => (
                  <option key={s} value={s}>
                    {s} ({product.stock?.[s] ?? 0} in stock)
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="form-row-2">
            <label>
              Number of Products (Quantity)
              <input
                type="number"
                min="1"
                max={totalStock}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <label>
              Sold Price (₹ per unit)
              <input
                type="number"
                min="0"
                required
                value={soldPrice}
                onChange={(e) => setSoldPrice(e.target.value)}
              />
            </label>
          </div>

          <div className="profit-preview">
            <span>Estimated Profit for this sale:</span>
            <b>₹{((Number(soldPrice) - (Number(product.buyPrice) || 0)) * Number(quantity)).toLocaleString("en-IN")}</b>
          </div>

          {errorMsg && <p className="error">{errorMsg}</p>}

          <div className="modal-actions">
            <button type="button" className="text-button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="button confirm-sold-btn" disabled={loading || totalStock <= 0}>
              {loading ? "Recording..." : "Confirm & Update Inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const AI_PROMPT_TEMPLATE = `I am attaching photos of boutique clothing dresses for PAPA'S BOUTIQUE. Please examine each dress photo carefully and generate a valid JSON array of products for our inventory.

Required JSON Structure:
[
  {
    "name": "Attractive Dress Name (e.g. Navy Floral Embroidered Anarkali Kurti)",
    "collection": "Category (Choose: Kurtis, Leggings, Dupatta, Sarees, Occasion, etc.)",
    "buyPrice": 650,
    "fixedPrice": 1299,
    "description": "Attractive 2-3 sentence description detailing fabric, embroidery/work, fit, and styling tips.",
    "sizes": ["S", "M", "L", "XL", "XXL"],
    "colours": ["Navy Blue", "Gold"],
    "stock": { "S": 3, "M": 5, "L": 5, "XL": 3 },
    "images": ["photo_filename.jpg"]
  }
]

Guidelines:
1. In "images", use the exact filename of each uploaded photo (or e.g. "photo_1.jpg", "photo_2.jpg" if filenames are not visible). If multiple photos belong to the same outfit, put them in the same "images" array.
2. Provide reasonable boutique buyPrice (cost) and fixedPrice (retail selling price) in INR.
3. Output ONLY the raw JSON array inside a json code block without extra conversational filler.`;

const SAMPLE_JSON_DATA = [
  {
    name: "Floral Anarkali Cotton Kurti",
    collection: "Kurtis",
    buyPrice: 650,
    fixedPrice: 1399,
    description: "Pure breathable cotton Anarkali kurti featuring delicate floral block prints and a flattering round neck.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colours: ["Indigo Blue", "White"],
    stock: { S: 3, M: 6, L: 6, XL: 4, XXL: 2 },
    images: ["kurti_blue_01.jpg", "kurti_blue_02.jpg"],
  },
  {
    name: "Chanderi Banarasi Silk Dupatta",
    collection: "Dupatta",
    buyPrice: 380,
    fixedPrice: 850,
    description: "Regal Chanderi silk dupatta with ornate zari booti motifs and finished contrast tassels.",
    sizes: ["Free Size"],
    colours: ["Ruby Red", "Gold"],
    stock: { "Free Size": 12 },
    images: ["dupatta_red_01.jpg"],
  },
  {
    name: "Ultra-Stretch Churidar Leggings",
    collection: "Leggings",
    buyPrice: 220,
    fixedPrice: 499,
    description: "Combed four-way stretch cotton lycra leggings designed with an elasticated waistband and ankle gathers.",
    sizes: ["L", "XL", "Free Size"],
    colours: ["Jet Black"],
    stock: { L: 8, XL: 8, "Free Size": 15 },
    images: ["leggings_black_01.jpg"],
  },
];

function BulkUploader({ onComplete }) {
  const [imageFiles, setImageFiles] = useState(new Map());
  const [jsonText, setJsonText] = useState("");
  const [inputMode, setInputMode] = useState("paste"); // "paste" | "file"
  const [parsedItems, setParsedItems] = useState([]);
  const [parseError, setParseError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadSummary, setUploadSummary] = useState(null);
  const [showAiGuide, setShowAiGuide] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const folderInputRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const jsonFileInputRef = React.useRef(null);

  const handleImageFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newMap = new Map(imageFiles);
    for (const f of files) {
      newMap.set(f.name.toLowerCase().trim(), f);
      newMap.set(f.name.trim(), f);
    }
    setImageFiles(newMap);
  };

  const tryParseJson = (raw) => {
    if (!raw.trim()) {
      setParsedItems([]);
      setParseError("");
      return;
    }
    try {
      const clean = raw
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      const data = JSON.parse(clean);
      const list = Array.isArray(data)
        ? data
        : (Array.isArray(data?.products) ? data.products : null);
      if (!list) {
        throw new Error(
          "JSON must be an array of products, e.g. [ { ... }, { ... } ] or { products: [ ... ] }"
        );
      }
      setParsedItems(list);
      setParseError("");
    } catch (err) {
      setParsedItems([]);
      setParseError(err.message || "Invalid JSON syntax.");
    }
  };

  const handleJsonTextChange = (e) => {
    const val = e.target.value;
    setJsonText(val);
    tryParseJson(val);
  };

  const handleJsonFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result || "";
      setJsonText(content);
      tryParseJson(content);
    };
    reader.readAsText(file);
  };

  const downloadSampleJson = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_JSON_DATA, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "papas_boutique_sample_products.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyAiPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    });
  };

  const handleBulkUpload = async () => {
    if (!parsedItems.length) return;
    setUploading(true);
    setUploadSummary(null);
    setUploadStatus("Matching images and preparing data...");

    const uploadedUrlsCache = new Map();
    const processedProducts = [];
    let uploadedCount = 0;

    const allImagesToUpload = [];
    for (const item of parsedItems) {
      const imgs = Array.isArray(item.images)
        ? item.images
        : (item.image ? [item.image] : []);
      for (const imgName of imgs) {
        const cleanName = typeof imgName === "string" ? imgName.trim() : "";
        if (cleanName && !cleanName.startsWith("http") && !cleanName.startsWith("/api/")) {
          const lower = cleanName.toLowerCase();
          if (!allImagesToUpload.some((x) => x.lower === lower)) {
            allImagesToUpload.push({ original: cleanName, lower });
          }
        }
      }
    }

    setUploadProgress({ current: 0, total: allImagesToUpload.length });

    try {
      // 1. Upload images sequentially
      for (let i = 0; i < allImagesToUpload.length; i++) {
        const { original, lower } = allImagesToUpload[i];
        setUploadStatus(
          `Uploading image ${i + 1} of ${allImagesToUpload.length}: ${original}...`
        );
        setUploadProgress({ current: i + 1, total: allImagesToUpload.length });

        const file = imageFiles.get(lower) || imageFiles.get(original);
        if (file) {
          const formData = new FormData();
          formData.append("image", file);
          const res = await fetch("/api/admin/upload", {
            method: "POST",
            body: formData,
          });
          const resData = await res.json();
          if (!res.ok) {
            throw new Error(`Upload error for "${original}": ${resData.error || "Failed"}`);
          }
          uploadedUrlsCache.set(lower, resData.url);
          uploadedUrlsCache.set(original, resData.url);
          uploadedCount++;
        }
      }

      // 2. Prepare product objects with replaced URLs
      setUploadStatus("Saving dresses to boutique database...");
      for (const item of parsedItems) {
        const rawImgs = Array.isArray(item.images)
          ? item.images
          : (item.image ? [item.image] : []);

        const finalImgs = rawImgs
          .map((imgName) => {
            if (typeof imgName !== "string") return "";
            const trimmed = imgName.trim();
            if (trimmed.startsWith("http") || trimmed.startsWith("/api/")) return trimmed;
            return uploadedUrlsCache.get(trimmed.toLowerCase()) || uploadedUrlsCache.get(trimmed) || "";
          })
          .filter(Boolean);

        processedProducts.push({
          ...item,
          images: finalImgs,
          image: finalImgs[0] || "",
        });
      }

      // 3. Send to backend bulk endpoint
      const bulkResponse = await api("admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: processedProducts }),
      });

      setUploadSummary({
        success: true,
        count: bulkResponse.count || processedProducts.length,
        imagesCount: uploadedCount,
      });
      setUploadStatus("Completed successfully!");
      onComplete();
    } catch (err) {
      setUploadSummary({
        success: false,
        error: err.message || "Failed during bulk upload.",
      });
      setUploadStatus("Upload encountered an issue.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bulk-uploader-card">
      <div className="bulk-top-header">
        <div>
          <h2>⚡ Bulk Product Import</h2>
          <p className="bulk-desc">
            Import multiple dresses in one shot using your dress photos and an AI-generated JSON file.
          </p>
        </div>
        <div className="bulk-quick-actions">
          <button
            type="button"
            className="text-button"
            onClick={() => setShowAiGuide((prev) => !prev)}
          >
            {showAiGuide ? "Hide Mobile AI Guide ▲" : "🤖 Mobile AI Guide ▼"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={copyAiPrompt}
          >
            {copiedPrompt ? "✓ Prompt Copied!" : "📋 Copy AI Prompt"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={downloadSampleJson}
          >
            📥 Download Sample JSON
          </button>
        </div>
      </div>

      {showAiGuide && (
        <div className="ai-guide-box">
          <h3>📱 How to Generate Product JSON with ChatGPT / Gemini on Mobile:</h3>
          <ol>
            <li>
              <b>Copy the Prompt:</b> Tap the <b>"Copy AI Prompt"</b> button above.
            </li>
            <li>
              <b>Open AI App on Phone:</b> Open <b>ChatGPT</b> or <b>Google Gemini</b> app.
            </li>
            <li>
              <b>Upload Your Dress Photos:</b> Select and attach all your boutique dress photos from your phone gallery.
            </li>
            <li>
              <b>Paste Prompt & Send:</b> Paste the copied prompt. You can also specify any prices, e.g. <i>"All Kurtis buy ₹500, sell ₹1199; Dupattas buy ₹250, sell ₹550"</i>.
            </li>
            <li>
              <b>Copy Output & Import:</b> Tap Copy on the AI response, switch back here, paste into <b>Step 2</b> below, select the photos, and click <b>Start Bulk Upload</b>!
            </li>
          </ol>
        </div>
      )}

      {/* Step 1: Select Images */}
      <div className="bulk-step-box">
        <div className="bulk-step-title">
          <span className="step-num">1</span>
          <div>
            <h3>Select Dress Photos (Folder or Multi-select)</h3>
            <p>Choose the folder or multiple photos corresponding to the dresses in your JSON.</p>
          </div>
        </div>

        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          style={{ display: "none" }}
          onChange={handleImageFiles}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageFiles}
        />

        <div className="bulk-files-action-row">
          <button
            type="button"
            className="button select-photos-btn"
            onClick={() => folderInputRef.current?.click()}
          >
            📁 Choose Folder of Images
          </button>
          <button
            type="button"
            className="button select-photos-btn alt-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            🖼️ Select Photos (Gallery / Files)
          </button>
          {imageFiles.size > 0 && (
            <button
              type="button"
              className="text-button clear-btn"
              onClick={() => setImageFiles(new Map())}
            >
              Clear selected photos
            </button>
          )}
        </div>

        {imageFiles.size > 0 && (
          <div className="selected-photos-summary">
            <span className="badge-photos-count">
              ✓ <b>{imageFiles.size}</b> images selected
            </span>
            <div className="photo-names-chip-list">
              {Array.from(imageFiles.keys())
                .slice(0, 8)
                .map((name, i) => (
                  <span key={i} className="photo-name-chip">
                    {name}
                  </span>
                ))}
              {imageFiles.size > 8 && (
                <span className="photo-name-chip more">
                  +{imageFiles.size - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Provide JSON */}
      <div className="bulk-step-box">
        <div className="bulk-step-title">
          <span className="step-num">2</span>
          <div>
            <h3>Provide Product JSON Data</h3>
            <p>Paste the JSON generated from ChatGPT/Gemini, or upload a .json file.</p>
          </div>
        </div>

        <div className="json-input-tabs">
          <button
            type="button"
            className={`tab-toggle ${inputMode === "paste" ? "active" : ""}`}
            onClick={() => setInputMode("paste")}
          >
            ✍️ Paste JSON Directly (Recommended for Mobile)
          </button>
          <button
            type="button"
            className={`tab-toggle ${inputMode === "file" ? "active" : ""}`}
            onClick={() => setInputMode("file")}
          >
            📄 Upload .json File
          </button>
        </div>

        {inputMode === "paste" ? (
          <textarea
            className="bulk-json-textarea"
            placeholder="Paste your JSON array here (e.g. from ChatGPT or Gemini)..."
            value={jsonText}
            onChange={handleJsonTextChange}
          />
        ) : (
          <div className="json-file-picker">
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleJsonFileUpload}
            />
            {jsonText && <p className="json-loaded-hint">✓ JSON loaded ({parsedItems.length} items parsed)</p>}
          </div>
        )}

        {parseError && (
          <div className="json-status error">
            ⚠️ <b>JSON Error:</b> {parseError}
          </div>
        )}

        {parsedItems.length > 0 && !parseError && (
          <div className="json-status success">
            ✅ <b>Ready!</b> Parsed <b>{parsedItems.length}</b> dresses from JSON.
          </div>
        )}
      </div>

      {/* Step 3: Preview Table */}
      {parsedItems.length > 0 && !parseError && (
        <div className="bulk-step-box">
          <div className="bulk-step-title">
            <span className="step-num">3</span>
            <div>
              <h3>Import Preview ({parsedItems.length} Dresses)</h3>
              <p>Review the items and photo match status before importing.</p>
            </div>
          </div>

          <div className="bulk-preview-container">
            <table className="bulk-preview-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Dress Name</th>
                  <th>Category</th>
                  <th>Buy / Fixed Price</th>
                  <th>Sizes & Stock</th>
                  <th>Photos Match Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, idx) => {
                  const imgs = Array.isArray(item.images)
                    ? item.images
                    : (item.image ? [item.image] : []);
                  const matchedCount = imgs.filter((img) => {
                    if (typeof img !== "string") return false;
                    const t = img.trim();
                    return (
                      t.startsWith("http") ||
                      t.startsWith("/api/") ||
                      imageFiles.has(t.toLowerCase()) ||
                      imageFiles.has(t)
                    );
                  }).length;
                  const allMatched = imgs.length > 0 && matchedCount === imgs.length;

                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td><b>{item.name || "Untitled"}</b></td>
                      <td><span className="tag-category">{item.collection || "Kurtis"}</span></td>
                      <td>
                        ₹{Number(item.buyPrice || 0).toLocaleString("en-IN")} /{" "}
                        <b>₹{Number(item.fixedPrice || item.price || 0).toLocaleString("en-IN")}</b>
                      </td>
                      <td className="sizes-preview-cell">
                        {Array.isArray(item.sizes) ? item.sizes.join(", ") : String(item.sizes || "Free Size")}
                      </td>
                      <td>
                        {imgs.length === 0 ? (
                          <span className="match-pill warning">No image filename</span>
                        ) : allMatched ? (
                          <span className="match-pill success">
                            ✅ {matchedCount} {matchedCount === 1 ? "photo" : "photos"} matched
                          </span>
                        ) : matchedCount > 0 ? (
                          <span className="match-pill warning">
                            ⚠️ {matchedCount}/{imgs.length} photos matched
                          </span>
                        ) : (
                          <span className="match-pill danger">
                            ❌ {imgs.length} photo(s) missing
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Upload Action */}
          <div className="bulk-action-footer">
            <button
              type="button"
              className="button bulk-upload-start-btn"
              disabled={uploading || parsedItems.length === 0}
              onClick={handleBulkUpload}
            >
              {uploading
                ? "⏳ Uploading..."
                : `🚀 Start Bulk Upload (${parsedItems.length} dresses)`}
            </button>
          </div>

          {uploading && (
            <div className="bulk-upload-progress-box">
              <p className="progress-status-txt">{uploadStatus}</p>
              {uploadProgress.total > 0 && (
                <div className="progress-bar-track">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {uploadSummary && (
            <div className={`bulk-summary-box ${uploadSummary.success ? "success" : "error"}`}>
              {uploadSummary.success ? (
                <div>
                  <h4>🎉 Bulk Import Successful!</h4>
                  <p>
                    Added <b>{uploadSummary.count}</b> dresses with <b>{uploadSummary.imagesCount}</b> uploaded photos to Papa's Boutique.
                  </p>
                </div>
              ) : (
                <div>
                  <h4>⚠️ Upload Error</h4>
                  <p>{uploadSummary.error}</p>
                </div>
              )}
            </div>
          )}
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
  const [soldProduct, setSoldProduct] = useState(null);
  const [activeTab, setActiveTab] = useState("single"); // "single" | "bulk"
  const [adminStatusFilter, setAdminStatusFilter] = useState("ALL");
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("ALL");
  const [adminSearch, setAdminSearch] = useState("");
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

    const fixedPrice = Number(draft.fixedPrice);
    const buyPrice = Number(draft.buyPrice) || 0;

    try {
      await api("admin/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          id: editing?.id,
          slug: editing?.slug,
          price: fixedPrice,
          fixedPrice,
          buyPrice,
          image: primaryImage,
          images: imagesList,
          sizes: toList(draft.sizes),
          colours: toList(draft.colours),
          stock,
        }),
      });
      setDraft(blank);
      setEditing(null);
      setMessage("Item saved successfully.");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const edit = (product) => {
    setActiveTab("single");
    const imagesList = product.images?.length
      ? product.images
      : product.image
      ? [product.image]
      : [];

    setEditing(product);
    setDraft({
      ...product,
      buyPrice: product.buyPrice !== undefined ? String(product.buyPrice) : "",
      fixedPrice: String(product.fixedPrice || product.price || ""),
      images: imagesList,
      image: imagesList[0] || "",
      sizes: (product.sizes || []).join(", "),
      colours: (product.colours || []).join(", "),
      stock: Object.entries(product.stock || {})
        .map(([size, quantity]) => `${size}:${quantity}`)
        .join(", "),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const togglePublish = async (product) => {
    const nextPublished = !product.published;
    // Optimistically update UI immediately
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, published: nextPublished } : p))
    );
    try {
      const response = await api(`admin/products/${product.id}/toggle-publish`, { method: "PATCH" });
      if (response?.product) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? response.product : p))
        );
      }
    } catch (error) {
      // Revert if API fails
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, published: product.published } : p))
      );
      alert("Failed to change visibility: " + error.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Permanently remove this item from the collection?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await api(`admin/products/${id}`, { method: "DELETE" });
    } catch (error) {
      alert("Failed to remove item: " + error.message);
      load();
    }
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
        <div className="admin-top-actions">
          <button
            type="button"
            className="button excel-export-btn"
            onClick={() => exportInventoryToExcel(products)}
          >
            📊 Download Excel Report
          </button>
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
      </div>

      {/* Tabs Switcher: Single Item vs Bulk Import */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "single" ? "active" : ""}`}
          onClick={() => setActiveTab("single")}
        >
          📝 {editing ? "Edit Item Form" : "Single Item Entry"}
        </button>
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "bulk" ? "active" : ""}`}
          onClick={() => setActiveTab("bulk")}
        >
          ⚡ Bulk Import (JSON + Images Folder)
        </button>
      </div>

      {activeTab === "single" ? (
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

        {/* Pricing Fields: BUY PRICE & FIXED PRICE */}
        <label>
          Buy Price (₹) <span className="helper-txt">(Cost price per unit)</span>
          <input
            required
            type="number"
            min="0"
            placeholder="e.g. 2500"
            value={draft.buyPrice}
            onChange={(event) =>
              setDraft({ ...draft, buyPrice: event.target.value })
            }
          />
        </label>
        <label>
          Fixed Price (₹) <span className="helper-txt">(Selling / Retail price)</span>
          <input
            required
            type="number"
            min="0"
            placeholder="e.g. 4890"
            value={draft.fixedPrice}
            onChange={(event) =>
              setDraft({ ...draft, fixedPrice: event.target.value, price: event.target.value })
            }
          />
        </label>

        <label>
          Sizes, separated by commas
          <input
            type="text"
            value={draft.sizes}
            onChange={(event) =>
              setDraft({ ...draft, sizes: event.target.value })
            }
          />
        </label>
        <label>
          Colours, separated by commas
          <input
            type="text"
            value={draft.colours}
            onChange={(event) =>
              setDraft({ ...draft, colours: event.target.value })
            }
          />
        </label>
        <label className="wide">
          Stock by Size (e.g. S:4, M:2, L:5)
          <input
            required
            type="text"
            value={draft.stock}
            onChange={(event) =>
              setDraft({ ...draft, stock: event.target.value })
            }
          />
        </label>

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
        <label className="check wide">
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(event) =>
              setDraft({ ...draft, published: event.target.checked })
            }
          />{" "}
          Active (Visible on website storefront)
        </label>
        <button className="button">
          {editing ? "Update item" : "Add item"}
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
      ) : (
        <BulkUploader onComplete={load} />
      )}

      {/* Category Management Overview */}
      <div className="admin-category-panel">
        <h2>Categories Overview</h2>
        <div className="category-badges">
          {Array.from(new Set(products.map((p) => p.collection))).map((cat) => {
            const count = products.filter((p) => p.collection === cat).length;
            const isSelected = adminCategoryFilter === cat;
            return (
              <div
                key={cat}
                className={`category-badge clickable ${isSelected ? "active" : ""}`}
                onClick={() => setAdminCategoryFilter(isSelected ? "ALL" : cat)}
                title={`Click to filter by ${cat}`}
              >
                <span className="cat-name">{cat}</span>
                <span className="cat-count">{count} {count === 1 ? "item" : "items"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h2>Current catalogue &amp; Inventory</h2>
          <p className="admin-subtitle">Filter by status or item type, manage visibility, record sales, and export stock.</p>
        </div>
        <button
          type="button"
          className="button excel-export-btn"
          onClick={() => exportInventoryToExcel(products)}
        >
          📊 Export Excel (.xls)
        </button>
      </div>

      {/* Admin Multi-level Filter System */}
      <div className="admin-filter-container">
        {/* Row 1: Status Filters */}
        <div className="filter-group-block">
          <span className="filter-group-label">Status Filter:</span>
          <div className="filter-pills-row">
            <button
              type="button"
              className={`filter-pill-btn ${adminStatusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("ALL")}
            >
              All Items ({products.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-enabled ${adminStatusFilter === "ENABLED" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("ENABLED")}
            >
              ● Active ({products.filter((p) => p.published).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-disabled ${adminStatusFilter === "DISABLED" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("DISABLED")}
            >
              ○ Disabled ({products.filter((p) => !p.published).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-soldout ${adminStatusFilter === "SOLDOUT" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("SOLDOUT")}
            >
              🔴 Sold Out ({products.filter((p) => Object.values(p.stock || {}).reduce((s, q) => s + (Number(q) || 0), 0) <= 0).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-soldhistory ${adminStatusFilter === "SOLD_ITEMS" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("SOLD_ITEMS")}
            >
              💰 Sold ({products.filter((p) => (Number(p.soldCount) || 0) > 0).length})
            </button>
          </div>
        </div>

        {/* Row 2: Item Type / Category Filter */}
        <div className="filter-group-block">
          <span className="filter-group-label">Category / Item Type:</span>
          <div className="filter-pills-row">
            <button
              type="button"
              className={`filter-pill-btn ${adminCategoryFilter === "ALL" ? "active" : ""}`}
              onClick={() => setAdminCategoryFilter("ALL")}
            >
              All Types ({products.length})
            </button>
            {Array.from(new Set(products.map((p) => p.collection))).filter(Boolean).map((cat) => {
              const count = products.filter((p) => p.collection === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`filter-pill-btn ${adminCategoryFilter === cat ? "active" : ""}`}
                  onClick={() => setAdminCategoryFilter(cat)}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Admin Search & Filter Summary */}
        <div className="admin-search-row">
          <div className="search admin-search-input">
            <span aria-hidden="true">⌕</span>
            <input
              type="text"
              placeholder="Search catalogue by dress name, category, colour..."
              value={adminSearch}
              onChange={(e) => setAdminSearch(e.target.value)}
            />
            {adminSearch && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setAdminSearch("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="admin-filter-status-summary">
            <span>
              Showing <b>{
                products.filter((p) => {
                  const totalStock = Object.values(p.stock || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
                  const soldCount = Number(p.soldCount) || 0;
                  if (adminStatusFilter === "ENABLED" && !p.published) return false;
                  if (adminStatusFilter === "DISABLED" && p.published) return false;
                  if (adminStatusFilter === "SOLDOUT" && totalStock > 0) return false;
                  if (adminStatusFilter === "SOLD_ITEMS" && soldCount <= 0) return false;
                  if (adminCategoryFilter !== "ALL" && p.collection !== adminCategoryFilter) return false;
                  if (adminSearch.trim()) {
                    const q = adminSearch.trim().toLowerCase();
                    const searchString = `${p.name} ${p.collection} ${p.description || ""} ${(p.colours || []).join(" ")}`.toLowerCase();
                    if (!searchString.includes(q)) return false;
                  }
                  return true;
                }).length
              }</b> of <b>{products.length}</b> products
            </span>
            {(adminStatusFilter !== "ALL" || adminCategoryFilter !== "ALL" || adminSearch) && (
              <button
                type="button"
                className="text-button reset-filter-btn"
                onClick={() => {
                  setAdminStatusFilter("ALL");
                  setAdminCategoryFilter("ALL");
                  setAdminSearch("");
                }}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="inventory">
        {(() => {
          const filtered = products.filter((p) => {
            const totalStock = Object.values(p.stock || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
            const soldCount = Number(p.soldCount) || 0;
            if (adminStatusFilter === "ENABLED" && !p.published) return false;
            if (adminStatusFilter === "DISABLED" && p.published) return false;
            if (adminStatusFilter === "SOLDOUT" && totalStock > 0) return false;
            if (adminStatusFilter === "SOLD_ITEMS" && soldCount <= 0) return false;
            if (adminCategoryFilter !== "ALL" && p.collection !== adminCategoryFilter) return false;
            if (adminSearch.trim()) {
              const q = adminSearch.trim().toLowerCase();
              const searchString = `${p.name} ${p.collection} ${p.description || ""} ${(p.colours || []).join(" ")}`.toLowerCase();
              if (!searchString.includes(q)) return false;
            }
            return true;
          });

          if (filtered.length === 0) {
            return (
              <div className="empty-inventory-notice">
                <p>No products match your selected filters (Status: {adminStatusFilter}, Category: {adminCategoryFilter}).</p>
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setAdminStatusFilter("ALL");
                    setAdminCategoryFilter("ALL");
                    setAdminSearch("");
                  }}
                >
                  Clear All Filters
                </button>
              </div>
            );
          }

          return filtered.map((product) => {
          const totalStock = Object.values(product.stock || {}).reduce(
            (sum, qty) => sum + (Number(qty) || 0),
            0,
          );
          const buyPrice = Number(product.buyPrice) || 0;
          const fixedPrice = Number(product.fixedPrice || product.price) || 0;
          const soldCount = Number(product.soldCount) || 0;
          const soldRevenue = Number(product.totalSoldRevenue) || 0;
          const profit = soldRevenue - (buyPrice * soldCount);

          return (
            <article key={product.id} className={!product.published ? "item-disabled" : ""}>
              <img src={product.image} alt="" />
              <div className="inventory-details">
                <div className="inventory-header-row">
                  <span className="tag-category">{product.collection}</span>
                  <span className={`status-pill ${product.published ? "published" : "disabled"}`}>
                    {product.published ? "● Active on Website" : "○ Disabled (Hidden)"}
                  </span>
                </div>
                <h3>{product.name}</h3>
                <div className="inventory-financial-row">
                  <span>Stock: <b>{totalStock} pcs</b></span>
                  <span>Buy: <b>₹{buyPrice.toLocaleString("en-IN")}</b></span>
                  <span>Fixed: <b>₹{fixedPrice.toLocaleString("en-IN")}</b></span>
                  <span>Sold: <b>{soldCount} pcs</b> (₹{soldRevenue.toLocaleString("en-IN")})</span>
                  <span className="profit-tag">Profit: <b>₹{profit.toLocaleString("en-IN")}</b></span>
                </div>
              </div>
              <div className="inventory-btn-group">
                <button
                  type="button"
                  className="btn-sold"
                  onClick={() => setSoldProduct(product)}
                  title="Record a sale"
                >
                  💰 Record Sold
                </button>
                <button
                  type="button"
                  className={`btn-toggle-pub ${product.published ? "btn-disable" : "btn-enable"}`}
                  onClick={() => togglePublish(product)}
                >
                  {product.published ? "Disable" : "Enable"}
                </button>
                <button type="button" onClick={() => edit(product)}>Edit</button>
                <button type="button" className="danger" onClick={() => remove(product.id)}>
                  Remove
                </button>
              </div>
            </article>
          );
        });
      })()}
      </div>

      {soldProduct && (
        <SoldModal
          product={soldProduct}
          onClose={() => setSoldProduct(null)}
          onSoldSuccess={load}
        />
      )}
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

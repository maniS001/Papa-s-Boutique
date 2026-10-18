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
import JSZip from "jszip";
import "./styles.css";
import { whatsappNumber } from "./config";

function normalizeImageName(str) {
  if (!str || typeof str !== "string") return "";
  const base = str.split("/").pop().split("\\").pop().toLowerCase();
  return base.replace(/\.[a-z0-9]+$/i, "").trim();
}

function findMatchingImageFile(targetName, imageFilesMap) {
  if (!targetName || !(imageFilesMap instanceof Map) || imageFilesMap.size === 0) return null;
  const rawTarget = targetName.split("/").pop().split("\\").pop().trim();
  const lowerTarget = rawTarget.toLowerCase();

  // 1. Direct match (exact or lowercase)
  if (imageFilesMap.has(rawTarget)) return imageFilesMap.get(rawTarget);
  if (imageFilesMap.has(lowerTarget)) return imageFilesMap.get(lowerTarget);

  // 2. Basename match without extension (e.g. "dress1.jpg" matches "dress1.png")
  const targetNorm = normalizeImageName(rawTarget);
  for (const [key, file] of imageFilesMap.entries()) {
    if (normalizeImageName(key) === targetNorm) {
      return file;
    }
  }

  // 3. Strip trailing suffixes like _2, _1, -2, -1, (1), (2), _front, _back, etc.
  // If AI generated "photo_2.jpg" and user has "photo.jpg" (or vice-versa), this matches!
  const stripSuffix = (s) => s.replace(/([-_][0-9]+|[-_](front|back|side|detail|zoom|angle|edit|copy)|[\s_]\([0-9]+\))$/i, "");
  const targetStripped = stripSuffix(targetNorm);

  for (const [key, file] of imageFilesMap.entries()) {
    const keyNorm = normalizeImageName(key);
    const keyStripped = stripSuffix(keyNorm);
    if (targetStripped && keyStripped && targetStripped === keyStripped) {
      return file;
    }
  }

  // 4. Starts with match (e.g. "IMG_0012" in "IMG_0012_something")
  for (const [key, file] of imageFilesMap.entries()) {
    const keyNorm = normalizeImageName(key);
    if (keyNorm.length >= 4 && (keyNorm.startsWith(targetNorm) || targetNorm.startsWith(keyNorm))) {
      return file;
    }
  }

  return null;
}

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
const api = async (path, options = {}) => {
  const separator = path.includes("?") ? "&" : "?";
  const url = `/api/${path}${separator}_t=${Date.now()}`;
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      Pragma: "no-cache",
      "Cache-Control": "no-cache",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const rawText = await response.text();
    let errorMsg = rawText;
    try {
      const parsed = JSON.parse(rawText);
      errorMsg = parsed.error || rawText;
    } catch {}
    throw new Error(errorMsg || "Something went wrong");
  }
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
  sizes: [],
  colours: "",
  stock: {},
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

    // Available colours / variants summary
    const coloursList = Array.isArray(p.colours)
      ? p.colours
      : (typeof p.colours === "string" ? p.colours.split(",").map(c => c.trim()).filter(Boolean) : []);
    
    let variantBreakdownStr = "";
    if (Array.isArray(p.colorVariants) && p.colorVariants.length > 0) {
      variantBreakdownStr = p.colorVariants
        .map(v => {
          const vQty = Object.values(v.stock || {}).reduce((sum, q) => sum + (Number(q) || 0), 0);
          return `${v.colour || "Standard"} (${vQty} pcs)`;
        })
        .join(", ");
    } else if (coloursList.length > 0) {
      variantBreakdownStr = coloursList.join(", ");
    } else {
      variantBreakdownStr = "Standard";
    }

    // Sold details with colour & size breakdown
    let soldBreakdownHtml = "None";
    if (Array.isArray(p.sales) && p.sales.length > 0) {
      soldBreakdownHtml = p.sales
        .map(s => `${s.quantity}x ${s.colour ? s.colour + " " : ""}(Size: ${s.size || "General"}) @ ₹${Number(s.soldPrice || 0).toLocaleString("en-IN")}`)
        .join("<br/>");
    } else if (soldCount > 0) {
      soldBreakdownHtml = `${soldCount} pcs`;
    }

    return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${fullImgUrl ? `<a href="${fullImgUrl}" target="_blank">View Photo</a>` : "No Image"}</td>
        <td><b>${p.name}</b></td>
        <td>${p.collection || "Uncategorized"}</td>
        <td>${variantBreakdownStr}</td>
        <td style="text-align:center;">${p.published ? "Active (Visible)" : "Disabled (Hidden)"}</td>
        <td style="text-align:right;">${availableStock}</td>
        <td style="text-align:right;">₹${buyPrice.toLocaleString("en-IN")}</td>
        <td style="text-align:right;">₹${fixedPrice.toLocaleString("en-IN")}</td>
        <td style="text-align:right;">${soldCount}</td>
        <td style="font-size:11px; color:#444;">${soldBreakdownHtml}</td>
        <td style="text-align:right;">₹${soldRevenue.toLocaleString("en-IN")}</td>
        <td style="text-align:right; font-weight:bold; color:${profit >= 0 ? "#1b6f3a" : "#a23a3e"};">₹${profit.toLocaleString("en-IN")}</td>
      </tr>
    `;
  }).join("");

  const summaryHtml = `
    <tr style="background-color:#d4e6d4; font-weight:bold;">
      <td colspan="6" style="text-align:right;">TOTALS:</td>
      <td style="text-align:right;">${totalAvailableStock}</td>
      <td style="text-align:right;">₹${totalBuyVal.toLocaleString("en-IN")}</td>
      <td style="text-align:right;">₹${totalFixedVal.toLocaleString("en-IN")}</td>
      <td style="text-align:right;">${totalSoldUnits}</td>
      <td style="text-align:center;">-</td>
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
              <th>Colours / Variants</th>
              <th>Status</th>
              <th>Available Stock</th>
              <th>Buy Price (Unit)</th>
              <th>Fixed Price (Retail)</th>
              <th>Total Sold Count</th>
              <th>Sold Details (Color & Size)</th>
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
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic"];
    const files = Array.from(fileList);

    for (const file of files) {
      if (!allowed.includes(file.type)) {
        setUploadError(`Unsupported file type (${file.name}). Please use JPEG, PNG, WebP, GIF, AVIF, or HEIC.`);
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
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/heic"
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

const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"];

function SizeStockSelector({ selectedSizes = [], stock = {}, onChange }) {
  const [customInput, setCustomInput] = useState("");

  const handleToggle = (size) => {
    const isSelected = selectedSizes.includes(size);
    if (isSelected) {
      const nextSizes = selectedSizes.filter((s) => s !== size);
      const nextStock = { ...stock };
      delete nextStock[size];
      onChange(nextSizes, nextStock);
    } else {
      const nextSizes = [...selectedSizes, size];
      const nextStock = { ...stock, [size]: 1 }; // Default count is 1
      onChange(nextSizes, nextStock);
    }
  };

  const handleQtyChange = (size, val) => {
    const qty = Math.max(1, parseInt(val, 10) || 1);
    onChange(selectedSizes, { ...stock, [size]: qty });
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (!selectedSizes.includes(trimmed)) {
      onChange([...selectedSizes, trimmed], { ...stock, [trimmed]: 1 });
    }
    setCustomInput("");
  };

  return (
    <div className="size-stock-card">
      <div className="size-pill-group">
        {STANDARD_SIZES.map((size) => {
          const isSelected = selectedSizes.includes(size);
          return (
            <button
              key={size}
              type="button"
              className={`size-pill-btn ${isSelected ? "selected" : ""}`}
              onClick={() => handleToggle(size)}
            >
              <span className="size-check-icon">{isSelected ? "✓" : "+"}</span>
              <span className="size-label">{size}</span>
            </button>
          );
        })}
      </div>

      <div className="custom-size-adder">
        <input
          type="text"
          placeholder="Custom size (e.g. 4XL, 32, Free Size...)"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCustom(e);
            }
          }}
        />
        <button
          type="button"
          className="text-button"
          onClick={handleAddCustom}
        >
          + Add Size
        </button>
      </div>

      {selectedSizes.length > 0 ? (
        <div className="selected-sizes-stepper-list">
          <p className="stepper-section-title">
            Quantity per size (Default is 1):
          </p>
          <div className="size-stepper-grid">
            {selectedSizes.map((size) => {
              const count = stock[size] !== undefined ? stock[size] : 1;
              return (
                <div key={size} className="size-stepper-item">
                  <span className="size-stepper-badge">{size}</span>
                  <div className="qty-counter">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleQtyChange(size, count - 1)}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      className="qty-num-input"
                      value={count}
                      onChange={(e) => handleQtyChange(size, e.target.value)}
                    />
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleQtyChange(size, count + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="size-del-btn"
                    onClick={() => handleToggle(size)}
                    title={`Remove size ${size}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <div className="total-stock-callout">
            Total Selected Stock: <b>{Object.values(stock).reduce((s, q) => s + (Number(q) || 0), 0)} pieces</b>
          </div>
        </div>
      ) : (
        <p className="size-required-warning">
          ⚠️ <b>Size is mandatory:</b> Please select at least one size above. Default count is 1.
        </p>
      )}
    </div>
  );
}

function SoldModal({ product, onClose, onSoldSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [soldPrice, setSoldPrice] = useState(product.fixedPrice || product.price || "");

  const hasVariants = Array.isArray(product.colorVariants) && product.colorVariants.length > 0;
  const rawColours = Array.isArray(product.colours)
    ? product.colours
    : typeof product.colours === "string"
    ? product.colours.split(",").map((c) => c.trim()).filter(Boolean)
    : [];
  const availableColours = hasVariants
    ? product.colorVariants.map((v) => v.colour).filter(Boolean)
    : rawColours;

  const [selectedColour, setSelectedColour] = useState(availableColours[0] || "");

  const activeVariant = hasVariants
    ? product.colorVariants.find((v) => v.colour === selectedColour) || product.colorVariants[0]
    : null;

  const activeSizes = (activeVariant && Array.isArray(activeVariant.sizes) && activeVariant.sizes.length)
    ? activeVariant.sizes
    : (Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["Free Size"]);

  const activeStock = (activeVariant && typeof activeVariant.stock === "object" && activeVariant.stock !== null)
    ? activeVariant.stock
    : (typeof product.stock === "object" && product.stock !== null ? product.stock : {});

  const [selectedSize, setSelectedSize] = useState(activeSizes[0] || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalStock = Object.values(activeStock).reduce((sum, q) => sum + (Number(q) || 0), 0);

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
          colour: selectedColour,
        }),
      });

      if (response.autoDisabled) {
        alert(`⚠️ Alert: Stock is now 0!\n"${product.name}" has been sold out and automatically disabled from the website storefront.`);
      } else {
        alert(`✅ Sale recorded successfully!\n${qty} piece(s) ${selectedColour ? `(${selectedColour}) ` : ""}sold at ₹${sp}. Remaining stock: ${response.remainingStock}`);
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

          {availableColours.length > 0 && (
            <label>
              Select Color Variant
              <select
                value={selectedColour}
                onChange={(e) => {
                  const newCol = e.target.value;
                  setSelectedColour(newCol);
                  const matchingVar = product.colorVariants?.find((v) => v.colour === newCol);
                  if (matchingVar?.sizes?.[0]) {
                    setSelectedSize(matchingVar.sizes[0]);
                  }
                }}
              >
                {availableColours.map((c) => (
                  <option key={c} value={c}>
                    🎨 {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          {activeSizes && activeSizes.length > 0 && (
            <label>
              Select Size
              <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                {activeSizes.map((s) => (
                  <option key={s} value={s}>
                    {s} ({activeStock?.[s] ?? 0} in stock)
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

const AI_PROMPT_TEMPLATE = `You are a fashion cataloguer for "PAPA'S BOUTIQUE".
I am uploading boutique dress/clothing photos (or a ZIP file containing photos). Carefully inspect each photo and generate a clean, valid JSON array for our store inventory.

CRITICAL RULES (EXTREMELY IMPORTANT):
1. STRICT SEPARATION - TREAT EACH DRESS AS A SEPARATE PRODUCT:
   - You MUST treat EACH UNIQUE DRESS AS A SEPARATE OBJECT in the JSON array.
   - DO NOT group different dress designs, different patterns, different prints, or different embroidery styles together under one dress name!
   - Every dress that has its own print, cut, fabric, or design MUST be its own independent entry in the JSON array.
   - ONLY group images together if they are photos (e.g. front view, back view, detail close-up) of the EXACT SAME PHYSICAL DRESS.
   - NEVER combine different dresses just because they were photographed together or have different colors. If in any doubt, create SEPARATE product objects!

2. USE VERBATIM FILENAMES ONLY:
   - You MUST write the EXACT original filename of each image (e.g. "IMG_2041.jpg", "DSC_0045.png", "kurti_red.jpg").
   - NEVER rename files.
   - NEVER append artificial suffixes like "_2", "_1", "-1", "-2", "_front", "_back", or "_copy" to the image names.
   - If a file is named "kurti_red.jpg", write EXACTLY "kurti_red.jpg", NEVER "kurti_red_2.jpg".
   - If images are provided in a ZIP archive, inspect/unzip the archive and use the exact file names stored inside (without any folder paths).

3. MULTI-COLOR VARIANTS (ONLY FOR IDENTICAL GARMENT CUTS):
   - ONLY use "colorVariants" if it is genuinely the EXACT SAME dress style, pattern, and manufacturer cut offered in different dye colors.
   - If two garments have different prints, different embroidery motifs, or different necklines, they ARE SEPARATE PRODUCTS, NOT color variants!

4. DO NOT GENERATE PRICES, SIZES, OR STOCK COUNTS:
   - Leave pricing (buyPrice, fixedPrice) and sizes/counts OUT of the JSON. The boutique admin will enter these in the admin panel.

REQUIRED JSON FORMAT:
[
  {
    "name": "Attractive Product Title (e.g. Zari Embroidered Chanderi Kurti)",
    "collection": "Category (Choose from: Kurtis, Leggings, Dupatta, Sarees, Occasion, Everyday Ease)",
    "description": "2-3 attractive sentences describing the fabric, style, embroidery/work, fit, and styling tips.",
    "colours": ["Primary Color", "Secondary Color"],
    "colorVariants": [
      {
        "colour": "Primary Color",
        "images": ["IMG_0012.jpg", "IMG_0013.jpg"]
      },
      {
        "colour": "Secondary Color",
        "images": ["IMG_0014.jpg"]
      }
    ],
    "images": [
      "IMG_0012.jpg",
      "IMG_0013.jpg",
      "IMG_0014.jpg"
    ]
  }
]

IMPORTANT:
- Use the exact filenames without modifying them or appending suffixes.
- Return ONLY the raw JSON array inside a \`\`\`json ... \`\`\` block without conversational preamble.`;

const SAMPLE_JSON_DATA = [
  {
    name: "Floral Embroidered Chanderi Kurti",
    collection: "Kurtis",
    description: "Pure Chanderi silk kurti with intricate floral thread embroidery along the yoke, styled with side slits and three-quarter sleeves.",
    colours: ["Ruby Red", "Peacock Blue"],
    colorVariants: [
      {
        colour: "Ruby Red",
        images: ["kurti_red_front.jpg", "kurti_red_back.jpg"],
      },
      {
        colour: "Peacock Blue",
        images: ["kurti_blue_front.jpg"],
      },
    ],
    images: ["kurti_red_front.jpg", "kurti_red_back.jpg", "kurti_blue_front.jpg"],
  },
  {
    name: "Banarasi Zari Border Silk Dupatta",
    collection: "Dupatta",
    description: "Traditional lightweight woven silk dupatta featuring ornate gold zari booti work and finished edge tassels.",
    colours: ["Mustard Yellow"],
    colorVariants: [
      {
        colour: "Mustard Yellow",
        images: ["dupatta_yellow_01.jpg"],
      },
    ],
    images: ["dupatta_yellow_01.jpg"],
  },
  {
    name: "Four-Way Stretch Ankle Leggings",
    collection: "Leggings",
    description: "Ultra-comfortable premium combed cotton lycra leggings with a broad anti-roll waistband.",
    colours: ["Jet Black", "Oatmeal Beige"],
    colorVariants: [
      {
        colour: "Jet Black",
        images: ["leggings_black.jpg"],
      },
      {
        colour: "Oatmeal Beige",
        images: ["leggings_beige.jpg"],
      },
    ],
    images: ["leggings_black.jpg", "leggings_beige.jpg"],
  },
];

const fileToBase64 = (file, maxWidth = 768, maxHeight = 768) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function BulkUploader({ onComplete }) {
  const [bulkMethod, setBulkMethod] = useState("hf"); // "hf" (AI Add-on) | "json" (Standard)
  const [imageFiles, setImageFiles] = useState(new Map());
  const [jsonText, setJsonText] = useState("");
  const [inputMode, setInputMode] = useState("paste"); // "paste" | "file"
  const [parsedItems, setParsedItems] = useState([]);
  const [parseError, setParseError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [showAiGuide, setShowAiGuide] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);

  // AI Vision Direct import state (Supports Google Gemini & Hugging Face)
  const [aiToken, setAiToken] = useState(() => localStorage.getItem("papas_ai_token") || localStorage.getItem("papas_gemini_token") || localStorage.getItem("papas_hf_token") || "");
  const [aiProvider, setAiProvider] = useState(() => {
    const saved = localStorage.getItem("papas_ai_token") || "";
    if (saved.startsWith("hf_")) return "hf";
    return "gemini"; // Default to Gemini: 100% free forever, no serverless provider restrictions
  });
  const [aiModel, setAiModel] = useState(() => {
    const saved = localStorage.getItem("papas_ai_token") || "";
    return saved.startsWith("hf_") ? "Qwen/Qwen2.5-VL-72B-Instruct" : "gemini-2.5-flash";
  });
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenSavedNotice, setTokenSavedNotice] = useState(false);
  const [testingToken, setTestingToken] = useState(false);
  const [tokenTestStatus, setTokenTestStatus] = useState(null);

  const folderInputRef = React.useRef(null);
  const zipInputRef = React.useRef(null);
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

  const handleZipFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const newMap = new Map(imageFiles);
      const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".heic"];
      let count = 0;

      const entries = Object.values(zip.files).filter((entry) => {
        if (entry.dir) return false;
        const lower = entry.name.toLowerCase();
        if (lower.includes("__macosx") || lower.startsWith(".")) return false;
        return imageExtensions.some((ext) => lower.endsWith(ext));
      });

      for (const entry of entries) {
        const blob = await entry.async("blob");
        const filename = entry.name.split("/").pop().split("\\").pop().trim();
        const ext = filename.split(".").pop().toLowerCase();
        const mime =
          ext === "png"
            ? "image/png"
            : ext === "webp"
            ? "image/webp"
            : ext === "gif"
            ? "image/gif"
            : ext === "avif"
            ? "image/avif"
            : ext === "heic"
            ? "image/heic"
            : "image/jpeg";
        const imgFile = new File([blob], filename, { type: mime });
        newMap.set(filename.toLowerCase(), imgFile);
        newMap.set(filename, imgFile);
        count++;
      }

      setImageFiles(newMap);
      alert(`✅ Extracted ${count} images from "${file.name}"!`);
    } catch (err) {
      alert("Failed to extract ZIP: " + err.message);
    } finally {
      setZipLoading(false);
      if (zipInputRef.current) zipInputRef.current.value = "";
    }
  };

  const saveAiToken = () => {
    const clean = aiToken.trim().replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "");
    localStorage.setItem("papas_ai_token", clean);
    if (aiProvider === "hf") localStorage.setItem("papas_hf_token", clean);
    if (aiProvider === "gemini") localStorage.setItem("papas_gemini_token", clean);
    setTokenSavedNotice(true);
    setTimeout(() => setTokenSavedNotice(false), 2500);
  };

  const testAiToken = async () => {
    const clean = aiToken.trim().replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "");
    if (!clean) {
      setTokenTestStatus({ ok: false, error: "Please enter an API token first." });
      return;
    }
    setTestingToken(true);
    setTokenTestStatus(null);
    try {
      const res = await api("admin/ai/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: clean, provider: aiProvider }),
      });
      if (res.ok) {
        setTokenTestStatus({ ok: true, message: res.message || "Connected successfully!" });
      } else {
        setTokenTestStatus({ ok: false, error: res.error || "Token verification failed." });
      }
    } catch (err) {
      setTokenTestStatus({ ok: false, error: err.message || "Failed to reach server to test token." });
    } finally {
      setTestingToken(false);
    }
  };

  const handleDirectAiAnalyze = async () => {
    const uniqueFiles = Array.from(new Set(Array.from(imageFiles.values())));
    if (!uniqueFiles.length) {
      alert("Please select photos first using Step 1 (Folder, ZIP file, or Photos).");
      return;
    }
    const cleanToken = aiToken.trim().replace(/^Bearer\s+/i, "").replace(/^['"]|['"]$/g, "");
    if (!cleanToken) {
      alert("⚠️ API Token is required.\n\nPlease enter your API token in the AI Configuration box below.");
      return;
    }
    localStorage.setItem("papas_ai_token", cleanToken);
    if (aiProvider === "hf") localStorage.setItem("papas_hf_token", cleanToken);

    setUploading(true);
    setUploadProgress({ current: 0, total: uniqueFiles.length });

    try {
      // 1. Upload photos to boutique storage and generate optimized base64
      const items = [];
      for (let i = 0; i < uniqueFiles.length; i++) {
        const file = uniqueFiles[i];
        setUploadStatus(`Photo ${i + 1} of ${uniqueFiles.length}: Uploading "${file.name}" to boutique storage...`);
        setUploadProgress({ current: i + 1, total: uniqueFiles.length });

        const formData = new FormData();
        formData.append("image", file);
        const uploadRes = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(`Upload error for "${file.name}": ${uploadData.error || "Failed"}`);
        }

        const base64Data = await fileToBase64(file);
        items.push({
          name: file.name,
          url: uploadData.url,
          base64: base64Data,
          mimeType: file.type || "image/jpeg",
        });
      }

      // 2. Call batch-analyze endpoint in chunks of up to 12 images (guarantees fast responses & avoids serverless limits)
      const CHUNK_SIZE = 12;
      const totalBatches = Math.ceil(items.length / CHUNK_SIZE);
      const allAiProducts = [];

      for (let b = 0; b < items.length; b += CHUNK_SIZE) {
        const chunk = items.slice(b, b + CHUNK_SIZE);
        const batchNum = Math.floor(b / CHUNK_SIZE) + 1;
        setUploadStatus(`🤖 AI Vision analyzing batch ${batchNum} of ${totalBatches} (${chunk.length} photos)...`);

        const batchRes = await fetch(`/api/admin/ai/batch-analyze?_t=${Date.now()}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            provider: aiProvider,
            token: cleanToken,
            model: aiModel,
            items: chunk,
          }),
        });

        if (!batchRes.ok) {
          const rawErr = await batchRes.text();
          let parsedErr = rawErr;
          try {
            const j = JSON.parse(rawErr);
            parsedErr = j.error || rawErr;
          } catch {}
          throw new Error(`Batch ${batchNum} error: ${parsedErr}`);
        }

        const batchData = await batchRes.json();
        const batchProducts = Array.isArray(batchData?.products) ? batchData.products : [];
        allAiProducts.push(...batchProducts);
      }

      if (!allAiProducts.length) {
        throw new Error("AI did not generate any valid product entries.");
      }

      // 3. Save products in bulk directly into the Pendings category
      setUploadStatus(`Saving ${allAiProducts.length} dresses into Pending Review category...`);
      const bulkRes = await fetch(`/api/admin/products/bulk?_t=${Date.now()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ products: allAiProducts }),
      });
      const bulkData = await bulkRes.json();
      if (!bulkRes.ok) throw new Error(bulkData.error || "Failed to save products in bulk.");

      const savedCount = allAiProducts.length;
      alert(`🎉 Successfully analyzed and grouped all ${uniqueFiles.length} photos into ${savedCount} dresses directly in your Pendings list!`);

      if (onComplete) {
        await onComplete("pending", bulkData.products || allAiProducts);
      }
    } catch (err) {
      alert("AI Vision Notice: " + err.message);
    } finally {
      setUploading(false);
    }
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

  const handleUploadToPendings = async () => {
    if (!parsedItems.length) return;
    setUploading(true);
    setUploadStatus("Matching and uploading photos to boutique storage...");

    const uploadedUrlsCache = new Map();
    const allImagesToUpload = [];

    for (const item of parsedItems) {
      const imgs = Array.isArray(item.images)
        ? item.images
        : (item.image ? [item.image] : []);
      for (const imgName of imgs) {
        const clean = typeof imgName === "string" ? imgName.trim() : "";
        if (clean && !clean.startsWith("http") && !clean.startsWith("/api/")) {
          const lower = clean.toLowerCase();
          if (!allImagesToUpload.some((x) => x.lower === lower)) {
            allImagesToUpload.push({ original: clean, lower });
          }
        }
      }
    }

    setUploadProgress({ current: 0, total: allImagesToUpload.length });

    try {
      for (let i = 0; i < allImagesToUpload.length; i++) {
        const { original, lower } = allImagesToUpload[i];
        setUploadStatus(
          `Uploading image ${i + 1} of ${allImagesToUpload.length}: ${original}...`
        );
        setUploadProgress({ current: i + 1, total: allImagesToUpload.length });

        const file = findMatchingImageFile(original, imageFiles);
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
          uploadedUrlsCache.set(normalizeImageName(original), resData.url);
        }
      }

      setUploadStatus("Saving dresses into Pending Review category...");
      const prepared = parsedItems.map((item) => {
        const rawImgs = Array.isArray(item.images)
          ? item.images
          : (item.image ? [item.image] : []);

        const finalImgs = rawImgs
          .map((imgName) => {
            if (typeof imgName !== "string") return "";
            const trimmed = imgName.trim();
            if (trimmed.startsWith("http") || trimmed.startsWith("/api/")) return trimmed;
            return (
              uploadedUrlsCache.get(trimmed.toLowerCase()) ||
              uploadedUrlsCache.get(trimmed) ||
              uploadedUrlsCache.get(normalizeImageName(trimmed)) ||
              ""
            );
          })
          .filter(Boolean);

        return {
          name: item.name || "Untitled Dress",
          collection: item.collection || "Kurtis",
          description: item.description || "",
          colours: Array.isArray(item.colours) ? item.colours : (typeof item.colours === "string" ? item.colours.split(",").map(c => c.trim()).filter(Boolean) : []),
          colorVariants: item.colorVariants || [],
          images: finalImgs,
          image: finalImgs[0] || "",
          buyPrice: "",
          fixedPrice: "",
          price: 0,
          sizes: [],
          stock: {},
          pending: true,
          status: "PENDING",
          published: false,
        };
      });

      const bulkRes = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: prepared }),
      });
      const bulkData = await bulkRes.json();
      if (!bulkRes.ok) {
        throw new Error(bulkData.error || "Failed to save products in bulk.");
      }

      alert(`🎉 Successfully uploaded photos and saved ${prepared.length} dresses under the Pendings category!`);

      if (onComplete) {
        await onComplete("pending");
      }
    } catch (err) {
      alert("Error uploading to Pendings: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const uniqueFilesCount = Array.from(new Set(Array.from(imageFiles.values()))).length;

  return (
    <div className="bulk-uploader-card">
      {/* Import Method Switcher */}
      <div className="bulk-method-nav">
        <button
          type="button"
          className={`bulk-method-btn ${bulkMethod === "hf" ? "active" : ""}`}
          onClick={() => setBulkMethod("hf")}
        >
          ✨ Auto-Analyze with AI Vision (Direct / No JSON)
          <span className="badge-new-addon">Add-on</span>
        </button>
        <button
          type="button"
          className={`bulk-method-btn ${bulkMethod === "json" ? "active" : ""}`}
          onClick={() => setBulkMethod("json")}
        >
          ⚡ Import via JSON / ZIP Prompt (Standard Method)
        </button>
      </div>

      <div className="bulk-top-header">
        <div>
          <h2>
            {bulkMethod === "hf"
              ? "✨ Direct AI Vision Import & Auto-Grouping"
              : "⚡ Bulk Import to Pendings via JSON"}
          </h2>
          <p className="bulk-desc">
            {bulkMethod === "hf"
              ? "Select your dress photos (folder, ZIP, or gallery). AI Vision will automatically inspect photos, group multi-angle poses and color variants, and save directly into your Pendings list!"
              : "Load photos (Folder, ZIP, or Gallery) & AI-generated JSON. Photos will be uploaded and dresses will be saved under the Pendings Category for you to complete prices and sizes."}
          </p>
        </div>
        {bulkMethod === "json" && (
          <div className="bulk-quick-actions">
            <button
              type="button"
              className="text-button"
              onClick={() => setShowAiGuide((prev) => !prev)}
            >
              {showAiGuide ? "Hide AI & ZIP Guide ▲" : "🤖 Mobile AI & ZIP Guide ▼"}
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
        )}
      </div>

      {bulkMethod === "json" && showAiGuide && (
        <div className="ai-guide-box">
          <h3>📱 How to Generate Product JSON with ChatGPT / Gemini (with ZIP or Photos):</h3>
          <ol>
            <li>
              <b>Copy the Prompt:</b> Tap <b>"Copy AI Prompt"</b> above.
            </li>
            <li>
              <b>Upload to AI (ZIP or Photos):</b>
              <ul>
                <li>If you have <b>more than 20 photos</b>: Compress your photos into a single <b>.zip file</b> (e.g. <code>dresses.zip</code>) on your phone or PC, and attach the .zip file in <b>ChatGPT</b> (with Code Interpreter) or <b>Gemini</b>!</li>
                <li>Or select multiple individual photos directly.</li>
              </ul>
            </li>
            <li>
              <b>Paste Prompt &amp; Run:</b> Send the prompt. The AI will inspect the photos and generate separate dresses for each distinct pattern.
            </li>
            <li>
              <b>Upload to Papa's Boutique:</b> Select your photos folder or the same <b>.zip file</b> in <b>Step 1</b>, paste the JSON in <b>Step 2</b>, and click <b>"Upload Photos &amp; Save All to Pendings"</b>!
            </li>
            <li>
              <b>Complete in Pendings Tab:</b> All items will be saved under the <b>⏳ Pending Items</b> category where you can enter prices and pick sizes whenever you want!
            </li>
          </ol>
        </div>
      )}

      {/* Step 1: Select Images (Shared by both methods) */}
      <div className="bulk-step-box">
        <div className="bulk-step-title">
          <span className="step-num">1</span>
          <div>
            <h3>Select Dress Photos (Folder, ZIP file, or Multi-select)</h3>
            <p>Choose the folder, a .zip archive, or multiple photos of your dresses.</p>
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
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          style={{ display: "none" }}
          onChange={handleZipFile}
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
            className="button select-photos-btn zip-btn"
            disabled={zipLoading}
            onClick={() => zipInputRef.current?.click()}
          >
            {zipLoading ? "⏳ Extracting ZIP..." : "📦 Upload ZIP File (.zip)"}
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

        {uniqueFilesCount > 0 && (
          <div className="selected-photos-summary">
            <span className="badge-photos-count">
              ✓ <b>{uniqueFilesCount}</b> unique images ready
            </span>
            <div className="photo-names-chip-list">
              {Array.from(imageFiles.keys())
                .filter((k) => !k.includes(" "))
                .slice(0, 8)
                .map((name, i) => (
                  <span key={i} className="photo-name-chip">
                    {name}
                  </span>
                ))}
              {uniqueFilesCount > 8 && (
                <span className="photo-name-chip more">
                  +{uniqueFilesCount - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* METHOD A: AI Vision Direct Analysis */}
      {bulkMethod === "hf" && (
        <div className="bulk-step-box hf-step-box">
          <div className="bulk-step-title">
            <span className="step-num">2</span>
            <div>
              <h3>AI Vision Configuration &amp; Auto-Grouping</h3>
              <p>Configure your free AI Vision token (Hugging Face or Google Gemini) to auto-analyze and group dress photos.</p>
            </div>
          </div>

          <div className="hf-config-grid">
            <div className="hf-config-col">
              <label className="hf-label">
                AI Vision Provider
                <span className="helper-txt">Choose which AI service analyzes your photos</span>
              </label>
              <select
                className="hf-model-select"
                value={aiProvider}
                onChange={(e) => {
                  const p = e.target.value;
                  setAiProvider(p);
                  setTokenTestStatus(null);
                  if (p === "hf") setAiModel("Qwen/Qwen2.5-VL-72B-Instruct");
                  else setAiModel("gemini-2.5-flash");
                }}
              >
                <option value="hf">🤗 Hugging Face Vision (Qwen 2.5 VL 72B / DeepSeek V4.1)</option>
                <option value="gemini">✨ Google Gemini Vision (gemini-2.5-flash / gemini-2.0)</option>
              </select>
            </div>

            <div className="hf-config-col">
              <label className="hf-label">
                Vision AI Model
                <span className="helper-txt">Multimodal model used for cataloguing</span>
              </label>
              <select
                className="hf-model-select"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              >
                {aiProvider === "hf" ? (
                  <>
                    <option value="Qwen/Qwen2.5-VL-72B-Instruct">
                      Qwen/Qwen2.5-VL-72B-Instruct (Flagship 72B Vision - Best Accuracy)
                    </option>
                    <option value="deepseek-ai/DeepSeek-V4.1-Flash">
                      deepseek-ai/DeepSeek-V4.1-Flash (High Availability &amp; Fast)
                    </option>
                    <option value="google/gemma-3-27b-it">
                      google/gemma-3-27b-it (Google Gemma 3 27B Vision)
                    </option>
                    <option value="google/gemma-3-4b-it">
                      google/gemma-3-4b-it (Google Gemma 3 4B Vision - Lightweight)
                    </option>
                  </>
                ) : (
                  <>
                    <option value="gemini-2.5-flash">
                      Gemini 2.5 Flash (Recommended - Latest &amp; High Accuracy - Free)
                    </option>
                    <option value="gemini-2.0-flash">
                      Gemini 2.0 Flash (Next-Gen Multimodal - Free)
                    </option>
                    <option value="gemini-2.5-pro">
                      Gemini 2.5 Pro (Deep Reasoning)
                    </option>
                  </>
                )}
              </select>
            </div>

            <div className="hf-config-col token-col-full">
              <label className="hf-label">
                {aiProvider === "hf" ? "Hugging Face Access Token" : "Google Gemini API Key"}{" "}
                <span className="mandatory-star">*</span>
                <span className="helper-txt">
                  {aiProvider === "hf" ? (
                    <>
                      User Access Token from{" "}
                      <a
                        href="https://huggingface.co/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="hf-external-link"
                      >
                        huggingface.co/settings/tokens ↗
                      </a>{" "}
                      (Ensure permission: <b>Make calls to Inference Providers</b> or <b>Read</b>)
                    </>
                  ) : (
                    <>
                      Free API key from{" "}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="hf-external-link"
                      >
                        Google AI Studio ↗
                      </a>{" "}
                      (Takes 10 seconds, completely free, no credit card required)
                    </>
                  )}
                </span>
              </label>
              <div className="hf-token-input-row">
                <input
                  type={showTokenInput ? "text" : "password"}
                  placeholder={aiProvider === "hf" ? "hf_..." : "AIzaSy..."}
                  value={aiToken}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAiToken(val);
                    setTokenTestStatus(null);
                    if (val.trim().startsWith("hf_") && aiProvider !== "hf") {
                      setAiProvider("hf");
                      setAiModel("Qwen/Qwen2.5-VL-72B-Instruct");
                    } else if (val.trim().startsWith("AIza") && aiProvider !== "gemini") {
                      setAiProvider("gemini");
                      setAiModel("gemini-2.5-flash");
                    }
                  }}
                  className="hf-token-input"
                />
                <button
                  type="button"
                  className="text-button toggle-token-btn"
                  onClick={() => setShowTokenInput((prev) => !prev)}
                >
                  {showTokenInput ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  className="button-secondary test-token-btn"
                  disabled={testingToken || !aiToken.trim()}
                  onClick={testAiToken}
                  title="Verify that your token is valid and active"
                >
                  {testingToken ? "⏳ Testing..." : "🔍 Test Token"}
                </button>
                <button
                  type="button"
                  className="button-secondary save-token-btn"
                  onClick={saveAiToken}
                >
                  {tokenSavedNotice ? "✓ Saved!" : "Save Token"}
                </button>
              </div>

              {aiProvider === "hf" && (
                <div className="provider-helper-tip hf-tip">
                  🤗 <b>Hugging Face Vision AI active:</b> Powered by flagship <b>Qwen 2.5 VL 72B</b> and <b>DeepSeek V4.1 Flash</b> via <code>router.huggingface.co</code>. If a model server is busy, our backend automatically falls back to alternative vision models seamlessly!
                </div>
              )}
              {aiProvider === "gemini" && (
                <div className="provider-helper-tip gemini-tip">
                  💡 <b>Gemini Vision active:</b> Free API key from Google AI Studio.
                </div>
              )}

              {tokenTestStatus && (
                <div
                  className={`token-test-result ${tokenTestStatus.ok ? "success" : "error"}`}
                >
                  {tokenTestStatus.ok
                    ? `✅ ${tokenTestStatus.message}`
                    : `⚠️ ${tokenTestStatus.error}`}
                </div>
              )}
            </div>
          </div>

          <div className="hf-auto-group-banner">
            <span className="hf-auto-group-icon">✨</span>
            <div className="hf-auto-group-text">
              <h4>100% Automated Dress Grouping:</h4>
              <p>
                • <b>Multiple poses of 1 dress (same color):</b> Automatically grouped into 1 product with 1 single price entry.<br />
                • <b>Same dress in multiple colors:</b> Grouped under the same name with per-color variant stock in Pendings.<br />
                • <b>Different dress designs:</b> Kept strictly separate as independent products.
              </p>
            </div>
          </div>

          <div className="hf-action-footer">
            <button
              type="button"
              className="button hf-analyze-start-btn"
              disabled={uploading || uniqueFilesCount === 0}
              onClick={handleDirectAiAnalyze}
            >
              {uploading
                ? "⏳ Analyzing with AI Vision & Saving..."
                : `🚀 Auto-Analyze & Save to Pendings (${uniqueFilesCount} ${uniqueFilesCount === 1 ? "photo" : "photos"})`}
            </button>
            <p className="hf-btn-note">
              No JSON needed! AI Vision inspects each photo, detects poses and colors, and saves directly into the Pendings category.
            </p>
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
        </div>
      )}

      {/* METHOD B: JSON & ZIP Standard Method */}
      {bulkMethod === "json" && (
        <>
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

          {parsedItems.length > 0 && !parseError && (
            <div className="bulk-step-box">
              <div className="bulk-step-title">
                <span className="step-num">3</span>
                <div>
                  <h3>Import Preview ({parsedItems.length} Dresses)</h3>
                  <p>Review dresses and photo matches. Suffixes like _2 or -1 are automatically matched to the base photo name.</p>
                </div>
              </div>

              <div className="bulk-preview-container">
                <table className="bulk-preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Dress Name</th>
                      <th>Category</th>
                      <th>Colours / Variants</th>
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
                        if (t.startsWith("http") || t.startsWith("/api/")) return true;
                        return Boolean(findMatchingImageFile(t, imageFiles));
                      }).length;
                      const allMatched = imgs.length > 0 && matchedCount === imgs.length;

                      return (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td><b>{item.name || "Untitled"}</b></td>
                          <td><span className="tag-category">{item.collection || "Kurtis"}</span></td>
                          <td>
                            {Array.isArray(item.colours) ? item.colours.join(", ") : (item.colours || "—")}
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

              <div className="bulk-action-footer">
                <button
                  type="button"
                  className="button bulk-upload-start-btn"
                  disabled={uploading || parsedItems.length === 0}
                  onClick={handleUploadToPendings}
                >
                  {uploading
                    ? "⏳ Uploading Photos & Saving to Pendings..."
                    : `⚡ Upload Photos & Save All to Pendings (${parsedItems.length} ${parsedItems.length === 1 ? "dress" : "dresses"})`}
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
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PendingItemCard({ product, onSaveSuccess, onEditFull, onDelete }) {
  const imagesList = product.images?.length
    ? product.images
    : product.image
    ? [product.image]
    : [];

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedNotice, setCopiedNotice] = useState(false);

  const rawColours = Array.isArray(product.colours)
    ? product.colours
    : typeof product.colours === "string"
    ? product.colours.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  // Initialize variants
  const [variants, setVariants] = useState(() => {
    if (Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
      return product.colorVariants.map((v, idx) => ({
        colour: v.colour || (rawColours[idx] || `Color ${idx + 1}`),
        image: v.image || (v.images && v.images[0]) || imagesList[idx] || imagesList[0] || "",
        buyPrice: v.buyPrice !== undefined && v.buyPrice !== null && v.buyPrice !== 0 ? String(v.buyPrice) : (product.buyPrice ? String(product.buyPrice) : ""),
        fixedPrice: v.fixedPrice || v.price ? String(v.fixedPrice || v.price) : (product.fixedPrice || product.price ? String(product.fixedPrice || product.price) : ""),
        sizes: Array.isArray(v.sizes) && v.sizes.length ? v.sizes : (Array.isArray(product.sizes) ? product.sizes : []),
        stock: v.stock && typeof v.stock === "object" ? v.stock : (product.stock && typeof product.stock === "object" ? product.stock : {}),
      }));
    }
    if (rawColours.length > 1) {
      return rawColours.map((colour, idx) => ({
        colour,
        image: imagesList[idx] || imagesList[0] || "",
        buyPrice: product.buyPrice ? String(product.buyPrice) : "",
        fixedPrice: product.fixedPrice || product.price ? String(product.fixedPrice || product.price) : "",
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        stock: product.stock && typeof product.stock === "object" ? product.stock : {},
      }));
    }
    return [
      {
        colour: rawColours[0] || "Standard",
        image: imagesList[0] || "",
        buyPrice: product.buyPrice ? String(product.buyPrice) : "",
        fixedPrice: product.fixedPrice || product.price ? String(product.fixedPrice || product.price) : "",
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        stock: product.stock && typeof product.stock === "object" ? product.stock : {},
      },
    ];
  });

  const handleUpdateVariant = (index, field, value) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    );
  };

  const handleApplyToAllVariants = () => {
    if (variants.length <= 1) return;
    const first = variants[0];
    setVariants((prev) =>
      prev.map((v, i) =>
        i === 0
          ? v
          : {
              ...v,
              buyPrice: first.buyPrice,
              fixedPrice: first.fixedPrice,
              sizes: [...first.sizes],
              stock: { ...first.stock },
            }
      )
    );
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const handleAddVariant = () => {
    const nextNum = variants.length + 1;
    const first = variants[0];
    setVariants([
      ...variants,
      {
        colour: `Color ${nextNum}`,
        image: imagesList[variants.length] || imagesList[0] || "",
        buyPrice: first ? first.buyPrice : "",
        fixedPrice: first ? first.fixedPrice : "",
        sizes: first ? [...first.sizes] : [],
        stock: first ? { ...first.stock } : {},
      },
    ]);
  };

  const handleRemoveVariant = (indexToRemove) => {
    if (variants.length <= 1) return;
    setVariants(variants.filter((_, idx) => idx !== indexToRemove));
  };

  const totalQuantityCombined = variants.reduce((sum, v) => {
    return sum + Object.values(v.stock || {}).reduce((s, q) => s + (Number(q) || 0), 0);
  }, 0);

  const handlePublish = async () => {
    setErrorMsg("");
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const bp = Number(v.buyPrice);
      const fp = Number(v.fixedPrice);
      const label = variants.length > 1 ? `"${v.colour}" variant` : "this dress";
      if (v.buyPrice === "" || isNaN(bp) || bp < 0) {
        setErrorMsg(`⚠️ Buy Price is mandatory for ${label}. Please enter cost price.`);
        return;
      }
      if (v.fixedPrice === "" || isNaN(fp) || fp <= 0) {
        setErrorMsg(`⚠️ Fixed Price is mandatory for ${label}. Please enter selling price.`);
        return;
      }
      if (!v.sizes || !v.sizes.length) {
        setErrorMsg(`⚠️ Please select at least one available size for ${label}.`);
        return;
      }
      const vQty = Object.values(v.stock || {}).reduce((s, q) => s + (Number(q) || 0), 0);
      if (vQty <= 0) {
        setErrorMsg(`⚠️ Quantity must be at least 1 piece for ${label}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const consolidatedStock = {};
      const allSizesSet = new Set();
      variants.forEach((v) => {
        (v.sizes || []).forEach((s) => allSizesSet.add(s));
        Object.entries(v.stock || {}).forEach(([s, q]) => {
          consolidatedStock[s] = (consolidatedStock[s] || 0) + (Number(q) || 0);
        });
      });

      const first = variants[0];
      const primaryBuyPrice = Number(first.buyPrice);
      const primaryFixedPrice = Number(first.fixedPrice);
      const isMultiColor = variants.length > 1;

      const payload = {
        ...product,
        buyPrice: primaryBuyPrice,
        fixedPrice: primaryFixedPrice,
        price: primaryFixedPrice,
        sizes: Array.from(allSizesSet),
        stock: consolidatedStock,
        colours: isMultiColor
          ? variants.map((v) => v.colour)
          : (first.colour && first.colour !== "Standard" ? [first.colour] : (rawColours.length ? rawColours : [])),
        colorVariants: isMultiColor
          ? variants.map((v) => ({
              ...v,
              buyPrice: Number(v.buyPrice),
              fixedPrice: Number(v.fixedPrice),
              price: Number(v.fixedPrice),
            }))
          : [],
        pending: false,
        status: "ACTIVE",
        published: true,
      };

      const response = await api("admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      onSaveSuccess(product.id, response.product || payload);
    } catch (err) {
      setErrorMsg(err.message || "Failed to publish product.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pending-item-card">
      <div className="pending-card-header">
        {/* Multi-Photo Gallery Preview with Thumbnails */}
        <div className="pending-gallery-box">
          <div
            className="pending-img-thumb clickable-preview"
            onClick={() => setLightboxOpen(true)}
            title="Click to view enlarged image"
          >
            <img
              src={imagesList[activeImgIndex] || imagesList[0] || "/placeholder.jpg"}
              alt={product.name}
              onError={(e) => {
                e.target.src =
                  "data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2280%22%20height%3D%22100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20fill%3D%22%23eee%22%20width%3D%2280%22%20height%3D%22100%22%2F%3E%3Ctext%20fill%3D%22%23aaa%22%20font-size%3D%2211%22%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fsvg%3E";
              }}
            />
            <span className="pending-zoom-badge">🔍 Zoom</span>
            {imagesList.length > 1 && (
              <span className="pending-img-count">
                {activeImgIndex + 1}/{imagesList.length} photos
              </span>
            )}
          </div>

          {imagesList.length > 1 && (
            <div className="pending-thumb-strip">
              {imagesList.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`pending-thumb-btn ${idx === activeImgIndex ? "active" : ""}`}
                  onClick={() => setActiveImgIndex(idx)}
                  title={`Photo ${idx + 1}`}
                >
                  <img src={img} alt={`Thumb ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pending-info">
          <div className="pending-badges-row">
            <span className="badge-pending-tag">⏳ PENDING REVIEW</span>
            <span className="tag-category">{product.collection || "Kurtis"}</span>
            {variants.length > 1 ? (
              <span className="pending-colour-badge">
                🎨 {variants.map((v) => v.colour).join(" · ")}
              </span>
            ) : (
              variants[0]?.colour && variants[0].colour !== "Standard" && (
                <span className="pending-colour-badge">
                  🎨 {variants[0].colour}
                </span>
              )
            )}
            <span className="pending-photos-count-badge">
              📸 {imagesList.length} {imagesList.length === 1 ? "photo" : "photos"}
            </span>
          </div>
          <h3 className="pending-product-name">{product.name}</h3>
          <p className="pending-desc">{product.description}</p>
        </div>

        <div className="pending-top-actions">
          <button
            type="button"
            className="button-secondary edit-full-btn"
            onClick={() => onEditFull(product)}
            title="Edit all fields in main editor"
          >
            ✏️ Full Edit
          </button>
          <button
            type="button"
            className="button-secondary delete-pending-btn"
            onClick={() => onDelete(product.id)}
            title="Discard this pending product"
          >
            🗑️ Discard
          </button>
        </div>
      </div>

      <div className="pending-card-body">
        {variants.length > 1 ? (
          <>
            {/* Multi-Color Variants Toolbar & Section */}
            <div className="variants-section-header">
              <div className="variants-title-wrap">
                <h4 className="variants-title">
                  👗 Dress Variants &amp; Pricing ({variants.length} Colors):
                </h4>
                <span className="variants-subtitle">
                  Enter Buy Price, Fixed Price, and pick Sizes for each dress color.
                </span>
              </div>
              <div className="variants-toolbar-actions">
                <button
                  type="button"
                  className="button-secondary apply-all-btn"
                  onClick={handleApplyToAllVariants}
                  title="Copies price, sizes, and quantities from Color 1 to all other colors"
                >
                  ⚡ Use Details for All Colors
                </button>
                <button
                  type="button"
                  className="text-button add-variant-btn"
                  onClick={handleAddVariant}
                >
                  + Add Color Variant
                </button>
              </div>
            </div>

            {copiedNotice && (
              <div className="apply-all-alert">
                ✓ Copied Buy Price, Fixed Price, Sizes, and Stock from <b>"{variants[0].colour}"</b> to all other colors!
              </div>
            )}

            {/* Variants List */}
            <div className="variants-cards-container">
              {variants.map((variant, idx) => (
                <div key={idx} className="variant-editor-card">
                  <div className="variant-card-top">
                    <div className="variant-label-row">
                      <span className="variant-pill-tag">Color #{idx + 1}</span>
                      <input
                        type="text"
                        className="variant-name-input"
                        value={variant.colour}
                        onChange={(e) => handleUpdateVariant(idx, "colour", e.target.value)}
                        placeholder="e.g. Ruby Red, Mustard Yellow..."
                      />
                    </div>
                    <button
                      type="button"
                      className="text-button remove-variant-btn"
                      onClick={() => handleRemoveVariant(idx)}
                      title="Remove this color variant"
                    >
                      ✕ Remove Color
                    </button>
                  </div>

                  <div className="pending-fields-grid">
                    <div className="pending-field-group">
                      <label>
                        Buy Price (₹) <span className="mandatory-star">*</span>
                        <span className="helper-txt">(Cost price per unit - Mandatory)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 1500"
                        value={variant.buyPrice}
                        onChange={(e) => handleUpdateVariant(idx, "buyPrice", e.target.value)}
                      />
                    </div>

                    <div className="pending-field-group">
                      <label>
                        Fixed Price (₹) <span className="mandatory-star">*</span>
                        <span className="helper-txt">(Selling / Retail price - Mandatory)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 2990"
                        value={variant.fixedPrice}
                        onChange={(e) => handleUpdateVariant(idx, "fixedPrice", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="pending-size-section">
                    <div className="field-group-header">
                      <span className="field-group-title">
                        Available Sizes &amp; Stock Count for "{variant.colour}" <span className="mandatory-star">*</span>
                      </span>
                      <span className="field-group-subtitle">
                        Click any size to select (defaults to 1 piece). Adjust quantities with + / - buttons.
                      </span>
                    </div>
                    <SizeStockSelector
                      selectedSizes={variant.sizes || []}
                      stock={variant.stock || {}}
                      onChange={(newSizes, newStock) => {
                        handleUpdateVariant(idx, "sizes", newSizes);
                        handleUpdateVariant(idx, "stock", newStock);
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Single Dress Pricing & Stock (Only 1 price entry needed!) */
          <div className="single-dress-editor">
            <div className="pending-fields-grid">
              <div className="pending-field-group">
                <label>
                  Buy Price (₹) <span className="mandatory-star">*</span>
                  <span className="helper-txt">(Cost price per unit - Mandatory)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1500"
                  value={variants[0].buyPrice}
                  onChange={(e) => handleUpdateVariant(0, "buyPrice", e.target.value)}
                />
              </div>

              <div className="pending-field-group">
                <label>
                  Fixed Price (₹) <span className="mandatory-star">*</span>
                  <span className="helper-txt">(Selling / Retail price - Mandatory)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 2990"
                  value={variants[0].fixedPrice}
                  onChange={(e) => handleUpdateVariant(0, "fixedPrice", e.target.value)}
                />
              </div>
            </div>

            <div className="pending-size-section">
              <div className="field-group-header">
                <span className="field-group-title">
                  Available Sizes &amp; Stock Count <span className="mandatory-star">*</span>
                </span>
                <span className="field-group-subtitle">
                  Click any size to select (defaults to 1 piece). Adjust quantities with + / - buttons.
                </span>
              </div>
              <SizeStockSelector
                selectedSizes={variants[0].sizes || []}
                stock={variants[0].stock || {}}
                onChange={(newSizes, newStock) => {
                  handleUpdateVariant(0, "sizes", newSizes);
                  handleUpdateVariant(0, "stock", newStock);
                }}
              />
            </div>

            <div className="single-variant-footer-action">
              <button
                type="button"
                className="text-button add-variant-btn"
                onClick={handleAddVariant}
              >
                + Add Another Color Variant
              </button>
            </div>
          </div>
        )}

        {errorMsg && <p className="pending-error-banner">{errorMsg}</p>}

        <div className="pending-card-footer">
          <div className="pending-total-stock-summary">
            Total Combined Units: <b>{totalQuantityCombined} pieces</b>
            {variants.length > 1 && <span className="variants-count-note"> (across {variants.length} colors)</span>}
          </div>
          <button
            type="button"
            className="button complete-publish-btn"
            disabled={saving}
            onClick={handlePublish}
          >
            {saving ? "⏳ Moving to Live Store..." : "✓ Complete & Move to Live Store"}
          </button>
        </div>
      </div>

      {lightboxOpen && (
        <ImageLightbox
          images={imagesList}
          currentIndex={activeImgIndex}
          onClose={() => setLightboxOpen(false)}
          onSelectIndex={setActiveImgIndex}
        />
      )}
    </div>
  );
}

function PendingReviewList({ products, onRefresh, onSaveSuccess, onEditFull, onDelete, onDiscardAll, onViewLive }) {
  const pendingProducts = products.filter((p) => p.pending || p.status === "PENDING");
  const liveCount = products.filter((p) => !p.pending && p.status !== "PENDING").length;

  const totalPendingUnits = pendingProducts.reduce((sum, p) => {
    return sum + Object.values(p.stock || {}).reduce((s, q) => s + (Number(q) || 0), 0);
  }, 0);

  if (pendingProducts.length === 0) {
    return (
      <div className="empty-pending-box">
        <span className="empty-pending-icon">🎉</span>
        <h3>No Pending Items!</h3>
        <p>All dresses have complete details and are active in your boutique catalogue.</p>
        {onViewLive && (
          <button
            type="button"
            className="button"
            style={{ marginTop: "1rem" }}
            onClick={onViewLive}
          >
            👉 View Live Store Inventory ({liveCount} {liveCount === 1 ? "Dress" : "Dresses"})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pending-review-section">
      <div className="pending-section-banner">
        <div className="pending-banner-text">
          <h2>⏳ Pending Review ({pendingProducts.length} {pendingProducts.length === 1 ? "Dress" : "Dresses"})</h2>
          <p>
            These dresses were imported with partial data. All photos for each dress are displayed below. Enter the <strong>Buy Price</strong>, <strong>Fixed Price</strong>, and choose <strong>Sizes</strong> per color, then click <strong>"Complete &amp; Move to Live Store"</strong>.
          </p>
        </div>
        <div className="pending-banner-actions">
          <button
            type="button"
            className="button-secondary discard-all-pending-btn"
            onClick={onDiscardAll}
            title="Permanently remove all pending items"
          >
            🗑️ Discard All Pendings ({pendingProducts.length})
          </button>
        </div>
      </div>

      <div className="pending-cards-list">
        {pendingProducts.map((p) => (
          <PendingItemCard
            key={p.id}
            product={p}
            onSaveSuccess={onSaveSuccess}
            onEditFull={onEditFull}
            onDelete={onDelete}
          />
        ))}
      </div>
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
  const [activeTab, setActiveTab] = useState("live"); // "live" | "single" | "bulk" | "pending"
  const [adminStatusFilter, setAdminStatusFilter] = useState("ALL");
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("ALL");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminQueue, setAdminQueue] = useState(null); // array of items or null
  const [queueIndex, setQueueIndex] = useState(0);
  const navigate = useNavigate();

  const load = (targetTab) =>
    api("admin/products")
      .then(({ products }) => {
        setProducts(products || []);
        setLoggedIn(true);
        if (targetTab) setActiveTab(targetTab);
      })
      .catch(() => setLoggedIn(false));

  const pendingProducts = products.filter((p) => p.pending || p.status === "PENDING");
  const liveProducts = products.filter((p) => !p.pending && p.status !== "PENDING");

  useEffect(() => { load(); }, []);

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

  const loadQueueItem = (item, idx, total) => {
    setActiveTab("single");
    setEditing(null);
    setDraft({
      ...blank,
      name: item.name || "",
      collection: item.collection || "Kurtis",
      description: item.description || "",
      colours: Array.isArray(item.colours) ? item.colours.join(", ") : (item.colours || ""),
      images: item.images || (item.image ? [item.image] : []),
      image: (item.images && item.images[0]) || item.image || "",
      buyPrice: "",
      fixedPrice: "",
      sizes: [],
      stock: {},
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startAutofillQueue = (items) => {
    if (!items || !items.length) return;
    setAdminQueue(items);
    setQueueIndex(0);
    loadQueueItem(items[0], 0, items.length);
  };

  const save = async (event) => {
    event.preventDefault();

    const buyPriceNum = Number(draft.buyPrice);
    const fixedPriceNum = Number(draft.fixedPrice);

    if (draft.buyPrice === "" || draft.buyPrice === null || isNaN(buyPriceNum) || buyPriceNum < 0) {
      alert("⚠️ Buy Price (Cost price) is mandatory. Please enter a valid amount.");
      return;
    }
    if (draft.fixedPrice === "" || draft.fixedPrice === null || isNaN(fixedPriceNum) || fixedPriceNum <= 0) {
      alert("⚠️ Fixed Price (Selling price) is mandatory. Please enter a valid retail price.");
      return;
    }

    const sizesList = Array.isArray(draft.sizes)
      ? draft.sizes
      : typeof draft.sizes === "string"
      ? draft.sizes.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    if (!sizesList.length) {
      alert("⚠️ Size is mandatory. Please select at least one available size.");
      return;
    }

    const stockObj = typeof draft.stock === "object" && draft.stock !== null ? draft.stock : {};
    const totalQty = Object.values(stockObj).reduce((s, q) => s + (Number(q) || 0), 0);
    if (totalQty <= 0) {
      alert("⚠️ Please specify a quantity of at least 1 for the selected size(s).");
      return;
    }

    const imagesList = draft.images?.length
      ? draft.images
      : draft.image
      ? [draft.image]
      : [];
    if (!imagesList.length) {
      alert("⚠️ Please upload at least one photo for this product.");
      return;
    }

    const coloursList = Array.isArray(draft.colours)
      ? draft.colours
      : typeof draft.colours === "string"
      ? draft.colours.split(",").map((c) => c.trim()).filter(Boolean)
      : [];

    try {
      await api("admin/products", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          id: editing?.id,
          slug: editing?.slug,
          price: fixedPriceNum,
          fixedPrice: fixedPriceNum,
          buyPrice: buyPriceNum,
          image: imagesList[0] || "",
          images: imagesList,
          sizes: sizesList,
          colours: coloursList,
          stock: stockObj,
        }),
      });

      // If in queue mode from bulk JSON:
      if (adminQueue && adminQueue.length > 0) {
        const nextIndex = queueIndex + 1;
        if (nextIndex < adminQueue.length) {
          setQueueIndex(nextIndex);
          loadQueueItem(adminQueue[nextIndex], nextIndex, adminQueue.length);
          setMessage(`✅ Saved dress ${queueIndex + 1}! Now loaded dress ${nextIndex + 1} of ${adminQueue.length}. Please enter prices and select sizes.`);
          load();
          return;
        } else {
          setAdminQueue(null);
          setQueueIndex(0);
          setDraft(blank);
          setEditing(null);
          setMessage(`🎉 All ${adminQueue.length} dresses from JSON have been successfully added to your boutique!`);
          load();
          return;
        }
      }

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
    setAdminQueue(null);
    setQueueIndex(0);
    const imagesList = product.images?.length
      ? product.images
      : product.image
      ? [product.image]
      : [];

    const sizesList = Array.isArray(product.sizes)
      ? product.sizes
      : typeof product.sizes === "string"
      ? product.sizes.split(",").map((s) => s.trim()).filter(Boolean)
      : Object.keys(product.stock || {});

    const stockObj = typeof product.stock === "object" && product.stock !== null ? product.stock : {};

    setEditing(product);
    setDraft({
      ...product,
      buyPrice: product.buyPrice !== undefined && product.buyPrice !== null ? String(product.buyPrice) : "",
      fixedPrice: String(product.fixedPrice || product.price || ""),
      images: imagesList,
      image: imagesList[0] || "",
      sizes: sizesList,
      colours: Array.isArray(product.colours) ? product.colours.join(", ") : (product.colours || ""),
      stock: stockObj,
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

  const handleDiscardAllPending = async () => {
    if (!confirm(`Are you sure you want to discard ALL ${pendingProducts.length} pending items? This will remove them permanently.`)) {
      return;
    }
    setProducts((prev) => prev.filter((p) => !p.pending && p.status !== "PENDING"));
    try {
      await api("admin/products/discard-pending", { method: "POST" });
      setMessage("🗑️ All pending items have been discarded.");
    } catch (error) {
      alert("Failed to discard pending items: " + error.message);
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

      {/* Tabs Switcher: Live Inventory vs Single Item vs Bulk Import vs Pending Items */}
      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab-btn ${activeTab === "live" ? "active" : ""}`}
          onClick={() => setActiveTab("live")}
        >
          👗 Live Store Inventory ({liveProducts.length})
        </button>
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
          ⚡ Bulk Import (AI / JSON)
        </button>
        <button
          type="button"
          className={`admin-tab-btn pending-tab ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          ⏳ Pending Items ({pendingProducts.length})
          {pendingProducts.length > 0 && (
            <span className="tab-pending-badge">{pendingProducts.length}</span>
          )}
        </button>
      </div>

      {activeTab === "single" && (
        <form className="editor" onSubmit={save}>
          {adminQueue && (
            <div className="queue-banner">
              <div className="queue-banner-left">
                <span className="queue-badge">⚡ Autofill Queue Mode</span>
                <h3 className="queue-title">
                  Reviewing Item {queueIndex + 1} of {adminQueue.length}: <em>{draft.name || "Untitled"}</em>
                </h3>
                <p className="queue-desc">
                  Name, category, colours, description &amp; photos were autofilled from AI JSON. Please enter <strong>Buy Price</strong>, <strong>Fixed Price</strong>, and select <strong>Sizes &amp; Stock</strong> below.
                </p>
              </div>
              <div className="queue-banner-actions">
                {queueIndex > 0 && (
                  <button
                    type="button"
                    className="queue-btn"
                    onClick={() => {
                      const prev = queueIndex - 1;
                      setQueueIndex(prev);
                      loadQueueItem(adminQueue[prev], prev, adminQueue.length);
                    }}
                  >
                    ◀ Prev
                  </button>
                )}
                {queueIndex < adminQueue.length - 1 && (
                  <button
                    type="button"
                    className="queue-btn"
                    onClick={() => {
                      const next = queueIndex + 1;
                      setQueueIndex(next);
                      loadQueueItem(adminQueue[next], next, adminQueue.length);
                    }}
                  >
                    Skip Next ▶
                  </button>
                )}
                <button
                  type="button"
                  className="queue-btn cancel"
                  onClick={() => {
                    if (confirm("Exit bulk upload queue? Unsaved progress for this item will be lost.")) {
                      setAdminQueue(null);
                      setDraft(blank);
                    }
                  }}
                >
                  ✕ Exit Queue
                </button>
              </div>
            </div>
          )}

          <label>
            Item name <span className="mandatory-star">*</span>
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
            Category / Collection <span className="mandatory-star">*</span>
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
            Buy Price (₹) <span className="mandatory-star">*</span> <span className="helper-txt">(Cost price per unit - Mandatory)</span>
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
            Fixed Price (₹) <span className="mandatory-star">*</span> <span className="helper-txt">(Selling / Retail price - Mandatory)</span>
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

          <label className="wide">
            Colours (e.g. Coral Pink, Dusty Rose)
            <input
              type="text"
              placeholder="e.g. Coral Pink, Dusty Rose"
              value={draft.colours}
              onChange={(event) =>
                setDraft({ ...draft, colours: event.target.value })
              }
            />
          </label>

          <div className="editor-full-field wide">
            <div className="field-group-header">
              <span className="field-group-title">Available Sizes &amp; Stock Count <span className="mandatory-star">*</span></span>
              <span className="field-group-subtitle">Click any size to select (defaults to 1 piece). Adjust quantities with + / - buttons.</span>
            </div>
            <SizeStockSelector
              selectedSizes={Array.isArray(draft.sizes) ? draft.sizes : []}
              stock={typeof draft.stock === "object" && draft.stock !== null ? draft.stock : {}}
              onChange={(sizes, stock) => setDraft({ ...draft, sizes, stock })}
            />
          </div>

          <label className="wide">
            Product Images (Upload multiple photos) <span className="mandatory-star">*</span>
            <MultiImageUploader
              images={draft.images?.length ? draft.images : (draft.image ? [draft.image] : [])}
              onChange={(imgs) => setDraft({ ...draft, images: imgs, image: imgs[0] || "" })}
            />
          </label>
          <label className="wide">
            Description <span className="mandatory-star">*</span>
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
          <div className="editor-actions-row wide">
            <button className="button save-item-btn">
              {adminQueue
                ? `💾 Save & Next Item (${queueIndex + 1}/${adminQueue.length})`
                : editing
                ? "Update item"
                : "Add item"}
            </button>
            {adminQueue && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  if (confirm("Exit bulk queue?")) {
                    setAdminQueue(null);
                    setDraft(blank);
                  }
                }}
              >
                Cancel queue
              </button>
            )}
            {editing && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setEditing(null);
                  setDraft(blank);
                  setActiveTab("live");
                }}
              >
                Cancel edit
              </button>
            )}
          </div>
          <p>{message}</p>
        </form>
      )}

      {activeTab === "bulk" && (
        <BulkUploader
          onComplete={async (targetTab, newItems) => {
            if (Array.isArray(newItems) && newItems.length) {
              setProducts((prev) => [...newItems, ...prev]);
            }
            const fresh = await api("admin/products");
            if (Array.isArray(fresh?.products)) {
              setProducts(fresh.products);
            }
            setActiveTab("pending");
          }}
        />
      )}

      {activeTab === "pending" && (
        <PendingReviewList
          products={products}
          onRefresh={load}
          onViewLive={() => setActiveTab("live")}
          onSaveSuccess={(id, updatedProduct) => {
            const cleanUpdated = {
              ...updatedProduct,
              pending: false,
              status: "ACTIVE",
              published: true,
            };
            setProducts((prev) =>
              prev.map((p) => (p.id === id ? cleanUpdated : p))
            );
            setMessage(`✅ "${cleanUpdated.name}" moved to live store!`);
            api("admin/products").then(({ products: fresh }) => {
              if (Array.isArray(fresh)) setProducts(fresh);
            });
          }}
          onEditFull={(item) => {
            edit(item);
            setActiveTab("single");
          }}
          onDelete={remove}
          onDiscardAll={handleDiscardAllPending}
        />
      )}

      {/* Live Store Inventory Section (Visible only on 'live' tab) */}
      {activeTab === "live" && (
        <>
          <div className="admin-category-panel">
        <h2>Categories Overview</h2>
        <div className="category-badges">
          {pendingProducts.length > 0 && (
            <div
              className={`category-badge pending-category-badge clickable ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("pending");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              title="Click to view and complete pending dresses"
            >
              <span className="cat-name">⏳ PENDINGS</span>
              <span className="cat-count pending-count-pill">{pendingProducts.length}</span>
            </div>
          )}
          {Array.from(new Set(liveProducts.map((p) => p.collection))).filter(Boolean).map((cat) => {
            const count = liveProducts.filter((p) => p.collection === cat).length;
            const isSelected = activeTab !== "pending" && adminCategoryFilter === cat;
            return (
              <div
                key={cat}
                className={`category-badge clickable ${isSelected ? "active" : ""}`}
                onClick={() => {
                  if (activeTab === "pending") setActiveTab("single");
                  setAdminCategoryFilter(adminCategoryFilter === cat ? "ALL" : cat);
                }}
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
          <h2>Current Catalogue &amp; Inventory</h2>
          <p className="admin-subtitle">Filter by status or item type, manage visibility, record sales, and export stock.</p>
        </div>
        <div className="section-heading-actions">
          <button
            type="button"
            className="button"
            onClick={() => {
              setDraft(blank);
              setEditing(null);
              setActiveTab("single");
            }}
          >
            ➕ Add Single Item
          </button>
          <button
            type="button"
            className="button excel-export-btn"
            onClick={() => exportInventoryToExcel(liveProducts)}
          >
            📊 Export Excel (.xls)
          </button>
        </div>
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
              All Live Items ({liveProducts.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-enabled ${adminStatusFilter === "ENABLED" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("ENABLED")}
            >
              ● Active ({liveProducts.filter((p) => p.published).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-disabled ${adminStatusFilter === "DISABLED" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("DISABLED")}
            >
              ○ Disabled ({liveProducts.filter((p) => !p.published).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-soldout ${adminStatusFilter === "SOLDOUT" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("SOLDOUT")}
            >
              🔴 Sold Out ({liveProducts.filter((p) => Object.values(p.stock || {}).reduce((s, q) => s + (Number(q) || 0), 0) <= 0).length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn status-soldhistory ${adminStatusFilter === "SOLD_ITEMS" ? "active" : ""}`}
              onClick={() => setAdminStatusFilter("SOLD_ITEMS")}
            >
              💰 Sold ({liveProducts.filter((p) => (Number(p.soldCount) || 0) > 0).length})
            </button>
            {pendingProducts.length > 0 && (
              <button
                type="button"
                className="filter-pill-btn status-pending-pill"
                onClick={() => {
                  setActiveTab("pending");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                ⏳ Pendings ({pendingProducts.length})
              </button>
            )}
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
              All Types ({liveProducts.length})
            </button>
            {Array.from(new Set(liveProducts.map((p) => p.collection))).filter(Boolean).map((cat) => {
              const count = liveProducts.filter((p) => p.collection === cat).length;
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
                liveProducts.filter((p) => {
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
              }</b> of <b>{liveProducts.length}</b> live products
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
          const filtered = liveProducts.filter((p) => {
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
      </>
      )}

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

// Localhost API base logging
(function () {
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    console.log("API base is", localStorage.getItem("API_BASE"));
  }
})();

// Product Detail Page JavaScript

// Global variable to store current product
let currentProduct = null;

// Import helper functions from products.js
function getUserStudentStatus() {
  const userData = localStorage.getItem("depod_user");
  if (!userData) return null;

  try {
    const user = JSON.parse(userData);
    return user.student_status;
  } catch (e) {
    return null;
  }
}

function calculateStudentPrice(originalPrice, studentDiscount) {
  return originalPrice * (1 - studentDiscount / 100);
}

// Numeric safety helpers
function toNum(v) {
  if (v === null || v === undefined || v === "") return NaN;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : NaN;
}
function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}
function safeFixed(v, digits) {
  const n = toNum(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "";
}

function createPriceHTML(product) {
  const isStudent = getUserStudentStatus() === "approved";
  let priceHTML = "";

  const price = toNum(product.price);
  const discounted = toNum(product.discountedPrice);
  const discountPct = toNum(product.discount);
  const studentPct = toNum(product.studentDiscount);

  const hasGeneralDiscount =
    isNum(discounted) && (isNum(price) ? discounted < price : true);

  const computeStudent = (val) =>
    isNum(val) && isNum(studentPct) && studentPct > 0
      ? val * (1 - studentPct / 100)
      : val;

  if (hasGeneralDiscount) {
    const base = discounted;
    const current = isStudent ? computeStudent(base) : base;

    priceHTML = `
      <div class="product-price-detail">
        <div class="price-row">
          <span class="price-current">${safeFixed(current, 2)} ₼</span>
          ${
            isNum(price)
              ? `<span class="price-original">${safeFixed(price, 2)} ₼</span>`
              : ""
          }
        </div>
        <div class="discount-badges">
          ${
            isNum(discountPct) && discountPct > 0
              ? `<span class="price-discount">-${safeFixed(
                  discountPct,
                  0
                )}%</span>`
              : ""
          }
          ${
            isStudent && isNum(studentPct) && studentPct > 0
              ? `<span class="student-discount-badge">+${safeFixed(
                  studentPct,
                  0
                )}% Tələbə</span>`
              : ""
          }
        </div>
      </div>
      <div class="stock-info-separate">
        <span class="stock-status ${
          product.inStock ? "in-stock" : "out-of-stock"
        }">
          <span class="stock-indicator"></span>
          ${product.inStock ? "Stokda var" : "Stokda yoxdur"}
        </span>
      </div>
    `;
  } else {
    const base = isNum(price) ? price : discounted; // fallback if only one is available
    const current = isStudent ? computeStudent(base) : base;

    priceHTML = `
      <div class="product-price-detail">
        <div class="price-row">
          <span class="price-current">${safeFixed(current, 2)} ₼</span>
          ${
            isStudent && isNum(studentPct) && studentPct > 0 && isNum(price)
              ? `<span class="price-original">${safeFixed(price, 2)} ₼</span>`
              : ""
          }
        </div>
        ${
          isStudent && isNum(studentPct) && studentPct > 0
            ? `
          <div class="discount-badges">
            <span class="student-discount-badge">-${safeFixed(
              studentPct,
              0
            )}% Tələbə</span>
          </div>
        `
            : ""
        }
      </div>
      <div class="stock-info-separate">
        <span class="stock-status ${
          product.inStock ? "in-stock" : "out-of-stock"
        }">
          <span class="stock-indicator"></span>
          ${product.inStock ? "Stokda var" : "Stokda yoxdur"}
        </span>
      </div>
    `;
  }

  return priceHTML;
}

// Import products data from products.js
async function getProductById(productId) {
  if (typeof PRODUCTS === "undefined") {
    console.error(
      "PRODUCTS is not defined. Make sure products.js is loaded first."
    );
    return null;
  }
  try {
    if (window.API) {
      // reuse map from products.js by calling global function if present
      if (typeof window.getProductById === "function") {
        // avoid recursion; call API directly instead
        const p = await window.API.getProduct(productId);
        // inline a small mapper (duplicated minimal) to avoid circular import
        // Try to enrich with pricing if not present
        let pricing = null;
        if (
          p.price == null &&
          p.discounted_price == null &&
          typeof window.API.getProductPricing === "function"
        ) {
          try {
            pricing = await window.API.getProductPricing(productId);
          } catch (_) {}
        }
        const rawPrice = p.price ?? pricing?.price ?? null;
        const rawDisc = p.discounted_price ?? pricing?.discounted_price ?? null;
        const price = isNum(toNum(rawPrice)) ? toNum(rawPrice) : null;
        const discountedPrice = isNum(toNum(rawDisc)) ? toNum(rawDisc) : null;
        const discount = isNum(toNum(p.discount ?? pricing?.discount ?? 0))
          ? toNum(p.discount ?? pricing?.discount ?? 0)
          : 0;
        const studentDiscount = isNum(
          toNum(p.student_discount ?? pricing?.student_discount ?? 0)
        )
          ? toNum(p.student_discount ?? pricing?.student_discount ?? 0)
          : 0;
        const inStock =
          (typeof p.in_stock === "boolean" ? p.in_stock : undefined) ??
          (typeof p.stock === "number" ? p.stock > 0 : undefined) ??
          true;

        return {
          id: p.id,
          name: p.name,
          category: p.category,
          images: {
            main:
              p.main_image ||
              (p.images && p.images.find((i) => i.is_main)?.image) ||
              "",
            gallery: Array.isArray(p.images)
              ? p.images.map((i) => i.image)
              : [],
          },
          description: p.description || "",
          features: Array.isArray(p.features)
            ? p.features.map((f) => f.text)
            : [],
          specs: Array.isArray(p.specs)
            ? p.specs.reduce((acc, s) => {
                acc[s.label] = s.value;
                return acc;
              }, {})
            : {},
          highlights: Array.isArray(p.highlights)
            ? p.highlights.map((h) => ({ number: h.number, text: h.text }))
            : [],
          price,
          discountedPrice:
            discountedPrice ??
            (price != null && discount
              ? +(price * (1 - discount / 100)).toFixed(2)
              : null),
          discount,
          studentDiscount,
          inStock: Boolean(inStock),
          stock: typeof p.stock === "number" ? p.stock : null,
        };
      }
    }
  } catch (e) {
    console.warn("API getProduct failed, using local data:", e.message);
  }
  return PRODUCTS[productId] || null;
}

async function getAllProducts() {
  if (typeof PRODUCTS === "undefined") {
    console.error(
      "PRODUCTS is not defined. Make sure products.js is loaded first."
    );
    return [];
  }
  try {
    if (window.API) {
      const list = await window.API.listProducts();
      return list.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        images: {
          main:
            p.main_image ||
            (p.images && p.images.find((i) => i.is_main)?.image) ||
            "",
          gallery: Array.isArray(p.images) ? p.images.map((i) => i.image) : [],
        },
        description: p.description || "",
        features: Array.isArray(p.features)
          ? p.features.map((f) => f.text)
          : [],
        specs: Array.isArray(p.specs)
          ? p.specs.reduce((acc, s) => {
              acc[s.label] = s.value;
              return acc;
            }, {})
          : {},
        highlights: Array.isArray(p.highlights)
          ? p.highlights.map((h) => ({ number: h.number, text: h.text }))
          : [],
      }));
    }
  } catch (e) {
    console.warn("API listProducts failed, using local data:", e.message);
  }
  return Object.values(PRODUCTS);
}

document.addEventListener("DOMContentLoaded", function () {
  if (window.location.pathname.includes("product-detail.html")) {
    initProductDetailPage();
  }
});

async function initProductDetailPage() {
  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  if (!productId) {
    window.location.href = "products.html";
    return;
  }

  // Get product data
  const product = await getProductById(productId);
  if (!product) {
    window.location.href = "products.html";
    return;
  }

  // Populate product data
  populateProductData(product);
  setupTabs();
  setupImageGallery();
  loadRelatedProducts(product.category, product.id);

  // Load product reviews
  loadReviews(productId);
}

function populateProductData(product) {
  // Store current product globally
  currentProduct = product;

  // Update page title
  document.title = `${product.name} - Depod`;
  document.getElementById("pageTitle").textContent = `${product.name} - Depod`;

  // Populate breadcrumb
  const breadcrumb = document.getElementById("breadcrumb");
  const categoryName = (function () {
    if (typeof getCategoryName === "function") {
      return getCategoryName(product.category);
    }
    // minimal inline fallback using global map or plain text
    if (
      product &&
      typeof product.category === "object" &&
      product.category.name
    ) {
      return product.category.name;
    }
    if (window.CATEGORY_NAME_MAP && typeof product.category === "string") {
      return window.CATEGORY_NAME_MAP[product.category] || product.category;
    }
    return typeof product.category === "string"
      ? product.category
      : product.category?.key || "Kategoriya";
  })();
  const categoryKeyForLink = (function () {
    const c = product.category;
    if (c && typeof c === "object") return c.key || c.id || "";
    return c || "";
  })();

  breadcrumb.innerHTML = `
        <a href="index.html">Ana Səhifə</a>
        <span>/</span>
        <a href="products.html">Məhsullar</a>
        <span>/</span>
        <span class="active">${product.name}</span>
    `;

  // Populate product name
  document.getElementById("productName").textContent = product.name;

  // Populate pricing
  const productPricing = document.getElementById("productPricing");
  if (productPricing) {
    productPricing.innerHTML = createPriceHTML(product);
  }

  // Configure quantity bounds from stock
  const qtyInput = document.getElementById("quantity");
  const decBtn = document.getElementById("decreaseQty");
  const incBtn = document.getElementById("increaseQty");
  if (qtyInput) {
    const min = 1;
    let max = 10;
    if (product.inStock && typeof product.stock === "number") {
      max = Math.max(1, product.stock);
    }
    if (!product.inStock) {
      qtyInput.value = String(min);
      qtyInput.disabled = true;
      if (incBtn) incBtn.disabled = true;
      if (decBtn) decBtn.disabled = true;
    } else {
      qtyInput.disabled = false;
      qtyInput.min = String(min);
      qtyInput.max = String(max);
      const currentV = parseInt(qtyInput.value || String(min));
      const bounded = isNaN(currentV)
        ? min
        : Math.max(min, Math.min(max, currentV));
      qtyInput.value = String(bounded);
      if (incBtn) incBtn.disabled = bounded >= max;
      if (decBtn) decBtn.disabled = bounded <= min;
      qtyInput.addEventListener("input", function () {
        const maxNow = parseInt(qtyInput.max || "10");
        let v = parseInt(qtyInput.value || "1");
        if (isNaN(v)) v = min;
        v = Math.max(min, Math.min(maxNow, v));
        qtyInput.value = String(v);
        if (incBtn) incBtn.disabled = v >= maxNow;
        if (decBtn) decBtn.disabled = v <= min;
      });
    }
  }

  // Update Buy Now button based on stock
  const buyNowBtn = document.getElementById("buyNowBtn");
  if (buyNowBtn) {
    buyNowBtn.disabled = !product.inStock;
    if (!product.inStock) {
      buyNowBtn.innerHTML = '<i class="fas fa-ban"></i> Stokda Yoxdur';
    }
  }

  // Populate main image
  const mainImage = document.getElementById("mainProductImage");
  mainImage.src = product.images.main;
  mainImage.alt = product.name;

  // Populate thumbnails
  const thumbnails = document.getElementById("productThumbnails");
  thumbnails.innerHTML = product.images.gallery
    .map(
      (image, index) => `
        <img src="${image}" alt="${product.name} ${index + 1}" 
             class="thumbnail ${index === 0 ? "active" : ""}" 
             onclick="changeMainImage('${image}', this)">
    `
    )
    .join("");

  // Populate highlights
  const highlights = document.getElementById("productHighlights");
  highlights.innerHTML = product.highlights
    .map(
      (highlight) => `
        <div class="highlight-badge">
            <span class="highlight-number">${highlight.number}</span>
            <span class="highlight-text">${highlight.text}</span>
        </div>
    `
    )
    .join("");

  // Populate description
  document.getElementById("productDescription").textContent =
    product.description;
  document.getElementById("detailedDescription").textContent =
    product.description;

  // Populate features
  const featuresList = document.getElementById("productFeatures");
  featuresList.innerHTML = product.features
    .map(
      (feature) => `
        <li><span class="feature-checkmark">✓</span> ${feature}</li>
    `
    )
    .join("");

  // Populate features grid for overview tab
  const featuresGrid = document.getElementById("featuresGrid");

  // Define feature icons mapping
  const featureIcons = {
    "24 saat batareya ömrü": "fa-solid fa-battery-full",
    "28 saat batareya ömrü": "fa-solid fa-battery-full",
    "20 saat batareya ömrü": "fa-solid fa-battery-full",
    "Bluetooth 5.0 texnologiyası": "fab fa-bluetooth-b",
    "IPX4 su davamlılığı": "fas fa-tint",
    "IPX5 su davamlılığı": "fas fa-tint",
    "Active noise cancellation": "fas fa-volume-mute",
    "Noise cancellation": "fas fa-volume-mute",
    "Ambient ses rejimi": "fas fa-volume-up",
    "Touch control": "fas fa-hand-pointer",
    "Wireless charging": "fas fa-charging-station",
    "Sürətli şarj": "fas fa-bolt",
    "15W sürətli şarj": "fas fa-bolt",
    "15W maksimum güc": "fas fa-bolt",
    "20W maksimum güc": "fas fa-bolt",
    "10000mAh tutum": "fas fa-battery-three-quarters",
    "USB-C və Lightning": "fas fa-plug",
    "LED göstərici": "fas fa-lightbulb",
    "LED ekran": "fas fa-lightbulb",
    "Kompakt dizayn": "fas fa-mobile-alt",
    "Çoxlu cihaz dəstəyi": "fas fa-tablets",
    "Universal uyğunluq": "fas fa-plug",
    "Qorunma sistemi": "fas fa-shield-alt",
    "Təhlükəsizlik sistemi": "fas fa-shield-alt",
    "İkili USB port": "fa-brands fa-usb",
    "Çoxlu port dəstəyi": "fa-brands fa-usb",
    "USB Type-C port": "fa-brands fa-usb",
    "LED indikator": "fas fa-lightbulb",
    "Orijinal dizayn": "fa-solid fa-star",
    "Auto pairing": "fa-solid fa-link",
    "Ergonomik dizayn": "fa-solid fa-heart",
  };

  featuresGrid.innerHTML = product.features
    .map((feature) => {
      const iconClass = featureIcons[feature] || "fas fa-check";
      return `
        <div class="feature-card">
            <span class="feature-text">${feature}</span>
            <div class="feature-icon"><i class="${iconClass}"></i></div>
        </div>
        `;
    })
    .join("");

  // Populate specs
  const specsTable = document.getElementById("specsTable");
  specsTable.innerHTML = Object.entries(product.specs)
    .map(
      ([key, value]) => `
        <div class="spec-row">
            <span class="spec-label">${key}</span>
            <span class="spec-value">${value}</span>
        </div>
    `
    )
    .join("");

  // Load related products
  loadRelatedProducts(
    typeof product.category === "object"
      ? product.category.key || product.category.id
      : product.category,
    product.id
  );
}

async function loadRelatedProducts(category, currentProductId) {
  const relatedProductsGrid = document.getElementById("relatedProducts");
  if (!relatedProductsGrid) return;

  // Prefer category-scoped fetch; fallback to all products
  let list = [];
  try {
    if (typeof getProductsByCategory === "function") {
      list = await getProductsByCategory(category);
    } else {
      list = await getAllProducts();
    }
  } catch (e) {
    list = await getAllProducts();
  }

  const catKey =
    typeof category === "object" ? category.key || category.id : category;
  const relatedProducts = list
    .filter(
      (p) =>
        (typeof p.category === "object"
          ? p.category.key || p.category.id
          : p.category) === catKey && p.id !== currentProductId
    )
    .slice(0, 4);

  relatedProductsGrid.innerHTML = relatedProducts
    .map(
      (product) => `
        <div class="related-product-card">
           
            <div class="related-product-image">
                <img src="${product.images.main}" alt="${
        product.name
      }" loading="lazy">
            </div>
            <div class="related-product-info">
                            <div class="product-category">${getCategoryName(
                              product.category
                            )}</div>
                <h3 class="related-product-name">${product.name}</h3>
                <p class="product-description-short">${product.description}</p>
                <a href="product-detail.html?id=${
                  product.id
                }" class="related-product-link">Ətraflı Bax</a>
            </div>
        </div>
    `
    )
    .join("");
}

function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".tab-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      // Remove active class from all tabs and panels
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((p) => p.classList.remove("active"));

      // Add active class to clicked tab and corresponding panel
      btn.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
    });
  });
}

function setupImageGallery() {
  // Image gallery is already set up in populateProductData
  // This function can be extended for advanced gallery features
}

function changeMainImage(imageSrc, thumbnailElement) {
  // Update main image
  document.getElementById("mainProductImage").src = imageSrc;

  // Update active thumbnail
  const thumbnails = document.querySelectorAll(".thumbnail");
  thumbnails.forEach((thumb) => thumb.classList.remove("active"));
  thumbnailElement.classList.add("active");
}

// (Removed duplicate loadRelatedProducts definition)

// Quantity controls
function increaseQuantity() {
  const quantityInput = document.getElementById("quantity");
  const currentValue = parseInt(quantityInput.value);
  const maxValue = parseInt(quantityInput.max);

  if (currentValue < maxValue) {
    quantityInput.value = currentValue + 1;
  }
}

function decreaseQuantity() {
  const quantityInput = document.getElementById("quantity");
  const currentValue = parseInt(quantityInput.value);
  const minValue = parseInt(quantityInput.min);

  if (currentValue > minValue) {
    quantityInput.value = currentValue - 1;
  }
}

// Cart functions (placeholder for e-commerce functionality)
function addToCart() {
  const quantity = parseInt(document.getElementById("quantity").value);
  const productId = new URLSearchParams(window.location.search).get("id");
  const product = getProductById(productId);

  // Simulate adding to cart
  showNotification(
    `${product.name} səbətə əlavə edildi! Miqdar: ${quantity}`,
    "success"
  );

  // Here you would typically:
  // 1. Add to localStorage cart
  // 2. Update cart UI
  // 3. Send to backend if available
}

// Quantity control functions
function changeQuantity(delta) {
  const quantityInput = document.getElementById("quantity");
  const currentValue = parseInt(quantityInput.value);
  const newValue = currentValue + delta;

  // Validate bounds
  const min = parseInt(quantityInput.min) || 1;
  const max = parseInt(quantityInput.max) || 10;

  if (newValue >= min && newValue <= max) {
    quantityInput.value = newValue;

    // Update button states
    document.getElementById("decreaseQty").disabled = newValue <= min;
    document.getElementById("increaseQty").disabled = newValue >= max;
  }
}

// Product action functions
function buyNow() {
  const quantity = parseInt(document.getElementById("quantity").value);
  const productId = new URLSearchParams(window.location.search).get("id");

  // Check if user is logged in
  const userData = localStorage.getItem("depod_user");
  if (!userData) {
    showNotification("Satın almaq üçün hesabınıza daxil olun!", "error");
    setTimeout(() => {
      window.location.href =
        "login.html?redirect=" + encodeURIComponent(window.location.href);
    }, 2000);
    return;
  }

  // Create order
  createOrder(productId, quantity);
}

function sendOffer() {
  // Redirect to contact page with product info
  const productId = new URLSearchParams(window.location.search).get("id");
  window.location.href = `contact.html?product=${productId}&type=offer`;
}

function findStore() {
  // Scroll to map or redirect to store finder
  window.location.href = "contact.html#map";
}

// Order creation system
async function createOrder(productId, quantity) {
  try {
    const userData = JSON.parse(localStorage.getItem("depod_user"));
    const product = currentProduct; // From global scope

    if (!product) {
      showNotification("Məhsul məlumatı tapılmadı!", "error");
      return;
    }

    // Enforce live stock bounds before pricing
    const maxQty =
      product && typeof product.stock === "number" ? product.stock : null;
    if (maxQty !== null && quantity > maxQty) {
      showNotification(
        `Maksimum ${maxQty} ədəd sifariş edə bilərsiniz`,
        "error"
      );
      const qi = document.getElementById("quantity");
      if (qi) qi.value = String(Math.max(1, maxQty));
      return;
    }

    // Calculate total price
    const isStudent = getUserStudentStatus() === "approved";
    let unitPrice = isNum(toNum(product.discountedPrice))
      ? toNum(product.discountedPrice)
      : toNum(product.price);
    if (
      isNaN(unitPrice) &&
      typeof window.API?.getProductPricing === "function"
    ) {
      try {
        const pr = await window.API.getProductPricing(productId);
        unitPrice = isNum(toNum(pr?.discounted_price))
          ? toNum(pr.discounted_price)
          : toNum(pr?.price);
      } catch (_) {}
    }
    if (isStudent && isNum(toNum(product.studentDiscount))) {
      unitPrice = calculateStudentPrice(
        unitPrice,
        toNum(product.studentDiscount)
      );
    }
    const totalPrice = unitPrice * quantity;

    // Try backend order creation first
    let orderPayload = {
      product_id: productId,
      quantity,
      pricing_snapshot: {
        unit_price: unitPrice,
        student_applied: isStudent,
      },
    };

    let createdOrder = null;
    if (window.API && typeof window.API.createOrder === "function") {
      try {
        createdOrder = await window.API.createOrder(orderPayload);
      } catch (e) {
        console.warn("Backend createOrder failed:", e.message);
        // Try to refresh stock and inform the user
        try {
          const latest = await window.API.getProduct(productId);
          if (latest && typeof latest.stock === "number") {
            currentProduct.stock = latest.stock;
            const qi = document.getElementById("quantity");
            if (qi) {
              qi.max = String(Math.max(1, latest.stock));
              if (parseInt(qi.value) > latest.stock) {
                qi.value = String(Math.max(1, latest.stock));
              }
            }
            const buyNowBtn = document.getElementById("buyNowBtn");
            if (buyNowBtn && latest.stock <= 0) {
              buyNowBtn.disabled = true;
              buyNowBtn.innerHTML = '<i class="fas fa-ban"></i> Stokda Yoxdur';
            }
            showNotification(
              latest.stock <= 0
                ? "Bu məhsul hazırda stokda yoxdur"
                : `Yalnız ${latest.stock} ədəd mövcuddur`,
              "error"
            );
            return;
          }
        } catch (_) {}
        showNotification("Sifariş zamanı xəta baş verdi", "error");
        return;
      }
    }
    if (!createdOrder) {
      // Do not simulate order when backend failed; notify user only
      showNotification(
        "Sifariş icra edilmədi. Zəhmət olmasa yenidən cəhd edin.",
        "error"
      );
      return;
    }

    // If backend order created, shape minimal order for payment
    const orderForPayment = {
      id: createdOrder.id || generateOrderId(),
      productId,
      productName: product.name,
      productImage: product.images.main,
      quantity,
      unitPrice,
      totalPrice: createdOrder.total_price ?? totalPrice,
      status: createdOrder.status || "pending",
      createdAt: createdOrder.created_at || new Date().toISOString(),
      estimatedDelivery:
        createdOrder.estimated_delivery || getEstimatedDelivery(),
    };

    // Optionally persist a light copy for UI badges
    try {
      const existingOrders = JSON.parse(
        localStorage.getItem("depod_orders") || "[]"
      );
      existingOrders.push(orderForPayment);
      localStorage.setItem("depod_orders", JSON.stringify(existingOrders));
    } catch (_) {}

    initiatePayment(orderForPayment);
  } catch (error) {
    console.error("Order creation failed:", error);
    showNotification("Sifarişin yaradılmasında xəta baş verdi!", "error");
  }
}

// Payment integration
function initiatePayment(order) {
  // Show loading state
  showNotification("Ödəniş sisteminə yönləndirilirsiz...", "info");

  // Simulate payment process (replace with actual odero.az integration)
  // In real implementation, this would redirect to payment gateway

  // For demo purposes, simulate payment result after 2 seconds
  setTimeout(() => {
    // Simulate payment success/failure (you can change this for testing)
    const paymentSuccess = Math.random() > 0.1; // 90% success rate for demo

    if (paymentSuccess) {
      // Payment successful - redirect to success page
      window.location.href = `order-success.html?orderId=${order.id}&status=success`;
    } else {
      // Payment failed - redirect to failure page
      window.location.href = `order-failure.html?orderId=${
        order.id
      }&error=PAYMENT_DECLINED&message=${encodeURIComponent(
        "Ödəniş rədd edildi"
      )}&productId=${order.productId}&quantity=${order.quantity}`;
    }
  }, 2000);

  // In real implementation, you would do something like:
  /*
  const paymentUrl = buildOderoPaymentUrl(order);
  window.location.href = paymentUrl;
  */
}

// Build payment URL for odero.az (example implementation)
function buildOderoPaymentUrl(order) {
  const baseUrl = "https://payment.odero.az"; // Replace with actual URL
  const params = new URLSearchParams({
    merchant_id: "YOUR_MERCHANT_ID",
    amount: order.totalPrice.toFixed(2),
    currency: "AZN",
    order_id: order.id,
    description: `${order.productName} - ${order.quantity} ədəd`,
    success_url: `${window.location.origin}/order-success.html?orderId=${order.id}`,
    cancel_url: `${window.location.origin}/order-failure.html?orderId=${order.id}`,
    fail_url: `${window.location.origin}/order-failure.html?orderId=${order.id}`,
  });

  return `${baseUrl}?${params.toString()}`;
}

// Helper functions
function generateOrderId() {
  return (
    "ORD" +
    Date.now().toString().slice(-6) +
    Math.random().toString(36).substr(2, 3).toUpperCase()
  );
}

function getEstimatedDelivery() {
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3); // 3 days from now
  return deliveryDate.toISOString();
}

function updateOrderNotifications() {
  const orders = JSON.parse(localStorage.getItem("depod_orders") || "[]");
  const pendingOrders = orders.filter(
    (order) => order.status === "pending" || order.status === "processing"
  ).length;

  // Update badge in navbar if exists
  const notificationBadge = document.querySelector(".notification-badge");
  if (notificationBadge && pendingOrders > 0) {
    notificationBadge.textContent = pendingOrders;
    notificationBadge.style.display = "flex";
  }
}

// Notification system
function showNotification(message, type = "info") {
  // Create notification element
  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close" onclick="closeNotification(this)">&times;</button>
    `;

  // Add to page
  document.body.appendChild(notification);

  // Show with animation
  setTimeout(() => notification.classList.add("show"), 100);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function closeNotification(closeBtn) {
  const notification = closeBtn.parentElement;
  notification.classList.remove("show");
  setTimeout(() => notification.remove(), 300);
}

// Get category display name (reusing from products.js)
function getCategoryName(category) {
  // If object with name (defensive), prefer it
  if (category && typeof category === "object") {
    if (category.name) return category.name;
    if (
      category.key &&
      window.CATEGORY_NAME_MAP &&
      window.CATEGORY_NAME_MAP[category.key]
    ) {
      return window.CATEGORY_NAME_MAP[category.key];
    }
  }

  // Prefer dynamic map loaded from API (covers new categories without code changes)
  if (window.CATEGORY_NAME_MAP && typeof category === "string") {
    const name = window.CATEGORY_NAME_MAP[category];
    if (name) return name;
  }

  // Fallback to static mapping for known defaults
  const categoryNames = {
    earphone: "Qulaqlıqlar",
    powerbank: "Powerbank",
    "car-charger": "Avtomobil Aksesuarları",
    charger: "Şarj Cihazı",
  };
  return categoryNames[category] || category;
}

// Review System Functions
let allReviews = [];
let currentUserReview = null;

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("az", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function createStarRating(rating, readonly = true) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      `<span class="star ${i <= rating ? "filled" : ""}">${
        i <= rating ? "★" : "☆"
      }</span>`
    );
  }
  return `<div class="star-rating ${readonly ? "readonly" : ""}">${stars.join(
    ""
  )}</div>`;
}

function createReviewHTML(review, canEdit = false) {
  return `
    <div class="review-item" data-review-id="${review.id}">
      <div class="review-header">
        <div class="reviewer-info">
          <h4 class="reviewer-name">${review.user_name}</h4>
          ${createStarRating(review.rating)}
        </div>
        <div class="review-meta">
          <span class="review-date">${formatDate(review.created_at)}</span>
          ${
            canEdit
              ? `
            <div class="review-actions">
              <button class="edit-review-btn" onclick="editReview(${review.id})">
                <i class="fas fa-edit"></i> Redaktə et
              </button>
              <button class="delete-review-btn" onclick="deleteReview(${review.id})">
                <i class="fas fa-trash"></i> Sil
              </button>
            </div>
          `
              : ""
          }
        </div>
      </div>
      <div class="review-content">
        <p>${review.comment}</p>
      </div>
    </div>
  `;
}

async function loadReviews(productId) {
  try {
    // Load reviews and stats in parallel
    const [reviews, stats, userReview] = await Promise.all([
      window.API.getProductReviews(productId),
      window.API.getProductReviewStats(productId),
      isUserLoggedIn()
        ? window.API.getUserReview(productId).catch(() => null)
        : Promise.resolve(null),
    ]);

    allReviews = reviews;
    currentUserReview = userReview;

    // Display reviews summary
    displayReviewsSummary(stats);

    // Display reviews list (max 3)
    displayReviewsList(reviews.slice(0, 3));

    // Show "Show More" button if there are more than 3 reviews
    const showMoreContainer = document.getElementById("showMoreContainer");
    if (reviews.length > 3) {
      showMoreContainer.style.display = "block";
    } else {
      showMoreContainer.style.display = "none";
    }

    // Show review form if user is eligible
    checkReviewEligibility(productId);
  } catch (error) {
    console.error("Failed to load reviews:", error);
  }
}

function displayReviewsSummary(stats) {
  const summaryContainer = document.getElementById("reviewsSummary");
  if (stats.total_reviews === 0) {
    summaryContainer.innerHTML = `
      <div class="no-reviews">
        <p>Hələlik şərh yoxdur. İlk şərhi siz yazın!</p>
      </div>
    `;
  } else {
    summaryContainer.innerHTML = `
      <div class="reviews-stats">
        <div class="average-rating">
          ${createStarRating(Math.round(stats.average_rating))}
          <span class="rating-number">${stats.average_rating}</span>
          <span class="total-reviews">(${stats.total_reviews} şərh)</span>
        </div>
      </div>
    `;
  }
}

function displayReviewsList(reviews) {
  const reviewsList = document.getElementById("reviewsList");
  const userData = isUserLoggedIn()
    ? JSON.parse(localStorage.getItem("depod_user"))
    : null;

  if (reviews.length === 0) {
    reviewsList.innerHTML = "";
    return;
  }

  reviewsList.innerHTML = reviews
    .map((review) => {
      const canEdit = userData && review.user_id === userData.id;
      return createReviewHTML(review, canEdit);
    })
    .join("");
}

async function checkUserPurchasedAndDelivered(productId) {
  try {
    console.log("Checking purchase status for product:", productId);
    // Get user's orders
    const ordersResponse = await window.API.getOrders();
    console.log("User orders response:", ordersResponse);

    // Handle different response formats
    let orders = [];
    if (Array.isArray(ordersResponse)) {
      orders = ordersResponse;
    } else if (ordersResponse && ordersResponse.results) {
      orders = ordersResponse.results;
    } else if (ordersResponse && Array.isArray(ordersResponse.orders)) {
      orders = ordersResponse.orders;
    } else {
      console.log("Unexpected orders format:", ordersResponse);
      return false;
    }

    console.log("Processed orders array:", orders);

    // Check if user has purchased this product and it's delivered
    for (const order of orders) {
      console.log("Checking order:", order.id, "status:", order.status);
      if (order.status === "delivered") {
        for (const item of order.items || []) {
          console.log("Checking item:", item.product_id, "vs", productId);
          if (item.product_id == productId || item.product?.id == productId) {
            console.log("Found delivered product match!");
            return true;
          }
        }
      }
    }

    console.log("No delivered product found");
    return false;
  } catch (error) {
    console.error("Error checking user purchase status:", error);
    return false;
  }
}

async function checkReviewEligibility(productId) {
  console.log("Checking review eligibility for product:", productId);
  const reviewFormContainer = document.getElementById("reviewFormContainer");
  console.log("Review form container found:", !!reviewFormContainer);

  if (!isUserLoggedIn()) {
    console.log("User not logged in");
    reviewFormContainer.style.display = "none";
    return;
  }

  console.log("User is logged in, current user review:", currentUserReview);

  // If user already has a review, show edit form instead of create form
  if (currentUserReview) {
    console.log("User already has review, showing edit form");
    showEditReviewForm(currentUserReview);
    return;
  }

  // Check if user has purchased this product and it's delivered
  try {
    const hasPurchasedAndDelivered = await checkUserPurchasedAndDelivered(
      productId
    );
    console.log("Has purchased and delivered:", hasPurchasedAndDelivered);

    if (!hasPurchasedAndDelivered) {
      reviewFormContainer.style.display = "none";
      // Optionally show a message
      const reviewSection = document.getElementById("reviewsSection");
      if (
        reviewSection &&
        !reviewSection.querySelector(".purchase-required-message")
      ) {
        const message = document.createElement("div");
        message.className = "purchase-required-message";
        message.style.cssText = `
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          text-align: center;
          color: #6c757d;
        `;
        message.innerHTML = `
          <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
          Şərh yazmaq üçün bu məhsulu almalı və çatdırılmasını gözləməlisiniz.
        `;
        reviewFormContainer.parentNode.insertBefore(
          message,
          reviewFormContainer
        );
      }
      return;
    }

    // User has purchased and product is delivered, show the form
    reviewFormContainer.style.display = "block";
    setupReviewForm(productId);

    // Remove any existing purchase required message
    const existingMessage = document.querySelector(
      ".purchase-required-message"
    );
    if (existingMessage) {
      existingMessage.remove();
    }
  } catch (error) {
    console.error("Error checking review eligibility:", error);
    reviewFormContainer.style.display = "none";
  }
}

function setupReviewForm(productId) {
  const form = document.getElementById("reviewForm");
  const starInputs = document.querySelectorAll("#starRatingInput .star");
  const ratingValue = document.getElementById("ratingValue");
  const commentInput = document.getElementById("reviewComment");
  const charCount = document.getElementById("charCount");
  const cancelBtn = document.getElementById("cancelReview");

  // Setup star rating input
  starInputs.forEach((star) => {
    star.addEventListener("click", function () {
      const rating = parseInt(this.dataset.rating);
      ratingValue.value = rating;

      starInputs.forEach((s, index) => {
        if (index < rating) {
          s.textContent = "★";
          s.classList.add("selected");
        } else {
          s.textContent = "☆";
          s.classList.remove("selected");
        }
      });
    });

    star.addEventListener("mouseover", function () {
      const rating = parseInt(this.dataset.rating);
      starInputs.forEach((s, index) => {
        s.textContent = index < rating ? "★" : "☆";
      });
    });
  });

  // Reset stars on mouse leave
  document
    .getElementById("starRatingInput")
    .addEventListener("mouseleave", function () {
      const currentRating = parseInt(ratingValue.value);
      starInputs.forEach((s, index) => {
        s.textContent = index < currentRating ? "★" : "☆";
      });
    });

  // Character counter
  commentInput.addEventListener("input", function () {
    charCount.textContent = this.value.length;
  });

  // Form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const rating = parseInt(ratingValue.value);
    const comment = commentInput.value.trim();

    if (rating === 0) {
      showNotification("Zəhmət olmasa reytinq seçin", "error");
      return;
    }

    if (!comment) {
      showNotification("Zəhmət olmasa şərh yazın", "error");
      return;
    }

    try {
      await window.API.createReview({
        product: productId,
        rating: rating,
        comment: comment,
      });

      showNotification("Şərhiniz uğurla göndərildi!", "success");

      // Reload reviews
      await loadReviews(productId);

      // Reset form
      form.reset();
      ratingValue.value = 0;
      starInputs.forEach((s) => {
        s.textContent = "☆";
        s.classList.remove("selected");
      });
      charCount.textContent = "0";
    } catch (error) {
      console.error("Failed to submit review:", error);
      if (error.message.includes("400")) {
        showNotification(
          "Bu məhsul üçün şərh yazmaq üçün əvvəlcə onu satın almalısınız",
          "error"
        );
      } else {
        showNotification(
          "Şərh göndərilmədi. Zəhmət olmasa yenidən cəhd edin",
          "error"
        );
      }
    }
  });

  // Cancel button
  cancelBtn.addEventListener("click", function () {
    form.reset();
    ratingValue.value = 0;
    starInputs.forEach((s) => {
      s.textContent = "☆";
      s.classList.remove("selected");
    });
    charCount.textContent = "0";
  });
}

function showEditReviewForm(review) {
  const reviewFormContainer = document.getElementById("reviewFormContainer");
  const form = document.getElementById("reviewForm");

  // Fill form with existing review data
  document.getElementById("ratingValue").value = review.rating;
  document.getElementById("reviewComment").value = review.comment;
  document.getElementById("charCount").textContent = review.comment.length;

  // Update star display
  const starInputs = document.querySelectorAll("#starRatingInput .star");
  starInputs.forEach((star, index) => {
    if (index < review.rating) {
      star.textContent = "★";
      star.classList.add("selected");
    } else {
      star.textContent = "☆";
      star.classList.remove("selected");
    }
  });

  // Change form title and button text
  reviewFormContainer.querySelector("h3").textContent =
    "Şərhinizi Redaktə Edin";
  form.querySelector(".submit-review-btn").textContent = "Şərhi Yenilə";

  reviewFormContainer.style.display = "block";

  // Update form submission handler for editing
  form.removeEventListener("submit", form._originalHandler);
  form._originalHandler = async function (e) {
    e.preventDefault();

    const rating = parseInt(document.getElementById("ratingValue").value);
    const comment = document.getElementById("reviewComment").value.trim();

    if (rating === 0) {
      showNotification("Zəhmət olmasa reytinq seçin", "error");
      return;
    }

    if (!comment) {
      showNotification("Zəhmət olmasa şərh yazın", "error");
      return;
    }

    try {
      await window.API.updateReview(review.id, {
        rating: rating,
        comment: comment,
      });

      showNotification("Şərhiniz uğurla yeniləndi!", "success");

      // Reload reviews
      const productId = new URLSearchParams(window.location.search).get("id");
      await loadReviews(productId);
    } catch (error) {
      console.error("Failed to update review:", error);
      showNotification(
        "Şərh yenilənmədi. Zəhmət olmasa yenidən cəhd edin",
        "error"
      );
    }
  };

  form.addEventListener("submit", form._originalHandler);
}

async function editReview(reviewId) {
  const review = allReviews.find((r) => r.id === reviewId);
  if (review) {
    showEditReviewForm(review);
  }
}

async function deleteReview(reviewId) {
  if (!confirm("Şərhi silmək istədiyinizdən əminsiniz?")) {
    return;
  }

  try {
    await window.API.deleteReview(reviewId);
    showNotification("Şərh uğurla silindi", "success");

    // Reload reviews
    const productId = new URLSearchParams(window.location.search).get("id");
    await loadReviews(productId);
  } catch (error) {
    console.error("Failed to delete review:", error);
    showNotification(
      "Şərh silinmədi. Zəhmət olmasa yenidən cəhd edin",
      "error"
    );
  }
}

function isUserLoggedIn() {
  return !!localStorage.getItem("depod_user");
}

// Show More Reviews Modal
document.addEventListener("DOMContentLoaded", function () {
  const showMoreBtn = document.getElementById("showMoreReviews");
  const modal = document.getElementById("reviewsModal");
  const closeBtn = document.getElementById("reviewsModalClose");
  const modalBody = document.getElementById("reviewsModalBody");

  if (showMoreBtn) {
    showMoreBtn.addEventListener("click", function () {
      // Display all reviews in modal
      const userData = isUserLoggedIn()
        ? JSON.parse(localStorage.getItem("depod_user"))
        : null;

      modalBody.innerHTML = allReviews
        .map((review) => {
          const canEdit = userData && review.user_id === userData.id;
          return createReviewHTML(review, canEdit);
        })
        .join("");

      modal.style.display = "block";
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", function () {
      modal.style.display = "none";
    });
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        modal.style.display = "none";
      }
    });
  }
});

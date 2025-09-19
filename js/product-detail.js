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
        console.warn("Backend createOrder failed, falling back:", e.message);
      }
    }

    if (!createdOrder) {
      // Fallback to localStorage order simulation
      const order = {
        id: generateOrderId(),
        userId: userData?.id,
        productId: productId,
        productName: product.name,
        productImage: product.images.main,
        quantity: quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        status: "pending",
        createdAt: new Date().toISOString(),
        estimatedDelivery: getEstimatedDelivery(),
      };
      const existingOrders = JSON.parse(
        localStorage.getItem("depod_orders") || "[]"
      );
      existingOrders.push(order);
      localStorage.setItem("depod_orders", JSON.stringify(existingOrders));
      initiatePayment(order);
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

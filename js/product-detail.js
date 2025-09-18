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

function createPriceHTML(product) {
  const isStudent = getUserStudentStatus() === "approved";
  let priceHTML = "";

  if (product.discountedPrice && product.discountedPrice < product.price) {
    const currentPrice = isStudent
      ? calculateStudentPrice(
          product.discountedPrice,
          product.studentDiscount || 0
        )
      : product.discountedPrice;

    priceHTML = `
      <div class="product-price-detail">
        <div class="price-row">
          <span class="price-current">${currentPrice.toFixed(2)} ₼</span>
          <span class="price-original">${product.price.toFixed(2)} ₼</span>
        </div>
        <div class="discount-badges">
          <span class="price-discount">-${product.discount}%</span>
          ${
            isStudent
              ? `<span class="student-discount-badge">+${
                  product.studentDiscount || 0
                }% Tələbə</span>`
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
    const currentPrice = isStudent
      ? calculateStudentPrice(product.price, product.studentDiscount || 0)
      : product.price;

    priceHTML = `
      <div class="product-price-detail">
        <div class="price-row">
          <span class="price-current">${currentPrice.toFixed(2)} ₼</span>
          ${
            isStudent && product.studentDiscount
              ? `<span class="price-original">${product.price.toFixed(
                  2
                )} ₼</span>`
              : ""
          }
        </div>
        ${
          isStudent && product.studentDiscount
            ? `
          <div class="discount-badges">
            <span class="student-discount-badge">-${product.studentDiscount}% Tələbə</span>
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
        <a href="products.html?category=${categoryKeyForLink}">${categoryName}</a>
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
function createOrder(productId, quantity) {
  try {
    const userData = JSON.parse(localStorage.getItem("depod_user"));
    const product = currentProduct; // From global scope

    if (!product) {
      showNotification("Məhsul məlumatı tapılmadı!", "error");
      return;
    }

    // Calculate total price
    const isStudent = getUserStudentStatus() === "approved";
    let unitPrice = product.discountedPrice || product.price;

    if (isStudent && product.studentDiscount) {
      unitPrice = calculateStudentPrice(unitPrice, product.studentDiscount);
    }

    const totalPrice = unitPrice * quantity;

    // Create order object
    const order = {
      id: generateOrderId(),
      userId: userData.id,
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

    // Save order to localStorage
    const existingOrders = JSON.parse(
      localStorage.getItem("depod_orders") || "[]"
    );
    existingOrders.push(order);
    localStorage.setItem("depod_orders", JSON.stringify(existingOrders));

    // Initiate payment process
    initiatePayment(order);
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

function buyNow() {
  const quantity = parseInt(document.getElementById("quantity").value);
  const productId = new URLSearchParams(window.location.search).get("id");
  const product = getProductById(productId);

  // Simulate buy now
  showNotification(`${product.name} sifarişi işlənməyə göndərildi!`, "success");

  // Here you would typically:
  // 1. Redirect to checkout
  // 2. Process immediate purchase
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
  const categoryNames = {
    earphone: "Qulaqlıqlar",
    powerbank: "Powerbank",
    "car-charger": "Avtomobil Aksesuarları",
    charger: "Şarj Cihazı",
  };
  return categoryNames[category] || category;
}

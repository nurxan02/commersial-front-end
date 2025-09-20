// API base configuration (set this to your deployed backend origin)
// Example usage in browser console:
//   API.setBase('https://api.yourdomain.com');
(function () {
  // Determine base once and reuse everywhere with safer defaults
  function readMetaBase() {
    const el = document.querySelector('meta[name="depod-api-base"]');
    return el && el.content ? el.content.trim() : "";
  }

  function isLocalhostHost(h) {
    return h === "localhost" || h === "127.0.0.1";
  }

  function isSafeUrl(u) {
    try {
      const url = new URL(u);
      // Allow http only for localhost; require https otherwise
      if (!isLocalhostHost(url.hostname) && url.protocol !== "https:")
        return false;
      return true;
    } catch (_) {
      return false;
    }
  }

  // Base sources priority: window var -> meta tag -> localStorage (localhost) -> dev-friendly fallback -> same-origin
  let API_BASE =
    (typeof window !== "undefined" && window.DEPOD_API_BASE) ||
    readMetaBase() ||
    "";

  // Only honor localStorage override during localhost development
  if (!API_BASE && isLocalhostHost(location.hostname)) {
    const devOverride = localStorage.getItem("API_BASE");
    if (devOverride && isSafeUrl(devOverride)) {
      API_BASE = devOverride;
    }
  }

  // Dev-friendly default: if on localhost and non-8000 port (e.g., 5500), assume Django on 127.0.0.1:8000
  if (
    !API_BASE &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1") &&
    location.port &&
    location.port !== "8000"
  ) {
    API_BASE = "http://127.0.0.1:8000";
  }

  // Otherwise, if still empty and we are served via http(s), prefer same-origin
  if (!API_BASE && /^https?:$/.test(location.protocol)) {
    API_BASE = location.origin;
  }

  function apiUrl(path) {
    if (!API_BASE) return path; // when empty, relative (for dev fallback)
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${API_BASE}${normalized}`;
  }

  // --- CSRF helpers ---
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
    return null;
  }

  async function ensureCsrfToken() {
    let token = getCookie("csrftoken");
    if (token) return token;
    // Try to obtain CSRF cookie from backend endpoints that should set it
    const candidates = ["/api/auth/csrf/", "/api/csrf/", "/api/", "/"];
    for (const path of candidates) {
      try {
        await fetch(apiUrl(path), {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json, text/html;q=0.9" },
        });
        token = getCookie("csrftoken");
        if (token) return token;
      } catch (_) {
        // continue trying next candidate
      }
    }
    return null;
  }

  function needsCsrf(method) {
    const m = (method || "GET").toUpperCase();
    return m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE";
  }

  async function withCsrfHeaders(options) {
    const opts = { ...(options || {}) };
    if (needsCsrf(opts.method)) {
      const token = await ensureCsrfToken();
      if (!opts.headers) opts.headers = {};
      if (token) opts.headers["X-CSRFToken"] = token;
    }
    return opts;
  }

  async function fetchJson(url, opts = {}) {
    const finalOpts = await withCsrfHeaders({
      headers: { Accept: "application/json", ...(opts.headers || {}) },
      ...opts,
    });
    const res = await fetch(url, finalOpts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async function listProducts(category = null) {
    const url = category
      ? apiUrl(`/api/products/?category=${encodeURIComponent(category)}`)
      : apiUrl("/api/products/");
    const data = await fetchJson(url);
    // DRF pagination support
    return Array.isArray(data) ? data : data.results || [];
  }

  async function getProduct(id) {
    return fetchJson(apiUrl(`/api/products/${encodeURIComponent(id)}/`));
  }

  async function listCategories() {
    const data = await fetchJson(apiUrl("/api/categories/"));
    return Array.isArray(data) ? data : data.results || [];
  }

  function setBase(url) {
    if (url && !isSafeUrl(url)) {
      console.warn("Rejected insecure API base (use https or localhost):", url);
      return;
    }
    API_BASE = url || "";
    // Persist only in localhost dev to avoid tampering in prod
    if (isLocalhostHost(location.hostname)) {
      if (url) localStorage.setItem("API_BASE", url);
      else localStorage.removeItem("API_BASE");
    }
  }

  // Dev-friendly default: if on localhost and nothing set, assume backend on 127.0.0.1:8000
  if (
    !API_BASE &&
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ) {
    setBase("http://127.0.0.1:8000");
  }

  // E-commerce API functions
  async function createOrder(orderData) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl("/api/orders/"),
      await withCsrfHeaders({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify(orderData),
      })
    );

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  }

  async function getOrders() {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(apiUrl("/api/orders/"), {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      credentials: "include",
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  }

  async function updateOrderStatus(orderId, status) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl(`/api/orders/${orderId}/`),
      await withCsrfHeaders({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      })
    );

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  }

  async function getProductPricing(productId) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(apiUrl(`/api/products/${productId}/pricing/`), {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      credentials: "include",
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  }

  async function getStudentDiscount() {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(apiUrl("/api/student-discount/"), {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      credentials: "include",
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }
    return resp.json();
  }

  // Optional helpers for additional endpoints used by the frontend (safe to 404)
  async function getOrder(orderId) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl(`/api/orders/${encodeURIComponent(orderId)}/`),
      {
        method: "GET",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
      }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }

  async function getStudentQr() {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(apiUrl(`/api/auth/student-qr/`), {
      method: "GET",
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json(); // e.g., { qr_image_url: "..." } or { qr_svg: "..." }
  }

  async function getSocialLinks() {
    const resp = await fetch(apiUrl(`/api/settings/social-links/`), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json(); // e.g., { instagram, tiktok, facebook }
  }

  // Legal documents (Terms & Privacy) URLs
  async function getLegalDocs() {
    const resp = await fetch(apiUrl(`/api/settings/legal-docs/`), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    // expected: { terms_pdf_url: string, privacy_pdf_url: string }
    return resp.json();
  }

  // Home settings (hero texts)
  async function getHomeSettings() {
    const resp = await fetch(apiUrl(`/api/settings/home/`), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    // expected: { home_hero_title: string, home_hero_subtitle: string }
    return resp.json();
  }

  // Review API methods
  async function getProductReviews(productId, limit = null) {
    const url = limit
      ? apiUrl(`/api/reviews/?product_id=${productId}&limit=${limit}`)
      : apiUrl(`/api/reviews/?product_id=${productId}`);
    const resp = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    return Array.isArray(data) ? data : data.results || [];
  }

  async function getProductReviewStats(productId) {
    const resp = await fetch(
      apiUrl(`/api/reviews/product_stats/?product_id=${productId}`),
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }

  async function getUserReview(productId) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl(`/api/reviews/user_review/?product_id=${productId}`),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
      }
    );
    if (resp.status === 404) return null; // No review found
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }

  async function createReview(reviewData) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl("/api/reviews/"),
      await withCsrfHeaders({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify(reviewData),
      })
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }

  async function updateReview(reviewId, reviewData) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl(`/api/reviews/${reviewId}/`),
      await withCsrfHeaders({
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
        body: JSON.stringify(reviewData),
      })
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  }

  async function deleteReview(reviewId) {
    const token = localStorage.getItem("depod_access_token");
    const resp = await fetch(
      apiUrl(`/api/reviews/${reviewId}/`),
      await withCsrfHeaders({
        method: "DELETE",
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        credentials: "include",
      })
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return true;
  }

  window.API = {
    setBase,
    getCsrfToken: ensureCsrfToken,
    listProducts,
    getProduct,
    listCategories,
    createOrder,
    getOrders,
    updateOrderStatus,
    getProductPricing,
    getStudentDiscount,
    getOrder,
    getStudentQr,
    getSocialLinks,
    getLegalDocs,
    getHomeSettings,
    getProductReviews,
    getProductReviewStats,
    getUserReview,
    createReview,
    updateReview,
    deleteReview,
    _url: apiUrl,
  };
})();

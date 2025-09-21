// Footer dynamic loader: applies to any page that has the footer structure
(async function () {
  const footer = document.querySelector(".footer");
  if (!footer) return;

  // Centralized API base (from api.js if available, else global)
  const apiBase =
    window.API && typeof window.API._url === "function"
      ? window.API._url("")
      : window.DEPOD_API_BASE || "";
  const apiRoot = (apiBase || "").replace(/\/$/, "");
  const FOOTER_URL = `${apiRoot}/api/footer/`;
  const CATEGORIES_URL = `${apiRoot}/api/categories/`;

  function qs(sel) {
    return document.querySelector(sel);
  }
  function isStr(v) {
    return typeof v === "string" && v.trim().length > 0;
  }
  function setText(selector, value, maxLength) {
    const el = qs(selector);
    if (!el || !isStr(value)) return;
    const val =
      maxLength && value.length > maxLength
        ? value.slice(0, maxLength) + "…"
        : value;
    el.textContent = val;
  }
  function setHTML(selector, value) {
    const el = qs(selector);
    if (!el || !isStr(value)) return;
    el.innerHTML = value;
  }

  function findSectionByTitle(regex) {
    const sections = Array.from(
      document.querySelectorAll(".footer .footer-section")
    );
    function norm(s) {
      return (s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    }
    const want = norm("Şirkət"); // "sirket"
    return (
      sections.find((sec) => {
        const h4 = sec.querySelector(".footer-title");
        const text = (h4 && h4.textContent) || "";
        const tnorm = norm(text);
        return regex.test(text.trim()) || tnorm.includes(want);
      }) || null
    );
  }

  function firstNonEmpty(...vals) {
    for (const v of vals) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  }

  async function loadFooterData() {
    // Try known endpoints in order (footer/contact/site settings)
    const candidates = [
      `${apiRoot}/api/footer/`,
      `${apiRoot}/api/settings/footer/`,
      `${apiRoot}/api/cms/footer/`,
      `${apiRoot}/api/site/footer/`,
      `${apiRoot}/api/settings/footer-content/`,
      `${apiRoot}/api/cms/footer-content/`,
      `${apiRoot}/api/settings/site/`,
      `${apiRoot}/api/site/settings/`,
      `${apiRoot}/api/settings/contact/`,
      `${apiRoot}/api/contact/`,
      `${apiRoot}/api/cms/contact/`,
      `${apiRoot}/api/settings/social-links/`,
    ];

    function flattenFooterShape(obj) {
      if (!obj || typeof obj !== "object") return obj;
      // If wrapped inside common keys, unwrap
      const nested =
        obj.footer || obj.site || obj.settings || obj.contact || null;
      if (nested && typeof nested === "object") {
        return { ...obj, ...nested };
      }
      return obj;
    }

    function normalizeFooter(obj) {
      const o = flattenFooterShape(obj) || {};
      const pick = (...keys) => {
        for (const k of keys) {
          if (typeof o[k] === "string" && o[k].trim()) return o[k].trim();
        }
        return "";
      };
      return {
        description: pick(
          "description",
          "footer_description",
          "site_description",
          "about",
          "about_text",
          "short_description"
        ),
        email: pick(
          "email",
          "contact_email",
          "email_address",
          "support_email",
          "info_email"
        ),
        phone: pick(
          "phone",
          "phone_number",
          "contact_phone",
          "support_phone",
          "whatsapp"
        ),
        bottom_text: pick(
          "bottom_text",
          "footer_note",
          "copyright_text",
          "copyright"
        ),
        instagram: o.instagram,
        tiktok: o.tiktok,
        facebook: o.facebook || o.facebook_url,
      };
    }
    for (const url of candidates) {
      try {
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          credentials: "include",
        });
        if (!res.ok) continue;
        const json = await res.json();
        let obj = Array.isArray(json)
          ? json[0]
          : json && json.results
          ? json.results[0]
          : json;
        if (obj && typeof obj === "object") return normalizeFooter(obj);
      } catch (_) {
        // continue
      }
    }
    return null;
  }

  let data = await loadFooterData();
  if (data) {
    // Description paragraph
    setHTML(
      ".footer .footer-description",
      data.description || data.footer_description || data.site_description
    );
    // Right contact block
    const contactInfo = document.querySelector(".footer-contact");
    const email = firstNonEmpty(
      data.email,
      data.contact_email,
      data.email_address
    );
    const phone = firstNonEmpty(data.phone, data.phone_number, data.whatsapp);
    if (contactInfo && (email || phone)) {
      contactInfo.innerHTML = `
              ${email ? `<p><a href="mailto:${email}">${email}</a></p>` : ""}
              ${phone ? `<p><a href="tel:${phone}">${phone}</a></p>` : ""}
      `;
    }
    // Bottom text (if present)
    const bottom = document.querySelector(".footer .footer-bottom p");
    if (bottom) {
      const text = (data.bottom_text || data.footer_note || "").trim();
      if (text) {
        const link = bottom.querySelector("a");
        const linkHTML = link ? link.outerHTML : "";
        bottom.innerHTML = `${text} ${linkHTML}`;
      }
    }

    // Social links
    try {
      const socialWrap = document.querySelector(".footer .social-icons");
      if (socialWrap) {
        const setSocial = (iconSelector, url) => {
          if (!isStr(url)) return;
          const icon = socialWrap.querySelector(iconSelector);
          if (icon) {
            const a = icon.closest("a");
            if (a) a.href = url;
          }
        };
        setSocial("i.fa-instagram, i.fab.fa-instagram", data.instagram);
        setSocial("i.fa-tiktok, i.fab.fa-tiktok", data.tiktok);
        setSocial(
          "i.fa-facebook, i.fa-facebook-f, i.fab.fa-facebook-f",
          data.facebook
        );
      }
    } catch (_) {}
  }

  // Populate Products links from categories API (non-destructive fallback)
  try {
    let cats = [];
    if (window.API && typeof window.API.listCategories === "function") {
      cats = await window.API.listCategories();
    } else {
      const catRes = await fetch(CATEGORIES_URL, {
        headers: { Accept: "application/json" },
      });
      const catJson = await catRes.json();
      cats =
        catJson && catJson.results
          ? catJson.results
          : Array.isArray(catJson)
          ? catJson
          : [];
    }
    if (Array.isArray(cats) && cats.length) {
      // Find the footer section titled "Məhsullar"
      const sections = Array.from(
        document.querySelectorAll(".footer .footer-section")
      );
      const productsSection = sections.find((sec) => {
        const h4 = sec.querySelector(".footer-title");
        return h4 && /Məhsullar/i.test(h4.textContent || "");
      });
      if (productsSection) {
        const ul = productsSection.querySelector(".footer-links");
        if (ul) {
          ul.innerHTML = cats
            .map((c) => {
              const key = c.key || c.id || "";
              const name = c.name || key;
              if (!key) return "";
              return `<li><a href="products.html?category=${key}">${name}</a></li>`;
            })
            .join("");
        }
      }
    }
  } catch (e) {
    // keep static links
    console.warn("Footer categories load skipped:", e);
  }

  // Ensure legal links always visible; update hrefs from API if available
  try {
    let companySection = findSectionByTitle(/Şirkət/i);
    if (!companySection) {
      // Fallback: create a new section at the end so links are visible
      const content = document.querySelector(".footer .footer-content");
      if (content) {
        companySection = document.createElement("div");
        companySection.className = "footer-section";
        companySection.innerHTML = `
          <h4 class="footer-title">Şirkət</h4>
          <ul class="footer-links"></ul>
        `;
        content.appendChild(companySection);
      }
    }
    if (companySection) {
      let ul = companySection.querySelector(".footer-links");
      if (!ul) {
        ul = document.createElement("ul");
        ul.className = "footer-links";
        companySection.appendChild(ul);
      }

      function ensureLink(label, dataAttr) {
        let a = ul.querySelector(`a[data-legal="${dataAttr}"]`);
        if (!a) {
          const li = document.createElement("li");
          li.innerHTML = `<a href="#" target="_blank" rel="noopener" data-legal="${dataAttr}">${label}</a>`;
          ul.appendChild(li);
          a = li.querySelector("a");
        }
        return a;
      }

      const termsA = ensureLink("İstifadə şərtləri", "terms");
      const privacyA = ensureLink("Məxfilik siyasəti", "privacy");
      const distanceSaleA = ensureLink(
        "Məsafədən Satış Müqaviləsi",
        "distance-sale"
      );
      const deliveryReturnsA = ensureLink(
        "Çatdırılma və Qaytarma Şərtləri",
        "delivery-returns"
      );

      // Try to load URLs from API and set hrefs
      let docs = null;
      try {
        if (window.API && typeof window.API.getLegalDocs === "function") {
          docs = await window.API.getLegalDocs();
        } else if (apiRoot) {
          const res = await fetch(`${apiRoot}/api/settings/legal-docs/`, {
            headers: { Accept: "application/json" },
            credentials: "include",
          });
          if (res.ok) docs = await res.json();
        }
      } catch (inner) {
        // ignore network errors, keep default '#'
      }

      if (docs) {
        const termsUrl = docs.terms_pdf_url || docs.termsUrl || docs.terms;
        const privacyUrl =
          docs.privacy_pdf_url || docs.privacyUrl || docs.privacy;
        const distanceSaleUrl =
          docs.distance_sale_pdf_url ||
          docs.distanceSaleUrl ||
          docs.distance_sale;
        const deliveryReturnsUrl =
          docs.delivery_returns_pdf_url ||
          docs.deliveryReturnsUrl ||
          docs.delivery_returns;
        if (termsUrl && termsA) termsA.href = termsUrl;
        if (privacyUrl && privacyA) privacyA.href = privacyUrl;
        if (distanceSaleUrl && distanceSaleA)
          distanceSaleA.href = distanceSaleUrl;
        if (deliveryReturnsUrl && deliveryReturnsA)
          deliveryReturnsA.href = deliveryReturnsUrl;
      }
    }
  } catch (e) {
    console.warn("Footer legal docs init skipped:", e);
  }
})();

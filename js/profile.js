// Profile page functionality
document.addEventListener("DOMContentLoaded", function () {
  // Keep the latest loaded orders in memory for actions like track/cancel
  let currentOrders = [];
  // API URL helper (reuse global API base from api.js)
  const apiUrl = (p) =>
    window.API && typeof window.API._url === "function"
      ? window.API._url(p)
      : p;

  // Check authentication status
  checkAuthStatus();

  // Tab switching functionality
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const targetTab = this.dataset.tab;

      // Remove active class from all tabs and contents
      tabBtns.forEach((tab) => tab.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      this.classList.add("active");
      document.getElementById(targetTab).classList.add("active");
    });
  });

  // Profile dropdown functionality
  const profileToggle = document.getElementById("profileToggle");
  const profileDropdown = document.getElementById("profileDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  if (profileToggle && profileDropdown) {
    profileToggle.addEventListener("click", function (e) {
      e.preventDefault();
      profileDropdown.classList.toggle("active");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (
        !profileToggle.contains(e.target) &&
        !profileDropdown.contains(e.target)
      ) {
        profileDropdown.classList.remove("active");
      }
    });
  }

  // Logout functionality
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function (e) {
      e.preventDefault();
      logout();
    });
  }

  // Password visibility toggles
  setupPasswordToggles();

  // Load user data
  loadUserProfile();

  // Phone edit functionality
  setupPhoneEdit();

  // Phone formatting
  setupPhoneFormatting();

  // Password reset functionality
  setupPasswordReset();

  // File upload functionality
  setupFileUpload();

  // Authentication check
  function checkAuthStatus() {
    const userData = localStorage.getItem("depod_user");
    const accessToken = localStorage.getItem("depod_access_token");

    if (!userData || !accessToken) {
      // User is not logged in, redirect to login page
      window.location.href =
        "login.html?redirect=" + encodeURIComponent(window.location.pathname);
    }
  }

  // Load user profile data
  async function loadUserProfile() {
    try {
      const userData = JSON.parse(localStorage.getItem("depod_user") || "{}");
      const accessToken = localStorage.getItem("depod_access_token");

      if (!accessToken) {
        throw new Error("No access token");
      }

      // Update UI with stored user data first
      updateProfileUI(userData);

      // Fetch fresh data from API
      const response = await fetch(apiUrl(`/api/auth/profile/`), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        credentials: "include",
      });

      if (response.ok) {
        const freshUserData = await response.json();
        // Update localStorage with fresh data
        localStorage.setItem("depod_user", JSON.stringify(freshUserData));
        // Update UI with fresh data
        updateProfileUI(freshUserData);
      } else if (response.status === 401) {
        // Token expired or invalid
        logout();
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // Use stored data if API fails
      const userData = JSON.parse(localStorage.getItem("depod_user") || "{}");
      updateProfileUI(userData);
    }
  }

  // Update profile UI
  function updateProfileUI(userData) {
    // Update header
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const userNameDisplay = document.getElementById("userNameDisplay");

    if (profileName) {
      profileName.textContent =
        `${userData.first_name || ""} ${userData.last_name || ""}`.trim() ||
        "İstifadəçi";
    }
    if (profileEmail) {
      profileEmail.textContent = userData.email || "";
    }
    if (userNameDisplay) {
      userNameDisplay.textContent = userData.first_name || "Profil";
    }

    // Update form fields
    const fields = {
      displayFirstName: userData.first_name || "",
      displayLastName: userData.last_name || "",
      displayEmail: userData.email || "",
      editPhone: formatPhoneDisplay(userData.phone) || "",
      displayBirthDate: userData.birth_date || "",
    };

    for (const [fieldId, value] of Object.entries(fields)) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = value;
      }
    }

    // Update promotion status
    updatePromotionStatus(userData.student_status);
  }

  // Setup password toggles
  function setupPasswordToggles() {
    const toggles = [
      { btn: "currentPasswordToggle", field: "currentPassword" },
      { btn: "newPasswordToggle", field: "newPassword" },
      { btn: "confirmNewPasswordToggle", field: "confirmNewPassword" },
    ];

    toggles.forEach(({ btn, field }) => {
      const toggleBtn = document.getElementById(btn);
      const passwordField = document.getElementById(field);

      if (toggleBtn && passwordField) {
        toggleBtn.addEventListener("click", function () {
          const type =
            passwordField.getAttribute("type") === "password"
              ? "text"
              : "password";
          passwordField.setAttribute("type", type);

          const icon = toggleBtn.querySelector("i");
          if (type === "password") {
            icon.className = "fas fa-eye";
          } else {
            icon.className = "fas fa-eye-slash";
          }
        });
      }
    });
  }

  // Setup phone editing
  function setupPhoneEdit() {
    const editPhoneBtn = document.getElementById("editPhoneBtn");
    const editPhone = document.getElementById("editPhone");
    const updatePhoneBtn = document.getElementById("updatePhoneBtn");
    const profileInfoForm = document.getElementById("profileInfoForm");

    if (editPhoneBtn && editPhone && updatePhoneBtn) {
      editPhoneBtn.addEventListener("click", function () {
        const isReadonly = editPhone.hasAttribute("readonly");

        if (isReadonly) {
          // Enable editing
          editPhone.removeAttribute("readonly");
          editPhone.focus();
          editPhoneBtn.querySelector("i").className = "fas fa-times";
          updatePhoneBtn.style.display = "block";
        } else {
          // Cancel editing
          editPhone.setAttribute("readonly", true);
          editPhoneBtn.querySelector("i").className = "fas fa-edit";
          updatePhoneBtn.style.display = "none";
          // Restore original value
          const userData = JSON.parse(
            localStorage.getItem("depod_user") || "{}"
          );
          editPhone.value = userData.phone || "";
        }
      });
    }

    if (profileInfoForm) {
      profileInfoForm.addEventListener("submit", async function (e) {
        e.preventDefault();
        await updatePhone();
      });
    }
  }

  // Update phone number
  async function updatePhone() {
    const editPhone = document.getElementById("editPhone");
    const updatePhoneBtn = document.getElementById("updatePhoneBtn");
    const editPhoneBtn = document.getElementById("editPhoneBtn");

    if (!editPhone || !updatePhoneBtn) return;

    const newPhone = editPhone.value.trim();
    // Clean phone number for API (remove formatting)
    const cleanPhone = newPhone.replace(/[^\d+]/g, "");

    if (!cleanPhone) {
      showNotification("Telefon nömrəsi tələb olunur", "error");
      return;
    }

    if (!isValidPhone(cleanPhone)) {
      showNotification(
        "Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)",
        "error"
      );
      return;
    }

    setLoadingState(updatePhoneBtn, true);

    try {
      const accessToken = localStorage.getItem("depod_access_token");
      const formData = new FormData();
      formData.append("phone", cleanPhone);

      const response = await fetch(apiUrl(`/api/auth/update-phone/`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage with clean phone number
        const userData = JSON.parse(localStorage.getItem("depod_user") || "{}");
        userData.phone = cleanPhone;
        localStorage.setItem("depod_user", JSON.stringify(userData));

        // Format and display the phone number nicely
        editPhone.value = formatPhoneDisplay(cleanPhone);

        // Reset edit mode
        editPhone.setAttribute("readonly", true);
        editPhoneBtn.querySelector("i").className = "fas fa-edit";
        updatePhoneBtn.style.display = "none";

        showNotification("Telefon nömrəsi uğurla yeniləndi", "success");
      } else {
        const errorMessage =
          data.message ||
          data.error ||
          "Telefon nömrəsi yenilənərkən xəta baş verdi";
        showNotification(errorMessage, "error");
      }
    } catch (error) {
      console.error("Phone update error:", error);
      showNotification(
        "Şəbəkə xətası. Zəhmət olmasa yenidən cəhd edin.",
        "error"
      );
    } finally {
      setLoadingState(updatePhoneBtn, false);
    }
  }

  // Setup password reset
  function setupPasswordReset() {
    const passwordResetForm = document.getElementById("passwordResetForm");
    const changePasswordBtn = document.getElementById("changePasswordBtn");

    if (passwordResetForm) {
      passwordResetForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        const currentPassword =
          document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword =
          document.getElementById("confirmNewPassword").value;

        // Validation
        if (!currentPassword || !newPassword || !confirmNewPassword) {
          showNotification("Bütün sahələri doldurun", "error");
          return;
        }

        if (newPassword.length < 8) {
          showNotification(
            "Yeni parol ən azı 8 simvoldan ibarət olmalıdır",
            "error"
          );
          return;
        }

        if (newPassword !== confirmNewPassword) {
          showNotification("Yeni parollar uyğun gəlmir", "error");
          return;
        }

        await changePassword(currentPassword, newPassword);
      });
    }
  }

  // Change password
  async function changePassword(currentPassword, newPassword) {
    const changePasswordBtn = document.getElementById("changePasswordBtn");

    setLoadingState(changePasswordBtn, true);

    try {
      const accessToken = localStorage.getItem("depod_access_token");
      // Prevent same new/current on client too
      if (currentPassword === newPassword) {
        showNotification("Yeni parol cari parolla eyni ola bilməz", "error");
        return;
      }
      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_password", newPassword);

      const apiUrl = (p) =>
        window.API && typeof window.API._url === "function"
          ? window.API._url(p)
          : p;
      const response = await fetch(apiUrl(`/api/auth/change-password/`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // Clear form
        document.getElementById("passwordResetForm").reset();
        showNotification("Parol uğurla dəyişdirildi", "success");
      } else {
        // Prefer field-specific messages if available
        if (data.errors && typeof data.errors === "object") {
          const msg =
            data.errors.new_password?.[0] ||
            data.errors.current_password?.[0] ||
            data.message ||
            data.error ||
            "Parol dəyişdirilərkən xəta baş verdi";
          showNotification(msg, "error");
        } else {
          const errorMessage =
            data.message ||
            data.error ||
            "Parol dəyişdirilərkən xəta baş verdi";
          showNotification(errorMessage, "error");
        }
      }
    } catch (error) {
      console.error("Password change error:", error);
      showNotification(
        "Şəbəkə xətası. Zəhmət olmasa yenidən cəhd edin.",
        "error"
      );
    } finally {
      setLoadingState(changePasswordBtn, false);
    }
  }

  // Setup file upload
  function setupFileUpload() {
    const uploadBtn = document.getElementById("uploadBtn");
    const studentDocument = document.getElementById("studentDocument");
    const retryBtn = document.getElementById("retryBtn");

    if (uploadBtn && studentDocument) {
      uploadBtn.addEventListener("click", function () {
        studentDocument.click();
      });

      studentDocument.addEventListener("change", function (e) {
        const file = e.target.files[0];
        if (file) {
          uploadStudentDocument(file);
        }
      });
    }

    if (retryBtn) {
      retryBtn.addEventListener("click", function () {
        studentDocument.click();
      });
    }
  }

  // Upload student document
  async function uploadStudentDocument(file) {
    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (file.size > maxSize) {
      showNotification("Fayl ölçüsü 10 MB-dan böyük ola bilməz", "error");
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      showNotification("Yalnız PDF, JPG və PNG faylları qəbul edilir", "error");
      return;
    }

    // Show uploading state
    updatePromotionStatus("uploading");

    try {
      const accessToken = localStorage.getItem("depod_access_token");
      const formData = new FormData();
      formData.append("student_document", file);

      const response = await fetch(
        `${API_BASE}/api/auth/upload-student-document/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Update user data
        const userData = JSON.parse(localStorage.getItem("depod_user") || "{}");
        userData.student_status = "pending";
        localStorage.setItem("depod_user", JSON.stringify(userData));

        updatePromotionStatus("pending");
        showNotification(
          "Sənəd uğurla yükləndi. Yoxlanılması gözlənilir.",
          "success"
        );
      } else {
        updatePromotionStatus("none");
        const errorMessage =
          data.message || data.error || "Sənəd yüklənərkən xəta baş verdi";
        showNotification(errorMessage, "error");
      }
    } catch (error) {
      console.error("Document upload error:", error);
      updatePromotionStatus("none");
      showNotification(
        "Şəbəkə xətası. Zəhmət olmasa yenidən cəhd edin.",
        "error"
      );
    }
  }

  // Update promotion status
  function updatePromotionStatus(status) {
    const noDocument = document.getElementById("noDocument");
    const documentPending = document.getElementById("documentPending");
    const documentApproved = document.getElementById("documentApproved");
    const documentRejected = document.getElementById("documentRejected");

    // Hide all status cards
    [noDocument, documentPending, documentApproved, documentRejected].forEach(
      (el) => {
        if (el) el.style.display = "none";
      }
    );

    // Show appropriate status
    switch (status) {
      case "pending":
      case "uploading":
        if (documentPending) documentPending.style.display = "block";
        break;
      case "approved":
        if (documentApproved) {
          documentApproved.style.display = "block";
          // Attempt to load QR code dynamically if supported by backend
          try {
            if (window.API && typeof window.API.getStudentQr === "function") {
              window.API.getStudentQr()
                .then((qr) => {
                  const container =
                    documentApproved.querySelector(".qr-container") ||
                    documentApproved;
                  if (qr?.qr_image_url) {
                    const img = new Image();
                    img.src = qr.qr_image_url;
                    img.alt = "Tələbə endirimi QR";
                    img.style.maxWidth = "180px";
                    container.appendChild(img);
                  } else if (qr?.qr_svg && typeof qr.qr_svg === "string") {
                    container.insertAdjacentHTML("beforeend", qr.qr_svg);
                  }
                })
                .catch(() => {});
            }
          } catch (_) {}
        }
        break;
      case "rejected":
        if (documentRejected) documentRejected.style.display = "block";
        break;
      default:
        if (noDocument) noDocument.style.display = "block";
        break;
    }
  }

  // Utility functions
  function isValidPhone(phone) {
    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // Azerbaijan phone number patterns:
    // +994xxxxxxxxx (with country code)
    // 0xxxxxxxxx (local format)
    // xxxxxxxxx (without leading zero)
    const azerbaijanPatterns = [
      /^\+994[1-9]\d{8}$/, // +994xxxxxxxxx
      /^0[1-9]\d{8}$/, // 0xxxxxxxxx
      /^[1-9]\d{8}$/, // xxxxxxxxx
      /^\+?994[1-9]\d{8}$/, // Optional + before 994
    ];

    // Check if phone matches any Azerbaijan pattern
    const isAzerbaijanPhone = azerbaijanPatterns.some((pattern) =>
      pattern.test(cleanPhone)
    );

    // Also allow international format (10-15 digits)
    const internationalPattern = /^\+?[1-9]\d{9,14}$/;
    const isInternationalPhone = internationalPattern.test(cleanPhone);

    return isAzerbaijanPhone || isInternationalPhone;
  }

  // Format phone number for display
  function formatPhoneDisplay(phone) {
    if (!phone) return "";

    // Remove all non-digit characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    // Format Azerbaijan numbers
    if (cleanPhone.startsWith("+994")) {
      const number = cleanPhone.substring(4);
      if (number.length === 9) {
        return `+994 ${number.substring(0, 2)} ${number.substring(
          2,
          5
        )} ${number.substring(5, 7)} ${number.substring(7)}`;
      }
    } else if (cleanPhone.startsWith("994")) {
      const number = cleanPhone.substring(3);
      if (number.length === 9) {
        return `+994 ${number.substring(0, 2)} ${number.substring(
          2,
          5
        )} ${number.substring(5, 7)} ${number.substring(7)}`;
      }
    } else if (cleanPhone.startsWith("0") && cleanPhone.length === 10) {
      const number = cleanPhone.substring(1);
      return `+994 ${number.substring(0, 2)} ${number.substring(
        2,
        5
      )} ${number.substring(5, 7)} ${number.substring(7)}`;
    }

    return phone; // Return original if no formatting rules match
  }

  // Auto-format phone input as user types
  function setupPhoneFormatting() {
    const editPhone = document.getElementById("editPhone");
    if (!editPhone) return;

    editPhone.addEventListener("input", function (e) {
      if (this.hasAttribute("readonly")) return;

      let value = e.target.value.replace(/[^\d+]/g, "");

      // Auto-add +994 for Azerbaijan numbers
      if (
        value.length > 0 &&
        !value.startsWith("+") &&
        !value.startsWith("994")
      ) {
        if (value.startsWith("0")) {
          value = "+994" + value.substring(1);
        } else if (value.length <= 9) {
          value = "+994" + value;
        }
      }

      e.target.value = value;
    });
  }

  function setLoadingState(button, isLoading) {
    if (!button) return;

    const btnText = button.querySelector(".btn-text");
    const btnLoader = button.querySelector(".btn-loader");

    if (isLoading) {
      if (btnText) btnText.style.opacity = "0";
      if (btnLoader) btnLoader.style.display = "block";
      button.disabled = true;
    } else {
      if (btnText) btnText.style.opacity = "1";
      if (btnLoader) btnLoader.style.display = "none";
      button.disabled = false;
    }
  }

  function showNotification(message, type = "error") {
    // Remove existing notification
    const existingNotification = document.querySelector(
      ".profile-notification"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `profile-notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${
        type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
      }"></i>
      <span>${message}</span>
      <button class="notification-close">&times;</button>
    `;

    const profileContainer = document.querySelector(".profile-container");
    if (profileContainer) {
      profileContainer.insertBefore(notification, profileContainer.firstChild);
    }

    // Close button functionality
    const closeBtn = notification.querySelector(".notification-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => notification.remove());
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  function logout() {
    // Clear stored data
    localStorage.removeItem("depod_user");
    localStorage.removeItem("depod_access_token");

    // Redirect to home page
    window.location.href = "index.html";
  }

  // Orders functionality
  async function loadOrders() {
    let orders = [];
    if (window.API && typeof window.API.getOrders === "function") {
      try {
        const apiOrders = await window.API.getOrders();
        const list = Array.isArray(apiOrders?.results)
          ? apiOrders.results
          : apiOrders;
        const toNum = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        orders = (Array.isArray(list) ? list : []).map((o) => {
          const item = o.items?.[0] || {};
          const qty = toNum(item.quantity || o.quantity || 1);
          const unit = toNum(item.unit_price || o.unit_price || 0);
          const total = toNum(o.total_price || unit * qty);
          return {
            id: o.id,
            status: o.status,
            createdAt: o.created_at || o.createdAt || new Date().toISOString(),
            estimatedDelivery:
              o.estimated_delivery ||
              o.estimatedDelivery ||
              new Date(Date.now() + 3 * 86400000).toISOString(),
            productName: item.name || o.product_name || "Məhsul",
            productImage: item.image || o.product_image || "",
            quantity: qty,
            unitPrice: unit,
            totalPrice: total,
          };
        });
      } catch (e) {
        orders = JSON.parse(localStorage.getItem("depod_orders") || "[]");
      }
    } else {
      orders = JSON.parse(localStorage.getItem("depod_orders") || "[]");
    }

    const ordersList = document.getElementById("ordersList");
    const noOrders = ordersList.querySelector(".no-orders");

    if (orders.length === 0) {
      noOrders.style.display = "flex";
      return;
    }

    noOrders.style.display = "none";

    // Sort orders by date (newest first)
    const sortedOrders = orders.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // cache for actions
    currentOrders = sortedOrders;

    const ordersHTML = sortedOrders
      .map((order) => createOrderCard(order))
      .join("");
    ordersList.innerHTML =
      ordersHTML + ordersList.querySelector(".no-orders").outerHTML;

    // Add filter functionality
    setupOrderFilters();
  }

  function createOrderCard(order) {
    const orderDate = new Date(order.createdAt).toLocaleDateString("az-AZ");
    const estimatedDelivery = new Date(
      order.estimatedDelivery
    ).toLocaleDateString("az-AZ");
    const safeFixed = (v, d = 2) => {
      const n = Number(v);
      return Number.isFinite(n) ? n.toFixed(d) : "0.00";
    };

    return `
      <div class="order-card" data-status="${order.status}">
        <div class="order-header">
          <div class="order-info">
            <h4>Sifariş #${order.id}</h4>
            <p class="order-date">${orderDate} tarixində verildi</p>
          </div>
          <span class="order-status ${
            order.status
          }">${getStatusText(order.status)}</span>
        </div>
        
        <div class="order-items">
          <div class="order-item">
            <img src="${
              order.productImage || "image/material/earphone/TWS-001-white.jpg"
            }" alt="${order.productName}" class="order-item-image">
            <div class="order-item-details">
              <h5>${order.productName}</h5>
              <p>Miqdar: ${
                order.quantity
              } | Vahid qiyməti: ${safeFixed(order.unitPrice, 2)} ₼</p>
            </div>
          </div>
        </div>
        
        <div class="order-footer">
          <div class="order-total">
            Ümumi: ${safeFixed(order.totalPrice, 2)} ₼
          </div>
          <div class="order-actions">
            ${
              order.status === "pending"
                ? `<button class="order-btn" onclick="cancelOrder('${order.id}')">Ləğv et</button>`
                : ""
            }
            <button class="order-btn primary" onclick="trackOrder('${
              order.id
            }')">İzlə</button>
          </div>
        </div>
        
        ${
          order.status === "shipped"
            ? `<div class="delivery-info">
            <i class="fas fa-truck"></i>
            <span>Təxmini çatdırılma tarixi: ${estimatedDelivery}</span>
          </div>`
            : ""
        }
      </div>
    `;
  }

  function getStatusText(status) {
    const statusMap = {
      pending: "Gözləyən",
      processing: "İşlənən",
      shipped: "Göndərilən",
      delivered: "Çatdırılan",
      cancelled: "Ləğv edildi",
    };
    return statusMap[status] || status;
  }

  function setupOrderFilters() {
    const filterChips = document.querySelectorAll(".filter-chip");

    filterChips.forEach((chip) => {
      chip.addEventListener("click", function () {
        // Update active filter
        filterChips.forEach((c) => c.classList.remove("active"));
        this.classList.add("active");

        // Filter orders
        const status = this.dataset.status;
        const orderCards = document.querySelectorAll(".order-card");

        orderCards.forEach((card) => {
          if (status === "all" || card.dataset.status === status) {
            card.style.display = "block";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  // Global functions for order actions
  window.cancelOrder = async function (orderId) {
    if (!confirm("Sifarişi ləğv etmək istədiyinizə əminsiniz?")) return;

    try {
      if (window.API && typeof window.API.updateOrderStatus === "function") {
        await window.API.updateOrderStatus(orderId, "cancelled");
      } else {
        // Fallback to localStorage-only if API helper not available
        const orders = JSON.parse(localStorage.getItem("depod_orders") || "[]");
        const idx = orders.findIndex((o) => String(o.id) === String(orderId));
        if (idx !== -1) {
          orders[idx].status = "cancelled";
          localStorage.setItem("depod_orders", JSON.stringify(orders));
        }
      }
      showNotification("Sifariş ləğv edildi", "success");
      await loadOrders();
    } catch (e) {
      console.error("Cancel order failed:", e);
      showNotification("Sifarişi ləğv etmək mümkün olmadı", "error");
    }
  };

  window.trackOrder = async function (orderId) {
    // Try in-memory list first
    let order = (currentOrders || []).find(
      (o) => String(o.id) === String(orderId)
    );
    if (!order) {
      // Try API helper
      try {
        if (window.API && typeof window.API.getOrder === "function") {
          const o = await window.API.getOrder(orderId);
          const item = o.items?.[0] || {};
          order = {
            id: o.id,
            status: o.status,
            createdAt: o.created_at || new Date().toISOString(),
            estimatedDelivery:
              o.estimated_delivery ||
              new Date(Date.now() + 3 * 86400000).toISOString(),
            productName: item.name || "Məhsul",
            productImage: item.image || "",
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            totalPrice: Number(o.total_price) || 0,
          };
        }
      } catch (e) {
        // Fallback to localStorage
        const ls = JSON.parse(localStorage.getItem("depod_orders") || "[]");
        order = ls.find((o) => String(o.id) === String(orderId));
      }
    }
    if (order) {
      showOrderTracking(order);
    }
  };

  function showOrderTracking(order) {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Sifariş İzləmə - #${order.id}</h3>
          <button class="modal-close" onclick="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tracking-steps">
            <div class="tracking-step ${
              ["pending", "processing", "shipped", "delivered"].indexOf(
                order.status
              ) >= 0
                ? "completed"
                : ""
            }">
              <div class="step-icon"><i class="fas fa-check"></i></div>
              <div class="step-info">
                <h4>Sifariş qəbul edildi</h4>
                <p>${new Date(order.createdAt).toLocaleDateString("az-AZ")}</p>
              </div>
            </div>
            <div class="tracking-step ${
              ["processing", "shipped", "delivered"].indexOf(order.status) >= 0
                ? "completed"
                : ""
            }">
              <div class="step-icon"><i class="fas fa-cog"></i></div>
              <div class="step-info">
                <h4>Hazırlanır</h4>
                <p>${order.status === "processing" ? "İndi" : ""}</p>
              </div>
            </div>
            <div class="tracking-step ${
              ["shipped", "delivered"].indexOf(order.status) >= 0
                ? "completed"
                : ""
            }">
              <div class="step-icon"><i class="fas fa-truck"></i></div>
              <div class="step-info">
                <h4>Göndərildi</h4>
                <p>${order.status === "shipped" ? "İndi" : ""}</p>
              </div>
            </div>
            <div class="tracking-step ${
              order.status === "delivered" ? "completed" : ""
            }">
              <div class="step-icon"><i class="fas fa-home"></i></div>
              <div class="step-info">
                <h4>Çatdırıldı</h4>
                <p>${order.status === "delivered" ? "İndi" : ""}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close modal function
    window.closeModal = function () {
      document.body.removeChild(modal);
    };

    // Close on overlay click
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  // Check URL parameters for tab switching
  function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");

    if (tab && document.getElementById(tab)) {
      // Remove active from all tabs
      tabBtns.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Activate requested tab
      const targetBtn = document.querySelector(`[data-tab="${tab}"]`);
      const targetContent = document.getElementById(tab);

      if (targetBtn && targetContent) {
        targetBtn.classList.add("active");
        targetContent.classList.add("active");

        // Load orders if orders tab is active
        if (tab === "orders") {
          loadOrders();
        }
      }
    }
  }

  // Load orders when orders tab is clicked
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      if (this.dataset.tab === "orders") {
        setTimeout(() => loadOrders(), 100);
      }
    });
  });

  // Check URL params on page load
  checkURLParams();
});

// CSS for tracking modal (add to style.css)
const modalCSS = `
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e5e5;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-body {
  padding: 20px;
}

.tracking-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tracking-step {
  display: flex;
  align-items: center;
  gap: 16px;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.tracking-step.completed {
  opacity: 1;
}

.step-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e5e5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.tracking-step.completed .step-icon {
  background: #10b981;
  color: white;
}

.step-info h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
}

.step-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.delivery-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background: #f0f9ff;
  border-radius: 8px;
  color: #0369a1;
  font-size: 14px;
}
`;

// Inject modal CSS
if (!document.getElementById("modal-styles")) {
  const style = document.createElement("style");
  style.id = "modal-styles";
  style.textContent = modalCSS;
  document.head.appendChild(style);
}

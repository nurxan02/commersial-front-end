// Profile page functionality
document.addEventListener("DOMContentLoaded", function () {
  // API Base configuration
  const API_BASE =
    window.DEPOD_API_BASE ||
    (window.location.port === "8000" ? "" : "http://127.0.0.1:8000");

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
      const response = await fetch(`${API_BASE}/api/auth/profile/`, {
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
      editPhone: userData.phone || "",
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

    if (!newPhone) {
      showNotification("Telefon nömrəsi tələb olunur", "error");
      return;
    }

    if (!isValidPhone(newPhone)) {
      showNotification("Düzgün telefon nömrəsi daxil edin", "error");
      return;
    }

    setLoadingState(updatePhoneBtn, true);

    try {
      const accessToken = localStorage.getItem("depod_access_token");
      const formData = new FormData();
      formData.append("phone", newPhone);

      const response = await fetch(`${API_BASE}/api/auth/update-phone/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        // Update localStorage
        const userData = JSON.parse(localStorage.getItem("depod_user") || "{}");
        userData.phone = newPhone;
        localStorage.setItem("depod_user", JSON.stringify(userData));

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

        if (newPassword.length < 6) {
          showNotification(
            "Yeni parol ən azı 6 simvoldan ibarət olmalıdır",
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
      const formData = new FormData();
      formData.append("current_password", currentPassword);
      formData.append("new_password", newPassword);

      const response = await fetch(`${API_BASE}/api/auth/change-password/`, {
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
        const errorMessage =
          data.message || data.error || "Parol dəyişdirilərkən xəta baş verdi";
        showNotification(errorMessage, "error");
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
        if (documentApproved) documentApproved.style.display = "block";
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
    const phoneRegex = /^\+?994[0-9]{9}$|^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
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
});

// Register page functionality
document.addEventListener("DOMContentLoaded", function () {
  // API URL helper (reuse global API base from api.js)
  const apiUrl = (p) =>
    window.API && typeof window.API._url === "function"
      ? window.API._url(p)
      : p;

  // Form elements
  const registerForm = document.getElementById("registerForm");
  const firstNameInput = document.getElementById("firstName");
  const lastNameInput = document.getElementById("lastName");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const birthDateInput = document.getElementById("birthDate");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const passwordToggle = document.getElementById("passwordToggle");
  const confirmPasswordToggle = document.getElementById(
    "confirmPasswordToggle"
  );
  const agreeTermsCheckbox = document.getElementById("agreeTerms");
  const registerBtn = document.getElementById("registerBtn");
  const termsLinkEl = document.getElementById("termsLink");
  const privacyLinkEl = document.getElementById("privacyLink");

  // Load legal document links from API (if available)
  (async function loadLegalDocs() {
    try {
      if (!window.API || !window.API.getLegalDocs) return;
      const docs = await window.API.getLegalDocs();
      const termsUrl = docs?.terms_pdf_url || docs?.termsUrl || docs?.terms;
      const privacyUrl =
        docs?.privacy_pdf_url || docs?.privacyUrl || docs?.privacy;

      if (termsUrl && termsLinkEl) {
        termsLinkEl.href = termsUrl;
        termsLinkEl.onclick = null; // Remove any existing handlers
        console.log("Terms URL loaded:", termsUrl);
      }
      if (privacyUrl && privacyLinkEl) {
        privacyLinkEl.href = privacyUrl;
        privacyLinkEl.onclick = null; // Remove any existing handlers
        console.log("Privacy URL loaded:", privacyUrl);
      }
    } catch (e) {
      // Silent fallback - if API fails, links will remain as javascript:void(0)
      console.warn("Failed to load legal docs:", e);

      // Add fallback click handlers for when API fails
      if (termsLinkEl) {
        termsLinkEl.onclick = function (e) {
          e.preventDefault();
          alert("İstifadə şərtləri hazırda əlçatan deyil.");
        };
      }
      if (privacyLinkEl) {
        privacyLinkEl.onclick = function (e) {
          e.preventDefault();
          alert("Məxfilik siyasəti hazırda əlçatan deyil.");
        };
      }
    }
  })();

  // Password visibility toggles
  function setupPasswordToggle(toggleBtn, passwordField) {
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
  }

  setupPasswordToggle(passwordToggle, passwordInput);
  setupPasswordToggle(confirmPasswordToggle, confirmPasswordInput);

  // Form validation
  function validateForm() {
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const birthDate = birthDateInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const agreeTerms = agreeTermsCheckbox.checked;

    // Clear previous error styles
    clearFormErrors();

    let isValid = true;

    // First name validation
    if (!firstName) {
      showFieldError(firstNameInput, "Ad tələb olunur");
      isValid = false;
    } else if (firstName.length < 2) {
      showFieldError(firstNameInput, "Ad ən azı 2 simvoldan ibarət olmalıdır");
      isValid = false;
    }

    // Last name validation
    if (!lastName) {
      showFieldError(lastNameInput, "Soyad tələb olunur");
      isValid = false;
    } else if (lastName.length < 2) {
      showFieldError(
        lastNameInput,
        "Soyad ən azı 2 simvoldan ibarət olmalıdır"
      );
      isValid = false;
    }

    // Email validation
    if (!email) {
      showFieldError(emailInput, "Email tələb olunur");
      isValid = false;
    } else if (!isValidEmail(email)) {
      showFieldError(emailInput, "Düzgün email daxil edin");
      isValid = false;
    }

    // Phone validation
    if (!phone) {
      showFieldError(phoneInput, "Telefon nömrəsi tələb olunur");
      isValid = false;
    } else if (!isValidPhone(phone)) {
      showFieldError(
        phoneInput,
        "Düzgün telefon nömrəsi daxil edin (+994501234567)"
      );
      isValid = false;
    }

    // Birth date validation
    if (!birthDate) {
      showFieldError(birthDateInput, "Doğum tarixi tələb olunur");
      isValid = false;
    } else if (!isValidBirthDate(birthDate)) {
      showFieldError(birthDateInput, "Düzgün doğum tarixi daxil edin");
      isValid = false;
    }

    // Password validation
    if (!password) {
      showFieldError(passwordInput, "Parol tələb olunur");
      isValid = false;
    } else if (password.length < 8) {
      showFieldError(
        passwordInput,
        "Parol ən azı 8 simvoldan ibarət olmalıdır"
      );
      isValid = false;
    }

    // Confirm password validation
    if (!confirmPassword) {
      showFieldError(confirmPasswordInput, "Parol təkrarı tələb olunur");
      isValid = false;
    } else if (password !== confirmPassword) {
      showFieldError(confirmPasswordInput, "Parollar uyğun gəlmir");
      isValid = false;
    }

    // Terms agreement validation
    if (!agreeTerms) {
      showFieldError(
        agreeTermsCheckbox,
        "İstifadə şərtlərini qəbul etməlisiniz"
      );
      isValid = false;
    }

    return isValid;
  }

  // Email validation
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Phone validation
  function isValidPhone(phone) {
    const phoneRegex = /^\+?994[0-9]{9}$|^\+?[0-9]{10,15}$/;
    return phoneRegex.test(phone);
  }

  // Birth date validation
  function isValidBirthDate(birthDate) {
    const date = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();

    // Must be at least 13 years old and not more than 120 years old
    return age >= 13 && age <= 120;
  }

  // Show field error
  function showFieldError(field, message) {
    // Handle checkbox case differently
    if (
      field.type === "checkbox" ||
      field.parentNode.querySelector('input[type="checkbox"]')
    ) {
      field.parentNode.classList.add("error");

      // Remove existing error message
      const existingError = field.parentNode.querySelector(".field-error");
      if (existingError) {
        existingError.remove();
      }

      // Add error message
      const errorDiv = document.createElement("div");
      errorDiv.className = "field-error";
      errorDiv.textContent = message;
      field.parentNode.appendChild(errorDiv);
      return;
    }

    // For regular form fields, get the form-group container
    field.classList.add("error");
    const formGroup = field.closest(".form-group");
    if (!formGroup) return;

    // Remove existing error message
    const existingError = formGroup.querySelector(".field-error");
    if (existingError) {
      existingError.remove();
    }

    // Add error message
    const errorDiv = document.createElement("div");
    errorDiv.className = "field-error";
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
  }

  // Clear form errors
  function clearFormErrors() {
    const errorFields = document.querySelectorAll(".error");
    const errorMessages = document.querySelectorAll(".field-error");

    errorFields.forEach((field) => field.classList.remove("error"));
    errorMessages.forEach((msg) => msg.remove());
  }

  // Clear individual field error
  function clearFieldError(field) {
    field.classList.remove("error");

    // Handle checkbox case
    if (
      field.type === "checkbox" ||
      field.parentNode.querySelector('input[type="checkbox"]')
    ) {
      field.parentNode.classList.remove("error");
      const errorMessage = field.parentNode.querySelector(".field-error");
      if (errorMessage) {
        errorMessage.remove();
      }
      return;
    }

    // For regular form fields, get the form-group container
    const formGroup = field.closest(".form-group");
    if (formGroup) {
      const errorMessage = formGroup.querySelector(".field-error");
      if (errorMessage) {
        errorMessage.remove();
      }
    }
  }

  // Show loading state
  function setLoadingState(isLoading) {
    const btnText = registerBtn.querySelector(".btn-text");
    const btnLoader = registerBtn.querySelector(".btn-loader");

    if (isLoading) {
      btnText.style.opacity = "0";
      btnLoader.style.display = "block";
      registerBtn.disabled = true;
    } else {
      btnText.style.opacity = "1";
      btnLoader.style.display = "none";
      registerBtn.disabled = false;
    }
  }

  // Show notification
  function showNotification(message, type = "error") {
    // Remove existing notification
    const existingNotification = document.querySelector(".auth-notification");
    if (existingNotification) {
      existingNotification.remove();
    }

    const notification = document.createElement("div");
    notification.className = `auth-notification ${type}`;
    notification.innerHTML = `
      <i class="fas ${
        type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
      }"></i>
      <span>${message}</span>
    `;

    const authCard = document.querySelector(".auth-card");
    authCard.insertBefore(notification, authCard.firstChild);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  // Handle form submission
  if (registerForm) {
    registerForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setLoadingState(true);

      try {
        // Normalize phone to digits/plus only for API uniqueness match
        const rawPhone = phoneInput.value.trim();
        const cleanPhone = rawPhone.replace(/[^\d+]/g, "");
        const formData = new FormData();
        formData.append("first_name", firstNameInput.value.trim());
        formData.append("last_name", lastNameInput.value.trim());
        formData.append("email", emailInput.value.trim());
        formData.append("phone", cleanPhone);
        formData.append("birth_date", birthDateInput.value);
        formData.append("password", passwordInput.value);
        formData.append("confirm_password", confirmPasswordInput.value);

        // Ensure CSRF cookie/header for Django
        let csrfToken = null;
        if (window.API && typeof window.API.getCsrfToken === "function") {
          csrfToken = await window.API.getCsrfToken();
        }
        const headers = csrfToken ? { "X-CSRFToken": csrfToken } : {};

        const response = await fetch(apiUrl(`/api/auth/register/`), {
          method: "POST",
          body: formData,
          credentials: "include",
          headers,
        });

        const data = await response.json();

        if (response.ok) {
          // Persist user and token if provided
          if (data.user) {
            localStorage.setItem("depod_user", JSON.stringify(data.user));
          }
          if (data.access_token) {
            localStorage.setItem("depod_access_token", data.access_token);
          }

          showNotification(
            "Qeydiyyat uğurla tamamlandı! Yönləndirilirsiz...",
            "success"
          );

          // Redirect to profile or login depending on token availability
          setTimeout(() => {
            if (localStorage.getItem("depod_access_token")) {
              window.location.href = "profile.html";
            } else {
              window.location.href = "login.html";
            }
          }, 1500);
        } else {
          // Handle API errors
          if (data.errors && typeof data.errors === "object") {
            // Map backend snake_case keys to input camelCase names
            const fieldMap = {
              first_name: "firstName",
              last_name: "lastName",
              birth_date: "birthDate",
              confirm_password: "confirmPassword",
              email: "email",
              phone: "phone",
              password: "password",
              non_field_errors: null,
            };
            let shownAny = false;
            for (const [key, messages] of Object.entries(data.errors)) {
              const nameKey = fieldMap[key] || key;
              let fieldElement = null;
              if (nameKey) {
                fieldElement =
                  document.querySelector(`[name="${nameKey}"]`) ||
                  document.getElementById(nameKey);
              }
              const msg =
                Array.isArray(messages) && messages.length > 0
                  ? messages[0]
                  : String(messages);
              if (fieldElement && msg) {
                showFieldError(fieldElement, msg);
                shownAny = true;
              }
            }
            if (!shownAny) {
              const fallback =
                data.message || data.error || "Qeydiyyat zamanı xəta baş verdi";
              showNotification(fallback);
            }
          } else {
            const errorMessage =
              data.message || data.error || "Qeydiyyat zamanı xəta baş verdi";
            showNotification(errorMessage);
          }
        }
      } catch (error) {
        console.error("Registration error:", error);
        showNotification("Şəbəkə xətası. Zəhmət olmasa yenidən cəhd edin.");
      } finally {
        setLoadingState(false);
      }
    });
  }

  // Real-time validation
  if (emailInput) {
    emailInput.addEventListener("blur", function () {
      const email = this.value.trim();
      if (email && !isValidEmail(email)) {
        showFieldError(this, "Düzgün email daxil edin");
      } else {
        clearFieldError(this);
      }
    });
  }

  if (phoneInput) {
    phoneInput.addEventListener("blur", function () {
      const phone = this.value.trim();
      if (phone && !isValidPhone(phone)) {
        showFieldError(
          this,
          "Düzgün telefon nömrəsi daxil edin (+994501234567)"
        );
      } else {
        clearFieldError(this);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      const password = this.value;
      if (password.length > 0 && password.length < 8) {
        showFieldError(this, "Parol ən azı 8 simvoldan ibarət olmalıdır");
      } else {
        clearFieldError(this);
      }

      // Also check confirm password if it has value
      if (
        confirmPasswordInput.value &&
        password !== confirmPasswordInput.value
      ) {
        showFieldError(confirmPasswordInput, "Parollar uyğun gəlmir");
      } else if (confirmPasswordInput.value) {
        clearFieldError(confirmPasswordInput);
      }
    });
  }

  if (confirmPasswordInput) {
    confirmPasswordInput.addEventListener("input", function () {
      const password = passwordInput.value;
      const confirmPassword = this.value;

      if (confirmPassword && password !== confirmPassword) {
        showFieldError(this, "Parollar uyğun gəlmir");
      } else {
        clearFieldError(this);
      }
    });
  }

  if (birthDateInput) {
    birthDateInput.addEventListener("change", function () {
      const birthDate = this.value;
      if (birthDate && !isValidBirthDate(birthDate)) {
        showFieldError(this, "Yaş 13-120 arasında olmalıdır");
      } else {
        clearFieldError(this);
      }
    });
  }

  // Check if user is already logged in
  function checkAuthStatus() {
    const userData = localStorage.getItem("depod_user");
    const accessToken = localStorage.getItem("depod_access_token");

    if (userData && accessToken) {
      // User is already logged in, redirect to profile
      window.location.href = "profile.html";
    }
  }

  // Check auth status on page load
  checkAuthStatus();
});

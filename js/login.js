// Login page functionality
document.addEventListener("DOMContentLoaded", function () {
  // API Base configuration
  const API_BASE =
    window.DEPOD_API_BASE ||
    (window.location.port === "8000" ? "" : "http://127.0.0.1:8000");

  // Form elements
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const passwordToggle = document.getElementById("passwordToggle");
  const rememberMeCheckbox = document.getElementById("rememberMe");
  const loginBtn = document.getElementById("loginBtn");

  // Password visibility toggle
  if (passwordToggle) {
    passwordToggle.addEventListener("click", function () {
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);

      const icon = passwordToggle.querySelector("i");
      if (type === "password") {
        icon.className = "fas fa-eye";
      } else {
        icon.className = "fas fa-eye-slash";
      }
    });
  }

  // Form validation
  function validateForm() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Clear previous error styles
    clearFormErrors();

    let isValid = true;

    // Username validation (email or phone)
    if (!username) {
      showFieldError(usernameInput, "Email və ya telefon nömrəsi tələb olunur");
      isValid = false;
    } else if (!isValidEmailOrPhone(username)) {
      showFieldError(
        usernameInput,
        "Düzgün email və ya telefon nömrəsi daxil edin"
      );
      isValid = false;
    }

    // Password validation
    if (!password) {
      showFieldError(passwordInput, "Parol tələb olunur");
      isValid = false;
    } else if (password.length < 6) {
      showFieldError(
        passwordInput,
        "Parol ən azı 6 simvoldan ibarət olmalıdır"
      );
      isValid = false;
    }

    return isValid;
  }

  // Email or phone validation
  function isValidEmailOrPhone(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?994[0-9]{9}$|^\+?[0-9]{10,15}$/;

    return emailRegex.test(value) || phoneRegex.test(value);
  }

  // Show field error
  function showFieldError(field, message) {
    field.classList.add("error");

    // For password field, get the form-group container
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

  // Show loading state
  function setLoadingState(isLoading) {
    const btnText = loginBtn.querySelector(".btn-text");
    const btnLoader = loginBtn.querySelector(".btn-loader");

    if (isLoading) {
      btnText.style.opacity = "0";
      btnLoader.style.display = "block";
      loginBtn.disabled = true;
    } else {
      btnText.style.opacity = "1";
      btnLoader.style.display = "none";
      loginBtn.disabled = false;
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
  if (loginForm) {
    loginForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setLoadingState(true);

      const username = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      try {
        const formData = new FormData();
        formData.append("username", username);
        formData.append("password", password);
        formData.append("remember_me", rememberMeCheckbox.checked);

        const response = await fetch(`${API_BASE}/api/auth/login/`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const data = await response.json();

        if (response.ok) {
          // Store user data in localStorage
          if (data.user) {
            localStorage.setItem("depod_user", JSON.stringify(data.user));
          }

          // Store access token if provided
          if (data.access_token) {
            localStorage.setItem("depod_access_token", data.access_token);
          }

          showNotification(
            "Uğurla daxil oldunuz! Yönləndirilirsiz...",
            "success"
          );

          // Redirect to profile or home page after 1.5 seconds
          setTimeout(() => {
            const redirectUrl =
              new URLSearchParams(window.location.search).get("redirect") ||
              "profile.html";
            window.location.href = redirectUrl;
          }, 1500);
        } else {
          // Handle API errors
          const errorMessage =
            data.message || data.error || "Giriş zamanı xəta baş verdi";
          showNotification(errorMessage);
        }
      } catch (error) {
        console.error("Login error:", error);
        showNotification("Şəbəkə xətası. Zəhmət olmasa yenidən cəhd edin.");
      } finally {
        setLoadingState(false);
      }
    });
  }

  // Real-time validation
  if (usernameInput) {
    usernameInput.addEventListener("blur", function () {
      const username = this.value.trim();
      if (username && !isValidEmailOrPhone(username)) {
        showFieldError(this, "Düzgün email və ya telefon nömrəsi daxil edin");
      } else {
        clearFieldError(this);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener("input", function () {
      if (this.value.length > 0 && this.value.length < 6) {
        showFieldError(this, "Parol ən azı 6 simvoldan ibarət olmalıdır");
      } else {
        clearFieldError(this);
      }
    });
  }

  // Clear individual field error
  function clearFieldError(field) {
    field.classList.remove("error");
    const formGroup = field.closest(".form-group");
    if (formGroup) {
      const errorMessage = formGroup.querySelector(".field-error");
      if (errorMessage) {
        errorMessage.remove();
      }
    }
  }

  // Check if user is already logged in
  function checkAuthStatus() {
    const userData = localStorage.getItem("depod_user");
    const accessToken = localStorage.getItem("depod_access_token");

    if (userData && accessToken) {
      // User is already logged in, redirect to profile
      const redirectUrl =
        new URLSearchParams(window.location.search).get("redirect") ||
        "profile.html";
      window.location.href = redirectUrl;
    }
  }

  // Check auth status on page load
  checkAuthStatus();
});

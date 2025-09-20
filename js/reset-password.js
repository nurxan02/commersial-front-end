// Reset password page
(function () {
  function qs(sel) {
    return document.querySelector(sel);
  }
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function showNotification(message, type = "error") {
    const existing = document.querySelector(".auth-notification");
    if (existing) existing.remove();
    const div = document.createElement("div");
    div.className = `auth-notification ${type}`;
    div.innerHTML = `<i class="fas ${
      type === "success" ? "fa-check-circle" : "fa-exclamation-circle"
    }"></i><span>${message}</span>`;
    const card = document.querySelector(".auth-card");
    card.insertBefore(div, card.firstChild);
    setTimeout(() => div.remove(), 5000);
  }

  function toggleVisibility(buttonId, inputId) {
    const btn = qs(buttonId);
    const input = qs(inputId);
    if (!btn || !input) return;
    btn.addEventListener("click", function () {
      const type =
        input.getAttribute("type") === "password" ? "text" : "password";
      input.setAttribute("type", type);
      const icon = btn.querySelector("i");
      icon.className = type === "password" ? "fas fa-eye" : "fas fa-eye-slash";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = qs("#resetPasswordForm");
    const newPassword = qs("#newPassword");
    const confirmNewPassword = qs("#confirmNewPassword");
    const resetBtn = qs("#resetBtn");

    toggleVisibility("#newPasswordToggle", "#newPassword");
    toggleVisibility("#confirmNewPasswordToggle", "#confirmNewPassword");

    function setLoading(isLoading) {
      const btnText = resetBtn.querySelector(".btn-text");
      const loader = resetBtn.querySelector(".btn-loader");
      if (isLoading) {
        btnText.style.opacity = "0";
        loader.style.display = "block";
        resetBtn.disabled = true;
      } else {
        btnText.style.opacity = "1";
        loader.style.display = "none";
        resetBtn.disabled = false;
      }
    }

    function validate() {
      const p1 = newPassword.value.trim();
      const p2 = confirmNewPassword.value.trim();
      if (p1.length < 8) {
        showNotification("Yeni parol ən azı 8 simvoldan ibarət olmalıdır");
        return false;
      }
      if (p1 !== p2) {
        showNotification("Yeni parollar uyğun gəlmir");
        return false;
      }
      return true;
    }

    if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!validate()) return;
        const uid = getQueryParam("uid");
        const token = getQueryParam("token");
        if (!uid || !token) {
          showNotification("Keçərsiz və ya müddəti bitmiş keçid");
          return;
        }
        setLoading(true);
        try {
          let csrfToken = null;
          if (window.API && typeof window.API.getCsrfToken === "function") {
            csrfToken = await window.API.getCsrfToken();
          }
          const resp = await fetch(
            window.API?._url?.("/api/auth/password-reset/confirm/") ||
              "/api/auth/password-reset/confirm/",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
              },
              credentials: "include",
              body: JSON.stringify({
                uid,
                token,
                new_password: newPassword.value.trim(),
              }),
            }
          );
          const data = await resp.json().catch(() => ({}));
          if (resp.ok) {
            showNotification(
              "Parol uğurla yeniləndi. Giriş səhifəsinə yönləndirilirsiniz...",
              "success"
            );
            setTimeout(() => {
              window.location.href = "login.html";
            }, 1500);
          } else {
            const msg =
              data?.message ||
              Object.values(data?.errors || {})[0]?.[0] ||
              "Xəta baş verdi";
            showNotification(msg);
          }
        } catch (err) {
          console.error(err);
          showNotification("Şəbəkə xətası. Zəhmət olmasa yenidən cəhd edin.");
        } finally {
          setLoading(false);
        }
      });
    }
  });
})();

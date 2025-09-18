// Order Failure Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Get error details from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const errorCode = urlParams.get("error");
  const errorMessage = urlParams.get("message");
  const orderId = urlParams.get("orderId");

  // Display error details
  displayErrorDetails(errorCode, errorMessage, orderId);

  // Set up retry button
  setupRetryButton();
});

function displayErrorDetails(errorCode, errorMessage, orderId) {
  const errorDetailsContainer = document.getElementById("errorDetails");

  let errorDisplay = "";

  if (errorCode || errorMessage) {
    errorDisplay = `
            <div class="error-summary">
                <h3>Xəta Detalları</h3>
                ${
                  errorCode
                    ? `
                    <div class="detail-row">
                        <span class="label">Xəta Kodu:</span>
                        <span class="value">${errorCode}</span>
                    </div>
                `
                    : ""
                }
                ${
                  errorMessage
                    ? `
                    <div class="detail-row">
                        <span class="label">Xəta Mesajı:</span>
                        <span class="value">${decodeURIComponent(
                          errorMessage
                        )}</span>
                    </div>
                `
                    : ""
                }
                ${
                  orderId
                    ? `
                    <div class="detail-row">
                        <span class="label">Sifariş Nömrəsi:</span>
                        <span class="value">#${orderId}</span>
                    </div>
                `
                    : ""
                }
            </div>
        `;
  } else {
    errorDisplay = `
            <div class="error-summary">
                <div class="common-issues">
                    <h3>Ümumi Səbəblər</h3>
                    <ul>
                        <li>Kart məlumatlarında xəta</li>
                        <li>Kifayət qədər balans yoxdur</li>
                        <li>Bank tərəfindən əməliyyat rədd edilib</li>
                        <li>İnternet bağlantısında problem</li>
                    </ul>
                </div>
            </div>
        `;
  }

  errorDetailsContainer.innerHTML = errorDisplay;
}

function setupRetryButton() {
  const retryBtn = document.getElementById("retryPaymentBtn");

  retryBtn.addEventListener("click", function () {
    // Get the last attempted order from localStorage or URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("productId");
    const quantity = urlParams.get("quantity") || 1;

    if (productId) {
      // Redirect back to product detail page to retry
      window.location.href = `product-detail.html?id=${productId}`;
    } else {
      // If no product info, redirect to products page
      window.location.href = "products.html";
    }
  });
}

// Handle payment retry with saved order info
function retryPayment() {
  // This function can be called from external payment systems
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orderId");

  if (orderId) {
    // Get order details and retry payment
    const orders = JSON.parse(localStorage.getItem("depod_orders") || "[]");
    const order = orders.find((o) => o.id === orderId);

    if (order) {
      // Redirect to payment with order details
      const paymentUrl = buildPaymentUrl(order);
      window.location.href = paymentUrl;
    }
  }
}

function buildPaymentUrl(order) {
  // Build payment URL for odero.az or other payment provider
  // This would typically include order details and callback URLs
  return `payment.html?orderId=${order.id}&amount=${order.totalPrice}&productId=${order.productId}`;
}

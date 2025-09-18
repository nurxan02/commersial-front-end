// Order Success Page JavaScript

document.addEventListener("DOMContentLoaded", function () {
  // Get order details from URL parameters or localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get("orderId");
  const status = urlParams.get("status");

  // Display order details
  displayOrderDetails(orderId);

  // Start countdown and redirect after 5 seconds
  startRedirectCountdown();
});

function displayOrderDetails(orderId) {
  const orderDetailsContainer = document.getElementById("orderDetails");

  if (orderId) {
    // Get order from localStorage
    const orders = JSON.parse(localStorage.getItem("depod_orders") || "[]");
    const order = orders.find((o) => o.id === orderId);

    if (order) {
      // Update order status to confirmed
      order.status = "confirmed";
      order.confirmedAt = new Date().toISOString();

      // Save updated orders
      localStorage.setItem("depod_orders", JSON.stringify(orders));

      orderDetailsContainer.innerHTML = `
                <div class="order-summary">
                    <div class="order-info">
                        <h3>Sifariş Detalları</h3>
                        <div class="detail-row">
                            <span class="label">Sifariş Nömrəsi:</span>
                            <span class="value">#${order.id}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Məhsul:</span>
                            <span class="value">${order.productName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Miqdar:</span>
                            <span class="value">${order.quantity} ədəd</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Ümumi Məbləğ:</span>
                            <span class="value">${order.totalPrice.toFixed(
                              2
                            )} ₼</span>
                        </div>
                        <div class="detail-row">
                            <span class="label">Təxmini Çatdırılma:</span>
                            <span class="value">${formatDate(
                              order.estimatedDelivery
                            )}</span>
                        </div>
                    </div>
                    <div class="order-status">
                        <div class="status-badge confirmed">
                            <i class="fas fa-check"></i>
                            Təsdiqləndi
                        </div>
                    </div>
                </div>
            `;

      // Update notifications
      updateOrderNotifications();
    }
  } else {
    orderDetailsContainer.innerHTML = `
            <div class="order-summary">
                <p class="general-success">Sifarişiniz uğurla qeydə alındı və tezliklə emal olunacaq.</p>
            </div>
        `;
  }
}

function startRedirectCountdown() {
  let countdown = 5;
  const redirectMessage = document.querySelector(".redirect-message");

  const countdownInterval = setInterval(() => {
    countdown--;
    redirectMessage.innerHTML = `
            <i class="fas fa-clock"></i>
            ${countdown} saniyə sonra sifarişlərim bölməsinə yönləndiriləcəksiniz...
        `;

    if (countdown <= 0) {
      clearInterval(countdownInterval);
      window.location.href = "profile.html?tab=orders";
    }
  }, 1000);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("az-AZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Update order notifications (imported from main.js functionality)
function updateOrderNotifications() {
  if (typeof window.updateOrderNotifications === "function") {
    window.updateOrderNotifications();
  }
}

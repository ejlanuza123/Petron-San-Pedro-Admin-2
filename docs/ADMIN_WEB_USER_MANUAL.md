# Admin Web User Manual — Petron San Pedro Platform

Welcome to the Admin Web User Manual for the **Petron San Pedro Platform**. This guide provides step-by-step instructions for managing orders, products, fleet riders, customers, and real-time operational alerts effectively.

---

## 1. Before You Start

- Use a modern desktop browser (Google Chrome, Microsoft Edge, Brave, or Mozilla Firefox).
- Ensure a stable internet connection.
- Prepare your Admin credentials.
- **Tip**: After signing in, click anywhere on the page once to enable Web Audio API sound for real-time order chime alerts.

---

## 2. Log In

1. Open the Admin Web Portal.
2. Enter your Admin Email and Password.
3. Click **Sign In**.
4. Wait for the Executive Dashboard to load.

---

## 3. Executive Dashboard & Real-Time Alerts

### A. Real-Time Audio Bell Chime 🔔 & Floating Order Banners
- **Live Sound Chime**: Whenever a customer places a new order, the web app plays an ascending dual-tone chime bell (`587 Hz ➔ 880 Hz`).
- **Floating Banner**: A notification banner appears in the top-right corner displaying:
  - Order Number & Store Branch
  - Total Amount (`₱X.XX`) and Customer Delivery Address
  - **"View Order ↗"** button to jump directly to order details.
  - **"Dismiss ✕"** button to clear the alert card.
- **Mute / Unmute Bell**: Click the volume icon (`🔔/🔕`) in the banner header or top navigation bar to mute or unmute the audio bell chime anytime.

### B. Executive Dashboard KPIs & Metrics
1. **Period Revenue**: Total sales revenue for selected date window (`Today`, `Last 7 Days`, `Last 30 Days`, `This Month`).
2. **Completed Orders**: Count of delivered and fulfilled orders versus pending/processing orders.
3. **Active Fleet Count**: Shows real-time count of online & available riders (`🟢 Online & Available` vs `⚪ All Riders Offline`).
4. **Revenue & Order Volume Trend Chart**: Interactive SVG visual chart comparing revenue and order volume.
5. **Top Riders Leaderboard**: Ranking of top-performing riders by completed deliveries, completion rate %, and star rating.
6. **Customer Feedback Feed**: Latest customer reviews and ratings for products and riders.

---

## 4. Order Management & Live Fleet Map

### A. Process & Assign New Orders
1. Open **Orders**.
2. Filter orders by status (`Pending`, `Processing`, `Assigned`, `Out for Delivery`, `Completed`).
3. Click an order to view customer items, special instructions, and delivery address.
4. Click **Assign Rider** and choose an available rider from the list.

### B. Live Fleet Map 🗺️
1. Open **Live Fleet Map** tab on Orders.
2. Default Hub Location: **Petron San Pedro Station** (`9.7533882, 118.745289`).
3. View store hub pin (`🏬`), live rider positions (`🛵`), and active customer delivery destinations (`📍`).

### C. Cancel an Order
1. Open the target order details.
2. Click **Cancel Order**.
3. Select a cancellation reason (e.g., Customer request, Unreachable, Out of stock).
4. Add optional administrator notes and confirm.

---

## 5. Rider Management & Fleet Status

1. Open **Riders**.
2. **3-Tier Duty Status Indicators**:
   - 🟡 **On Delivery**: Rider is actively on an in-progress delivery route.
   - 🟢 **On Duty**: Rider is online, active, and available for assignment.
   - ⚪ **Offline**: Rider is logged out with no active deliveries.
3. **Account Activation**: Toggle rider status (`Activate` / `Deactivate`) to suspend or enable rider access.
4. **Create Rider Account**: Click **Add Rider** to create official credentials for new riders.
5. **Rider Payout Tracker**: View completed deliveries count, gross earnings, and toggle settlement status (`Mark Settled` / `Mark Pending`).

---

## 6. Products & Inventory Management

### A. Add / Update Products
1. Open **Products**.
2. Click **Add Product** or **Edit** on an existing item.
3. Enter Product Name, Category (`Fuel`, `Motor Oil`, `Engine Oil`), Price (`₱`), Stock Quantity, Unit (`L`, `pc`, `can`), and upload a product image.
4. Click **Save**.

### B. Low-Stock Inventory Alerts
- Products with stock quantity below threshold appear highlighted in amber on the Dashboard **Inventory Alerts** widget with a **"Restock"** shortcut.

---

## 7. Customer Reviews & Ratings

1. Open **Customer Reviews**.
2. View star ratings and written feedback submitted by customers for products and riders.
3. **Admin Reply**: Click **Reply** on any review to post an official response to the customer.

---

## 8. Settings & System Administration

1. Click **Settings** in sidebar.
2. Configure Default Delivery Fee (`₱`), Store Address, Operating Hours, and Auto-Dispatch rules.
3. Save changes.

---

## 9. Quick Troubleshooting

- **No Sound when New Orders Arrive**: Click anywhere on the webpage once to allow browser Web Audio API playback, or ensure the bell icon (`🔔`) is not muted.
- **Rider Status Shows Incorrectly**: Ensure the rider has completed or cancelled their active order, or tap **Refresh** (`↻`) on Rider Management.
- **Real-Time Data Interrupted**: Check internet connectivity or refresh browser page (`F5`).

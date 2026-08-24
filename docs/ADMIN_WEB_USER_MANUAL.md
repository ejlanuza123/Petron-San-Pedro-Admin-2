# Admin Web User Manual — Petron San Pedro Platform

Welcome to the Admin Web User Manual for the **Petron San Pedro Platform**. This guide provides comprehensive, step-by-step instructions for managing orders, store operational status, auto-dispatch, products, fleet riders, customers, and real-time operational alerts.

---

## 1. Before You Start

- **Supported Browsers**: Google Chrome, Microsoft Edge, Brave, or Mozilla Firefox (latest versions recommended).
- **Network**: Broadband or 4G/5G connection.
- **Audio Permission**: Click anywhere on the webpage once after logging in to enable Web Audio API sound alerts for incoming orders.
- **Credentials**: Use your authorized Admin or Superadmin account.

---

## 2. Log In & Session Management

1. Navigate to the Admin Web Portal URL.
2. Enter your registered Admin Email and Password.
3. Click **Sign In**.
4. The system will authenticate your role and load the **Executive Dashboard**.
5. **Password Recovery**: If you forget your password, click **Forgot Password?** to receive a secure recovery link.

---

## 3. Executive Dashboard & Zero-Refresh Real-Time Alerts

### A. Real-Time Audio Bell Chime 🔔 & Floating Order Banners
- **Synthesizer Chime**: When a customer places an order, the system plays an ascending dual-tone chime (`587 Hz ➔ 880 Hz`).
- **Floating Banner Alert ([`OrderAlertBanner`](file:///c:/Projects/admin-web/src/components/OrderAlertBanner.jsx))**:
  - Appears immediately in the top-right corner with order number (e.g. `#24`), total amount (`₱X.XX`), and customer address.
  - Click **"View Order"** to open the order modal and dispatch immediately.
  - Click **"Dismiss ✕"** to close the alert card.
- **Mute / Unmute Bell**: Click the volume icon (`🔔/🔕`) in the top navigation bar or alert banner to toggle audio chime alerts.
- **Notification Dropdown ([`NotificationContext`](file:///c:/Projects/admin-web/src/context/NotificationContext.jsx))**:
  - Top bar bell icon displays live unread count badges.
  - Click to view notification history, click individual items to mark as read, or click **"Mark all as read"**.

### B. Executive Dashboard KPIs & Metrics
1. **Period Sales Revenue**: Live revenue totals for `Today`, `Last 7 Days`, `Last 30 Days`, or `This Month`.
2. **Order Volume & Fulfillment**: Real-time breakdown of `Pending`, `Processing`, `Out for Delivery`, and `Completed` orders.
3. **Active Fleet Count**: Live count of online and available riders (`🟢 On Duty`, `🟡 On Delivery`, `⚪ Offline`).
4. **Revenue Trend Chart**: Interactive SVG visual chart comparing revenue trends and volume over time.
5. **Top Riders Leaderboard**: Rankings by completed deliveries, completion percentage, and customer star rating.
6. **Customer Feedback Feed**: Real-time stream of latest customer reviews and star ratings.

---

## 4. Store Status & Emergency / Holiday / Maintenance Mode

Manage station open/closed states and customer announcements with instant real-time sync to all customer mobile apps:

1. Open **Settings** in the sidebar.
2. Scroll to the **Store Status & Holiday / Emergency Mode** panel.
3. **Select Operational Mode**:
   - 🟢 **Normal Operations (Open)**: Store is fully active; customers can place instant delivery orders.
   - 🔴 **Emergency Pause**: Temporarily halt deliveries during severe weather (typhoon, heavy rain) or unexpected station emergencies.
   - 🟡 **Holiday Mode**: Announce special holiday schedules, reduced operating hours, or seasonal advisories.
   - 🔵 **Scheduled Maintenance**: Announce system upgrades or scheduled station downtime.
4. **Preset Announcements & Custom Messages**:
   - Choose a quick preset (e.g. *Severe Tropical Storm Advisory*, *National Holiday Schedule*, *System Upgrades*) or enter a custom **Announcement Title** and **Customer Notice Details**.
5. **Scheduled Auto-Reopen Countdown**:
   - Use quick presets (`+2 Hours`, `+4 Hours`, `Tomorrow 8:00 AM`) or select a custom date/time.
   - Toggle **Auto-Reopen when Timer Expires** to automatically restore normal operations when the countdown finishes.
6. **Allow Scheduled Pre-Orders**:
   - If enabled, customers can still browse and submit scheduled pre-orders for when the station reopens.
   - If disabled, the mobile app activates a full-screen **Maintenance Lock** with a live countdown timer.
7. Click **Save Changes**. The update broadcasts instantly to all active mobile apps (< 100ms).

---

## 5. Automated Smart Dispatch Engine

Automate order assignments to eliminate dispatch bottlenecks:

1. Open **Settings** ➔ **Auto-Dispatch Configuration**.
2. **Toggle Auto-Dispatch**: Switch ON to enable automatic rider assignment upon incoming orders.
3. **Configure Dispatch Rules**:
   - **Dispatch Strategy**: Choose `Nearest Rider` (proximity-based), `Balanced Workload` (spreads orders evenly), or `Round-Robin`.
   - **Max Active Orders per Rider**: Cap concurrent active deliveries (e.g., 2 to 4 orders) to prevent rider overload.
   - **Search Radius (km)**: Maximum distance around the station hub to search for available riders (default: 10 km).
   - **Assignment Timeout (mins)**: Countdown time for a rider to accept before the system automatically reassigns the delivery to another rider.
4. Click **Save Settings**.

---

## 6. Order Management & Live Fleet Dispatch

### A. Order Pipeline & Processing
1. Open **Orders** in sidebar.
2. Filter by status: `All`, `Pending`, `Processing`, `Out for Delivery`, `Completed`, `Cancelled`.
3. Click any order row to view:
   - Order Number (`#24`), Customer Name, Phone Number, and Delivery Address.
   - Ordered items, quantities, and price breakdown.
   - Special instructions and customer delivery notes.
4. **Update Status**: Advance the order status (`Accept / Process` ➔ `Assign Rider` ➔ `Out for Delivery` ➔ `Completed`).

### B. Manual Rider Assignment
1. On a pending or processing order, click **Assign Rider**.
2. Review available online riders sorted by active workload and proximity.
3. Select the rider and click **Confirm Assignment**.

### C. Live Fleet Map Hub 🗺️
1. Click the **Live Fleet Map** tab on Orders.
2. Station Hub Location: **Petron San Pedro Station** (`9.7533882, 118.745289`).
3. View store hub pin (`🏬`), live rider GPS positions (`🛵`), and active customer delivery drop-off pins (`📍`).

### D. Digital E-Invoice & PDF Receipt Generation
1. In the Order Details modal, click **"Print / Download Invoice"**.
2. Generates an official formatted PDF invoice (`Order-#24.pdf`) with complete line items, tax breakdown, and station details.

### E. Order Cancellation
1. Open order details and click **Cancel Order**.
2. Choose a cancellation reason (*Customer Request*, *Item Out of Stock*, *Unreachable Address*, *Other*).
3. Add optional administrative notes and confirm.

---

## 7. Rider Management & Fleet Monitoring

1. Open **Riders** in sidebar.
2. **3-Tier Fleet Duty Status**:
   - 🟡 **On Delivery**: Rider is currently en route on an active assignment.
   - 🟢 **On Duty**: Rider is online, active, and available for new orders.
   - ⚪ **Offline**: Rider is logged out or off shift.
3. **Create Rider Accounts**: Click **Add Rider** to create official credentials for delivery personnel.
4. **Account Control**: Toggle **Active / Suspended** to manage rider access permissions.
5. **Rider Payout & Settlement**: View total completed deliveries, calculated earnings/tips, and toggle settlement status (`Mark Settled` / `Mark Pending`).

---

## 8. Products & Inventory Management

1. Open **Products** in sidebar.
2. **Add / Edit Products**:
   - Enter Product Name, Category (`Fuel`, `Lubricants`, `Engine Oil`, `Accessories`).
   - Set Price (`₱`), Stock Quantity, Unit (`Liters`, `Cans`, `Pcs`), and upload high-res images.
3. **Low-Stock Alert Threshold**:
   - Set threshold in Settings (default: 10 units).
   - Products falling below threshold are highlighted with amber alerts and instant **Restock** shortcuts.

---

## 9. Sales Heatmap & Reports Export Suite

1. Open **Sales Heatmap**:
   - Visualizes customer delivery density across Puerto Princesa / San Pedro barangays.
   - Identify peak sales zones and high-demand delivery corridors.
2. Open **Reports**:
   - Select date range (`Today`, `This Week`, `This Month`, `Custom Range`).
   - Filter by payment method (`Cash on Delivery`, `GCash`).
   - **Export to Excel (`.xlsx`)**: 1-click download of full transactional data for accounting and auditing.
   - **Export to CSV**: Raw data export for external spreadsheet analysis.

---

## 10. Customer Reviews & Reputation Moderation

1. Open **Customer Reviews** in sidebar.
2. View 1 to 5-star ratings ⭐ and customer comments for products and riders.
3. **Admin Reply**: Click **Reply** to post an official store response visible in the customer's app.

---

## 11. Quick Troubleshooting & FAQ

- **Real-time sound chime not playing**: Click anywhere on the browser window once to allow Web Audio API autoplay, or check if the top bar volume icon (`🔔`) is unmuted.
- **Order counter badge shows unread items**: Click the Bell icon and select **"Mark all as read"** to clear all past notifications.
- **Rider location not updating**: Ensure the rider has enabled GPS Location Services on their mobile device and has the app open in the foreground/background.
- **Store pause not reflecting on mobile**: Ensure you clicked **Save Changes** in Settings and that your internet connection is active.

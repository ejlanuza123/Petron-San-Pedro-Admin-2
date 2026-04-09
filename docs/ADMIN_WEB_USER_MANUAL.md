# Admin Web User Manual

This manual is for the deployed Admin Web Dashboard used by operations staff to manage the live Petron San Pedro delivery system. It is written for day-to-day use in production.

## 1. Purpose

The Admin Web Dashboard is the control panel for the delivery business. From this app, an admin can:

- Review live orders and delivery progress.
- Assign riders and monitor rider movement.
- Update order status, cancel orders, and review delivery proof.
- Manage products, stock levels, and pricing.
- View customer records and rider records.
- Read analytics, reports, and audit logs.
- Change operational settings such as the default delivery fee.

## 2. Access Requirements

- Use a supported modern browser on desktop or laptop.
- Sign in with an admin account that has production access.
- Keep browser notifications enabled if you want real-time alerts.
- Stay online while working; the dashboard is designed for live operational use.

## 3. Signing In

1. Open the deployed admin web app.
2. Enter your email and password.
3. Select sign in.
4. Wait for the dashboard to load.
5. If you are signed out or inactive for too long, sign in again.

## 4. Dashboard Overview

The dashboard is the starting page after sign-in. It gives a quick operational snapshot such as:

- Total orders and recent activity.
- Active or pending deliveries.
- Low-stock product alerts.
- High-level sales or order trends.

Use this page to see whether the store is busy, whether riders are active, and whether stock needs attention.

## 5. Orders

The Orders page is the main command center for live fulfillment.

### What You Can Do

- Search orders by customer, order number, or related details.
- Filter orders by status.
- Open an order to view its details.
- Assign a rider to an order.
- Update order status as the delivery progresses.
- Cancel an order when needed.
- Review delivery metadata and proof information.
- Open tracking details for active deliveries.

### Typical Order Flow

1. Open Orders.
2. Find the order using search or filters.
3. Review the order details and customer information.
4. Assign an available rider if the order has not been assigned yet.
5. Update the status as the order moves through the workflow.
6. If the order is cancelled, record the cancellation reason and note.
7. For completed orders, confirm that delivery proof exists before marking it finished.

### Status Handling

The dashboard follows the live order lifecycle used by the system. In practice, you will see statuses move through stages such as pending, accepted, picked up, out for delivery, delivered, and cancelled.

### Delivery Tracking

The Orders page can show delivery information tied to the selected order. Use this when you need to check whether the rider is assigned, in transit, or completed.

## 6. Products

The Products page is used to manage the catalog shown to customers.

### What You Can Do

- Add new products.
- Edit product details.
- Delete products that are no longer sold.
- Search products quickly.
- Filter by category.
- Review stock levels and low-stock conditions.
- View product details and images.

### Product Management Tips

- Keep product names and units consistent.
- Update prices immediately when there is a change in cost.
- Watch the low-stock indicators so unavailable items do not remain orderable.
- Review product images and replace broken or outdated ones.

## 7. Customers

The Customers page shows customer records and related activity.

### What You Can Do

- Search for a customer by name or other identifying information.
- Open a customer profile for details.
- Review order history and spending information.
- Edit customer profile data when operationally needed.
- Check recent activity and usage patterns.

Use this page for support questions, account review, and customer history checks.

## 8. Riders

The Riders page is used to manage the rider workforce.

### What You Can Do

- Review rider status and availability.
- See which riders are active.
- Inspect rider performance and delivery activity.
- Assign riders to orders from the live order workflow.
- Review rider details when investigating delays or delivery issues.

### Operational Use

Use rider management to keep deliveries moving. If a rider is unavailable, choose another active rider before the order stalls.

## 9. Reports

The Reports page is for summary and analysis.

### Common Uses

- Review sales performance.
- Check order counts and delivery trends.
- Compare activity by period.
- Export or review reporting data for planning.

Use reports for operational review rather than live dispatching.

## 10. Audit Logs

Audit Logs record important administrative actions.

### What You Can Do

- Filter by entity type.
- Search by entity ID.
- Narrow results by date range.
- Review what action was taken and when.

Audit logs are the best place to verify who changed a record and when the change happened.

## 11. Settings

The Settings page is used for operational configuration.

### Common Settings

- Default delivery fee.
- Other live configuration values used by the app.

When you change settings, make sure the new value is intended for production use.

## 12. Notifications

The admin app supports live notifications.

- Use the notification bell to review new events.
- Allow browser notification permission when prompted.
- Refresh or retry the page if the real-time feed temporarily disconnects.

Notifications are most useful for new orders, delivery updates, and low-stock alerts.

## 13. Session and Security Behavior

- The app uses protected routes, so unauthenticated users are redirected to sign in.
- Sessions can time out after inactivity.
- Sensitive actions should only be performed by authorized staff.
- Leave the browser open only on trusted devices.

## 14. Recommended Daily Workflow

1. Sign in and check the dashboard.
2. Review new orders and active deliveries.
3. Assign riders where needed.
4. Watch for low stock and update products if required.
5. Check reports and audit logs during shift handover.
6. Adjust settings only when a production change is approved.

## 15. Common Issues

### I cannot sign in

- Confirm your credentials.
- Check whether your account is active and assigned the correct role.
- Try again after refreshing the browser.

### Data is not updating

- Confirm that you are online.
- Refresh the page.
- Check whether browser permissions or a temporary connection issue is blocking live updates.

### Notifications are missing

- Confirm that browser notifications are allowed.
- Make sure the tab is still connected to the live session.

### An order cannot be completed

- Check whether the delivery proof exists.
- Verify that the status change follows the expected workflow.
- Confirm the rider assignment and delivery record are correct.

## 16. When to Escalate

Escalate to the system administrator if you see:

- Repeated authentication failures.
- Missing or inconsistent order data.
- Incorrect stock changes.
- A delivery that will not progress through the normal workflow.
- Any action that does not match the live production rules.

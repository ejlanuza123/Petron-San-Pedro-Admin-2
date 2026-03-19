-- Safe migration to ensure one delivery record per order
-- 1) Remove duplicate deliveries keeping the earliest (lowest id) per order
WITH duplicates AS (
  SELECT id, row_number() OVER (PARTITION BY order_id ORDER BY id) AS rn
  FROM deliveries
)
DELETE FROM deliveries
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 2) Add a unique index on order_id to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_order_id ON deliveries(order_id);

-- Note:
-- - Run this migration during a maintenance window (it may lock the table briefly).
-- - If your app or other services are inserting duplicates, update them to use UPDATE/UPSERT on order_id.
-- - Test on a staging copy before applying to production.

Why duplicates happen

If different clients (admin UI, rider app, serverless functions) insert into `deliveries` without checking for an existing `order_id`, you can end up with multiple deliveries for the same order. To prevent this, prefer updating the existing delivery or using an UPSERT keyed on `order_id`.

Recommended approaches

1) Supabase JS Upsert (preferred when using the JS client)

```js
// Upsert (insert or update) using order_id as conflict target
const { data, error } = await supabase
  .from('deliveries')
  .upsert(
    {
      order_id: orderId,
      rider_id: riderId,
      status: 'accepted',
      accepted_at: new Date().toISOString()
    },
    { onConflict: 'order_id' }
  )
  .select()
  .single();

// Handle data/error as usual
```

2) Safe read-then-update (works everywhere)

```js
// 1) find existing
const { data: existing } = await supabase
  .from('deliveries')
  .select('*')
  .eq('order_id', orderId)
  .limit(1)
  .maybeSingle();

if (existing) {
  // update it
  await supabase.from('deliveries').update({ status: 'accepted', rider_id: riderId, accepted_at: new Date().toISOString() }).eq('id', existing.id);
} else {
  // insert
  await supabase.from('deliveries').insert({ order_id: orderId, rider_id: riderId, status: 'accepted', accepted_at: new Date().toISOString() });
}
```

3) SQL-level constraint (already added in migration)

- The migration `db/migrations/001_unique_deliveries_order_id.sql` removes existing duplicates and adds a unique index on `order_id`.
- If duplicates still appear, the unique index will cause inserts to fail; handle that by switching to upsert or update logic.

Notes & checklist

- Run the migration on a staging DB first.
- After migration, change any code paths that currently `INSERT` new deliveries (rider accept flow, worker jobs) to use upsert or update.
- Consider adding monitoring or webhooks to detect any failed inserts due to the unique index so you can investigate callers that still try to create duplicates.

# Ankita ExpoVerse Database Schema

## Core entities

- `users`
  - `id`
  - `name`
  - `email`
  - `phone`
  - `role`
  - `avatar`
  - `created_at`

- `vendors`
  - `id`
  - `user_id -> users.id`
  - `business_name`
  - `display_name`
  - `status`
  - `commission_rate`
  - `created_at`

- `exhibitions`
  - `id`
  - `title`
  - `description`
  - `start_date`
  - `end_date`
  - `status`

- `stalls`
  - `id`
  - `exhibition_id -> exhibitions.id`
  - `vendor_id -> vendors.id`
  - `name`
  - `category`
  - `map_x`
  - `map_y`
  - `width`
  - `height`
  - `is_featured`
  - `status`

- `products`
  - `id`
  - `vendor_id -> vendors.id`
  - `stall_id -> stalls.id`
  - `title`
  - `description`
  - `price`
  - `compare_at_price`
  - `images`
  - `stock`
  - `status`

- `carts`
  - `id`
  - `user_id -> users.id`
  - `created_at`

- `cart_items`
  - `id`
  - `cart_id -> carts.id`
  - `product_id -> products.id`
  - `quantity`
  - `created_at`

- `orders`
  - `id`
  - `user_id -> users.id`
  - `total_amount`
  - `discount_amount`
  - `payment_status`
  - `order_status`
  - `created_at`

- `order_items`
  - `id`
  - `order_id -> orders.id`
  - `vendor_id -> vendors.id`
  - `product_id -> products.id`
  - `quantity`
  - `unit_price`
  - `total_price`

- `payments`
  - `id`
  - `order_id -> orders.id`
  - `provider`
  - `provider_payment_id`
  - `amount`
  - `status`
  - `created_at`

- `live_sessions`
  - `id`
  - `stall_id -> stalls.id`
  - `vendor_id -> vendors.id`
  - `livekit_room_name`
  - `status`
  - `pinned_product_id -> products.id`
  - `viewer_count`
  - `started_at`
  - `ended_at`

- `stall_visits`
  - `id`
  - `user_id -> users.id`
  - `stall_id -> stalls.id`
  - `entered_at`
  - `left_at`

## MVP relationship summary

- One exhibition contains many stalls.
- One vendor owns one or more stalls.
- One stall contains many products.
- One live session belongs to one stall and one vendor.
- One order contains one or more order items.
- Cart and order items are the bridge between product discovery and checkout conversion.

import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const evModels = pgTable(
  "ev_models",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    variant: text("variant"),
    bodyType: text("body_type").notNull(),
    releaseDate: date("release_date"),
    priceMin: numeric("price_min", { precision: 10, scale: 2 }),
    priceMax: numeric("price_max", { precision: 10, scale: 2 }),
    marketPosition: text("market_position"),
    powerType: text("power_type").notNull(),
    rangeKm: integer("range_km"),
    batteryCapacityKwh: numeric("battery_capacity_kwh", { precision: 6, scale: 2 }),
    autonomousLevel: text("autonomous_level"),
    driverAssistFeatures: jsonb("driver_assist_features"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    image: text("image"),
  },
  (table) => [
    index("idx_ev_models_brand").on(table.brand),
    index("idx_ev_models_body_type").on(table.bodyType),
    index("idx_ev_models_power_type").on(table.powerType),
    unique("uq_brand_model_variant").on(table.brand, table.model, table.variant),
    check(
      "ck_battery_nonneg",
      sql`${table.batteryCapacityKwh} is null or ${table.batteryCapacityKwh} >= 0`
    ),
    check(
      "ck_price_nonneg",
      sql`(${table.priceMin} is null or ${table.priceMin} >= 0) and (${table.priceMax} is null or ${table.priceMax} >= 0)`
    ),
    check(
      "ck_price_range",
      sql`${table.priceMin} is null or ${table.priceMax} is null or ${table.priceMax} >= ${table.priceMin}`
    ),
    check("ck_range_nonneg", sql`${table.rangeKm} is null or ${table.rangeKm} >= 0`),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    reason: text("reason"),
    id: uuid("id").notNull(),
  },
  (table) => [
    primaryKey({
      name: "favorites_pkey",
      columns: [table.brand, table.model, table.id],
    }),
  ]
);

import {
  pgTable,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  maxRecipes: integer("max_recipes").notNull(),
  features: text("features").array().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id),
  status: text("status", {
    enum: ["active", "cancelled", "expired", "pending"],
  })
    .notNull()
    .default("pending"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  autoRenew: boolean("auto_renew").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Billing history table
export const billingHistory = pgTable("billing_history", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscriptionId: text("subscription_id").references(
    () => userSubscriptions.id,
    { onDelete: "set null" }
  ),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  status: text("status", { enum: ["paid", "pending", "failed", "refunded"] })
    .notNull()
    .default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
});

// User sessions table for JWT management
export const userSessions = pgTable("user_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

// Recipe favorites table (for future use)
export const recipeFavorites = pgTable("recipe_favorites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipeId: text("recipe_id").notNull(),
  recipeName: text("recipe_name").notNull(),
  recipeImage: text("recipe_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checkoutSession = pgTable("checkout_session", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  billingCheckoutId: text("billing_checkout_id"),
  billingOrderId: text("billing_order_id"),
  status: varchar("status", {
    enum: ["open", "success", "failure", "timeout"],
  }),
});

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(userSubscriptions),
  billingHistory: many(billingHistory),
  sessions: many(userSessions),
  favorites: many(recipeFavorites),
}));

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    userSubscriptions: many(userSubscriptions),
  })
);

export const userSubscriptionsRelations = relations(
  userSubscriptions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userSubscriptions.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [userSubscriptions.planId],
      references: [subscriptionPlans.id],
    }),
    billingHistory: many(billingHistory),
  })
);

export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
  user: one(users, {
    fields: [billingHistory.userId],
    references: [users.id],
  }),
  subscription: one(userSubscriptions, {
    fields: [billingHistory.subscriptionId],
    references: [userSubscriptions.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const recipeFavoritesRelations = relations(
  recipeFavorites,
  ({ one }) => ({
    user: one(users, {
      fields: [recipeFavorites.userId],
      references: [users.id],
    }),
  })
);

// Types for the schema
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type BillingRecord = typeof billingHistory.$inferSelect;
export type NewBillingRecord = typeof billingHistory.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type RecipeFavorite = typeof recipeFavorites.$inferSelect;
export type NewRecipeFavorite = typeof recipeFavorites.$inferInsert;

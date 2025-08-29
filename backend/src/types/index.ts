import { Request } from "express";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  userId: string;
  plan: "free" | "basic" | "pro";
  startDate: Date;
  endDate?: Date;
  status: "active" | "cancelled" | "expired" | "pending";
}

export interface BillingRecord {
  id: string;
  userId: string;
  date: Date;
  amount: number;
  plan: string;
  status: "paid" | "pending" | "failed" | "refunded";
}

export interface AuthRequest extends Request {
  user?: UserWithoutPassword;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface SubscribeRequest {
  plan: "free" | "basic" | "pro";
}

export interface Plan {
  id: "free" | "basic" | "pro";
  name: string;
  price: number;
  description: string;
  features: string[];
  maxRecipes: number;
}

// Database-specific types
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  description: string;
  maxRecipes: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "cancelled" | "expired" | "pending";
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingRecordDB {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: string;
  currency: string;
  status: "paid" | "pending" | "failed" | "refunded";
  paymentMethod?: string;
  transactionId?: string;
  description?: string;
  createdAt: Date;
  paidAt?: Date;
}

export interface UserSession {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date;
}

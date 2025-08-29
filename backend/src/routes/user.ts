import { Router, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import {
  userSubscriptions,
  billingHistory,
  subscriptionPlans,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { AuthRequest } from "../types";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user's current subscription plan
router.get("/plan", async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const subscription = await db.query.userSubscriptions.findFirst({
      where: and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, "active")
      ),
      with: {
        plan: true,
      },
    });

    if (!subscription) {
      return res.json({
        plan: "none",
        startDate: null,
        endDate: null,
        status: "inactive",
      });
    }

    res.json({
      plan: subscription.plan?.name?.toLowerCase() || "unknown",
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Get plan error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user's billing history
router.get("/billing", async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const history = await db.query.billingHistory.findMany({
      where: eq(billingHistory.userId, userId),
      orderBy: (billingHistory, { desc }) => [desc(billingHistory.createdAt)],
    });

    // Transform to match the expected format
    const transformedHistory = history.map((record) => ({
      id: record.id,
      date: record.createdAt,
      amount: parseFloat(record.amount),
      plan: "subscription", // You can enhance this by joining with subscription data
      status: record.status,
    }));

    res.json(transformedHistory);
  } catch (error) {
    console.error("Get billing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user profile
router.get("/profile", async (req: any, res: any) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    res.json(req.user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

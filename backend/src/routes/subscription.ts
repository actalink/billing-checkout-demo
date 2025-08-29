import { Router, Response } from "express";
import dotenv from "dotenv";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import {
  userSubscriptions,
  billingHistory,
  subscriptionPlans,
  checkoutSession,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { AuthRequest, SubscribeRequest } from "../types";

dotenv.config({
  path: ".env",
});

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Subscribe to a plan
router.post("/subscribe", async (req: any, res: any) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    const APIKEY = process.env.APIKEY;
    const actalinkBaseUrl = process.env.ACTALINK_BASE_URL;
    const paylinkId1 = process.env.PAYLINK_ID_1;
    const paylinkId2 = process.env.PAYLINK_ID_2;

    if (!APIKEY || !actalinkBaseUrl || !paylinkId1 || !paylinkId2) {
      return res.status(500).json({ error: "Internal server error" });
    }

    const { plan } = req.body as SubscribeRequest;

    // Validation
    if (!plan || !["free", "basic", "pro"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    // Get the plan details from database
    const planDetails = await db.query.subscriptionPlans.findFirst({
      where: eq(
        subscriptionPlans.name,
        plan.charAt(0).toUpperCase() + plan.slice(1)
      ),
    });

    if (!planDetails) {
      return res.status(400).json({ error: "Plan not found" });
    }

    // Calculate plan details
    const now = new Date();
    const startDate = now;

    // Cancel any existing active subscription
    await db
      .update(userSubscriptions)
      .set({
        status: "cancelled",
        endDate: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, "active")
        )
      );

    // Create new subscription
    if (plan === "free") {
      // For demo purposes, set end date to 1 year from now
      const endDate = new Date(
        now.getFullYear() + 1,
        now.getMonth(),
        now.getDate()
      );
      const newSubscription = await db
        .insert(userSubscriptions)
        .values({
          userId,
          planId: planDetails.id,
          status: "active",
          startDate,
          endDate,
          autoRenew: true,
        })
        .returning();

      if (newSubscription.length === 0) {
        return res.status(500).json({ error: "Failed to create subscription" });
      }

      return res.json({
        message: "Subscription updated successfully",
        plan: planDetails.name.toLowerCase(),
        status: "active",
      });
    } else if (plan === "basic") {
      console.log("subscribing basic");

      const resp = await fetch(`${actalinkBaseUrl}/api/v1/paysession/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APIKEY as string,
        },
        body: JSON.stringify({
          paylinkId: paylinkId1,
          mode: "paylink",
          metadata: {
            uuid: userId,
          },
          successUrl: "https://google.com",
        }),
      });

      if (resp.status === 201) {
        console.log("checkout session created");
        const response: any = await resp.json();
        console.log(response);
        await db.insert(checkoutSession).values({
          billingCheckoutId: response.data.id,
          billingOrderId: response.data.orderId,
          status: response.data.status,
        });
        return res.status(201).json({ redirectUrl: response.data.url });
      }
    } else {
      const resp = await fetch(`${actalinkBaseUrl}/api/v1/paysession/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": APIKEY as string,
        },
        body: JSON.stringify({
          paylinkId: paylinkId2,
          mode: "paylink",
          metadata: {
            uuid: userId,
          },
          successUrl: "https://google.com",
        }),
      });

      if (resp.status === 201) {
        const response: any = await resp.json();
        await db.insert(checkoutSession).values({
          billingCheckoutId: response.data.id,
          billingOrderId: response.data.orderId,
          status: response.data.status,
        });
        return res.status(201).json({ redirectUrl: response.data.url });
      }
    }
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Get available plans
router.get("/plans", async (req: AuthRequest, res: Response) => {
  try {
    const availablePlans = await db.query.subscriptionPlans.findMany({
      where: eq(subscriptionPlans.isActive, true),
      orderBy: (subscriptionPlans, { asc }) => [asc(subscriptionPlans.price)],
    });

    // Transform to match the expected format
    const transformedPlans = availablePlans.map((plan) => ({
      id: plan.name.toLowerCase(),
      name: plan.name,
      price: parseFloat(plan.price),
      description: plan.description,
      features: plan.features,
      maxRecipes: plan.maxRecipes,
    }));

    res.json(transformedPlans);
  } catch (error) {
    console.error("Get plans error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Cancel subscription
router.post("/cancel", async (req: any, res: any) => {
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
    });

    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    // Update subscription status
    await db
      .update(userSubscriptions)
      .set({
        status: "cancelled",
        endDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscription.id));

    res.json({
      message: "Subscription cancelled successfully",
      plan: "cancelled",
      endDate: new Date(),
      status: "cancelled",
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get subscription status
router.get("/status", async (req: any, res: any) => {
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
        hasSubscription: false,
        plan: null,
        status: "none",
      });
    }

    res.json({
      hasSubscription: true,
      plan: subscription.plan?.name?.toLowerCase() || "unknown",
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    });
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import { db } from "./index";
import {
  subscriptionPlans,
  users,
  userSubscriptions,
  billingHistory,
  userSessions,
} from "./schema";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    console.log("🌱 Seeding database...");

    // Insert subscription plans
    const plans = [
      {
        name: "Free",
        price: "0.00",
        description: "Perfect for getting started",
        maxRecipes: 5,
        features: [
          "Access to 5 recipes",
          "Basic recipe information",
          "Community support",
        ],
      },
      {
        name: "Basic",
        price: "0.15",
        description: "Great for regular cooking",
        maxRecipes: 20,
        features: [
          "Access to 20 recipes",
          "Detailed cooking instructions",
          "Nutritional information",
          "Email support",
        ],
      },
      {
        name: "Pro",
        price: "0.16",
        description: "Unlimited access for food enthusiasts",
        maxRecipes: -1,
        features: [
          "Access to all recipes",
          "Advanced cooking techniques",
          "Video tutorials",
          "Priority support",
          "Exclusive recipes",
        ],
      },
    ];

    console.log("📋 Inserting subscription plans...");
    const insertedPlans = await db
      .insert(subscriptionPlans)
      .values(plans)
      .returning();
    console.log(`✅ Inserted ${insertedPlans.length} subscription plans`);

    // Insert sample user
    console.log("👤 Creating sample user...");
    const hashedPassword = await bcrypt.hash("password", 10);
    const sampleUser = await db
      .insert(users)
      .values({
        name: "John Doe",
        email: "john@example.com",
        password: hashedPassword,
      })
      .returning();

    if (sampleUser.length > 0) {
      const userId = sampleUser[0].id;
      const basicPlan = insertedPlans.find((p) => p.name === "Basic");

      if (basicPlan) {
        // Create subscription for sample user
        console.log("💳 Creating sample subscription...");
        const subscription = await db
          .insert(userSubscriptions)
          .values({
            userId,
            planId: basicPlan.id,
            status: "active",
            startDate: new Date("2024-01-01"),
            endDate: new Date("2025-01-01"),
          })
          .returning();

        if (subscription.length > 0) {
          // Create billing record
          console.log("💰 Creating sample billing record...");
          await db.insert(billingHistory).values({
            userId,
            subscriptionId: subscription[0].id,
            amount: "9.99",
            status: "paid",
            description: "Basic plan subscription",
            paidAt: new Date("2024-01-01"),
          });
        }
      }
    }

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}

export async function clearDatabase() {
  try {
    console.log("🧹 Clearing database...");

    // Clear in reverse order due to foreign key constraints
    await db.delete(billingHistory);
    await db.delete(userSessions);
    await db.delete(userSubscriptions);
    await db.delete(users);
    await db.delete(subscriptionPlans);

    console.log("✅ Database cleared successfully!");
  } catch (error) {
    console.error("❌ Database clearing failed:", error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

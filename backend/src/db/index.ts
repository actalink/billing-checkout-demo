import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { Client } from "pg";
import { subscriptionPlans, userSubscriptions } from "./schema";

export const ensureDatabaseExists = async () => {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_NAME } = process.env;

  const client = new Client({
    host: DB_HOST,
    port: 5432,
    user: DB_USER,
    password: DB_PASSWORD,
  });

  await client.connect();

  try {
    const res = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [DB_NAME]
    );
    const dbExists = res.rowCount ? true : false;

    if (!dbExists) {
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`✅ Database "${DB_NAME}" created.`);
    } else {
      console.log(`ℹ️ Database "${DB_NAME}" already exists.`);
    }

    await client.end();
  } catch (error: any) {
    console.log(error.message);
  }
};

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:password@localhost:5432/recipe_billing";

// Create postgres connection
const client = postgres(connectionString, {
  max: 1, // Use a single connection for migrations
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export the client for migrations
export { client };

// Database connection test
export async function testConnection() {
  try {
    await client`SELECT 1`;
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// Cleanup expired sessions
export async function cleanupExpiredSessions() {
  try {
    const { userSessions } = schema;
    const { gt } = await import("drizzle-orm");

    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(gt(userSessions.expiresAt, new Date()));

    console.log("🧹 Expired sessions cleaned up");
  } catch (error) {
    console.error("❌ Error cleaning up expired sessions:", error);
  }
}

// Check open checkout sessions and verify their status
export async function checkOpenCheckoutSessions() {
  try {
    const { checkoutSession } = schema;
    const { eq } = await import("drizzle-orm");
    const APIKEY = process.env.APIKEY;

    if (!APIKEY) {
      console.warn("⚠️ APIKEY not found in environment variables");
      return;
    }

    // Find all checkout sessions with 'open' status
    const openSessions = await db.query.checkoutSession.findMany({
      where: eq(checkoutSession.status, "open"),
    });

    if (openSessions.length === 0) {
      return; // No open sessions to check
    }

    console.log(
      `🔍 [${new Date().toISOString()}] Checking ${
        openSessions.length
      } open checkout sessions...`
    );

    // Define result type for better type safety
    type CheckResult = {
      success: boolean;
      sessionId: string;
      billingCheckoutId?: string | null;
      error?: string;
      status?: number;
    };

    // Create an array of promises for parallel execution
    const checkPromises = openSessions.map(async (session): Promise<any> => {
      try {
        if (!session.billingCheckoutId) {
          console.warn(`⚠️ Session ${session.id} has no billingCheckoutId`);
          return {
            success: false,
            error: "No billingCheckoutId",
            sessionId: session.id,
          };
        }

        // Make API call to verify session status
        const response = await fetch(
          `http://localhost:4000/billing/api/v1/paysession?checkoutSessionId=${session.billingCheckoutId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": APIKEY,
            },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000), // 10 second timeout
          }
        );

        if (response.status === 200) {
          const resp = await response.json();

          return resp;
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          console.error(
            `⏰ Timeout: Checkout session ${session.id} (${session.billingCheckoutId}) request timed out`
          );
        }
      }
    });

    // Execute all API calls in parallel using Promise.allSettled for better error handling
    const results = await Promise.allSettled(checkPromises);

    // Process results and calculate statistics
    let successCount = 0;
    let errorCount = 0;
    const successfulResults: Array<any> = [];
    const failedResults: Array<any> = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const data = result.value;
        if (data) {
          successCount++;
          successfulResults.push(data);
        } else {
          errorCount++;
          failedResults.push(data);
        }
      } else {
        errorCount++;
        failedResults.push({
          success: false,
          error: result.reason?.message || "Unknown error",
          sessionId: openSessions[index]?.id || "unknown",
          billingCheckoutId:
            openSessions[index]?.billingCheckoutId || undefined,
        });
      }
    });

    for (var i = 0; i < successfulResults.length; i++) {
      const r = successfulResults[0];
      if (r.data === undefined) return;
      if (r.data.plan === null) return;
      console.log("rrrrrrrr");
      console.log(r);
      const plan = r.data.plan.name === "Recipe Basic" ? "Basic" : "Pro";
      console.log("adding plan for");
      const planDetails = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.name, plan),
      });

      console.log(`plandetails`, planDetails);

      if (planDetails === undefined) return;
      const newSubscription = await db
        .insert(userSubscriptions)
        .values({
          userId: r.data.metadata.uuid,
          planId: planDetails.id,
          status: "active",
          startDate: new Date(r.data.startedAt),
          endDate: new Date(r.data.endAt),
        })
        .returning();

      const session = await db
        .update(checkoutSession)
        .set({ status: "success" })
        .where(eq(checkoutSession.id, r.data.id));
    }
  } catch (error) {
    console.error("❌ Error in checkOpenCheckoutSessions:", error);
  }
}

// Alternative implementation using Promise.all (faster but fails fast on any error)
export async function checkOpenCheckoutSessionsFast() {
  try {
    const { checkoutSession } = schema;
    const { eq } = await import("drizzle-orm");

    const APIKEY = process.env.APIKEY;
    const actalinkBaseUrl = process.env.ACTALINK_BASE_URL;
    const paylinkId1 = process.env.PAYLINK_ID_1;
    const paylinkId2 = process.env.PAYLINK_ID_2;

    if (!APIKEY || !actalinkBaseUrl || !paylinkId1 || !paylinkId2) {
      console.warn("⚠️ APIKEY not found in environment variables");
      return;
    }
    // Find all checkout sessions with 'open' status
    const openSessions = await db.query.checkoutSession.findMany({
      where: eq(checkoutSession.status, "open"),
    });

    if (openSessions.length === 0) {
      return; // No open sessions to check
    }

    console.log(
      `🚀 [${new Date().toISOString()}] Fast checking ${
        openSessions.length
      } open checkout sessions...`
    );

    // Create an array of promises for parallel execution
    const checkPromises = openSessions.map(async (session) => {
      if (!session.billingCheckoutId) {
        throw new Error(`Session ${session.id} has no billingCheckoutId`);
      }

      // Make API call to verify session status
      const response = await fetch(
        `${actalinkBaseUrl}/api/v1/paysession/${session.billingCheckoutId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": APIKEY,
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (response.status === 200) {
        console.log(
          `✅ Success: Checkout session ${session.id} (${session.billingCheckoutId}) is still active`
        );
        return {
          success: true,
          sessionId: session.id,
          billingCheckoutId: session.billingCheckoutId,
        };
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    });

    // Execute all API calls in parallel using Promise.all (fails fast)
    const results = await Promise.all(checkPromises);

    console.log(
      `🚀 [${new Date().toISOString()}] Fast check complete: ${
        results.length
      } success, 0 errors`
    );
  } catch (error) {
    console.error("❌ Error in fast checkout session check:", error);
  }
}

// Manual trigger for testing the cron job
export async function triggerCheckoutSessionCheck() {
  console.log("🚀 Manual trigger: Checking checkout sessions...");
  await checkOpenCheckoutSessions();
}

// Close database connection
export async function closeConnection() {
  try {
    console.log("🔄 Closing database connections...");

    // Cleanup expired sessions before closing
    await cleanupExpiredSessions();

    // Close the postgres client
    await client.end();
    console.log("✅ Database connections closed successfully");
  } catch (error) {
    console.error("❌ Error closing database connections:", error);
    throw error;
  }
}

// Setup periodic cleanup (every hour)
export function setupPeriodicCleanup() {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour
  console.log("⏰ Periodic session cleanup scheduled (every hour)");
}

// Setup checkout session monitoring (every 5 seconds)
export function setupCheckoutSessionMonitoring() {
  setInterval(checkOpenCheckoutSessions, 5 * 1000); // Every 5 seconds
  console.log("⏰ Checkout session monitoring scheduled (every 5 seconds)");
}

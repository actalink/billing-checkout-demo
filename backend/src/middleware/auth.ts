import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { users, userSessions } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { UserWithoutPassword, AuthRequest } from "../types";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

interface JWTPayload {
  userId: string;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Check if session exists and is active
    const session = await db.query.userSessions.findFirst({
      where: and(
        eq(userSessions.userId, decoded.userId),
        eq(userSessions.token, token),
        eq(userSessions.isActive, true),
        gt(userSessions.expiresAt, new Date())
      ),
    });

    if (!session) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    // Get user from database
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    // Update last used timestamp
    await db
      .update(userSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(userSessions.id, session.id));

    // Remove password from user object and convert dates to strings for API compatibility
    const userWithoutPassword: UserWithoutPassword = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    req.user = userWithoutPassword;
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "24h" });
};

export const createUserSession = async (
  userId: string,
  token: string
): Promise<void> => {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt,
    isActive: true,
  });
};

export const invalidateUserSession = async (token: string): Promise<void> => {
  await db
    .update(userSessions)
    .set({ isActive: false })
    .where(eq(userSessions.token, token));
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  await db
    .update(userSessions)
    .set({ isActive: false })
    .where(gt(userSessions.expiresAt, new Date()));
};

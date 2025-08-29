"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";
import { RecipeGrid } from "@/components/recipes/RecipeGrid";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HomePage() {
  const { user, isLoading, getAuthHeaders } = useAuth();
  const [userPlan, setUserPlan] = useState<any>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserPlan();
    } else {
      setIsLoadingPlan(false);
    }
  }, [user]);

  const fetchUserPlan = async () => {
    try {
      const response = await fetch("/api/user/plan", {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const plan = await response.json();
        setUserPlan(plan);
      }
    } catch (error) {
      console.error("Error fetching user plan:", error);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  if (isLoading || isLoadingPlan) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Recipe Billing Demo
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Please log in to access your recipes and subscription plans.
        </p>
      </div>
    );
  }

  if (!userPlan || userPlan.plan === "none") {
    return (
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Choose Your Subscription Plan
        </h1>
        <SubscriptionPlans onPlanSelected={fetchUserPlan} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
        Welcome back, {user.name}!
      </h1>
      <div className="mb-6 text-center">
        <p className="text-lg text-gray-600">
          Current Plan:{" "}
          <span className="font-semibold text-primary-600">
            {userPlan.plan}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          {userPlan.plan === "free" && "Access to 5 recipes"}
          {userPlan.plan === "basic" && "Access to 20 recipes"}
          {userPlan.plan === "pro" && "Access to all recipes"}
        </p>
      </div>
      <RecipeGrid userPlan={userPlan} />
    </div>
  );
}

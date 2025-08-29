"use client";

import { useState } from "react";
import { Check, Star } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface SubscriptionPlansProps {
  onPlanSelected: () => void;
  currentPlan?: string;
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "Perfect for getting started",
    features: [
      "Access to 5 recipes",
      "Basic recipe information",
      "Community support",
    ],
    popular: false,
    maxRecipes: 5,
  },
  {
    id: "basic",
    name: "Basic",
    price: 0.15,
    description: "Great for regular cooking",
    features: [
      "Access to 20 recipes",
      "Detailed cooking instructions",
      "Nutritional information",
      "Email support",
    ],
    popular: true,
    maxRecipes: 20,
  },
  {
    id: "pro",
    name: "Pro",
    price: 0.16,
    description: "Unlimited access for food enthusiasts",
    features: [
      "Access to all recipes",
      "Advanced cooking techniques",
      "Video tutorials",
      "Priority support",
      "Exclusive recipes",
    ],
    popular: false,
    maxRecipes: -1, // Unlimited
  },
];

export function SubscriptionPlans({
  onPlanSelected,
  currentPlan,
}: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getAuthHeaders } = useAuth();

  const handlePlanSelect = async (planId: string) => {
    if (planId === currentPlan) return;

    setSelectedPlan(planId);
    setIsLoading(true);

    try {
      const response = await fetch("/api/subscription/subscribe", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ plan: planId }),
      });

      if (response.ok) {
        const resp = await response.json();
        if (planId !== "free") {
          window.location.href = resp.redirectUrl;
        }
        onPlanSelected();
      } else {
        console.error("Failed to subscribe to plan");
      }
    } catch (error) {
      console.error("Error subscribing to plan:", error);
    } finally {
      setIsLoading(false);
      setSelectedPlan(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative card transition-all duration-200 ${
            plan.popular ? "ring-2 ring-primary-500 scale-105" : ""
          } ${
            currentPlan === plan.id ? "bg-primary-50 border-primary-200" : ""
          }`}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center space-x-1">
                <Star className="h-3 w-3" />
                <span>Most Popular</span>
              </span>
            </div>
          )}

          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {plan.name}
            </h3>
            <div className="mb-4">
              <span className="text-4xl font-bold text-gray-900">
                ${plan.price}
              </span>
              {plan.price > 0 && <span className="text-gray-500">/month</span>}
            </div>
            <p className="text-gray-600">{plan.description}</p>
          </div>

          <ul className="space-y-3 mb-6">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start space-x-3">
                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
          </ul>

          <div className="text-center">
            {currentPlan === plan.id ? (
              <div className="text-primary-600 font-medium">Current Plan</div>
            ) : (
              <button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                  plan.popular
                    ? "bg-primary-600 hover:bg-primary-700 text-white"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading && selectedPlan === plan.id
                  ? "Processing..."
                  : "Select Plan"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

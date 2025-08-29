"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { SubscriptionPlans } from "@/components/subscription/SubscriptionPlans";

interface UserPlan {
  plan: string;
  startDate: string;
  endDate?: string;
}

interface BillingHistory {
  id: string;
  date: string;
  amount: number;
  plan: string;
  status: string;
}

export default function AccountPage() {
  const { user, logout, getAuthHeaders } = useAuth();
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const [planResponse, billingResponse] = await Promise.all([
        fetch("/api/user/plan", { headers: getAuthHeaders() }),
        fetch("/api/user/billing", { headers: getAuthHeaders() }),
      ]);

      if (planResponse.ok) {
        const plan = await planResponse.json();
        setUserPlan(plan);
      }

      if (billingResponse.ok) {
        const billing = await billingResponse.json();
        setBillingHistory(billing);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <div>Please log in to view your account.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Account Settings
        </h1>
        <p className="text-gray-600">Manage your profile and subscription</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Section */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Profile Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="text-gray-900">{user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Member Since
              </label>
              <p className="text-gray-900">
                {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-4 btn-secondary">
            Sign Out
          </button>
        </div>

        {/* Current Plan Section */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Current Subscription
          </h2>
          {userPlan ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Plan
                </label>
                <p className="text-gray-900 capitalize">{userPlan.plan}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Started
                </label>
                <p className="text-gray-900">
                  {new Date(userPlan.startDate).toLocaleDateString()}
                </p>
              </div>
              {userPlan.endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expires
                  </label>
                  <p className="text-gray-900">
                    {new Date(userPlan.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}
              <button
                onClick={() => setShowPlanSelector(!showPlanSelector)}
                className="btn-primary"
              >
                {showPlanSelector ? "Cancel" : "Change Plan"}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">No active subscription</p>
          )}
        </div>
      </div>

      {/* Plan Selector */}
      {showPlanSelector && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Choose New Plan
          </h2>
          <SubscriptionPlans
            onPlanSelected={() => {
              fetchUserData();
              setShowPlanSelector(false);
            }}
            currentPlan={userPlan?.plan}
          />
        </div>
      )}

      {/* Billing History */}
      <div className="mt-8 card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Billing History
        </h2>
        {billingHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billingHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                      {item.plan}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${item.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === "paid"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No billing history available
          </p>
        )}
      </div>
    </div>
  );
}

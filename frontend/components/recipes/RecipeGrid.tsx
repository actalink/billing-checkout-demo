"use client";

import { useEffect, useState } from "react";
import { Clock, Users, Star } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Recipe {
  id: number;
  name: string;
  ingredients: string[];
  instructions: string[];
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
  cuisine: string;
  tags: string[];
  image: string;
  rating: number;
  reviewCount: number;
}

interface RecipeGridProps {
  userPlan: {
    plan: string;
    maxRecipes?: number;
  };
}

export function RecipeGrid({ userPlan }: RecipeGridProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecipes();
  }, [userPlan]);

  const fetchRecipes = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("https://dummyjson.com/recipes");
      if (!response.ok) {
        throw new Error("Failed to fetch recipes");
      }

      const data = await response.json();
      let filteredRecipes = data.recipes || [];

      // Filter recipes based on user's plan
      if (userPlan.plan === "free") {
        filteredRecipes = filteredRecipes.slice(0, 5);
      } else if (userPlan.plan === "basic") {
        filteredRecipes = filteredRecipes.slice(0, 20);
      }
      // Pro plan gets all recipes

      setRecipes(filteredRecipes);
    } catch (err) {
      setError("Failed to load recipes. Please try again later.");
      console.error("Error fetching recipes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchRecipes} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const getMaxRecipesText = () => {
    switch (userPlan.plan) {
      case "free":
        return "Showing 5 of 50+ recipes (Free Plan)";
      case "basic":
        return "Showing 20 of 50+ recipes (Basic Plan)";
      case "pro":
        return "Showing all recipes (Pro Plan)";
      default:
        return "Showing recipes";
    }
  };

  return (
    <div>
      <div className="mb-6 text-center">
        <p className="text-gray-600">{getMaxRecipesText()}</p>
        {userPlan.plan !== "pro" && (
          <p className="text-sm text-gray-500 mt-2">
            Upgrade your plan to access more recipes!
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="card hover:shadow-lg transition-shadow duration-200"
          >
            <div className="aspect-w-16 aspect-h-9 mb-4">
              <img
                src={recipe.image}
                alt={recipe.name}
                className="w-full h-48 object-cover rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    "https://via.placeholder.com/400x300?text=Recipe+Image";
                }}
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                {recipe.name}
              </h3>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>
                    {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{recipe.servings} servings</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium">{recipe.rating}</span>
                </div>
                <span className="text-sm text-gray-500">
                  ({recipe.reviewCount} reviews)
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {recipe.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="pt-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {recipe.cuisine} • {recipe.difficulty}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No recipes found.</p>
        </div>
      )}
    </div>
  );
}

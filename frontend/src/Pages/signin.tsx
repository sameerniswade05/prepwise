import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginAPI } from "@/services/api";

function Signin() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await loginAPI(formData.email, formData.password);

      if (auth) {
        auth.login({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
      }

      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Login failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Practice job interviews with AI</h1>
          <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-white block mb-2">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="adrian@jsmastery.pro"
              value={formData.email}
              onChange={handleInputChange}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-lg h-12"
            />
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-white block mb-2">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-lg h-12"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-linear-to-r from-indigo-500 to-purple-500 text-white font-semibold h-12 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Sign up link */}
        <p className="mt-6 text-center text-slate-400 text-sm">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Create one for free
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Signin;

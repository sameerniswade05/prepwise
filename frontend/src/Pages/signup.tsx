import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { signupAPI } from "@/services/api";

function Signup() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    profilePicture: null as File | null,
    resume: null as File | null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const body = new FormData();
      body.append("fullName", formData.fullName);
      body.append("email", formData.email);
      body.append("password", formData.password);

      if (formData.profilePicture) {
        body.append("profilePicture", formData.profilePicture);
      }
      if (formData.resume) {
        body.append("resume", formData.resume);
      }

      await signupAPI(body);
      toast.success("Account created successfully. Please sign in.");
      navigate("/signin");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Signup failed";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Practice job interviews with AI</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-white block mb-2">
              Full name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="Adrian Hajdin"
              value={formData.fullName}
              onChange={handleInputChange}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-lg h-12"
            />
          </div>

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

          {/* Profile Picture */}
          <div>
            <Label htmlFor="profilePicture" className="text-white block mb-2">
              Profile picture
            </Label>
            <label htmlFor="profilePicture" className="block">
              <input id="profilePicture" name="profilePicture" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <Button
                type="button"
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 rounded-lg h-12 cursor-pointer"
                onClick={() => document.getElementById("profilePicture")?.click()}
              >
                ⬆ Upload an image
              </Button>
            </label>
            {formData.profilePicture && <p className="mt-2 text-sm text-slate-300">Selected: {formData.profilePicture.name}</p>}
          </div>

          {/* Resume */}
          <div>
            <Label htmlFor="resume" className="text-white block mb-2">
              Resume
            </Label>
            <label htmlFor="resume" className="block">
              <input id="resume" name="resume" type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              <Button
                type="button"
                variant="outline"
                className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700 rounded-lg h-12 cursor-pointer"
                onClick={() => document.getElementById("resume")?.click()}
              >
                ⬆ Upload a pdf
              </Button>
            </label>
            {formData.resume && <p className="mt-2 text-sm text-slate-300">Selected: {formData.resume.name}</p>}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold h-12 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating account..." : "Create an account"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Signup;

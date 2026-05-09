// src/controllers/auth.controller.js

import { signupService, loginService, getProfileService, updateProfileService, refreshTokenService } from "../../services/auth.service.js";

/* ------------------ SIGNUP ------------------ */
export const signup = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const profilePicture = req.files?.profilePicture?.[0] || null;
    const resume = req.files?.resume?.[0] || null;

    const result = await signupService({
      fullName,
      email,
      password,
      profilePicture,
      resume,
    });

    res.status(201).json({
      message: "User created successfully",
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Signup failed",
    });
  }
};

/* ------------------ LOGIN ------------------ */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await loginService({ email, password });

    res.status(200).json({
      message: "Login successful",
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Login failed",
    });
  }
};

/* ------------------ REFRESH TOKEN ------------------ */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(400).json({ message: "Refresh token required" });

    const result = await refreshTokenService({ refreshToken: token });
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ message: error.message || "Invalid or expired refresh token" });
  }
};

/* ------------------ PROFILE ------------------ */
export const getProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await getProfileService(userId);

    res.status(200).json({
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || "Failed to fetch profile",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { fullName, email } = req.body;
    const profilePicture = req.files?.profilePicture?.[0] || null;
    const resume = req.files?.resume?.[0] || null;

    const result = await updateProfileService({
      userId,
      fullName,
      email,
      profilePicture,
      resume,
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({
      message: error.message || "Failed to update profile",
    });
  }
};

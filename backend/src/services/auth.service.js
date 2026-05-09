// src/services/auth.service.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadBufferToCloudinary } from "../lib/cloudinary.js";
import User from "../models/User.js";


const uploadFile = async (file, folder, resourceType) => {
  if (!file || !file.buffer) return null;

  const publicId = `${folder}/${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, "")}`;

  const result = await uploadBufferToCloudinary(file.buffer, {
    folder,
    resource_type: resourceType,
    public_id: publicId,
    overwrite: true,
  });
  return result.secure_url;
};

/* ------------------ SIGNUP ------------------ */
export const signupService = async ({ fullName, email, password, profilePicture, resume }) => {
  // check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  // hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const profilePicturePath = await uploadFile(profilePicture, "signup/profilePictures", "image");
  const resumePath = await uploadFile(resume, "signup/resumes", "raw");

  const newUser = new User({
    fullName,
    email,
    password: hashedPassword,
    profilePicturePath,
    resumePath,
  });

  await newUser.save();

  return {
    user: {
      id: newUser._id.toString(),
      fullName: newUser.fullName,
      email: newUser.email,
      profilePicturePath: newUser.profilePicturePath,
      resumePath: newUser.resumePath,
    },
  };
};

/* ------------------ PROFILE ------------------ */
export const getProfileService = async (userId) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await User.findById(userId).select("fullName email profilePicturePath resumePath");
  if (!user) {
    throw new Error("User not found");
  }

  return {
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      profilePicturePath: user.profilePicturePath,
      resumePath: user.resumePath,
    },
  };
};

export const updateProfileService = async ({ userId, fullName, email, profilePicture, resume }) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (email && email !== user.email) {
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      throw new Error("Email already in use");
    }
    user.email = email;
  }

  if (fullName) {
    user.fullName = fullName;
  }

  if (profilePicture) {
    const profilePicturePath = await uploadFile(profilePicture, "profilePictures", "image");
    user.profilePicturePath = profilePicturePath;
  }

  if (resume) {
    const resumePath = await uploadFile(resume, "resumes", "raw");
    user.resumePath = resumePath;
  }

  await user.save();

  return {
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      profilePicturePath: user.profilePicturePath,
      resumePath: user.resumePath,
    },
  };
};

/* ------------------ LOGIN ------------------ */
export const loginService = async ({ email, password }) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";

  const accessToken = jwt.sign(
    { id: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "5h" }
  );
  const refreshToken = jwt.sign(
    { id: user._id.toString(), email: user.email },
    refreshSecret,
    { expiresIn: "7d" }
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      profilePicturePath: user.profilePicturePath,
      resumePath: user.resumePath,
    },
  };
};

/* ------------------ REFRESH TOKEN ------------------ */
export const refreshTokenService = async ({ refreshToken }) => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, refreshSecret);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  const user = await User.findById(decoded.id).select("_id email fullName profilePicturePath resumePath");
  if (!user) throw new Error("User not found");

  const newAccessToken = jwt.sign(
    { id: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "5h" }
  );
  const newRefreshToken = jwt.sign(
    { id: user._id.toString(), email: user.email },
    refreshSecret,
    { expiresIn: "7d" }
  );

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
};

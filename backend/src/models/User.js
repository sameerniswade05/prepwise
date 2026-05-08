import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePicturePath: {
      type: String,
      default: null,
    },
    resumePath: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// Create indexes for better performance
userSchema.index({ email: 1 });

const User = mongoose.model("User", userSchema);

export default User;

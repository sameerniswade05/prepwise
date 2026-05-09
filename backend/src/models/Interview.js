import mongoose from "mongoose";

const feedbackCategorySchema = new mongoose.Schema(
  {
    name: { type: String },
    score: { type: Number, default: 0 },
    maxScore: { type: Number, default: 20 },
    bullets: [{ type: String }],
  },
  { _id: false }
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["assistant", "user"] },
    content: { type: String },
  },
  { _id: false }
);

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true },
    type: { type: String, enum: ["Technical", "Non-Technical", "Resume"], required: true },
    role: { type: String, required: true },
    techStack: { type: String, default: "" },
    duration: { type: String, default: "10 minutes" },
    status: {
      type: String,
      enum: ["pending", "active", "completed"],
      default: "pending",
    },
    transcript: [transcriptEntrySchema],
    feedback: {
      overallScore: { type: Number, default: 0 },
      categories: [feedbackCategorySchema],
      verdict: { type: String, default: "" },
      summary: { type: String, default: "" },
    },
    paymentId: { type: String, default: null },
    razorpayOrderId: { type: String, default: null },
  },
  { timestamps: true }
);

interviewSchema.index({ userId: 1, createdAt: -1 });

const Interview = mongoose.model("Interview", interviewSchema);
export default Interview;

import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  createInterview,
  getUserInterviews,
  getInterviewById,
  saveTranscriptAndFeedback,
  getSystemPrompt,
} from "../controller/interview/interview.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createInterview);
router.get("/", getUserInterviews);
router.get("/system-prompt", getSystemPrompt);
router.get("/:id", getInterviewById);
router.post("/:id/feedback", saveTranscriptAndFeedback);

export default router;

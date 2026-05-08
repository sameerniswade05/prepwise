import {
  createInterviewService,
  getUserInterviewsService,
  getInterviewByIdService,
  saveTranscriptAndFeedbackService,
  buildSystemPromptService,
} from "../../services/interview.service.js";

export const createInterview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, type, role, techStack, duration, paymentId, razorpayOrderId } = req.body;

    if (!title || !type || !role) {
      return res.status(400).json({ message: "title, type and role are required" });
    }

    const result = await createInterviewService({
      userId,
      title,
      type,
      role,
      techStack,
      duration,
      paymentId,
      razorpayOrderId,
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to create interview" });
  }
};

export const getUserInterviews = async (req, res) => {
  try {
    const userId = req.user?.id;
    const result = await getUserInterviewsService(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to fetch interviews" });
  }
};

export const getInterviewById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await getInterviewByIdService(id, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message || "Interview not found" });
  }
};

export const saveTranscriptAndFeedback = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { transcript } = req.body;

    const result = await saveTranscriptAndFeedbackService({
      interviewId: id,
      userId,
      transcript,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to save feedback" });
  }
};

export const getSystemPrompt = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { type, role, techStack, duration } = req.query;

    const result = await buildSystemPromptService({
      userId,
      type,
      role,
      techStack,
      duration,
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to build prompt" });
  }
};

import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import { createOrder, verifyPayment } from "../controller/payment/payment.controller.js";

const router = express.Router();

router.post("/create-order", authMiddleware, createOrder);
router.post("/verify", authMiddleware, verifyPayment);

export default router;

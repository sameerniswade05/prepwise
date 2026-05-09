import { createOrderService, verifyPaymentService } from "../../services/payment.service.js";

export const createOrder = async (req, res) => {
  try {
    const { durationMinutes } = req.body;
    const result = await createOrderService({ durationMinutes });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to create payment order" });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const result = await verifyPaymentService({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message || "Payment verification failed" });
  }
};

import Razorpay from "razorpay";
import crypto from "crypto";

const getRazorpayInstance = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys not configured");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

// Create a Razorpay order — ₹10 per 10 minutes (10/20/30 min → ₹10/20/30)
export const createOrderService = async ({ durationMinutes = 10 } = {}) => {
  const razorpay = getRazorpayInstance();

  const validDurations = [10, 20, 30];
  const duration = validDurations.includes(Number(durationMinutes)) ? Number(durationMinutes) : 10;
  const amountPaise = duration * 100; // ₹1 per minute × 100 paise = duration * 100 paise

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

// Verify Razorpay payment signature
export const verifyPaymentService = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) throw new Error("Razorpay secret not configured");

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new Error("Payment verification failed");
  }

  return { verified: true, paymentId: razorpay_payment_id };
};

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

// Create a Razorpay order for ₹10 (1000 paise)
export const createOrderService = async () => {
  const razorpay = getRazorpayInstance();

  const order = await razorpay.orders.create({
    amount: 1000, // ₹10 in paise
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
if (!API_BASE_URL) throw new Error("VITE_API_BASE_URL is not set");

// ─── Auth ──────────────────────────────────────────────────────────────────

export const loginAPI = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Login failed");
  return data;
};

export const signupAPI = async (formData: FormData) => {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Signup failed");
  return data;
};

export const getProfileAPI = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch profile");
  return data;
};

export const updateProfileAPI = async (formData: FormData, token: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to update profile");
  return data;
};

// ─── Interviews ────────────────────────────────────────────────────────────

export const createInterviewAPI = async (
  payload: {
    title: string;
    type: string;
    role: string;
    techStack: string;
    duration: string;
    paymentId: string;
    razorpayOrderId: string;
  },
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/interviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create interview");
  return data;
};

export const getUserInterviewsAPI = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/interviews`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to fetch interviews");
  return data;
};

export const getInterviewByIdAPI = async (id: string, token: string) => {
  const response = await fetch(`${API_BASE_URL}/interviews/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Interview not found");
  return data;
};

export const saveTranscriptAPI = async (
  id: string,
  transcript: { role: string; content: string }[],
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/interviews/${id}/feedback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ transcript }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to save feedback");
  return data;
};

export const getSystemPromptAPI = async (
  params: { type: string; role: string; techStack: string; duration: string },
  token: string
) => {
  const qs = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE_URL}/interviews/system-prompt?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to get prompt");
  return data;
};

// ─── Payment ───────────────────────────────────────────────────────────────

export const createPaymentOrderAPI = async (token: string) => {
  const response = await fetch(`${API_BASE_URL}/payment/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Failed to create order");
  return data;
};

export const verifyPaymentAPI = async (
  payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  token: string
) => {
  const response = await fetch(`${API_BASE_URL}/payment/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Payment verification failed");
  return data;
};

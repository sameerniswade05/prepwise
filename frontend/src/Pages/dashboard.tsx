import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import {
  Code2,
  Cloud,
  Users,
  Layers,
  BarChart2,
  Smartphone,
  Database,
  Shield,
  TrendingUp,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getProfileAPI,
  updateProfileAPI,
  getUserInterviewsAPI,
  createInterviewAPI,
  createPaymentOrderAPI,
  verifyPaymentAPI,
} from "@/services/api";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}

type PastInterview = {
  id: string;
  title: string;
  type: string;
  role: string;
  status: string;
  createdAt: string;
  feedback: { overallScore: number; verdict: string };
};

type PickInterview = {
  title: string;
  type: string;
  role: string;
  techStack: string;
  Icon: LucideIcon;
};

const pickInterviews: PickInterview[] = [
  { title: "Full-Stack Dev Interview", type: "Technical", role: "Full-Stack Developer", techStack: "React, Node.js", Icon: Code2 },
  { title: "DevOps & Cloud Interview", type: "Technical", role: "DevOps Engineer", techStack: "AWS, Docker, Kubernetes", Icon: Cloud },
  { title: "HR Screening Interview", type: "Non-Technical", role: "HR Screening", techStack: "", Icon: Users },
  { title: "System Design Interview", type: "Technical", role: "Software Architect", techStack: "System Design", Icon: Layers },
  { title: "Business Analyst Interview", type: "Non-Technical", role: "Business Analyst", techStack: "", Icon: BarChart2 },
  { title: "Mobile App Dev Interview", type: "Technical", role: "Mobile Developer", techStack: "React Native, iOS, Android", Icon: Smartphone },
  { title: "Database & SQL Interview", type: "Technical", role: "Database Engineer", techStack: "SQL, PostgreSQL, MongoDB", Icon: Database },
  { title: "Cybersecurity Interview", type: "Technical", role: "Security Engineer", techStack: "Cybersecurity", Icon: Shield },
  { title: "Sales & Marketing Interview", type: "Non-Technical", role: "Sales & Marketing", techStack: "", Icon: TrendingUp },
];

const DURATION_OPTIONS = [10, 20, 30];
const priceForDuration = (minutes: number) => minutes; // ₹10 per 10 min

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function Dashboard() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [pastInterviews, setPastInterviews] = useState<PastInterview[]>([]);
  const [isInterviewOpen, setIsInterviewOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [pendingInterviewConfig, setPendingInterviewConfig] = useState<{
    title: string; type: string; role: string; techStack: string; duration: string; resumeContext?: string;
  } | null>(null);

  // Resume interview modal
  const [isResumeInterviewOpen, setIsResumeInterviewOpen] = useState(false);
  const [resumeInterviewDuration, setResumeInterviewDuration] = useState(10);
  const [resumeContext, setResumeContext] = useState(""); // user-pasted resume text
  const [resumeUploadFile, setResumeUploadFile] = useState<File | null>(null);
  const [resumeUploadLoading, setResumeUploadLoading] = useState(false);

  // Per-card selected duration (minutes), default 10
  const [pickDurations, setPickDurations] = useState<Record<string, number>>({});
  const getPickDuration = (title: string) => pickDurations[title] ?? 10;

  const [interviewForm, setInterviewForm] = useState({
    interviewType: "Technical",
    role: "",
    techStack: "",
    duration: "10",
  });

  const [accountForm, setAccountForm] = useState({
    fullName: auth?.user?.fullName || "",
    email: auth?.user?.email || "",
  });
  const [accountPhoto, setAccountPhoto] = useState<File | null>(null);
  const [accountResume, setAccountResume] = useState<File | null>(null);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const anyOpen = isInterviewOpen || isAccountOpen || isResumeInterviewOpen;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isInterviewOpen, isAccountOpen, isResumeInterviewOpen]);

  useEffect(() => {
    if (auth?.user) {
      setAccountForm({
        fullName: auth.user.fullName ?? "",
        email: auth.user.email ?? "",
      });
    }
  }, [auth?.user]);

  useEffect(() => {
    if (!auth?.token) return;

    getProfileAPI(auth.token)
      .then((res) => {
        auth.updateUser(res.user);
        setAccountForm({ fullName: res.user.fullName || "", email: res.user.email });
      })
      .catch(console.error);

    getUserInterviewsAPI(auth.token)
      .then((res) => setPastInterviews(res.interviews))
      .catch(console.error);
  }, [auth?.token]);

  const handleInterviewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInterviewForm((prev) => ({ ...prev, [name]: value }));
  };

  const initiatePaymentAndInterview = async (config: typeof pendingInterviewConfig) => {
    if (!auth?.token || !config) return;

    const durationMinutes = parseInt(config.duration) || 10;
    const price = priceForDuration(durationMinutes);
    const razorpayKeyId = import.meta.env.VITE_RAZORPAY_KEY_ID;

    if (!razorpayKeyId) {
      toast.info("Razorpay not configured — skipping payment in dev mode.");
      await createAndNavigate(config, "dev_payment_skipped", "dev_order_skipped");
      return;
    }

    setIsPaymentPending(true);

    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay");

      const order = await createPaymentOrderAPI(auth.token, durationMinutes);

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "PrepWise",
          description: `Interview Session — ₹${price} (${durationMinutes} min)`,
          order_id: order.orderId,
          handler: async (response) => {
            try {
              await verifyPaymentAPI(
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
                auth.token!
              );
              toast.success("Payment successful! Starting interview...");
              await createAndNavigate(config, response.razorpay_payment_id, response.razorpay_order_id);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          prefill: { name: auth.user?.fullName, email: auth.user?.email },
          theme: { color: "#7c3aed" },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
        });
        rzp.open();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setIsPaymentPending(false);
    }
  };

  const createAndNavigate = async (
    config: NonNullable<typeof pendingInterviewConfig>,
    paymentId: string,
    razorpayOrderId: string
  ) => {
    if (!auth?.token) return;
    const result = await createInterviewAPI(
      {
        title: config.title,
        type: config.type,
        role: config.role,
        techStack: config.techStack,
        duration: config.duration,
        paymentId,
        razorpayOrderId,
      },
      auth.token
    );
    // Pass resumeContext in navigate state for Resume interviews
    const navState = config.type === "Resume" && config.resumeContext
      ? { resumeContext: config.resumeContext }
      : undefined;
    navigate(`/interview/${result.interview.id}`, { state: navState });
  };

  const handleStartInterview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!interviewForm.role.trim()) {
      toast.error("Please enter a role.");
      return;
    }
    const config = {
      title: `${interviewForm.role} Interview`,
      type: interviewForm.interviewType,
      role: interviewForm.role,
      techStack: interviewForm.techStack,
      duration: interviewForm.duration,
    };
    setIsInterviewOpen(false);
    setPendingInterviewConfig(config);
    await initiatePaymentAndInterview(config);
    setPendingInterviewConfig(null);
  };

  const handlePickInterview = async (pick: PickInterview) => {
    const duration = getPickDuration(pick.title);
    const config = {
      title: pick.title,
      type: pick.type,
      role: pick.role,
      techStack: pick.techStack,
      duration: String(duration),
    };
    setPendingInterviewConfig(config);
    await initiatePaymentAndInterview(config);
    setPendingInterviewConfig(null);
  };

  const handleSaveAccount = async () => {
    if (!auth?.token) return toast.error("Please sign in again.");

    try {
      const formData = new FormData();
      formData.append("fullName", accountForm.fullName);
      formData.append("email", accountForm.email);
      if (accountPhoto) formData.append("profilePicture", accountPhoto);
      if (accountResume) formData.append("resume", accountResume);

      const result = await updateProfileAPI(formData, auth.token);
      auth.updateUser(result.user);
      toast.success("Account details updated.");
      setIsAccountOpen(false);
      setAccountPhoto(null);
      setAccountResume(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  };

  const handleResumeInterview = () => {
    // Always open the modal — it shows the upload form if no resume exists
    setIsResumeInterviewOpen(true);
  };

  const handleUploadResumeFromModal = async () => {
    if (!resumeUploadFile || !auth?.token) return;
    setResumeUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append("fullName", auth.user?.fullName || "");
      formData.append("email", auth.user?.email || "");
      formData.append("resume", resumeUploadFile);
      const result = await updateProfileAPI(formData, auth.token);
      auth.updateUser(result.user);
      setResumeUploadFile(null);
      toast.success("Resume uploaded! You can now start your interview.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setResumeUploadLoading(false);
    }
  };

  const handleStartResumeInterview = async () => {
    const config = {
      title: "Resume-Based Interview",
      type: "Resume",
      role: "Resume Review",
      techStack: "",
      duration: String(resumeInterviewDuration),
      resumeContext: resumeContext.trim(),
    };
    setIsResumeInterviewOpen(false);
    setResumeContext("");
    setResumeUploadFile(null);
    setPendingInterviewConfig(config);
    await initiatePaymentAndInterview(config);
    setPendingInterviewConfig(null);
  };

  const handleLogout = () => {
    auth?.logout();
    toast.success("Logged out successfully.");
    navigate("/signin");
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Price shown in the modal based on currently selected duration
  const modalDuration = parseInt(interviewForm.duration) || 10;
  const modalPrice = priceForDuration(modalDuration);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">PrepWise</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Get Interview-Ready with AI-Powered Practice & Feedback
            </h1>
            <p className="max-w-xl text-slate-400">
              Practice real interview questions and get instant feedback. ₹10 per 10-minute session.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                className="min-w-42.5 bg-violet-500 text-white hover:bg-violet-400"
                disabled={isPaymentPending}
                onClick={() => setIsInterviewOpen(true)}
              >
                {isPaymentPending ? "Processing..." : "Start an Interview"}
              </Button>
              <Button
                className="min-w-42.5 bg-indigo-600 text-white hover:bg-indigo-500 flex items-center gap-2"
                disabled={isPaymentPending}
                onClick={handleResumeInterview}
                title={!auth?.user?.resumePath ? "Upload your resume in Account Details first" : undefined}
              >
                <FileText className="h-4 w-4" />
                {isPaymentPending ? "Processing..." : "Interview from Resume"}
              </Button>
              <Button
                variant="outline"
                className="min-w-42.5 border-slate-700 text-slate-200 hover:border-slate-500"
                onClick={() => setIsAccountOpen(true)}
              >
                Account Details
              </Button>
            </div>
          </div>

          {/* Profile card */}
          <div className="flex items-center justify-between rounded-3xl bg-slate-900/80 p-6 shadow-xl shadow-slate-950/30 lg:w-105">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Your Profile</p>
              <h2 className="mt-3 text-2xl font-semibold">{auth?.user?.fullName ?? "Guest User"}</h2>
              <p className="text-sm text-slate-400">{auth?.user?.email ?? "No account connected"}</p>
            </div>
            <button
              className="h-14 w-14 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10 transition hover:bg-slate-700"
              onClick={() => setIsAccountOpen(true)}
            >
              {auth?.user?.profilePicturePath ? (
                <img src={auth.user.profilePicturePath} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-semibold">
                  {auth?.user?.fullName?.charAt(0) ?? "U"}
                </span>
              )}
            </button>
          </div>
        </div>

        <section className="mt-10 space-y-10">
          {/* Past interviews */}
          {pastInterviews.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold">Your Past Interviews</h2>
              <p className="text-sm text-slate-400 mt-1">Review your past work and continue improving.</p>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {pastInterviews.map((item) => {
                  const scoreColor =
                    item.feedback?.overallScore >= 70
                      ? "text-green-400"
                      : item.feedback?.overallScore >= 50
                      ? "text-yellow-400"
                      : "text-red-400";
                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{item.type}</p>
                          <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                        </div>
                        {item.feedback?.overallScore != null && (
                          <span className={`text-sm font-semibold ${scoreColor}`}>
                            {item.feedback.overallScore}/100
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs text-slate-500">{item.role}</p>
                      <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
                        <span>{formatDate(item.createdAt)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-200 hover:border-slate-500"
                          onClick={() => navigate(`/feedback/${item.id}`)}
                        >
                          View interview
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pick interview */}
          <div>
            <h2 className="text-2xl font-semibold">Pick Your Interview</h2>
            <p className="text-sm text-slate-400 mt-1">
              Choose a domain, select duration, and get started in seconds. ₹10 per 10 minutes.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {pickInterviews.map((item) => {
                const selectedDuration = getPickDuration(item.title);
                const price = priceForDuration(selectedDuration);
                return (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col"
                  >
                    {/* Header: icon + type badge */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="h-11 w-11 rounded-2xl bg-slate-800 flex items-center justify-center">
                        <item.Icon className="h-5 w-5 text-violet-400" />
                      </div>
                      <span className="rounded-2xl bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                        {item.type}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">{item.role}</p>
                      {item.techStack && (
                        <p className="mt-1 text-xs text-slate-500">{item.techStack}</p>
                      )}
                    </div>

                    {/* Duration selector */}
                    <div className="mt-4 flex gap-2">
                      {DURATION_OPTIONS.map((min) => (
                        <button
                          key={min}
                          type="button"
                          onClick={() =>
                            setPickDurations((prev) => ({ ...prev, [item.title]: min }))
                          }
                          className={`flex-1 rounded-full py-1.5 text-xs font-medium transition ${
                            selectedDuration === min
                              ? "bg-violet-500 text-white"
                              : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {min}m
                        </button>
                      ))}
                    </div>

                    {/* CTA button — always at bottom, same position on every card */}
                    <div className="mt-4">
                      <Button
                        className="w-full bg-violet-500 text-white hover:bg-violet-400"
                        disabled={isPaymentPending}
                        onClick={() => handlePickInterview(item)}
                      >
                        Take interview — ₹{price}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ── Resume Interview Modal ── */}
      {isResumeInterviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative w-full max-w-md rounded-4xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            {/* Close */}
            <button
              className="absolute right-5 top-5 rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
              onClick={() => { setIsResumeInterviewOpen(false); setResumeContext(""); setResumeUploadFile(null); }}
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-6 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20">
                  <FileText className="h-5 w-5 text-indigo-400" />
                </div>
                <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Resume Interview</p>
              </div>
              <h2 className="text-2xl font-semibold">Interview from Your Resume</h2>
            </div>

            {/* ── NO RESUME: upload prompt ── */}
            {!auth?.user?.resumePath ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
                  <p className="text-sm font-medium text-amber-400">No resume uploaded yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Upload your resume PDF below to enable personalized AI interview questions based on your real experience.
                  </p>
                </div>

                <div>
                  <Label className="text-sm text-slate-300 mb-2 block">Upload your resume (PDF)</Label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-600 bg-slate-800/50 px-4 py-4 hover:border-indigo-500 transition">
                    <FileText className="h-5 w-5 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-400 truncate">
                      {resumeUploadFile ? resumeUploadFile.name : "Click to select a PDF file"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setResumeUploadFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>

                <Button
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-500 h-12"
                  disabled={!resumeUploadFile || resumeUploadLoading}
                  onClick={handleUploadResumeFromModal}
                >
                  {resumeUploadLoading ? "Uploading..." : "Upload Resume"}
                </Button>
              </div>
            ) : (
              /* ── HAS RESUME: duration + optional text + start ── */
              <div className="space-y-5">
                <p className="text-slate-400 text-sm">
                  The AI interviewer will ask personalized questions based on your resume. If your PDF is image-based, paste your resume text below for best results.
                </p>

                {/* Duration */}
                <div>
                  <Label className="text-sm text-slate-300 mb-3 block">Select duration</Label>
                  <div className="flex gap-3">
                    {DURATION_OPTIONS.map((min) => (
                      <button
                        key={min}
                        type="button"
                        onClick={() => setResumeInterviewDuration(min)}
                        className={`flex-1 rounded-2xl py-3 text-sm font-medium transition ${
                          resumeInterviewDuration === min
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                        }`}
                      >
                        {min} min
                        <span className="block text-xs mt-0.5 opacity-70">₹{priceForDuration(min)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional resume text paste */}
                <div>
                  <Label className="text-sm text-slate-300 mb-1 block">
                    Paste resume text{" "}
                    <span className="text-slate-500 font-normal">(optional — helps if your PDF is image-based)</span>
                  </Label>
                  <textarea
                    value={resumeContext}
                    onChange={(e) => setResumeContext(e.target.value)}
                    placeholder="Paste the text content of your resume here so the AI can ask targeted questions…"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Pricing note */}
                <div className="rounded-2xl border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
                  Payment of{" "}
                  <span className="text-indigo-400 font-semibold">₹{priceForDuration(resumeInterviewDuration)}</span>{" "}
                  will be charged for a {resumeInterviewDuration}-minute session.
                </div>

                <Button
                  className="w-full bg-indigo-600 text-white hover:bg-indigo-500 h-12"
                  disabled={isPaymentPending}
                  onClick={handleStartResumeInterview}
                >
                  Pay ₹{priceForDuration(resumeInterviewDuration)} & Start Resume Interview
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Interview Config Modal ── */}
      {isInterviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative w-full max-w-2xl rounded-4xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <button
              className="absolute right-5 top-5 rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
              onClick={() => setIsInterviewOpen(false)}
            >
              ✕
            </button>
            <div className="mb-8 space-y-2">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Interview Confirmation</p>
              <h2 className="text-3xl font-semibold">Starting Your Interview</h2>
              <p className="text-slate-400">
                Customize your mock interview. Payment of{" "}
                <span className="text-violet-400 font-semibold">₹{modalPrice}</span> will be charged.
              </p>
            </div>

            <form className="grid gap-5" onSubmit={handleStartInterview}>
              <div>
                <Label className="text-sm text-slate-300">What type of interview?</Label>
                <select
                  name="interviewType"
                  value={interviewForm.interviewType}
                  onChange={handleInterviewChange}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500"
                >
                  <option>Technical</option>
                  <option>Non-Technical</option>
                </select>
              </div>
              <div>
                <Label className="text-sm text-slate-300">What role are you focusing on?</Label>
                <Input
                  name="role"
                  value={interviewForm.role}
                  onChange={handleInterviewChange}
                  placeholder="e.g. Frontend Developer"
                  className="mt-2 bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Tech stack (optional)</Label>
                <Input
                  name="techStack"
                  value={interviewForm.techStack}
                  onChange={handleInterviewChange}
                  placeholder="e.g. React, TypeScript"
                  className="mt-2 bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Duration</Label>
                <select
                  name="duration"
                  value={interviewForm.duration}
                  onChange={handleInterviewChange}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-500"
                >
                  <option value="10">10 minutes — ₹10</option>
                  <option value="20">20 minutes — ₹20</option>
                  <option value="30">30 minutes — ₹30</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-violet-500 text-white hover:bg-violet-400">
                Pay ₹{modalPrice} & Start Interview
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── Account Modal ── */}
      {isAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative w-full max-w-lg rounded-4xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <button
              className="absolute right-5 top-5 rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800"
              onClick={() => setIsAccountOpen(false)}
            >
              ✕
            </button>
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Account details</p>
              <h2 className="mt-2 text-3xl font-semibold">Your account</h2>
            </div>

            <div className="grid gap-4">
              <div>
                <Label className="text-sm text-slate-300">Full name</Label>
                <Input
                  name="fullName"
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="mt-2 bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Email address</Label>
                <Input
                  name="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm((p) => ({ ...p, email: e.target.value }))}
                  className="mt-2 bg-slate-950 border-slate-700 text-white"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-300">Profile photo</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAccountPhoto(e.target.files?.[0] || null)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 file:text-slate-200"
                />
                {accountPhoto && <p className="mt-1 text-xs text-slate-400">Selected: {accountPhoto.name}</p>}
              </div>

              <div>
                <Label className="text-sm text-slate-300">Resume (PDF)</Label>
                {auth?.user?.resumePath && !accountResume && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-xs text-slate-400">Resume already uploaded</span>
                    <a
                      href={auth.user.resumePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-slate-600 px-3 py-1 text-xs text-violet-400 hover:border-violet-500 hover:text-violet-300 transition"
                    >
                      ↓ Download
                    </a>
                  </div>
                )}
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setAccountResume(e.target.files?.[0] || null)}
                  className="mt-2 w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-200 file:text-slate-200"
                />
                {accountResume && <p className="mt-1 text-xs text-slate-400">Selected: {accountResume.name}</p>}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                <Button className="bg-violet-500 text-white hover:bg-violet-400 sm:w-auto" onClick={handleSaveAccount}>
                  Save changes
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-700 text-slate-200 hover:border-slate-500 sm:w-auto"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

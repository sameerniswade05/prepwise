import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getInterviewByIdAPI } from "@/services/api";
import { Button } from "@/components/ui/button";

type Category = {
  name: string;
  score: number;
  maxScore: number;
  bullets: string[];
};

type Feedback = {
  overallScore: number;
  categories: Category[];
  verdict: string;
  summary: string;
};

type Interview = {
  id: string;
  title: string;
  type: string;
  role: string;
  feedback: Feedback;
  createdAt: string;
};

export default function Feedback() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !auth?.token) return;

    getInterviewByIdAPI(id, auth.token)
      .then((res) => setInterview(res.interview))
      .catch(() => {
        toast.error("Could not load feedback");
        navigate("/");
      })
      .finally(() => setLoading(false));
  }, [id, auth?.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-slate-400">Loading feedback...</p>
      </div>
    );
  }

  if (!interview) return null;

  const { feedback } = interview;
  const date = new Date(interview.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = new Date(interview.createdAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const verdictColor =
    feedback.verdict === "Recommended"
      ? "text-green-400 bg-green-400/10 border-green-400/30"
      : feedback.verdict === "Maybe"
      ? "text-yellow-400 bg-yellow-400/10 border-yellow-400/30"
      : "text-red-400 bg-red-400/10 border-red-400/30";

  const scoreColor =
    feedback.overallScore >= 70
      ? "text-green-400"
      : feedback.overallScore >= 50
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500 mb-2">PrepWise</p>
          <h1 className="text-3xl font-bold text-white">
            Feedback on the Interview — {interview.title}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <span>🏆</span>
              <span>
                Overall Impression:{" "}
                <span className={`font-semibold ${scoreColor}`}>
                  {feedback.overallScore}/100
                </span>
              </span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span>📅</span>
              <span>{date} — {time}</span>
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-6">
          <p className="text-slate-300 leading-relaxed">{feedback.summary}</p>
        </div>

        {/* Breakdown */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-5">Breakdown of Evaluation:</h2>
          <ol className="space-y-6">
            {feedback.categories.map((cat, i) => (
              <li key={i}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">
                    {i + 1}. {cat.name} ({cat.score}/{cat.maxScore})
                  </h3>
                  <div className="h-2 w-24 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        cat.score / cat.maxScore >= 0.7
                          ? "bg-green-500"
                          : cat.score / cat.maxScore >= 0.5
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                    />
                  </div>
                </div>
                <ul className="space-y-1 pl-4">
                  {cat.bullets.map((bullet, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-400">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-500" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>

        {/* Verdict */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-white font-semibold">Final Verdict:</span>
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${verdictColor}`}>
              {feedback.verdict}
            </span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            {feedback.verdict === "Recommended"
              ? "This candidate demonstrated strong performance and would be a good fit for the role."
              : feedback.verdict === "Maybe"
              ? "This candidate shows potential but has areas that need further development."
              : "This candidate needs more preparation before they would be considered for the role."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="border-slate-700 text-slate-200 hover:border-slate-500"
            onClick={() => navigate("/")}
          >
            Back to dashboard
          </Button>
          <Button
            className="bg-violet-500 text-white hover:bg-violet-400"
            onClick={() => navigate("/")}
          >
            Retake interview
          </Button>
        </div>
      </div>
    </div>
  );
}

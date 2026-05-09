import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import VapiSDK from "@vapi-ai/web";
// CJS/ESM interop: @vapi-ai/web uses exports.default, Vite may wrap it
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Vapi = ((VapiSDK as any).default ?? VapiSDK) as typeof VapiSDK;
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getInterviewByIdAPI, saveTranscriptAPI, getSystemPromptAPI, getResumeSystemPromptAPI } from "@/services/api";
import { Button } from "@/components/ui/button";

type TranscriptEntry = { role: "assistant" | "user"; content: string };

type Interview = {
  id: string;
  title: string;
  type: string;
  role: string;
  techStack: string;
  duration: string;
  status: string;
};

export default function Interview() {
  const { id } = useParams<{ id: string }>();
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const resumeContext = (location.state as { resumeContext?: string } | null)?.resumeContext;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState<"ai" | "user" | null>(null);
  const [currentMessage, setCurrentMessage] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const vapiRef = useRef<InstanceType<typeof Vapi> | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  useEffect(() => {
    if (!id || !auth?.token) return;

    getInterviewByIdAPI(id, auth.token)
      .then((res) => setInterview(res.interview))
      .catch(() => {
        toast.error("Interview not found");
        navigate("/");
      });
  }, [id, auth?.token]);

  useEffect(() => {
    if (!interview || !auth?.token) return;

    const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
    if (!publicKey) {
      toast.error("VAPI public key not configured. Add VITE_VAPI_PUBLIC_KEY to .env");
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;

    vapi.on("call-start", () => {
      setIsCallActive(true);
      setIsConnecting(false);
      toast.success("Interview started!");
    });

    vapi.on("call-end", async () => {
      setIsCallActive(false);
      setIsSpeaking(null);
      const final = transcriptRef.current;

      if (final.length > 0 && id && auth?.token) {
        try {
          await saveTranscriptAPI(id, final, auth.token);
          navigate(`/feedback/${id}`);
        } catch {
          toast.error("Failed to save interview. Redirecting anyway.");
          navigate(`/feedback/${id}`);
        }
      } else {
        navigate("/");
      }
    });

    vapi.on("speech-start", () => setIsSpeaking("ai"));
    vapi.on("speech-end", () => setIsSpeaking(null));

    vapi.on("message", (msg: { type: string; role?: string; transcript?: string; transcriptType?: string }) => {
      if (msg.type === "transcript" && msg.transcriptType === "final" && msg.role && msg.transcript) {
        const entry: TranscriptEntry = {
          role: msg.role as "assistant" | "user",
          content: msg.transcript,
        };
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);

        if (msg.role === "assistant") {
          setCurrentMessage(msg.transcript);
        } else {
          setIsSpeaking("user");
          setTimeout(() => setIsSpeaking(null), 1000);
        }
      }
    });

    vapi.on("error", (err: Error) => {
      console.error("VAPI error", err);
      toast.error("Connection error. Please try again.");
      setIsConnecting(false);
    });

    startCall(vapi);

    return () => {
      vapi.stop();
    };
  }, [interview]);

  const startCall = async (vapi: InstanceType<typeof Vapi>) => {
    if (!interview || !auth?.token) return;
    setIsConnecting(true);

    try {
      const isResume = interview.type === "Resume";
      const { systemPrompt } = isResume
        ? await getResumeSystemPromptAPI(interview.duration, auth.token, resumeContext)
        : await getSystemPromptAPI(
            {
              type: interview.type,
              role: interview.role,
              techStack: interview.techStack,
              duration: interview.duration,
            },
            auth.token
          );

      const firstMessage = isResume
        ? "Hello! I've reviewed your resume and I'm ready to ask you some personalised questions based on your experience. Let's get started!"
        : "Hello! Welcome to your PrepWise mock interview. I'm your AI interviewer. Whenever you're ready, we can begin!";

      await vapi.start({
        model: {
          provider: "openai",
          model: "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }],
        },
        voice: {
          provider: "11labs",
          voiceId: "sarah",
        },
        name: "PrepWise Interviewer",
        firstMessage,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to start interview. Check your VAPI configuration.");
      setIsConnecting(false);
    }
  };

  const handleRepeat = () => {
    if (currentMessage) {
      toast.info("Repeating last question...");
      vapiRef.current?.send({ type: "say", message: currentMessage });
    }
  };

  const handleLeave = async () => {
    vapiRef.current?.stop();
  };

  if (!interview) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <p className="text-slate-400">Loading interview...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-700" />
            <span className="text-lg font-semibold">{interview.title}</span>
            {interview.type === "Resume" && (
              <span className="flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 text-xs text-indigo-300 font-medium">
                <FileText size={11} />
                Resume-Based
              </span>
            )}
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
            {interview.type === "Resume" ? "Resume-Based" : interview.type} Interview
          </span>
        </div>

        {/* Call panels */}
        <div className="grid grid-cols-2 gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          {/* AI Panel */}
          <div
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 transition-all ${
              isSpeaking === "ai"
                ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/20"
                : "border-slate-700 bg-slate-800/50"
            }`}
          >
            <div
              className={`relative flex h-24 w-24 items-center justify-center rounded-full bg-slate-700 ${
                isSpeaking === "ai" ? "ring-4 ring-violet-500 ring-offset-2 ring-offset-slate-900" : ""
              }`}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
              {(isConnecting || isSpeaking === "ai") && (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-violet-500" />
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-slate-200">AI Interviewer</p>
            {isConnecting && <p className="text-xs text-violet-400 animate-pulse">Connecting...</p>}
          </div>

          {/* User Panel */}
          <div
            className={`flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 transition-all ${
              isSpeaking === "user"
                ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20"
                : "border-slate-700 bg-slate-800/50"
            }`}
          >
            <div
              className={`h-24 w-24 overflow-hidden rounded-full bg-slate-700 ${
                isSpeaking === "user" ? "ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900" : ""
              }`}
            >
              {auth?.user?.profilePicturePath ? (
                <img src={auth.user.profilePicturePath} alt="You" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-300">
                  {auth?.user?.fullName?.charAt(0) ?? "U"}
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-slate-200">{auth?.user?.fullName ?? "You"} (You)</p>
          </div>
        </div>

        {/* Current question */}
        <div className="mt-6 min-h-14 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 flex items-center">
          {currentMessage ? (
            <p className="text-sm text-slate-200">{currentMessage}</p>
          ) : isConnecting ? (
            <p className="text-sm text-slate-500 animate-pulse">Connecting to AI Interviewer...</p>
          ) : (
            <p className="text-sm text-slate-500">Waiting for question...</p>
          )}
        </div>

        {/* Transcript (last few) */}
        {transcript.length > 0 && (
          <div className="mt-4 max-h-40 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-2">
            {transcript.slice(-6).map((entry, i) => (
              <p key={i} className={`text-xs ${entry.role === "assistant" ? "text-violet-300" : "text-slate-300"}`}>
                <span className="font-semibold">{entry.role === "assistant" ? "AI: " : "You: "}</span>
                {entry.content}
              </p>
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="mt-6 flex justify-center gap-4">
          <Button
            variant="outline"
            className="gap-2 border-slate-700 text-slate-200 hover:border-slate-500"
            onClick={handleRepeat}
            disabled={!isCallActive || !currentMessage}
          >
            <span>↻</span> Repeat
          </Button>
          <Button
            className="gap-2 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
            onClick={handleLeave}
          >
            <span>✕</span> Leave interview
          </Button>
        </div>
      </div>
    </div>
  );
}

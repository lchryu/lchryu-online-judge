"use client";

import { useEffect, useMemo, useState, use, useRef } from "react";
import Editor from "@monaco-editor/react";
import { 
  Play, Send, ChevronLeft, Info, Terminal, Settings, 
  History, CheckCircle2, XCircle, Clock, Database, Loader2, 
  BookOpen, ChevronRight, Moon, Sun, Sliders, ExternalLink, Cpu,
  Maximize2, Minimize2, AlignLeft, Check, Volume2, VolumeX, Copy, Code
} from "lucide-react";
import Link from "next/link";
import { api, getErrorMessage } from "@/lib/api";
import { 
  playSuccessSound, playFailureSound, playTickSound, playFailureTickSound, 
  getMuteState, setMuteState 
} from "@/lib/sound";

interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
}

interface TestRunResult {
  index: number;
  status: string;
  time: number | null;
  memory: number | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
}

interface SubmissionResult {
  id: number;
  status: string;
  time: number | null;
  memory: number | null;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  testResults: TestRunResult[];
  createdAt: string;
  languageId: number;
  code: string;
}

const languageOptions = [
  {
    id: 54,
    label: "C++ (GCC 9.2.0)",
    editorLanguage: "cpp",
    template: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    long long a, b;\n    cin >> a >> b;\n    cout << a + b;\n    return 0;\n}\n",
  },
  {
    id: 62,
    label: "Java (OpenJDK 13.0.1)",
    editorLanguage: "java",
    template: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // Write your code here\n    }\n}\n",
  },
  {
    id: 71,
    label: "Python (3.8.1)",
    editorLanguage: "python",
    template: "# Write your code here\n",
  },
  {
    id: 63,
    label: "JavaScript (Node.js 12.14.0)",
    editorLanguage: "javascript",
    template: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf8').trim();\n\n// Write your code here\n",
  },
] as const;

const runningStatuses = new Set(["Pending", "Judging", "Queued", "Running", "In Queue", "Processing"]);

const isSubmissionRunning = (submission: SubmissionResult | null) => {
  if (!submission) return false;
  return runningStatuses.has(submission.status);
};

const isAccepted = (status: string) => status === "Accepted";

const isRunningTest = (status: string) => runningStatuses.has(status);

const getLanguageLabel = (langId: number) => {
  const lang = languageOptions.find((l) => l.id === langId);
  return lang ? lang.label : `Lang ${langId}`;
};

const shortStatus = (status: string) => {
  if (status === "Accepted") return "AC";
  if (status === "Wrong Answer") return "WA";
  if (status === "Time Limit Exceeded") return "TLE";
  if (status === "Compilation Error") return "CE";
  if (status === "Runtime Error") return "RTE";
  if (status === "Internal Error") return "IE";
  if (status === "Processing Timeout") return "TO";
  if (status === "Running") return "RUN";
  if (status === "Queued") return "...";
  return status.slice(0, 3).toUpperCase();
};

interface ParsedDescription {
  mainDesc: string;
  inputDesc: string[];
  outputDesc: string[];
  exampleInput: string;
  exampleOutput: string;
}

function parseProblemDescription(text: string): ParsedDescription | null {
  try {
    const inputIndex = text.indexOf("Input:");
    const outputIndex = text.indexOf("Output:");
    const exampleIndex = text.indexOf("Ví dụ:");

    if (inputIndex === -1 || outputIndex === -1 || exampleIndex === -1) {
      return null;
    }

    const mainDesc = text.substring(0, inputIndex).trim();
    const inputDescRaw = text.substring(inputIndex + 6, outputIndex).trim();
    const outputDescRaw = text.substring(outputIndex + 7, exampleIndex).trim();
    const examplePart = text.substring(exampleIndex + 6).trim();

    const exInputIndex = examplePart.indexOf("Input:");
    const exOutputIndex = examplePart.indexOf("Output:");
    
    let exampleInput = "";
    let exampleOutput = "";

    if (exInputIndex !== -1 && exOutputIndex !== -1) {
      exampleInput = examplePart.substring(exInputIndex + 6, exOutputIndex).trim();
      exampleOutput = examplePart.substring(exOutputIndex + 7).trim();
    } else {
      exampleInput = examplePart;
    }

    const cleanList = (str: string) => {
      return str.split("\n").map(line => {
        let trimmed = line.trim();
        if (trimmed.startsWith("- ")) {
          return trimmed.substring(2).trim();
        }
        if (trimmed.startsWith("* ")) {
          return trimmed.substring(2).trim();
        }
        return trimmed;
      }).filter(Boolean);
    };

    return {
      mainDesc,
      inputDesc: cleanList(inputDescRaw),
      outputDesc: cleanList(outputDescRaw),
      exampleInput,
      exampleOutput
    };
  } catch (err) {
    console.error("Error parsing description:", err);
    return null;
  }
}

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState<string>("");
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  const [languageId, setLanguageId] = useState(54);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  // Tabs and view navigation
  // On desktop, Left panel shows: "description" | "submissions"
  // On mobile, activeTab toggles between: "description" | "code" | "submissions"
  const [activeTab, setActiveTab] = useState<"description" | "code" | "submissions">("description");
  const [viewingSubmission, setViewingSubmission] = useState<SubmissionResult | null>(null);
  
  // Submissions history list
  const [submissionsHistory, setSubmissionsHistory] = useState<SubmissionResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Editor preferences
  const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [fontSize, setFontSize] = useState<number>(14);
  const [showSettings, setShowSettings] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [lineWrapping, setLineWrapping] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monaco editor instance reference for formatting
  const editorRef = useRef<any>(null);

  // Expandable testcases mapping in the detailed report
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number | null>(null);

  const [soundMuted, setSoundMuted] = useState(true);
  useEffect(() => {
    setSoundMuted(getMuteState());
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    setMuteState(nextMuted);
  };

  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);

  const handleCopy = (text: string, isInput: boolean) => {
    navigator.clipboard.writeText(text);
    if (isInput) {
      setCopiedInput(true);
      setTimeout(() => setCopiedInput(false), 1500);
    } else {
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 1500);
    }
  };

  const selectedLanguage = languageOptions.find((language) => language.id === languageId) || languageOptions[0];

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleFormatCode = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument").run();
    }
  };

  // Load draft code from localStorage when languageId or problem id changes
  useEffect(() => {
    if (id && languageId) {
      const draft = localStorage.getItem(`draft_${id}_${languageId}`);
      if (draft !== null) {
        setCode(draft);
      } else {
        // Fallback to default template
        const nextLanguage = languageOptions.find((language) => language.id === languageId);
        if (nextLanguage) setCode(nextLanguage.template);
      }
      setIsDraftLoaded(true);
    }
  }, [id, languageId]);

  // Save active code editor content to localStorage when it changes
  useEffect(() => {
    if (isDraftLoaded && id && languageId) {
      localStorage.setItem(`draft_${id}_${languageId}`, code);
    }
  }, [code, id, languageId, isDraftLoaded]);

  // Escape key listener for fullscreen exit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Calculate statistics for the active/viewed submission
  const progress = useMemo(() => {
    const tests = viewingSubmission?.testResults || [];
    const done = tests.filter((test) => !isRunningTest(test.status) && test.status !== "Queued").length;
    const accepted = tests.filter((test) => isAccepted(test.status)).length;
    const failed = tests.filter((test) => !isAccepted(test.status) && !isRunningTest(test.status) && test.status !== "Queued").length;
    return {
      total: tests.length,
      done,
      accepted,
      failed,
      percent: tests.length ? Math.round((done / tests.length) * 100) : 0,
    };
  }, [viewingSubmission]);

  // Load problem details
  useEffect(() => {
    if (!id) return;
    
    api
      .get<Problem>(`/problems/${id}`)
      .then((res) => {
        setProblem(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  // Fetch submissions history
  const fetchSubmissionsHistory = async () => {
    if (!id) return;
    setLoadingHistory(true);
    try {
      const res = await api.get<SubmissionResult[]>(`/problems/${id}/submissions`);
      setSubmissionsHistory(res.data);
    } catch (err) {
      console.error("Failed to load submissions history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch history when Submissions tab is activated
  useEffect(() => {
    if (activeTab === "submissions" && !viewingSubmission) {
      fetchSubmissionsHistory();
    }
  }, [activeTab, viewingSubmission]);

  // Poll for submission progress in real-time
  useEffect(() => {
    if (!viewingSubmission || !isSubmissionRunning(viewingSubmission)) return;

    const poll = window.setInterval(async () => {
      try {
        const res = await api.get<SubmissionResult>(`/problems/submissions/${viewingSubmission.id}`);
        
        // Play tick sound for finished testcases in this interval
        const prevTests = viewingSubmission.testResults || [];
        const nextTests = res.data.testResults || [];
        let newAC = 0;
        let newFail = 0;
        
        nextTests.forEach((nTest) => {
          const pTest = prevTests.find(p => p.index === nTest.index);
          const wasPending = !pTest || pTest.status === "Queued" || runningStatuses.has(pTest.status);
          const isDone = nTest.status !== "Queued" && !runningStatuses.has(nTest.status);
          if (wasPending && isDone) {
            if (nTest.status === "Accepted") {
              newAC++;
            } else {
              newFail++;
            }
          }
        });
        
        if (newFail > 0) {
          playFailureTickSound();
        } else if (newAC > 0) {
          playTickSound();
        }

        setViewingSubmission(res.data);
        
        if (!isSubmissionRunning(res.data)) {
          setSubmitting(false);
          window.clearInterval(poll);
          // Refresh history
          fetchSubmissionsHistory();

           // Play finish chime and trigger confetti if fully accepted
          const allPassed = nextTests.length > 0 && nextTests.every(t => t.status === "Accepted");
          if (allPassed) {
            playSuccessSound();

            if (typeof window !== "undefined") {
              try {
                const solved = JSON.parse(localStorage.getItem("solved_problems") || "[]");
                const numId = Number(id);
                if (!solved.includes(numId)) {
                  solved.push(numId);
                  localStorage.setItem("solved_problems", JSON.stringify(solved));
                }
              } catch (e) {
                console.error("Error saving solved problem:", e);
              }
            }

            import("canvas-confetti").then((confetti) => {
              confetti.default({
                particleCount: 180,
                spread: 90,
                origin: { y: 0.55 },
                colors: ["#10b981", "#10b981", "#34d399", "#3b82f6", "#f59e0b"]
              });
            });
          } else {
            playFailureSound();
          }

          // Auto-select first failed test case, or first test case if all passed
          const failed = nextTests.find(t => !isAccepted(t.status) && t.status !== "Queued" && !isRunningTest(t.status));
          if (failed) {
            setSelectedTestCaseIndex(failed.index);
          } else if (nextTests.length > 0) {
            setSelectedTestCaseIndex(nextTests[0].index);
          }
        }
      } catch (err) {
        setError(getErrorMessage(err, "Cannot refresh judging progress"));
        setSubmitting(false);
        window.clearInterval(poll);
      }
    }, 1000);

    return () => window.clearInterval(poll);
  }, [viewingSubmission]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setViewingSubmission(null);
    setSelectedTestCaseIndex(null);
    setError("");
    // Automatically open the Submissions tab to show live feedback in Left Pane
    setActiveTab("submissions");
    try {
      const res = await api.post<SubmissionResult>(`/problems/${id}/submit`, {
        code,
        languageId,
      });
      setViewingSubmission(res.data);
      if (res.data.testResults && res.data.testResults.length > 0) {
        setSelectedTestCaseIndex(res.data.testResults[0].index);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Submission failed"));
      setSubmitting(false);
    }
  };

  const updateLanguage = (value: string) => {
    const nextLanguageId = Number.parseInt(value, 10);
    const nextLanguage = languageOptions.find((language) => language.id === nextLanguageId);
    setLanguageId(nextLanguageId);
    if (nextLanguage) setCode(nextLanguage.template);
  };

  const handleViewSubmissionDetails = (sub: SubmissionResult) => {
    setViewingSubmission(sub);
    const tests = sub.testResults || [];
    const failed = tests.find(t => !isAccepted(t.status) && t.status !== "Queued" && !isRunningTest(t.status));
    if (failed) {
      setSelectedTestCaseIndex(failed.index);
    } else if (tests.length > 0) {
      setSelectedTestCaseIndex(tests[0].index);
    } else {
      setSelectedTestCaseIndex(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-60px)]">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wider uppercase">Loading problem...</span>
      </div>
    </div>
  );
  
  if (!problem) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] space-y-4">
      <div className="text-slate-400 font-black text-xl uppercase tracking-wider">Problem not found</div>
      <Link href="/" className="px-5 py-2.5 bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 font-bold rounded-xl flex items-center space-x-2 text-sm shadow hover:bg-blue-600 transition">
        <ChevronLeft size={16} /> <span>Back to Problem Set</span>
      </Link>
    </div>
  );

  // On desktop, if the active tab is 'code' (mobile editor), we default left tab to 'description'
  const leftTab = activeTab === "code" ? "description" : activeTab;

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col lg:h-[calc(100vh-56px-2rem)]">
      
      {/* Header Breadcrumbs & Mobile Tabs */}
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-550 mb-3 shrink-0">
        <div className="flex items-center space-x-2">
          <Link href="/" className="hover:text-blue-600 transition">Problems</Link>
          <ChevronRight size={12} />
          <span className="text-slate-800 dark:text-slate-200 truncate max-w-[150px] sm:max-w-xs">{problem.title}</span>
        </div>

        {/* Mobile View Selector Tabs */}
        <div className="flex lg:hidden bg-slate-100 dark:bg-slate-850 p-1 rounded-xl shadow-inner shrink-0">
          <button 
            onClick={() => { setViewingSubmission(null); setActiveTab("description"); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-150 ${activeTab === "description" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/20 dark:border-slate-800" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"}`}
          >
            Description
          </button>
          <button 
            onClick={() => { setViewingSubmission(null); setActiveTab("code"); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-150 ${activeTab === "code" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/20 dark:border-slate-800" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"}`}
          >
            Editor
          </button>
          <button 
            onClick={() => { setViewingSubmission(null); setActiveTab("submissions"); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all duration-150 ${activeTab === "submissions" ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/20 dark:border-slate-800" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"}`}
          >
            Submissions
          </button>
        </div>
      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-grow min-h-0">
        
        {/* Left Pane (Description & Submissions History / Detail) */}
        <div className={`lg:col-span-5 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors duration-150 ${
          activeTab === "code" ? "hidden lg:flex" : "flex"
        }`}>
          
          {/* Header Bar inside Left Pane */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 flex justify-between items-center shrink-0">
            {viewingSubmission ? (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setViewingSubmission(null)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg transition text-slate-600 dark:text-slate-300 flex items-center space-x-1 text-[11px] font-black uppercase tracking-wider"
                >
                  <ChevronLeft size={14} /> <span>Back</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Submission #{viewingSubmission.id}</span>
              </div>
            ) : (
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab("description")}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                    leftTab === "description" 
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50" 
                      : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-350"
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("submissions")}
                  className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                    leftTab === "submissions" 
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700/50" 
                      : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-350"
                  }`}
                >
                  Submissions
                </button>
              </div>
            )}

            {/* Muted toggle / Quick Tag */}
            <div>
              {viewingSubmission ? (
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition text-slate-500 dark:text-slate-400 flex items-center space-x-1"
                  title={soundMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                </button>
              ) : (
                <span className="bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-350 font-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  PROB #{problem.id}
                </span>
              )}
            </div>
          </div>

          {/* Left Column Scrollable Container */}
          <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-6">
            
            {/* 1. VIEWING DETAILED SUBMISSION REPORT */}
            {viewingSubmission ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* Local Styles for drawing Checkmark and pop effects */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @keyframes drawCheck {
                    to { stroke-dashoffset: 0; }
                  }
                  .animate-draw-check {
                    stroke-dasharray: 40;
                    stroke-dashoffset: 40;
                    animation: drawCheck 0.45s cubic-bezier(0.4, 0, 0.2, 1) 0.1s forwards;
                  }
                  @keyframes pulseGlow {
                    0%, 100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.15); }
                    50% { box-shadow: 0 0 25px rgba(16, 185, 129, 0.35); }
                  }
                  .animate-pulse-glow {
                    animation: pulseGlow 2s infinite ease-in-out;
                  }
                  @keyframes popGrid {
                    0% { transform: scale(0.9); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                  }
                  .animate-pop-grid {
                    animation: popGrid 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                  }
                ` }} />

                {/* Banner Status */}
                <div className={`p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border transition-all duration-300 ${
                  viewingSubmission.status === "Accepted" 
                    ? "bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-950/40 dark:to-green-950/20 border-emerald-500/30 text-white dark:text-green-300 shadow-lg animate-pulse-glow" 
                    : isSubmissionRunning(viewingSubmission)
                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 animate-pulse"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
                }`}>
                  <div className="flex items-center space-x-4">
                    <div className={`p-2.5 rounded-xl transition ${
                      viewingSubmission.status === "Accepted" 
                        ? "bg-white/20 backdrop-blur text-white shadow-md" 
                        : isSubmissionRunning(viewingSubmission)
                        ? "bg-blue-500 text-white"
                        : "bg-red-500 text-white"
                    }`}>
                      {isSubmissionRunning(viewingSubmission) ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : viewingSubmission.status === "Accepted" ? (
                        <svg className="w-5 h-5 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                          <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <XCircle size={20} />
                      )}
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight leading-none mb-1">
                        {isSubmissionRunning(viewingSubmission) ? "Judging Submission..." : viewingSubmission.status}
                      </h2>
                      <p className={`text-[11px] font-semibold ${viewingSubmission.status === "Accepted" ? "opacity-90" : "opacity-75"}`}>
                        Language: {getLanguageLabel(viewingSubmission.languageId)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                      <Clock size={10} className="mr-1" /> CPU Time
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {viewingSubmission.time !== null ? `${viewingSubmission.time.toFixed(3)}s` : "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                      <Database size={10} className="mr-1" /> Memory
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {viewingSubmission.memory !== null ? `${(viewingSubmission.memory / 1024).toFixed(2)} MB` : "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                      <CheckCircle2 size={10} className="mr-1" /> Progress
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {progress.done}/{progress.total}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center">
                      <Cpu size={10} className="mr-1" /> Score
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                      {progress.total > 0 ? Math.round((progress.accepted / progress.total) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                {isSubmissionRunning(viewingSubmission) && (
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <span>Judging Progress</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${progress.percent}%` }} />
                    </div>
                  </div>
                )}

                {/* Testcases Grid / Details */}
                {viewingSubmission.testResults && viewingSubmission.testResults.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest">Test Case Results</h3>
                    
                    {/* Compact Grid */}
                    <div className="flex flex-wrap gap-2">
                      {viewingSubmission.testResults.map((test) => {
                        const isSelected = selectedTestCaseIndex === test.index;
                        const accepts = isAccepted(test.status);
                        const running = isRunningTest(test.status);
                        const queued = test.status === "Queued";
                        const isFinished = !queued && !running;
                        
                        return (
                          <button
                            key={test.index}
                            onClick={() => setSelectedTestCaseIndex(test.index)}
                            className={`w-9 h-9 rounded-lg border flex flex-col items-center justify-center transition-all duration-300 relative ${
                              isSelected 
                                ? "ring-2 ring-blue-500 ring-offset-2 scale-105" 
                                : "hover:scale-105 active:scale-95"
                            } ${
                              accepts 
                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-900/30" 
                                : running 
                                ? "bg-blue-50 dark:bg-blue-950/20 border-blue-500 dark:border-blue-900/60 text-blue-700 dark:text-blue-400 ring-2 ring-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"
                                : queued
                                ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-550 hover:bg-slate-100/50"
                                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/30"
                            } ${isFinished ? "animate-pop-grid" : ""}`}
                            title={`Test Case #${test.index}: ${test.status}`}
                          >
                            <span className="text-[8px] font-black opacity-50">#{test.index}</span>
                            {running ? (
                              <Loader2 size={10} className="animate-spin text-blue-500" />
                            ) : accepts ? (
                              <svg className="w-2.5 h-2.5 stroke-green-600 dark:stroke-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="4.5">
                                <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-[8px] font-black tracking-tight">{shortStatus(test.status)}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Selected Testcase Details Panel */}
                    {selectedTestCaseIndex !== null && (
                      (() => {
                        const test = viewingSubmission.testResults.find((t) => t.index === selectedTestCaseIndex);
                        if (!test) return null;
                        
                        const accepts = isAccepted(test.status);
                        const running = isRunningTest(test.status);
                        const queued = test.status === "Queued";
                        
                        return (
                          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/30 dark:bg-slate-800/20 space-y-3 shadow-inner">
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-black text-slate-800 dark:text-slate-300 font-mono">Test Case #{test.index}</span>
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                  accepts 
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400" 
                                    : running 
                                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 animate-pulse"
                                    : queued
                                    ? "bg-slate-50 dark:bg-slate-850/30 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-550"
                                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400"
                                }`}>
                                  {test.status}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                <div>
                                  <span className="text-slate-400 dark:text-slate-550 font-sans">Time:</span> {test.time !== null ? `${test.time.toFixed(3)}s` : "—"}
                                </div>
                                <div>
                                  <span className="text-slate-400 dark:text-slate-550 font-sans">Memory:</span> {test.memory !== null ? `${(test.memory / 1024).toFixed(2)} MB` : "—"}
                                </div>
                              </div>
                            </div>

                            {/* Logs and Feedbacks */}
                            {(test.message || test.compileOutput || test.stderr || test.stdout) ? (
                              <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                {test.message && (
                                  <div>
                                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Verdict Message</div>
                                    <p className="font-sans text-xs text-red-650 dark:text-red-400 font-bold">{test.message}</p>
                                  </div>
                                )}
                                {test.compileOutput && (
                                  <div>
                                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-0.5">Compile Output</div>
                                    <pre className="bg-slate-900 dark:bg-black text-slate-200 p-2.5 rounded-lg overflow-auto max-h-32 text-[10px] font-mono whitespace-pre-wrap">{test.compileOutput}</pre>
                                  </div>
                                )}
                                {test.stderr && (
                                  <div>
                                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-0.5">Standard Error</div>
                                    <pre className="bg-slate-900 dark:bg-black text-red-450 p-2.5 rounded-lg overflow-auto max-h-32 text-[10px] font-mono whitespace-pre-wrap">{test.stderr}</pre>
                                  </div>
                                )}
                                {test.stdout && (
                                  <div>
                                    <div className="text-[8px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-0.5">Standard Output</div>
                                    <pre className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-350 p-2.5 rounded-lg overflow-auto max-h-32 text-[10px] font-mono whitespace-pre shadow-inner">{test.stdout}</pre>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-[11px] italic text-slate-400 dark:text-slate-550 font-sans pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                No outputs or logs generated for this test case.
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}

                {/* Compilation Error or stderr banner */}
                {viewingSubmission.compileOutput && !viewingSubmission.testResults?.length && (
                  <div className="space-y-1.5">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Compilation Log</h3>
                    <pre className="bg-slate-900 dark:bg-black text-red-400 p-3.5 rounded-xl overflow-auto text-[11px] font-mono max-h-48 border border-red-950/40 dark:border-red-950/60 whitespace-pre-wrap shadow-inner">
                      {viewingSubmission.compileOutput}
                    </pre>
                  </div>
                )}

                {/* Submitted Code Viewer */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Submitted Code</h3>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm h-64 relative">
                    <Editor
                      height="100%"
                      language={getLanguageLabel(viewingSubmission.languageId).toLowerCase().includes("c++") ? "cpp" : getLanguageLabel(viewingSubmission.languageId).toLowerCase()}
                      theme={editorTheme}
                      value={viewingSubmission.code}
                      options={{
                        readOnly: true,
                        fontSize: 12,
                        minimap: { enabled: false },
                        scrollbar: { vertical: "visible" },
                        lineNumbers: "on",
                        fontFamily: "var(--font-geist-mono)",
                        domReadOnly: true,
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : leftTab === "submissions" ? (
              // 2. SUBMISSIONS HISTORY LIST
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {loadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <Loader2 className="animate-spin text-blue-600" size={24} />
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Loading history...</span>
                  </div>
                ) : submissionsHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3 text-slate-400 dark:text-slate-550">
                    <History size={40} className="opacity-25" />
                    <p className="italic text-xs font-medium text-center">You haven't submitted any code for this problem yet.</p>
                  </div>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200/60 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                          <th className="px-4 py-2.5">ID / Date</th>
                          <th className="px-4 py-2.5">Language</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 font-mono">
                        {submissionsHistory.map((sub) => {
                          const accepts = isAccepted(sub.status);
                          const running = isSubmissionRunning(sub);
                          
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                              <td className="px-4 py-3">
                                <div className="font-bold text-slate-700 dark:text-slate-350">#{sub.id}</div>
                                <div className="text-[9px] font-sans text-slate-400 dark:text-slate-500 mt-0.5">
                                  {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                {getLanguageLabel(sub.languageId).split(" ")[0]}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                  accepts 
                                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400" 
                                    : running 
                                    ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 animate-pulse"
                                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-450"
                                }`}>
                                  {shortStatus(sub.status)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-sans">
                                <button 
                                  onClick={() => handleViewSubmissionDetails(sub)}
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white font-bold transition flex items-center space-x-1 ml-auto text-[10px]"
                                >
                                  <span>Details</span> <ExternalLink size={9} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              // 3. PROBLEM DESCRIPTION TAB CONTENT
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-150">
                
                {/* Header Information */}
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                      10 Points
                    </span>
                    <span className="bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-900/50 text-green-700 dark:text-green-450 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                      Easy
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
                    {problem.title}
                  </h1>
                </div>

                {/* Parsed Problem Description Details */}
                {(() => {
                  const parsed = parseProblemDescription(problem.description);
                  if (!parsed) {
                    return (
                      <article className="prose prose-slate dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed text-[13px] font-sans">
                          {problem.description}
                        </div>
                      </article>
                    );
                  }
                  
                  return (
                    <div className="space-y-5 font-sans">
                      {/* Main Description */}
                      <div className="text-slate-700 dark:text-slate-300 leading-relaxed text-[13px] whitespace-pre-wrap font-medium">
                        {parsed.mainDesc}
                      </div>

                      {/* Input specs */}
                      {parsed.inputDesc.length > 0 && (
                        <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500" />
                          <h3 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                            <Info size={12} className="mr-1 text-blue-500" /> Input Specification (Đầu vào)
                          </h3>
                          <ul className="space-y-1.5 text-xs text-slate-650 dark:text-slate-350 font-medium">
                            {parsed.inputDesc.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-blue-500 mr-2 select-none font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Output specs */}
                      {parsed.outputDesc.length > 0 && (
                        <div className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 relative overflow-hidden">
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-green-500" />
                          <h3 className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center">
                            <Info size={12} className="mr-1 text-green-500" /> Output Specification (Đầu ra)
                          </h3>
                          <ul className="space-y-1.5 text-xs text-slate-650 dark:text-slate-350 font-medium">
                            {parsed.outputDesc.map((item, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-green-500 mr-2 select-none font-bold">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sample Cases side-by-side or stacked */}
                      {(parsed.exampleInput || parsed.exampleOutput) && (
                        <div className="space-y-2.5">
                          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center">
                            <Terminal size={12} className="mr-1 text-slate-450" /> Sample Cases
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Sample Input */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 overflow-hidden flex flex-col shadow-inner">
                              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/40 flex justify-between items-center text-[10px] font-bold text-slate-500">
                                <span>Input</span>
                                <button
                                  onClick={() => handleCopy(parsed.exampleInput, true)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center"
                                  title="Copy Input"
                                >
                                  {copiedInput ? <Check size={11} className="text-green-600 font-bold" /> : <Copy size={11} />}
                                </button>
                              </div>
                              <pre className="p-3 font-mono text-xs text-slate-800 dark:text-slate-300 whitespace-pre overflow-auto max-h-40 bg-slate-50/5 select-all">
                                {parsed.exampleInput}
                              </pre>
                            </div>

                            {/* Sample Output */}
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/30 dark:bg-slate-950/20 overflow-hidden flex flex-col shadow-inner">
                              <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/40 flex justify-between items-center text-[10px] font-bold text-slate-500">
                                <span>Output</span>
                                <button
                                  onClick={() => handleCopy(parsed.exampleOutput, false)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center"
                                  title="Copy Output"
                                >
                                  {copiedOutput ? <Check size={11} className="text-green-600 font-bold" /> : <Copy size={11} />}
                                </button>
                              </div>
                              <pre className="p-3 font-mono text-xs text-slate-800 dark:text-slate-300 whitespace-pre overflow-auto max-h-40 bg-slate-50/5">
                                {parsed.exampleOutput}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Specs Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Specifications</h3>
                  <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-600 dark:text-slate-450 font-mono">
                    <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400 dark:text-slate-500 font-sans">Time Limit</span>
                      <span className="text-slate-850 dark:text-slate-250">{problem.timeLimit}s</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <span className="text-slate-400 dark:text-slate-550 font-sans">Memory Limit</span>
                      <span className="text-slate-850 dark:text-slate-250">{problem.memoryLimit} MB</span>
                    </div>
                  </div>
                </div>

                {/* Help Tips */}
                <div className="p-4 bg-slate-50/80 dark:bg-slate-900/20 border border-slate-200/60 dark:border-slate-800 rounded-2xl text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-2">
                  <div className="flex items-center space-x-1 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
                    <BookOpen size={12} className="text-blue-500" />
                    <span>Coding Help</span>
                  </div>
                  <p>
                    Ensure you read input from **standard input** (stdin) and write output to **standard output** (stdout). Use C++ templates or Python templates by selecting the language in the editor.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane (Persistent Code Sandbox Editor) */}
        <div className={`lg:col-span-7 flex flex-col min-h-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors duration-150 ${
          activeTab === "code" ? "flex animate-in fade-in duration-150" : "hidden lg:flex"
        }`}>
          
          {/* Settings Bar */}
          <div className="px-5 py-3 border-b border-slate-200/60 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-850/20 flex flex-wrap justify-between items-center gap-3 shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Language:</span>
              <select
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-bold bg-white dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-sm"
                value={languageId}
                onChange={(e) => updateLanguage(e.target.value)}
              >
                {languageOptions.map((language) => (
                  <option key={language.id} value={language.id}>{language.label}</option>
                ))}
              </select>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              {/* Format Code */}
              <button
                onClick={handleFormatCode}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition shadow-sm"
                title="Format Code"
              >
                <AlignLeft size={13} />
              </button>

              {/* Fullscreen */}
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-550 dark:text-slate-400 transition shadow-sm"
                title="Fullscreen Mode"
              >
                <Maximize2 size={13} />
              </button>

              {/* Theme Toggle */}
              <button 
                onClick={() => setEditorTheme(editorTheme === "vs-dark" ? "light" : "vs-dark")}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-550 dark:text-slate-400 shadow-sm"
                title="Toggle Editor Theme"
              >
                {editorTheme === "vs-dark" ? <Sun size={13} /> : <Moon size={13} />}
              </button>
              
              {/* Settings Slider panel dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 border rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-550 dark:text-slate-400 shadow-sm flex items-center space-x-1 text-xs font-bold ${showSettings ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20" : "border-slate-200 dark:border-slate-800"}`}
                >
                  <Sliders size={13} /> <span>Settings</span>
                </button>
                
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-2xl shadow-xl p-3.5 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-100">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-1">Preferences</p>
                    
                    {/* Font Size */}
                    <div className="flex flex-col space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Font Size ({fontSize}px)</span>
                      <input 
                        type="range" 
                        min="10" 
                        max="24" 
                        value={fontSize} 
                        onChange={(e) => setFontSize(Number.parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>

                    {/* Minimap toggle */}
                    <label className="flex items-center justify-between cursor-pointer select-none text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      <span>Show Minimap</span>
                      <input 
                        type="checkbox" 
                        checked={showMinimap} 
                        onChange={() => setShowMinimap(!showMinimap)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>

                    {/* Word Wrap toggle */}
                    <label className="flex items-center justify-between cursor-pointer select-none text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      <span>Line Wrapping</span>
                      <input 
                        type="checkbox" 
                        checked={lineWrapping} 
                        onChange={() => setLineWrapping(!lineWrapping)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-grow relative min-h-0 w-full h-[400px] lg:h-auto">
            <Editor
              height="100%"
              language={selectedLanguage.editorLanguage}
              theme={editorTheme}
              value={code}
              options={{
                fontSize: fontSize,
                minimap: { enabled: showMinimap },
                wordWrap: lineWrapping ? "on" : "off",
                scrollbar: { vertical: "visible", horizontal: "hidden" },
                lineNumbers: "on",
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
                padding: { top: 12, bottom: 12 },
                fontFamily: "var(--font-geist-mono)",
              }}
              onMount={handleEditorDidMount}
              onChange={(value) => setCode(value || "")}
            />
          </div>

          {/* Bottom Actions Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850/30 border-t border-slate-200/80 dark:border-slate-850 flex justify-between items-center gap-3 shrink-0">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-bold flex items-center">
              <Terminal size={12} className="mr-1.5 text-blue-500" />
              <span>Autosave active.</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 active:scale-95 transform shrink-0"
              >
                {submitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Judging...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Submit Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* FULLSCREEN EDITOR OVERLAY */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-950 p-6 flex flex-col space-y-4 animate-in fade-in duration-150">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <div className="flex items-center space-x-3">
              <span className="bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-200 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                PROB #{problem.id}
              </span>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">{problem.title}</h2>
            </div>
            
            <div className="flex items-center space-x-3">
              <select
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-sm"
                value={languageId}
                onChange={(e) => updateLanguage(e.target.value)}
              >
                {languageOptions.map((language) => (
                  <option key={language.id} value={language.id}>{language.label}</option>
                ))}
              </select>

              <button
                onClick={handleFormatCode}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 transition shadow-sm"
                title="Format Code"
              >
                <AlignLeft size={16} />
              </button>

              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400 transition flex items-center space-x-1.5 text-xs font-bold"
              >
                <Minimize2 size={14} /> <span>Exit Fullscreen</span>
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50 flex items-center space-x-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>{submitting ? "Judging..." : "Submit Code"}</span>
              </button>
            </div>
          </div>
          
          <div className="flex-grow min-h-0 relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner">
            <Editor
              height="100%"
              language={selectedLanguage.editorLanguage}
              theme={editorTheme}
              value={code}
              options={{
                fontSize: fontSize,
                minimap: { enabled: showMinimap },
                wordWrap: lineWrapping ? "on" : "off",
                scrollbar: { vertical: "visible", horizontal: "hidden" },
                lineNumbers: "on",
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 3,
                padding: { top: 15, bottom: 15 },
                fontFamily: "var(--font-geist-mono)",
              }}
              onMount={handleEditorDidMount}
              onChange={(value) => setCode(value || "")}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4 text-xs font-bold text-red-700 dark:text-red-400 shadow-sm flex items-center space-x-2 mt-4 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}
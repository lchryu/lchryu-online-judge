"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  History, Loader2, Calendar, Clock, Database, Code2, 
  ExternalLink, Eye, X, CheckCircle2, XCircle, Terminal, 
  AlertTriangle, Filter, RefreshCw, Volume2, VolumeX
} from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import Editor from "@monaco-editor/react";
import { 
  playSuccessSound, playFailureSound, playTickSound, playFailureTickSound, 
  getMuteState, setMuteState 
} from "@/lib/sound";

interface ProblemShort {
  id: number;
  title: string;
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

interface Submission {
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
  problem?: ProblemShort;
}

const languageOptions = [
  { id: 54, label: "C++ (GCC 9.2.0)", editorLanguage: "cpp" },
  { id: 62, label: "Java (OpenJDK 13.0.1)", editorLanguage: "java" },
  { id: 71, label: "Python (3.8.1)", editorLanguage: "python" },
  { id: 63, label: "JavaScript (Node.js 12.14.0)", editorLanguage: "javascript" },
] as const;

const runningStatuses = new Set(["Pending", "Judging", "Queued", "Running", "In Queue", "Processing"]);

const isSubmissionRunning = (sub: Submission) => {
  return runningStatuses.has(sub.status);
};

const getLanguageLabel = (langId: number) => {
  const lang = languageOptions.find((l) => l.id === langId);
  return lang ? lang.label : `Lang ${langId}`;
};

const getLanguageEditorLanguage = (langId: number) => {
  const lang = languageOptions.find((l) => l.id === langId);
  return lang ? lang.editorLanguage : "text";
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  const [detailedSubmission, setDetailedSubmission] = useState<Submission | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState<number | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [langFilter, setLangFilter] = useState<string>("All");
  const [problemSearch, setProblemSearch] = useState<string>("");

  // Sound States
  const [soundMuted, setSoundMuted] = useState(true);
  useEffect(() => {
    setSoundMuted(getMuteState());
  }, []);

  const handleToggleMute = () => {
    const nextMuted = !soundMuted;
    setSoundMuted(nextMuted);
    setMuteState(nextMuted);
  };

  const fetchSubmissions = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get<Submission[]>("/problems/submissions");
      setSubmissions(res.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, "Failed to load submissions"));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial Load
  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Periodic polling for submissions list to update any active runs
  useEffect(() => {
    const hasRunning = submissions.some(isSubmissionRunning);
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetchSubmissions(false);
    }, 2000);

    return () => clearInterval(interval);
  }, [submissions]);

  // Load detailed submission
  useEffect(() => {
    if (selectedSubmissionId === null) {
      setDetailedSubmission(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      setSelectedTestCaseIndex(null);
      try {
        const res = await api.get<Submission>(`/problems/submissions/${selectedSubmissionId}`);
        setDetailedSubmission(res.data);
        
        // Auto select first failed or first test case
        const tests = res.data.testResults || [];
        const failed = tests.find(t => t.status !== "Accepted" && t.status !== "Queued" && !runningStatuses.has(t.status));
        if (failed) {
          setSelectedTestCaseIndex(failed.index);
        } else if (tests.length > 0) {
          setSelectedTestCaseIndex(tests[0].index);
        }
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err, "Failed to load submission details"));
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedSubmissionId]);

  // Poll current detailed submission if it is running
  useEffect(() => {
    if (!detailedSubmission || !isSubmissionRunning(detailedSubmission)) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get<Submission>(`/problems/submissions/${detailedSubmission.id}`);
        
        // Compare test results for tick sound
        const prevTests = detailedSubmission.testResults || [];
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

        setDetailedSubmission(res.data);
        
        if (!isSubmissionRunning(res.data)) {
          clearInterval(interval);
          fetchSubmissions(false); // Update parent list as well

          // Play finish chime and trigger confetti if fully accepted
          const allPassed = nextTests.length > 0 && nextTests.every(t => t.status === "Accepted");
          if (allPassed) {
            playSuccessSound();

            if (typeof window !== "undefined" && res.data.problem?.id) {
              try {
                const solved = JSON.parse(localStorage.getItem("solved_problems") || "[]");
                const numId = Number(res.data.problem.id);
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
        }
      } catch (err) {
        console.error("Error polling detailed submission:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [detailedSubmission]);

  // Filter Submissions logic
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      if (statusFilter !== "All") {
        if (statusFilter === "Accepted" && sub.status !== "Accepted") return false;
        if (statusFilter === "Failed" && (sub.status === "Accepted" || runningStatuses.has(sub.status))) return false;
        if (statusFilter === "Running" && !runningStatuses.has(sub.status)) return false;
      }
      if (langFilter !== "All" && sub.languageId !== parseInt(langFilter, 10)) {
        return false;
      }
      if (problemSearch.trim()) {
        const query = problemSearch.toLowerCase().trim();
        const pId = sub.problem?.id?.toString() || "";
        const pTitle = sub.problem?.title?.toLowerCase() || "";
        if (!pId.includes(query) && !pTitle.includes(query)) return false;
      }
      return true;
    });
  }, [submissions, statusFilter, langFilter, problemSearch]);

  const stats = useMemo(() => {
    const total = submissions.length;
    const accepted = submissions.filter(s => s.status === "Accepted").length;
    const failed = submissions.filter(s => s.status !== "Accepted" && !runningStatuses.has(s.status)).length;
    const running = submissions.filter(isSubmissionRunning).length;
    return { total, accepted, failed, running };
  }, [submissions]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-6">
      
      {/* Local Styles */}
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
          0% { transform: scale(0.9); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-grid {
          animation: popGrid 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      ` }} />

      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2 tracking-tight flex items-center">
            <History className="mr-2.5 text-blue-600 dark:text-blue-500" size={28} />
            Submission Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Live log of programming tasks submitted and evaluated by the automated grading backend.
          </p>
        </div>
        <button
          onClick={() => fetchSubmissions(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 transition shadow-sm"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Quick Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
            <History size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">Total Submissions</p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-200">{stats.total}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-455 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-wider">Accepted</p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-200">
              {stats.accepted} <span className="text-xs font-normal text-slate-400">({stats.total ? Math.round((stats.accepted/stats.total)*100) : 0}%)</span>
            </p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-405 rounded-xl">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">Rejected</p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-200">{stats.failed}</p>
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center space-x-3.5 shadow-sm">
          <div className="p-2.5 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-405 rounded-xl">
            <Loader2 className={stats.running ? "animate-spin" : ""} size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-wider">In Queue / Judging</p>
            <p className="text-xl font-black text-slate-800 dark:text-slate-200">{stats.running}</p>
          </div>
        </div>
      </div>

      {/* Filter Options Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-250 dark:border-slate-850 rounded-2xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-inner">
        <div className="flex items-center space-x-2">
          <Filter size={16} className="text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-bold text-slate-650 dark:text-slate-400">Filter Log:</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center flex-grow md:flex-grow-0">
          {/* Problem search */}
          <input
            type="text"
            placeholder="Search Problem (ID or Title)..."
            value={problemSearch}
            onChange={(e) => setProblemSearch(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-955 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full sm:w-52"
          />

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-955 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="All">All Verdicts</option>
            <option value="Accepted">Accepted (AC)</option>
            <option value="Failed">Failed (WA, TLE, RTE, CE)</option>
            <option value="Running">Judging / Active</option>
          </select>

          {/* Language select */}
          <select
            value={langFilter}
            onChange={(e) => setLangFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold bg-white dark:bg-slate-955 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
          >
            <option value="All">All Languages</option>
            {languageOptions.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading submissions history...</span>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 dark:text-slate-500 italic shadow-sm">
          <History size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No submissions match the selected filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4">Problem</th>
                  <th className="px-6 py-4">Language</th>
                  <th className="px-6 py-4">Verdict</th>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Memory</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {filteredSubmissions.map((sub) => {
                  const isAC = sub.status === "Accepted";
                  const isRun = isSubmissionRunning(sub);
                  
                  return (
                    <tr key={sub.id} className="hover:bg-blue-50/10 dark:hover:bg-blue-955/5 transition group">
                      <td className="px-6 py-3.5 font-bold text-slate-700 dark:text-slate-400">
                        #{sub.id}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-slate-450 font-sans">
                        {new Date(sub.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5 font-sans">
                        {sub.problem ? (
                          <Link
                            href={`/problems/${sub.problem.id}`}
                            className="font-bold text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                          >
                            <span className="underline decoration-dotted decoration-slate-300 dark:decoration-slate-700 hover:decoration-blue-500">
                              {sub.problem.id}. {sub.problem.title}
                            </span>
                            <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition text-slate-400 ml-1" />
                          </Link>
                        ) : (
                          <span className="text-slate-400 italic">Unknown Problem</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-slate-650 dark:text-slate-350">
                        {getLanguageLabel(sub.languageId)}
                      </td>
                      <td className="px-6 py-3.5 font-sans">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border transition-colors ${
                          isAC 
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400" 
                            : isRun
                            ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 animate-pulse"
                            : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400"
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-slate-450">
                        {sub.time !== null ? `${sub.time.toFixed(3)}s` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500 dark:text-slate-450">
                        {sub.memory !== null ? `${(sub.memory / 1024).toFixed(2)} MB` : "—"}
                      </td>
                      <td className="px-6 py-3.5 text-right font-sans">
                        <button
                          onClick={() => setSelectedSubmissionId(sub.id)}
                          className="inline-flex items-center space-x-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-955 dark:hover:text-white rounded-lg transition font-bold text-[11px]"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAILED INSPECT MODAL/DRAWER */}
      {selectedSubmissionId !== null && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center space-x-2">
                <span className="bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-300 font-black text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  Submission #{selectedSubmissionId}
                </span>
                {detailedSubmission?.problem && (
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-md">
                    / {detailedSubmission.problem.title}
                  </span>
                )}
              </div>
              
              {/* Sound control and close button */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleToggleMute}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-slate-500 dark:text-slate-400 flex items-center space-x-1.5 text-xs font-bold"
                  title={soundMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  <span className="hidden sm:inline">{soundMuted ? "Muted" : "Sound On"}</span>
                </button>
                <button
                  onClick={() => setSelectedSubmissionId(null)}
                  className="p-1 text-slate-400 hover:text-slate-750 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest">Fetching details...</span>
                </div>
              ) : detailedSubmission ? (
                <>
                  {/* Verdict Banner */}
                  <div className={`p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border transition-all duration-350 ${
                    detailedSubmission.status === "Accepted" 
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 dark:from-emerald-950/40 dark:to-green-950/20 border-emerald-500/30 text-white dark:text-green-300 shadow-lg animate-pulse-glow" 
                      : isSubmissionRunning(detailedSubmission)
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-800 dark:text-blue-300"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
                  }`}>
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl transition ${
                        detailedSubmission.status === "Accepted" 
                          ? "bg-white/20 backdrop-blur text-white shadow-md" 
                          : isSubmissionRunning(detailedSubmission)
                          ? "bg-blue-500 text-white"
                          : "bg-red-500 text-white"
                      }`}>
                        {isSubmissionRunning(detailedSubmission) ? (
                          <Loader2 className="animate-spin" size={24} />
                        ) : detailedSubmission.status === "Accepted" ? (
                          <svg className="w-6 h-6 stroke-white" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                            <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <XCircle size={24} />
                        )}
                      </div>
                      <div>
                        <h2 className="text-xl font-black tracking-tight leading-none mb-1">
                          {isSubmissionRunning(detailedSubmission) ? "Evaluating Solution..." : detailedSubmission.status}
                        </h2>
                        <p className={`text-xs font-semibold ${detailedSubmission.status === "Accepted" ? "opacity-90" : "opacity-75"} font-mono`}>
                          {getLanguageLabel(detailedSubmission.languageId)}
                        </p>
                      </div>
                    </div>
                    
                    {detailedSubmission.problem && (
                      <Link
                        href={`/problems/${detailedSubmission.problem.id}`}
                        onClick={() => setSelectedSubmissionId(null)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm flex items-center space-x-1 ${
                          detailedSubmission.status === "Accepted"
                            ? "bg-white/10 dark:bg-white/5 border border-white/25 hover:bg-white/20 text-white"
                            : "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-205 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span>Go to Problem</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </div>

                  {/* CPU / Memory / Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center mb-1">
                        <Clock size={12} className="mr-1" /> Execution Time
                      </span>
                      <span className="text-base font-black text-slate-805 dark:text-slate-200 font-mono">
                        {detailedSubmission.time !== null ? `${detailedSubmission.time.toFixed(3)}s` : "N/A"}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center mb-1">
                        <Database size={12} className="mr-1" /> Max Memory
                      </span>
                      <span className="text-base font-black text-slate-805 dark:text-slate-200 font-mono">
                        {detailedSubmission.memory !== null ? `${(detailedSubmission.memory / 1024).toFixed(2)} MB` : "N/A"}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center mb-1">
                        <CheckCircle2 size={12} className="mr-1" /> Testcases Passed
                      </span>
                      <span className="text-base font-black text-slate-805 dark:text-slate-200 font-mono">
                        {detailedSubmission.testResults?.filter(t => t.status === "Accepted").length || 0} / {detailedSubmission.testResults?.length || 0}
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center mb-1">
                        <Calendar size={12} className="mr-1" /> Date & Time
                      </span>
                      <span className="text-[13px] font-bold text-slate-850 dark:text-slate-200 font-sans leading-none pt-1">
                        {new Date(detailedSubmission.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Test cases grid details */}
                  {detailedSubmission.testResults && detailedSubmission.testResults.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Test Case Results</h3>
                      
                      {/* Grid representation */}
                      <div className="flex flex-wrap gap-2">
                        {detailedSubmission.testResults.map((test) => {
                          const isSelected = selectedTestCaseIndex === test.index;
                          const isPassed = test.status === "Accepted";
                          const isRun = runningStatuses.has(test.status);
                          const isFinished = !isRun && test.status !== "Queued";
                          
                          return (
                            <button
                              key={test.index}
                              onClick={() => setSelectedTestCaseIndex(test.index)}
                              className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 relative ${
                                isSelected 
                                  ? "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-105" 
                                  : "hover:scale-110 active:scale-95"
                              } ${
                                isPassed 
                                  ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/60 text-green-700 dark:text-green-455 hover:bg-green-100/80 dark:hover:bg-green-900/30" 
                                  : isRun
                                  ? "bg-blue-50 dark:bg-blue-950/20 border-blue-550 dark:border-blue-900/60 text-blue-700 dark:text-blue-455 ring-2 ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse"
                                  : test.status === "Queued"
                                  ? "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-850 text-slate-400 dark:text-slate-550 hover:bg-slate-100/85 dark:hover:bg-slate-800/40"
                                  : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-455 hover:bg-red-100/80 dark:hover:bg-red-900/30"
                              } ${isFinished ? "animate-pop-grid" : ""}`}
                              title={`Testcase #${test.index}: ${test.status}`}
                            >
                              <span className="text-[9px] font-black opacity-60 mb-0.5 font-mono">#{test.index}</span>
                              {isRun ? (
                                <Loader2 size={12} className="animate-spin text-blue-550" />
                              ) : isPassed ? (
                                <svg className="w-3 h-3 stroke-green-600 dark:stroke-green-400" fill="none" viewBox="0 0 24 24" strokeWidth="4.5">
                                  <path className="animate-draw-check" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <span className="text-[9px] font-black tracking-tighter">
                                  {test.status === "Wrong Answer" ? "WA" : test.status === "Time Limit Exceeded" ? "TLE" : test.status === "Compilation Error" ? "CE" : test.status === "Runtime Error" ? "RTE" : test.status.slice(0, 3).toUpperCase()}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected testcase detail panel */}
                      {selectedTestCaseIndex !== null && (
                        (() => {
                          const test = detailedSubmission.testResults.find(t => t.index === selectedTestCaseIndex);
                          if (!test) return null;
                          const isPassed = test.status === "Accepted";
                          const isRun = runningStatuses.has(test.status);
                          
                          return (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/30 dark:bg-slate-800/10 space-y-4 shadow-inner">
                              <div className="flex flex-wrap justify-between items-center gap-3">
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs font-black text-slate-800 dark:text-slate-300 font-mono">Test Case #{test.index}</span>
                                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                    isPassed 
                                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/50 text-green-700 dark:text-green-400" 
                                      : isRun
                                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 animate-pulse"
                                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400"
                                  }`}>
                                    {test.status}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-4 text-xs text-slate-505 dark:text-slate-400 font-mono">
                                  <div>
                                    <span className="text-slate-455 dark:text-slate-550 font-sans">Time:</span> {test.time !== null ? `${test.time.toFixed(3)}s` : "—"}
                                  </div>
                                  <div>
                                    <span className="text-slate-455 dark:text-slate-550 font-sans">Memory:</span> {test.memory !== null ? `${(test.memory / 1024).toFixed(2)} MB` : "—"}
                                  </div>
                                </div>
                              </div>

                              {(test.message || test.compileOutput || test.stderr || test.stdout) ? (
                                <div className="space-y-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 font-mono text-[11px]">
                                  {test.message && (
                                    <div>
                                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 font-sans">Verdict Message</div>
                                      <p className="font-sans text-xs text-red-600 dark:text-red-400 font-bold">{test.message}</p>
                                    </div>
                                  )}
                                  {test.compileOutput && (
                                    <div>
                                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1 font-sans">Compile Output</div>
                                      <pre className="bg-slate-900 dark:bg-black text-slate-250 p-3 rounded-xl overflow-auto max-h-40 whitespace-pre-wrap">{test.compileOutput}</pre>
                                    </div>
                                  )}
                                  {test.stderr && (
                                    <div>
                                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1 font-sans">Standard Error</div>
                                      <pre className="bg-slate-900 dark:bg-black text-red-400 p-3 rounded-xl overflow-auto max-h-40 whitespace-pre-wrap">{test.stderr}</pre>
                                    </div>
                                  )}
                                  {test.stdout && (
                                    <div>
                                      <div className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest mb-1 font-sans">Standard Output</div>
                                      <pre className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-350 p-3 rounded-xl overflow-auto max-h-40 whitespace-pre-wrap shadow-inner">{test.stdout}</pre>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs italic text-slate-400 dark:text-slate-550 font-sans pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                                  No outputs or logs generated for this test case.
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  )}

                  {/* Compilation log if test results are empty but compile log is present */}
                  {detailedSubmission.compileOutput && (!detailedSubmission.testResults || detailedSubmission.testResults.length === 0) && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Compile Log</h3>
                      <pre className="bg-slate-900 dark:bg-black text-red-400 p-4 rounded-xl overflow-auto text-xs font-mono max-h-52 border border-red-950/40 whitespace-pre-wrap">
                        {detailedSubmission.compileOutput}
                      </pre>
                    </div>
                  )}

                  {/* Submission Source Code */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">Submitted Code</h3>
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-inner h-72 relative">
                      <Editor
                        height="100%"
                        language={getLanguageEditorLanguage(detailedSubmission.languageId)}
                        theme="vs-dark"
                        value={detailedSubmission.code || ""}
                        options={{
                          readOnly: true,
                          fontSize: 12,
                          minimap: { enabled: false },
                          scrollbar: { vertical: "visible", horizontal: "auto" },
                          lineNumbers: "on",
                          fontFamily: "var(--font-geist-mono)",
                          domReadOnly: true,
                          padding: { top: 12 },
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-slate-400">
                  <AlertTriangle className="mx-auto text-yellow-500 mb-2" size={32} />
                  <p>Could not retrieve submission logs.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedSubmissionId(null)}
                className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold rounded-xl text-xs font-black uppercase tracking-wider transition"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 p-4 mt-6 text-xs font-bold text-red-700 dark:text-red-400 shadow-sm flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-650 dark:bg-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

    </div>
  );
}

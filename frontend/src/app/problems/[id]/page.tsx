"use client";

import { useEffect, useState, use } from "react";
import axios from "axios";
import Editor from "@monaco-editor/react";
import { Play, Send, ChevronLeft, Info, Terminal, Settings, History, CheckCircle2, XCircle, Clock, Database } from "lucide-react";
import Link from "next/link";

interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
}

export default function ProblemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("// Write your code here\n");
  const [languageId, setLanguageId] = useState(54); // Default C++
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");

  useEffect(() => {
    if (!id) return;
    
    axios
      .get(`http://localhost:5000/api/problems/${id}`)
      .then((res) => {
        setProblem(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async () => {
    if (!id) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await axios.post(`http://localhost:5000/api/problems/${id}/submit`, {
        code,
        languageId,
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      alert("Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-60px)] bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (!problem) return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-60px)] bg-slate-50 space-y-4">
      <div className="text-slate-500 font-medium text-lg">Problem not found</div>
      <Link href="/" className="text-blue-600 hover:underline flex items-center space-x-1">
        <ChevronLeft size={16} /> <span>Back to Problems</span>
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-slate-50 -m-4">
      {/* Top Bar inside Page */}
      <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/" className="p-1.5 hover:bg-slate-100 rounded-md transition text-slate-500">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-black text-slate-900">{problem.id}. {problem.title}</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-tighter">
              {problem.timeLimit}s / {problem.memoryLimit}MB
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
           <select
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition shadow-sm"
              value={languageId}
              onChange={(e) => setLanguageId(parseInt(e.target.value))}
            >
              <option value={54}>C++ (GCC 9.2.0)</option>
              <option value={62}>Java (OpenJDK 13.0.1)</option>
              <option value={71}>Python (3.8.1)</option>
              <option value={63}>JavaScript (Node.js 12.14.0)</option>
            </select>
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition"><Settings size={18} /></button>
        </div>
      </div>

      <div className="flex flex-grow overflow-hidden p-3 gap-3">
        {/* Left: Problem Description Panel */}
        <div className="w-1/2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50/50 shrink-0">
            <TabButton 
              active={activeTab === "description"} 
              onClick={() => setActiveTab("description")} 
              icon={<Info size={14} />} 
              label="Description" 
            />
            <TabButton 
              active={activeTab === "submissions"} 
              onClick={() => setActiveTab("submissions")} 
              icon={<History size={14} />} 
              label="Submissions" 
            />
          </div>
          
          <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            {activeTab === "description" ? (
              <article className="prose prose-slate max-w-none">
                <h1 className="text-2xl font-black text-slate-900 mb-6">{problem.title}</h1>
                <div className="whitespace-pre-wrap text-slate-600 leading-relaxed text-[15px]">
                  {problem.description}
                </div>
              </article>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <History size={48} className="opacity-20" />
                <p className="italic text-sm font-medium">No recent submissions found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Code Editor & Result Panel */}
        <div className="w-1/2 flex flex-col gap-3 overflow-hidden">
          {/* Editor Container */}
          <div className="flex-grow bg-[#1e1e1e] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col min-h-0">
            <div className="px-4 py-2 bg-[#252526] flex justify-between items-center border-b border-white/5 shrink-0">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 flex items-center">
                <Terminal size={12} className="mr-2 text-blue-400" /> Editor
              </span>
            </div>
            <div className="flex-grow relative min-h-0">
              <Editor
                height="100%"
                defaultLanguage="cpp"
                theme="vs-dark"
                value={code}
                options={{
                  fontSize: 14,
                  minimap: { enabled: false },
                  scrollbar: { vertical: "visible", horizontal: "hidden" },
                  lineNumbers: "on",
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 0,
                  lineNumbersMinChars: 3,
                  padding: { top: 15 },
                  fontFamily: "var(--font-geist-mono)",
                }}
                onChange={(value) => setCode(value || "")}
              />
            </div>
            
            {/* Control Bar */}
            <div className="p-3 bg-[#252526] border-t border-white/5 flex justify-end items-center space-x-3 shrink-0">
              <button className="text-[11px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition flex items-center space-x-2 px-4 py-2 rounded-xl hover:bg-white/5">
                <Play size={14} /> <span>Run Test</span>
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 active:scale-95 transform"
              >
                {submitting ? (
                   <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Send size={14} />
                )}
                <span>{submitting ? "Processing..." : "Submit Code"}</span>
              </button>
            </div>
          </div>

          {/* Result Terminal */}
          <div className={`shrink-0 transition-all duration-300 ease-in-out ${result ? 'h-64' : 'h-0 opacity-0 overflow-hidden'}`}>
            <div className="h-full bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
               <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-600 uppercase tracking-widest">Test Result</span>
                    {result?.status === "Accepted" ? (
                       <CheckCircle2 className="text-green-500" size={16} />
                    ) : (
                       <XCircle className="text-red-500" size={16} />
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${
                    result?.status === "Accepted" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {result?.status}
                  </span>
               </div>
               <div className="flex-grow p-6 overflow-y-auto font-mono text-xs custom-scrollbar bg-white">
                  {result && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-3 gap-4">
                        <ResultMetric icon={<Clock size={12} />} label="Runtime" value={`${result.time} s`} color="blue" />
                        <ResultMetric icon={<Database size={12} />} label="Memory" value={`${result.memory} KB`} color="indigo" />
                        <ResultMetric icon={<CheckCircle2 size={12} />} label="Status" value={result.status} color={result.status === "Accepted" ? "green" : "red"} />
                      </div>

                      {result.compileOutput && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Compilation Log</span>
                          <pre className="p-4 bg-red-50 text-red-600 rounded-xl overflow-x-auto border border-red-100 whitespace-pre-wrap leading-relaxed">
                            {result.compileOutput}
                          </pre>
                        </div>
                      )}

                      {result.stdout && (
                         <div className="animate-in fade-in slide-in-from-top-2 duration-300 delay-75">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2 text-blue-600">Standard Output</span>
                          <pre className="p-4 bg-slate-900 text-green-400 rounded-xl overflow-x-auto shadow-inner border border-slate-800">
                            {result.stdout}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest flex items-center space-x-2 border-b-2 transition duration-200 ${
        active 
          ? "border-blue-600 text-blue-600 bg-white" 
          : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
      }`}
    >
      {icon} <span>{label}</span>
    </button>
  );
}

function ResultMetric({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    green: "bg-green-50 text-green-700 border-green-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  return (
    <div className={`p-3 rounded-xl border flex flex-col space-y-1 ${colors[color] || colors.blue}`}>
       <div className="flex items-center space-x-1.5 opacity-60">
          {icon} <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
       </div>
       <span className="text-sm font-black tracking-tight">{value}</span>
    </div>
  );
}

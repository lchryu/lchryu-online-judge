"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit3, X, Settings2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState(1.0);
  const [memoryLimit, setMemoryLimit] = useState(256.0);
  const [testCases, setTestCases] = useState(JSON.stringify([{ input: "", output: "" }], null, 2));
  const [testCasesFile, setTestCasesFile] = useState<File | null>(null);
  const [jsonError, setJsonError] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/");
    }
    fetchProblems();
  }, [user, router]);

  const fetchProblems = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/problems");
      setProblems(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateJSON = (value: string) => {
    setTestCases(value);
    if (!value.trim()) {
      setJsonError("");
      return;
    }
    try {
      JSON.parse(value);
      setJsonError("");
    } catch (e: any) {
      setJsonError("Invalid JSON format: " + e.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testCasesFile && jsonError) {
      alert("Please fix JSON errors before saving.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("timeLimit", timeLimit.toString());
      formData.append("memoryLimit", memoryLimit.toString());
      
      if (testCasesFile) {
        formData.append("testCasesFile", testCasesFile);
      } else {
        formData.append("testCases", testCases);
      }

      await axios.post("http://localhost:5000/api/problems", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
      });
      
      setIsAdding(false);
      fetchProblems();
      resetForm();
    } catch (err) {
      alert("Failed to create problem.");
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setTimeLimit(1.0);
    setMemoryLimit(256.0);
    setTestCases(JSON.stringify([{ input: "", output: "" }], null, 2));
    setTestCasesFile(null);
    setJsonError("");
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 flex items-center tracking-tight">
            <Settings2 className="mr-3 text-blue-600" size={32} /> Admin Control
          </h1>
          <p className="text-slate-500 font-medium mt-1">Configure your problem set and test environments.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-xl active:scale-95 transform ${
            isAdding ? "bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none" : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
          }`}
        >
          {isAdding ? <><X size={16} /> <span>Close</span></> : <><Plus size={16} /> <span>New Problem</span></>}
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl mb-12 animate-in fade-in slide-in-from-top-6 duration-500">
          <div className="flex items-center space-x-3 mb-8">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Plus size={24} /></div>
             <h2 className="text-2xl font-black text-slate-800">Create Problem</h2>
          </div>

          <form onSubmit={handleCreate} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Problem Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. A + B Problem"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Description (Markdown)</label>
                <textarea
                  required
                  rows={12}
                  placeholder="Describe the problem, input format, and output format..."
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition resize-none custom-scrollbar"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time Limit (s)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(parseFloat(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Memory Limit (MB)</label>
                  <input
                    type="number"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition"
                    value={memoryLimit}
                    onChange={(e) => setMemoryLimit(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Data Configuration</label>
                
                <div className="space-y-4">
                   <div className="relative group">
                      <div className={`w-full h-32 border-2 border-dashed rounded-[1.5rem] flex flex-col items-center justify-center transition ${
                        testCasesFile ? "border-green-500 bg-green-50" : "border-slate-200 hover:border-blue-400 hover:bg-slate-50"
                      }`}>
                         <Upload className={testCasesFile ? "text-green-500 animate-bounce" : "text-slate-300"} size={32} />
                         <span className={`text-[11px] font-black uppercase tracking-wider mt-3 ${testCasesFile ? "text-green-600" : "text-slate-500"}`}>
                           {testCasesFile ? testCasesFile.name : "Drop testcases.zip here"}
                         </span>
                         <input 
                            type="file" 
                            accept=".zip"
                            className="absolute inset-0 opacity-0 cursor-pointer" 
                            onChange={(e) => setTestCasesFile(e.target.files?.[0] || null)}
                         />
                      </div>
                      {testCasesFile && (
                        <button 
                          onClick={() => setTestCasesFile(null)}
                          className="absolute -top-3 -right-3 bg-red-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition"
                        >
                          <X size={14} />
                        </button>
                      )}
                   </div>

                   {!testCasesFile && (
                     <div className="space-y-3 animate-in fade-in duration-300">
                        <div className="flex items-center space-x-3">
                          <div className="flex-grow h-px bg-slate-100"></div>
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest whitespace-nowrap">Manual JSON Input</span>
                          <div className="flex-grow h-px bg-slate-100"></div>
                        </div>

                        <div className="relative">
                          <textarea
                            rows={6}
                            className={`w-full px-5 py-4 bg-slate-900 text-blue-400 rounded-2xl text-xs font-mono outline-none transition custom-scrollbar ${
                              jsonError ? "ring-2 ring-red-500/50" : "focus:ring-2 focus:ring-blue-500/50"
                            }`}
                            value={testCases}
                            onChange={(e) => validateJSON(e.target.value)}
                          />
                          {jsonError ? (
                            <div className="absolute top-2 right-2 text-red-500"><AlertCircle size={16} /></div>
                          ) : (
                            <div className="absolute top-2 right-2 text-green-500/30"><CheckCircle2 size={16} /></div>
                          )}
                        </div>
                        {jsonError && <p className="text-[10px] text-red-500 font-bold ml-2">{jsonError}</p>}
                        <p className="text-[10px] text-slate-400 italic ml-2">JSON Array: [&#123;"input": "...", "output": "..."&#125;]</p>
                     </div>
                   )}
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={!!(!testCasesFile && jsonError)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-300 hover:bg-blue-600 transition active:scale-[0.98] transform disabled:opacity-30"
                >
                  Publish Problem
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Problems List */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl overflow-hidden">
        <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Active Problem Set</h3>
           <span className="text-[10px] font-black bg-white px-3 py-1 rounded-full border text-slate-400 shadow-sm">{problems.length} Problems</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">UID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resource Limits</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {problems.map((p) => (
                <tr key={p.id} className="group hover:bg-blue-50/30 transition duration-150">
                  <td className="px-8 py-5">
                    <span className="text-xs font-black text-slate-300 group-hover:text-blue-300">#{p.id.toString().padStart(3, '0')}</span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">{p.title}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-3">
                       <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-black rounded-lg shadow-sm">{p.timeLimit}s</span>
                       <span className="px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[10px] font-black rounded-lg shadow-sm">{p.memoryLimit}MB</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition duration-150">
                      <button className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm transition active:scale-90">
                        <Edit3 size={18} />
                      </button>
                      <button className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm transition active:scale-90">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

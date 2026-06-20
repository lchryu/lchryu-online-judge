"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Circle, Clock, Loader2, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

interface Problem {
  id: number;
  title: string;
  difficulty?: "Easy" | "Medium" | "Hard";
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [solvedProblemIds, setSolvedProblemIds] = useState<number[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const solved = JSON.parse(localStorage.getItem("solved_problems") || "[]");
      setSolvedProblemIds(solved.map(Number));
    }
  }, []);

  useEffect(() => {
    api
      .get<Problem[]>("/problems")
      .then((res) => {
        const data = res.data.map((p, i) => ({
          ...p,
          difficulty: i % 3 === 0 ? "Easy" : i % 3 === 1 ? "Medium" : "Hard"
        }) satisfies Problem);
        setProblems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading problems...</span>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2 tracking-tight">Problem Set</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Sharpen your skills with our curated coding challenges.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm">Filter</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition shadow-md shadow-blue-500/10">Pick One</button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-colors duration-150">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">Difficulty</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
            {problems.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500 italic">
                  No problems available yet.
                </td>
              </tr>
            ) : (
              problems.map((p) => {
                const isSolved = solvedProblemIds.includes(p.id);
                return (
                  <tr key={p.id} className="group hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition">
                    <td className="px-6 py-4">
                      {isSolved ? (
                        <CheckCircle2 className="text-green-600 dark:text-green-400" size={18} />
                      ) : (
                        <Circle className="text-slate-200 dark:text-slate-800" size={18} />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/problems/${p.id}`} className="text-slate-900 dark:text-slate-200 font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {p.id}. {p.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        p.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50' : 
                        p.difficulty === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50' : 
                        'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50'
                      }`}>
                        {p.difficulty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/problems/${p.id}`} 
                        className="inline-flex items-center text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                      >
                        Solve <Clock size={12} className="ml-1" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { 
  Trophy, Calendar, Clock, Users, ArrowRight, CheckCircle2, 
  AlertCircle, BookOpen, Star, HelpCircle
} from "lucide-react";

interface Contest {
  id: number;
  title: string;
  description: string;
  startTime: Date;
  durationMinutes: number;
  problemsCount: number;
  participantsCount: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
  tags: string[];
}

const mockContests: Contest[] = [
  {
    id: 101,
    title: "Algorithmic Sprint #12",
    description: "A fast-paced 90-minute round designed to test your core data structure implementation speed.",
    startTime: new Date(Date.now() + 10 * 60 * 1000), // Starts in 10 minutes
    durationMinutes: 90,
    problemsCount: 5,
    participantsCount: 142,
    difficulty: "Medium",
    tags: ["Graph", "Trees", "Sorting"],
  },
  {
    id: 102,
    title: "Weekly Beginner Clash",
    description: "Perfect for programmers starting out. Simple conditional, loops, and basic array manipulation.",
    startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000), // Starts in 2 days 4 hours
    durationMinutes: 120,
    problemsCount: 4,
    participantsCount: 88,
    difficulty: "Easy",
    tags: ["Strings", "Math", "Arrays"],
  },
  {
    id: 103,
    title: "Grand Championship Round",
    description: "Our monthly high-stakes competition. Hard problems featuring advanced tree structures and dynamic programming.",
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Starts in 5 days
    durationMinutes: 180,
    problemsCount: 6,
    participantsCount: 312,
    difficulty: "Hard",
    tags: ["DP", "Segment Tree", "Math"],
  },
  {
    id: 104,
    title: "Summer Warmup Cup (Ongoing)",
    description: "Join the ongoing challenge! 3 hours of mixed algorithmic logic. Open to all students.",
    startTime: new Date(Date.now() - 45 * 60 * 1000), // Started 45 minutes ago
    durationMinutes: 180,
    problemsCount: 6,
    participantsCount: 521,
    difficulty: "Mixed",
    tags: ["Greedy", "Binary Search", "Hash Table"],
  },
  {
    id: 99,
    title: "Binary Tree Bonanza #11 (Past)",
    description: "Focus on binary trees, traversal strategies, DFS and BFS recursion patterns.",
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Completed 3 days ago
    durationMinutes: 120,
    problemsCount: 4,
    participantsCount: 204,
    difficulty: "Medium",
    tags: ["Trees", "BFS/DFS", "Recursion"],
  },
  {
    id: 98,
    title: "Sorting & Searching Sprint (Past)",
    description: "Classic arrays, binary search bounds, quicksort and mergesort customizations.",
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Completed 7 days ago
    durationMinutes: 95,
    problemsCount: 5,
    participantsCount: 187,
    difficulty: "Easy",
    tags: ["Sorting", "Binary Search"],
  }
];

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>(mockContests);
  const [activeTab, setActiveTab] = useState<"running" | "upcoming" | "past">("running");
  const [registeredContestIds, setRegisteredContestIds] = useState<Set<number>>(new Set());
  const [time, setTime] = useState<number>(Date.now());

  // Tick the clock every second to update countdowns
  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getContestStatus = (contest: Contest) => {
    const start = contest.startTime.getTime();
    const end = start + contest.durationMinutes * 60 * 1000;
    
    if (time >= start && time < end) {
      return "running";
    } else if (time < start) {
      return "upcoming";
    } else {
      return "past";
    }
  };

  // Group contests by status
  const runningContests = useMemo(() => contests.filter(c => getContestStatus(c) === "running"), [contests, time]);
  const upcomingContests = useMemo(() => contests.filter(c => getContestStatus(c) === "upcoming"), [contests, time]);
  const pastContests = useMemo(() => contests.filter(c => getContestStatus(c) === "past"), [contests, time]);

  const handleRegister = (id: number) => {
    setRegisteredContestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Helper component to display dynamic countdown
  const Countdown = ({ contest }: { contest: Contest }) => {
    const start = contest.startTime.getTime();
    const end = start + contest.durationMinutes * 60 * 1000;
    
    if (time >= start && time < end) {
      // Running - Show time remaining
      const diff = end - time;
      const hours = Math.floor(diff / (3600 * 1000));
      const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diff % (60 * 1000)) / 1000);
      return (
        <span className="text-red-500 font-mono font-bold animate-pulse">
          Ends in: {hours.toString().padStart(2, "0")}:{mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
        </span>
      );
    } else if (time < start) {
      // Upcoming - Show time to start
      const diff = start - time;
      const days = Math.floor(diff / (24 * 3600 * 1000));
      const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
      const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      const secs = Math.floor((diff % (60 * 1000)) / 1000);
      
      if (days > 0) {
        return (
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            Starts in: {days}d {hours}h {mins}m
          </span>
        );
      }
      return (
        <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
          Starts in: {hours.toString().padStart(2, "0")}:{mins.toString().padStart(2, "0")}:{secs.toString().padStart(2, "0")}
        </span>
      );
    } else {
      return <span className="text-slate-400 dark:text-slate-500 font-bold">Contest Ended</span>;
    }
  };

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50";
      case "Medium":
        return "bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900/50";
      case "Hard":
        return "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50";
      default:
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50";
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 md:px-6">
      
      {/* Title Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 mb-2 tracking-tight flex items-center">
          <Trophy className="mr-2.5 text-yellow-500" size={28} />
          Competitive Contests
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Test your problem solving skills against other developers in timed challenges. Earn points and climb the global leaderboard.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 shrink-0">
        <button
          onClick={() => setActiveTab("running")}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "running"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-550 animate-ping inline-block" />
          <span>Active & Running ({runningContests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "upcoming"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span>Upcoming ({upcomingContests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition flex items-center space-x-1.5 ${
            activeTab === "past"
              ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
              : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <span>Completed ({pastContests.length})</span>
        </button>
      </div>

      {/* Contests Listing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* ACTIVE CONTESTS */}
        {activeTab === "running" && (
          runningContests.length === 0 ? (
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-450 dark:text-slate-500 italic shadow-sm">
              <Star size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">There are no live contests running right now.</p>
              <button 
                onClick={() => setActiveTab("upcoming")} 
                className="mt-3 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline"
              >
                Check upcoming schedule &rarr;
              </button>
            </div>
          ) : (
            runningContests.map((c) => (
              <div 
                key={c.id} 
                className="bg-white dark:bg-slate-900 border-2 border-red-500/25 dark:border-red-500/20 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 hover:scale-[1.01] duration-150 relative overflow-hidden"
              >
                {/* Banner alert */}
                <div className="absolute top-0 right-0 bg-red-500 text-white font-black text-[9px] px-3.5 py-1 uppercase tracking-wider rounded-bl-xl">
                  Live Round
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={getDifficultyBadge(c.difficulty) + " text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"}>
                      {c.difficulty}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center">
                      <Clock size={12} className="mr-1" /> {c.durationMinutes} mins
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">{c.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{c.description}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map(t => (
                    <span key={t} className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-transparent dark:border-slate-800 font-mono">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Bottom details & button */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <Countdown contest={c} />
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center mt-1">
                      <Users size={11} className="mr-1 text-slate-350" /> {c.participantsCount} competing
                    </span>
                  </div>

                  <Link 
                    href={`/problems`} // Link to problems to solve during the contest
                    className="px-4 py-2 bg-red-500 hover:bg-red-650 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-red-500/10 flex items-center space-x-1"
                  >
                    <span>Enter Contest</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))
          )
        )}

        {/* UPCOMING CONTESTS */}
        {activeTab === "upcoming" && (
          upcomingContests.length === 0 ? (
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-450 dark:text-slate-500 italic shadow-sm">
              <Calendar size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">No upcoming contests scheduled.</p>
            </div>
          ) : (
            upcomingContests.map((c) => {
              const isRegistered = registeredContestIds.has(c.id);
              return (
                <div 
                  key={c.id} 
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 hover:scale-[1.01] duration-150"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={getDifficultyBadge(c.difficulty) + " text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"}>
                          {c.difficulty}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center">
                          <Clock size={12} className="mr-1" /> {c.durationMinutes} mins
                        </span>
                      </div>
                      {isRegistered && (
                        <span className="text-[10px] font-black text-green-600 dark:text-green-400 flex items-center bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-md">
                          <CheckCircle2 size={11} className="mr-1" /> Registered
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-snug">{c.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{c.description}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {c.tags.map(t => (
                      <span key={t} className="bg-slate-50 dark:bg-slate-800 text-slate-650 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono border border-transparent dark:border-slate-800">
                        #{t}
                      </span>
                    ))}
                  </div>

                  {/* Bottom details & button */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                    <div className="flex flex-col">
                      <Countdown contest={c} />
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center mt-1">
                        <Users size={11} className="mr-1 text-slate-350" /> {c.participantsCount + (isRegistered ? 1 : 0)} registered
                      </span>
                    </div>

                    <button
                      onClick={() => handleRegister(c.id)}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition ${
                        isRegistered 
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400"
                          : "bg-blue-600 hover:bg-blue-750 text-white shadow-md shadow-blue-500/10 active:scale-95 transform"
                      }`}
                    >
                      {isRegistered ? "Unregister" : "Register"}
                    </button>
                  </div>
                </div>
              );
            })
          )
        )}

        {/* COMPLETED CONTESTS */}
        {activeTab === "past" && (
          pastContests.length === 0 ? (
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-450 dark:text-slate-500 italic shadow-sm">
              <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">No past contests found.</p>
            </div>
          ) : (
            pastContests.map((c) => (
              <div 
                key={c.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4 opacity-75 hover:opacity-100"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className={getDifficultyBadge(c.difficulty) + " text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md"}>
                      {c.difficulty}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center">
                      <Clock size={12} className="mr-1" /> {c.durationMinutes} mins
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 tracking-tight leading-snug">{c.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed font-sans">{c.description}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map(t => (
                    <span key={t} className="bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-lg font-mono border border-transparent dark:border-slate-800">
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Bottom details & button */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold font-sans">
                      Held on {c.startTime.toLocaleDateString()}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold flex items-center mt-1">
                      <Users size={11} className="mr-1 text-slate-350" /> {c.participantsCount} competed
                    </span>
                  </div>

                  <Link 
                    href={`/problems`} 
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center space-x-1"
                  >
                    <span>Practice Problems</span>
                  </Link>
                </div>
              </div>
            ))
          )
        )}

      </div>

      {/* Rules Info banner */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mt-8 flex flex-col sm:flex-row items-start gap-4">
        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600 dark:text-yellow-450 rounded-2xl shrink-0">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1 flex items-center">
            Contest Evaluation Rules
          </h4>
          <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed max-w-3xl">
            All code submissions during the contest window will be scored in real-time. Penalty time is calculated based on submittal times and failed attempts. Plagiarism or copying code leads to immediate disqualification. Good luck!
          </p>
        </div>
      </div>

    </div>
  );
}

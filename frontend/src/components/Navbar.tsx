"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Code2, Trophy, History, LayoutDashboard, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const closeDropdown = () => setShowDropdown(false);
    window.addEventListener("click", closeDropdown);
    return () => window.removeEventListener("click", closeDropdown);
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-14">
        <div className="flex items-center space-x-8">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Code2 className="text-white" size={20} />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 hidden sm:block tracking-tighter">
              LchRyu
            </span>
          </Link>
          
          <div className="hidden md:flex space-x-1">
            <NavLink href="/" icon={<LayoutDashboard size={18} />} label="Problems" active={pathname === "/"} />
            <NavLink href="/submissions" icon={<History size={18} />} label="Submissions" active={pathname === "/submissions"} />
            <NavLink href="/contests" icon={<Trophy size={18} />} label="Contests" active={pathname === "/contests"} />
            {user?.role === "admin" && (
              <NavLink href="/admin" icon={<Shield size={18} />} label="Admin" active={pathname === "/admin"} />
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 p-1.5 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-200"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-7 h-7 rounded-full border border-slate-200 object-cover" />
                ) : (
                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                    {user.username[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">{user.username}</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-3 border-b border-slate-100 mb-1 bg-slate-50/50 rounded-t-2xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed in as</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{user.username}</p>
                  </div>
                  <Link href="/profile" className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center space-x-2 transition">
                    <User size={16} /> <span>My Profile</span>
                  </Link>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition"
                  >
                    <LogOut size={16} /> <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition">Sign In</Link>
              <Link href="/register" className="bg-slate-900 text-white px-5 py-1.5 rounded-full text-sm font-bold hover:bg-blue-600 transition shadow-lg shadow-slate-200 active:scale-95 transform">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg transition text-sm font-bold ${
        active 
          ? "bg-blue-50 text-blue-600" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

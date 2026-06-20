"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { User, Mail, Lock, Save, ShieldCheck, Camera, CheckCircle } from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";

export default function ProfilePage() {
  const { token, user: authUser, login } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notification, setNotification] = useState<{ text: string, type: 'success' | 'error' | null }>({ text: "", type: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const avatars = useMemo(() => [
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Max",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Lilly",
    "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack",
  ], []);

  const createdDate = authUser?.createdAt
    ? new Date(authUser.createdAt).toLocaleDateString()
    : "Unknown";

  useEffect(() => {
    if (token) {
      api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setUsername(res.data.username);
        setEmail(res.data.email);
        setAvatarUrl(res.data.avatarUrl || avatars[0]);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [avatars, token]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUpdating(true);
      const res = await api.post("/auth/avatar", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setAvatarUrl(res.data.avatarUrl);
      login(token, res.data.user);
      showNotification("Avatar uploaded successfully!", "success");
    } catch (err) {
      showNotification(getErrorMessage(err, "Failed to upload avatar"), "error");
    } finally {
      setUpdating(false);
    }
  };

  const showNotification = (text: string, type: 'success' | 'error') => {
    setNotification({ text, type });
    setTimeout(() => setNotification({ text: "", type: null }), 3000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setNotification({ text: "", type: null });
    try {
      const res = await api.put("/auth/profile", {
        username,
        email,
        avatarUrl,
        password: password || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      login(token!, res.data.user);
      showNotification("Profile updated successfully!", "success");
      setPassword("");
    } catch (err) {
      showNotification(getErrorMessage(err, "Update failed"), "error");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 relative">
      {notification.text && (
        <div className={`fixed top-20 right-8 z-[100] flex items-center space-x-2 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-300 ${
          notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <CheckCircle size={20} />
          <span className="font-bold text-sm">{notification.text}</span>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col items-center">
           <div className="relative group mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white relative">
                <Image src={avatarUrl} alt="Avatar" width={128} height={128} unoptimized className="h-full w-full object-cover" />
                {updating && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition transform hover:scale-110 active:scale-90"
              >
                <Camera size={18} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleAvatarFileChange}
              />
           </div>
           
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Quick Presets</h3>
           <div className="grid grid-cols-3 gap-3">
              {avatars.map((url, i) => (
                <button 
                  key={i}
                  onClick={() => setAvatarUrl(url)}
                  className={`w-10 h-10 rounded-full border-2 transition transform hover:scale-110 ${avatarUrl === url ? 'border-blue-600 shadow-md ring-2 ring-blue-100' : 'border-transparent hover:border-slate-300'}`}
                >
                  <Image src={url} alt={`Avatar ${i}`} width={40} height={40} unoptimized className="h-full w-full p-1" />
                </button>
              ))}
           </div>

           <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-1">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-black uppercase tracking-wider">{authUser?.role} Account</span>
              </div>
              <p className="text-[10px] text-slate-400 italic">Created: {createdDate}</p>
           </div>
        </div>

        <form onSubmit={handleUpdate} className="flex-grow p-8 md:p-12 space-y-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Account Settings</h1>
            <p className="text-slate-500 text-sm">Update your profile information and personalize your avatar.</p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition shadow-sm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition shadow-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Change Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition shadow-sm"
                  placeholder="Enter new password to change"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-slate-400 ml-2 italic">Leave blank to keep your current password.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400 max-w-[200px]">Make sure to save your changes before leaving this page.</p>
            <button
              type="submit"
              disabled={updating}
              className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-blue-600 transition active:scale-95 transform flex items-center space-x-2"
            >
              {updating ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              <span>{updating ? "Processing..." : "Save Profile"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

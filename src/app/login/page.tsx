"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, Loader2, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        if (username === "Kanika" && password === "123123") {
            // In a real app, we'd set a secure cookie here.
            // For this implementation, we'll set a simple document cookie
            // that the middleware can check.
            document.cookie = "bayon_auth=true; path=/; max-age=86400; SameSite=Strict";
            router.push("/");
        } else {
            setError("Invalid credentials. Please contact administration.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F4F7FE] relative overflow-hidden font-sans">
            {/* Background Aesthetic Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" />

            <div className="relative z-10 w-full max-w-[440px] px-6">
                {/* Logo/Brand Section */}
                <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-top-8 duration-700">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1B2559] to-[#3311DB] flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-6 rotate-6 hover:rotate-0 transition-transform duration-500">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div className="text-center space-y-1">
                        <h1 className="text-3xl font-black text-[#1B2559] tracking-tight">Bayon Finance</h1>
                        <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.3em]">Institutional Ledger Access</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] animate-in fade-in zoom-in-95 duration-700 delay-150">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-[#1B2559]">Welcome Back</h2>
                        <p className="text-sm font-medium text-[#A3AED0] mt-1">Please enter your credentials to proceed.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        {/* Username Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#1B2559] uppercase tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A3AED0] group-focus-within:text-primary transition-colors">
                                    <User className="w-4 h-4" />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    className="w-full bg-[#F4F7FE] border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-11 py-4 text-sm font-bold text-[#1B2559] outline-none transition-all placeholder:text-[#A3AED0]/60"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#1B2559] uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A3AED0] group-focus-within:text-primary transition-colors">
                                    <Lock className="w-4 h-4" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-[#F4F7FE] border-2 border-transparent focus:border-primary/20 focus:bg-white rounded-2xl px-11 py-4 text-sm font-bold text-[#1B2559] outline-none transition-all placeholder:text-[#A3AED0]/60"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3AED0] hover:text-[#1B2559] transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold px-4 py-3 rounded-xl animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-primary hover:bg-[#3311DB] disabled:bg-primary/50 text-white font-black text-[11px] uppercase tracking-[0.2em] py-5 rounded-2xl shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    Authenticate Session
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-[#F4F7FE] text-center">
                        <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">
                            Secured by Bayon Cloud Protocol
                        </p>
                    </div>
                </div>

                {/* Footer Info */}
                <p className="mt-8 text-center text-[10px] font-bold text-[#A3AED0] uppercase tracking-tighter">
                    © {new Date().getFullYear()} Bayon Dental Clinic Infrastructure. All rights reserved.
                </p>
            </div>
        </div>
    );
}

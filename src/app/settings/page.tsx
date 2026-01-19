"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Settings as SettingsIcon,
    DollarSign,
    RefreshCw,
    Users,
    ShieldCheck,
    Save,
    Bell,
    Database,
    Zap,
    Lock,
    ChevronRight,
    X,
    Loader2,
    Printer
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useCurrency } from "@/context/CurrencyContext";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function SettingsPage() {
    const [exchangeRate, setExchangeRate] = useState("4100");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Admin Auth & Section State
    const [activeAdminSection, setActiveAdminSection] = useState<'staff' | 'logs' | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passwordInput, setPasswordInput] = useState("");
    const [authError, setAuthError] = useState(false);

    // Data State
    const [staffList, setStaffList] = useState<any[]>([]);
    const [financialLogs, setFinancialLogs] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const { refreshRate } = useCurrency();

    useEffect(() => {
        let mounted = true;
        async function fetchSettings() {
            const { data } = await supabase
                .from('settings')
                .select('*')
                .eq('key', 'usd_to_khr')
                .single();
            if (data && mounted) setExchangeRate(data.value);
        }
        fetchSettings();
        return () => { mounted = false; };
    }, []);

    async function fetchStaff() {
        setIsLoadingData(true);
        const { data } = await supabase.from('staff').select('*').order('name');
        if (data) setStaffList(data);
        setIsLoadingData(false);
    }

    async function fetchFinancialLogs() {
        setIsLoadingData(true);
        // Fetching global ledger entries as financial logs
        const { data } = await supabase
            .from('ledger_entries')
            .select(`
                *,
                patients (name)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setFinancialLogs(data);
        setIsLoadingData(false);
    }

    async function handleUpdateCommission(id: string, rate: number) {
        const { error } = await supabase
            .from('staff')
            .update({ commission_rate: rate })
            .eq('id', id);

        if (!error) {
            // Optimistic update
            setStaffList(prev => prev.map(s => s.id === id ? { ...s, commission_rate: rate } : s));
        }
    }

    function handleLogin() {
        if (passwordInput === "123123123") {
            setIsAuthenticated(true);
            setAuthError(false);
            // Fetch data based on the active section we are trying to access
            if (activeAdminSection === 'staff') fetchStaff();
            if (activeAdminSection === 'logs') fetchFinancialLogs();
        } else {
            setAuthError(true);
        }
    }

    function openAdminSection(section: 'staff' | 'logs') {
        setActiveAdminSection(section);
        // If already authenticated, just fetch the data
        if (isAuthenticated) {
            if (section === 'staff') fetchStaff();
            if (section === 'logs') fetchFinancialLogs();
        } else {
            // Otherwise, clean state for login
            setPasswordInput("");
            setAuthError(false);
        }
    }

    function closeAdminModal() {
        setActiveAdminSection(null);
        // Optionally keep them authenticated or require re-login. 
        // For UX, keeping auth for session is fine, but resetting activeSection closes modal.
    }

    async function handleSaveRate() {
        setIsSaving(true);
        const { error } = await supabase
            .from('settings')
            .upsert({ key: 'usd_to_khr', value: exchangeRate, updated_at: new Date().toISOString() });

        if (!error) {
            await refreshRate();
            await supabase.from('audit_logs').insert({
                table_name: 'settings',
                record_id: '00000000-0000-0000-0000-000000000000',
                action: 'UPDATE_EXCHANGE_RATE',
                new_values: { rate: exchangeRate }
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        }
        setIsSaving(false);
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex items-center gap-6">
                <div className="p-5 bg-primary/10 rounded-[2rem] text-primary shadow-[0_0_40px_rgba(59,130,246,0.1)]">
                    <SettingsIcon className="w-10 h-10" />
                </div>
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-white">System Configuration</h1>
                    <p className="text-slate-400 font-medium">Global control panel for Bayon Finance infrastructure.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Financial */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="card-premium relative overflow-hidden group border border-[#E0E5F2]/50">
                        <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap className="w-32 h-32 text-primary" />
                        </div>

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold flex items-center gap-3 text-white">
                                <RefreshCw className="w-6 h-6 text-blue-400" />
                                Exchange Currency
                            </h2>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-xl font-black uppercase tracking-[0.2em]">Global Sync</span>
                        </div>

                        <p className="text-slate-500 mb-6 leading-relaxed font-medium text-xs">
                            Determine the official conversion rate between USD and KHR. This affects all live reporting, patient billing, and financial summaries clinic-wide.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div className="bg-[#F4F7FE] border border-[#E0E5F2] p-4 rounded-xl hover:border-primary/30 transition-all group/input">
                                <span className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mb-4 block ml-1">Current Multiplier</span>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                                        <DollarSign className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">1 USD Equals</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                className="bg-transparent border-none focus:outline-none text-2xl font-black text-[#1B2559] w-28"
                                                value={exchangeRate}
                                                onChange={(e) => setExchangeRate(e.target.value)}
                                            />
                                            <span className="text-2xl font-black text-slate-700">៛</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveRate}
                                disabled={isSaving}
                                className={cn(
                                    "h-[88px] font-black rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs shadow-2xl group cursor-pointer",
                                    showSuccess
                                        ? "bg-emerald-500 text-white"
                                        : "bg-primary text-white hover:scale-[1.02] active:scale-95 shadow-primary/20"
                                )}
                            >
                                {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : showSuccess ? <ShieldCheck className="w-5 h-5" /> : <Save className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
                                {showSuccess ? "Rate Synchronized!" : "Apply New Rate"}
                            </button>
                        </div>
                    </div>

                    {/* Additional Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card-premium p-6 space-y-4 border border-[#E0E5F2]/50">
                            <div className="p-3 bg-orange-500/10 rounded-xl w-fit text-orange-400 mb-2">
                                <Bell className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-[#1B2559]">Notifications</h3>
                            <p className="text-xs text-[#A3AED0] font-medium">Manage how you receive alerts for low inventory and overdue payments.</p>
                            <div className="flex items-center justify-between pt-2">
                                <span className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Email Alerts</span>
                                <div className="w-10 h-5 bg-[#F4F7FE] rounded-full relative p-1 cursor-pointer border border-[#E0E5F2]">
                                    <div className="w-3 h-3 bg-[#A3AED0] rounded-full shadow-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="card-premium p-6 space-y-4 border border-[#E0E5F2]/50">
                            <div className="p-3 bg-indigo-500/10 rounded-xl w-fit text-indigo-400 mb-2">
                                <Database className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-[#1B2559]">Data Governance</h3>
                            <p className="text-xs text-[#A3AED0] font-medium">Export clinical data or manage automatic cloud backup frequency.</p>
                            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline pt-2 cursor-pointer">Export Ledger (CSV)</button>
                        </div>
                    </div>
                </div>

                {/* Right Column - Security */}
                <div className="space-y-8">
                    <div className="card-premium p-6 shadow-2xl flex flex-col h-full border border-[#E0E5F2]/50">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white uppercase tracking-tight">Security</h2>
                        </div>

                        <div className="space-y-6 flex-1">
                            <div
                                onClick={() => openAdminSection('logs')}
                                className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-950/60 border border-white/5 cursor-pointer hover:bg-slate-900 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                                        <Lock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Financial Logs</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Strict audit trail & history</p>
                                    </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            </div>

                            <div
                                onClick={() => openAdminSection('staff')}
                                className="flex items-center justify-between p-5 rounded-[1.5rem] bg-slate-950/60 border border-white/5 cursor-pointer hover:bg-slate-900 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Staff Settings</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Manage team & commissions</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-700" />
                            </div>

                            <div className="mt-12 p-8 border border-dashed border-slate-800 rounded-[2rem] text-center bg-slate-950/20">
                                <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                                    Two-factor authentication and IP whitelisting modules are coming soon to increase enterprise-grade security.
                                </p>
                            </div>
                        </div>

                        <div className="mt-10 pt-8 border-t border-white/5 flex items-center gap-3 text-slate-600">
                            <Zap className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Internal Build v2.4.0</span>
                        </div>

                        {/* Admin Authenticated Modal */}
                        {activeAdminSection && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-slate-950 border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                                    {/* Modal Header */}
                                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                                        <div className="flex items-center gap-3">
                                            {activeAdminSection === 'staff' ? <Users className="w-5 h-5 text-indigo-400" /> : <Lock className="w-5 h-5 text-emerald-400" />}
                                            <h3 className="text-lg font-black text-white tracking-tight">
                                                {activeAdminSection === 'staff' ? 'Staff Configuration' : 'Financial Audit Logs'}
                                            </h3>
                                        </div>
                                        <button onClick={closeAdminModal} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                            <X className="w-5 h-5 text-slate-400" />
                                        </button>
                                    </div>

                                    {/* Modal Body */}
                                    <div className="p-8">
                                        {!isAuthenticated ? (
                                            /* Login Form */
                                            <div className="space-y-6">
                                                <div className="text-center space-y-2">
                                                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                                        <Lock className="w-7 h-7 text-primary" />
                                                    </div>
                                                    <h4 className="text-xl font-bold text-white">Admin Access Required</h4>
                                                    <p className="text-sm text-slate-500">Please enter the security PIN to proceed.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <input
                                                        type="password"
                                                        placeholder="Security PIN"
                                                        className={cn(
                                                            "w-full bg-slate-900 border text-center text-2xl font-black text-white p-4 rounded-2xl focus:outline-none transition-all",
                                                            authError ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-primary/50"
                                                        )}
                                                        value={passwordInput}
                                                        onChange={(e) => setPasswordInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                                        autoFocus
                                                    />
                                                    {authError && <p className="text-center text-xs font-bold text-red-400 uppercase tracking-widest">Invalid Security PIN</p>}

                                                    <button
                                                        onClick={handleLogin}
                                                        className="w-full bg-primary hover:bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shadow-lg shadow-primary/20"
                                                    >
                                                        Unlock Module
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* Authenticated Content based on Active Section */
                                            <div className="space-y-6">
                                                {isLoadingData ? (
                                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Loading Secure Data...</p>
                                                    </div>
                                                ) : activeAdminSection === 'staff' ? (
                                                    /* Staff List with Commission Edits */
                                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {staffList.map((staff) => (
                                                            <div key={staff.id} className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-2xl">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                                        {staff.name.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold text-white">{staff.name}</p>
                                                                        <p className="text-[10px] text-slate-500 uppercase">{staff.role}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1">
                                                                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Comm. Rate (%)</span>
                                                                    <input
                                                                        type="number"
                                                                        className="w-20 bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-right text-sm font-bold text-white focus:border-primary/50 focus:outline-none"
                                                                        value={staff.commission_rate || 0}
                                                                        onChange={(e) => handleUpdateCommission(staff.id, Number(e.target.value))}
                                                                    />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : activeAdminSection === 'logs' ? (
                                                    /* Financial Logs View - Professional Invoice Style */
                                                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                                        {financialLogs.map((log, idx) => (
                                                            <div key={log.id} className="bg-slate-900/50 border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all group">
                                                                {/* Invoice Header */}
                                                                <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 px-5 py-3 border-b border-white/5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                                            <span className="text-xs font-black text-primary">#{financialLogs.length - idx}</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-black text-white">{log.patients?.name || 'Unknown Patient'}</p>
                                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                                                {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase tracking-wider">
                                                                            Paid
                                                                        </span>
                                                                        <span className="text-sm font-black text-emerald-400">
                                                                            ${(log.amount_paid || 0).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Invoice Body */}
                                                                <div className="p-5 space-y-3">
                                                                    {/* Service Details */}
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Service</p>
                                                                            <p className="text-sm font-bold text-white capitalize">{log.treatments || log.description || 'General Service'}</p>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Total</p>
                                                                            <p className="text-sm font-bold text-white">${Number(log.total_price || log.amount_paid).toLocaleString()}</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Payment Breakdown */}
                                                                    <div className="pt-3 border-t border-white/5">
                                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2">Payment Methods</p>
                                                                        <div className="grid grid-cols-3 gap-2">
                                                                            {Number(log.paid_aba) > 0 && (
                                                                                <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-3 py-2">
                                                                                    <p className="text-[8px] text-blue-400 font-black uppercase tracking-wider mb-0.5">ABA Bank</p>
                                                                                    <p className="text-xs font-bold text-blue-300">${Number(log.paid_aba).toLocaleString()}</p>
                                                                                </div>
                                                                            )}
                                                                            {Number(log.paid_cash_usd) > 0 && (
                                                                                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-2">
                                                                                    <p className="text-[8px] text-emerald-400 font-black uppercase tracking-wider mb-0.5">USD Cash</p>
                                                                                    <p className="text-xs font-bold text-emerald-300">${Number(log.paid_cash_usd).toLocaleString()}</p>
                                                                                </div>
                                                                            )}
                                                                            {Number(log.paid_cash_khr) > 0 && (
                                                                                <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
                                                                                    <p className="text-[8px] text-amber-400 font-black uppercase tracking-wider mb-0.5">KHR Cash</p>
                                                                                    <p className="text-xs font-bold text-amber-300">៛{Number(log.paid_cash_khr).toLocaleString()}</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    {/* Receipt ID */}
                                                                    <div className="pt-2 flex items-center justify-between">
                                                                        <p className="text-[8px] text-slate-600 font-mono">ID: {log.id.substring(0, 8)}</p>
                                                                        <Link
                                                                            href={`/print?patient=${encodeURIComponent(log.patients?.name || 'Patient')}&date=${log.date}&total=${log.total_price || log.amount_paid}&paid=${log.amount_paid}&balance=0`}
                                                                            className="text-[9px] font-black text-primary hover:text-blue-400 uppercase tracking-wider transition-colors flex items-center gap-1 opacity-0 group-hover:opacity-100"
                                                                        >
                                                                            <Printer className="w-3 h-3" />
                                                                            Reprint
                                                                        </Link>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {financialLogs.length === 0 && (
                                                            <div className="text-center py-12">
                                                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                                                    <Database className="w-7 h-7 text-slate-600" />
                                                                </div>
                                                                <p className="text-slate-500 text-sm font-bold">No financial records found</p>
                                                                <p className="text-slate-600 text-xs mt-1">Transaction history will appear here</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Shield,
    Phone,
    Calendar,
    ChevronRight,
    Loader2,
    User,
    DollarSign,
    Clock,
    CheckCircle2,
    AlertCircle,
    Image as ImageIcon,
    FileText,
    Camera,
    Lock,
    Eye,
    X as XIcon,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { format } from "date-fns";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type PortalTab = "overview" | "appointments" | "payments" | "media";

const MEDIA_CATEGORIES: Record<string, { label: string; color: string }> = {
    xray: { label: "X-Ray", color: "#4318FF" },
    intraoral: { label: "Intraoral", color: "#19D5C5" },
    extraoral: { label: "Extraoral", color: "#FFB547" },
    document: { label: "Document", color: "#EE5D50" },
};

export default function PatientPortalPage() {
    const { patientId } = useParams<{ patientId: string }>();

    // Auth state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState("");
    const [phoneInput, setPhoneInput] = useState("");
    const [dobInput, setDobInput] = useState("");

    // Data state
    const [patient, setPatient] = useState<any>(null);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
    const [media, setMedia] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<PortalTab>("overview");
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Settings / branding
    const [clinicName, setClinicName] = useState("Bayon Dental Clinic");
    const [accentColor, setAccentColor] = useState("#4318FF");

    // On mount, check for stored session
    useEffect(() => {
        const stored = sessionStorage.getItem(`portal_auth_${patientId}`);
        if (stored) {
            setIsAuthenticated(true);
            fetchPortalData();
        }
        fetchClinicSettings();
    }, [patientId]);

    async function fetchClinicSettings() {
        const { data: nameData } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "clinic_name")
            .single();
        if (nameData) setClinicName(nameData.value);

        const { data: colorData } = await supabase
            .from("settings")
            .select("value")
            .eq("key", "invoice_color")
            .single();
        if (colorData) setAccentColor(colorData.value);
    }

    async function handleLogin() {
        setAuthLoading(true);
        setAuthError("");

        try {
            const res = await fetch("/api/portal-auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientId,
                    phone: phoneInput,
                    dob: dobInput,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setAuthError(data.error || "Authentication failed");
                setAuthLoading(false);
                return;
            }

            sessionStorage.setItem(`portal_auth_${patientId}`, data.token);
            setIsAuthenticated(true);
            fetchPortalData();
        } catch {
            setAuthError("Connection failed. Please try again.");
        }

        setAuthLoading(false);
    }

    async function fetchPortalData() {
        setLoading(true);

        // Patient info
        const { data: pData } = await supabase
            .from("patients")
            .select("id, name, phone, gender, age, dob, created_at")
            .eq("id", patientId)
            .single();
        if (pData) setPatient(pData);

        // Appointments
        const { data: aData } = await supabase
            .from("ledger_entries")
            .select(`*, treatments(name), doctor:staff!doctor_id(name)`)
            .eq("patient_id", patientId)
            .neq("item_type", "installment")
            .order("date", { ascending: false })
            .limit(50);
        if (aData) setAppointments(aData);

        // Payment plans
        const { data: ppData } = await supabase
            .from("payment_plans")
            .select("*")
            .eq("patient_id", patientId);
        if (ppData) setPaymentPlans(ppData);

        // Media
        const { data: mData } = await supabase
            .from("patient_media")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (mData) {
            // Resolve view URLs
            const withUrls = await Promise.all(
                mData.map(async (item: any) => {
                    try {
                        const res = await fetch(`/api/media?fileKey=${encodeURIComponent(item.file_key)}`);
                        const { viewUrl } = await res.json();
                        return { ...item, viewUrl };
                    } catch {
                        return item;
                    }
                })
            );
            setMedia(withUrls);
        }

        setLoading(false);
    }

    // ===================
    //  LOGIN SCREEN
    // ===================
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#F4F7FE] via-white to-[#F4F7FE] flex items-center justify-center p-6">
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap" rel="stylesheet" />
                <div className="w-full max-w-md space-y-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {/* Logo / Header */}
                    <div className="text-center space-y-4">
                        <div
                            className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl"
                            style={{ backgroundColor: accentColor + "15" }}
                        >
                            <Shield className="w-9 h-9" style={{ color: accentColor }} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-[#1B2559] tracking-tight">{clinicName}</h1>
                            <p className="text-sm font-bold text-[#A3AED0] mt-1">Patient Portal</p>
                        </div>
                    </div>

                    {/* Auth Card */}
                    <div className="bg-white rounded-[2rem] shadow-2xl border border-[#E0E5F2] p-8 space-y-6">
                        <div className="text-center space-y-1">
                            <h2 className="text-lg font-black text-[#1B2559]">Verify Your Identity</h2>
                            <p className="text-[11px] font-bold text-[#A3AED0]">
                                Enter your phone number and date of birth to access your records
                            </p>
                        </div>

                        {authError && (
                            <div className="bg-[#EE5D50]/10 border border-[#EE5D50]/20 text-[#EE5D50] px-4 py-3 rounded-xl text-[11px] font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {authError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">
                                    Phone Number
                                </label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0]" />
                                    <input
                                        type="tel"
                                        placeholder="012 345 678"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/40 transition-all"
                                        value={phoneInput}
                                        onChange={(e) => setPhoneInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">
                                    Date of Birth
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0]" />
                                    <input
                                        type="date"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-12 pr-4 py-3.5 text-sm font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/40 transition-all"
                                        value={dobInput}
                                        onChange={(e) => setDobInput(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={authLoading || !phoneInput || !dobInput}
                            className="w-full py-4 rounded-2xl text-sm font-black uppercase tracking-[0.15em] text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
                            style={{
                                backgroundColor: accentColor,
                                boxShadow: `0 10px 30px ${accentColor}30`,
                            }}
                        >
                            {authLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Lock className="w-4 h-4" />
                                    Access My Records
                                </>
                            )}
                        </button>

                        <p className="text-center text-[9px] font-bold text-[#A3AED0] tracking-widest uppercase">
                            <Lock className="w-3 h-3 inline mr-1 -mt-0.5" />
                            Secured with end-to-end encryption
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ===================
    //  PORTAL DASHBOARD
    // ===================
    if (loading || !patient) {
        return (
            <div className="min-h-screen bg-[#F4F7FE] flex items-center justify-center">
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap" rel="stylesheet" />
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: accentColor }} />
            </div>
        );
    }

    const totalTreatmentValue = appointments.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0);
    const totalPaid = appointments.reduce((sum, a) => sum + (Number(a.amount_paid) || 0), 0);
    const totalOutstanding = totalTreatmentValue - totalPaid;
    const upcomingAppointments = appointments.filter(
        (a) => a.status === "pending" && new Date(a.date) >= new Date()
    );

    const TABS: { id: PortalTab; label: string; icon: any }[] = [
        { id: "overview", label: "Overview", icon: User },
        { id: "appointments", label: "Appointments", icon: Calendar },
        { id: "payments", label: "Payments", icon: DollarSign },
        { id: "media", label: "Clinical Media", icon: ImageIcon },
    ];

    return (
        <div className="min-h-screen bg-[#F4F7FE]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap" rel="stylesheet" />

            {/* Top Header */}
            <div className="bg-white border-b border-[#E0E5F2] sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: accentColor + "15" }}
                        >
                            <Shield className="w-4 h-4" style={{ color: accentColor }} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-[#1B2559] tracking-tight">{clinicName}</h1>
                            <p className="text-[8px] font-bold text-[#A3AED0] uppercase tracking-widest">Patient Portal</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-[11px] font-black text-[#1B2559]">{patient.name}</p>
                            <p className="text-[8px] font-bold text-[#A3AED0] uppercase tracking-widest">
                                {patient.phone}
                            </p>
                        </div>
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black"
                            style={{ backgroundColor: accentColor }}
                        >
                            {patient.name?.charAt(0)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/* Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                    ? "text-white shadow-lg"
                                    : "bg-white text-[#A3AED0] border border-[#E0E5F2] hover:text-[#1B2559]"
                                }`}
                            style={{
                                backgroundColor: activeTab === tab.id ? accentColor : undefined,
                                boxShadow: activeTab === tab.id ? `0 4px 15px ${accentColor}30` : undefined,
                            }}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Overview Tab */}
                {activeTab === "overview" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Greeting */}
                        <div className="bg-white rounded-3xl border border-[#E0E5F2] p-8">
                            <h2 className="text-2xl font-black text-[#1B2559] tracking-tight mb-1">
                                Welcome back, {patient.name?.split(" ")[0]} 👋
                            </h2>
                            <p className="text-sm font-bold text-[#A3AED0]">
                                Here&apos;s a summary of your dental records
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-white rounded-2xl border border-[#E0E5F2] p-5">
                                <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-2">Total Visits</p>
                                <p className="text-3xl font-black text-[#1B2559] tracking-tighter">{appointments.length}</p>
                            </div>
                            <div className="bg-white rounded-2xl border border-[#E0E5F2] p-5">
                                <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-2">Total Paid</p>
                                <p className="text-3xl font-black tracking-tighter" style={{ color: accentColor }}>
                                    ${totalPaid.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-white rounded-2xl border border-[#E0E5F2] p-5">
                                <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-2">Outstanding</p>
                                <p className={`text-3xl font-black tracking-tighter ${totalOutstanding > 0 ? "text-[#EE5D50]" : "text-[#19D5C5]"}`}>
                                    ${totalOutstanding.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Upcoming Appointments */}
                        {upcomingAppointments.length > 0 && (
                            <div className="bg-white rounded-3xl border border-[#E0E5F2] p-6">
                                <h3 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] mb-4">
                                    Upcoming Appointments
                                </h3>
                                <div className="space-y-3">
                                    {upcomingAppointments.slice(0, 3).map((appt) => (
                                        <div key={appt.id} className="flex items-center justify-between bg-[#F4F7FE]/50 rounded-xl px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: accentColor + "15" }}>
                                                    <Calendar className="w-4 h-4" style={{ color: accentColor }} />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-[#1B2559]">
                                                        {appt.treatments?.name || appt.description}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-[#A3AED0]">
                                                        Dr. {appt.doctor?.name || "TBD"} · {appt.appointment_time || "No time set"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] font-black text-[#1B2559]">
                                                    {format(new Date(appt.date), "MMM dd")}
                                                </p>
                                                <p className="text-[9px] font-bold text-[#A3AED0]">
                                                    {format(new Date(appt.date), "yyyy")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Appointments Tab */}
                {activeTab === "appointments" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-3xl border border-[#E0E5F2] overflow-hidden">
                            <div className="px-6 py-4 border-b border-[#F4F7FE]">
                                <h3 className="text-sm font-black text-[#1B2559] tracking-tight">Treatment History</h3>
                                <p className="text-[9px] font-bold text-[#A3AED0] uppercase tracking-widest mt-0.5">
                                    {appointments.length} total records
                                </p>
                            </div>

                            {appointments.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Calendar className="w-10 h-10 text-[#A3AED0] mx-auto mb-3" />
                                    <p className="text-sm font-bold text-[#A3AED0]">No appointments yet</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#F4F7FE]">
                                    {appointments.map((appt) => {
                                        const isPaid = Number(appt.amount_remaining) <= 0;
                                        return (
                                            <div key={appt.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#F4F7FE]/30 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-center w-12 shrink-0">
                                                        <p className="text-lg font-black text-[#1B2559] leading-none">
                                                            {format(new Date(appt.date), "dd")}
                                                        </p>
                                                        <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">
                                                            {format(new Date(appt.date), "MMM")}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-[#1B2559]">
                                                            {appt.treatments?.name || appt.description}
                                                        </p>
                                                        <p className="text-[9px] font-bold text-[#A3AED0]">
                                                            Dr. {appt.doctor?.name || "—"} · Qty: {appt.quantity || 1}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <div>
                                                        <p className="text-[11px] font-black text-[#1B2559]">
                                                            ${Number(appt.total_price || 0).toLocaleString()}
                                                        </p>
                                                        <p className={`text-[8px] font-black uppercase tracking-widest ${isPaid ? "text-[#19D5C5]" : "text-[#FFB547]"}`}>
                                                            {isPaid ? "Paid" : `$${Number(appt.amount_remaining || 0).toLocaleString()} due`}
                                                        </p>
                                                    </div>
                                                    {isPaid ? (
                                                        <CheckCircle2 className="w-4 h-4 text-[#19D5C5]" />
                                                    ) : (
                                                        <Clock className="w-4 h-4 text-[#FFB547]" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Payments Tab */}
                {activeTab === "payments" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Payment Plans */}
                        {paymentPlans.length > 0 ? (
                            paymentPlans.map((plan) => (
                                <div key={plan.id} className="bg-white rounded-3xl border border-[#E0E5F2] p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-black text-[#1B2559] tracking-tight">
                                                {plan.treatment_description || "Payment Plan"}
                                            </h3>
                                            <p className="text-[9px] font-bold text-[#A3AED0] uppercase tracking-widest mt-0.5">
                                                Created {plan.created_at ? format(new Date(plan.created_at), "MMM dd, yyyy") : "—"}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest ${plan.status === "completed" ? "bg-[#19D5C5]/10 text-[#19D5C5]" : "bg-[#FFB547]/10 text-[#FFB547]"
                                            }`}>
                                            {plan.status || "Active"}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-[#F4F7FE]/50 rounded-xl p-3">
                                            <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Total</p>
                                            <p className="text-lg font-black text-[#1B2559]">${Number(plan.total_amount || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#F4F7FE]/50 rounded-xl p-3">
                                            <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Paid</p>
                                            <p className="text-lg font-black" style={{ color: accentColor }}>${Number(plan.amount_paid || 0).toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#F4F7FE]/50 rounded-xl p-3">
                                            <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Remaining</p>
                                            <p className="text-lg font-black text-[#1B2559]">${Number((plan.total_amount || 0) - (plan.amount_paid || 0)).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Payment Progress</span>
                                            <span className="text-[8px] font-black" style={{ color: accentColor }}>
                                                {plan.total_amount ? Math.round(((plan.amount_paid || 0) / plan.total_amount) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-[#F4F7FE] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${plan.total_amount ? Math.min(100, ((plan.amount_paid || 0) / plan.total_amount) * 100) : 0}%`,
                                                    backgroundColor: accentColor,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white rounded-3xl border border-[#E0E5F2] p-12 text-center">
                                <DollarSign className="w-10 h-10 text-[#A3AED0] mx-auto mb-3" />
                                <p className="text-sm font-black text-[#1B2559] mb-1">No Payment Plans</p>
                                <p className="text-[10px] font-bold text-[#A3AED0]">You don&apos;t have any active payment plans</p>
                            </div>
                        )}

                        {/* Financial Summary */}
                        <div className="bg-white rounded-3xl border border-[#E0E5F2] p-6">
                            <h3 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] mb-4">Financial Summary</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2 border-b border-[#F4F7FE]">
                                    <span className="text-[11px] font-bold text-[#A3AED0]">Total Treatment Value</span>
                                    <span className="text-[11px] font-black text-[#1B2559]">${totalTreatmentValue.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between py-2 border-b border-[#F4F7FE]">
                                    <span className="text-[11px] font-bold text-[#A3AED0]">Total Paid</span>
                                    <span className="text-[11px] font-black" style={{ color: accentColor }}>${totalPaid.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-[11px] font-black text-[#1B2559]">Outstanding Balance</span>
                                    <span className={`text-lg font-black ${totalOutstanding > 0 ? "text-[#EE5D50]" : "text-[#19D5C5]"}`}>
                                        ${totalOutstanding.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Media Tab */}
                {activeTab === "media" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {media.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-[#E0E5F2] p-12 text-center">
                                <Camera className="w-10 h-10 text-[#A3AED0] mx-auto mb-3" />
                                <p className="text-sm font-black text-[#1B2559] mb-1">No Clinical Media</p>
                                <p className="text-[10px] font-bold text-[#A3AED0]">Your clinical photos and documents will appear here</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {media.map((item: any) => {
                                    const isImage = item.mime_type?.startsWith("image/");
                                    const cat = MEDIA_CATEGORIES[item.category];

                                    return (
                                        <div
                                            key={item.id}
                                            className="group relative rounded-2xl overflow-hidden border border-[#E0E5F2] bg-white hover:shadow-xl transition-all cursor-pointer"
                                            onClick={() => isImage && item.viewUrl && setLightboxUrl(item.viewUrl)}
                                        >
                                            <div className="aspect-[4/3] bg-[#F4F7FE] relative">
                                                {isImage && item.viewUrl ? (
                                                    <img
                                                        src={item.viewUrl}
                                                        alt={item.file_name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <FileText className="w-8 h-8 text-[#A3AED0]" />
                                                    </div>
                                                )}

                                                {/* Category Badge */}
                                                <div
                                                    className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest text-white"
                                                    style={{ backgroundColor: cat?.color || "#A3AED0" }}
                                                >
                                                    {cat?.label || item.category}
                                                </div>

                                                {item.comparison_tag && (
                                                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest text-white ${item.comparison_tag === "before" ? "bg-[#FFB547]" : "bg-[#19D5C5]"
                                                        }`}>
                                                        {item.comparison_tag}
                                                    </div>
                                                )}

                                                {/* Hover */}
                                                {isImage && (
                                                    <div className="absolute inset-0 bg-[#1B2559]/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                        <Eye className="w-6 h-6 text-white" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3">
                                                <p className="text-[9px] font-black text-[#1B2559] truncate">{item.file_name}</p>
                                                <p className="text-[8px] font-bold text-[#A3AED0] mt-0.5">
                                                    {format(new Date(item.created_at), "MMM dd, yyyy")}
                                                </p>
                                                {item.tooth_tags?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {item.tooth_tags.map((t: string) => (
                                                            <span key={t} className="text-[7px] font-black px-1.5 py-0.5 rounded-md" style={{ color: accentColor, backgroundColor: accentColor + "15" }}>
                                                                #{t}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-5xl mx-auto px-6 py-8 border-t border-[#E0E5F2] mt-8">
                <p className="text-center text-[9px] font-bold text-[#A3AED0] uppercase tracking-widest">
                    © {new Date().getFullYear()} {clinicName} · Patient Portal · All rights reserved
                </p>
            </div>

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 z-[200] bg-[#1B2559]/90 backdrop-blur-xl flex items-center justify-center p-8"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt="Clinical media"
                        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}

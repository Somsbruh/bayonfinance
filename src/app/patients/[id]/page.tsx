"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Printer,
    Plus,
    Info,
    Calendar,
    DollarSign,
    User,
    Activity,
    ChevronDown,
    Phone,
    BookOpen,
    Check,
    Trash2,
    MoreHorizontal,
    X as XIcon,
    Edit2,
    Target,
    Clock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { formatTelegramLink } from "@/lib/utils";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Search } from "lucide-react";

const CATEGORIES = [
    "Diagnostics & Consultation",
    "Preventive Care",
    "Restorative Dentistry",
    "Endodontics",
    "Periodontal Care",
    "Oral Surgery",
    "Prosthodontics (Fixed)",
    "Prosthodontics (Removable)",
    "Implant Treatment",
    "Orthodontics",
    "Cosmetic Dentistry",
    "Pediatric Dentistry",
    "Emergency & Pain Management"
];
import { useCurrency } from "@/context/CurrencyContext";
import { useBranch } from "@/context/BranchContext";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function PatientDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { usdToKhr } = useCurrency();
    const [patient, setPatient] = useState<any>(null);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const searchParams = useSearchParams();
    const docParam = searchParams.get('doctor');
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>(docParam || "");
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [currentNote, setCurrentNote] = useState<string>("");
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        name: "",
        gender: "F",
        age: "",
        phone: "",
        countryCode: "+855"
    });

    const countryCodes = [
        { code: "+855", label: "🇰🇭 KH", name: "Cambodia" },
        { code: "+66", label: "🇹🇭 TH", name: "Thailand" },
        { code: "+84", label: "🇻🇳 VN", name: "Vietnam" },
        { code: "+1", label: "🇺🇸 US", name: "USA" },
        { code: "+44", label: "🇬🇧 UK", name: "UK" },
        { code: "+81", label: "🇯🇵 JP", name: "Japan" },
        { code: "+82", label: "🇰🇷 KR", name: "South Korea" },
        { code: "+65", label: "🇸🇬 SG", name: "Singapore" },
        { code: "+61", label: "🇦🇺 AU", name: "Australia" },
        { code: "+33", label: "🇫🇷 FR", name: "France" },
        { code: "+49", label: "🇩🇪 DE", name: "Germany" }
    ];

    // Historical Entry States
    const [isAddingHistorical, setIsAddingHistorical] = useState(false);
    const [treatmentSearchTerm, setTreatmentSearchTerm] = useState("");
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0]);
    const [historicalEntry, setHistoricalEntry] = useState({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        doctorId: "",
        treatmentId: "",
        amount_aba: "",
        amount_cash_usd: "",
        amount_cash_khr: "",
        method: "ABA"
    });

    const [isSettlingPayment, setIsSettlingPayment] = useState(false);
    const [settleData, setSettleData] = useState({
        originalDate: "", // To track which session we are updating
        date: "",
        time: "",
        totalValue: 0,
        alreadyPaid: 0,
        amount_aba: "",
        amount_cash_usd: "",
        amount_cash_khr: "",
    });

    const [isEditingPayment, setIsEditingPayment] = useState(false);
    const [editPaymentData, setEditPaymentData] = useState<any>(null);

    const [historyView, setHistoryView] = useState<'clinical' | 'invoices'>('clinical');

    const [managedEntry, setManagedEntry] = useState<any>(null);
    const [undoItem, setUndoItem] = useState<any>(null);
    const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);

    const { currentBranch } = useBranch();

    useEffect(() => {
        if (currentBranch) {
            fetchPatientData();
            fetchTreatments();
            fetchStaff();
        }
    }, [id, currentBranch]);

    async function fetchPatientData() {
        setIsLoading(true);
        const { data: pData, error: pError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (pData) {
            setPatient(pData);
            setProfileForm({
                name: pData.name,
                gender: pData.gender,
                age: pData.age.toString(),
                phone: pData.phone?.replace(/^\+\d+\s?/, "") || "",
                countryCode: pData.phone?.match(/^\+\d+/)?.[0] || "+855"
            });

            const { data: hData, error: hError } = await supabase
                .from('ledger_entries')
                .select(`
          *,
          treatments (name),
          doctor:staff!doctor_id (name),
          payment_history (*)
        `)
                .eq('patient_id', id)
                .order('date', { ascending: false })
                .order('appointment_time', { ascending: false });

            if (hData) {
                // Filter out any currently "deleted" item that might still be in DB but hidden in UI
                setHistory(undoItem
                    ? hData.filter((e: any) => e.id !== undoItem.id)
                    : hData
                );
            }
        }
        setIsLoading(false);
    }

    async function fetchStaff() {
        const { data } = await supabase
            .from('staff')
            .select('*')
            .eq('branch_id', currentBranch?.id)
            .eq('role', 'Doctor');
        if (data && data.length > 0) {
            setStaff(data);
            // If we have a docParam, we already set it in useState initial value, 
            // but if it's not found in the searchParams, we default to the first one.
            if (!docParam) {
                setSelectedDoctorId(data[0].id);
                setHistoricalEntry(prev => ({ ...prev, doctorId: data[0].id }));
            } else {
                setHistoricalEntry(prev => ({ ...prev, doctorId: docParam }));
            }
        }
    }

    async function fetchTreatments() {
        const { data } = await supabase
            .from('treatments')
            .select('*')
            .eq('branch_id', currentBranch?.id);
        if (data) setTreatments(data);
    }

    async function addTreatment(treatment: any) {
        if (!id) return;

        const { error } = await supabase
            .from('ledger_entries')
            .insert({
                patient_id: id,
                treatment_id: treatment.id,
                doctor_id: selectedDoctorId || staff[0]?.id,
                unit_price: treatment.price,
                total_price: treatment.price,
                amount_paid: treatment.price,
                amount_remaining: 0,
                paid_aba: treatment.price,
                paid_cash_usd: 0,
                paid_cash_khr: 0,
                applied_exchange_rate: usdToKhr,
                description: treatment.name,
                notes: currentNote,
                date: format(new Date(), 'yyyy-MM-dd'),
                appointment_time: format(new Date(), 'HH:mm:ss'),
                branch_id: currentBranch?.id
            });

        if (!error) {
            setCurrentNote(""); // Clear note
            fetchPatientData(); // Refresh
        }
    }

    async function saveVisitNote(date: string, note: string) {
        // Find all entries for this date and update their notes
        const { error } = await supabase
            .from('ledger_entries')
            .update({ notes: note })
            .eq('patient_id', id)
            .eq('date', date);

        if (!error) {
            fetchPatientData();
        }
    }

    async function toggleAppointmentPaid(date: string, currentlyPaid: boolean) {
        // Fetch all entries for this date
        const entriesOnDate = history.filter(h => h.date === date);
        for (const entry of entriesOnDate) {
            await supabase
                .from('ledger_entries')
                .update({
                    amount_paid: currentlyPaid ? 0 : entry.total_price,
                    amount_remaining: currentlyPaid ? entry.total_price : 0
                })
                .eq('id', entry.id);
        }
        fetchPatientData(); // Refresh patient totals and history
    }

    async function deleteEntry(entry: any) {
        console.log("Starting deleteEntry for:", entry.id);

        // 1. Close Modal
        setManagedEntry(null);

        // 2. Clear existing timer
        if (undoTimer) {
            console.log("Clearing existing timer");
            clearTimeout(undoTimer);
        }

        // 3. Optimistic UI update: Remove from local history
        setHistory(prevHistory => prevHistory.filter(e => e.id !== entry.id));

        setUndoItem(entry);

        // 4. Start 6-second timer to actually delete from DB
        const timer = setTimeout(async () => {
            console.log("Timer expired, delete from DB:", entry.id);
            const { error } = await supabase
                .from('ledger_entries')
                .delete()
                .eq('id', entry.id);

            if (error) {
                console.error("DB Delete error:", error);
                alert("Failed to delete record: " + error.message);
                fetchPatientData(); // Rollback
            }
            setUndoItem(null);
            setUndoTimer(null);
            fetchPatientData(); // Refresh totals
        }, 6000);

        setUndoTimer(timer);
    }

    function handleUndo() {
        console.log("Undo clicked for:", undoItem?.id);
        if (undoTimer) {
            clearTimeout(undoTimer);
            fetchPatientData(); // Restore from DB
            setUndoItem(null);
            setUndoTimer(null);
        }
    }

    async function handleUpdateEntry(id: string, updates: any) {
        const { error } = await supabase
            .from('ledger_entries')
            .update(updates)
            .eq('id', id);

        if (!error) {
            setManagedEntry(null);
            fetchPatientData();
        } else {
            alert("Error updating entry: " + error.message);
        }
    }

    async function updateAppointmentPayment(originalDate: string, newDate: string, newTime: string, aba: number, cashUsd: number, cashKhr: number) {
        const appointmentEntries = history.filter(e => e.date === originalDate);
        const totalPaidAmount = aba + cashUsd + (cashKhr / usdToKhr);
        let remainingToDistribute = totalPaidAmount;

        // Sort entries to distribute payment chronologically
        const sortedEntries = [...appointmentEntries].sort((a, b) => a.created_at.localeCompare(b.created_at));

        for (let i = 0; i < sortedEntries.length; i++) {
            const entry = sortedEntries[i];
            const isLast = i === sortedEntries.length - 1;

            let amountForThisEntry = Math.min(remainingToDistribute, Number(entry.total_price));

            // If it's the last entry and there's excess, add it here
            if (isLast && remainingToDistribute > 0) {
                amountForThisEntry = remainingToDistribute;
            }

            // Distribute the breakdown (simplified: put specific amounts in the first entry that can take them, or just proportional)
            // For now, we update the totals properly.
            const { error: updateError } = await supabase
                .from('ledger_entries')
                .update({
                    amount_paid: amountForThisEntry,
                    amount_remaining: Number(entry.total_price) - amountForThisEntry,
                    // We'll store the breakdown in the first entry of the session for audit, 
                    // or share it. For now, let's just ensure totals are right.
                    paid_aba: i === 0 ? aba : 0,
                    paid_cash_usd: i === 0 ? cashUsd : 0,
                    paid_cash_khr: i === 0 ? cashKhr : 0,
                    applied_exchange_rate: usdToKhr,
                    // Update date and time if changed
                    date: newDate,
                    appointment_time: newTime ? `${newTime}:00` : entry.appointment_time
                })
                .eq('id', entry.id);

            if (!updateError && i === 0) {
                // Record in payment history for the first entry (session master)
                // Detailed breakdown
                const methods = [];
                if (aba > 0) methods.push({ method: 'ABA', amount: aba, currency: 'USD' });
                if (cashUsd > 0) methods.push({ method: 'CASH', amount: cashUsd, currency: 'USD' });
                if (cashKhr > 0) methods.push({ method: 'CASH', amount: cashKhr, currency: 'KHR' });

                for (const m of methods) {
                    await supabase.from('payment_history').insert({
                        entry_id: entry.id,
                        amount_paid: m.amount,
                        payment_method: m.method,
                        payment_currency: m.currency
                    });
                }
            }

            remainingToDistribute -= amountForThisEntry;
        }
        fetchPatientData();
        setIsSettlingPayment(false);
    }

    async function updatePaymentAmount() {
        if (!editPaymentData) return;

        const newAmount = Number(editPaymentData.amount);
        const oldAmount = Number(editPaymentData.originalAmount);
        const difference = newAmount - oldAmount;

        // Update the payment_history record
        await supabase
            .from('payment_history')
            .update({ amount_paid: newAmount })
            .eq('id', editPaymentData.paymentId);

        // Update the ledger_entry totals
        const { data: entry } = await supabase
            .from('ledger_entries')
            .select('paid_aba, paid_cash_usd, paid_cash_khr, amount_paid')
            .eq('id', editPaymentData.ledgerEntryId)
            .single();

        if (entry) {
            let updates: any = {
                amount_paid: Number(entry.amount_paid) + difference
            };

            // Update the specific payment method field
            if (editPaymentData.method === 'ABA') {
                updates.paid_aba = Number(entry.paid_aba) + difference;
            } else if (editPaymentData.method === 'Cash' && editPaymentData.currency === 'USD') {
                updates.paid_cash_usd = Number(entry.paid_cash_usd) + difference;
            } else if (editPaymentData.method === 'Cash' && editPaymentData.currency === 'KHR') {
                updates.paid_cash_khr = Number(entry.paid_cash_khr) + difference;
            }

            await supabase
                .from('ledger_entries')
                .update(updates)
                .eq('id', editPaymentData.ledgerEntryId);
        }

        setIsEditingPayment(false);
        setEditPaymentData(null);
        fetchPatientData();
    }
    async function updateDoctor(entryId: string, doctorId: string) {
        const { error } = await supabase
            .from('ledger_entries')
            .update({ doctor_id: doctorId })
            .eq('id', entryId);

        if (!error) {
            fetchPatientData();
        }
    }

    async function addHistoricalEntry() {
        if (!historicalEntry.treatmentId) {
            alert("Please select a treatment.");
            return;
        }

        const treatment = treatments.find(t => t.id === historicalEntry.treatmentId);
        if (!treatment) return;

        const totalPaid = Number(historicalEntry.amount_aba) + Number(historicalEntry.amount_cash_usd) + (Number(historicalEntry.amount_cash_khr) / usdToKhr);

        const { data, error } = await supabase
            .from('ledger_entries')
            .insert({
                patient_id: id,
                treatment_id: treatment.id,
                doctor_id: historicalEntry.doctorId || (staff[0]?.id),
                unit_price: treatment.price,
                total_price: treatment.price,
                amount_paid: totalPaid,
                amount_remaining: treatment.price - totalPaid,
                paid_aba: Number(historicalEntry.amount_aba),
                paid_cash_usd: Number(historicalEntry.amount_cash_usd),
                paid_cash_khr: Number(historicalEntry.amount_cash_khr),
                applied_exchange_rate: usdToKhr,
                description: treatment.name,
                method: historicalEntry.method,
                date: historicalEntry.date,
                appointment_time: historicalEntry.time ? `${historicalEntry.time}:00` : format(new Date(), 'HH:mm:ss'),
                branch_id: currentBranch?.id
            })
            .select()
            .single();

        if (data) {
            // Add payment history records
            const methods = [];
            if (Number(historicalEntry.amount_aba) > 0) methods.push({ method: 'ABA', amount: Number(historicalEntry.amount_aba), currency: 'USD' });
            if (Number(historicalEntry.amount_cash_usd) > 0) methods.push({ method: 'CASH', amount: Number(historicalEntry.amount_cash_usd), currency: 'USD' });
            if (Number(historicalEntry.amount_cash_khr) > 0) methods.push({ method: 'CASH', amount: Number(historicalEntry.amount_cash_khr), currency: 'KHR' });

            for (const m of methods) {
                await supabase.from('payment_history').insert({
                    entry_id: data.id,
                    amount_paid: m.amount,
                    payment_method: m.method,
                    payment_currency: m.currency
                });
            }
        }

        if (!error) {
            // Keep modal open for rapid entry
            // Preserve sticky context (Date, Time, Doctor, Method)
            setHistoricalEntry(prev => ({
                ...prev,
                treatmentId: "",
                amount_aba: "",
                amount_cash_usd: "",
                amount_cash_khr: ""
            }));
            fetchPatientData();
            // Optional: toast or subtle feedback could go here
        } else {
            console.error("Error adding historical entry:", error);
            alert("Failed to add record. Please try again.");
        }
    }

    async function handleSaveProfile() {
        if (!profileForm.name) return;
        const { error } = await supabase
            .from('patients')
            .update({
                name: profileForm.name,
                gender: profileForm.gender,
                age: parseInt(profileForm.age) || 0,
                phone: profileForm.phone ? `${profileForm.countryCode}${profileForm.phone.startsWith('0') ? profileForm.phone.substring(1) : profileForm.phone} ` : null
            })
            .eq('id', id);

        if (!error) {
            setIsEditingProfile(false);
            fetchPatientData();
        } else {
            alert("Error updating profile: " + error.message);
        }
    }

    if (isLoading) return <div className="p-10 text-center">Loading patient...</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found.</div>;

    const lifetimeValue = history.reduce((sum, e) => sum + Number(e.total_price), 0);
    const netContributions = history.reduce((sum, e) => sum + Number(e.amount_paid), 0);
    const outstandingBalance = history.reduce((sum, e) => sum + Number(e.amount_remaining), 0);

    return (
        <div className="space-y-6 max-w-[1600px] mx-auto pb-24 px-4 overflow-x-hidden">
            {/* Ultra-Condensed Header & Profile Hybrid */}
            <div className="flex flex-col gap-4">
                <div className="card-premium p-3 bg-white/80 backdrop-blur-xl border border-[#E0E5F2] hover:shadow-2xl transition-all duration-500 group/profile">
                    <div className="flex items-center justify-between gap-6 px-1">
                        {/* Hybrid Profile & Identifiers */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[#3311DB] flex items-center justify-center text-xl font-black text-white shadow-xl shadow-primary/20 shrink-0 relative overflow-hidden">
                                {patient.name[0]}
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/profile:opacity-100 transition-opacity" />
                            </div>

                            <div className="flex-1 min-w-0">
                                {/* Top Row - Name & Vital Stats */}
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h1 className="text-xl font-black text-[#1B2559] tracking-tight truncate max-w-[300px]">{patient.name}</h1>

                                    <div className="flex items-center gap-3">
                                        {/* Unified Vital Badge */}
                                        <div className="flex items-center bg-[#F4F7FE] px-4 py-1.5 rounded-xl border border-[#E0E5F2] gap-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", patient.gender === 'F' ? 'bg-rose-500' : 'bg-blue-500')} />
                                                <span className="text-[10px] font-black text-[#1B2559] uppercase tracking-widest">{patient.gender === 'F' ? 'Female' : 'Male'}</span>
                                            </div>
                                            <div className="w-px h-3 bg-[#E0E5F2]" />
                                            <span className="text-[10px] font-black text-[#1B2559] uppercase tracking-widest">{patient.age} Years</span>
                                        </div>

                                        {/* Contact Trigger */}
                                        {patient.phone ? (
                                            <a
                                                href={formatTelegramLink(patient.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 bg-primary/5 hover:bg-primary text-primary hover:text-white px-3 py-1.5 rounded-xl border border-primary/10 transition-all group/phone"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{patient.phone.replace(/^\+/, '')}</span>
                                            </a>
                                        ) : (
                                            <div className="text-[9px] text-[#A3AED0] font-black uppercase tracking-widest italic flex items-center gap-2">
                                                <Phone className="w-3 h-3" /> No Contact Node
                                            </div>
                                        )}

                                        {/* Expand Toggle */}
                                        <button
                                            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                                            className={cn(
                                                "p-1.5 rounded-lg transition-all",
                                                isProfileExpanded ? "bg-primary text-white" : "hover:bg-[#F4F7FE] text-[#A3AED0]"
                                            )}
                                        >
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Bottom Row - Expandable Details */}
                                {isProfileExpanded && (
                                    <div className="mt-3 pt-3 border-t border-[#F4F7FE] flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Global Register Ref</span>
                                                <span className="text-[10px] font-bold text-[#1B2559]">{patient.id.toUpperCase()}</span>
                                            </div>
                                            <button
                                                onClick={() => setIsEditingProfile(true)}
                                                className="flex items-center gap-2 text-primary hover:text-[#3311DB] transition-colors"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Update Identity</span>
                                            </button>
                                        </div>
                                        <div className="text-[9px] text-[#707EAE] font-bold italic">
                                            Client node synchronized & verified
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Global Actions Context */}
                        <div className="flex items-center gap-2 border-l border-[#F4F7FE] pl-6 shrink-0">
                            <button
                                onClick={() => {
                                    setHistoricalEntry(prev => ({ ...prev, doctorId: staff[0]?.id || "" }));
                                    setIsAddingHistorical(true);
                                }}
                                className="bg-primary hover:bg-[#3311DB] text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-lg active:scale-95 shadow-primary/20"
                            >
                                <Plus className="w-4 h-4" />
                                New Appointment
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-8 space-y-6">

                    {/* History Section - Tabbed View */}
                    < div className="space-y-6" >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setHistoryView('clinical')}
                                    className={cn(
                                        "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        historyView === 'clinical'
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "bg-[#F4F7FE] text-[#A3AED0] hover:bg-white border border-[#E0E5F2]"
                                    )}
                                >
                                    <Activity className="w-4 h-4" />
                                    Clinical Progress
                                </button>
                                <button
                                    onClick={() => setHistoryView('invoices')}
                                    className={cn(
                                        "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                        historyView === 'invoices'
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "bg-[#F4F7FE] text-[#A3AED0] hover:bg-white border border-[#E0E5F2]"
                                    )}
                                >
                                    <Printer className="w-4 h-4" />
                                    Invoice History
                                </button>
                            </div>
                            <span className="text-[10px] text-[#A3AED0] bg-[#F4F7FE] px-4 py-2 rounded-xl border border-[#E0E5F2] font-black uppercase tracking-widest leading-none">
                                {history.length} Records
                            </span>
                        </div>

                        {/* Clinical Progress View */}
                        {
                            historyView === 'clinical' && (
                                <>
                                    {Object.entries(
                                        history.reduce((acc: any, entry: any) => {
                                            const date = entry.date;
                                            if (!acc[date]) acc[date] = [];
                                            acc[date].push(entry);
                                            return acc;
                                        }, {})
                                    ).map(([date, entries]: [string, any]) => {
                                        const dateTotal = entries.reduce((sum: number, e: any) => sum + Number(e.total_price), 0);
                                        const datePaid = entries.reduce((sum: number, e: any) => sum + Number(e.amount_paid), 0);
                                        const dateBalance = entries.reduce((sum: number, e: any) => sum + Number(e.amount_remaining), 0);

                                        return (
                                            <div key={date} className="card-premium overflow-hidden border border-[#F4F7FE]">
                                                <div className="bg-[#F4F7FE]/50 px-8 py-6 border-b border-[#E0E5F2] flex items-center justify-between">
                                                    <div className="flex items-center gap-5">
                                                        <div className="bg-white text-primary p-3 rounded-2xl shadow-sm border border-[#E0E5F2]">
                                                            <Calendar className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <div className="text-lg font-black text-[#1B2559] tracking-tight">{(() => {
                                                                const d = new Date(date);
                                                                return !isNaN(d.getTime()) ? format(d, 'MMMM do, yyyy') : 'Invalid Date';
                                                            })()}</div>
                                                            <div className="text-[10px] text-[#A3AED0] uppercase font-black tracking-widest">Appointment Session</div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="text-[8px] text-[#A3AED0] uppercase font-black tracking-widest mb-0.5 opacity-60">Session Value</div>
                                                            <div className="text-xs font-black text-[#1B2559]">${dateTotal.toLocaleString()}</div>
                                                        </div>
                                                        <div className="w-px h-8 bg-[#E0E5F2]" />
                                                        <div className="text-right">
                                                            <div className="text-[8px] text-[#A3AED0] uppercase font-black tracking-widest mb-0.5 opacity-60">Remaining</div>
                                                            <div className="text-xs font-black text-destructive">${dateBalance.toLocaleString()}</div>
                                                        </div>

                                                        <div className="w-px h-8 bg-[#E0E5F2]" />
                                                        <div className="flex items-center gap-2 ml-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSettleData({
                                                                        originalDate: date,
                                                                        date: date,
                                                                        time: format(new Date(), 'HH:mm'),
                                                                        totalValue: dateTotal,
                                                                        alreadyPaid: datePaid,
                                                                        amount_aba: "",
                                                                        amount_cash_usd: "",
                                                                        amount_cash_khr: ""
                                                                    });
                                                                    setIsSettlingPayment(true);
                                                                }}
                                                                className="bg-[#01B574] hover:bg-[#01945d] text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shadow-[#01B574]/20 flex items-center gap-1.5"
                                                            >
                                                                <DollarSign className="w-3 h-3" />
                                                                Settle
                                                            </button>

                                                            <Link
                                                                href={`/print?patient=${encodeURIComponent(patient.name)}&date=${date}&total=${dateTotal}&paid=${datePaid}&balance=${dateBalance}`}
                                                                className="p-2.5 bg-white hover:bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl text-[#A3AED0] hover:text-primary transition-all shadow-sm flex items-center justify-center"
                                                            >
                                                                <Printer className="w-4 h-4" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>

                                                <table className="w-full ledger-table">
                                                    <thead>
                                                        <tr className="bg-[#F4F7FE]/20 text-[9px] uppercase font-black tracking-widest text-[#A3AED0] border-b border-[#F4F7FE]">
                                                            <th className="px-10 py-5 text-left">Clinical Procedure</th>
                                                            <th className="px-8 py-5 text-right">Value</th>
                                                            <th className="px-8 py-5 text-center">Practitioner</th>
                                                            <th className="px-8 py-5 w-[80px]"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#F4F7FE]">
                                                        {entries.map((entry: any) => (
                                                            <tr key={entry.id} className="group hover:bg-[#F8FAFF] transition-colors">
                                                                <td
                                                                    className="px-10 py-6 cursor-pointer"
                                                                    onClick={() => setManagedEntry(entry)}
                                                                >
                                                                    <div className="font-bold text-[#1B2559] text-base group-hover:text-primary transition-colors">{entry.treatments?.name || entry.description}</div>
                                                                    <div className="text-[10px] text-[#A3AED0] font-black uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                                        <Clock className="w-3 h-3 text-primary/40" />
                                                                        {(() => {
                                                                            try {
                                                                                if (entry.appointment_time && entry.appointment_time.trim()) {
                                                                                    const timeDate = new Date(`2000-01-01T${entry.appointment_time.trim()}`);
                                                                                    if (!isNaN(timeDate.getTime())) return format(timeDate, 'hh:mm a');
                                                                                }
                                                                                const createdDate = new Date(entry.created_at);
                                                                                if (!isNaN(createdDate.getTime())) return format(createdDate, 'hh:mm a');
                                                                                return '--:--';
                                                                            } catch { return '--:--'; }
                                                                        })()}
                                                                    </div>
                                                                </td>
                                                                <td className="px-8 py-6 text-right font-black text-[#1B2559] text-base tracking-tight">
                                                                    ${Number(entry.total_price).toLocaleString()}
                                                                    {entry.payment_history && entry.payment_history.length > 0 && (
                                                                        <div className="mt-2 space-y-0.5 opacity-60">
                                                                            {entry.payment_history.map((ph: any) => (
                                                                                <div key={ph.id} className="text-[9px] font-bold text-[#A3AED0] uppercase tracking-widest flex items-center justify-end gap-2 group/payment">
                                                                                    <button
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setEditPaymentData({
                                                                                                paymentId: ph.id,
                                                                                                ledgerEntryId: entry.id,
                                                                                                method: ph.payment_method,
                                                                                                currency: ph.payment_currency,
                                                                                                amount: ph.amount_paid.toString(),
                                                                                                originalAmount: ph.amount_paid
                                                                                            });
                                                                                            setIsEditingPayment(true);
                                                                                        }}
                                                                                        className="opacity-0 group-hover/payment:opacity-100 transition-opacity hover:text-primary"
                                                                                    >
                                                                                        <Edit2 className="w-3 h-3" />
                                                                                    </button>
                                                                                    <span>{ph.payment_method}</span>
                                                                                    <span className="text-primary">{ph.payment_currency === 'USD' ? '$' : '៛'}{Number(ph.amount_paid).toLocaleString()}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-8 py-6 text-center">
                                                                    <select
                                                                        className={cn(
                                                                            "text-[10px] bg-[#F4F7FE] px-5 py-2 rounded-2xl font-black uppercase tracking-widest cursor-pointer hover:bg-primary/10 transition-colors border-none outline-none text-[#1B2559]",
                                                                            !entry.doctor_id && "text-destructive bg-destructive/10"
                                                                        )}
                                                                        value={entry.doctor_id || ""}
                                                                        onChange={(e) => updateDoctor(entry.id, e.target.value)}
                                                                    >
                                                                        <option value="">Pending Assign</option>
                                                                        {staff.map(s => (
                                                                            <option key={s.id} value={s.id}>{s.name}</option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="px-8 py-6 text-right">
                                                                    <button
                                                                        onClick={() => setManagedEntry(entry)}
                                                                        className="p-3 hover:bg-white rounded-2xl text-[#A3AED0] hover:text-primary transition-all border border-transparent hover:border-[#E0E5F2] hover:shadow-sm"
                                                                    >
                                                                        <MoreHorizontal className="w-5 h-5" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>

                                                {/* Clinical Notes */}
                                                <div className="px-10 py-6 border-t border-[#F4F7FE] bg-[#F4F7FE]/10">
                                                    <details className="group">
                                                        <summary className="list-none cursor-pointer flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#707EAE] hover:text-primary transition-colors">
                                                            <div className="flex items-center gap-3">
                                                                <BookOpen className="w-4 h-4 text-primary" />
                                                                <span>Clinical Findings & Session Notes</span>
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center group-open:rotate-180 transition-transform shadow-sm">
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            </div>
                                                        </summary>
                                                        <div className="mt-5">
                                                            <textarea
                                                                className="w-full bg-white border border-[#E0E5F2] rounded-3xl p-6 text-sm min-h-[140px] focus:ring-4 focus:ring-primary/5 transition-all shadow-inner font-bold text-[#1B2559] outline-none"
                                                                placeholder="Input specialized medical findings, observations, or specific patient feedback for this session..."
                                                                defaultValue={entries[0].notes || ""}
                                                                onBlur={(e) => saveVisitNote(date, e.target.value)}
                                                            />
                                                            <p className="text-[9px] text-[#A3AED0] font-black uppercase tracking-widest mt-3 text-right">Encrypted Medical Storage · Auto-sinc</p>
                                                        </div>
                                                    </details>
                                                    {!entries[0].notes && (
                                                        <div className="mt-2 pl-7 group-open:hidden">
                                                            <p className="text-[10px] text-[#A3AED0] font-medium italic opacity-60 italic">Open this section to add specialized clinical observation notes for this visit.</p>
                                                        </div>
                                                    )}
                                                    {entries[0].notes && (
                                                        <div className="mt-3 pl-7 group-open:hidden border-l-2 border-primary/20">
                                                            <p className="text-sm text-[#707EAE] font-semibold line-clamp-1 italic">"{entries[0].notes}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {history.length === 0 && (
                                        <div className="card-premium border-dashed border-2 border-[#E0E5F2] p-24 text-center">
                                            <div className="flex flex-col items-center gap-5 opacity-40">
                                                <Activity className="w-20 h-20 text-[#A3AED0]" />
                                                <div>
                                                    <p className="text-lg font-black text-[#1B2559] tracking-tight">No Clinical Records Yet</p>
                                                    <p className="text-sm font-bold text-[#A3AED0]">Start documenting patient progress by selecting treatments from the panel.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )
                        }

                        {/* Invoice History View */}
                        {
                            historyView === 'invoices' && (
                                <div className="space-y-4">
                                    {history.map((entry, idx) => (
                                        <div key={entry.id} className="card-premium overflow-hidden border border-[#E0E5F2] hover:border-primary/20 transition-all group">
                                            {/* Invoice Header */}
                                            <div className="bg-gradient-to-r from-[#F4F7FE] to-white px-6 py-4 border-b border-[#E0E5F2] flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                        <span className="text-sm font-black text-primary">#{history.length - idx}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-[#1B2559]">{entry.treatments?.name || entry.description}</p>
                                                        <p className="text-[9px] text-[#A3AED0] font-bold uppercase tracking-wider">
                                                            {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={cn(
                                                        "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider",
                                                        Number(entry.amount_remaining) > 0
                                                            ? "bg-amber-50 border border-amber-200 text-amber-600"
                                                            : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                                                    )}>
                                                        {Number(entry.amount_remaining) > 0 ? 'Partial' : 'Paid'}
                                                    </span>
                                                    <span className="text-lg font-black text-[#1B2559]">
                                                        ${Number(entry.amount_paid).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Invoice Body */}
                                            <div className="p-6 space-y-4">
                                                {/* Service Details */}
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] text-[#A3AED0] font-black uppercase tracking-widest mb-1">Practitioner</p>
                                                        <p className="text-sm font-bold text-[#1B2559]">{entry.doctor?.name || 'Unassigned'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] text-[#A3AED0] font-black uppercase tracking-widest mb-1">Total Billed</p>
                                                        <p className="text-sm font-bold text-[#1B2559]">${Number(entry.total_price).toLocaleString()}</p>
                                                    </div>
                                                </div>

                                                {/* Payment Breakdown */}
                                                {entry.payment_history && entry.payment_history.length > 0 && (
                                                    <div className="pt-4 border-t border-[#E0E5F2]">
                                                        <p className="text-[9px] text-[#A3AED0] font-black uppercase tracking-widest mb-3">Payment Methods</p>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {entry.payment_history.map((ph: any) => (
                                                                <div key={ph.id} className={cn(
                                                                    "border rounded-xl px-3 py-2",
                                                                    ph.payment_method === 'ABA' && "bg-blue-50 border-blue-200",
                                                                    ph.payment_method === 'Cash' && ph.payment_currency === 'USD' && "bg-emerald-50 border-emerald-200",
                                                                    ph.payment_method === 'Cash' && ph.payment_currency === 'KHR' && "bg-amber-50 border-amber-200"
                                                                )}>
                                                                    <p className={cn(
                                                                        "text-[8px] font-black uppercase tracking-wider mb-0.5",
                                                                        ph.payment_method === 'ABA' && "text-blue-600",
                                                                        ph.payment_method === 'Cash' && ph.payment_currency === 'USD' && "text-emerald-600",
                                                                        ph.payment_method === 'Cash' && ph.payment_currency === 'KHR' && "text-amber-600"
                                                                    )}>{ph.payment_method} {ph.payment_currency}</p>
                                                                    <p className={cn(
                                                                        "text-xs font-bold",
                                                                        ph.payment_method === 'ABA' && "text-blue-700",
                                                                        ph.payment_method === 'Cash' && ph.payment_currency === 'USD' && "text-emerald-700",
                                                                        ph.payment_method === 'Cash' && ph.payment_currency === 'KHR' && "text-amber-700"
                                                                    )}>{ph.payment_currency === 'USD' ? '$' : '៛'}{Number(ph.amount_paid).toLocaleString()}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Receipt Actions */}
                                                <div className="pt-3 flex items-center justify-between border-t border-[#E0E5F2]">
                                                    <p className="text-[8px] text-[#A3AED0] font-mono">ID: {entry.id.substring(0, 12)}</p>
                                                    <Link
                                                        href={`/print?patient=${encodeURIComponent(patient.name)}&date=${entry.date}&total=${entry.total_price}&paid=${entry.amount_paid}&balance=${entry.amount_remaining}`}
                                                        className="text-[10px] font-black text-primary hover:text-blue-600 uppercase tracking-wider transition-colors flex items-center gap-2 opacity-0 group-hover:opacity-100"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        Print Receipt
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {history.length === 0 && (
                                        <div className="card-premium border-dashed border-2 border-[#E0E5F2] p-24 text-center">
                                            <div className="flex flex-col items-center gap-5 opacity-40">
                                                <Printer className="w-20 h-20 text-[#A3AED0]" />
                                                <div>
                                                    <p className="text-lg font-black text-[#1B2559] tracking-tight">No Invoices Yet</p>
                                                    <p className="text-sm font-bold text-[#A3AED0]">Invoice history will appear here once treatments are recorded.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    </div >
                </div >

                {/* Right Section: Treatment Menu & Statistics */}
                < div className="col-span-4 space-y-8 sticky top-8" id="treatment-menu" >

                    {/* Management Module */}
                    < div className="card-premium p-6 border-none flex flex-col h-[700px] sticky top-8" >
                        <div className="flex items-center justify-between mb-4 shrink-0">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#A3AED0] flex items-center gap-3">
                                <Plus className="w-4 h-4 text-primary" />
                                Clinical Menu
                            </h3>
                            <div className="h-1 w-12 bg-primary/10 rounded-full" />
                        </div>

                        <div className="space-y-4 mb-4 shrink-0">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Assign Lead Practitioner</label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-xs font-black text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all appearance-none outline-none cursor-pointer uppercase tracking-widest"
                                        value={selectedDoctorId}
                                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                                    >
                                        {staff.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-[#A3AED0] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>

                            {/* Visit Remark Removed */}

                            {/* Search & Filter */}
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0]" />
                                    <input
                                        type="text"
                                        placeholder="Filter treatments..."
                                        className="w-full bg-white border border-[#E0E5F2] rounded-xl pl-9 pr-3 py-2.5 text-xs font-bold text-[#1B2559] outline-none focus:border-primary/30 transition-all"
                                        value={treatmentSearchTerm}
                                        onChange={(e) => setTreatmentSearchTerm(e.target.value)}
                                    />
                                </div>
                                {/* Tags Filter */}
                                {(() => {
                                    const specialtyTags = Array.from(new Set(treatments.map(t => t.specialty_tag).filter(Boolean))) as string[];
                                    if (specialtyTags.length === 0) return null;
                                    return (
                                        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-hide py-1">
                                            {specialtyTags.map(tag => {
                                                const isActive = treatmentSearchTerm.includes(tag);
                                                return (
                                                    <button
                                                        key={tag}
                                                        onClick={() => setTreatmentSearchTerm(isActive ? "" : tag)}
                                                        className={clsx(
                                                            "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all border",
                                                            isActive
                                                                ? "bg-[#01B574] text-white border-[#01B574] shadow-md shadow-[#01B574]/20"
                                                                : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:border-[#01B574]/50 hover:text-[#01B574]"
                                                        )}
                                                    >
                                                        {tag}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Category Tabs & Visual Hub */}
                        <div className="shrink-0 mb-4 bg-[#F4F7FE]/50 p-2 rounded-2xl border border-[#E0E5F2]">
                            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
                                {CATEGORIES.map(category => (
                                    <button
                                        key={category}
                                        onClick={() => setActiveCategory(category)}
                                        className={cn(
                                            "whitespace-nowrap px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all border",
                                            activeCategory === category
                                                ? "bg-[#1B2559] text-white border-[#1B2559] shadow-md shadow-[#1B2559]/20"
                                                : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:border-primary/30 hover:text-primary"
                                        )}
                                    >
                                        {category.split(' ').slice(0, 2).join(' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Treatments Grid - ULTRA DENSE 3-COLUMN */}
                        <div className="overflow-y-auto pr-1 flex-1 scrollbar-hide">
                            <div className="grid grid-cols-3 gap-2 pb-4">
                                {treatments
                                    .filter(t => {
                                        const matchesSearch = treatmentSearchTerm === "" ||
                                            t.name.toLowerCase().includes(treatmentSearchTerm.toLowerCase()) ||
                                            (t.specialty_tag && t.specialty_tag.toLowerCase().includes(treatmentSearchTerm.toLowerCase()));

                                        if (treatmentSearchTerm.length > 0) return matchesSearch;
                                        return t.category === activeCategory;
                                    })
                                    .map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => addTreatment(t)}
                                            className="group flex flex-col items-center justify-center p-2.5 bg-white border border-[#F4F7FE] hover:border-primary/40 rounded-xl transition-all hover:shadow-lg hover:bg-[#F8FAFF] text-center h-[90px] relative overflow-hidden"
                                        >
                                            <div className="text-[8px] font-black text-[#1B2559] group-hover:text-primary leading-tight line-clamp-3 mb-1">
                                                {t.name}
                                            </div>
                                            <div className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">
                                                ${t.price}
                                            </div>
                                            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                    <Plus className="w-2.5 h-2.5" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-[#F4F7FE] flex items-center justify-center gap-2 opacity-60">
                            <Info className="w-3 h-3 text-primary" />
                            <span className="text-[8px] font-bold text-[#A3AED0] uppercase tracking-widest italic">Node sync active</span>
                        </div>
                    </div>

                    {/* Contract Summary Card - Inspiration from Gradient Card */}
                    < div className="rounded-[2.5rem] bg-gradient-to-br from-primary to-[#3311DB] p-8 space-y-6 shadow-2xl shadow-primary/30 relative overflow-hidden" >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Activity className="w-24 h-24 text-white" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 text-white/70 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                <DollarSign className="w-4 h-4" />
                                Portfolio health
                            </div>
                            <div className="space-y-1">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Aggregate Liability</p>
                                <p className="text-3xl font-black text-white tracking-tighter">${lifetimeValue.toLocaleString()}</p>
                            </div>

                            <div className="mt-8 space-y-3">
                                <div className="flex justify-between items-end">
                                    <p className="text-[10px] text-white/70 font-black uppercase tracking-widest">Realized Collection</p>
                                    <p className="text-xs text-white font-black">{lifetimeValue > 0 ? ((netContributions / lifetimeValue) * 100).toFixed(1) : 0}%</p>
                                </div>
                                <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
                                    <div
                                        className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-1000"
                                        style={{ width: `${lifetimeValue > 0 ? (netContributions / lifetimeValue) * 100 : 0}% ` }}
                                    />
                                </div>
                            </div>

                            <p className="text-[9px] text-white/50 font-medium italic mt-6 text-center">
                                Detailed audit available in global financial reports
                            </p>
                        </div>
                    </div >
                </div >
            </div >
            {/* Historical Entry Modal */}
            {
                isAddingHistorical && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white border border-[#E0E5F2] rounded-[2rem] w-full max-w-2xl shadow-2xl p-6 space-y-4 relative overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-[#3311DB]" />

                            <div className="flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary shadow-inner">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-[#1B2559] tracking-tight leading-none">Record Legacy Visit</h3>
                                        <p className="text-[8px] text-[#A3AED0] font-black uppercase tracking-widest mt-1">Manual Procedural Entry</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsAddingHistorical(false)}
                                    className="p-2 rounded-xl text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Clinical Date</label>
                                        <input
                                            type="date"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={historicalEntry.date}
                                            onChange={(e) => setHistoricalEntry({ ...historicalEntry, date: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Time</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                value={historicalEntry.time}
                                                onChange={(e) => setHistoricalEntry({ ...historicalEntry, time: e.target.value })}
                                            />
                                            <Clock className="w-3.5 h-3.5 text-[#A3AED0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1 flex flex-col">
                                        <label className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Practitioner</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-[11px] font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                                            value={historicalEntry.doctorId}
                                            onChange={(e) => setHistoricalEntry({ ...historicalEntry, doctorId: e.target.value })}
                                        >
                                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1 flex flex-col min-w-0">
                                        <label className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Clinical Procedure</label>

                                        <div className="bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl flex flex-col overflow-hidden h-[180px]">
                                            <div className="p-2 border-b border-[#E0E5F2] bg-white/50 sticky top-0 z-10 shrink-0">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A3AED0]" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search clinical lexicon..."
                                                        className="w-full bg-white border border-[#E0E5F2] rounded-lg pl-7 pr-3 py-1.5 text-[10px] font-bold text-[#1B2559] outline-none"
                                                        value={treatmentSearchTerm}
                                                        onChange={(e) => setTreatmentSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="overflow-y-auto p-1.5 space-y-1 scrollbar-hide flex-1">
                                                {CATEGORIES.map(category => {
                                                    const categoryTreatments = treatments.filter(t =>
                                                        t.category === category &&
                                                        (t.name.toLowerCase().includes(treatmentSearchTerm.toLowerCase()) ||
                                                            category.toLowerCase().includes(treatmentSearchTerm.toLowerCase()))
                                                    );

                                                    if (categoryTreatments.length === 0) return null;
                                                    const isExpanded = expandedCategories.includes(category) || treatmentSearchTerm.length > 0;

                                                    return (
                                                        <div key={category} className="space-y-0.5">
                                                            <button
                                                                onClick={() => setExpandedCategories(prev =>
                                                                    prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
                                                                )}
                                                                className="w-full flex items-center justify-between px-2 py-1 bg-white/40 hover:bg-white/60 rounded-lg transition-colors text-left"
                                                            >
                                                                <span className="text-[8px] font-black text-[#707EAE] uppercase tracking-widest leading-none">{category}</span>
                                                                <ChevronDown className={clsx("w-3 h-3 text-[#A3AED0] transition-transform", isExpanded && "rotate-180")} />
                                                            </button>

                                                            {isExpanded && (
                                                                <div className="grid grid-cols-1 gap-0.5">
                                                                    {categoryTreatments.map(t => (
                                                                        <button
                                                                            key={t.id}
                                                                            onClick={() => setHistoricalEntry({
                                                                                ...historicalEntry,
                                                                                treatmentId: t.id,
                                                                                amount_aba: t.price.toString(),
                                                                                amount_cash_usd: "",
                                                                                amount_cash_khr: ""
                                                                            })}
                                                                            className={clsx(
                                                                                "w-full text-left p-1.5 rounded-lg border transition-all flex items-center justify-between gap-2",
                                                                                historicalEntry.treatmentId === t.id
                                                                                    ? "bg-primary border-primary shadow-sm shadow-primary/20"
                                                                                    : "bg-white border-[#E0E5F2] hover:border-primary/20"
                                                                            )}
                                                                        >
                                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                                <span className={clsx("text-[9px] font-black leading-tight truncate", historicalEntry.treatmentId === t.id ? "text-white" : "text-[#1B2559]")}>
                                                                                    {t.name}
                                                                                </span>
                                                                            </div>
                                                                            <span className={clsx("text-[9px] font-black shrink-0", historicalEntry.treatmentId === t.id ? "text-white" : "text-primary")}>
                                                                                ${t.price}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 bg-[#F4F7FE]/50 p-4 rounded-2xl border border-[#E0E5F2] shrink-0">
                                <label className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest pl-1 mb-0.5 block">Financial Breakdown</label>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary">ABA</span>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-[#E0E5F2] rounded-lg pl-10 pr-2 py-2 text-xs font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="0.00"
                                            value={historicalEntry.amount_aba}
                                            onChange={(e) => setHistoricalEntry({ ...historicalEntry, amount_aba: e.target.value })}
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-[#01B574]">USD</span>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-[#E0E5F2] rounded-lg pl-10 pr-2 py-2 text-xs font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="0.00"
                                            value={historicalEntry.amount_cash_usd}
                                            onChange={(e) => setHistoricalEntry({ ...historicalEntry, amount_cash_usd: e.target.value })}
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-rose-500">KHR</span>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-[#E0E5F2] rounded-lg pl-10 pr-2 py-2 text-xs font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="0"
                                            value={historicalEntry.amount_cash_khr}
                                            onChange={(e) => setHistoricalEntry({ ...historicalEntry, amount_cash_khr: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center px-2 pt-1.5 border-t border-[#E0E5F2]">
                                    <span className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest leading-none">Total Intake</span>
                                    <span className="text-sm font-black text-primary tracking-tighter">
                                        ${(Number(historicalEntry.amount_aba) + Number(historicalEntry.amount_cash_usd) + (Number(historicalEntry.amount_cash_khr) / usdToKhr)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 items-center gap-3 shrink-0">
                                <label className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest pl-1 leading-none">Principal Instrument</label>
                                <select
                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                                    value={historicalEntry.method}
                                    onChange={(e) => setHistoricalEntry({ ...historicalEntry, method: e.target.value })}
                                >
                                    <option value="ABA">ABA Bank</option>
                                    <option value="CASH">Cash</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-1 shrink-0">
                                <button
                                    onClick={() => setIsAddingHistorical(false)}
                                    className="flex-1 text-[#A3AED0] hover:text-[#1B2559] py-3 rounded-xl text-[9px] font-black transition-all uppercase tracking-widest border border-transparent hover:border-[#E0E5F2]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={addHistoricalEntry}
                                    className="flex-[2] bg-primary hover:bg-[#3311DB] text-white py-3 rounded-xl text-[10px] font-black transition-all shadow-lg shadow-primary/25 uppercase tracking-[0.2em]"
                                >
                                    Reconcile Past Entry
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Treatment Management Modal */}
            {
                managedEntry && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                        <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />

                            <button
                                onClick={() => setManagedEntry(null)}
                                className="absolute top-6 right-6 p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-sm flex-shrink-0">
                                    <Activity className="w-7 h-7" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-black tracking-tight text-[#1B2559]">Refine Entry</h3>
                                    <p className="text-xs text-[#707EAE] font-bold truncate max-w-[200px]">{managedEntry.treatments?.name || managedEntry.description}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[#F4F7FE]/50 p-5 rounded-[2rem] border border-[#E0E5F2]">
                                    <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1 mb-2 block">Actualized Collection (USD)</label>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary text-lg font-black opacity-40">$</div>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-[#E0E5F2] focus:ring-4 ring-primary/5 rounded-2xl px-12 py-4 text-xl font-black text-[#1B2559] transition-all outline-none text-center"
                                            defaultValue={managedEntry.amount_paid}
                                            onBlur={(e) => {
                                                const paid = Number(e.target.value);
                                                handleUpdateEntry(managedEntry.id, {
                                                    amount_paid: paid,
                                                    amount_remaining: Number(managedEntry.total_price) - paid
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Practitioner</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[11px] font-black text-[#1B2559] outline-none cursor-pointer appearance-none uppercase tracking-widest"
                                            defaultValue={managedEntry.doctor_id || ""}
                                            onChange={(e) => handleUpdateEntry(managedEntry.id, { doctor_id: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Instrument</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[11px] font-black text-[#1B2559] outline-none cursor-pointer appearance-none uppercase tracking-widest"
                                            defaultValue={managedEntry.method || "CASH"}
                                            onChange={(e) => handleUpdateEntry(managedEntry.id, { method: e.target.value })}
                                        >
                                            <option value="ABA">ABA Bank</option>
                                            <option value="CASH">Cash</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Appointment Time</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-xs font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all text-center"
                                            defaultValue={managedEntry.appointment_time?.substring(0, 5) || format(new Date(managedEntry.created_at), 'HH:mm')}
                                            onBlur={(e) => handleUpdateEntry(managedEntry.id, { appointment_time: `${e.target.value}:00` })}
                                        />
                                        <Clock className="w-3.5 h-3.5 text-[#A3AED0] absolute right-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button
                                    onClick={() => setManagedEntry(null)}
                                    className="w-full bg-[#1B2559] text-white py-4 rounded-2xl text-xs font-black transition-all hover:bg-primary shadow-lg uppercase tracking-widest"
                                >
                                    Secure Entry
                                </button>
                                <button
                                    onClick={() => deleteEntry(managedEntry)}
                                    className="w-full text-destructive hover:bg-destructive/5 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Void Record
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Undo Notification System */}
            {
                undoItem && (
                    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-10 duration-500">
                        <div className="bg-[#1B2559] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-[2rem] px-8 py-5 flex items-center gap-10 min-w-[400px] backdrop-blur-xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center text-destructive shadow-inner">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-black tracking-tight">Clinical Entry Voided</p>
                                    <p className="text-[10px] text-[#A3AED0] font-black uppercase tracking-widest mt-0.5">{undoItem.treatments?.name || undoItem.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleUndo}
                                className="ml-auto bg-primary text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/40 border border-white/10"
                            >
                                Rollback
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Edit Profile Modal */}
            {
                isEditingProfile && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white border-2 border-white rounded-[2.5rem] w-full max-w-lg shadow-[0_50px_100px_rgba(27,37,89,0.25)] p-8 space-y-6 relative overflow-hidden">
                            <button
                                onClick={() => setIsEditingProfile(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FE] rounded-full text-[#A3AED0] transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-xl bg-primary/10 text-primary shadow-inner">
                                    <Edit2 className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#1B2559] tracking-tight">Edit Personalia</h3>
                                    <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest mt-1">Secure Profile Update</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#707EAE] uppercase tracking-widest pl-1">Full Identity Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-3.5 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                        value={profileForm.name}
                                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#707EAE] uppercase tracking-widest pl-1">Biological Gender</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-3.5 text-xs font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                                            value={profileForm.gender}
                                            onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                        >
                                            <option value="F">Female</option>
                                            <option value="M">Male</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-[#707EAE] uppercase tracking-widest pl-1">Date of Birth</label>
                                        <input
                                            type="text"
                                            placeholder="DD/MM/YYYY"
                                            className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-3.5 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            value={profileForm.age}
                                            onChange={(e) => {
                                                let value = e.target.value.replace(/\D/g, '');
                                                if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2);
                                                if (value.length >= 5) value = value.slice(0, 5) + '/' + value.slice(5, 9);
                                                setProfileForm({ ...profileForm, age: value });
                                            }}
                                            maxLength={10}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-[#707EAE] uppercase tracking-widest pl-1">Contact Phone</label>
                                    <div className="flex gap-2">
                                        <div className="relative w-32">
                                            <select
                                                className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3.5 text-xs font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                                                value={profileForm.countryCode}
                                                onChange={(e) => setProfileForm({ ...profileForm, countryCode: e.target.value })}
                                            >
                                                {countryCodes.map(c => (
                                                    <option key={c.code} value={c.code}>{c.label}</option>
                                                ))}
                                            </select>
                                            <ChevronDown className="w-3 h-3 text-[#A3AED0] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        </div>
                                        <input
                                            type="text"
                                            className="flex-1 bg-[#F4F7FE] border-none rounded-xl px-5 py-3.5 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="e.g. 12 345 678"
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-primary hover:bg-[#3311DB] text-white py-4 rounded-2xl text-xs font-black transition-all shadow-xl shadow-primary/25 uppercase tracking-widest active:scale-[0.98]"
                            >
                                Commit Changes
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Settle Payment Modal */}
            {
                isSettlingPayment && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300 overflow-y-auto">
                        <div className="bg-white border border-[#E0E5F2] rounded-[2rem] w-full max-w-md shadow-2xl p-6 space-y-4 relative overflow-hidden my-4">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary to-success" />

                            <button
                                onClick={() => setIsSettlingPayment(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-primary transition-all"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>

                            <div className="text-center space-y-1 pt-2">
                                <h3 className="text-xl font-black text-[#1B2559]">Settle Appointment</h3>
                                <p className="text-[10px] text-[#707EAE] font-bold uppercase tracking-widest">Adjust Session Details</p>
                            </div>

                            {/* Date & Time Adjustment */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Settlement Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                        value={settleData.date}
                                        onChange={(e) => setSettleData({ ...settleData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Time</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-xs font-bold text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={settleData.time}
                                            onChange={(e) => setSettleData({ ...settleData, time: e.target.value })}
                                        />
                                        <Clock className="w-3 h-3 text-[#A3AED0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#F4F7FE] p-4 rounded-xl border border-[#E0E5F2] text-center">
                                    <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Session Total</p>
                                    <p className="text-xl font-black text-[#1B2559]">${settleData.totalValue.toLocaleString()}</p>
                                </div>
                                <div className="bg-destructive/5 p-4 rounded-xl border border-destructive/10 text-center">
                                    <p className="text-[9px] font-black text-destructive uppercase tracking-widest mb-1">Remaining</p>
                                    <p className="text-xl font-black text-destructive">${(settleData.totalValue - settleData.alreadyPaid).toLocaleString()}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => updateAppointmentPayment(settleData.originalDate, settleData.date, settleData.time, settleData.totalValue - settleData.alreadyPaid, 0, 0)}
                                className="w-full bg-success text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-success/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Fully Settle (USD)
                            </button>

                            <div className="space-y-3 pt-3 border-t border-[#F4F7FE]">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-[0.2em] pl-1">Custom Settlement Breakdown</label>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary">ABA $</span>
                                        <input
                                            type="number"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-14 py-3 text-sm font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="0.00"
                                            value={settleData.amount_aba}
                                            onChange={(e) => setSettleData({ ...settleData, amount_aba: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-success">USD $</span>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-14 py-3 text-sm font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                placeholder="0.00"
                                                value={settleData.amount_cash_usd}
                                                onChange={(e) => setSettleData({ ...settleData, amount_cash_usd: e.target.value })}
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-rose-500">KHR ៛</span>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-14 py-3 text-sm font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                placeholder="0"
                                                value={settleData.amount_cash_khr}
                                                onChange={(e) => setSettleData({ ...settleData, amount_cash_khr: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Conversion Hint */}
                                {(() => {
                                    // Calc remainder for USD cover (taking ABA + KHR into account)
                                    const currentInputForUSD = Number(settleData.amount_aba) + (Number(settleData.amount_cash_khr) / usdToKhr);
                                    const neededForUSD = (settleData.totalValue - settleData.alreadyPaid) - currentInputForUSD;

                                    // Calc remainder for KHR cover (taking ABA + USD into account)
                                    const currentInputForKHR = Number(settleData.amount_aba) + Number(settleData.amount_cash_usd);
                                    const neededForKHR = (settleData.totalValue - settleData.alreadyPaid) - currentInputForKHR;

                                    return (
                                        <div className="space-y-2">
                                            {neededForUSD > 0.01 && (
                                                <div className="bg-[#E6FFFA] rounded-2xl p-4 border border-[#01B574]/20 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-[#01B574] uppercase tracking-widest">Cover Balance with USD:</span>
                                                    <button
                                                        onClick={() => setSettleData({ ...settleData, amount_cash_usd: neededForUSD.toFixed(2) })}
                                                        className="text-xs font-black text-[#01B574] underline"
                                                    >
                                                        ${neededForUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </button>
                                                </div>
                                            )}

                                            {neededForKHR > 0.01 && (
                                                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cover Balance with KHR:</span>
                                                    <button
                                                        onClick={() => setSettleData({ ...settleData, amount_cash_khr: Math.ceil(neededForKHR * usdToKhr).toString() })}
                                                        className="text-xs font-black text-amber-700 underline"
                                                    >
                                                        {(neededForKHR * usdToKhr).toLocaleString()} ៛
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            <button
                                onClick={() => updateAppointmentPayment(
                                    settleData.originalDate,
                                    settleData.date,
                                    settleData.time,
                                    Number(settleData.amount_aba) || 0,
                                    Number(settleData.amount_cash_usd) || 0,
                                    Number(settleData.amount_cash_khr) || 0
                                )}
                                className="w-full bg-[#1B2559] text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
                            >
                                Apply Mixed Payment
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Edit Payment Modal */}
            {
                isEditingPayment && editPaymentData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                        <div className="bg-white border border-[#E0E5F2] rounded-[3rem] w-full max-w-md shadow-2xl p-10 space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-500" />

                            <button
                                onClick={() => {
                                    setIsEditingPayment(false);
                                    setEditPaymentData(null);
                                }}
                                className="absolute top-8 right-8 p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-primary transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                                    <Edit2 className="w-7 h-7 text-amber-500" />
                                </div>
                                <h3 className="text-2xl font-black text-[#1B2559]">Edit Payment</h3>
                                <p className="text-xs text-[#707EAE] font-bold uppercase tracking-widest">Correct Payment Amount</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-[#F4F7FE] p-5 rounded-2xl border border-[#E0E5F2]">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Method</p>
                                            <p className="text-sm font-black text-[#1B2559]">{editPaymentData.method}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Currency</p>
                                            <p className="text-sm font-black text-[#1B2559]">{editPaymentData.currency}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] pl-1">New Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-black text-primary">
                                            {editPaymentData.currency === 'USD' ? '$' : '៛'}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-2xl pl-14 pr-6 py-4 text-lg font-black text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            value={editPaymentData.amount}
                                            onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[10px] text-[#A3AED0] font-bold pl-1">
                                        Original: {editPaymentData.currency === 'USD' ? '$' : '៛'}{Number(editPaymentData.originalAmount).toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                                    <p className="text-[10px] font-bold text-amber-600 leading-relaxed">
                                        This will update the payment record and adjust the remaining balance accordingly.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={updatePaymentAmount}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <Check className="w-4 h-4" />
                                Update Payment
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

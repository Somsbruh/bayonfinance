"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Wallet
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { formatTelegramLink } from "@/lib/utils";
import Link from "next/link";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Search } from "lucide-react";
import DatePicker from "@/components/DatePicker";
import OdontogramView from "@/components/OdontogramView";

import { TREATMENT_CATEGORIES, CATEGORY_COLORS, getCategoryColor } from "@/lib/constants";

const CATEGORIES = TREATMENT_CATEGORIES;

const CATEGORY_MAPPING: Record<string, string> = {
    "Diagnostics & Consultation": "Diagnostic",
    "Diagnostics": "Diagnostic",
    "Preventive Care": "Preventive",
    "Restorative Dentistry": "Restorative",
    "Periodontal Care": "Periodontic",
    "Periodontics": "Periodontic",
    "Endodontics": "Endodontic",
    "Prosthodontics (Fixed)": "Prosthodontic",
    "Prosthodontics (Removable)": "Prosthodontic",
    "Prosthodontics": "Prosthodontic",
    "Pediatric Dentistry": "Pediatric",
    "Pediatrics": "Pediatric",
    "Cosmetic Dentistry": "Cosmetic",
    "Cosmetics": "Cosmetic",
    "Emergency & Pain Management": "Diagnostic", // Map emergency to Diagnostic or keep separate if needed
};

const FILTER_COLORS = CATEGORY_COLORS;

import { useCurrency } from "@/context/CurrencyContext";
import { useBranch } from "@/context/BranchContext";

import { Suspense } from "react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function PatientDetailsContent() {
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
        dob: "",
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

    const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
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
    const [activePaymentEdit, setActivePaymentEdit] = useState<string | null>(null);
    const [isDoctorSelectorExpanded, setIsDoctorSelectorExpanded] = useState(true);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'patient-info' | 'appointment-history' | 'payment-plans' | 'odontogram' | 'medical-record'>('appointment-history');
    const [selectedBulkEntries, setSelectedBulkEntries] = useState<string[]>([]);
    const [bulkSettleData, setBulkSettleData] = useState({
        amount_aba: "",
        amount_cash_usd: "",
        amount_cash_khr: "",
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
    });
    const { currentBranch } = useBranch();

    useEffect(() => {
        if (currentBranch) {
            fetchPatientData();
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
                age: pData.age?.toString() || "",
                dob: pData.dob || "",
                phone: pData.phone?.replace(/^\+\d+\s?/, "") || "",
                countryCode: pData.phone?.match(/^\+\d+/)?.[0] || "+855"
            });

            // Fetch Plans
            const { data: plansData } = await supabase
                .from('payment_plans')
                .select('*')
                .eq('patient_id', id);
            if (plansData) setPaymentPlans(plansData);

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
            }
        }
    }




    async function saveVisitNote(date: string, note: string) {
        const { error } = await supabase
            .from('ledger_entries')
            .update({ notes: note })
            .eq('patient_id', id)
            .eq('date', date);

        if (!error) {
            fetchPatientData();
        }
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

    async function handleUpdateEntryDate(date: Date, originalDate: string) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const { error } = await supabase
            .from('ledger_entries')
            .update({ date: dateStr })
            .eq('patient_id', id)
            .eq('date', originalDate);

        if (!error) {
            fetchPatientData();
        } else {
            alert("Error updating visit date: " + error.message);
        }
    }

    async function updateSessionStatus(date: string, doctorId: string, newStatus: string) {
        const { error } = await supabase
            .from('ledger_entries')
            .update({ status: newStatus })
            .eq('patient_id', id)
            .eq('date', date)
            .eq('doctor_id', doctorId);

        if (!error) {
            fetchPatientData();
        } else {
            console.error("Status update error:", error);
            if (error.message.includes("column \"status\" of relation \"ledger_entries\" does not exist") ||
                error.message.includes("Could not find the 'status' column")) {
                alert("Database Error: The 'status' column is missing from the 'ledger_entries' table. Please run the SQL fix provided in the implementation plan to resolve this.");
            } else {
                alert("Error updating status: " + error.message);
            }
        }
    }

    async function updateAppointmentPayment(originalDate: string, newDate: string, newTime: string, aba: number, cashUsd: number, cashKhr: number) {
        const appointmentEntries = history.filter(e => e.date === originalDate);
        const totalSessionValue = appointmentEntries.reduce((sum, e) => sum + Number(e.total_price), 0);
        const totalPaidAmount = aba + cashUsd + (cashKhr / usdToKhr);

        // Validation: Prevent overpayment
        if (totalPaidAmount > totalSessionValue + 0.01) { // 0.01 margin for float errors
            alert(`Payment exceeds session value of $${totalSessionValue.toLocaleString()}. Please adjust amounts.`);
            return;
        }

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

            if (!updateError) {
                if (i === 0) {
                    // Clear existing payment history for all entries in this session to prevent redundancy
                    const entryIds = appointmentEntries.map(e => e.id);
                    await supabase.from('payment_history').delete().in('entry_id', entryIds);

                    // Record in payment history for the first entry (session master)
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

                // Inventory Stock Deduction: Only if fully paid and is a medicine item
                if (entry.item_type === 'medicine' && entry.inventory_id && (Number(entry.total_price) - amountForThisEntry) <= 0.01) {
                    const { data: invData } = await supabase
                        .from('inventory')
                        .select('stock_level')
                        .eq('id', entry.inventory_id)
                        .single();

                    if (invData) {
                        await supabase
                            .from('inventory')
                            .update({
                                stock_level: Math.max(0, invData.stock_level - (entry.quantity || 1)),
                                last_stock_out: new Date().toISOString()
                            })
                            .eq('id', entry.inventory_id);
                    }
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

    async function handleBulkSettlement() {
        if (selectedBulkEntries.length === 0) return;

        const aba = Number(bulkSettleData.amount_aba) || 0;
        const cashUsd = Number(bulkSettleData.amount_cash_usd) || 0;
        const cashKhr = Number(bulkSettleData.amount_cash_khr) || 0;
        const totalPaidAmount = aba + cashUsd + (cashKhr / usdToKhr);
        const selectedTotalValue = history
            .filter(e => selectedBulkEntries.includes(e.id))
            .reduce((sum, e) => sum + Number(e.amount_remaining), 0);

        if (totalPaidAmount > selectedTotalValue + 0.01) {
            alert(`Payment exceeds the selected remaining balance of $${selectedTotalValue.toLocaleString()}. Please adjust amounts.`);
            return;
        }

        let remainingToDistribute = totalPaidAmount;

        const entriesToSettle = history.filter(h => selectedBulkEntries.includes(h.id))
            .sort((a, b) => a.created_at.localeCompare(b.created_at));

        for (let i = 0; i < entriesToSettle.length; i++) {
            const entry = entriesToSettle[i];
            const unpaid = Number(entry.amount_remaining);
            if (unpaid <= 0 || remainingToDistribute <= 0) continue;

            const amountForThisEntry = Math.min(remainingToDistribute, unpaid);

            const { error: updateError } = await supabase
                .from('ledger_entries')
                .update({
                    amount_paid: Number(entry.amount_paid) + amountForThisEntry,
                    amount_remaining: unpaid - amountForThisEntry,
                })
                .eq('id', entry.id);

            if (!updateError) {
                await supabase.from('payment_history').insert({
                    entry_id: entry.id,
                    amount_paid: amountForThisEntry,
                    payment_method: 'Bulk Settle',
                    payment_currency: 'USD'
                });

                // Inventory Stock Deduction: Only if fully paid and is a medicine item
                if (entry.item_type === 'medicine' && entry.inventory_id && (unpaid - amountForThisEntry) <= 0.01) {
                    const { data: invData } = await supabase
                        .from('inventory')
                        .select('stock_level')
                        .eq('id', entry.inventory_id)
                        .single();

                    if (invData) {
                        await supabase
                            .from('inventory')
                            .update({
                                stock_level: Math.max(0, invData.stock_level - (entry.quantity || 1)),
                                last_stock_out: new Date().toISOString()
                            })
                            .eq('id', entry.inventory_id);
                    }
                }
            }
            remainingToDistribute -= amountForThisEntry;
        }

        setIsBulkModalOpen(false);
        setSelectedBulkEntries([]);
        setBulkSettleData({
            amount_aba: "",
            amount_cash_usd: "",
            amount_cash_khr: "",
            date: format(new Date(), 'yyyy-MM-dd'),
            time: format(new Date(), 'HH:mm'),
        });
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


    async function handleSaveProfile() {
        if (!profileForm.name) return;
        const { error } = await supabase
            .from('patients')
            .update({
                name: profileForm.name,
                gender: profileForm.gender,
                age: parseInt(profileForm.age) || 0,
                dob: profileForm.dob || null,
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

    async function handleDeletePatient() {
        if (!confirm("Are you sure you want to void this patient? This action will remove them from the active directory.")) return;

        const { error } = await supabase
            .from('patients')
            .update({ is_archived: true })
            .eq('id', id);

        if (!error) {
            router.push('/patients');
        } else {
            alert("Error deleting patient: " + error.message);
        }
    }

    if (isLoading) return <div className="p-10 text-center">Loading patient...</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found.</div>;

    const lifetimeValue = history.reduce((sum, e) => sum + Number(e.total_price), 0);
    const netContributions = history.reduce((sum, e) => sum + Number(e.amount_paid), 0);
    const outstandingBalance = history.reduce((sum, e) => sum + Number(e.amount_remaining), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-x-hidden">
            {/* Premium Header & Stats Banner - GEMINI.md Section 5.2 */}
            <div className="card-premium p-5 flex flex-col lg:flex-row items-center gap-4 pt-5">
                {/* Identity Section */}
                <div className="flex items-center gap-3 flex-1 w-full lg:w-auto">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-[#2563EB] rounded-full flex items-center justify-center border border-[#E0E5F2] shadow-sm shrink-0 text-white font-medium text-base relative overflow-hidden group/icon">
                        {patient.name[0]}
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-medium text-[#1B2559] tracking-tighter" style={{ whiteSpace: 'nowrap' }}>{patient.name}</h2>
                            <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest bg-[#F4F7FE] px-2 py-1 rounded-lg">
                                {patient.gender} {patient.age}
                            </span>
                            <button onClick={() => setIsEditingProfile(true)} className="opacity-50 hover:opacity-100 transition-opacity">
                                <Edit2 className="w-3 h-3 text-primary" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="hidden lg:block w-[1px] h-8 bg-[#E0E5F2]" />

                {/* Financial Stats Group */}
                <div className="flex items-center gap-6 lg:gap-8 flex-1 justify-center lg:justify-start">
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">LIFETIME VALUE</p>
                        <h2 className="text-lg font-medium text-[#1B2559] tracking-tighter">${Number(lifetimeValue).toLocaleString()}</h2>
                    </div>

                    <div className="hidden sm:block w-[1px] h-6 bg-[#E0E5F2]" />

                    <div className="flex flex-col gap-0.5">
                        <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">OUTSTANDING</p>
                        <h2 className={cn("text-lg font-medium tracking-tighter", outstandingBalance > 0 ? "text-amber-500" : "text-[#1B2559]")}>
                            ${Number(outstandingBalance).toLocaleString()}
                        </h2>
                    </div>
                </div>

                <div className="hidden lg:block w-[1px] h-8 bg-[#E0E5F2]" />

                {/* Actions */}
                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                    {outstandingBalance > 0 && (
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-[10px] font-medium uppercase tracking-[0.15em] shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                        >
                            <Target className="w-3.5 h-3.5" />
                            Settle
                        </button>
                    )}
                    <Link
                        href={`/patients/${id}/new-appointment`}
                        className="bg-primary hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-[10px] font-medium uppercase tracking-[0.15em] shadow-md shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New Appt
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6 items-start">
                <div className="col-span-12 space-y-6">

                    {/* Tabs Navigation */}
                    <div className="flex items-center gap-8 border-b border-[#E0E5F2] pt-2 mb-8">
                        {(['patient-info', 'appointment-history', 'payment-plans', 'odontogram', 'medical-record'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "pb-3 text-[11px] font-medium uppercase tracking-[0.15em] transition-all relative shrink-0",
                                    activeTab === tab ? "text-primary" : "text-[#A3AED0] hover:text-[#707EAE]"
                                )}
                            >
                                <span className="relative z-10">
                                    {tab === 'patient-info' && "Patient Information"}
                                    {tab === 'appointment-history' && "Appointment History"}
                                    {tab === 'payment-plans' && "Payment Plans"}
                                    {tab === 'odontogram' && "Odontogram"}
                                    {tab === 'medical-record' && "Medical Record"}
                                </span>
                                {activeTab === tab && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-4px_10px_rgba(51,17,219,0.2)]" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content: Appointment History */}
                    {activeTab === 'appointment-history' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setHistoryView('clinical')}
                                        className={cn(
                                            "px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-widest transition-all flex items-center gap-2",
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
                                            "px-6 py-3 rounded-lg text-xs font-medium uppercase tracking-widest transition-all flex items-center gap-2",
                                            historyView === 'invoices'
                                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                                : "bg-[#F4F7FE] text-[#A3AED0] hover:bg-white border border-[#E0E5F2]"
                                        )}
                                    >
                                        <Printer className="w-4 h-4" />
                                        Invoice History
                                    </button>
                                </div>
                                <span className="text-[10px] text-[#A3AED0] bg-[#F4F7FE] px-4 py-2 rounded-lg border border-[#E0E5F2] font-medium uppercase tracking-widest leading-none">
                                    {history.length} Records
                                </span>
                            </div>

                            {/* Clinical Progress View */}
                            {
                                historyView === 'clinical' && (
                                    <>
                                        {Object.entries(
                                            history
                                                .filter(e => e.item_type !== 'installment') // Filter out installments from clinical progress
                                                .reduce((acc: any, entry: any) => {
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
                                                <div key={date} className="card-premium overflow-hidden border border-[#E0E5F2] p-0 shadow-sm">
                                                    <div className="bg-[#F4F7FE]/50 px-5 py-4 border-b border-[#E0E5F2] flex items-center justify-between">
                                                        <div className="flex items-center gap-5">
                                                            <div className="bg-white text-primary p-3 rounded-lg shadow-sm border border-[#E0E5F2] hover:bg-[#F4F7FE] transition-all flex items-center justify-center">
                                                                <DatePicker
                                                                    value={date}
                                                                    onChange={(newDate) => handleUpdateEntryDate(newDate, date)}
                                                                    className="border-none p-0 group"
                                                                    placeholder=""
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="text-lg font-medium text-[#1B2559] tracking-tight hover:text-primary transition-colors cursor-pointer flex items-center gap-2 group" onClick={() => {
                                                                    // The DatePicker already has its own click handler
                                                                }}>
                                                                    {(() => {
                                                                        const d = new Date(date);
                                                                        return !isNaN(d.getTime()) ? format(d, 'MMMM do, yyyy') : 'Invalid Date';
                                                                    })()}
                                                                </div>
                                                                <div className="text-[10px] text-[#A3AED0] uppercase font-medium tracking-widest">Appointment Session</div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <div className="text-[8px] text-[#A3AED0] uppercase font-medium tracking-widest mb-0.5 opacity-60">Session Value</div>
                                                                <div className="text-xs font-medium text-[#1B2559]">${dateTotal.toLocaleString()}</div>
                                                            </div>
                                                            <div className="w-px h-8 bg-[#E0E5F2]" />
                                                            <div className="text-right">
                                                                <div className="text-[8px] text-[#A3AED0] uppercase font-medium tracking-widest mb-0.5 opacity-60">Remaining</div>
                                                                <div className="text-xs font-medium text-destructive">${dateBalance.toLocaleString()}</div>
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
                                                                    className="bg-[#01B574] hover:bg-[#01945d] text-white px-4 py-2 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all shadow-md shadow-[#01B574]/20 flex items-center gap-1.5"
                                                                >
                                                                    <DollarSign className="w-3 h-3" />
                                                                    Settle
                                                                </button>

                                                                <Link
                                                                    href={`/print-invoice?patientId=${id}&type=receipt&itemIds=${entries.map((e: any) => e.id).join(',')}`}
                                                                    target="_blank"
                                                                    className="p-2.5 bg-white hover:bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg text-[#A3AED0] hover:text-primary transition-all shadow-sm flex items-center justify-center"
                                                                >
                                                                    <Printer className="w-4 h-4" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <table className="w-full ledger-table">
                                                        <thead>
                                                            <tr className="bg-[#F4F7FE]/20 text-[9px] uppercase font-medium tracking-widest text-[#A3AED0] border-b border-[#F4F7FE]">
                                                                <th className="px-5 py-5 text-left">Clinical Procedure</th>
                                                                <th className="px-5 py-5 text-right">Value</th>
                                                                <th className="px-5 py-5 text-right">Paid</th>
                                                                <th className="px-5 py-5 text-center">Dentist</th>
                                                                <th className="px-5 py-5 w-[80px]"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-[#F4F7FE]">
                                                            {entries.map((entry: any) => (
                                                                <tr key={entry.id} className="group hover:bg-[#F8FAFF] transition-colors">
                                                                    <td
                                                                        className="px-5 py-4 cursor-pointer"
                                                                        onClick={() => setManagedEntry(entry)}
                                                                    >
                                                                        <div className="font-medium text-[#1B2559] text-[12px] group-hover:text-primary transition-colors">{entry.treatments?.name || entry.description}</div>
                                                                        <div className="text-[10px] text-[#A3AED0] font-medium uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
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
                                                                    <td className="px-5 py-4 text-right font-medium text-[#1B2559] text-[12px] tracking-tight">
                                                                        ${Number(entry.total_price).toLocaleString()}
                                                                    </td>
                                                                    {/* Paid cell with inline edit dropdown */}
                                                                    <td className="px-5 py-4 text-right">
                                                                        <button
                                                                            data-patient-payment-trigger={entry.id}
                                                                            onClick={() => setActivePaymentEdit(prev => prev === entry.id ? null : entry.id)}
                                                                            className={cn(
                                                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium transition-all cursor-pointer",
                                                                                Number(entry.amount_paid) > 0 ? "text-[#19D5C5] hover:bg-[#19D5C5]/10" : "text-[#A3AED0] hover:bg-[#F4F7FE]"
                                                                            )}
                                                                        >
                                                                            ${Number(entry.amount_paid).toLocaleString()}
                                                                        </button>
                                                                        {activePaymentEdit === entry.id && (() => {
                                                                            const triggerEl = document.querySelector(`[data-patient-payment-trigger="${entry.id}"]`);
                                                                            const rect = triggerEl?.getBoundingClientRect();
                                                                            if (!rect) return null;
                                                                            const entryAba = Number(entry.paid_aba) || 0;
                                                                            const entryCashUsd = Number(entry.paid_cash_usd) || 0;
                                                                            const entryCashKhr = Number(entry.paid_cash_khr) || 0;
                                                                            const applyPaymentEdit = async (field: 'paid_aba' | 'paid_cash_usd' | 'paid_cash_khr', value: number) => {
                                                                                const exchangeRate = Number(entry.applied_exchange_rate) || usdToKhr;
                                                                                const newAba = field === 'paid_aba' ? value : (Number(entry.paid_aba) || 0);
                                                                                const newCashUsd = field === 'paid_cash_usd' ? value : (Number(entry.paid_cash_usd) || 0);
                                                                                const newCashKhr = field === 'paid_cash_khr' ? value : (Number(entry.paid_cash_khr) || 0);
                                                                                const khrInUsd = Math.round((newCashKhr / exchangeRate) * 100) / 100;
                                                                                const totalPaid = newAba + newCashUsd + khrInUsd;
                                                                                await supabase.from('ledger_entries').update({
                                                                                    [field]: value,
                                                                                    amount_paid: totalPaid,
                                                                                    amount_remaining: Number(entry.total_price) - totalPaid,
                                                                                    applied_exchange_rate: exchangeRate
                                                                                }).eq('id', entry.id);
                                                                                fetchPatientData();
                                                                            };
                                                                            const remaining = Number(entry.amount_remaining) || 0;
                                                                            const exchangeRate = Number(entry.applied_exchange_rate) || usdToKhr;
                                                                            return createPortal(
                                                                                <>
                                                                                    <div className="fixed inset-0 z-[9998]" onClick={() => setActivePaymentEdit(null)} />
                                                                                    <div
                                                                                        className="fixed bg-white border border-[#E0E5F2] rounded-lg shadow-2xl z-[9999] p-4 w-[240px] animate-in fade-in slide-in-from-top-2 duration-150"
                                                                                        style={{ top: rect.bottom + 4, left: rect.left - 80 }}
                                                                                    >
                                                                                        {/* ABA */}
                                                                                        <div className="mb-2">
                                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                                <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                                                                                                <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">ABA Bank</span>
                                                                                            </div>
                                                                                            <div className="relative">
                                                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#A3AED0]">$</span>
                                                                                                <input
                                                                                                    type="text" inputMode="numeric"
                                                                                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-7 pr-3 py-2 text-[11px] font-medium text-[#3B82F6] outline-none focus:border-[#3B82F6]/30 text-right"
                                                                                                    defaultValue={entryAba || ''}
                                                                                                    onBlur={(e) => applyPaymentEdit('paid_aba', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Cash USD */}
                                                                                        <div className="mb-2">
                                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                                <div className="w-2 h-2 rounded-full bg-[#19D5C5]" />
                                                                                                <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Cash USD</span>
                                                                                            </div>
                                                                                            <div className="relative">
                                                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#A3AED0]">$</span>
                                                                                                <input
                                                                                                    type="text" inputMode="numeric"
                                                                                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-7 pr-3 py-2 text-[11px] font-medium text-[#19D5C5] outline-none focus:border-[#19D5C5]/30 text-right"
                                                                                                    defaultValue={entryCashUsd || ''}
                                                                                                    onBlur={(e) => applyPaymentEdit('paid_cash_usd', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Cash KHR */}
                                                                                        <div className="mb-2">
                                                                                            <div className="flex items-center gap-2 mb-1">
                                                                                                <div className="w-2 h-2 rounded-full bg-[#FFB547]" />
                                                                                                <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Cash KHR</span>
                                                                                            </div>
                                                                                            <div className="relative">
                                                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#A3AED0]">៛</span>
                                                                                                <input
                                                                                                    type="text" inputMode="numeric"
                                                                                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-7 pr-3 py-2 text-[11px] font-medium text-[#FFB547] outline-none focus:border-[#FFB547]/30 text-right"
                                                                                                    defaultValue={entryCashKhr || ''}
                                                                                                    onBlur={(e) => applyPaymentEdit('paid_cash_khr', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                                                                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Remaining */}
                                                                                        {(() => {
                                                                                            const khrRemaining = Math.round(remaining * exchangeRate);
                                                                                            return (
                                                                                                <div className="border-t border-[#E0E5F2] pt-2 mt-3 flex justify-between items-center">
                                                                                                    <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Remaining</span>
                                                                                                    <div className="text-right">
                                                                                                        <span className={`text-[12px] font-medium ${remaining > 0 ? 'text-[#EE5D50]' : 'text-[#19D5C5]'}`}>${remaining.toLocaleString()}</span>
                                                                                                        {remaining > 0 && (
                                                                                                            <p className="text-[9px] font-medium text-[#A3AED0] mt-0.5">ឬ ៛{khrRemaining.toLocaleString()}</p>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        })()}
                                                                                    </div>
                                                                                </>,
                                                                                document.body
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td className="px-5 py-4 text-center">
                                                                        <select
                                                                            className={cn(
                                                                                "text-[9px] bg-[#F4F7FE] px-3 py-1.5 rounded-lg font-medium uppercase tracking-widest cursor-pointer hover:bg-primary/10 transition-colors border-none outline-none text-[#1B2559]",
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
                                                                    <td className="px-5 py-4 text-right">
                                                                        <button
                                                                            onClick={() => setManagedEntry(entry)}
                                                                            className="p-3 hover:bg-white rounded-lg text-[#A3AED0] hover:text-primary transition-all border border-transparent hover:border-[#E0E5F2] hover:shadow-sm"
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
                                                            <summary className="list-none cursor-pointer flex items-center justify-between text-[10px] font-medium uppercase tracking-widest text-[#707EAE] hover:text-primary transition-colors">
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
                                                                    className="w-full bg-white border border-[#E0E5F2] rounded-3xl p-6 text-sm min-h-[140px] focus:ring-4 focus:ring-primary/5 transition-all shadow-inner font-medium text-[#1B2559] outline-none"
                                                                    placeholder="Input specialized medical findings, observations, or specific patient feedback for this session..."
                                                                    defaultValue={entries[0].notes || ""}
                                                                    onBlur={(e) => saveVisitNote(date, e.target.value)}
                                                                />
                                                                <p className="text-[9px] text-[#A3AED0] font-medium uppercase tracking-widest mt-3 text-right">Encrypted Medical Storage · Auto-sinc</p>
                                                            </div>
                                                        </details>
                                                        {!entries[0].notes && (
                                                            <div className="mt-2 pl-7 group-open:hidden">
                                                                <p className="text-[10px] text-[#A3AED0] font-medium italic opacity-60 italic">Open this section to add specialized clinical observation notes for this visit.</p>
                                                            </div>
                                                        )}
                                                        {entries[0].notes && (
                                                            <div className="mt-3 pl-7 group-open:hidden border-l-2 border-primary/20">
                                                                <p className="text-sm text-[#707EAE] font-medium line-clamp-1 italic">"{entries[0].notes}"</p>
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
                                                        <p className="text-lg font-medium text-[#1B2559] tracking-tight">No Clinical Records Yet</p>
                                                        <p className="text-sm font-medium text-[#A3AED0]">Start documenting patient progress by selecting treatments from the panel.</p>
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
                                            <div key={entry.id} className="relative group overflow-hidden rounded-[2rem] border border-[#E0E5F2] bg-white/40 backdrop-blur-xl hover:bg-white/60 transition-all duration-500 hover:shadow-xl hover:shadow-primary/5">
                                                <div className="p-5">
                                                    <div className="grid grid-cols-12 gap-5">
                                                        {/* Timestamp Anchor - Compact & Clear */}
                                                        <div className="col-span-12 lg:col-span-2 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[#F4F7FE] pb-4 lg:pb-0 lg:pr-5">
                                                            <div className="text-[9px] font-medium text-primary uppercase tracking-[0.2em] mb-1.5 opacity-60">Timestamp</div>
                                                            <div className="flex lg:flex-col items-baseline lg:items-start gap-3 lg:gap-0">
                                                                <span className="text-xl font-medium text-[#1B2559] leading-none mb-1">
                                                                    {new Date(entry.created_at).toLocaleDateString('en-US', { day: '2-digit' })}
                                                                </span>
                                                                <span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">
                                                                    {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <div className="mt-3 flex items-center gap-2 bg-[#F4F7FE] px-2.5 py-1.5 rounded-lg w-fit">
                                                                <Clock className="w-3 h-3 text-primary" />
                                                                <span className="text-[10px] font-medium text-[#1B2559]">
                                                                    {new Date(entry.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Bento Core Content */}
                                                        <div className="col-span-12 lg:col-span-10 grid grid-cols-2 gap-4">
                                                            {/* Service Block */}
                                                            <div className="col-span-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                                                                <div>
                                                                    <div className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Service</div>
                                                                    <h4 className="text-[12px] font-medium text-[#1B2559] tracking-tight group-hover:text-primary transition-colors leading-tight">
                                                                        {entry.treatments?.name || entry.description}
                                                                    </h4>
                                                                    <div className="flex items-center gap-2 mt-1.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                                        <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest italic">
                                                                            Dr. {entry.doctor?.name || 'Unassigned'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="sm:text-right">
                                                                    <div className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Status</div>
                                                                    <div className={cn(
                                                                        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-wider border transition-all",
                                                                        Number(entry.amount_remaining) > 0
                                                                            ? "bg-amber-50/50 border-amber-200 text-amber-600"
                                                                            : "bg-emerald-50/50 border-emerald-200 text-emerald-600"
                                                                    )}>
                                                                        <div className={cn("w-1 h-1 rounded-full", Number(entry.amount_remaining) > 0 ? "bg-amber-600" : "bg-emerald-600")} />
                                                                        {Number(entry.amount_remaining) > 0 ? 'Partial' : 'Paid'}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Financials Bento Section */}
                                                            <div className="bg-[#F4F7FE]/30 rounded-lg p-4 border border-[#E0E5F2] flex items-center justify-between col-span-2 gap-4">
                                                                <div className="flex items-center gap-6 lg:gap-10">
                                                                    <div>
                                                                        <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Paid</p>
                                                                        <p className="text-[12px] font-medium text-[#1B2559] tracking-tighter">
                                                                            ${Number(entry.amount_paid).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    <div className="w-px h-8 bg-[#E0E5F2]" />
                                                                    <div>
                                                                        <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Total</p>
                                                                        <p className="text-sm font-medium text-[#A3AED0] line-through decoration-primary/20">
                                                                            ${Number(entry.total_price).toLocaleString()}
                                                                        </p>
                                                                    </div>
                                                                    {Number(entry.amount_remaining) > 0 && (
                                                                        <>
                                                                            <div className="w-px h-8 bg-[#E0E5F2]" />
                                                                            <div>
                                                                                <p className="text-[8px] font-medium text-amber-600 uppercase tracking-widest mb-0.5">Balance</p>
                                                                                <p className="text-sm font-medium text-amber-600">
                                                                                    ${Number(entry.amount_remaining).toLocaleString()}
                                                                                </p>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                <Link
                                                                    href={`/print-invoice?patientId=${id}&type=receipt&itemIds=${entry.id}`}
                                                                    className="flex items-center justify-center gap-2 bg-white hover:bg-primary hover:text-white text-primary px-5 py-2.5 rounded-lg text-[9px] font-medium uppercase tracking-wider transition-all border border-primary/10 shadow-sm active:scale-95"
                                                                >
                                                                    <Printer className="w-3.5 h-3.5" />
                                                                    Print
                                                                </Link>
                                                            </div>

                                                            {/* Mini payment trace */}
                                                            {entry.payment_history && entry.payment_history.length > 0 && (
                                                                <div className="col-span-2 flex flex-wrap items-center gap-2 px-1">
                                                                    <div className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mr-1">Trace:</div>
                                                                    {entry.payment_history.map((ph: any) => (
                                                                        <div key={ph.id} className="flex items-center gap-2 bg-white/60 border border-[#E0E5F2] px-2.5 py-1 rounded-lg">
                                                                            <div className={cn(
                                                                                "w-1 h-1 rounded-full",
                                                                                ph.payment_method === 'ABA' ? "bg-blue-500" : "bg-emerald-500"
                                                                            )} />
                                                                            <span className="text-[8px] font-medium text-[#1B2559] uppercase tracking-widest">
                                                                                {ph.payment_method} · {ph.payment_currency === 'USD' ? '$' : '៛'}{Number(ph.amount_paid).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                    </div>
                                )
                            }
                        </div>
                    )}

                    {/* Tab Content: Patient Information */}
                    {activeTab === 'patient-info' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-3 gap-6">
                                <div className="card-premium p-4 border-none bg-emerald-50/30">
                                    <p className="text-[9px] font-medium text-emerald-600 uppercase tracking-widest mb-1">Primary Consultation</p>
                                    <p className="text-sm font-medium text-[#1B2559]">No</p>
                                </div>
                                <div className="card-premium p-4 border-none bg-primary/5">
                                    <p className="text-[9px] font-medium text-primary uppercase tracking-widest mb-1">Special Interest</p>
                                    <p className="text-sm font-medium text-[#1B2559]">Yes <span className="text-[9px] text-[#A3AED0] font-medium">(11, 21)</span></p>
                                </div>
                                <div className="card-premium p-4 border-none bg-amber-50/30">
                                    <p className="text-[9px] font-medium text-amber-600 uppercase tracking-widest mb-1">High Risk Conditions</p>
                                    <p className="text-sm font-medium text-[#1B2559]">No</p>
                                </div>
                            </div>

                            {/* Oral Hygiene Habits */}
                            <div className="card-premium p-5">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1B2559] flex items-center gap-3">
                                        <Activity className="w-5 h-5 text-primary" />
                                        Oral Hygiene Habits
                                    </h3>
                                    <span className="text-[10px] text-[#A3AED0] font-medium uppercase tracking-widest">Last update 12 July 2022</span>
                                </div>

                                <div className="grid grid-cols-3 gap-10">
                                    <div className="space-y-10">
                                        <div>
                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Latest dental visit?</p>
                                            <p className="text-sm font-medium text-[#1B2559]">Less than 3 months ago</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Do you use mouthwash?</p>
                                            <p className="text-sm font-medium text-[#1B2559]">Yes</p>
                                        </div>
                                    </div>
                                    <div className="space-y-10">
                                        <div>
                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">What time did you start?</p>
                                            <p className="text-sm font-medium text-[#1B2559]">About 20 years old</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Do you use dental floss?</p>
                                            <p className="text-sm font-medium text-[#1B2559]">Yes</p>
                                        </div>
                                    </div>
                                    <div className="space-y-10">
                                        <div>
                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">How many times a day?</p>
                                            <p className="text-sm font-medium text-[#1B2559]">Twice</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Changing toothbrush?</p>
                                            <p className="text-sm font-medium text-[#1B2559]">Every 3 months</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div className="card-premium p-8">
                                <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#1B2559] mb-8 flex items-center gap-3">
                                    <Printer className="w-5 h-5 text-primary" />
                                    Clinical Media Attachments
                                </h3>

                                <div className="grid grid-cols-3 gap-6">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="group relative rounded-lg overflow-hidden aspect-[4/3] border border-[#E0E5F2] bg-[#F4F7FE]/30 hover:shadow-xl transition-all">
                                            <div className="absolute inset-0 flex items-center justify-center opacity-40">
                                                <Printer className="w-12 h-12 text-[#A3AED0]" />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t border-[#E0E5F2] flex items-center justify-between">
                                                <div>
                                                    <p className="text-[9px] font-medium text-[#1B2559] truncate">Med_Pic_2134.jpg</p>
                                                    <button className="text-[8px] font-medium text-primary uppercase tracking-widest mt-0.5">+ Add notes</button>
                                                </div>
                                                <div className="p-1.5 bg-[#F4F7FE] rounded-lg">
                                                    <Edit2 className="w-3 h-3 text-[#A3AED0]" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab Content: Odontogram */}
                    {activeTab === 'odontogram' && (
                        <OdontogramView patientId={id as string} />
                    )}


                    {/* Tab Content: Medical Record */}
                    {activeTab === 'medical-record' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="card-premium p-5">
                                <div className="space-y-0 relative">
                                    {/* Vertical Timeline Line */}
                                    <div className="absolute left-[23px] top-4 bottom-4 w-px bg-[#E0E5F2]" />

                                    {(() => {
                                        // 1. Sort history earliest to latest
                                        const sortedHistory = history.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                                        // 2. Group by Date
                                        const groupedByDate: Record<string, any[]> = {};
                                        sortedHistory.forEach(entry => {
                                            if (!groupedByDate[entry.date]) groupedByDate[entry.date] = [];
                                            groupedByDate[entry.date].push(entry);
                                        });

                                        return Object.entries(groupedByDate).map(([date, dateEntries]) => {
                                            const entryDate = new Date(date);

                                            // 3. Within each date, group by Dentist
                                            const groupedByDentist: Record<string, any[]> = {};
                                            dateEntries.forEach(entry => {
                                                const dName = entry.doctor?.name || 'Unassigned';
                                                if (!groupedByDentist[dName]) groupedByDentist[dName] = [];
                                                groupedByDentist[dName].push(entry);
                                            });

                                            return (
                                                <div key={date} className="relative pl-10 pb-8 last:pb-0 group">
                                                    {/* Timeline Node */}
                                                    <div className="absolute left-4 top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 bg-primary transition-all group-hover:scale-125" />

                                                    <div className="grid grid-cols-12 gap-6 items-start">
                                                        {/* Date Column */}
                                                        <div className="col-span-2">
                                                            <div className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-[0.2em] mb-1">{format(entryDate, 'MMM')}</div>
                                                            <div className="flex items-center gap-2 group relative">
                                                                <div className="text-xl font-medium text-[#1B2559] leading-none group-hover:text-primary transition-colors">{format(entryDate, 'dd')}</div>
                                                                <div className="absolute inset-0 opacity-0">
                                                                    <DatePicker
                                                                        value={date}
                                                                        onChange={(newDate) => handleUpdateEntryDate(newDate, date)}
                                                                        className="w-full h-full"
                                                                        placeholder=""
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="text-[10px] font-medium text-[#A3AED0] mt-1">{format(entryDate, 'yyyy')}</div>
                                                        </div>

                                                        {/* Content Cards grouped by Dentist */}
                                                        <div className="col-span-10 space-y-4">
                                                            {Object.entries(groupedByDentist).map(([dentistName, dentistEntries]) => (
                                                                <div key={dentistName} className="bg-white rounded-3xl border border-[#F4F7FE] p-4 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 relative">
                                                                    <div className="flex items-center justify-between mb-4 border-b border-[#F4F7FE] pb-4">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                                                <User className="w-4 h-4" />
                                                                            </div>
                                                                            <div>
                                                                                <div className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Dentist</div>
                                                                                <div className="text-xs font-medium text-[#1B2559]">Dr. {dentistName}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Session Status - Positioned Far Right */}
                                                                    <div className="absolute top-6 right-6">
                                                                        <div className="text-right">
                                                                            <div className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1.5">Session Status</div>
                                                                            <div className="relative group/status">
                                                                                {(() => {
                                                                                    const currentStatus = dentistEntries[0]?.status || 'pending';
                                                                                    const statusStyles: Record<string, { color: string, icon: any, label: string }> = {
                                                                                        'done': { color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Done' },
                                                                                        'pending': { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: <Clock className="w-3 h-3" />, label: 'Scheduled' },
                                                                                        'scheduled': { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: <Calendar className="w-3 h-3" />, label: 'Scheduled' },
                                                                                        'cancelled': { color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', icon: <AlertCircle className="w-3 h-3" />, label: 'Cancelled' },
                                                                                        'no-show': { color: 'text-slate-500 bg-slate-500/10 border-slate-500/20', icon: <XCircle className="w-3 h-3" />, label: 'No-Show' }
                                                                                    };
                                                                                    const style = statusStyles[currentStatus] || statusStyles['pending'];

                                                                                    return (
                                                                                        <div className="flex flex-col items-end gap-1">
                                                                                            <div className={cn(
                                                                                                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-medium uppercase tracking-widest transition-all cursor-pointer hover:bg-white hover:shadow-lg",
                                                                                                style.color
                                                                                            )}>
                                                                                                {style.icon}
                                                                                                {style.label}
                                                                                                <ChevronDown className="w-3 h-3 opacity-50" />
                                                                                            </div>

                                                                                            {/* Status Dropdown */}
                                                                                            <div className="absolute top-full right-0 pt-2 w-40 hidden group-hover/status:block z-50 animate-in fade-in zoom-in-95 duration-200">
                                                                                                <div className="bg-white border border-[#E0E5F2] rounded-lg shadow-2xl p-2">
                                                                                                    {(['scheduled', 'done', 'cancelled', 'no-show'] as const).map(s => (
                                                                                                        <button
                                                                                                            key={s}
                                                                                                            onClick={() => updateSessionStatus(date, dentistEntries[0].doctor_id, s)}
                                                                                                            className={cn(
                                                                                                                "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-[10px] font-medium transition-all hover:bg-[#F4F7FE]",
                                                                                                                currentStatus === s ? "text-primary bg-primary/5" : "text-[#707EAE]"
                                                                                                            )}
                                                                                                        >
                                                                                                            <div className={cn("w-1.5 h-1.5 rounded-full",
                                                                                                                s === 'done' ? "bg-emerald-500" :
                                                                                                                    s === 'scheduled' ? "bg-blue-500" :
                                                                                                                        s === 'cancelled' ? "bg-rose-500" : "bg-slate-500"
                                                                                                            )} />
                                                                                                            {s.charAt(0).toUpperCase() + s.slice(1)}
                                                                                                        </button>
                                                                                                    ))}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        {(() => {
                                                                            // Group dentistEntries by treatment name/description
                                                                            const groupedByTreatment = dentistEntries.reduce((acc: any[], entry: any) => {
                                                                                const treatmentName = entry.treatments?.name || entry.description;
                                                                                const existing = acc.find(g => (g.treatments?.name || g.description) === treatmentName);

                                                                                if (existing) {
                                                                                    existing.quantity = (existing.quantity || 1) + (entry.quantity || 1);
                                                                                    existing.total_price = (Number(existing.total_price) || 0) + (Number(entry.total_price) || 0);
                                                                                    // Append notes if they exist and are different
                                                                                    if (entry.notes && !existing.notes?.includes(entry.notes)) {
                                                                                        existing.notes = existing.notes ? `${existing.notes} | ${entry.notes}` : entry.notes;
                                                                                    }
                                                                                    return acc;
                                                                                }
                                                                                return [...acc, { ...entry }];
                                                                            }, []);

                                                                            return groupedByTreatment.map((entry) => (
                                                                                <div key={entry.id} className="space-y-3">
                                                                                    <div className="flex items-start justify-between">
                                                                                        <div>
                                                                                            <div className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Treatment</div>
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="text-sm font-medium text-primary tracking-tight">{entry.treatments?.name || entry.description}</div>
                                                                                                {(entry.quantity || 1) > 1 && (
                                                                                                    <span className="text-[10px] font-medium text-primary bg-primary/5 px-2 py-0.5 rounded-lg border border-primary/10">x{entry.quantity}</span>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="text-right">
                                                                                            <div className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Total</div>
                                                                                            <div className="text-[10px] font-medium text-[#1B2559]">${Number(entry.total_price).toLocaleString()}</div>
                                                                                        </div>
                                                                                    </div>

                                                                                    {entry.notes && (
                                                                                        <div className="bg-[#F4F7FE]/50 rounded-lg p-4 border border-[#E0E5F2]/50 flex items-start gap-4">
                                                                                            <div className="p-2 bg-white rounded-lg border border-[#E0E5F2] shrink-0">
                                                                                                <BookOpen className="w-3.5 h-3.5 text-primary" />
                                                                                            </div>
                                                                                            <p className="text-xs font-medium text-[#707EAE] leading-relaxed italic">
                                                                                                {entry.notes}
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ));
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                    {history.length === 0 && <p className="text-center text-[#A3AED0] py-10 italic">No clinical milestones recorded.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Treatment Management Modal */}
            {
                managedEntry && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                        <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-md shadow-2xl p-8 space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />

                            <button
                                onClick={() => setManagedEntry(null)}
                                className="absolute top-6 right-6 p-2.5 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-lg bg-primary/10 text-primary shadow-sm flex-shrink-0">
                                    <Activity className="w-7 h-7" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-xl font-medium tracking-tight text-[#1B2559]">Refine Entry</h3>
                                    <p className="text-xs text-[#707EAE] font-medium truncate max-w-[200px]">{managedEntry.treatments?.name || managedEntry.description}</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-[#F4F7FE]/50 p-5 rounded-[2rem] border border-[#E0E5F2]">
                                    <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1 mb-2 block">Actualized Collection (USD)</label>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary text-lg font-medium opacity-40">$</div>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-[#E0E5F2] focus:ring-4 ring-primary/5 rounded-lg px-12 py-4 text-xl font-medium text-[#1B2559] transition-all outline-none text-center"
                                            defaultValue={managedEntry.amount_paid}
                                            min="0"
                                            max={managedEntry.total_price}
                                            onBlur={(e) => {
                                                const paid = Math.min(Math.max(0, Number(e.target.value)), Number(managedEntry.total_price));
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
                                        <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Dentist</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-3 text-[11px] font-medium text-[#1B2559] outline-none cursor-pointer appearance-none uppercase tracking-widest"
                                            defaultValue={managedEntry.doctor_id || ""}
                                            onChange={(e) => handleUpdateEntry(managedEntry.id, { doctor_id: e.target.value })}
                                        >
                                            <option value="">Unassigned</option>
                                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Instrument</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-3 text-[11px] font-medium text-[#1B2559] outline-none cursor-pointer appearance-none uppercase tracking-widest"
                                            defaultValue={managedEntry.method || "CASH"}
                                            onChange={(e) => handleUpdateEntry(managedEntry.id, { method: e.target.value })}
                                        >
                                            <option value="ABA">ABA Bank</option>
                                            <option value="CASH">Cash</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Appointment Time</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-3 text-xs font-medium text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all text-center"
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
                                    className="w-full bg-[#1B2559] text-white py-4 rounded-lg text-xs font-medium transition-all hover:bg-primary shadow-lg uppercase tracking-widest"
                                >
                                    Secure Entry
                                </button>
                                <button
                                    onClick={() => deleteEntry(managedEntry)}
                                    className="w-full text-destructive hover:bg-destructive/5 py-2.5 rounded-lg text-[10px] font-medium transition-all uppercase tracking-widest flex items-center justify-center gap-2"
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
                                <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center text-destructive shadow-inner">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium tracking-tight">Clinical Entry Voided</p>
                                    <p className="text-[10px] text-[#A3AED0] font-medium uppercase tracking-widest mt-0.5">{undoItem.treatments?.name || undoItem.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleUndo}
                                className="ml-auto bg-primary text-white px-8 py-3.5 rounded-lg text-[10px] font-medium uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/40 border border-white/10"
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
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 p-4 animate-in fade-in duration-300">
                        <div className="bg-white border-2 border-white rounded-lg w-full max-w-lg shadow-[0_50px_100px_rgba(27,37,89,0.25)] p-8 space-y-6 relative overflow-hidden">
                            <button
                                onClick={() => setIsEditingProfile(false)}
                                className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FE] rounded-full text-[#A3AED0] transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-5">
                                <div className="p-4 rounded-lg bg-primary/10 text-primary shadow-inner">
                                    <Edit2 className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-medium text-[#1B2559] tracking-tight">Edit Details</h3>
                                    <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mt-1">Secure Profile Update</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-medium text-[#707EAE] uppercase tracking-widest pl-1">Full Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#F4F7FE] border-none rounded-lg px-5 py-3.5 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                        placeholder="e.g. Chea Sokdisumeth"
                                        value={profileForm.name}
                                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-medium text-[#707EAE] uppercase tracking-widest pl-1">Gender</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border-none rounded-lg px-5 py-3.5 text-xs font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                                            value={profileForm.gender}
                                            onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                        >
                                            <option value="F">Female</option>
                                            <option value="M">Male</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-medium text-[#707EAE] uppercase tracking-widest pl-1">Date of Birth</label>
                                        <DatePicker
                                            value={profileForm.dob}
                                            onChange={(date) => {
                                                if (date > new Date()) {
                                                    alert("Date of birth cannot be in the future.");
                                                    return;
                                                }
                                                const ageDiff = Date.now() - date.getTime();
                                                const ageDate = new Date(ageDiff);
                                                const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

                                                setProfileForm({
                                                    ...profileForm,
                                                    dob: format(date, 'yyyy-MM-dd'),
                                                    age: calculatedAge.toString()
                                                });
                                            }}
                                            placeholder="BP: Select Date"
                                            format="dd MMMM yyyy"
                                            className="w-full"
                                            triggerClassName="h-[46px] rounded-lg border-none font-medium text-[#1B2559] text-xs bg-[#F4F7FE]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-medium text-[#707EAE] uppercase tracking-widest pl-1">Contact Phone</label>
                                    <div className="flex gap-2">
                                        <div className="relative w-32">
                                            <select
                                                className="w-full bg-[#F4F7FE] border-none rounded-lg px-4 py-3.5 text-xs font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
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
                                            className="flex-1 bg-[#F4F7FE] border-none rounded-lg px-5 py-3.5 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="e.g. 12 345 678"
                                            value={profileForm.phone}
                                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    className="w-full bg-primary hover:bg-[#2563EB] text-white py-3 rounded-lg text-[11px] font-medium transition-all shadow-md shadow-primary/20 uppercase tracking-widest active:scale-[0.98]"
                                >
                                    Commit Changes
                                </button>

                                <button
                                    onClick={handleDeletePatient}
                                    className="w-full bg-red-50 hover:bg-red-100 text-red-500 py-3 rounded-lg text-[11px] font-medium transition-all border border-red-100 uppercase tracking-widest active:scale-[0.98]"
                                >
                                    Delete Patient
                                </button>
                            </div>
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
                                className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] hover:text-primary transition-all"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>

                            <div className="text-center space-y-1 pt-2">
                                <h3 className="text-xl font-medium text-[#1B2559]">Settle Appointment</h3>
                                <p className="text-[10px] text-[#707EAE] font-medium uppercase tracking-widest">Adjust Session Details</p>
                            </div>

                            {/* Date & Time Adjustment */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Settlement Date</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2.5 text-xs font-medium text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                        value={settleData.date}
                                        onChange={(e) => setSettleData({ ...settleData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Time</label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2.5 text-xs font-medium text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={settleData.time}
                                            onChange={(e) => setSettleData({ ...settleData, time: e.target.value })}
                                        />
                                        <Clock className="w-3 h-3 text-[#A3AED0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#F4F7FE] p-4 rounded-lg border border-[#E0E5F2] text-center">
                                    <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Session Total</p>
                                    <p className="text-xl font-medium text-[#1B2559]">${settleData.totalValue.toLocaleString()}</p>
                                </div>
                                <div className="bg-destructive/5 p-4 rounded-lg border border-destructive/10 text-center">
                                    <p className="text-[9px] font-medium text-destructive uppercase tracking-widest mb-1">Remaining</p>
                                    <p className="text-xl font-medium text-destructive">${(settleData.totalValue - settleData.alreadyPaid).toLocaleString()}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => updateAppointmentPayment(settleData.originalDate, settleData.date, settleData.time, settleData.totalValue - settleData.alreadyPaid, 0, 0)}
                                className="w-full bg-success text-white py-3.5 rounded-lg text-xs font-medium uppercase tracking-[0.2em] shadow-xl shadow-success/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <Check className="w-4 h-4" />
                                Fully Settle (USD)
                            </button>

                            <div className="space-y-3 pt-3 border-t border-[#F4F7FE]">
                                <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-[0.2em] pl-1">Custom Settlement Breakdown</label>

                                <div className="space-y-3">
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-primary">ABA $</span>
                                        <input
                                            type="number"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-14 py-3 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            placeholder="0.00"
                                            min="0"
                                            value={settleData.amount_aba}
                                            onChange={(e) => setSettleData({ ...settleData, amount_aba: Math.max(0, Number(e.target.value)).toString() })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-success">USD $</span>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-14 py-3 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                placeholder="0.00"
                                                min="0"
                                                value={settleData.amount_cash_usd}
                                                onChange={(e) => setSettleData({ ...settleData, amount_cash_usd: Math.max(0, Number(e.target.value)).toString() })}
                                            />
                                        </div>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-medium text-rose-500">KHR ៛</span>
                                            <input
                                                type="number"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-14 py-3 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                placeholder="0"
                                                min="0"
                                                value={settleData.amount_cash_khr}
                                                onChange={(e) => setSettleData({ ...settleData, amount_cash_khr: Math.max(0, Number(e.target.value)).toString() })}
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
                                                <div className="bg-[#E6FFFA] rounded-lg p-4 border border-[#01B574]/20 flex items-center justify-between">
                                                    <span className="text-[10px] font-medium text-[#01B574] uppercase tracking-widest">Cover Balance with USD:</span>
                                                    <button
                                                        onClick={() => setSettleData({ ...settleData, amount_cash_usd: neededForUSD.toFixed(2) })}
                                                        className="text-xs font-medium text-[#01B574] underline"
                                                    >
                                                        ${neededForUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </button>
                                                </div>
                                            )}

                                            {neededForKHR > 0.01 && (
                                                <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 flex items-center justify-between">
                                                    <span className="text-[10px] font-medium text-amber-600 uppercase tracking-widest">Cover Balance with KHR:</span>
                                                    <button
                                                        onClick={() => setSettleData({ ...settleData, amount_cash_khr: Math.ceil(neededForKHR * usdToKhr).toString() })}
                                                        className="text-xs font-medium text-amber-700 underline"
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
                                className="w-full bg-[#1B2559] text-white py-5 rounded-[2rem] text-xs font-medium uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
                            >
                                Apply Mixed Payment
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Bulk Settlement Modal */}
            {
                isBulkModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                        <div className="bg-white border border-[#E0E5F2] rounded-[3rem] w-full max-w-4xl shadow-2xl p-10 space-y-8 relative overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-primary" />

                            <button
                                onClick={() => {
                                    setIsBulkModalOpen(false);
                                    setSelectedBulkEntries([]);
                                }}
                                className="absolute top-8 right-8 p-2.5 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] hover:text-primary transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-6 shrink-0">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center">
                                    <DollarSign className="w-8 h-8 text-emerald-500" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-medium text-[#1B2559] tracking-tight">Bulk Settlement</h3>
                                    <p className="text-xs text-[#707EAE] font-medium uppercase tracking-[0.2em]">Select multiple appointments to clear balance</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-12 gap-8 flex-1 min-h-0">
                                {/* Selection List */}
                                <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-4 custom-scrollbar">
                                    <div className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-2">Outstanding Appointments</div>
                                    {history.filter(e => Number(e.amount_remaining) > 0).map((entry) => (
                                        <div
                                            key={entry.id}
                                            onClick={() => {
                                                setSelectedBulkEntries(prev =>
                                                    prev.includes(entry.id)
                                                        ? prev.filter(id => id !== entry.id)
                                                        : [...prev, entry.id]
                                                );
                                            }}
                                            className={cn(
                                                "group p-5 rounded-lg border transition-all cursor-pointer flex items-center justify-between",
                                                selectedBulkEntries.includes(entry.id)
                                                    ? "bg-primary/5 border-primary shadow-lg shadow-primary/5"
                                                    : "bg-white border-[#E0E5F2] hover:border-primary/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    selectedBulkEntries.includes(entry.id)
                                                        ? "bg-primary border-primary text-white"
                                                        : "border-[#E0E5F2] group-hover:border-primary/50"
                                                )}>
                                                    {selectedBulkEntries.includes(entry.id) && <Check className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-[#1B2559]">{entry.treatments?.name || entry.description}</div>
                                                    <div className="text-[10px] text-[#A3AED0] font-medium uppercase tracking-widest">{format(new Date(entry.date), 'MMM dd, yyyy')}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-amber-600">${Number(entry.amount_remaining).toLocaleString()}</div>
                                                <div className="text-[9px] text-[#A3AED0] font-medium uppercase">Balance</div>
                                            </div>
                                        </div>
                                    ))}

                                    {history.filter(e => Number(e.amount_remaining) > 0).length === 0 && (
                                        <div className="p-10 text-center border-2 border-dashed border-[#E0E5F2] rounded-3xl opacity-40">
                                            <p className="text-sm font-medium text-[#A3AED0]">No outstanding balances found</p>
                                        </div>
                                    )}
                                </div>

                                {/* Payment Section */}
                                <div className="col-span-12 lg:col-span-5 space-y-6">
                                    <div className="bg-[#F4F7FE] p-6 rounded-[2rem] border border-[#E0E5F2] space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest">Selected Total</span>
                                            <span className="text-2xl font-medium text-[#1B2559]">
                                                ${history
                                                    .filter(e => selectedBulkEntries.includes(e.id))
                                                    .reduce((sum, e) => sum + Number(e.amount_remaining), 0)
                                                    .toLocaleString()}
                                            </span>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">ABA Payment ($)</label>
                                                <input
                                                    type="number"
                                                    placeholder="0.00"
                                                    min="0"
                                                    className="w-full bg-white border border-[#E0E5F2] rounded-lg px-4 py-3 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                    value={bulkSettleData.amount_aba}
                                                    onChange={(e) => setBulkSettleData({ ...bulkSettleData, amount_aba: Math.max(0, Number(e.target.value)).toString() })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Cash USD ($)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0.00"
                                                        min="0"
                                                        className="w-full bg-white border border-[#E0E5F2] rounded-lg px-4 py-3 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                        value={bulkSettleData.amount_cash_usd}
                                                        onChange={(e) => setBulkSettleData({ ...bulkSettleData, amount_cash_usd: Math.max(0, Number(e.target.value)).toString() })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Cash KHR (៛)</label>
                                                    <input
                                                        type="number"
                                                        placeholder="0"
                                                        min="0"
                                                        className="w-full bg-white border border-[#E0E5F2] rounded-lg px-4 py-3 text-sm font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                                        value={bulkSettleData.amount_cash_khr}
                                                        onChange={(e) => setBulkSettleData({ ...bulkSettleData, amount_cash_khr: Math.max(0, Number(e.target.value)).toString() })}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-[#E0E5F2]">
                                            <div className="flex items-center justify-between opacity-60">
                                                <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Total Entered</span>
                                                <span className="text-sm font-medium text-[#1B2559]">
                                                    ${(
                                                        (Number(bulkSettleData.amount_aba) || 0) +
                                                        (Number(bulkSettleData.amount_cash_usd) || 0) +
                                                        ((Number(bulkSettleData.amount_cash_khr) || 0) / usdToKhr)
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <Link
                                            href={`/print-invoice?patientId=${id}&type=receipt&itemIds=${selectedBulkEntries.join(',')}`}
                                            onClick={(e) => {
                                                if (selectedBulkEntries.length === 0) e.preventDefault();
                                            }}
                                            className={cn(
                                                "w-1/3 bg-[#F4F7FE] text-[#A3AED0] hover:text-[#1B2559] hover:bg-[#E0E5F2] py-5 rounded-[2rem] text-xs font-medium uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border border-[#E0E5F2]",
                                                selectedBulkEntries.length === 0 && "opacity-50 pointer-events-none"
                                            )}
                                        >
                                            <Printer className="w-4 h-4" />
                                            Receipts
                                        </Link>
                                        <button
                                            onClick={handleBulkSettlement}
                                            disabled={selectedBulkEntries.length === 0}
                                            className="w-2/3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#A3AED0] disabled:opacity-30 text-white py-5 rounded-[2rem] text-xs font-medium uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                        >
                                            <Check className="w-4 h-4" />
                                            Confirm Bulk Settlement
                                        </button>
                                    </div>
                                </div>
                            </div>
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
                                className="absolute top-8 right-8 p-2.5 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] hover:text-primary transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>

                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-4">
                                    <Edit2 className="w-7 h-7 text-amber-500" />
                                </div>
                                <h3 className="text-2xl font-medium text-[#1B2559]">Edit Payment</h3>
                                <p className="text-xs text-[#707EAE] font-medium uppercase tracking-widest">Correct Payment Amount</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-[#F4F7FE] p-5 rounded-lg border border-[#E0E5F2]">
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Method</p>
                                            <p className="text-sm font-medium text-[#1B2559]">{editPaymentData.method}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Currency</p>
                                            <p className="text-sm font-medium text-[#1B2559]">{editPaymentData.currency}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-[0.2em] pl-1">New Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-sm font-medium text-primary">
                                            {editPaymentData.currency === 'USD' ? '$' : '៛'}
                                        </span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-14 pr-6 py-4 text-lg font-medium text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                                            value={editPaymentData.amount}
                                            onChange={(e) => setEditPaymentData({ ...editPaymentData, amount: Math.max(0, Number(e.target.value)).toString() })}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[10px] text-[#A3AED0] font-medium pl-1">
                                        Original: {editPaymentData.currency === 'USD' ? '$' : '៛'}{Number(editPaymentData.originalAmount).toLocaleString()}
                                    </p>
                                </div>

                                <div className="bg-amber-50 border border-amber-100 p-4 rounded-lg">
                                    <p className="text-[10px] font-medium text-amber-600 leading-relaxed">
                                        This will update the payment record and adjust the remaining balance accordingly.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={updatePaymentAmount}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-5 rounded-[2rem] text-xs font-medium uppercase tracking-[0.2em] shadow-xl shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <Check className="w-4 h-4" />
                                Update Payment
                            </button>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default function PatientDetailsPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Initialing Clinical Environment...</div>}>
            <PatientDetailsContent />
        </Suspense>
    );
}

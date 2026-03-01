"use client";

import { useState, useEffect, useMemo } from "react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Users,
    UserPlus,
    Clock,
    Filter,
    Plus,
    DollarSign,
    Activity,
    User,
    CheckCircle2,
    CalendarDays,
    Search,
    X,
    Check,
    ChevronDown,
    Stethoscope,
    MoreHorizontal,
    Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, addDays, isSameDay, addMonths } from "date-fns";

// Time Configuration
const START_HOUR = 8;
const END_HOUR = 17; // 5 PM
const INCREMENT_MINUTES = 15;

export default function ReservationsPage() {
    const { currentBranch } = useBranch();
    const [view, setView] = useState<'day' | 'week'>('day');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [activeTab, setActiveTab] = useState<'calendar' | 'history'>('calendar');
    const [doctors, setDoctors] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [step, setStep] = useState<'search' | 'treatment' | 'new-patient' | 'confirm'>('search');
    const [patientSearchQuery, setPatientSearchQuery] = useState("");
    const [patientResults, setPatientResults] = useState<any[]>([]);
    const [treatmentSearchQuery, setTreatmentSearchQuery] = useState("");
    const [treatmentResults, setTreatmentResults] = useState<any[]>([]);
    const [newPatientData, setNewPatientData] = useState({ name: "", gender: "F", age: "", phone: "" });
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activePatientPlans, setActivePatientPlans] = useState<any[]>([]);

    // Installment Plan State
    const [isInstallmentPlan, setIsInstallmentPlan] = useState(false);
    const [totalTreatmentPrice, setTotalTreatmentPrice] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [monthlyAmount, setMonthlyAmount] = useState<number>(100);
    const [planStartDate, setPlanStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [planDurationMonths, setPlanDurationMonths] = useState(12);

    // Generate time slots
    const timeSlots = useMemo(() => {
        const slots = [];
        for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
            for (let min = 0; min < 60; min += INCREMENT_MINUTES) {
                if (hour === END_HOUR && min > 0) break;
                const hh = hour.toString().padStart(2, '0');
                const mm = min.toString().padStart(2, '0');
                const isoTime = `${hh}:${mm}:00`;

                let display = "";
                let isMainLabel = min === 0;
                if (isMainLabel) {
                    const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                    const period = hour >= 12 ? 'pm' : 'am';
                    display = `${h}${period}`;
                }

                slots.push({ display: display.toUpperCase(), isMainLabel, iso: isoTime });
            }
        }
        return slots;
    }, []);

    useEffect(() => {
        if (currentBranch) {
            fetchInitialData();
        }
    }, [currentBranch, selectedDate, view]);

    async function fetchInitialData() {
        setIsLoading(true);
        const { data: staffData } = await supabase
            .from('staff')
            .select('*')
            .eq('branch_id', currentBranch?.id)
            .eq('role', 'Doctor');

        if (staffData) setDoctors(staffData);

        const isoDate = format(selectedDate, 'yyyy-MM-dd');
        const { data: apptData } = await supabase
            .from('ledger_entries')
            .select('*, patients(name, phone), treatments(name, duration_minutes)')
            .eq('branch_id', currentBranch?.id)
            .eq('date', isoDate);

        if (apptData) setAppointments(apptData);

        const { data: treatData } = await supabase
            .from('treatments')
            .select('*')
            .eq('branch_id', currentBranch?.id);
        if (treatData) setTreatments(treatData);

        setIsLoading(false);
    }

    const isBreakTime = (isoTime: string) => {
        const [h, m] = isoTime.split(':').map(Number);
        const timeVal = h + m / 60;
        return timeVal >= 13 && timeVal < 14;
    };

    const handleOpenModal = (doc: any, slot: any, date: Date) => {
        setSelectedSlot({ doc, slot, date });
        setPatientSearchQuery("");
        setPatientResults([]);
        setTreatmentSearchQuery("");
        setTreatmentResults([]);
        setNewPatientData({ name: "", gender: "F", age: "", phone: "" });
        setSelectedPatient(null);
        setSelectedTreatment(null);
        setActivePatientPlans([]);
        setStep('search');
        setIsModalOpen(true);
    };

    async function handlePatientSearch(q: string) {
        setPatientSearchQuery(q);
        if (q.length > 1) {
            const { data } = await supabase
                .from('patients')
                .select('*')
                .ilike('name', `%${q}%`)
                .limit(5);
            if (data) setPatientResults(data);
        } else {
            setPatientResults([]);
        }
    }

    async function handleTreatmentSearch(q: string) {
        setTreatmentSearchQuery(q);
        if (q.length > 1) {
            const filtered = treatments.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
            setTreatmentResults(filtered.slice(0, 5));
        } else {
            setTreatmentResults([]);
        }
    }

    async function handleCreateAppointment() {
        if (!selectedSlot || !currentBranch) return;
        setIsSaving(true);

        try {
            let patientId = selectedPatient?.id;

            // If no existing patient is selected, create a new profile
            if (!patientId) {
                if (!newPatientData.name) throw new Error("Patient selection required");

                const { data: newP, error: pErr } = await supabase
                    .from('patients')
                    .insert({
                        name: newPatientData.name,
                        gender: newPatientData.gender,
                        age: parseInt(newPatientData.age) || 0,
                        phone: newPatientData.phone,
                        branch_id: currentBranch.id
                    })
                    .select()
                    .single();

                if (pErr) throw pErr;
                patientId = newP.id;
            }

            if (!patientId) throw new Error("Patient selection required");

            let planId = null;

            if (isInstallmentPlan) {
                const { data: plan, error: planErr } = await supabase
                    .from('payment_plans')
                    .insert({
                        patient_id: patientId,
                        branch_id: currentBranch.id,
                        total_amount: totalTreatmentPrice,
                        deposit_amount: depositAmount,
                        monthly_installment: monthlyAmount,
                        start_date: planStartDate,
                        status: 'active',
                        description: selectedTreatment?.name || "Orthodontic Plan"
                    })
                    .select()
                    .single();

                if (planErr) throw planErr;
                planId = plan.id;
            }

            // 1. Create the Appointment / Deposit Entry
            const { error: apptError } = await supabase
                .from('ledger_entries')
                .insert({
                    patient_id: patientId,
                    doctor_id: selectedSlot.doc.id,
                    treatment_id: selectedTreatment?.id,
                    description: selectedTreatment?.name || "Initial Consultation",
                    unit_price: isInstallmentPlan ? depositAmount : totalTreatmentPrice,
                    quantity: 1,
                    total_price: isInstallmentPlan ? depositAmount : totalTreatmentPrice,
                    amount_paid: 0,
                    amount_remaining: isInstallmentPlan ? depositAmount : totalTreatmentPrice,
                    date: format(selectedSlot.date, 'yyyy-MM-dd'),
                    appointment_time: selectedSlot.slot.iso,
                    duration_minutes: selectedTreatment?.duration_minutes || 15,
                    branch_id: currentBranch.id,
                    status: 'Registered',
                    item_type: 'treatment',
                    payment_plan_id: planId
                });

            if (apptError) throw apptError;

            // 2. Generate future installments
            if (isInstallmentPlan && planId) {
                const entries = [];
                let currentPlanDate = new Date(planStartDate);

                for (let i = 1; i <= planDurationMonths; i++) {
                    const nextDate = addMonths(currentPlanDate, i);
                    entries.push({
                        patient_id: patientId,
                        doctor_id: selectedSlot.doc.id, // Linked to the same doctor for now
                        treatment_id: selectedTreatment?.id,
                        description: `${selectedTreatment?.name || 'Installment'} - Month ${i}/${planDurationMonths}`,
                        unit_price: monthlyAmount,
                        quantity: 1,
                        total_price: monthlyAmount,
                        amount_paid: 0,
                        amount_remaining: monthlyAmount,
                        date: format(nextDate, 'yyyy-MM-dd'),
                        branch_id: currentBranch.id,
                        status: 'pending',
                        item_type: 'installment',
                        payment_plan_id: planId
                    });
                }

                if (entries.length > 0) {
                    const { error: instErr } = await supabase
                        .from('ledger_entries')
                        .insert(entries);
                    if (instErr) throw instErr;
                }
            }

            setIsModalOpen(false);
            fetchInitialData();
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsSaving(false);
        }
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Finished': return { bg: 'bg-[#EE5D50]/5', border: 'border-[#EE5D50]/20', dot: 'bg-[#EE5D50]', pill: 'bg-[#EE5D50] text-white' };
            case 'Doing Treatment': return { bg: 'bg-[#3B82F6]/5', border: 'border-[#3B82F6]/20', dot: 'bg-[#3B82F6]', pill: 'bg-[#3B82F6] text-white shadow-sm shadow-[#3B82F6]/20' };
            case 'Registered': return { bg: 'bg-[#19D5C5]/5', border: 'border-[#19D5C5]/20', dot: 'bg-[#19D5C5]', pill: 'bg-[#19D5C5] text-white' };
            default: return { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400', pill: 'bg-gray-400 text-white' };
        }
    };

    return (
        <div className="w-full flex flex-col h-screen animate-in fade-in duration-500 overflow-hidden bg-white">
            {/* Header Tabs */}
            <div className="px-5 border-b border-[#E0E5F2] flex items-center gap-5 bg-white z-[60] shrink-0">
                {[
                    { id: 'calendar', label: 'Calendar' },
                    { id: 'history', label: 'Log History' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "py-2.5 text-[9px] font-medium transition-all relative border-b-2",
                            activeTab === tab.id ? "text-[#3B82F6] border-[#3B82F6]" : "text-[#A3AED0] border-transparent hover:text-[#1B2559]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Control & Metric Bar */}
            <div className="px-5 py-2.5 flex items-center justify-between gap-3 bg-white z-[50] shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center text-[#1B2559] shadow-sm">
                            <CalendarIcon className="w-3.5 h-3.5 text-[#A3AED0]" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-xl font-medium text-[#1B2559] tracking-tighter leading-none">{appointments.length}</span>
                            <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-tight">total appointments</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 border-l border-[#E0E5F2] pl-4">
                        <button onClick={() => setSelectedDate(new Date())} className="px-4 py-1.5 bg-white border border-[#E0E5F2] rounded-lg text-[9px] font-medium text-[#1B2559] uppercase hover:bg-[#F4F7FE] transition-all shadow-sm">Today</button>
                        <div className="flex items-center gap-2 ml-1">
                            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-1 border border-[#E0E5F2] rounded-md text-[#A3AED0] hover:text-[#1B2559] hover:bg-gray-50"><ChevronLeft className="w-3 h-3" /></button>
                            <span className="text-[11px] font-medium text-[#1B2559] min-w-[100px] text-center tracking-tight">
                                {format(selectedDate, 'EEE, d MMM yyyy')}
                            </span>
                            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-1 border border-[#E0E5F2] rounded-md text-[#A3AED0] hover:text-[#1B2559] hover:bg-gray-50"><ChevronRight className="w-3 h-3" /></button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <div className="flex bg-[#F4F7FE] p-0.5 rounded-lg border border-[#E0E5F2]">
                        <button onClick={() => setView('day')} className={cn("px-4 py-1 rounded-md text-[9px] font-medium uppercase transition-all", view === 'day' ? "bg-white text-primary shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]")}>Day</button>
                        <button onClick={() => setView('week')} className={cn("px-4 py-1 rounded-md text-[9px] font-medium uppercase transition-all", view === 'week' ? "bg-white text-primary shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]")}>Week</button>
                    </div>
                    <button className="bg-white px-3 py-1.5 rounded-lg border border-[#E0E5F2] text-[9px] font-medium text-[#1B2559] uppercase flex items-center gap-1.5 shadow-sm">
                        <Filter className="w-3 h-3 text-[#A3AED0]" />
                        All Dentist
                        <ChevronDown className="w-2.5 h-2.5 text-[#A3AED0]" />
                    </button>
                </div>
            </div>

            {/* Unified Horizontal Scroll Container with Refined Vertical Scale (18px slots) */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden relative border-t border-[#f5f7fd] custom-scrollbar">
                <div className="flex flex-col min-w-max h-full">
                    <div className="flex shrink-0 sticky top-0 z-40 bg-white">
                        <div className="w-[60px] border-r border-b border-[#f5f7fd] flex flex-col items-center justify-center py-3 bg-[#F4F7FE]/20 shrink-0 sticky left-0 z-[45] backdrop-blur-sm">
                            <span className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">GMT</span>
                            <span className="text-[8px] font-medium text-[#1B2559] mt-0.5">+07:00</span>
                        </div>
                        {doctors.map(doc => (
                            <div key={doc.id} className="min-w-[180px] flex-1 border-r border-b border-[#f5f7fd] p-2 flex items-center justify-between group bg-white shadow-[inset_0_-1px_0_0_#f5f7fd]">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full border border-[#f5f7fd] flex items-center justify-center bg-white shadow-sm shrink-0">
                                        <User className="w-3.5 h-3.5 text-[#A3AED0]" />
                                    </div>
                                    <div className="truncate">
                                        <h4 className="text-[9px] font-medium text-[#1B2559] truncate uppercase leading-none mb-0.5">{doc.name}</h4>
                                        <p className="text-[7px] font-medium text-[#A3AED0] uppercase truncate leading-none">
                                            <span className="text-[#1B2559] font-medium">{(appointments.filter(a => a.doctor_id === doc.id).length)} PTS</span>
                                        </p>
                                    </div>
                                </div>
                                <button className="p-1 text-[#A3AED0] opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="w-2.5 h-2.5" /></button>
                            </div>
                        ))}
                    </div>

                    {/* Scrollable Grid Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="flex">
                            {/* Time Ticks Column (Merged Hourly Cells) */}
                            <div className="w-[60px] border-r border-[#f5f7fd] bg-white flex flex-col shrink-0 sticky left-0 z-30 shadow-[1px_0_0_0_#f5f7fd]">
                                {timeSlots.filter(s => s.isMainLabel).map(slot => (
                                    <div key={slot.iso} className="h-[72px] border-b border-[#f5f7fd] flex items-center justify-center px-1">
                                        <span className="text-[9px] font-medium text-[#1B2559] uppercase tracking-tighter">{slot.display}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Data Columns */}
                            <div className="flex flex-1">
                                {doctors.map(doc => {
                                    let slotsToSkip = 0;
                                    return (
                                        <div key={doc.id} className="min-w-[180px] flex-1 border-r border-[#f5f7fd] relative">
                                            {timeSlots.map(slot => {
                                                const appt = appointments.find(a => a.doctor_id === doc.id && a.appointment_time === slot.iso);
                                                const isBreak = isBreakTime(slot.iso);

                                                if (slotsToSkip > 0) {
                                                    slotsToSkip--;
                                                    return (
                                                        <div key={slot.iso} className={cn(
                                                            "h-[18px] border-b border-[#f5f7fd] relative group",
                                                            isBreak ? "bg-stripes-gray micro-opacity" : ""
                                                        )} />
                                                    );
                                                }

                                                if (appt) {
                                                    const duration = appt.duration_minutes || 15;
                                                    const span = Math.max(1, Math.ceil(duration / INCREMENT_MINUTES));
                                                    slotsToSkip = span - 1;
                                                    const styles = getStatusStyles(appt.status);

                                                    return (
                                                        <div key={slot.iso} className={cn(
                                                            "border-b border-[#f5f7fd] relative group",
                                                            isBreak ? "bg-stripes-gray micro-opacity" : ""
                                                        )} style={{ height: `${span * 18}px` }}>
                                                            <div className={cn(
                                                                "absolute inset-0.5 rounded-sm px-1.5 py-0 border-[0.5px] shadow-sm z-20 flex items-center transition-all hover:bg-opacity-100",
                                                                styles?.bg, styles?.border
                                                            )}>
                                                                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 mr-1.5", styles?.dot)} />
                                                                <span className="text-[8px] font-medium text-[#1B2559] truncate uppercase leading-none">{appt.patients?.name}</span>
                                                                <span className="ml-auto text-[7px] font-medium text-[#A3AED0] opacity-60 truncate pl-1.5 uppercase">{appt.treatments?.name.slice(0, 15)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={slot.iso} className={cn(
                                                        "h-[18px] border-b border-[#f5f7fd] relative group",
                                                        isBreak ? "bg-stripes-gray micro-opacity" : ""
                                                    )}>
                                                        {!isBreak && (
                                                            <button onClick={() => handleOpenModal(doc, slot, selectedDate)} className="absolute inset-0 border border-dashed border-[#f5f7fd]/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all bg-white/50 z-10">
                                                                <Plus className="w-3 h-3 text-[#A3AED0]" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deepNavy/20 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg w-full max-w-[360px] border border-[#E0E5F2] shadow-2xl p-6 relative overflow-hidden flex flex-col gap-4">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3B82F6] to-[#19D5C5]" />

                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-[#1B2559] uppercase tracking-widest">
                                {step === 'search' ? 'Identify Patient' :
                                    step === 'new-patient' ? 'New Profile' :
                                        step === 'treatment' ? 'Assign Procedure' : 'Finalize Reservation'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-[#F4F7FE] rounded-lg transition-all text-[#A3AED0]">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Step Details */}
                        <div className="bg-[#F4F7FE]/50 rounded-lg p-3 border border-[#E0E5F2]/50 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center text-[#3B82F6] shadow-sm">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-medium text-[#1B2559] leading-none mb-1">
                                    {format(selectedSlot?.date, 'MMM d, yyyy')} @ {selectedSlot?.slot.iso.slice(0, 5)}
                                </p>
                                <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">
                                    Den: {selectedSlot?.doc.name}
                                </p>
                            </div>
                        </div>

                        {/* Search Patient Step */}
                        {step === 'search' && (
                            <div className="space-y-3">
                                <div className="relative group">
                                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3AED0] group-focus-within:text-[#3B82F6] transition-colors" />
                                    <input
                                        autoFocus
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-10 pr-4 py-3 text-[11px] font-medium text-[#1B2559] outline-none focus:bg-white focus:border-[#3B82F6]/30 transition-all"
                                        placeholder="Search by name..."
                                        value={patientSearchQuery}
                                        onChange={(e) => handlePatientSearch(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                    {patientResults.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={async () => {
                                                setSelectedPatient(p);
                                                // Fetch active ortho plans for this patient
                                                const { data: plans } = await supabase
                                                    .from('payment_plans')
                                                    .select('*')
                                                    .eq('patient_id', p.id)
                                                    .eq('status', 'active');
                                                setActivePatientPlans(plans || []);
                                                setStep('treatment');
                                            }}
                                            className="w-full flex items-center justify-between p-2.5 hover:bg-[#F4F7FE] rounded-lg border border-transparent hover:border-[#E0E5F2] transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center text-[10px] font-medium text-[#1B2559] group-hover:text-[#3B82F6]">
                                                    {p.name[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-medium text-[#1B2559] leading-none mb-1">{p.name}</p>
                                                    <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-tighter">
                                                        {p.gender} · {p.age} Yrs · {p.phone || 'No Phone'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-[#A3AED0] group-hover:text-[#3B82F6]" />
                                        </button>
                                    ))}
                                    {patientSearchQuery.length > 1 && patientResults.length === 0 && (
                                        <div className="py-4 text-center">
                                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">No profiles found</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setNewPatientData({ ...newPatientData, name: patientSearchQuery });
                                        setStep('new-patient');
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B2559] text-white rounded-lg text-[9px] font-medium uppercase tracking-widest hover:bg-[#253375] transition-all shadow-md active:scale-95"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    Initialize New Profile
                                </button>
                            </div>
                        )}

                        {/* New Patient Step */}
                        {step === 'new-patient' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Full Name</label>
                                    <input
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-2.5 text-[11px] font-medium text-[#1B2559] outline-none"
                                        value={newPatientData.name}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Sex</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-2.5 text-[11px] font-medium text-[#1B2559] outline-none cursor-pointer"
                                            value={newPatientData.gender}
                                            onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value })}
                                        >
                                            <option value="F">Female</option>
                                            <option value="M">Male</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Age</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-2.5 text-[11px] font-medium text-[#1B2559] outline-none"
                                            value={newPatientData.age}
                                            onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Phone</label>
                                    <input
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-4 py-2.5 text-[11px] font-medium text-[#1B2559] outline-none"
                                        placeholder="012 345 678"
                                        value={newPatientData.phone}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setStep('search')}
                                        className="flex-1 py-3 bg-[#F4F7FE] text-[#1B2559] rounded-lg text-[9px] font-medium uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep('treatment')}
                                        className="flex-1 py-3 bg-[#3B82F6] text-white rounded-lg text-[9px] font-medium uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-[#3B82F6]/20"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Treatment Step */}
                        {step === 'treatment' && (
                            <div className="space-y-3">
                                <div className="relative group">
                                    <Stethoscope className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3AED0] group-focus-within:text-[#3B82F6] transition-colors" />
                                    <input
                                        autoFocus
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-10 pr-4 py-3 text-[11px] font-medium text-[#1B2559] outline-none focus:bg-white focus:border-[#3B82F6]/30 transition-all"
                                        placeholder="Find treatment..."
                                        value={treatmentSearchQuery}
                                        onChange={(e) => handleTreatmentSearch(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                    {(treatmentSearchQuery.length > 1 ? treatmentResults : treatments.slice(0, 10)).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => {
                                                const name = t.name.toLowerCase();
                                                const isFollowUp = name.includes('check-up') || name.includes('follow-up') || name.includes('check up');
                                                const hasActiveOrtho = activePatientPlans.length > 0;

                                                setSelectedTreatment(t);

                                                if (isFollowUp && hasActiveOrtho) {
                                                    setTotalTreatmentPrice(0);
                                                    setIsInstallmentPlan(false);
                                                } else {
                                                    setTotalTreatmentPrice(t.price);
                                                    // Suggest installment logic
                                                    const isOrtho = name.includes('brace') || name.includes('align') || name.includes('ortho');
                                                    if (isOrtho) {
                                                        setIsInstallmentPlan(true);
                                                        const pct = name.includes('brace') ? 0.3 : 0.5;
                                                        const deposit = Math.round(t.price * pct);
                                                        setDepositAmount(deposit);
                                                        setMonthlyAmount(100); // Default suggestion
                                                        setPlanDurationMonths(Math.ceil((t.price - deposit) / 100));
                                                    } else {
                                                        setIsInstallmentPlan(false);
                                                    }
                                                }
                                                setStep('confirm');
                                            }}
                                            className="w-full flex items-center justify-between p-2.5 hover:bg-[#F4F7FE] rounded-lg border border-transparent hover:border-[#E0E5F2] transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center text-[#3B82F6] group-hover:bg-[#3B82F6] group-hover:text-white transition-all">
                                                    <Activity className="w-4 h-4" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-medium text-[#1B2559] leading-none mb-1">{t.name}</p>
                                                    <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-tighter">
                                                        {t.duration_minutes} Mins · ${t.price}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-3.5 h-3.5 text-[#A3AED0] group-hover:text-[#3B82F6]" />
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => {
                                        setSelectedTreatment(null);
                                        setTotalTreatmentPrice(20); // Default Consultation Price
                                        setStep('confirm');
                                    }}
                                    className="w-full py-3 bg-[#F4F7FE] text-[#A3AED0] rounded-lg text-[9px] font-medium uppercase tracking-widest hover:border-[#E0E5F2] border border-transparent transition-all"
                                >
                                    Skip to Consultation ($20)
                                </button>
                            </div>
                        )}

                        {/* Confirm Step */}
                        {step === 'confirm' && (
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#F4F7FE] flex items-center justify-center text-primary">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest">Client</p>
                                            <p className="text-[12px] font-medium text-[#1B2559]">
                                                {selectedPatient ? selectedPatient.name : newPatientData.name}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#F4F7FE] flex items-center justify-center text-primary">
                                            <Stethoscope className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest">Procedure</p>
                                            <p className="text-[12px] font-medium text-[#1B2559]">
                                                {selectedTreatment?.name || 'Initial Consultation'}
                                            </p>
                                            {totalTreatmentPrice === 0 && activePatientPlans.length > 0 && (
                                                <p className="text-[9px] font-medium text-[#19D5C5] uppercase animate-in fade-in slide-in-from-left-2 duration-500">
                                                    Included in active plan
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#F4F7FE] flex items-center justify-center text-primary">
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest">Pricing</p>
                                            <p className="text-[12px] font-medium text-[#1B2559]">
                                                {isInstallmentPlan ? `$${depositAmount} Deposit` : `$${totalTreatmentPrice}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Installment Toggle & Config */}
                                <div className="space-y-3 pt-2 border-t border-[#E0E5F2]">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6]">
                                                <Wallet className="w-3 h-3" />
                                            </div>
                                            <span className="text-[10px] font-medium text-[#1B2559] uppercase">Installment Plan</span>
                                        </div>
                                        <button
                                            onClick={() => setIsInstallmentPlan(!isInstallmentPlan)}
                                            className={cn(
                                                "w-10 h-5 rounded-full transition-all relative px-1 flex items-center",
                                                isInstallmentPlan ? "bg-[#3B82F6]" : "bg-[#E0E5F2]"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-all",
                                                isInstallmentPlan ? "translate-x-4.5" : "translate-x-0"
                                            )} />
                                        </button>
                                    </div>

                                    {isInstallmentPlan && (
                                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Total Treatment Price (USD)</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-medium text-[#1B2559] outline-none border-dashed"
                                                    value={totalTreatmentPrice}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setTotalTreatmentPrice(val);
                                                        // Re-suggest deposit if ortho
                                                        const tName = selectedTreatment?.name.toLowerCase() || "";
                                                        const pct = tName.includes('brace') ? 0.3 : tName.includes('align') ? 0.5 : 0;
                                                        if (pct > 0) {
                                                            const dep = Math.round(val * pct);
                                                            setDepositAmount(dep);
                                                            setPlanDurationMonths(Math.ceil((val - dep) / monthlyAmount));
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Deposit (USD)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-medium text-[#1B2559] outline-none"
                                                        value={depositAmount}
                                                        onChange={(e) => {
                                                            const dep = Number(e.target.value);
                                                            setDepositAmount(dep);
                                                            setPlanDurationMonths(Math.ceil((totalTreatmentPrice - dep) / monthlyAmount));
                                                        }}
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Monthly (USD)</label>
                                                    <input
                                                        type="number"
                                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-medium text-[#1B2559] outline-none"
                                                        value={monthlyAmount}
                                                        onChange={(e) => {
                                                            const mon = Number(e.target.value);
                                                            setMonthlyAmount(mon);
                                                            if (mon > 0) {
                                                                setPlanDurationMonths(Math.ceil((totalTreatmentPrice - depositAmount) / mon));
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1 pr-1 flex justify-between">
                                                        <span>Calculated Plan</span>
                                                        <span className="text-[#3B82F6] font-medium">{planDurationMonths} Mo</span>
                                                    </label>
                                                    <div className="w-full bg-[#F4F7FE]/50 border border-[#E0E5F2] rounded-lg px-3 py-2 text-[9px] font-medium text-[#A3AED0] flex items-center gap-2">
                                                        <Clock className="w-3 h-3" />
                                                        Auto Duration
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-medium text-[#1B2559] outline-none"
                                                        value={planStartDate}
                                                        onChange={(e) => setPlanStartDate(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-2">
                                        <button
                                            disabled={isSaving}
                                            onClick={() => setStep('treatment')}
                                            className="flex-1 py-3 bg-[#F4F7FE] text-[#1B2559] rounded-lg text-[9px] font-medium uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            Change
                                        </button>
                                        <button
                                            disabled={isSaving}
                                            onClick={handleCreateAppointment}
                                            className="flex-1 py-3 bg-[#3B82F6] text-white rounded-lg text-[9px] font-medium uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-[#3B82F6]/20 disabled:opacity-50"
                                        >
                                            {isSaving ? 'Synchronizing...' : 'Reserve'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx global>{`
                .bg-stripes-gray {
                    background: repeating-linear-gradient(-45deg, #F4F7FE, #F4F7FE 3px, #FFFFFF 3px, #FFFFFF 6px);
                }
                .micro-opacity { opacity: 0.4; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E0E5F2; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #A3AED0; }
            `}</style>
        </div>
    );
}

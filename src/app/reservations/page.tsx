"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
    Wallet,
    ArrowUpDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";
import { useReadOnly } from "@/context/ReadOnlyContext";
import { supabase } from "@/lib/supabase";
import { format, startOfWeek, addDays, isSameDay, addMonths } from "date-fns";
import Link from "next/link";
import AppointmentDetailModal from "@/components/AppointmentDetailModal";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Time Configuration
const START_HOUR = 8;
const END_HOUR = 17; // 5 PM
const INCREMENT_MINUTES = 15;

export default function ReservationsPage() {
    const { currentBranch } = useBranch();
    const { isReadOnly } = useReadOnly();
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

    // Filter & Detail State
    const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
    const [showDoctorFilter, setShowDoctorFilter] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    // Override State
    const [customStartTime, setCustomStartTime] = useState<string>("09:00");
    const [customDuration, setCustomDuration] = useState<number>(30);

    // Drag to Select State
    const [dragSelection, setDragSelection] = useState({
        isDragging: false,
        startDocId: null as string | null,
        startDateStr: null as string | null,
        startIdx: null as number | null,
        currentIdx: null as number | null
    });

    // Installment Plan State
    const [isInstallmentPlan, setIsInstallmentPlan] = useState(false);
    const [totalTreatmentPrice, setTotalTreatmentPrice] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [monthlyAmount, setMonthlyAmount] = useState<number>(100);
    const [planStartDate, setPlanStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [planDurationMonths, setPlanDurationMonths] = useState(12);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleColumnSortEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setDoctors((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

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

            const channel = supabase
                .channel('public:ledger_entries')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries' }, () => {
                    fetchInitialData();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
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

        let apptQuery = supabase
            .from('ledger_entries')
            .select('*, patients(name, phone, gender, age), treatments(name, duration_minutes), staff!doctor_id(name)')
            .eq('branch_id', currentBranch?.id)
            .not('appointment_time', 'is', null)
            .order('appointment_time', { ascending: true });

        if (view === 'day') {
            apptQuery = apptQuery.eq('date', format(selectedDate, 'yyyy-MM-dd'));
        } else {
            const weekSt = startOfWeek(selectedDate, { weekStartsOn: 1 });
            const weekEnd = addDays(weekSt, 6);
            apptQuery = apptQuery
                .gte('date', format(weekSt, 'yyyy-MM-dd'))
                .lte('date', format(weekEnd, 'yyyy-MM-dd'));
        }

        const { data: apptData } = await apptQuery;

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

    // Filter doctors based on selectedDoctorId
    const visibleDoctors = useMemo(() =>
        selectedDoctorId ? doctors.filter(d => d.id === selectedDoctorId) : doctors
        , [doctors, selectedDoctorId]);

    const handleOpenModal = (doc: any, slot: any, date: Date, overrideDuration?: number) => {
        setSelectedSlot({ doc, slot, date });
        setCustomStartTime(slot.iso.slice(0, 5));
        setCustomDuration(overrideDuration || 30);
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

    // --- Drag to Select Handlers ---
    const handleCellMouseDown = (docId: string, dateStr: string, slotIdx: number) => {
        setDragSelection({
            isDragging: true,
            startDocId: docId,
            startDateStr: dateStr,
            startIdx: slotIdx,
            currentIdx: slotIdx
        });
    };

    const handleCellMouseEnter = (docId: string, dateStr: string, slotIdx: number) => {
        if (!dragSelection.isDragging || dragSelection.startDocId !== docId || dragSelection.startDateStr !== dateStr) return;
        setDragSelection(prev => ({ ...prev, currentIdx: slotIdx }));
    };

    const handleCellMouseUp = (doc: any, date: Date, slotIdx: number, startIso: string) => {
        if (!dragSelection.isDragging) {
            handleOpenModal(doc, { iso: startIso }, date);
            return;
        }

        const { startIdx, currentIdx } = dragSelection;
        const low = Math.min(startIdx || slotIdx, currentIdx || slotIdx);
        const high = Math.max(startIdx || slotIdx, currentIdx || slotIdx);
        const blocks = high - low + 1;
        const finalDuration = blocks * INCREMENT_MINUTES;

        // Reset drag
        setDragSelection({ isDragging: false, startDocId: null, startDateStr: null, startIdx: null, currentIdx: null });

        // Calculate ISO for the start slot using the full index
        const startBlockIso = timeSlots[low]?.iso || startIso;
        handleOpenModal(doc, { iso: startBlockIso }, date, finalDuration);
    };

    const isCellInDragSelection = (docId: string, dateStr: string, slotIdx: number) => {
        if (!dragSelection.isDragging || dragSelection.startDocId !== docId || dragSelection.startDateStr !== dateStr) return false;
        if (dragSelection.startIdx === null || dragSelection.currentIdx === null) return false;
        const low = Math.min(dragSelection.startIdx, dragSelection.currentIdx);
        const high = Math.max(dragSelection.startIdx, dragSelection.currentIdx);
        return slotIdx >= low && slotIdx <= high;
    };

    // --- Drag & Drop Reschedule Handlers ---
    const handleApptDragStart = (e: React.DragEvent, apptId: string) => {
        e.dataTransfer.setData('apptId', apptId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleApptDrop = async (e: React.DragEvent, docId: string, dateStr: string, timeIso: string) => {
        e.preventDefault();
        if (isReadOnly) {
            alert("Demo Mode: Action not allowed");
            return;
        }
        const apptId = e.dataTransfer.getData('apptId');
        if (!apptId) return;

        const appt = appointments.find(a => a.id === apptId);
        if (!appt) return;

        // Optimistic update
        setAppointments(prev => prev.map(a =>
            a.id === apptId
                ? { ...a, doctor_id: docId, date: dateStr, appointment_time: timeIso }
                : a
        ));

        // Supabase update
        await supabase
            .from('ledger_entries')
            .update({
                doctor_id: docId,
                date: dateStr,
                appointment_time: timeIso
            })
            .eq('id', apptId);
    };

    async function handlePatientSearch(q: string) {
        setPatientSearchQuery(q);
        if (q.length > 1 && currentBranch) {
            const { data } = await supabase
                .from('patients')
                .select('*')
                .eq('branch_id', currentBranch.id)
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
        if (isReadOnly) {
            setIsModalOpen(false);
            alert("Demo Mode: Action not allowed");
            return;
        }
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
                    appointment_time: `${customStartTime}:00`,
                    duration_minutes: customDuration,
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
            case 'Registered':
            case 'pending':
                return { bg: 'bg-[#19D5C5]/5', border: 'border-[#19D5C5]/20', dot: 'bg-[#19D5C5]', pill: 'bg-[#19D5C5] text-white' };
            default: return { bg: 'bg-gray-50', border: 'border-gray-200', dot: 'bg-gray-400', pill: 'bg-gray-400 text-white' };
        }
    };

    // Calculate Week Days
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)), [weekStart]);

    return (
        <div className="w-full flex flex-col h-screen animate-in fade-in duration-500 overflow-hidden bg-white">
            {/* Header Tabs */}
            <div className="px-6 border-b border-[#E0E5F2] flex items-center gap-6 bg-white z-[60] shrink-0">
                {[
                    { id: 'calendar', label: 'Calendar' },
                    { id: 'history', label: 'Log History' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "py-4 text-[12px] font-medium transition-all relative border-b-2",
                            activeTab === tab.id ? "text-[#3B82F6] border-[#3B82F6]" : "text-[#A3AED0] border-transparent hover:text-[#1B2559]"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Control & Metric Bar */}
            <div className="px-6 py-3 flex items-center justify-between gap-3 bg-white z-[50] shrink-0 border-b border-[#f5f7fd]">
                <div className="flex items-center gap-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-[#E0E5F2] flex items-center justify-center text-[#1B2559] shadow-sm">
                            <CalendarIcon className="w-6 h-6 text-[#A3AED0]" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-[#1B2559] tracking-tighter leading-none">{appointments.length}</span>
                            <span className="text-[12px] font-medium text-[#A3AED0] uppercase tracking-tight">total appointments</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-l border-[#E0E5F2] pl-5">
                        <button onClick={() => setSelectedDate(new Date())} className="px-6 py-2.5 bg-white border border-[#E0E5F2] rounded-lg text-[12px] font-medium text-[#1B2559] uppercase hover:bg-[#F4F7FE] transition-all shadow-sm">Today</button>
                        <div className="flex items-center gap-2 ml-1">
                            <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} className="p-2 border border-[#E0E5F2] rounded-lg text-[#A3AED0] hover:text-[#1B2559] hover:bg-gray-50"><ChevronLeft className="w-4 h-4" /></button>
                            <label className="text-[14px] font-medium text-[#1B2559] min-w-[150px] text-center tracking-tight relative group cursor-pointer">
                                {format(selectedDate, 'EEE, d MMM yyyy')}
                                <input
                                    type="date"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    value={format(selectedDate, 'yyyy-MM-dd')}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setSelectedDate(new Date(e.target.value));
                                        }
                                    }}
                                />
                            </label>
                            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="p-2 border border-[#E0E5F2] rounded-lg text-[#A3AED0] hover:text-[#1B2559] hover:bg-gray-50"><ChevronRight className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-[#F4F7FE] p-1 rounded-xl border border-[#E0E5F2]">
                        <button onClick={() => setView('day')} className={cn("px-6 py-2 rounded-lg text-[12px] font-medium uppercase transition-all", view === 'day' ? "bg-white text-primary shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]")}>Day</button>
                        <button onClick={() => setView('week')} className={cn("px-6 py-2 rounded-lg text-[12px] font-medium uppercase transition-all", view === 'week' ? "bg-white text-primary shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]")}>Week</button>
                    </div>
                    {/* Doctor Filter Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowDoctorFilter(f => !f)}
                            className={cn(
                                "bg-white px-5 py-2.5 rounded-xl border text-[12px] font-medium uppercase flex items-center gap-2 shadow-sm transition-all",
                                selectedDoctorId
                                    ? "border-[#3B82F6] text-[#3B82F6]"
                                    : "border-[#E0E5F2] text-[#1B2559] hover:bg-[#F4F7FE]"
                            )}
                        >
                            <Filter className="w-5 h-5 text-[#A3AED0]" />
                            {selectedDoctorId ? doctors.find(d => d.id === selectedDoctorId)?.name?.split(' ')[1] || 'Filtered' : 'All Dentist'}
                            <ChevronDown className="w-4 h-4 text-[#A3AED0]" />
                        </button>
                        {showDoctorFilter && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDoctorFilter(false)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E0E5F2] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-3 py-2 border-b border-[#F4F7FE]">
                                        <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Filter by Doctor</p>
                                    </div>
                                    <button
                                        onClick={() => { setSelectedDoctorId(null); setShowDoctorFilter(false); }}
                                        className={cn("w-full text-left px-4 py-3 text-[12px] font-medium transition-colors flex items-center justify-between", !selectedDoctorId ? "text-[#3B82F6] bg-[#F4F7FE]" : "text-[#1B2559] hover:bg-[#F4F7FE]")}
                                    >
                                        All Doctors
                                        {!selectedDoctorId && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
                                    </button>
                                    {doctors.map(doc => (
                                        <button
                                            key={doc.id}
                                            onClick={() => { setSelectedDoctorId(doc.id); setShowDoctorFilter(false); }}
                                            className={cn("w-full text-left px-4 py-3 text-[12px] font-medium transition-colors flex items-center justify-between", selectedDoctorId === doc.id ? "text-[#3B82F6] bg-[#F4F7FE]" : "text-[#1B2559] hover:bg-[#F4F7FE]")}
                                        >
                                            {doc.name}
                                            {selectedDoctorId === doc.id && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Calendar Grid — only when calendar tab active */}
            {activeTab === 'calendar' && <div className="flex-1 overflow-x-auto overflow-y-hidden relative border-t border-[#f5f7fd] custom-scrollbar">
                <div className="flex flex-col min-w-max h-full">
                    {/* Headers */}
                    {view === 'day' ? (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleColumnSortEnd}
                        >
                            <SortableContext
                                items={visibleDoctors.map(d => d.id)}
                                strategy={horizontalListSortingStrategy}
                            >
                                <div className="flex shrink-0 sticky top-0 z-40 bg-white">
                                    <div className="w-[80px] border-r border-b border-[#f5f7fd] flex flex-col items-center justify-center py-4 bg-[#F4F7FE]/20 shrink-0 sticky left-0 z-[45] backdrop-blur-sm">
                                        <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">GMT</span>
                                        <span className="text-[11px] font-medium text-[#1B2559] mt-0.5">+07:00</span>
                                    </div>
                                    {visibleDoctors.map(doc => (
                                        <SortableDoctorHeader
                                            key={doc.id}
                                            doc={doc}
                                            appointments={appointments}
                                            onClickFilter={(id: string) => setSelectedDoctorId(id)}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="flex shrink-0 sticky top-0 z-40 bg-white">
                            <div className="w-[80px] border-r border-b border-[#f5f7fd] flex flex-col items-center justify-center py-4 bg-[#F4F7FE]/20 shrink-0 sticky left-0 z-[45] backdrop-blur-sm">
                                <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">GMT</span>
                                <span className="text-[11px] font-medium text-[#1B2559] mt-0.5">+07:00</span>
                            </div>
                            {weekDays.map((day, idx) => {
                                const isToday = isSameDay(day, new Date());
                                return (
                                    <div key={idx} className={cn(
                                        "w-[280px] min-w-[280px] flex-1 border-r border-b border-[#f5f7fd] px-4 py-3 flex flex-col items-center justify-center bg-white shadow-[inset_0_-1px_0_0_#f5f7fd]",
                                        isToday && "bg-[#F4F7FE]/30"
                                    )}>
                                        <span className={cn("text-[11px] font-black uppercase tracking-widest", isToday ? "text-[#3B82F6]" : "text-[#A3AED0]")}>
                                            {format(day, 'EEEE')}
                                        </span>
                                        <span className={cn("text-[15px] font-black mt-0.5", isToday ? "text-[#3B82F6]" : "text-[#1B2559]")}>
                                            {format(day, 'MMM d')}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Scrollable Grid Body */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="flex">
                            {/* Time Ticks Column (Merged Hourly Cells) */}
                            <div className="w-[80px] border-r border-[#f5f7fd] bg-white flex flex-col shrink-0 sticky left-0 z-30 shadow-[1px_0_0_0_#f5f7fd]">
                                {timeSlots.filter(s => s.isMainLabel).map(slot => (
                                    <div key={slot.iso} className="h-[108px] border-b border-[#f5f7fd] flex items-start justify-center px-2 pt-2">
                                        <span className="text-[11px] font-medium text-[#1B2559] uppercase tracking-tight">{slot.display}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Data Columns */}
                            <div className="flex flex-1">
                                {(view === 'day' ? visibleDoctors : weekDays).map((colItem: any, colIdx: number) => {
                                    const isDayView = view === 'day';
                                    const doc = isDayView ? colItem : (visibleDoctors[0] || doctors[0]);
                                    const day = isDayView ? selectedDate : colItem;
                                    const dateStr = format(day, 'yyyy-MM-dd');

                                    let slotsToSkip = 0;
                                    return (
                                        <div
                                            key={isDayView ? doc.id : colIdx}
                                            className={cn(
                                                "flex-none border-r border-[#f5f7fd] relative select-none",
                                                isDayView ? "w-[260px]" : "w-[280px]"
                                            )}
                                        >
                                            {timeSlots.map((slot, slotIdx) => {
                                                const apptsInSlot = appointments.filter(a => a.doctor_id === doc?.id && a.appointment_time === slot.iso && a.date === dateStr);
                                                const appt = apptsInSlot[0];
                                                const isBreak = isBreakTime(slot.iso);
                                                const isSelected = isCellInDragSelection(doc?.id, dateStr, slotIdx);

                                                if (slotsToSkip > 0) {
                                                    slotsToSkip--;
                                                    return (
                                                        <div key={slot.iso} className={cn(
                                                            "h-[27px] border-b border-[#f5f7fd] relative group",
                                                            isBreak ? "bg-stripes-gray micro-opacity" : "",
                                                            isSelected ? "bg-[#3B82F6]/20 border-[#3B82F6]/30 border-y shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]" : ""
                                                        )} />
                                                    );
                                                }

                                                if (apptsInSlot.length > 0) {
                                                    const maxDuration = Math.max(...apptsInSlot.map(a => a.duration_minutes || a.treatments?.duration_minutes || 30));
                                                    const span = Math.max(1, Math.ceil(maxDuration / INCREMENT_MINUTES));
                                                    slotsToSkip = span - 1;

                                                    return (
                                                        <div key={slot.iso} className={cn(
                                                            "border-b border-[#f5f7fd] relative group cursor-pointer flex gap-1 px-1 py-1",
                                                            isBreak ? "bg-stripes-gray micro-opacity" : ""
                                                        )}
                                                            style={{ height: `${span * 27}px` }}
                                                            onDragOver={(e) => { if (!isBreak) e.preventDefault(); }}
                                                            onDrop={(e) => {
                                                                if (isBreak) return;
                                                                handleApptDrop(e, doc?.id, dateStr, slot.iso);
                                                            }}
                                                            onMouseUp={() => {
                                                                if (dragSelection.isDragging) {
                                                                    handleCellMouseUp(doc, day, slotIdx, slot.iso);
                                                                }
                                                            }}
                                                        >
                                                            {apptsInSlot.map((item, i) => {
                                                                const styles = getStatusStyles(item.status);
                                                                return (
                                                                    <div key={item.id} className={cn(
                                                                        "flex-1 rounded-lg px-2 py-1.5 border shadow-sm z-20 flex flex-col transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer overflow-hidden select-none",
                                                                        styles?.bg, styles?.border
                                                                    )}
                                                                        onClick={(e) => { e.stopPropagation(); setSelectedAppointment(item); }}
                                                                        draggable
                                                                        onDragStart={(e) => handleApptDragStart(e, item.id)}
                                                                    >
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles?.dot)} />
                                                                            <span className="text-[10px] font-black text-[#1B2559] truncate uppercase leading-none">{item.patients?.name || item.manual_patient_name}</span>
                                                                        </div>
                                                                        {span > 1 && (
                                                                            <span className="text-[9px] font-medium text-[#A3AED0] opacity-80 truncate uppercase mt-1">{item.treatments?.name?.slice(0, 18) || item.staff?.name}</span>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={slot.iso} className={cn(
                                                        "h-[27px] border-b border-[#f5f7fd] relative group select-none",
                                                        isBreak ? "bg-stripes-gray micro-opacity" : "",
                                                        isSelected ? "bg-[#3B82F6]/20 border-[#3B82F6]/30 border-y shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)]" : "hover:bg-[#F4F7FE]/30"
                                                    )}
                                                        onMouseDown={(e) => {
                                                            if (e.button !== 0 || isBreak) return;
                                                            e.preventDefault(); // Prevent text selection
                                                            handleCellMouseDown(doc?.id, dateStr, slotIdx);
                                                        }}
                                                        onMouseEnter={() => {
                                                            if (isBreak) return;
                                                            handleCellMouseEnter(doc?.id, dateStr, slotIdx);
                                                        }}
                                                        onMouseUp={() => {
                                                            if (isBreak && !dragSelection.isDragging) return;
                                                            handleCellMouseUp(doc, day, slotIdx, slot.iso);
                                                        }}
                                                        onDragOver={(e) => { if (!isBreak) e.preventDefault(); }}
                                                        onDrop={(e) => {
                                                            if (isBreak) return;
                                                            handleApptDrop(e, doc?.id, dateStr, slot.iso);
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>}

            {/* Log History Tab */}
            {activeTab === 'history' && (
                <div className="flex-1 overflow-auto px-7 py-6">
                    <div className="bg-white rounded-[24px] border border-[#E0E5F2] shadow-sm overflow-hidden">
                        <div className="px-6 py-5 border-b border-[#E0E5F2] flex items-center justify-between">
                            <div>
                                <h2 className="text-[18px] font-black text-[#1B2559] tracking-tight">Appointment Log</h2>
                                <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mt-0.5">
                                    {format(selectedDate, 'EEEE, MMMM d, yyyy')} · {appointments.length} total
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-[#F4F7FE]">
                                        {['Time', 'Patient', 'Treatment', 'Doctor', 'Duration', 'Price', 'Remaining', 'Status'].map(h => (
                                            <th key={h} className="px-5 py-4">
                                                <span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">{h}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F4F7FE]">
                                    {appointments.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-5 py-16 text-center">
                                                <p className="text-[12px] font-medium text-[#A3AED0] uppercase tracking-widest">No appointments on this day</p>
                                            </td>
                                        </tr>
                                    ) : appointments.map(appt => {
                                        const patientName = appt.patients?.name || appt.manual_patient_name || '—';
                                        const treatName = appt.treatments?.name || appt.description || '—';
                                        const docName = appt.staff?.name || '—';
                                        const stStyles = getStatusStyles(appt.status);
                                        return (
                                            <tr
                                                key={appt.id}
                                                className="hover:bg-[#F4F7FE]/30 transition-colors cursor-pointer"
                                                onClick={() => setSelectedAppointment(appt)}
                                            >
                                                <td className="px-5 py-4">
                                                    <span className="text-[12px] font-black text-[#1B2559]">{appt.appointment_time?.slice(0, 5) || '—'}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-xl bg-[#F4F7FE] border border-[#E0E5F2] flex items-center justify-center text-[13px] font-black text-[#1B2559] shrink-0">
                                                            {patientName[0]?.toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="text-[12px] font-black text-[#1B2559]">{patientName}</p>
                                                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-tight">{appt.patients?.phone || ''}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[12px] font-medium text-[#1B2559]">{treatName}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[12px] font-medium text-[#1B2559]">{docName}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[12px] font-medium text-[#1B2559]">{appt.duration_minutes || appt.treatments?.duration_minutes || 15} min</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="text-[12px] font-black text-[#1B2559]">${(appt.total_price || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={cn("text-[12px] font-black", (appt.amount_remaining || 0) > 0 ? 'text-[#EE5D50]' : 'text-[#19D5C5]')}>
                                                        ${(appt.amount_remaining || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight",
                                                        stStyles?.bg,
                                                        appt.status === 'Finished' ? 'text-[#EE5D50]' :
                                                            appt.status === 'Doing Treatment' ? 'text-[#3B82F6]' : 'text-[#19D5C5]'
                                                    )}>
                                                        <div className={cn("w-1.5 h-1.5 rounded-full", stStyles?.dot)} />
                                                        {appt.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Appointment Detail Modal */}
            {selectedAppointment && (
                <AppointmentDetailModal
                    appointment={selectedAppointment}
                    onClose={() => setSelectedAppointment(null)}
                    onRefresh={() => { fetchInitialData(); setSelectedAppointment(null); }}
                />
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-deepNavy/20 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl w-full max-w-md border border-[#E0E5F2] shadow-2xl p-8 relative overflow-hidden flex flex-col gap-5">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#3B82F6] to-[#19D5C5]" />

                        <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-black text-[#1B2559] uppercase tracking-widest">
                                {step === 'search' ? 'Identify Patient' :
                                    step === 'new-patient' ? 'New Profile' :
                                        step === 'treatment' ? 'Assign Procedure' : 'Finalize Reservation'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[#F4F7FE] rounded-lg transition-all text-[#A3AED0]">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step Details */}
                        <div className="bg-[#F4F7FE]/50 rounded-xl p-4 border border-[#E0E5F2]/50 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-white border border-[#E0E5F2] flex items-center justify-center text-[#3B82F6] shadow-sm shrink-0">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-[#1B2559] leading-none mb-1">
                                    {format(selectedSlot?.date, 'MMM d, yyyy')} @ {selectedSlot?.slot.iso.slice(0, 5)}
                                </p>
                                <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">
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
                                                <div className="w-10 h-10 rounded-xl bg-white border border-[#E0E5F2] flex items-center justify-center text-[13px] font-black text-[#1B2559] group-hover:text-[#3B82F6]">
                                                    {p.name[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[13px] font-black text-[#1B2559] leading-none mb-1">{p.name}</p>
                                                    <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-tighter">
                                                        {p.gender} · {p.age} Yrs · {p.phone || 'No Phone'}
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-[#A3AED0] group-hover:text-[#3B82F6]" />
                                        </button>
                                    ))}
                                    {patientSearchQuery.length > 1 && patientResults.length === 0 && (
                                        <div className="py-5 text-center">
                                            <p className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">No profiles found</p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => {
                                        setNewPatientData({ ...newPatientData, name: patientSearchQuery });
                                        setStep('new-patient');
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1B2559] text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-[#253375] transition-all shadow-md active:scale-95"
                                >
                                    <UserPlus className="w-4.5 h-4.5" />
                                    Initialize New Profile
                                </button>
                            </div>
                        )}

                        {/* New Patient Step */}
                        {step === 'new-patient' && (
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Full Name</label>
                                    <input
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[13px] font-medium text-[#1B2559] outline-none focus:border-[#3B82F6]/30 transition-all"
                                        value={newPatientData.name}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Sex</label>
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[13px] font-medium text-[#1B2559] outline-none cursor-pointer"
                                            value={newPatientData.gender}
                                            onChange={(e) => setNewPatientData({ ...newPatientData, gender: e.target.value })}
                                        >
                                            <option value="F">Female</option>
                                            <option value="M">Male</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Age</label>
                                        <input
                                            type="number"
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[13px] font-medium text-[#1B2559] outline-none"
                                            value={newPatientData.age}
                                            onChange={(e) => setNewPatientData({ ...newPatientData, age: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Phone</label>
                                    <input
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[13px] font-medium text-[#1B2559] outline-none"
                                        placeholder="012 345 678"
                                        value={newPatientData.phone}
                                        onChange={(e) => setNewPatientData({ ...newPatientData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setStep('search')}
                                        className="flex-1 py-3.5 bg-[#F4F7FE] text-[#1B2559] rounded-xl text-[12px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={() => setStep('treatment')}
                                        className="flex-1 py-3.5 bg-[#3B82F6] text-white rounded-xl text-[12px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-[#3B82F6]/20"
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

                                    {/* Modal Overrides */}
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Start Time</label>
                                            <input
                                                type="time"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-medium text-[#1B2559] outline-none"
                                                value={customStartTime}
                                                onChange={(e) => setCustomStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Duration (Mins)</label>
                                            <input
                                                type="number"
                                                step={15}
                                                min={15}
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-3 py-2 text-[10px] font-medium text-[#1B2559] outline-none"
                                                value={customDuration}
                                                onChange={(e) => setCustomDuration(Number(e.target.value))}
                                            />
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

            <style dangerouslySetInnerHTML={{
                __html: `
                .bg-stripes-gray {
                    background: repeating-linear-gradient(-45deg, #F4F7FE, #F4F7FE 3px, #FFFFFF 3px, #FFFFFF 6px);
                }
                .micro-opacity { opacity: 0.4; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .custom-scrollbar::-webkit-scrollbar { width: 3px; height: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E0E5F2; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #A3AED0; }
            `}} />
        </div>
    );
}

function SortableDoctorHeader({ doc, appointments, onClickFilter }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: doc.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="w-[260px] flex-none border-r border-b border-[#f5f7fd] px-4 py-3 flex items-center justify-between group bg-white shadow-[inset_0_-1px_0_0_#f5f7fd] cursor-grab active:cursor-grabbing select-none"
            {...attributes}
            {...listeners}
        >
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-[#E0E5F2] flex items-center justify-center bg-white shadow-sm shrink-0">
                    <User className="w-5 h-5 text-[#A3AED0]" />
                </div>
                <div className="truncate">
                    <h4 className="text-[14px] font-black text-[#1B2559] truncate uppercase leading-tight tracking-tight">{doc.name}</h4>
                    <p className="text-[11px] font-medium text-[#A3AED0] uppercase truncate leading-none mt-0.5">
                        <span className="text-[#1B2559] font-bold">{(appointments.filter((a: any) => a.doctor_id === doc.id).length)} PTS</span>
                    </p>
                </div>
            </div>
            <button
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onClickFilter(doc.id); }}
                className="p-1.5 text-[#A3AED0] opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <MoreHorizontal className="w-4 h-4" />
            </button>
        </div>
    );
}

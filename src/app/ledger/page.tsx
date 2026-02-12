"use client";

import React, { useState, useEffect } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Printer,
  BookOpen,
  X,
  Trash2,
  ChevronUp,
  History,
  Eye,
  EyeOff,
  Activity,
  DollarSign as DollarIcon,
  TrendingUp,
  Search,
  Layout,
  ChevronDown,
  User,
  Clock
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfDay, addMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PatientSearch from "@/components/PatientSearch";
import { useCurrency } from "@/context/CurrencyContext";
import { useSidebar } from "@/context/SidebarContext";
import { useBranch } from "@/context/BranchContext";
import {
  LayoutGrid,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Target,
  Wallet,
  Info,
  Stethoscope
} from "lucide-react";

export default function LedgerPage() {
  const { currentBranch } = useBranch();
  const [date, setDate] = useState<Date>(new Date());
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [monthEntries, setMonthEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [viewMode, setViewMode] = useState<'manual' | 'list' | 'calendar'>('manual');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string[]>([]);
  const [calendarSearchQuery, setCalendarSearchQuery] = useState("");
  const [isDoctorFilterOpen, setIsDoctorFilterOpen] = useState(false);
  const [isCalendarSearchOpen, setIsCalendarSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'none' | 'expensive' | 'unpaid'>('none');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);

  const { isCollapsed, showSummary, setShowSummary } = useSidebar();
  const { usdToKhr } = useCurrency();
  const [treatments, setTreatments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [quickPatient, setQuickPatient] = useState({
    name: "",
    phone: "",
    dob: "",
    gender: "F",
    doctor_id: ""
  });

  const [managedEntry, setManagedEntry] = useState<any>(null);
  const [undoItem, setUndoItem] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [intakeResults, setIntakeResults] = useState<any[]>([]);
  const [isIntakeSearching, setIsIntakeSearching] = useState(false);

  // Quick Calendar Event States
  const [isQuickEventOpen, setIsQuickEventOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const [quickEventData, setQuickEventData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: "09:00",
    patientId: "",
    patientName: "",
    gender: "F",
    age: "",
    doctorId: "",
    treatmentId: "",
    duration: 15
  });
  const [isMonthSelectorOpen, setIsMonthSelectorOpen] = useState(false);
  const [treatmentSearch, setTreatmentSearch] = useState("");
  const [activeTreatmentLookup, setActiveTreatmentLookup] = useState<{ id: string, query: string } | null>(null);
  const [activePatientLookup, setActivePatientLookup] = useState<{ id: string, query: string } | null>(null);
  const [patientSearchResults, setPatientSearchResults] = useState<any[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Logic
  useEffect(() => {
    if (mounted && currentBranch) {
      if (viewMode === 'list') {
        fetchDailyEntries();
      } else {
        fetchMonthlyEntries();
      }
      fetchStaticData();
    }
  }, [date, viewMode, mounted, currentBranch]);

  async function fetchStaticData() {
    const { data: tData } = await supabase
      .from('treatments')
      .select('*')
      .eq('branch_id', currentBranch?.id);
    if (tData) setTreatments(tData);

    const { data: sData } = await supabase
      .from('staff')
      .select('*')
      .eq('branch_id', currentBranch?.id);
    if (sData) {
      setStaff(sData);
      if (sData.length > 0) setQuickPatient(prev => ({ ...prev, doctor_id: "" }));
    }
  }

  async function fetchDailyEntries() {
    setIsLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        patients (name, gender, age),
        treatments (name),
        doctor:staff!doctor_id (name)
      `)
      .eq('branch_id', currentBranch?.id)
      .eq('date', dateStr)
      .order('created_at', { ascending: true });

    if (!error && data) setEntries(data);
    setIsLoading(false);
  }

  async function fetchMonthlyEntries() {
    setIsLoading(true);
    const start = format(startOfMonth(date), 'yyyy-MM-dd');
    const end = format(endOfMonth(date), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        patients (name, phone, gender, age),
        treatments (name),
        doctor:staff!doctor_id (name),
        cashier:staff!cashier_id (name)
      `)
      .eq('branch_id', currentBranch?.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data) setMonthEntries(data);
    setIsLoading(false);
  }

  const [isSearching, setIsSearching] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Global Search logic (Top Header)
  useEffect(() => {
    const delayGlobalSearch = setTimeout(async () => {
      if (calendarSearchQuery.length > 1) {
        setIsSearching(true);
        const { data, error } = await supabase
          .from('patients')
          .select('*')
          .ilike('name', `%${calendarSearchQuery}%`)
          .limit(10);

        if (data) setGlobalSearchResults(data);
        setIsSearching(false);
      } else {
        setGlobalSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayGlobalSearch);
  }, [calendarSearchQuery]);

  // Patient Lookup Logic (In-Line Manual View)
  useEffect(() => {
    const delayPatientSearch = setTimeout(async () => {
      if (activePatientLookup?.query && activePatientLookup.query.length > 0) {
        const { data } = await supabase
          .from('patients')
          .select('*')
          .ilike('name', `%${activePatientLookup.query}%`)
          .limit(5);
        if (data) setPatientSearchResults(data);
      } else {
        setPatientSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayPatientSearch);
  }, [activePatientLookup?.query]);

  // Quick Intake Search logic (Independent of main ledger search)
  useEffect(() => {
    const delayIntakeSearch = setTimeout(async () => {
      if (quickPatient.name.length > 1) {
        setIsIntakeSearching(true);
        const { data } = await supabase
          .from('patients')
          .select('*')
          .ilike('name', `%${quickPatient.name}%`)
          .limit(5);

        if (data) setIntakeResults(data);
        setIsIntakeSearching(false);
      } else {
        setIntakeResults([]);
      }
    }, 400);

    return () => clearTimeout(delayIntakeSearch);
  }, [quickPatient.name]);

  // Stats - Dynamically switch based on view mode
  const currentEntries = viewMode === 'list'
    ? entries
    : monthEntries.filter(e => doctorFilter.length === 0 || doctorFilter.includes(e.doctor_id));

  let sourceEntries = currentEntries;

  // Apply Local Filter (Search)
  if (localSearchQuery.length > 1) {
    sourceEntries = sourceEntries.filter(e =>
      e.patients?.name?.toLowerCase().includes(localSearchQuery.toLowerCase())
    );
  }

  // Apply Advanced Filters
  if (activeFilter === 'expensive') {
    sourceEntries = [...sourceEntries].sort((a, b) => Number(b.total_price) - Number(a.total_price));
  } else if (activeFilter === 'unpaid') {
    sourceEntries = sourceEntries.filter(e => Number(e.amount_remaining) > 0);
  }



  // Revised Intake Logic: Separate ABA, USD Cash, KHR Cash
  const abaIntake = currentEntries.reduce((acc, e) => acc + (Number(e.paid_aba) || 0), 0);
  const usdCashIntake = currentEntries.reduce((acc, e) => acc + (Number(e.paid_cash_usd) || 0), 0);
  const khrCashIntake = currentEntries.reduce((acc, e) => acc + (Number(e.paid_cash_khr) || 0), 0);

  // Total Realized in USD (Approximate)
  const rate = Number(usdToKhr) || 4100;
  const totalRealized = abaIntake + usdCashIntake + (khrCashIntake / rate);

  const totalValue = currentEntries.reduce((acc, e) => acc + (Number(e.total_price) || 0), 0);

  // Grouping Logic for List View (Minimized/Maximized)
  // Logic: Use currentEntries (Daily).
  // Note: Monthly View uses the Calendar Matrix, not this list.


  const groupedEntries = Object.values(
    sourceEntries.reduce((acc: any, entry: any) => {
      const key = `${entry.patient_id}_${entry.date}`;
      if (!acc[key]) {
        acc[key] = {
          id: key,
          patient: entry.patients,
          treatments: [],
          totalPaid: 0,
          totalVal: 0,
          totalRem: 0,
          date: entry.date,
          patientId: entry.patient_id,
          method: entry.method // Usually the same for the day's visit
        };
      }
      acc[key].treatments.push(entry);
      acc[key].totalPaid += Number(entry.amount_paid);
      acc[key].totalVal += Number(entry.total_price);
      acc[key].totalRem += Number(entry.amount_remaining);
      return acc;
    }, {})
  ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  async function updateGroupMethod(patientId: string, visitDate: string, newMethod: string) {
    const { error } = await supabase
      .from('ledger_entries')
      .update({ method: newMethod })
      .eq('patient_id', patientId)
      .eq('date', visitDate);
    if (!error) fetchDailyEntries();
  }

  async function updateEntryMethod(id: string, newMethod: string) {
    const { error } = await supabase
      .from('ledger_entries')
      .update({ method: newMethod })
      .eq('id', id);
    if (!error) fetchDailyEntries();
  }

  async function voidTreatment(entry: any) {
    setManagedEntry(null);
    if (undoTimer) clearTimeout(undoTimer);
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    setUndoItem(entry);
    const timer = setTimeout(async () => {
      const { error } = await supabase.from('ledger_entries').delete().eq('id', entry.id);
      if (error) fetchDailyEntries();
      setUndoItem(null);
      setUndoTimer(null);
    }, 6000);
    setUndoTimer(timer);
  }

  function handleUndo() {
    if (undoTimer) {
      clearTimeout(undoTimer);
      fetchDailyEntries();
      setUndoItem(null);
      setUndoTimer(null);
    }
  }

  async function handleUpdateEntry(id: string, updates: any) {
    const { error } = await supabase.from('ledger_entries').update(updates).eq('id', id);
    if (!error) {
      setManagedEntry(null);
      fetchDailyEntries();
      fetchMonthlyEntries();
    }
  }

  async function handleInitializeManualRow() {
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({
        date: format(date, 'yyyy-MM-dd'),
        branch_id: currentBranch?.id,
        item_type: 'treatment',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        amount_remaining: 0,
        paid_aba: 0,
        paid_cash_usd: 0,
        paid_cash_khr: 0
      })
      .select()
      .single();

    if (!error && data) {
      fetchMonthlyEntries();
    } else if (error) {
      console.error("Initialization error:", error);
      alert("Failed to initialize new entry: " + error.message);
    }
  }

  async function handleDuplicateRow(entry: any) {
    const { data, error } = await supabase
      .from('ledger_entries')
      .insert({
        date: entry.date,
        branch_id: entry.branch_id,
        patient_id: entry.patient_id,
        manual_patient_name: entry.manual_patient_name,
        manual_gender: entry.manual_gender,
        manual_age: entry.manual_age,
        doctor_id: entry.doctor_id,
        cashier_id: entry.cashier_id,
        item_type: 'treatment',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
        amount_remaining: 0,
        paid_aba: 0,
        paid_cash_usd: 0,
        paid_cash_khr: 0
      })
      .select()
      .single();

    if (!error && data) {
      fetchMonthlyEntries();
    }
  }

  // Generate 15-minute intervals
  const timeIntervals = [];
  for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, '0');
      const mm = m.toString().padStart(2, '0');
      timeIntervals.push(`${hh}:${mm}`);
    }
  }

  async function handleSaveQuickEvent() {
    if (!quickEventData.patientName) return alert("Please enter a patient name");
    if (!quickEventData.doctorId) return alert("Please select a dentist");

    setIsLoading(true);
    let finalPatientId = quickEventData.patientId;

    // Create new patient if it's a forced create
    if (!finalPatientId) {
      const { data: newP, error: pErr } = await supabase
        .from('patients')
        .insert({
          name: quickEventData.patientName,
          gender: quickEventData.gender,
          age: quickEventData.age ? Number(quickEventData.age) : null,
          phone: '', // Placeholder
          branch_id: currentBranch?.id
        })
        .select()
        .single();

      if (pErr) {
        alert("Patient creation failed: " + pErr.message);
        setIsLoading(false);
        return;
      }
      finalPatientId = newP.id;
    }

    const { error } = await supabase
      .from('ledger_entries')
      .insert({
        patient_id: finalPatientId,
        doctor_id: quickEventData.doctorId,
        treatment_id: quickEventData.treatmentId || null,
        description: quickEventData.treatmentId
          ? treatments.find(t => t.id === quickEventData.treatmentId)?.name
          : "Initial Consultation",
        total_price: quickEventData.treatmentId
          ? treatments.find(t => t.id === quickEventData.treatmentId)?.price
          : 0,
        amount_paid: 0,
        amount_remaining: quickEventData.treatmentId
          ? treatments.find(t => t.id === quickEventData.treatmentId)?.price
          : 0,
        date: quickEventData.date,
        appointment_time: `${quickEventData.time}:00`,
        duration_minutes: quickEventData.duration,
        branch_id: currentBranch?.id,
        status: 'pending'
      });

    if (!error) {
      setIsQuickEventOpen(false);
      setQuickEventData({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: "09:00",
        patientId: "",
        patientName: "",
        gender: "F",
        age: "",
        doctorId: "",
        treatmentId: "",
        duration: 15
      });
      setTreatmentSearch("");
      fetchDailyEntries();
      fetchMonthlyEntries();
      alert("Appointment saved successfully!");
    } else {
      alert("Error saving: " + error.message);
    }
    setIsLoading(false);
  }

  if (!mounted) return null;

  return (
    <div className={cn(
      "relative transition-all",
      viewMode === 'list' ? "space-y-6 pb-24 block" : "flex flex-col h-[calc(100vh-3rem)] gap-4"
    )}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* View Toggle - Compact - Now on the left */}
          <div className="bg-[#F4F7FE] p-1 rounded-xl border border-[#E0E5F2] flex items-center gap-1 shrink-0">
            {(['manual', 'list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  viewMode === v ? "bg-white text-primary shadow-sm border border-[#E0E5F2]" : "text-[#A3AED0] hover:text-[#1B2559]"
                )}
              >
                {v === 'manual' && 'Manual View'}
                {v === 'list' && 'Daily View'}
                {v === 'calendar' && 'Calendar'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-[#E0E5F2] mx-2 hidden xl:block" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker / Month Selector Placeholder */}
          <div className="bg-white border border-[#E0E5F2] rounded-xl p-1 flex items-center shadow-sm shrink-0">
            <button
              onClick={() => {
                const next = new Date(date);
                if (viewMode === 'calendar') next.setMonth(date.getMonth() - 1);
                else next.setDate(date.getDate() - 1);
                setDate(next);
              }}
              className="p-1.5 hover:bg-[#F4F7FE] rounded-lg transition-all text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-1 border-x border-[#F4F7FE]">
              <DatePicker
                value={date}
                onChange={(d) => setDate(d)}
                format={viewMode === 'calendar' ? 'MMM yyyy' : 'MMM do, yy'}
                triggerClassName="bg-transparent border-none h-auto px-2 py-1 shadow-none"
              />
            </div>
            <button
              onClick={() => {
                const next = new Date(date);
                if (viewMode === 'calendar') next.setMonth(date.getMonth() + 1);
                else next.setDate(date.getDate() + 1);
                setDate(next);
              }}
              className="p-1.5 hover:bg-[#F4F7FE] rounded-lg transition-all text-primary"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Global Search Button */}
          <button
            onClick={() => setIsCalendarSearchOpen(true)}
            className="p-2.5 bg-[#F4F7FE] border border-[#E0E5F2] hover:border-primary/30 rounded-xl text-[#A3AED0] hover:text-primary transition-all shadow-sm group shrink-0"
          >
            <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={() => setIsAddingEntry(true)}
            className="btn-primary-premium shadow-lg shadow-primary/20 h-[44px]"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
            Create Patient
          </button>
        </div>
      </div>

      {/* Modern Bento Grid Stats - Massive Density Gain */}
      {/* Intake / Stats Summary - Hidden in Calendar View for Full Screen experience */}
      {
        viewMode !== 'calendar' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
            {/* Main Portfolio Card - Total Earnings (Highlighted) */}
            <div className="md:col-span-4 bg-gradient-to-br from-[#1B2559] to-[#3311DB] rounded-[1.25rem] p-5 text-white flex flex-col justify-between relative overflow-hidden group hover:shadow-xl hover:shadow-primary/20 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110" />

              <div className="relative z-10">
                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Global Earnings Cluster</span>
                <h2 className="text-2xl font-black text-white mt-1 tracking-tight">
                  ${(currentEntries.reduce((acc, curr) => acc + (Number(curr.amount_paid) || 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
              </div>

              <div className="relative z-10 flex items-center justify-between mt-4">
                <div className="flex items-center gap-1.5 text-emerald-400 bg-white/10 px-2 py-0.5 rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[9px] font-bold">+12.5%</span>
                </div>
              </div>
            </div>

            {/* Binary Stats (ABA + Cash) */}
            <div className="md:col-span-5 grid grid-cols-2 gap-4">
              <div className="bg-white border border-[#E0E5F2] rounded-[1.25rem] p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-black text-[#A3AED0] uppercase">ABA</span>
                </div>
                <div>
                  <p className="text-lg font-black text-[#1B2559] tracking-tight">${abaIntake.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-white border border-[#E0E5F2] rounded-[1.25rem] p-4 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[8px] font-black text-[#A3AED0] uppercase">USD Cash</span>
                </div>
                <div>
                  <p className="text-lg font-black text-[#1B2559] tracking-tight">${usdCashIntake.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* KHR Card - Standardized */}
            <div className="md:col-span-3 bg-white border border-[#E0E5F2] rounded-[1.25rem] p-4 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <Target className="w-3.5 h-3.5" />
                </div>
                <span className="text-[8px] font-black text-[#A3AED0] uppercase">KHR Cash</span>
              </div>
              <div>
                <p className="text-lg font-black text-[#1B2559] tracking-tight">{khrCashIntake.toLocaleString()} <span className="text-xs font-bold text-[#A3AED0]">៛</span></p>
              </div>
            </div>
          </div>
        )
      }

      {/* Main Viewport */}
      {
        viewMode === 'calendar' ? (
          /* Calendar View - Full Screen Google Calendar Style */
          <div className="flex-1 flex flex-col bg-white border border-[#E0E5F2] rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-0">
            {/* Calendar Header Days */}
            <div className="grid grid-cols-7 border-b border-[#E0E5F2]">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="py-3 text-center border-r border-[#E0E5F2] last:border-r-0">
                  <span className="text-[11px] font-black text-[#1B2559] uppercase tracking-widest">{day}</span>
                </div>
              ))}
            </div>

            {/* Calendar Grid - Flex Grow to fill height */}
            <div className="flex-1 grid grid-cols-7 grid-rows-6 lg:grid-rows-6 h-full">
              {(() => {
                const monthStart = startOfMonth(date);
                const monthEnd = endOfMonth(date);
                const dayCells = eachDayOfInterval({ start: monthStart, end: monthEnd });
                const startPadding = monthStart.getDay();

                // Calculate total cells needed to fill the grid (usually 35 or 42)
                // For a fixed grid, we can just pad with empty cells or prev/next month
                const cells = [];

                for (let i = 0; i < startPadding; i++) {
                  cells.push(
                    <div key={`empty-${i}`} className="border-r border-b border-[#E0E5F2] bg-slate-50/30" />
                  );
                }

                dayCells.forEach(day => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayEntries = monthEntries.filter(e =>
                    e.date === dayStr &&
                    (doctorFilter.length === 0 || doctorFilter.includes(e.doctor_id))
                  );
                  const isCurrent = isToday(day);

                  // Calculate Daily Total for the pill
                  const dailyTotal = dayEntries.reduce((acc, e) => acc + (Number(e.amount_paid) || 0), 0);

                  cells.push(
                    <div
                      key={dayStr}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        let leftPos = rect.left + rect.width + 10;
                        let topPos = rect.top;

                        // Right edge check
                        if (leftPos + 400 > window.innerWidth) {
                          leftPos = rect.left - 410; // Place on left if no space on right
                        }
                        let top = rect.top;
                        let left = rect.right + 10;
                        if (left + 420 > window.innerWidth) left = rect.left - 430;
                        if (top + 400 > window.innerHeight) top = window.innerHeight - 420;

                        setModalPosition({ top, left });
                        setQuickEventData({
                          date: format(day, 'yyyy-MM-dd'),
                          time: "09:00",
                          patientId: "",
                          patientName: "",
                          gender: "F",
                          age: "",
                          doctorId: "",
                          treatmentId: "",
                          duration: 15
                        });
                        setIntakeResults([]);
                        setIsIntakeSearching(false);
                        setIsQuickEventOpen(true);
                      }}
                      className={cn(
                        "min-h-[120px] bg-white border-r border-b border-[#F4F7FE] p-2 hover:bg-[#F4F7FE]/30 transition-all flex flex-col group relative cursor-pointer",
                        !isSameMonth(day, date) && "bg-gray-50/20",
                        isToday(day) && "bg-blue-50/40"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={cn(
                          "text-[10px] font-black",
                          isToday(day) ? "bg-primary text-white w-5 h-5 flex items-center justify-center rounded-lg shadow-lg shadow-primary/30 scale-110" :
                            isSameMonth(day, date) ? "text-[#1B2559]" : "text-[#A3AED0]/40"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayEntries.length > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-[#A3AED0] uppercase leading-none tracking-tighter">{dayEntries.length} PTS</span>
                            <span className="text-[10px] font-black text-primary leading-none mt-1">
                              ${dayEntries.reduce((sum, e) => sum + (e.total_price || 0), 0).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 mt-3">
                        {dayEntries.length > 0 && dayEntries.slice(0, 3).map((entry, idx) => {
                          const startTime = entry.appointment_time || "09:00:00";
                          const start = new Date(`2000-01-01T${startTime}`);
                          return (
                            <div key={idx} className="flex items-center gap-1.5 group/item cursor-pointer overflow-hidden p-0.5 rounded-md hover:bg-primary/5 transition-colors">
                              <span className="text-[9px] font-black text-primary/60 shrink-0 tabular-nums">
                                {format(start, 'h:mm')}
                              </span>
                              <span className="text-[10px] font-bold text-[#1B2559] truncate group-hover/item:text-primary transition-colors font-kantumruy">
                                {entry.patients?.name || 'Unknown'}
                              </span>
                            </div>
                          );
                        })}
                        {/* Placeholder slots to maintain 3-item height consistency */}
                        {dayEntries.length < 3 && Array.from({ length: 3 - dayEntries.length }).map((_, i) => (
                          <div key={`placeholder-${i}`} className="h-4 p-0.5" />
                        ))}
                        {dayEntries.length > 3 && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setDate(day);
                              setViewMode('list');
                            }}
                            className="text-[9px] font-black text-[#A3AED0] hover:text-primary transition-colors pt-1 tracking-widest uppercase cursor-pointer"
                          >
                            + {dayEntries.length - 3} View More
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });

                // Fill remaining cells to maintain grid structure (6 rows * 7 cols = 42)
                const remainingCells = 42 - cells.length;
                if (remainingCells > 0) {
                  for (let i = 0; i < remainingCells; i++) {
                    cells.push(<div key={`fill-${i}`} className="border-r border-b border-[#E0E5F2] bg-slate-50/30" />);
                  }
                }

                return cells;
              })()}
            </div>
          </div>
        ) : viewMode === 'manual' ? (
          /* Manual / Spreadsheet View */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Tools Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedEntries.length > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 transition-all">
                    <span className="text-[10px] font-black text-primary uppercase bg-primary/10 px-3 py-1.5 rounded-lg border border-primary/20 shadow-sm">
                      {selectedEntries.length} Records Selected
                    </span>
                    <button
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${selectedEntries.length} records? This cannot be undone.`)) {
                          const { error } = await supabase.from('ledger_entries').delete().in('id', selectedEntries);
                          if (!error) {
                            setSelectedEntries([]);
                            fetchMonthlyEntries();
                          }
                        }
                      }}
                      className="p-2.5 bg-[#EE5D50]/10 text-[#EE5D50] hover:bg-[#EE5D50] hover:text-white rounded-xl transition-all border border-[#EE5D50]/20 shadow-sm"
                      title="Delete Selection"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#E0E5F2] rounded-2xl text-[10px] font-black text-[#1B2559] uppercase tracking-widest hover:border-primary transition-all shadow-sm">
                    <Filter className="w-4 h-4 text-[#A3AED0]" />
                    Filtering & Sorting
                  </button>
                  <div className="absolute top-full right-0 mt-2 bg-white border border-[#E0E5F2] rounded-2xl shadow-xl z-50 p-2 min-w-[200px] hidden group-hover:block animate-in fade-in zoom-in-95">
                    <p className="px-4 py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest border-b border-[#F4F7FE]">Order By</p>
                    <button className="w-full text-left px-4 py-3 text-[10px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] rounded-xl transition-colors">Alphabetical (A-Z)</button>
                    <button className="w-full text-left px-4 py-3 text-[10px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] rounded-xl transition-colors">Amount (High to Low)</button>
                    <button className="w-full text-left px-4 py-3 text-[10px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] rounded-xl transition-colors">Balance Outstanding</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E0E5F2] rounded-[1.5rem] shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse manual-spreadsheet">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#F4F7FE] border-b border-[#E0E5F2]">
                      <th className="px-4 py-3 border-r border-[#E0E5F2] w-10 text-center">
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-[#E0E5F2] text-primary focus:ring-primary"
                          checked={selectedEntries.length > 0 && selectedEntries.length === monthEntries.filter((e: any) => e.date === format(date, 'yyyy-MM-dd')).length}
                          onChange={(e) => {
                            const dayIds = monthEntries.filter((e: any) => e.date === format(date, 'yyyy-MM-dd')).map((e: any) => e.id);
                            if (e.target.checked) setSelectedEntries(dayIds);
                            else setSelectedEntries([]);
                          }}
                        />
                      </th>

                      <th className="px-2 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-12 text-center">No.</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] min-w-[180px]">Patient Identity</th>
                      <th className="px-2 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-10 text-center">G</th>
                      <th className="px-2 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-12 text-center">Age</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] min-w-[220px]">Medical Service</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-28 text-right">Price</th>
                      <th className="px-2 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-12 text-center">Qty</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-28 text-right">Total</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-28 text-right">Paid</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-28 text-right text-[#EE5D50]">Remaining</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] min-w-[130px]">Dentist</th>
                      <th className="px-4 py-3 text-[10px] font-black text-[#1B2559] uppercase min-w-[130px]">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0E5F2]">
                    {isLoading ? (
                      <tr><td colSpan={13} className="py-24 text-center text-[10px] font-black text-[#A3AED0] uppercase tracking-widest animate-pulse">Synchronizing Ledger...</td></tr>
                    ) : (
                      (() => {
                        const selectedDayStr = format(date, 'yyyy-MM-dd');
                        const dayEntries = monthEntries.filter((e: any) => e.date === selectedDayStr);
                        const previousEntriesCount = monthEntries.filter((e: any) => e.date < selectedDayStr).length;

                        const dayUSD = dayEntries.reduce((sum: number, e: any) => sum + (Number(e.paid_aba) || 0) + (Number(e.paid_cash_usd) || 0), 0);
                        const dayKHR = dayEntries.reduce((sum: number, e: any) => sum + (Number(e.paid_cash_khr) || 0), 0);

                        return (
                          <>
                            {dayEntries.map((entry: any, eIdx: number) => (
                              <tr key={entry.id} className={cn(
                                "group transition-all hover:bg-[#F4F7FE]/30",
                                selectedEntries.includes(entry.id) && "bg-primary/5 hover:bg-primary/10"
                              )}>
                                <td className="px-4 py-2.5 border-r border-[#E0E5F2] text-center">
                                  <input
                                    type="checkbox"
                                    className="w-3.5 h-3.5 rounded border-[#E0E5F2] text-primary focus:ring-primary cursor-pointer"
                                    checked={selectedEntries.includes(entry.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedEntries([...selectedEntries, entry.id]);
                                      else setSelectedEntries(selectedEntries.filter(id => id !== entry.id));
                                    }}
                                  />
                                </td>

                                <td className="px-2 py-3 border-r border-[#E0E5F2] text-[10px] font-black text-[#A3AED0] text-center bg-[#F4F7FE]/10 group/no relative">
                                  {previousEntriesCount + eIdx + 1}
                                  <button
                                    onClick={() => handleDuplicateRow(entry)}
                                    className="absolute inset-0 bg-primary/90 text-white opacity-0 group-hover/no:opacity-100 flex items-center justify-center transition-all"
                                    title="Add another service for this patient"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2] text-[10px] font-black text-[#1B2559] relative">
                                  <input
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded-lg transition-all"
                                    placeholder="Patient Name"
                                    value={(activePatientLookup && activePatientLookup.id === entry.id) ? activePatientLookup.query : (entry.patients?.name || entry.manual_patient_name || "")}
                                    onChange={(e) => setActivePatientLookup({ id: entry.id, query: e.target.value })}
                                    onFocus={() => setActivePatientLookup({ id: entry.id, query: entry.patients?.name || entry.manual_patient_name || "" })}
                                    onBlur={() => {
                                      setTimeout(() => {
                                        if (activePatientLookup && activePatientLookup.id === entry.id) {
                                          handleUpdateEntry(entry.id, { manual_patient_name: activePatientLookup.query });
                                        }
                                        setActivePatientLookup(null);
                                      }, 200);
                                    }}
                                  />
                                  {(activePatientLookup && activePatientLookup.id === entry.id && activePatientLookup.query !== null) && (activePatientLookup.query.length > 0 || patientSearchResults.length > 0) && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[100] overflow-hidden py-1 max-h-[160px] overflow-y-auto custom-scrollbar min-w-[240px] animate-in fade-in slide-in-from-top-2">
                                      {patientSearchResults.map(p => (
                                        <button
                                          key={p.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleUpdateEntry(entry.id, {
                                              patient_id: p.id,
                                              manual_patient_name: p.name,
                                              manual_gender: p.gender,
                                              manual_age: p.age
                                            });
                                            setActivePatientLookup(null);
                                          }}
                                          className="w-full text-left px-4 py-2 hover:bg-[#F4F7FE] transition-colors border-b border-[#F4F7FE] last:border-0"
                                        >
                                          <div className="text-[10px] font-black text-[#1B2559] uppercase tracking-tight">{p.name}</div>
                                          <div className="text-[8px] font-bold text-[#A3AED0] uppercase tracking-widest">{p.gender} · {p.age} Yrs · {p.phone || 'No Contact'}</div>
                                        </button>
                                      ))}
                                      <button
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          setQuickPatient({ ...quickPatient, name: activePatientLookup?.query || "" });
                                          setIsAddingEntry(true);
                                        }}
                                        className="w-full text-left px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary transition-colors flex items-center gap-2"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">Register Identity Profile</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-3 border-r border-[#E0E5F2] text-[10px] font-black text-[#1B2559] text-center">
                                  <input
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded transition-all text-center uppercase font-black"
                                    maxLength={1}
                                    placeholder="G"
                                    defaultValue={entry.patients?.gender || entry.manual_gender || ""}
                                    onBlur={(e) => handleUpdateEntry(entry.id, { manual_gender: e.target.value })}
                                  />
                                </td>
                                <td className="px-2 py-3 border-r border-[#E0E5F2] text-[10px] font-black text-[#1B2559] text-center">
                                  <input
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded transition-all text-center font-black"
                                    placeholder="Age"
                                    defaultValue={entry.patients?.age || entry.manual_age || ""}
                                    onBlur={(e) => handleUpdateEntry(entry.id, { manual_age: e.target.value })}
                                  />
                                </td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2] text-[10px] font-bold text-[#1B2559] relative">
                                  <input
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded-lg transition-all"
                                    placeholder="Select Treatment..."
                                    value={(activeTreatmentLookup && activeTreatmentLookup.id === entry.id) ? activeTreatmentLookup.query : (entry.description || entry.treatments?.name || "")}
                                    onChange={(e) => setActiveTreatmentLookup({ id: entry.id, query: e.target.value })}
                                    onFocus={() => setActiveTreatmentLookup({ id: entry.id, query: entry.description || entry.treatments?.name || "" })}
                                    onBlur={() => {
                                      setTimeout(() => setActiveTreatmentLookup(null), 200);
                                    }}
                                  />
                                  {activeTreatmentLookup?.id === entry.id && (
                                    <div className="absolute top-full left-0 right-[-100px] mt-2 bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[9000] overflow-hidden py-1 max-h-[160px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                                      {treatments.filter(t => t.name.toLowerCase().includes(activeTreatmentLookup?.query?.toLowerCase() || "")).map(t => (
                                        <button
                                          key={t.id}
                                          onMouseDown={(e) => {
                                            e.preventDefault();
                                            handleUpdateEntry(entry.id, {
                                              treatment_id: t.id,
                                              description: t.name,
                                              unit_price: t.price,
                                              total_price: t.price * (entry.quantity || 1),
                                              amount_remaining: (t.price * (entry.quantity || 1)) - (entry.amount_paid || 0)
                                            });
                                            setActiveTreatmentLookup(null);
                                          }}
                                          className="w-full text-left px-4 py-2 hover:bg-[#F4F7FE] text-[10px] font-black text-[#1B2559] flex justify-between items-center transition-colors border-b border-[#F4F7FE] last:border-0"
                                        >
                                          <span>{t.name}</span>
                                          <span className="text-primary font-black">${t.price}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2] text-[11px] font-black text-[#1B2559] text-right">
                                  <input
                                    type="number"
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded transition-all text-right font-black"
                                    defaultValue={entry.unit_price}
                                    onBlur={(e) => {
                                      const up = Number(e.target.value);
                                      handleUpdateEntry(entry.id, {
                                        unit_price: up,
                                        total_price: up * (entry.quantity || 1),
                                        amount_remaining: (up * (entry.quantity || 1)) - (entry.amount_paid || 0)
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-2 py-3 border-r border-[#E0E5F2] text-[11px] font-black text-[#A3AED0] text-center bg-[#F4F7FE]/5">
                                  <input
                                    type="number"
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded transition-all text-center font-black"
                                    defaultValue={entry.quantity || 1}
                                    onBlur={(e) => {
                                      const q = Number(e.target.value);
                                      handleUpdateEntry(entry.id, {
                                        quantity: q,
                                        total_price: q * (entry.unit_price || 0),
                                        amount_remaining: (q * (entry.unit_price || 0)) - (entry.amount_paid || 0)
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2] text-[11px] font-black text-[#1B2559] text-right bg-[#F4F7FE]/10">${(entry.total_price || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2] text-[11px] font-black text-[#19D5C5] text-right">
                                  <input
                                    type="number"
                                    className="w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded-all text-right font-black text-[#19D5C5]"
                                    defaultValue={entry.amount_paid}
                                    onBlur={(e) => {
                                      const paid = Number(e.target.value);
                                      handleUpdateEntry(entry.id, {
                                        amount_paid: paid,
                                        amount_remaining: (entry.total_price || 0) - paid
                                      });
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2] text-[11px] font-black text-[#EE5D50] text-right">${(entry.amount_remaining || 0).toLocaleString()}</td>
                                <td className="px-4 py-3 border-r border-[#E0E5F2]">
                                  <select
                                    className="w-full bg-transparent outline-none text-[10px] font-black uppercase text-[#1B2559] focus:bg-[#F4F7FE] rounded py-1 px-1 transition-all"
                                    value={entry.doctor_id || ""}
                                    onChange={(e) => handleUpdateEntry(entry.id, { doctor_id: e.target.value })}
                                  >
                                    <option value="">Select Dentist</option>
                                    {staff.filter(s => s.role === 'Doctor').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    className="w-full bg-transparent outline-none text-[10px] font-black uppercase text-[#19D5C5] focus:bg-[#F4F7FE] rounded py-1 px-1 transition-all"
                                    value={entry.cashier_id || ""}
                                    onChange={(e) => handleUpdateEntry(entry.id, { cashier_id: e.target.value })}
                                  >
                                    <option value="">Select Staff</option>
                                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                                </td>
                              </tr>
                            ))}

                            {/* Add New Patient Row */}
                            <tr className="hover:bg-primary/5 cursor-pointer transition-all border-b border-[#E0E5F2] group" onClick={handleInitializeManualRow}>
                              {dayEntries.length === 0 ? (
                                <>
                                  <td className="px-4 py-5 border-r border-[#E0E5F2] text-center" />
                                </>
                              ) : null}
                              <td colSpan={dayEntries.length === 0 ? 1 : 2} className="px-4 py-5 border-r border-[#E0E5F2] text-center">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-sm">
                                  <Plus className="w-5 h-5 text-primary" />
                                </div>
                              </td>
                              <td colSpan={11} className="px-8 py-5">
                                <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em] group-hover:pl-2 transition-all">Register New Entry for {format(date, 'MMMM dd, yyyy')}</span>
                              </td>
                            </tr>

                            {/* Daily Summary Row */}
                            <tr className="bg-[#FFF8F8] font-black border-t-2 border-[#FFE8E8]">
                              <td colSpan={7} className="px-6 py-4 text-right text-[11px] text-[#EE5D50] uppercase tracking-[0.3em] font-black border-r border-transparent">Daily Financial Summary</td>
                              <td className="border-r border-[#EE5D50]/10" />
                              <td colSpan={2} className="px-6 py-4 text-right text-[14px] text-[#EE5D50] border-r border-[#E0E5F2] shadow-inner font-black">${dayUSD.toLocaleString()}</td>
                              <td colSpan={3} className="px-6 py-4 text-right text-[14px] text-[#EE5D50] font-black bg-[#FFEEED]/30">{dayKHR.toLocaleString()} KHR</td>
                            </tr>
                            {/* Buffer row to prevent dropdown clipping */}
                            <tr className="h-40 pointer-events-none border-none">
                              <td colSpan={13} className="border-none" />
                            </tr>
                          </>
                        );
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Stream / List View with Minimized/Maximized behavior */
          <div className="bg-white border border-[#E0E5F2] rounded-[1.5rem] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 md:p-6 flex items-center justify-between border-b border-[#F4F7FE]">
              <div className="flex items-center gap-4">
                <h2 className="h2-premium">Session Roster</h2>
                <div className="h-4 w-px bg-[#E0E5F2]" />
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3AED0]" />
                  <input
                    type="text"
                    placeholder="Find on this day..."
                    className="bg-[#F4F7FE] border-none rounded-2xl pl-10 pr-4 py-2 text-[10px] font-black w-48 md:w-64 focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-[#A3AED0] uppercase tracking-widest"
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#A3AED0] font-bold relative">
                <div className="relative">
                  <button
                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                    className={cn(
                      "p-2 rounded-lg transition-all border",
                      activeFilter !== 'none' ? "bg-primary/10 border-primary/20 text-primary" : "hover:bg-[#F4F7FE] border-transparent"
                    )}
                  >
                    <Filter className="w-4 h-4" />
                  </button>

                  {isFilterMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white border border-[#E0E5F2] rounded-2xl shadow-xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 py-2 text-[8px] font-black text-[#A3AED0] uppercase tracking-widest border-b border-[#F4F7FE] mb-1">
                          Filter Roster
                        </div>
                        <button
                          onClick={() => { setActiveFilter('none'); setIsFilterMenuOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                            activeFilter === 'none' ? "bg-primary text-white" : "hover:bg-[#F4F7FE] text-[#1B2559]"
                          )}
                        >
                          Default (All Recorded)
                        </button>
                        <button
                          onClick={() => { setActiveFilter('expensive'); setIsFilterMenuOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all mt-1",
                            activeFilter === 'expensive' ? "bg-primary text-white" : "hover:bg-[#F4F7FE] text-[#1B2559]"
                          )}
                        >
                          Most Expensive First
                        </button>
                        <button
                          onClick={() => { setActiveFilter('unpaid'); setIsFilterMenuOpen(false); }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all mt-1",
                            activeFilter === 'unpaid' ? "bg-primary text-white" : "hover:bg-[#F4F7FE] text-[#1B2559]"
                          )}
                        >
                          Pending Balances Only
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
              <table className="w-full text-left ledger-table">
                <thead>
                  <tr className="border-b border-[#F4F7FE] sticky top-0 bg-white z-10">
                    <th className="w-[50px] text-center py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">#</th>
                    <th className="min-w-[180px] py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">Client Identity</th>
                    <th className="w-[100px] text-center py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">Age/Sex</th>
                    <th className="min-w-[220px] py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">Procedure Architecture</th>
                    <th className="text-right w-[100px] py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">Valuation</th>
                    <th className="text-right w-[100px] py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">Payment</th>
                    <th className="text-center w-[120px] py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest bg-white">Settlement</th>
                    <th className="w-[60px] bg-white"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F7FE]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-24 text-[#A3AED0] font-black uppercase tracking-widest animate-pulse">Synchronizing Session Data...</td>
                    </tr>
                  ) : groupedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-24">
                        <div className="flex flex-col items-center gap-4 opacity-30">
                          <History className="w-16 h-16 text-[#A3AED0]" />
                          <p className="text-sm font-black text-[#1B2559] uppercase tracking-[0.2em]">Zero Activity Encoded</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    (groupedEntries as any[]).map((group, idx) => {
                      const isExpanded = expandedGroups.includes(group.id);
                      return (
                        <React.Fragment key={group.id}>
                          {/* MINIMIZED ROW (The Parent) */}
                          <tr
                            onClick={() => {
                              const params = new URLSearchParams();
                              const docId = (group as any).treatments?.[0]?.doctor_id;
                              if (docId) params.set('doctor', docId);
                              router.push(`/patients/${group.patientId}${params.toString() ? '?' + params.toString() : ''}`);
                            }}
                            className={cn(
                              "group cursor-pointer hover:bg-primary/5 transition-all outline-none",
                              isExpanded ? "bg-[#F4F7FE]" : "bg-white"
                            )}
                          >
                            <td className="text-center">
                              <span className="text-[10px] font-black text-[#A3AED0]">{idx + 1}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-[#F4F7FE] flex items-center justify-center text-primary font-black shadow-inner border border-[#E0E5F2] text-xs">
                                  {group.patient?.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-black text-[#1B2559] text-sm leading-none group-hover:text-primary transition-colors">{group.patient?.name}</p>
                                  <p className="text-[8px] text-[#A3AED0] font-black uppercase tracking-widest mt-1 flex items-center gap-1.5">
                                    ID: {group.patientId.slice(0, 8)}
                                    <span className="w-1 h-1 rounded-full bg-[#E0E5F2]" />
                                    {group.treatments.length} Procedure{group.treatments.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="text-center">
                              <div className="inline-flex bg-[#F4F7FE] px-2 py-1 rounded-lg border border-[#E0E5F2]/50">
                                <span className="text-[9px] font-black text-[#1B2559] uppercase tracking-tighter">{group.patient?.gender} / {group.patient?.age}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col gap-0.5">
                                {group.treatments.slice(0, 1).map((t: any) => (
                                  <div key={t.id} className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20 shrink-0" />
                                    <span className="text-[11px] font-bold text-[#1B2559] truncate max-w-[200px]">{t.treatments?.name || t.description}</span>
                                  </div>
                                ))}
                                {group.treatments.length > 1 && (
                                  <span className="text-[8px] font-black text-primary uppercase tracking-widest pl-3.5">
                                    + {group.treatments.length - 1} more items
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-right py-3 font-bold text-[#1B2559] text-sm">${group.totalVal.toFixed(2)}</td>
                            <td className="text-right py-3 font-black text-success text-sm">${group.totalPaid.toFixed(2)}</td>
                            <td className="text-center py-3">
                              <div className="inline-flex items-center gap-1.5 bg-primary/5 text-primary px-3 py-1 rounded-full border border-primary/10">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest">{group.method || 'ABA Bank'}</span>
                              </div>
                            </td>
                            <td className="text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroup(group.id);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg hover:bg-secondary/20 transition-all",
                                  isExpanded ? "rotate-180 text-primary bg-primary/5" : "text-[#A3AED0]"
                                )}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* MAXIMIZED VIEW (Detailed rows) */}
                          {isExpanded && group.treatments.map((entry: any, tIdx: number) => (
                            <tr key={entry.id} className="bg-[#FBFCFF] border-l-4 border-primary">
                              <td className="text-center py-2 opacity-0 border-r border-[#F4F7FE]">{tIdx + 1}</td>
                              <td colSpan={2} className="px-6 py-2 border-r border-[#F4F7FE]">
                                <div className="flex items-center gap-2 text-[#A3AED0]">
                                  <div className="w-1 h-1 rounded-full bg-primary" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">DR. {entry.doctor?.name || 'Dentist'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-[#1B2559]">{entry.treatments?.name || entry.description}</span>
                                  <span className="text-[8px] font-medium text-[#A3AED0]">Qty: {entry.quantity} @ ${entry.unit_price}</span>
                                </div>
                              </td>
                              <td className="text-right py-2 font-bold text-[#1B2559] border-l border-[#F4F7FE]/50 text-xs">${Number(entry.total_price).toFixed(2)}</td>
                              <td className="text-right py-2 font-bold text-success text-xs">${Number(entry.amount_paid).toFixed(2)}</td>
                              <td className="text-center py-2" colSpan={2}>
                                <div className="flex items-center justify-center gap-2">
                                  <select
                                    className={cn(
                                      "text-[9px] font-black px-2 py-1 rounded-lg border border-transparent uppercase tracking-widest cursor-pointer hover:scale-105 transition-all text-center outline-none",
                                      entry.method === 'ABA' ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-500"
                                    )}
                                    value={entry.method || ""}
                                    onChange={(e) => updateEntryMethod(entry.id, e.target.value)}
                                  >
                                    <option value="ABA">ABA Bank</option>
                                    <option value="CASH">Cash</option>
                                  </select>
                                  <button
                                    onClick={() => setManagedEntry(entry)}
                                    className="text-[8px] font-black text-primary hover:underline uppercase tracking-widest"
                                  >
                                    Manage
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      }


      {/* Daily Status Bar */}
      <div
        className={cn(
          "fixed bottom-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-[#E0E5F2] h-20 md:h-22 flex items-center justify-between px-8 md:px-12 z-[95] shadow-[0_-20px_60px_rgba(0,0,0,0.1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isCollapsed ? "left-20" : "left-72",
          (showSummary && viewMode !== 'calendar') ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="flex items-center gap-20">
          <div className="flex flex-col">
            <span className="text-[9px] text-[#A3AED0] uppercase font-black tracking-[0.2em] mb-1 leading-none">Daily Realization</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-[#1B2559] tracking-tighter">${totalRealized.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-lg whitespace-nowrap">Daily Status</span>
            </div>
          </div>
          <div className="h-12 w-px bg-[#E0E5F2]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-[#A3AED0] uppercase font-black tracking-[0.2em] mb-1 leading-none">Equipped KHR</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-black text-primary tracking-tighter">{khrCashIntake.toLocaleString('en-KH')}</span>
              <span className="text-[9px] font-black opacity-30 uppercase tracking-widest ml-1">KHR</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 md:gap-10">
          <div className="hidden lg:flex flex-col items-end">
            <span className="text-[9px] text-[#A3AED0] uppercase font-black tracking-[0.1em] mb-2">Goal Projection</span>
            <div className="w-48 h-2.5 bg-[#F4F7FE] rounded-full overflow-hidden border border-[#E0E5F2]/50 shadow-inner p-0.5">
              <div
                className="h-full bg-gradient-to-r from-primary to-[#3311DB] rounded-full shadow-[0_0_15px_rgba(67,24,255,0.4)] transition-all duration-1000"
                style={{ width: '68%' }}
              />
            </div>
          </div>
          <button className="bg-[#1B2559] text-white px-8 md:px-12 py-3.5 md:py-4 rounded-2xl text-[10px] font-black hover:bg-black hover:scale-[1.05] active:scale-95 transition-all uppercase tracking-[0.2em] shadow-2xl shadow-[#1B2559]/30">
            Submit Daily Ledger
          </button>
        </div>
      </div>

      {/* Modals & Popovers */}
      {
        isAddingEntry && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/30 p-4 animate-in fade-in duration-300">
            <div className="bg-white border-2 border-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />

              <button
                onClick={() => setIsAddingEntry(false)}
                className="absolute top-8 right-8 p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Plus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1B2559] tracking-tight">Create Patient</h3>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-[#F4F7FE] border-none rounded-xl px-12 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                      placeholder="e.g. Som Seng"
                      value={quickPatient.name}
                      onChange={(e) => setQuickPatient({ ...quickPatient, name: e.target.value })}
                    />
                    <Search className="w-4 h-4 text-[#A3AED0] absolute left-5 top-1/2 -translate-y-1/2" />

                    {/* High-Density Search Results Dropdown */}
                    {intakeResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-2xl shadow-xl z-[210] overflow-hidden p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                          <div className="px-3 py-2 text-[8px] font-black text-[#A3AED0] uppercase tracking-widest border-b border-[#F4F7FE] mb-1">
                            Existing Patient Matches
                          </div>
                          {intakeResults.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => router.push(`/patients/${p.id}`)}
                              className="w-full flex items-center justify-between p-3 hover:bg-[#F4F7FE] rounded-xl transition-all group text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                                  {p.name[0]}
                                </div>
                                <div>
                                  <div className="text-xs font-black text-[#1B2559] group-hover:text-primary transition-colors">{p.name}</div>
                                  <div className="text-[8px] text-[#A3AED0] font-bold uppercase tracking-widest mt-0.5">
                                    {p.gender} · {p.age} Yrs · {p.phone || 'No Phone'}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[8px] font-black text-primary bg-primary/5 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                OPEN RECORDS
                              </div>
                            </button>
                          ))}
                          <div className="p-2 border-t border-[#F4F7FE] mt-1">
                            <button
                              onClick={() => setIntakeResults([])}
                              className="w-full py-2.5 rounded-xl bg-primary text-white text-[9px] font-black uppercase tracking-widest hover:bg-[#3311DB] transition-all shadow-lg shadow-primary/10"
                            >
                              Proceed as New Patient "{quickPatient.name}"
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Contact Phone</label>
                    <input
                      type="text"
                      className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                      placeholder="012 345 678"
                      value={quickPatient.phone}
                      onChange={(e) => setQuickPatient({ ...quickPatient, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">DOB (DD/MM/YYYY)</label>
                    <input
                      type="text"
                      className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                      placeholder="15/05/1995"
                      value={quickPatient.dob}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, '');
                        if (val.length > 2) val = val.slice(0, 2) + '/' + val.slice(2);
                        if (val.length > 5) val = val.slice(0, 5) + '/' + val.slice(5, 9);
                        if (val.length > 10) val = val.slice(0, 10);
                        setQuickPatient({ ...quickPatient, dob: val });
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Gender</label>
                  <div className="flex p-1.5 bg-[#F4F7FE] rounded-2xl gap-2">
                    <button
                      onClick={() => setQuickPatient({ ...quickPatient, gender: 'F' })}
                      className={cn(
                        "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        quickPatient.gender === 'F' ? "bg-white text-primary shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]"
                      )}
                    >
                      Female
                    </button>
                    <button
                      onClick={() => setQuickPatient({ ...quickPatient, gender: 'M' })}
                      className={cn(
                        "flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        quickPatient.gender === 'M' ? "bg-white text-primary shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]"
                      )}
                    >
                      Male
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Dentist</label>
                  <select
                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
                    value={quickPatient.doctor_id || ""}
                    onChange={(e) => setQuickPatient({ ...quickPatient, doctor_id: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!quickPatient.name || !quickPatient.phone) {
                    alert("Minimum identity required: Name & Phone.");
                    return;
                  }

                  let calculatedAge = 0;
                  let dobDate = null;
                  if (quickPatient.dob.includes('/')) {
                    const parts = quickPatient.dob.split('/');
                    if (parts.length === 3) {
                      dobDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                      const birthDate = new Date(dobDate);
                      const today = new Date();
                      calculatedAge = today.getFullYear() - birthDate.getFullYear();
                      const m = today.getMonth() - birthDate.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        calculatedAge--;
                      }
                    }
                  }

                  const { data, error } = await supabase
                    .from('patients')
                    .insert({
                      name: quickPatient.name,
                      phone: quickPatient.phone,
                      age: calculatedAge || 0,
                      gender: quickPatient.gender,
                      dob: dobDate,
                      branch_id: currentBranch?.id
                    })
                    .select()
                    .single();

                  if (!error && data) {
                    router.push(`/patients/${data.id}`);
                  } else {
                    console.error("Error creating quick profile:", error);
                    alert("Failed to initialize profile. Error: " + (error?.message || "Unknown error"));
                  }
                }}
                className="w-full bg-primary hover:bg-[#3311DB] text-white py-5 rounded-[1.5rem] text-xs font-black transition-all shadow-xl shadow-primary/25 uppercase tracking-[0.2em]"
              >
                Create Profile
              </button>
            </div>
          </div>
        )
      }

      {/* Managed Entry (Edit) */}
      {
        managedEntry && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#1B2559]/60 p-4 animate-in fade-in duration-300">
            {/* ... Similar Modal with Edit Logic ... */}
            <div className="bg-white rounded-[3rem] w-full max-w-md p-12 space-y-8 relative border border-white">
              <button onClick={() => setManagedEntry(null)} className="absolute top-10 right-10 text-[#A3AED0]"><X className="w-6 h-6" /></button>
              <div className="flex flex-col items-center text-center gap-4">
                <div className="p-6 rounded-[2rem] bg-primary/10 text-primary shadow-inner"><Activity className="w-10 h-10" /></div>
                <div>
                  <h3 className="text-2xl font-black text-[#1B2559]">Secure Adjustment</h3>
                  <p className="text-xs font-bold text-[#A3AED0] uppercase tracking-widest">{managedEntry.patients?.name || 'Client Engagement'}</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#707EAE] uppercase tracking-widest pl-1">Total Intake ($)</label>
                  <input
                    type="number"
                    className="w-full bg-[#F4F7FE] border-none rounded-2xl px-6 py-4 text-2xl font-black text-success outline-none"
                    defaultValue={managedEntry.amount_paid}
                    onBlur={(e) => {
                      const val = Number(e.target.value);
                      handleUpdateEntry(managedEntry.id, {
                        amount_paid: val,
                        amount_remaining: Number(managedEntry.total_price) - val
                      });
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => voidTreatment(managedEntry)} className="bg-destructive/10 text-destructive py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-destructive hover:text-white transition-all">Void Record</button>
                  <button onClick={() => setManagedEntry(null)} className="bg-[#1B2559] text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Commit</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Undo Layer */}
      {
        undoItem && (
          <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-12 duration-500">
            <div className="bg-[#1B2559] text-white shadow-2xl rounded-[3rem] px-12 py-7 flex items-center gap-12 border border-white/20">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-destructive shadow-inner">
                  <Trash2 className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xl font-black tracking-tighter leading-none text-white">Record Purged</p>
                  <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black mt-2">Buffer active for 6 seconds</p>
                </div>
              </div>
              <button
                onClick={handleUndo}
                className="bg-primary hover:bg-[#3311DB] text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 transition-all hover:scale-105 active:scale-95"
              >
                Emergency Restore
              </button>
            </div>
          </div>
        )
      }
      {/* Google Calendar Style Quick Event Modal - Light Mode & Relative Position */}
      {
        isQuickEventOpen && (
          <>
            {/* Transparent Backdrop to close on click outside */}
            <div
              className="fixed inset-0 z-[299] bg-transparent"
              onClick={() => setIsQuickEventOpen(false)}
            />

            <div
              className="fixed z-[300] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 p-8 w-[420px] animate-in fade-in zoom-in-95 duration-200 font-sans max-h-[min(650px,90vh)] overflow-y-auto custom-scrollbar"
              style={{ top: modalPosition.top, left: modalPosition.left }}
            >
              <div className="space-y-8">
                {/* Patient Name / Title Input with Icon */}
                <div className="flex items-center gap-4">
                  <User className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 relative group border-b border-gray-100 focus-within:border-blue-600 transition-all pb-1.5 flex items-center">
                    <input
                      type="text"
                      placeholder="Patient Name"
                      className="w-full text-2xl font-semibold text-gray-800 placeholder:text-gray-300 border-none focus:ring-0 p-0 bg-transparent tracking-tight"
                      autoFocus
                      value={quickEventData.patientName}
                      onChange={(e) => {
                        setQuickEventData({ ...quickEventData, patientName: e.target.value });
                        setQuickPatient({ ...quickPatient, name: e.target.value });
                      }}
                    />
                    {/* Search Results & Force New Option */}
                    {quickEventData.patientName.length > 1 && !quickEventData.patientId && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                        <div className="max-h-[220px] overflow-y-auto custom-scrollbar">
                          {intakeResults.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setQuickEventData({
                                  ...quickEventData,
                                  patientId: p.id,
                                  patientName: p.name
                                });
                                setIntakeResults([]);
                                setIsIntakeSearching(false);
                              }}
                              className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between group/item border-b border-gray-50 last:border-0"
                            >
                              <div>
                                <span className="text-sm font-semibold text-gray-700 block">{p.name}</span>
                                <span className="text-[10px] text-gray-400">{p.gender} · {p.age}y · {p.phone}</span>
                              </div>
                              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium opacity-0 group-hover/item:opacity-100 transition-opacity">Select</span>
                            </button>
                          ))}

                          <button
                            onClick={() => {
                              // Close Quick Event and open "Create Patient" modal
                              setIsQuickEventOpen(false);
                              setQuickPatient({
                                ...quickPatient,
                                name: quickEventData.patientName,
                                phone: "",
                                dob: "",
                                gender: "F",
                                doctor_id: ""
                              });
                              setIsAddingEntry(true);
                              setIntakeResults([]);
                              setIsIntakeSearching(false);
                            }}
                            className="w-full px-4 py-3 text-left bg-gray-50/50 hover:bg-blue-50/50 flex items-center gap-3 text-blue-600 font-medium transition-colors border-t border-gray-100"
                          >
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-bold text-blue-600">+</span>
                            </div>
                            <span className="text-sm">Create new "{quickEventData.patientName}"</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Treatment Selection Row */}
              <div className="flex items-center gap-4">
                <Stethoscope className="w-5 h-5 text-gray-400" />
                <div className="flex-1 relative">
                  <div className="flex-1 border-b border-gray-100 focus-within:border-blue-600 transition-all pb-1.5 flex items-center">
                    <input
                      type="text"
                      placeholder="Search Treatment (Optional)"
                      className="w-full text-sm font-medium text-gray-700 placeholder:text-gray-300 border-none focus:ring-0 p-0 bg-transparent"
                      value={treatmentSearch}
                      onChange={(e) => setTreatmentSearch(e.target.value)}
                      onFocus={() => {
                        if (treatmentSearch.length === 0) {
                          // Optionally show all or just wait for type
                        }
                      }}
                    />
                    {quickEventData.treatmentId && (
                      <button
                        onClick={() => {
                          setQuickEventData({ ...quickEventData, treatmentId: "", duration: 15 });
                          setTreatmentSearch("");
                        }}
                        className="text-gray-300 hover:text-gray-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {treatmentSearch.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5">
                      <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                        {treatments
                          .filter(t => t.name.toLowerCase().includes(treatmentSearch.toLowerCase()))
                          .map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                setQuickEventData({
                                  ...quickEventData,
                                  treatmentId: t.id,
                                  duration: t.duration_minutes || 15
                                });
                                setTreatmentSearch(t.name);
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors border-b border-gray-50 last:border-0"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{t.name}</span>
                                <span className="text-[10px] text-gray-400">{t.duration_minutes || 15}m</span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date / Time / Duration Row */}
              <div className="flex items-start gap-4">
                <Clock className="w-5 h-5 text-gray-400 mt-2.5" />
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    {/* Date Pill */}
                    <div className="flex-1 h-11 bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl border border-transparent hover:border-gray-200 flex items-center">
                      <DatePicker
                        value={quickEventData.date}
                        onChange={(d) => setQuickEventData({ ...quickEventData, date: format(d, 'yyyy-MM-dd') })}
                        placeholder="Select Date"
                        className="w-full bg-transparent border-none text-sm font-medium text-gray-700 px-3 focus:ring-0 cursor-pointer"
                      />
                    </div>

                    {/* Start Time Dropdown */}
                    <div className="relative w-[130px] h-11 text-center">
                      <div
                        className="h-full bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl border border-transparent hover:border-gray-200 px-3 flex items-center justify-between cursor-pointer"
                        onClick={() => {
                          document.getElementById('time-dropdown')?.classList.toggle('hidden');
                        }}
                      >
                        <span className="text-sm font-medium text-gray-700">
                          {format(new Date(`2000-01-01T${quickEventData.time}:00`), 'h:mm a')}
                        </span>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </div>

                      <div
                        id="time-dropdown"
                        className="absolute top-full left-0 mt-2 w-full bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden hidden max-h-[180px] overflow-y-auto custom-scrollbar ring-1 ring-black/5"
                      >
                        {timeIntervals.map(t => (
                          <button
                            key={t}
                            onClick={() => {
                              setQuickEventData({ ...quickEventData, time: t });
                              document.getElementById('time-dropdown')?.classList.add('hidden');
                            }}
                            className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 text-gray-600 hover:text-gray-900 transition-colors"
                          >
                            {format(new Date(`2000-01-01T${t}:00`), 'h:mm a')}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Dentist Select - Premium "Pillar" Look */}
              <div className="flex items-center gap-4">
                <Activity className="w-5 h-5 text-gray-400" />
                <div className="relative flex-1">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)] z-10" />
                  <select
                    className="w-full h-11 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-blue-200 rounded-xl px-9 text-sm font-semibold text-gray-700 focus:ring-0 outline-none appearance-none cursor-pointer transition-all focus:bg-white focus:border-blue-500/30 shadow-sm"
                    value={quickEventData.doctorId}
                    onChange={(e) => setQuickEventData({ ...quickEventData, doctorId: e.target.value })}
                  >
                    <option value="" disabled>Select Dentist</option>
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-gray-50/50">
                <button
                  onClick={() => setIsQuickEventOpen(false)}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveQuickEvent}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            </div>
          </>
        )
      }

      {/* Floating Bottom Button (Intelligence vs Filter) */}
      <button
        onClick={() => {
          if (viewMode === 'list') {
            setShowSummary(!showSummary);
          } else {
            setIsDoctorFilterOpen(!isDoctorFilterOpen);
          }
        }}
        className={cn(
          "fixed bottom-8 z-[100] p-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all duration-500 active:scale-95 group flex items-center gap-0 hover:gap-3 px-4 hover:px-6 overflow-hidden",
          isCollapsed ? "left-[calc(50%+40px)]" : "left-[calc(50%+144px)]",
          "-translate-x-1/2",
          (viewMode === 'list' ? showSummary : isDoctorFilterOpen)
            ? "bg-[#6366F1] text-white"
            : "bg-white text-[#6366F1] hover:bg-gray-50 underline-offset-4"
        )}
      >
        <div className="relative">
          {viewMode === 'calendar' ? (
            <Filter className={cn(
              "w-6 h-6 transition-transform duration-500",
              "group-hover:scale-110"
            )} />
          ) : (
            <Activity className={cn(
              "w-6 h-6 transition-transform duration-500",
              "group-hover:scale-110"
            )} />
          )}
          {viewMode === 'calendar' && doctorFilter.length > 0 && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          )}
        </div>
        <span className="max-w-0 group-hover:max-w-[200px] opacity-0 group-hover:opacity-100 transition-all duration-500 whitespace-nowrap text-[10px] font-black uppercase tracking-widest leading-none">
          {viewMode === 'calendar' ? 'Filter Dentists' : 'Daily Insights'}
        </span>
      </button>

      {/* Doctor Filter Modal (Calendar Only) */}
      {
        isDoctorFilterOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/10 z-[400] transition-all"
              onClick={() => setIsDoctorFilterOpen(false)}
            />
            <div
              className={cn(
                "fixed bottom-28 z-[401] bg-white rounded-[2.5rem] shadow-[0_30px_70px_rgba(0,0,0,0.3)] border border-gray-100 p-8 w-[380px] animate-in slide-in-from-bottom-5 duration-500 ease-out font-sans",
                isCollapsed ? "left-[calc(50%+40px)]" : "left-[calc(50%+144px)]",
                "-translate-x-1/2"
              )}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[#1B2559]">Filter by Dentist</h3>
                <button
                  onClick={() => setDoctorFilter([])}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-3">
                {staff.map(member => (
                  <label key={member.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer border border-transparent transition-all overflow-hidden group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={doctorFilter.includes(member.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDoctorFilter([...doctorFilter, member.id]);
                        } else {
                          setDoctorFilter(doctorFilter.filter(id => id !== member.id));
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">{member.name}</p>
                      <p className="text-[10px] text-gray-400 tracking-wider">DENTIST</p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setIsDoctorFilterOpen(false)}
                className="w-full mt-6 bg-[#1B2559] text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/10 active:scale-95 transition-all"
              >
                Show Results
              </button>
            </div>
          </>
        )
      }

      {/* Calendar Search Overlay */}
      {
        isCalendarSearchOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/5 backdrop-blur-[2px] z-[500]"
              onClick={() => setIsCalendarSearchOpen(false)}
            />
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[501] w-[500px] animate-in slide-in-from-top-5 duration-300">
              <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-4 ring-1 ring-black/5">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-2xl border border-transparent focus-within:bg-white focus-within:border-blue-500/30 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search appointments by patient name..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
                    autoFocus
                    onChange={(e) => setCalendarSearchQuery(e.target.value)}
                  />
                  <button onClick={() => setIsCalendarSearchOpen(false)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>

                {calendarSearchQuery.length > 1 && (
                  <div className="mt-4 max-h-[400px] overflow-y-auto custom-scrollbar px-2 pb-2">
                    {isSearching ? (
                      <div className="p-12 text-center text-[10px] font-black text-[#A3AED0] uppercase tracking-widest animate-pulse">
                        Searching Patient Directory...
                      </div>
                    ) : globalSearchResults.length > 0 ? (
                      globalSearchResults.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setIsCalendarSearchOpen(false);
                            router.push(`/patients/${p.id}`);
                          }}
                          className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-all group border border-transparent hover:border-gray-100"
                        >
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-lg">
                            {p.name[0]}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-black text-[#1B2559] truncate group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {p.gender} · {p.age} Yrs · {p.phone || 'No Contact'}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[#A3AED0] opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))
                    ) : (
                      <div className="p-12 text-center opacity-40">
                        <div className="flex flex-col items-center gap-3">
                          <History className="w-12 h-12 text-[#A3AED0]" />
                          <p className="text-[10px] font-black text-[#1B2559] uppercase tracking-widest">No Patient Profiles Found</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )
      }
      {/* Custom Month Selector Modal */}
      {
        isMonthSelectorOpen && (
          <>
            <div className="fixed inset-0 z-[100] bg-[#1B2559]/20 backdrop-blur-sm" onClick={() => setIsMonthSelectorOpen(false)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-[2rem] shadow-2xl z-[101] border border-[#E0E5F2] p-8 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-[#1B2559] tracking-tight">Timeline Selection</h3>
                <button
                  onClick={() => setIsMonthSelectorOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-[#EE5D50] transition-colors"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Year Selector */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em]">Deployment Year</p>
                  <div className="flex items-center justify-between bg-[#F4F7FE] p-1.5 rounded-2xl border border-[#E0E5F2]">
                    <button
                      onClick={() => {
                        const next = new Date(date);
                        next.setFullYear(date.getFullYear() - 1);
                        setDate(next);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-primary hover:bg-primary hover:text-white transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-2xl font-black text-[#1B2559] tracking-tighter">{date.getFullYear()}</span>
                    <button
                      onClick={() => {
                        const next = new Date(date);
                        next.setFullYear(date.getFullYear() + 1);
                        setDate(next);
                      }}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-primary hover:bg-primary hover:text-white transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Month Grid */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em]">Operational Month</p>
                  <div className="grid grid-cols-3 gap-2">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                      <button
                        key={m}
                        onClick={() => {
                          const next = new Date(date);
                          next.setMonth(idx);
                          setDate(next);
                          setIsMonthSelectorOpen(false);
                        }}
                        className={cn(
                          "py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border",
                          date.getMonth() === idx
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                            : "bg-white text-[#1B2559] border-[#E0E5F2] hover:border-primary/50 hover:bg-[#F4F7FE]"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-[#F4F7FE]">
                <button
                  onClick={() => {
                    setDate(new Date());
                    setIsMonthSelectorOpen(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#F4F7FE] text-[11px] font-black text-[#1B2559] uppercase tracking-[0.2em] hover:bg-[#1B2559] hover:text-white transition-all"
                >
                  Reset to Today
                </button>
              </div>
            </div>
          </>
        )
      }
    </div >
  );
}

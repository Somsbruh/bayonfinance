"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
  UserPlus,
  Clock,
  CheckCircle2,
  FileText
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfDay, addMinutes } from "date-fns";
import { useRouter } from "next/navigation";
import DatePicker from "@/components/DatePicker";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PatientSearch from "@/components/PatientSearch";
import DailyReportModal from "@/components/DailyReportModal";
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

let globalLedgerDate: Date | null = null;

export default function LedgerPage() {
  const { currentBranch } = useBranch();
  const [date, setDate] = useState<Date>(globalLedgerDate || new Date());

  useEffect(() => {
    globalLedgerDate = date;
  }, [date]);

  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [monthEntries, setMonthEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [selectedEntryIdForIdentity, setSelectedEntryIdForIdentity] = useState<string | null>(null);
  const [selectedEntryIdForTreatment, setSelectedEntryIdForTreatment] = useState<string | null>(null);
  const [showProfileSuccess, setShowProfileSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'manual' | 'list' | 'calendar'>('manual');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [doctorFilter, setDoctorFilter] = useState<string[]>([]);
  const [calendarSearchQuery, setCalendarSearchQuery] = useState("");
  const [isDoctorFilterOpen, setIsDoctorFilterOpen] = useState(false);
  const [isCalendarSearchOpen, setIsCalendarSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'none' | 'expensive' | 'unpaid'>('none');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterMenuRect, setFilterMenuRect] = useState<DOMRect | null>(null);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [activeQtyDropdown, setActiveQtyDropdown] = useState<string | null>(null);
  const [qtyDropdownRect, setQtyDropdownRect] = useState<DOMRect | null>(null);

  const { isCollapsed, showSummary, setShowSummary } = useSidebar();
  const { usdToKhr } = useCurrency();
  const [treatments, setTreatments] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [activePricePrompt, setActivePricePrompt] = useState<{ entryId: string, itemId: string, name: string, type: 'treatment' | 'medicine', price?: string } | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [quickPatient, setQuickPatient] = useState({
    name: "",
    phone: "",
    dob: "",
    gender: "F" as "F" | "M",
    doctor_id: ""
  });
  const [quickTreatment, setQuickTreatment] = useState({ name: '', duration: 15, price: 0 });

  const [managedEntry, setManagedEntry] = useState<any>(null);
  const [undoItem, setUndoItem] = useState<any>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [paymentUndo, setPaymentUndo] = useState<{ entryId: string, prev: any } | null>(null);
  const [paymentUndoTimer, setPaymentUndoTimer] = useState<NodeJS.Timeout | null>(null);
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
  const [activeStaffDropdown, setActiveStaffDropdown] = useState<{ groupKey: string, type: 'doctor' | 'cashier' } | null>(null);
  const [activePaymentDropdown, setActivePaymentDropdown] = useState<string | null>(null);
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
    if (!currentBranch) return;

    const { data: treatmentsData } = await supabase.from('treatments').select('*').eq('branch_id', currentBranch.id);
    if (treatmentsData) setTreatments(treatmentsData);

    const { data: inventoryData } = await supabase.from('inventory').select('*').eq('branch_id', currentBranch.id);
    if (inventoryData) setInventory(inventoryData);

    const { data: staffData } = await supabase.from('staff').select('*').eq('branch_id', currentBranch.id);
    if (staffData) {
      setStaff(staffData);
      if (staffData.length > 0) setQuickPatient(prev => ({ ...prev, doctor_id: "" }));
    }
  }

  // Auto-Catalog Logic Removed - Replaced with Interactive Modal
  // New Interactive Modal Logic handled via isAddingTreatment state
  // The original fetchStaticData had this line, which is now moved to the new fetchStaticData
  // if (sData.length > 0) setQuickPatient(prev => ({ ...prev, doctor_id: "" }));


  async function fetchDailyEntries() {
    setIsLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        patients (name, gender, age),
        treatments (name),
        inventory (name),
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
        inventory (name),
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
    : viewMode === 'manual'
      ? monthEntries.filter(e => e.date === format(date, 'yyyy-MM-dd') && (doctorFilter.length === 0 || doctorFilter.includes(e.doctor_id)))
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
    setMonthEntries(prev => prev.filter(e => e.id !== entry.id));
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
      fetchMonthlyEntries();
      setUndoItem(null);
      setUndoTimer(null);
    }
  }

  async function handleUpdateEntry(id: string, updates: any) {
    const prevEntry = viewMode === 'list' ? entries.find(e => e.id === id) : monthEntries.find(e => e.id === id);

    if (viewMode === 'list') {
      setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    } else {
      setMonthEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }

    const { error } = await supabase.from('ledger_entries').update(updates).eq('id', id);

    if (!error) {
      setManagedEntry(null);
      // We no longer trigger a full data re-fetch directly. The local state update handles it instantly.

      // --- STOCK DEDUCTION LOGIC ---
      if (prevEntry) {
        const itemType = updates.item_type !== undefined ? updates.item_type : prevEntry.item_type;

        if (itemType === 'medicine') {
          const oldAmountRemaining = typeof prevEntry.amount_remaining === 'number' ? prevEntry.amount_remaining : Number(prevEntry.amount_remaining) || 0;
          const newAmountRemaining = updates.amount_remaining !== undefined ? Number(updates.amount_remaining) || 0 : oldAmountRemaining;

          const wasAlreadyPaid = oldAmountRemaining <= 0;
          const isNowPaid = newAmountRemaining <= 0;
          const inventoryId = updates.inventory_id !== undefined ? updates.inventory_id : prevEntry.inventory_id;
          const qty = updates.quantity !== undefined ? updates.quantity : (prevEntry.quantity || 1);

          if (isNowPaid && !wasAlreadyPaid && inventoryId) {
            // Medicine is fully paid just now. Deduct stock.
            const { data: invData } = await supabase.from('inventory').select('stock_level').eq('id', inventoryId).single();
            if (invData) {
              const newStock = Math.max((invData.stock_level || 0) - qty, 0);
              await supabase.from('inventory').update({ stock_level: newStock }).eq('id', inventoryId);
              fetchStaticData(); // refresh UI local state
            }
          }
        }
      }
      // ----------------------------

    } else {
      // Revert if error
      if (viewMode === 'list') {
        fetchDailyEntries();
      } else {
        fetchMonthlyEntries();
      }
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
      <div className="flex items-center justify-between w-full">
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

        <div className="flex items-center gap-3">
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

          {/* Daily Report Button */}
          <button
            onClick={() => setIsDailyReportOpen(true)}
            className="p-2.5 bg-[#19D5C5]/10 border border-[#19D5C5]/30 hover:border-[#19D5C5] rounded-xl text-[#19D5C5] hover:bg-[#19D5C5] hover:text-white transition-all shadow-sm group shrink-0"
            title="Daily Financial Report"
          >
            <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-7 animate-in fade-in slide-in-from-top-2 duration-500">
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
            </div>

            <div className="bg-white border border-[#E0E5F2] rounded-[1.5rem] shadow-sm">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse manual-spreadsheet">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#F4F7FE] border-b border-[#E0E5F2]">
                      <th className="px-4 py-2 border-r border-[#E0E5F2] w-12 text-center align-middle relative">
                        <div className="inline-flex items-center justify-center">
                          <button
                            className={cn("p-1.5 rounded-lg transition-colors cursor-pointer outline-none", isFilterMenuOpen ? "bg-white text-primary border border-primary/20 shadow-sm" : "hover:bg-white text-[#A3AED0] hover:text-primary")}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFilterMenuRect(rect);
                              setIsFilterMenuOpen(!isFilterMenuOpen);
                            }}
                          >
                            <Filter className="w-4 h-4" />
                          </button>
                          {isFilterMenuOpen && filterMenuRect && typeof window !== 'undefined' && createPortal(
                            <>
                              <div className="fixed inset-0 z-[80]" onClick={() => setIsFilterMenuOpen(false)} />
                              <div
                                className="fixed bg-white border border-[#E0E5F2] rounded-2xl shadow-xl z-[90] p-2 min-w-[200px] animate-in fade-in zoom-in-95 font-sans font-normal tracking-normal normal-case"
                                style={{ top: filterMenuRect.bottom + 8, left: filterMenuRect.left }}
                              >
                                <p className="px-4 py-3 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest border-b border-[#F4F7FE] text-left">Order By</p>
                                <button onClick={() => setIsFilterMenuOpen(false)} className="w-full text-left px-4 py-3 text-[10px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] rounded-xl transition-colors">Alphabetical (A-Z)</button>
                                <button onClick={() => setIsFilterMenuOpen(false)} className="w-full text-left px-4 py-3 text-[10px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] rounded-xl transition-colors">Amount (High to Low)</button>
                                <button onClick={() => setIsFilterMenuOpen(false)} className="w-full text-left px-4 py-3 text-[10px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] rounded-xl transition-colors">Balance Outstanding</button>
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </th>

                      <th className="px-2 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-12 text-center">No.</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2]">Patient</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2]">Medical Service</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-20 text-center">Price</th>
                      <th className="px-2 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-12 text-center">Qty</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-24 text-center">Total</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-24 text-center">Paid</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-24 text-center text-[#EE5D50]">Remaining</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase border-r border-[#E0E5F2] w-[120px] text-center">Dentist</th>
                      <th className="px-4 py-2 text-[10px] font-black text-[#1B2559] uppercase w-[120px] text-center">Cashier</th>
                    </tr>
                  </thead>
                  {isLoading ? (
                    <tbody className="divide-y divide-[#E0E5F2]">
                      <tr><td colSpan={12} className="py-24 text-center text-[10px] font-black text-[#A3AED0] uppercase tracking-widest animate-pulse">Synchronizing Ledger...</td></tr>
                    </tbody>
                  ) : (
                    (() => {
                      const selectedDayStr = format(date, 'yyyy-MM-dd');
                      const dayEntries = monthEntries.filter((e: any) => e.date === selectedDayStr);
                      const previousEntriesCount = monthEntries.filter((e: any) => e.date < selectedDayStr).length;

                      const dayUSD = dayEntries.reduce((sum: number, e: any) => sum + (Number(e.paid_aba) || 0) + (Number(e.paid_cash_usd) || 0), 0);
                      const dayKHR = dayEntries.reduce((sum: number, e: any) => sum + (Number(e.paid_cash_khr) || 0), 0);

                      return (
                        <>
                          {(() => {
                            // Group entries by patient for visual merging
                            const groupedEntries: { [key: string]: any[] } = {};
                            dayEntries.forEach(entry => {
                              // Create a unique key for the patient "visit"
                              // Use patient_id if available, otherwise manual name, otherwise unique ID (no grouping)
                              const key = entry.patient_id || entry.manual_patient_name || entry.id;
                              if (!groupedEntries[key]) {
                                groupedEntries[key] = [];
                              }
                              groupedEntries[key].push(entry);
                            });

                            // Convert to array and sort by created_at of the first entry
                            const sortedGroups = Object.values(groupedEntries).sort((a, b) => {
                              return new Date(a[0].created_at).getTime() - new Date(b[0].created_at).getTime();
                            });

                            let globalIndex = 0; // For sequential numbering across groups if needed, or just use group index?
                            // User likely wants 1 number per patient visit. So we number the GROUPS.

                            return sortedGroups.map((group, groupIndex) => {
                              const firstEntry = group[0];

                              return (
                                <tbody key={groupIndex} className="group/visit divide-y divide-[#E0E5F2]">
                                  {group.map((entry, entryIndex) => {
                                    const isFirstOfGroup = entryIndex === 0;

                                    return (
                                      <tr key={entry.id} className="group-hover/visit:bg-[#F4F7FE]/50 transition-colors border-b border-[#E0E5F2] group">
                                        {/* Checkbox - Merged */}
                                        {isFirstOfGroup && (
                                          <td rowSpan={group.length} className="px-3 py-3 border-r border-[#E0E5F2] text-center w-[40px]">
                                            <input
                                              type="checkbox"
                                              className="rounded border-[#A3AED0] text-primary focus:ring-primary w-3.5 h-3.5"
                                              checked={selectedEntries.includes(entry.id)} // Selects the primary entry? Or should selecting one select all?
                                              // For now, let's keep it simple: Select strictly by ID. 
                                              // Ideally, selecting the group header selects all. 
                                              // Let's implement: Click selects ALL in group.
                                              onChange={(e) => {
                                                const ids = group.map(g => g.id);
                                                if (e.target.checked) {
                                                  setSelectedEntries(prev => [...prev, ...ids]);
                                                } else {
                                                  setSelectedEntries(prev => prev.filter(id => !ids.includes(id)));
                                                }
                                              }}
                                            />
                                          </td>
                                        )}

                                        {/* No. - Merged */}
                                        {isFirstOfGroup && (
                                          <td rowSpan={group.length} className="px-3 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#A3AED0] text-center w-[40px] group-hover:text-primary transition-colors">
                                            {groupIndex + 1}
                                          </td>
                                        )}

                                        {/* Patient Name + Gender/Age - Merged */}
                                        {isFirstOfGroup && (
                                          <td rowSpan={group.length} className="px-4 py-1.5 border-r border-[#E0E5F2] align-middle">
                                            <div className="flex items-center gap-3 w-full max-w-[260px]">
                                              <div
                                                className="w-8 h-8 rounded-full bg-[#E2E8F0] flex flex-col items-center justify-end shrink-0 overflow-hidden shadow-sm cursor-pointer border border-[#cbd5e1]"
                                                onClick={() => { if (firstEntry.patient_id) router.push(`/patients/${firstEntry.patient_id}`); }}
                                              >
                                                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[85%] h-[85%] text-[#94A3B8]">
                                                  <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" fill="currentColor" />
                                                  <path d="M12 13C7.58172 13 4 16.5817 4 21H20C20 16.5817 16.4183 13 12 13Z" fill="currentColor" />
                                                </svg>
                                              </div>
                                              <div className="min-w-[120px] w-full relative">
                                                <input
                                                  data-patient-input={firstEntry.id}
                                                  className={cn(
                                                    "w-full bg-transparent outline-none focus:bg-[#F4F7FE] px-1 py-0.5 rounded transition-all text-[11px] font-bold placeholder:text-[#A3AED0]/70",
                                                    firstEntry.patient_id ? "text-[#1B2559] group-hover:text-primary cursor-pointer hover:underline decoration-[2px] underline-offset-4" : "text-[#1B2559]"
                                                  )}
                                                  placeholder="Search Patient..."
                                                  value={activePatientLookup && activePatientLookup.id === firstEntry.id ? activePatientLookup.query : (firstEntry.patients?.name || firstEntry.manual_patient_name || "")}
                                                  onChange={(e) => setActivePatientLookup({ id: firstEntry.id, query: e.target.value })}
                                                  onFocus={() => setActivePatientLookup({ id: firstEntry.id, query: firstEntry.patients?.name || firstEntry.manual_patient_name || "" })}
                                                  onBlur={() => setTimeout(() => setActivePatientLookup(null), 200)}
                                                  onClick={() => { if (firstEntry.patient_id) window.open(`/patients/${firstEntry.patient_id}`, '_blank'); }}
                                                />
                                                <div className="flex items-center gap-1.5 px-1 uppercase tracking-widest text-[#1B2559] mt-0.5">
                                                  <span className="text-[9px] font-bold">{firstEntry.patients?.gender === 'Male' ? 'M' : firstEntry.patients?.gender === 'Female' ? 'F' : firstEntry.manual_gender || '—'}</span>
                                                  <span className="text-[9px] text-[#1B2559] opacity-80 font-bold px-0.5">•</span>
                                                  <span className="text-[9px] font-bold">{firstEntry.patients?.age || firstEntry.manual_age || '—'} YRS</span>
                                                </div>
                                              </div>
                                            </div>
                                            {/* (Patient Lookup Dropdown via Portal) */}
                                            {activePatientLookup?.id === firstEntry.id && (() => {
                                              const inputEl = document.querySelector(`[data-patient-input="${firstEntry.id}"]`);
                                              const rect = inputEl?.getBoundingClientRect();
                                              if (!rect) return null;
                                              return createPortal(
                                                <div
                                                  className="fixed bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150"
                                                  style={{ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width + 60, 250) }}
                                                >
                                                  {patientSearchResults.map(p => (
                                                    <button
                                                      key={p.id}
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        group.forEach(g => {
                                                          handleUpdateEntry(g.id, {
                                                            patient_id: p.id,
                                                            manual_patient_name: p.name,
                                                            manual_gender: p.gender,
                                                            manual_age: p.age
                                                          });
                                                        });
                                                        setActivePatientLookup(null);
                                                      }}
                                                      className="w-full text-left px-4 py-3 hover:bg-[#F4F7FE] flex flex-col gap-0.5 border-b border-[#F4F7FE] last:border-0 transition-all"
                                                    >
                                                      <span className="text-[11px] font-black text-[#1B2559]">{p.name}</span>
                                                      <div className="flex items-center gap-2 text-[9px] font-bold text-[#A3AED0]">
                                                        <span>{p.phone}</span>
                                                        <span className="w-1 h-1 rounded-full bg-[#E0E5F2]" />
                                                        <span>{p.gender}</span>
                                                      </div>
                                                    </button>
                                                  ))}
                                                  {activePatientLookup?.query && (
                                                    <button
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setQuickPatient({ ...quickPatient, name: activePatientLookup?.query || "" });
                                                        setSelectedEntryIdForIdentity(firstEntry.id);
                                                        setIsAddingEntry(true);
                                                        setActivePatientLookup(null);
                                                      }}
                                                      className="w-full text-left px-4 py-3 bg-primary/5 hover:bg-primary/10 text-primary transition-colors flex items-center gap-2"
                                                    >
                                                      <UserPlus className="w-3.5 h-3.5" />
                                                      <span className="text-[10px] font-black uppercase tracking-widest">New: {activePatientLookup?.query}</span>
                                                    </button>
                                                  )}
                                                </div>,
                                                document.body
                                              );
                                            })()}
                                          </td>
                                        )}

                                        {/* Gender & Age removed - now shown inline under Patient Name */}

                                        {/* Treatment - INDIVIDUAL with Add/Delete buttons */}
                                        <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#1B2559]">
                                          <div className="flex items-center gap-1">
                                            <input
                                              ref={(el) => { if (el && activeTreatmentLookup?.id === entry.id) el.setAttribute('data-treatment-input', entry.id); }}
                                              className="flex-1 bg-transparent outline-none focus:bg-[#F4F7FE] px-1 rounded-lg transition-all"
                                              placeholder="Select Treatment..."
                                              value={(activeTreatmentLookup && activeTreatmentLookup.id === entry.id) ? activeTreatmentLookup.query : (entry.description || entry.treatments?.name || entry.inventory?.name || "")}
                                              onChange={(e) => setActiveTreatmentLookup({ id: entry.id, query: e.target.value })}
                                              onFocus={() => setActiveTreatmentLookup({ id: entry.id, query: entry.description || entry.treatments?.name || entry.inventory?.name || "" })}
                                              onBlur={() => {
                                                setTimeout(() => setActiveTreatmentLookup(null), 200);
                                              }}
                                            />
                                            {/* Add + Delete buttons on hover */}
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                              <button
                                                onClick={() => handleDuplicateRow(firstEntry)}
                                                className="p-1 hover:bg-primary/10 rounded-md transition-all"
                                                title="Add treatment"
                                              >
                                                <Plus className="w-3 h-3 text-primary" />
                                              </button>
                                              <button
                                                onClick={() => voidTreatment(entry)}
                                                className="p-1 hover:bg-[#EE5D50]/10 rounded-md transition-all"
                                                title="Delete treatment"
                                              >
                                                <Trash2 className="w-3 h-3 text-[#EE5D50]" />
                                              </button>
                                            </div>
                                          </div>
                                          {/* Treatment dropdown rendered via portal */}
                                          {activeTreatmentLookup?.id === entry.id && (() => {
                                            const inputEl = document.querySelector(`[data-treatment-input="${entry.id}"]`);
                                            const rect = inputEl?.getBoundingClientRect();
                                            if (!rect) return null;

                                            const searchStr = activeTreatmentLookup?.query?.toLowerCase() || "";
                                            const filteredTreatments = treatments.filter(t => t.name.toLowerCase().includes(searchStr))
                                              .map(t => ({ ...t, item_type: 'treatment' }));
                                            const filteredInventory = inventory.filter(i => i.name.toLowerCase().includes(searchStr))
                                              .map(i => ({ ...i, item_type: 'medicine', price: i.sell_price || 0 }));

                                            const combinedOptions = [...filteredTreatments, ...filteredInventory];

                                            return createPortal(
                                              <div
                                                className="fixed bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1 max-h-[160px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2"
                                                style={{
                                                  top: rect.bottom + 8,
                                                  left: rect.left,
                                                  width: Math.max(rect.width + 100, 280),
                                                }}
                                              >
                                                {combinedOptions.map(t => (
                                                  <button
                                                    key={t.item_type + t.id}
                                                    onMouseDown={(e) => {
                                                      e.preventDefault();
                                                      if (t.price === 0) {
                                                        setActivePricePrompt({ entryId: entry.id, itemId: t.id, name: t.name, type: t.item_type as 'treatment' | 'medicine' });
                                                        setActiveTreatmentLookup(null);
                                                      } else {
                                                        const updateData: any = {
                                                          description: t.name,
                                                          unit_price: t.price,
                                                          item_type: t.item_type,
                                                          total_price: t.price * (entry.quantity || 1),
                                                        };
                                                        if (t.item_type === 'treatment') {
                                                          updateData.treatment_id = t.id;
                                                          updateData.inventory_id = null;
                                                        } else {
                                                          updateData.inventory_id = t.id;
                                                          updateData.treatment_id = null;
                                                        }
                                                        updateData.amount_remaining = (entry.amount_remaining || 0) + ((t.price * (entry.quantity || 1)) - (entry.total_price || 0));
                                                        handleUpdateEntry(entry.id, updateData);
                                                        setActiveTreatmentLookup(null);
                                                      }
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-[#F4F7FE] text-[10px] font-black text-[#1B2559] flex justify-between items-center transition-colors border-b border-[#F4F7FE] last:border-0"
                                                  >
                                                    <div className="flex items-center gap-2">
                                                      <span>{t.name}</span>
                                                      {t.item_type === 'treatment' ? (
                                                        <span className="text-[8px] font-black uppercase bg-[#19D5C5]/10 text-[#19D5C5] px-1.5 py-0.5 rounded-md tracking-widest">TRT</span>
                                                      ) : (
                                                        <span className="text-[8px] font-black uppercase bg-[#FFB547]/10 text-[#FFB547] px-1.5 py-0.5 rounded-md tracking-widest">MED</span>
                                                      )}
                                                    </div>
                                                    <span className="text-primary font-black">${t.price}</span>
                                                  </button>
                                                ))}
                                                {activeTreatmentLookup?.query && combinedOptions.length === 0 && (
                                                  <div className="flex flex-col border-t border-[#E0E5F2]">
                                                    <button
                                                      onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setQuickTreatment({ name: activeTreatmentLookup.query, duration: 15, price: 0 });
                                                        setSelectedEntryIdForTreatment(entry.id);
                                                        setIsAddingTreatment(true);
                                                        setActiveTreatmentLookup(null);
                                                      }}
                                                      className="w-full text-left px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary transition-colors flex items-center gap-2 border-b border-[#F4F7FE]"
                                                    >
                                                      <Plus className="w-3.5 h-3.5" />
                                                      <span className="text-[9px] font-black uppercase tracking-widest">Add as Treatment</span>
                                                    </button>
                                                    <button
                                                      onMouseDown={async (e) => {
                                                        e.preventDefault();
                                                        if (!currentBranch) return;
                                                        const name = activeTreatmentLookup.query;
                                                        const { data } = await supabase.from('inventory').insert({
                                                          name,
                                                          category: 'Uncategorized',
                                                          stock_level: 0,
                                                          sell_price: 0,
                                                          branch_id: currentBranch.id
                                                        }).select().single();
                                                        if (data) {
                                                          setInventory(prev => [...prev, data]);
                                                          setActivePricePrompt({ entryId: entry.id, itemId: data.id, name: data.name, type: 'medicine' });
                                                        }
                                                        setActiveTreatmentLookup(null);
                                                      }}
                                                      className="w-full text-left px-4 py-2 bg-[#FFB547]/5 hover:bg-[#FFB547]/10 text-[#FFB547] transition-colors flex items-center gap-2"
                                                    >
                                                      <Plus className="w-3.5 h-3.5" />
                                                      <span className="text-[9px] font-black uppercase tracking-widest">Add as Medicine</span>
                                                    </button>
                                                  </div>
                                                )}
                                              </div>,
                                              document.body
                                            );
                                          })()}
                                        </td>


                                        <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#1B2559] text-center">
                                          <div className="flex items-center justify-center w-full group/input relative text-[#1B2559] gap-[1px]">
                                            <span className="text-[11px] font-bold pointer-events-none transition-transform duration-200 group-hover/input:-translate-x-1">$</span>
                                            <input
                                              type="text"
                                              inputMode="numeric"
                                              style={{ width: `${Math.max(String(entry.unit_price ?? '').length, 1)}ch` }}
                                              className={cn(
                                                "bg-transparent outline-none focus:bg-[#F4F7FE] rounded transition-transform duration-200 text-left font-bold p-0",
                                                "group-hover/input:translate-x-1 inline-block"
                                              )}
                                              value={entry.unit_price}
                                              onChange={(e) => {
                                                const up = Number(e.target.value.replace(/[^0-9.]/g, ''));
                                                handleUpdateEntry(entry.id, {
                                                  unit_price: up,
                                                  total_price: up * (entry.quantity || 1),
                                                  amount_remaining: (entry.amount_remaining || 0) + ((up * (entry.quantity || 1)) - (entry.total_price || 0))
                                                });
                                              }}
                                            />
                                          </div>
                                        </td>

                                        {/* Qty - INDIVIDUAL (Custom Dropdown) */}
                                        <td className="px-2 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#A3AED0] text-center bg-[#F4F7FE]/5 relative">
                                          <button
                                            data-qty-btn={entry.id}
                                            onClick={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setQtyDropdownRect(rect);
                                              setActiveQtyDropdown(activeQtyDropdown === entry.id ? null : entry.id);
                                            }}
                                            className="w-full text-center text-[10px] font-black uppercase text-[#1B2559] hover:bg-[#F4F7FE] rounded-lg py-1.5 px-2 transition-all group/qty relative flex items-center justify-center overflow-hidden"
                                          >
                                            <span className="text-[13px] font-black text-[#1B2559] transition-transform duration-200 block z-10 group-hover/qty:-translate-x-2">
                                              {entry.quantity || 1}
                                            </span>
                                            <ChevronDown className="w-2.5 h-2.5 text-[#A3AED0] opacity-0 group-hover/qty:opacity-100 transition-all duration-200 absolute right-1/2 translate-x-3" />
                                          </button>
                                          {activeQtyDropdown === entry.id && qtyDropdownRect && createPortal(
                                            <>
                                              {/* Backdrop */}
                                              <div className="fixed inset-0 z-[9998]" onClick={() => setActiveQtyDropdown(null)} />
                                              {/* Dropdown */}
                                              <div
                                                className="fixed z-[9999] bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                                                style={{
                                                  top: qtyDropdownRect.bottom + 4,
                                                  left: qtyDropdownRect.left + qtyDropdownRect.width / 2 - 40,
                                                  width: 80,
                                                  maxHeight: 260,
                                                  overflowY: 'auto'
                                                }}
                                              >
                                                <div className="py-1">
                                                  {Array.from({ length: 50 }, (_, i) => i + 1).map(qty => (
                                                    <button
                                                      key={qty}
                                                      onClick={() => {
                                                        handleUpdateEntry(entry.id, {
                                                          quantity: qty,
                                                          total_price: qty * (entry.unit_price || 0),
                                                          amount_remaining: (entry.amount_remaining || 0) + ((qty * (entry.unit_price || 0)) - (entry.total_price || 0))
                                                        });
                                                        setActiveQtyDropdown(null);
                                                      }}
                                                      className={cn(
                                                        "w-full text-center py-2 text-[11px] font-black transition-colors",
                                                        (entry.quantity || 1) === qty
                                                          ? "bg-primary text-white"
                                                          : "text-[#1B2559] hover:bg-[#F4F7FE]"
                                                      )}
                                                    >
                                                      {qty}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            </>,
                                            document.body
                                          )}
                                        </td>

                                        {/* Total / Paid / Remaining - MERGED per visit */}
                                        {
                                          isFirstOfGroup && (() => {
                                            const groupTotal = group.reduce((sum, g) => sum + (g.total_price || 0), 0);
                                            const groupPaid = group.reduce((sum, g) => sum + (g.amount_paid || 0), 0);
                                            const groupRemaining = groupTotal - groupPaid;
                                            return (
                                              <>
                                                <td rowSpan={group.length} className="px-4 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#1B2559] text-center bg-[#F4F7FE]/10 align-middle">
                                                  ${groupTotal.toLocaleString()}
                                                </td>
                                                <td rowSpan={group.length} className="px-4 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#19D5C5] text-center align-middle">
                                                  <button
                                                    data-payment-trigger={firstEntry.id}
                                                    onClick={() => setActivePaymentDropdown(prev => prev === firstEntry.id ? null : firstEntry.id)}
                                                    className="w-full text-center hover:bg-[#F4F7FE] rounded-lg py-1 px-2 transition-all font-bold text-[#19D5C5] cursor-pointer"
                                                  >
                                                    {groupPaid > 0 ? `$${groupPaid.toLocaleString()}` : <span className="text-[#A3AED0]">$0</span>}
                                                  </button>
                                                  {activePaymentDropdown === firstEntry.id && (() => {
                                                    const triggerEl = document.querySelector(`[data-payment-trigger="${firstEntry.id}"]`);
                                                    const rect = triggerEl?.getBoundingClientRect();
                                                    if (!rect) return null;

                                                    const groupAba = group.reduce((s, g) => s + (Number(g.paid_aba) || 0), 0);
                                                    const groupCashUsd = group.reduce((s, g) => s + (Number(g.paid_cash_usd) || 0), 0);
                                                    const groupCashKhr = group.reduce((s, g) => s + (Number(g.paid_cash_khr) || 0), 0);

                                                    const applyPayment = (field: 'paid_aba' | 'paid_cash_usd' | 'paid_cash_khr', value: number) => {
                                                      const exchangeRate = Number(firstEntry.applied_exchange_rate) || 4100;
                                                      // Capture previous state for undo
                                                      const prevState = {
                                                        paid_aba: Number(firstEntry.paid_aba) || 0,
                                                        paid_cash_usd: Number(firstEntry.paid_cash_usd) || 0,
                                                        paid_cash_khr: Number(firstEntry.paid_cash_khr) || 0,
                                                        amount_paid: Number(firstEntry.amount_paid) || 0,
                                                        amount_remaining: Number(firstEntry.amount_remaining) || 0,
                                                      };
                                                      const updates: any = { [field]: value };
                                                      // Recalc total paid for this entry (convert KHR to USD)
                                                      const newAba = field === 'paid_aba' ? value : prevState.paid_aba;
                                                      const newCashUsd = field === 'paid_cash_usd' ? value : prevState.paid_cash_usd;
                                                      const newCashKhr = field === 'paid_cash_khr' ? value : prevState.paid_cash_khr;
                                                      const khrInUsd = Math.round((newCashKhr / exchangeRate) * 100) / 100;
                                                      const totalPaidOnFirst = newAba + newCashUsd + khrInUsd;

                                                      // Add or subtract from the existing remaining amount based on payment difference
                                                      const paymentDiff = totalPaidOnFirst - prevState.amount_paid;

                                                      updates.amount_paid = totalPaidOnFirst;
                                                      updates.amount_remaining = prevState.amount_remaining - paymentDiff;
                                                      handleUpdateEntry(firstEntry.id, updates);
                                                      // Set undo
                                                      if (paymentUndoTimer) clearTimeout(paymentUndoTimer);
                                                      setPaymentUndo({ entryId: firstEntry.id, prev: prevState });
                                                      const timer = setTimeout(() => { setPaymentUndo(null); setPaymentUndoTimer(null); }, 6000);
                                                      setPaymentUndoTimer(timer);
                                                    };

                                                    return createPortal(
                                                      <>
                                                        <div className="fixed inset-0 z-[9998]" onClick={() => setActivePaymentDropdown(null)} />
                                                        <div
                                                          className="fixed bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[9999] p-4 w-[240px] animate-in fade-in slide-in-from-top-2 duration-150"
                                                          style={{ top: rect.bottom + 4, left: rect.left - 80 }}
                                                        >

                                                          {/* ABA */}
                                                          <div className="mb-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <div className="w-2 h-2 rounded-full bg-[#4318FF]" />
                                                              <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">ABA Bank</span>
                                                            </div>
                                                            <div className="relative">
                                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#A3AED0]">$</span>
                                                              <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-7 pr-3 py-2 text-[11px] font-black text-[#4318FF] outline-none focus:border-[#4318FF]/30 text-right"
                                                                defaultValue={groupAba || ''}
                                                                onBlur={(e) => applyPayment('paid_aba', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                              />
                                                            </div>
                                                          </div>

                                                          {/* Cash USD */}
                                                          <div className="mb-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <div className="w-2 h-2 rounded-full bg-[#19D5C5]" />
                                                              <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Cash USD</span>
                                                            </div>
                                                            <div className="relative">
                                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#A3AED0]">$</span>
                                                              <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-7 pr-3 py-2 text-[11px] font-black text-[#19D5C5] outline-none focus:border-[#19D5C5]/30 text-right"
                                                                defaultValue={groupCashUsd || ''}
                                                                onBlur={(e) => applyPayment('paid_cash_usd', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                              />
                                                            </div>
                                                          </div>

                                                          {/* Cash KHR */}
                                                          <div className="mb-2">
                                                            <div className="flex items-center gap-2 mb-1">
                                                              <div className="w-2 h-2 rounded-full bg-[#FFB547]" />
                                                              <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Cash KHR</span>
                                                            </div>
                                                            <div className="relative">
                                                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#A3AED0]">៛</span>
                                                              <input
                                                                type="text"
                                                                inputMode="numeric"
                                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-7 pr-3 py-2 text-[11px] font-black text-[#FFB547] outline-none focus:border-[#FFB547]/30 text-right"
                                                                defaultValue={groupCashKhr || ''}
                                                                onBlur={(e) => applyPayment('paid_cash_khr', Number(e.target.value.replace(/[^0-9.]/g, '')) || 0)}
                                                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                                              />
                                                            </div>
                                                          </div>

                                                          {/* Divider + Remaining */}
                                                          {(() => {
                                                            const exchangeRate = Number(firstEntry.applied_exchange_rate) || 4100;
                                                            const khrRemaining = Math.round(groupRemaining * exchangeRate);
                                                            return (
                                                              <div className="border-t border-[#E0E5F2] pt-2 mt-3 flex justify-between items-center">
                                                                <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Remaining</span>
                                                                <div className="text-right">
                                                                  <span className={`text-[12px] font-black ${groupRemaining > 0 ? 'text-[#EE5D50]' : 'text-[#19D5C5]'}`}>${groupRemaining.toLocaleString()}</span>
                                                                  {groupRemaining > 0 && (
                                                                    <p className="text-[9px] font-bold text-[#A3AED0] mt-0.5">ឬ ៛{khrRemaining.toLocaleString()}</p>
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
                                                <td rowSpan={group.length} className="px-4 py-1.5 border-r border-[#E0E5F2] text-[11px] font-bold text-[#EE5D50] text-center align-middle">
                                                  <div className="flex items-center justify-center w-full group/input relative text-[#EE5D50] gap-[1px]">
                                                    <span className="text-[11px] font-bold pointer-events-none transition-transform duration-200 group-hover/input:-translate-x-1">$</span>
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      style={{ width: `${Math.max(String(firstEntry.amount_remaining ?? '').length, 1)}ch` }}
                                                      className={cn(
                                                        "bg-transparent outline-none focus:bg-[#F4F7FE] border border-transparent focus:border-[#E0E5F2] rounded-lg transition-transform duration-200 text-left font-bold p-0",
                                                        "group-hover/input:translate-x-1 text-[#EE5D50] inline-block"
                                                      )}
                                                      value={firstEntry.amount_remaining ?? ''}
                                                      onChange={(e) => {
                                                        const newRemaining = Number(e.target.value.replace(/[^0-9.]/g, ''));
                                                        handleUpdateEntry(firstEntry.id, {
                                                          amount_remaining: newRemaining
                                                        });
                                                      }}
                                                    />
                                                  </div>
                                                </td>
                                              </>
                                            );
                                          })()
                                        }

                                        {/* Doctor - Merged */}
                                        {
                                          isFirstOfGroup && (
                                            <td rowSpan={group.length} className="px-4 py-1.5 align-middle border-r border-[#E0E5F2]">
                                              <button
                                                data-staff-trigger={`doctor-${firstEntry.id}`}
                                                onClick={() => setActiveStaffDropdown(prev => prev?.groupKey === firstEntry.id && prev?.type === 'doctor' ? null : { groupKey: firstEntry.id, type: 'doctor' })}
                                                className="w-full text-center text-[10px] font-bold uppercase text-[#1B2559] hover:bg-[#F4F7FE] rounded-lg py-1 px-2 transition-all group/btn relative flex items-center justify-center overflow-hidden"
                                              >
                                                <span className={cn(
                                                  "transition-transform duration-200 block z-10",
                                                  firstEntry.doctor_id ? 'text-[#1B2559]' : 'text-[#A3AED0]',
                                                  "group-hover/btn:-translate-x-2"
                                                )}>
                                                  {firstEntry.doctor_id ? (staff.find(s => s.id === firstEntry.doctor_id)?.name || 'Unknown') : 'Select'}
                                                </span>
                                                <ChevronDown className="w-3 h-3 text-[#A3AED0] opacity-0 group-hover/btn:opacity-100 transition-all duration-200 absolute right-1/2 translate-x-12" />
                                              </button>
                                              {activeStaffDropdown?.groupKey === firstEntry.id && activeStaffDropdown?.type === 'doctor' && (() => {
                                                const triggerEl = document.querySelector(`[data-staff-trigger="doctor-${firstEntry.id}"]`);
                                                const rect = triggerEl?.getBoundingClientRect();
                                                if (!rect) return null;
                                                return createPortal(
                                                  <>
                                                    <div className="fixed inset-0 z-[9998]" onClick={() => setActiveStaffDropdown(null)} />
                                                    <div
                                                      className="fixed bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1 max-h-[200px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150"
                                                      style={{ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) }}
                                                    >
                                                      {staff.filter(s => s.role === 'Doctor').map(s => (
                                                        <button
                                                          key={s.id}
                                                          onClick={() => {
                                                            group.forEach(g => handleUpdateEntry(g.id, { doctor_id: s.id }));
                                                            setActiveStaffDropdown(null);
                                                          }}
                                                          className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wide flex items-center gap-2.5 transition-colors border-b border-[#F4F7FE] last:border-0 ${firstEntry.doctor_id === s.id ? 'bg-[#F4F7FE] text-[#4318FF]' : 'text-[#1B2559] hover:bg-[#F4F7FE]'
                                                            }`}
                                                        >
                                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${firstEntry.doctor_id === s.id ? 'bg-[#4318FF]' : 'bg-[#A3AED0]'
                                                            }`}>
                                                            {s.name?.charAt(0)}
                                                          </div>
                                                          {s.name}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </>,
                                                  document.body
                                                );
                                              })()}
                                            </td>
                                          )
                                        }

                                        {/* Cashier - Merged */}
                                        {
                                          isFirstOfGroup && (
                                            <td rowSpan={group.length} className="px-4 py-1.5 align-middle border-r border-[#E0E5F2]">
                                              <button
                                                data-staff-trigger={`cashier-${firstEntry.id}`}
                                                onClick={() => setActiveStaffDropdown(prev => prev?.groupKey === firstEntry.id && prev?.type === 'cashier' ? null : { groupKey: firstEntry.id, type: 'cashier' })}
                                                className="w-full text-center text-[10px] font-bold uppercase text-[#19D5C5] hover:bg-[#F4F7FE] rounded-lg py-1 px-2 transition-all group/btn relative flex items-center justify-center overflow-hidden"
                                              >
                                                <span className={cn(
                                                  "transition-transform duration-200 block z-10",
                                                  firstEntry.cashier_id ? 'text-[#19D5C5]' : 'text-[#A3AED0]',
                                                  "group-hover/btn:-translate-x-2"
                                                )}>
                                                  {firstEntry.cashier_id ? (staff.find(s => s.id === firstEntry.cashier_id)?.name || 'Unknown') : 'Select'}
                                                </span>
                                                <ChevronDown className="w-3 h-3 text-[#A3AED0] opacity-0 group-hover/btn:opacity-100 transition-all duration-200 absolute right-1/2 translate-x-12" />
                                              </button>
                                              {activeStaffDropdown?.groupKey === firstEntry.id && activeStaffDropdown?.type === 'cashier' && (() => {
                                                const triggerEl = document.querySelector(`[data-staff-trigger="cashier-${firstEntry.id}"]`);
                                                const rect = triggerEl?.getBoundingClientRect();
                                                if (!rect) return null;
                                                return createPortal(
                                                  <>
                                                    <div className="fixed inset-0 z-[9998]" onClick={() => setActiveStaffDropdown(null)} />
                                                    <div
                                                      className="fixed bg-white border border-[#E0E5F2] rounded-2xl shadow-2xl z-[9999] overflow-hidden py-1 max-h-[200px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-150"
                                                      style={{ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 160) }}
                                                    >
                                                      {staff.filter(s => s.role === 'Receptionist').map(s => (
                                                        <button
                                                          key={s.id}
                                                          onClick={() => {
                                                            group.forEach(g => handleUpdateEntry(g.id, { cashier_id: s.id }));
                                                            setActiveStaffDropdown(null);
                                                          }}
                                                          className={`w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-wide flex items-center gap-2.5 transition-colors border-b border-[#F4F7FE] last:border-0 ${firstEntry.cashier_id === s.id ? 'bg-[#F4F7FE] text-[#19D5C5]' : 'text-[#1B2559] hover:bg-[#F4F7FE]'
                                                            }`}
                                                        >
                                                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white ${firstEntry.cashier_id === s.id ? 'bg-[#19D5C5]' : 'bg-[#A3AED0]'
                                                            }`}>
                                                            {s.name?.charAt(0)}
                                                          </div>
                                                          {s.name}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  </>,
                                                  document.body
                                                );
                                              })()}
                                            </td>
                                          )
                                        }
                                      </tr >
                                    );
                                  })}
                                </tbody>
                              );
                            });
                          })()}

                          <tbody className="divide-y divide-[#E0E5F2]">
                            {/* Persistent Blank Add Row */}
                            <tr
                              className="h-8 hover:bg-[#F4F7FE]/60 bg-[#F4F7FE]/30 cursor-text transition-all border-b border-[#E0E5F2] group"
                              onClick={handleInitializeManualRow}
                            >
                              <td className="px-3 py-1.5 border-r border-[#E0E5F2] text-center w-[40px]"></td>
                              <td className="px-3 py-1.5 border-r border-[#E0E5F2] text-center w-[40px] text-[#A3AED0]/50"><Plus className="w-4 h-4 mx-auto group-hover:text-primary transition-colors" /></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2]"><span className="text-[11px] font-bold text-[#A3AED0]/50">Enter Patient...</span></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2]"><span className="text-[10px] font-bold uppercase text-[#A3AED0]/50 tracking-widest">Select Treatment</span></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-center"><span className="text-[11px] font-bold text-[#A3AED0]/50">$0</span></td>
                              <td className="px-2 py-1.5 border-r border-[#E0E5F2] text-center"><span className="text-[10px] font-bold text-[#A3AED0]/50">1</span></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-center"><span className="text-[11px] font-bold text-[#A3AED0]/50">$0</span></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-center"><span className="text-[11px] font-bold text-[#A3AED0]/50">$0</span></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-center"><span className="text-[11px] font-bold text-[#A3AED0]/50">$0</span></td>
                              <td className="px-4 py-1.5 border-r border-[#E0E5F2] text-center"><span className="text-[10px] font-bold uppercase text-[#A3AED0]/50 tracking-widest">Select Dentist</span></td>
                              <td className="px-4 py-1.5 text-center"><span className="text-[10px] font-bold uppercase text-[#A3AED0]/50 tracking-widest">Select Cashier</span></td>
                            </tr>
                          </tbody>

                          {/* Daily Summary Row Removed - scope is covered by top cards */}
                        </>
                      );
                    })()
                  )}
                </table>
              </div>
            </div>
          </div >
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
                onClick={() => {
                  setIsAddingEntry(false);
                  setShowProfileSuccess(false);
                  setSelectedEntryIdForIdentity(null);
                }}
                className="absolute top-8 right-8 p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Plus className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1B2559] tracking-tight">
                    {showProfileSuccess ? "Profile Secured" : "Create Patient"}
                  </h3>
                </div>
              </div>

              {showProfileSuccess ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center text-success shadow-inner animate-in fade-in slide-in-from-bottom-4">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-[#1B2559] uppercase tracking-widest">Registration Complete</p>
                    <p className="text-[10px] font-bold text-[#A3AED0] mt-1 uppercase">Identity linked to ledger row</p>
                  </div>
                </div>
              ) : (
                <>
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
                        <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">DOB (Day / Month / Year)</label>
                        <DatePicker
                          value={quickPatient.dob ? (() => {
                            const parts = quickPatient.dob.split('/');
                            if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                            return undefined;
                          })() : undefined}
                          onChange={(d) => setQuickPatient({ ...quickPatient, dob: format(d, 'dd/MM/yyyy') })}
                          placeholder="Select Birth Date"
                          format="dd/MM/yyyy"
                          triggerClassName="bg-[#F4F7FE] border-none rounded-xl h-[52px]"
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
                      if (quickPatient.dob && quickPatient.dob.includes('/')) {
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
                        if (selectedEntryIdForIdentity) {
                          await handleUpdateEntry(selectedEntryIdForIdentity, {
                            patient_id: data.id,
                            manual_patient_name: data.name,
                            manual_gender: data.gender,
                            manual_age: data.age,
                            doctor_id: quickPatient.doctor_id
                          });
                        }
                        setShowProfileSuccess(true);
                        setTimeout(() => {
                          setIsAddingEntry(false);
                          setShowProfileSuccess(false);
                          setSelectedEntryIdForIdentity(null);
                        }, 1500);
                      } else {
                        console.error("Error creating quick profile:", error);
                        alert("Failed to initialize profile. Error: " + (error?.message || "Unknown error"));
                      }
                    }}
                    className="w-full bg-primary hover:bg-[#3311DB] text-white py-5 rounded-[1.5rem] text-xs font-black transition-all shadow-xl shadow-primary/25 uppercase tracking-[0.2em]"
                  >
                    Create Profile
                  </button>
                </>
              )}
            </div>
          </div>
        )
      }

      {/* Quick Treatment Modal (No Blur, Bottom-to-Middle Animation) */}
      {
        isAddingTreatment && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white border-2 border-[#E0E5F2] rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 space-y-8 relative overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-500">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />

              <button
                onClick={() => setIsAddingTreatment(false)}
                className="absolute top-8 right-8 p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-5">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary shadow-inner">
                  <Activity className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1B2559] tracking-tight">New Treatment</h3>
                  <p className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-widest">Add to Catalog</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Treatment Name</label>
                  <input
                    type="text"
                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                    placeholder="e.g. Root Canal"
                    value={quickTreatment.name}
                    onChange={(e) => setQuickTreatment({ ...quickTreatment, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Duration (Min)</label>
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                        placeholder="15"
                        value={quickTreatment.duration}
                        onChange={(e) => setQuickTreatment({ ...quickTreatment, duration: Number(e.target.value.replace(/[^0-9]/g, '')) })}
                      />
                      <Clock className="w-4 h-4 text-[#A3AED0] absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Price ($)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="w-full bg-[#F4F7FE] border-none rounded-xl px-5 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                      placeholder="0.00"
                      value={quickTreatment.price}
                      onChange={(e) => setQuickTreatment({ ...quickTreatment, price: Number(e.target.value.replace(/[^0-9.]/g, '')) })}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  if (!quickTreatment.name) return;

                  const { data, error } = await supabase
                    .from('treatments')
                    .insert({
                      name: quickTreatment.name,
                      price: quickTreatment.price,
                      duration_minutes: quickTreatment.duration,
                      category: 'Unassigned',
                      branch_id: currentBranch?.id
                    })
                    .select()
                    .single();

                  if (!error && data) {
                    setTreatments(prev => [...prev, data]);

                    if (selectedEntryIdForTreatment) {
                      await handleUpdateEntry(selectedEntryIdForTreatment, {
                        treatment_id: data.id,
                        description: data.name,
                        unit_price: data.price,
                        total_price: data.price * 1, // Default qty 1
                        amount_remaining: (data.price * 1) // Default unpaid
                      });
                    }

                    setIsAddingTreatment(false);
                    setQuickTreatment({ name: '', duration: 15, price: 0 });
                    setSelectedEntryIdForTreatment(null);
                  } else {
                    console.error("Error creating treatment:", error);
                    alert("Failed to create treatment.");
                  }
                }}
                className="w-full bg-primary hover:bg-[#3311DB] text-white py-5 rounded-[1.5rem] text-xs font-black transition-all shadow-xl shadow-primary/25 uppercase tracking-[0.2em]"
              >
                Create Treatment
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
                        amount_remaining: (managedEntry.amount_remaining || 0) - (val - (managedEntry.amount_paid || 0))
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

      {/* Undo Snackbar */}
      {
        (undoItem || paymentUndo) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-[#1B2559] text-white shadow-lg rounded-xl px-4 py-2.5 flex items-center gap-3">
              <span className="text-[11px] font-bold text-white/90">{undoItem ? 'Treatment deleted' : 'Payment updated'}</span>
              <button
                onClick={() => {
                  if (undoItem) {
                    handleUndo();
                  } else if (paymentUndo) {
                    if (paymentUndoTimer) clearTimeout(paymentUndoTimer);
                    handleUpdateEntry(paymentUndo.entryId, paymentUndo.prev);
                    setPaymentUndo(null);
                    setPaymentUndoTimer(null);
                  }
                }}
                className="text-[11px] font-black text-[#7B61FF] hover:text-white uppercase tracking-wider transition-colors"
              >
                Undo
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

      <DailyReportModal
        isOpen={isDailyReportOpen}
        onClose={() => setIsDailyReportOpen(false)}
        date={date}
        branchId={currentBranch?.id || ""}
      />
    </div >
  );
}

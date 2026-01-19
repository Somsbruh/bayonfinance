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
  ChevronDown
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
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
  Info
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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
      .eq('branch_id', currentBranch?.id)
      .eq('role', 'Doctor');
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
        patients (name),
        treatments (name)
      `)
      .eq('branch_id', currentBranch?.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true });

    if (!error && data) setMonthEntries(data);
    setIsLoading(false);
  }

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const delaySearch = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('ledger_entries')
            .select(`
                *,
                patients!inner(name, gender, age),
                treatments (name),
                doctor:staff!doctor_id (name)
              `)
            .eq('branch_id', currentBranch?.id)
            .ilike('patients.name', `%${searchQuery}%`)
            .order('date', { ascending: false });

          if (data) setSearchResults(data);
        } finally {
          setIsLoading(false);
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery]);

  // Stats - Dynamically switch based on view mode
  const currentEntries = searchQuery.length > 2 ? searchResults : (viewMode === 'list' ? entries : monthEntries);

  // Revised Intake Logic: Separate ABA, USD Cash, KHR Cash
  const abaIntake = currentEntries.reduce((acc, e) => acc + (Number(e.paid_aba) || 0), 0);
  const usdCashIntake = currentEntries.reduce((acc, e) => acc + (Number(e.paid_cash_usd) || 0), 0);
  const khrCashIntake = currentEntries.reduce((acc, e) => acc + (Number(e.paid_cash_khr) || 0), 0);

  // Total Realized in USD (Approximate)
  const rate = Number(usdToKhr) || 4100;
  const totalRealized = abaIntake + usdCashIntake + (khrCashIntake / rate);

  const totalValue = currentEntries.reduce((acc, e) => acc + (Number(e.total_price) || 0), 0);

  // Grouping Logic for List View (Minimized/Maximized)
  // Logic: Use searchResults if searching, otherwise use entries (Daily).
  // Note: Monthly View uses the Calendar Matrix, not this list.
  const sourceEntries = searchQuery.length > 2 ? searchResults : entries;

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
    }
  }

  if (!mounted) return null;

  return (
    <div className={cn(
      "relative transition-all",
      viewMode === 'list' ? "space-y-6 pb-24 block" : "flex flex-col h-[calc(100vh-3rem)] gap-4"
    )}>
      {/* High-Density Optimized Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-[#A3AED0] font-black text-[9px] uppercase tracking-[0.2em] leading-none">
              <Activity className="w-3 h-3" />
              Daily Status Portfolio
            </div>
            <h1 className="text-2xl font-black text-[#1B2559] tracking-tight whitespace-nowrap">Clinic Ledger</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggle - Compact */}
          <div className="bg-[#F4F7FE] p-1 rounded-xl border border-[#E0E5F2] flex items-center gap-1 shrink-0">
            {(['list', 'calendar'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  viewMode === v ? "bg-white text-primary shadow-sm border border-[#E0E5F2]" : "text-[#A3AED0] hover:text-[#1B2559]"
                )}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Date Picker - Ultra Compact */}
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
            <div className="px-3 min-w-[120px] text-center border-x border-[#F4F7FE]">
              <span className="font-bold text-xs text-[#1B2559]">
                {viewMode === 'calendar' ? format(date, 'MMM yyyy') : format(date, 'MMM do, yy')}
              </span>
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

          <button
            onClick={() => setIsAddingEntry(true)}
            className="bg-primary hover:bg-[#3311DB] text-white px-5 py-2.5 rounded-xl text-[9px] font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 group shrink-0 uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
            Quick Entry
          </button>
        </div>
      </div>

      {/* Modern Bento Grid Stats - Massive Density Gain */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Primary Stat Card */}
        <div className="md:col-span-4 bg-white border border-[#E0E5F2] rounded-[1.5rem] p-5 relative overflow-hidden group hover:border-primary/30 transition-all flex flex-col justify-between min-h-[140px]">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-24 h-24 rotate-12" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Realized Intake</p>
            <h2 className="text-3xl font-black text-[#1B2559] tracking-tighter">${totalRealized.toLocaleString(undefined, { maximumFractionDigits: 2 })}</h2>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-success font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> +12.5% vs Yesterday
            </span>
            <span className="text-[#A3AED0] font-bold">Today's Realization</span>
          </div>
        </div>

        {/* Binary Stats (ABA + Cash) */}
        <div className="md:col-span-5 grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#E0E5F2] rounded-[1.5rem] p-5 flex flex-col justify-between hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black text-[#A3AED0] uppercase">ABA Intake</span>
            </div>
            <div>
              <p className="text-xl font-black text-[#1B2559] tracking-tight">${abaIntake.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-[#A3AED0]">Bank Transfers</p>
            </div>
          </div>
          <div className="bg-white border border-[#E0E5F2] rounded-[1.5rem] p-5 flex flex-col justify-between hover:border-emerald-500/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[8px] font-black text-[#A3AED0] uppercase">USD Cash</span>
            </div>
            <div>
              <p className="text-xl font-black text-[#1B2559] tracking-tight">${usdCashIntake.toLocaleString()}</p>
              <p className="text-[9px] font-bold text-[#A3AED0]">Physical Green</p>
            </div>
          </div>
        </div>

        {/* Local Currency Card */}
        <div className="md:col-span-3 bg-gradient-to-br from-[#1B2559] to-[#3311DB] rounded-[1.5rem] p-5 text-white flex flex-col justify-between hover:shadow-xl hover:shadow-primary/20 transition-all">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Target className="w-4 h-4" />
            </div>
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Local KHR</span>
          </div>
          <div>
            <p className="text-xl font-black tracking-tight">{khrCashIntake.toLocaleString()} <span className="text-xs">៛</span></p>
            <p className="text-[9px] font-bold text-white/50">Market Rate Applied</p>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      {viewMode === 'calendar' ? (
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
                const dayEntries = monthEntries.filter(e => e.date === dayStr);
                const isCurrent = isToday(day);

                // Calculate Daily Total for the pill
                const dailyTotal = dayEntries.reduce((acc, e) => acc + (Number(e.amount_paid) || 0), 0);

                cells.push(
                  <div
                    key={dayStr}
                    onClick={() => {
                      setDate(day);
                      setViewMode('list');
                    }}
                    className={cn(
                      "border-r border-b border-[#E0E5F2] hover:bg-[#F4F7FE] transition-colors cursor-pointer group flex flex-col relative",
                      isCurrent ? "bg-primary/5" : "bg-white"
                    )}
                  >
                    {/* Cell Header: Date + Metrics */}
                    <div className="flex items-center justify-between p-2 pb-1">
                      <span className={cn(
                        "text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full",
                        isCurrent ? "bg-primary text-white shadow-md" : "text-[#707EAE]"
                      )}>
                        {format(day, 'd')}
                      </span>

                      {/* Daily Summary: Revenue & Count */}
                      {dayEntries.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-[#A3AED0] flex items-center gap-0.5">
                            {dayEntries.length}
                            <span className="text-[7px] uppercase">Pts</span>
                          </span>
                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                            ${dailyTotal.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Patient List - Compact Stream */}
                    <div className="flex-1 overflow-hidden px-1 pb-1 space-y-0.5">
                      {dayEntries.slice(0, 6).map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-white hover:shadow-sm transition-all cursor-pointer border border-transparent hover:border-[#E0E5F2]/50 group/item">
                          <div className="flex items-center gap-1 min-w-0">
                            {/* Payment Method Dot */}
                            <div className={cn(
                              "w-1 h-1 rounded-full shrink-0",
                              Number(e.paid_aba) > 0 ? "bg-blue-500" :
                                Number(e.paid_cash_usd) > 0 ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            <span className="text-[9px] font-medium text-[#1B2559] truncate">
                              {e.patients?.name || 'Client'}
                            </span>
                          </div>
                          <span className="text-[8px] font-bold text-[#A3AED0] opacity-0 group-hover/item:opacity-100 transition-opacity whitespace-nowrap ml-1">
                            ${(Number(e.amount_paid) || 0).toFixed(0)}
                          </span>
                        </div>
                      ))}
                      {dayEntries.length > 6 && (
                        <p className="text-[8px] font-black text-[#A3AED0] text-center pt-0.5 tracking-wide">
                          +{dayEntries.length - 6} more
                        </p>
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
      ) : (
        /* Stream / List View with Minimized/Maximized behavior */
        <div className="bg-white border border-[#E0E5F2] rounded-[1.5rem] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 md:p-6 flex items-center justify-between border-b border-[#F4F7FE]">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-black text-[#1B2559]">Session Roster</h2>
              <div className="h-4 w-px bg-[#E0E5F2]" />
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A3AED0]" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  className="bg-[#F4F7FE] border-none rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold w-48 md:w-64 focus:ring-2 ring-primary/20 outline-none transition-all placeholder:text-[#A3AED0]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#A3AED0] font-bold">
              <span className="hidden md:inline mr-2">{groupedEntries.length} Active Records</span>
              <button className="p-2 hover:bg-[#F4F7FE] rounded-lg transition-all"><Printer className="w-4 h-4" /></button>
              <button className="p-2 hover:bg-[#F4F7FE] rounded-lg transition-all"><Filter className="w-4 h-4" /></button>
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
                                <span className="text-[9px] font-black uppercase tracking-widest">DR. {entry.doctor?.name || 'Practitioner'}</span>
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
      )}

      {/* Daily Status Toggle - Centered Circular Button */}
      <button
        onClick={() => setShowSummary(!showSummary)}
        className={cn(
          "fixed z-[100] w-12 h-12 rounded-full flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl active:scale-90 group",
          showSummary
            ? "bg-[#1B2559] text-white shadow-[#1B2559]/30 bottom-[calc(80px+1.5rem)]"
            : "bg-white text-primary border border-[#E0E5F2] hover:border-primary/50 shadow-primary/10 bottom-2",
          isCollapsed ? "left-[calc(50%+40px)]" : "left-[calc(50%+144px)]",
          "-translate-x-1/2"
        )}
        title={showSummary ? "Hide Daily Status" : "Show Daily Status"}
      >
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping group-hover:block hidden" />
        {showSummary ? <EyeOff className="w-5 h-5 animate-in zoom-in-50 duration-500" /> : <Eye className="w-5 h-5 animate-in zoom-in-50 duration-500" />}
      </button>

      {/* Daily Status Bar */}
      <div
        className={cn(
          "fixed bottom-0 right-0 bg-white/95 backdrop-blur-3xl border-t border-[#E0E5F2] h-20 md:h-22 flex items-center justify-between px-8 md:px-12 z-[95] shadow-[0_-20px_60px_rgba(0,0,0,0.1)] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isCollapsed ? "left-20" : "left-72",
          showSummary ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
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
      {isAddingEntry && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
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
                <h3 className="text-2xl font-black text-[#1B2559] tracking-tight">Quick Intake</h3>
                <p className="text-[10px] text-[#A3AED0] font-black uppercase tracking-widest mt-1">Unified Registration & Re-routing</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Full Patient Identity</label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-12 py-4 text-sm font-bold text-[#1B2559] focus:ring-4 ring-primary/5 outline-none transition-all"
                    placeholder="e.g. Som Seng"
                    value={quickPatient.name}
                    onChange={(e) => setQuickPatient({ ...quickPatient, name: e.target.value })}
                  />
                  <Search className="w-4 h-4 text-[#A3AED0] absolute left-5 top-1/2 -translate-y-1/2" />
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
                <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Biological Identity (Gender)</label>
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
                <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Practitioner (Optional)</label>
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
              Initialize Profile & Redirect
            </button>
          </div>
        </div>
      )
      }

      {/* Managed Entry (Edit) */}
      {
        managedEntry && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-[#1B2559]/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
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
    </div >
  );
}

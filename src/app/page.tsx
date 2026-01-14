"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Calendar as CalendarIcon,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Printer,
  BookOpen
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import PatientSearch from "@/components/PatientSearch";

export default function LedgerPage() {
  const [date, setDate] = useState(new Date());
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Totals
  const totalUSD = entries.reduce((acc, entry) => acc + (Number(entry.amount_paid) || 0), 0);
  const totalKHR = totalUSD * 4100;

  useEffect(() => {
    fetchEntries();
  }, [date]);

  async function fetchEntries() {
    setIsLoading(true);
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('ledger_entries')
      .select(`
        *,
        patients (name, gender, age),
        treatments (name),
        doctor:staff!doctor_id (name),
        assistant:staff!assistant_id (name),
        receptionist:staff!receptionist_id (name)
      `)
      .eq('date', dateStr)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setEntries(data);
    }
    setIsLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-card px-4 py-2 rounded-xl border border-border flex items-center gap-3 shadow-sm">
            <CalendarIcon className="w-5 h-5 text-primary" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDate(new Date(date.setDate(date.getDate() - 1)))}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold text-sm min-w-[140px] text-center">
                {format(date, 'EEEE, MMM do yyyy')}
              </span>
              <button
                onClick={() => setDate(new Date(date.setDate(date.getDate() + 1)))}
                className="p-1 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PatientSearch />
          <button
            onClick={() => document.querySelector<HTMLInputElement>('input[placeholder*="Search or add"]')?.focus()}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Entry
          </button>
        </div>
      </div>

      {/* Main Ledger Session Card */}
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-h-[500px]">
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
          <div>
            <h2 className="text-lg font-bold">Daily Ledger Sheet</h2>
            <p className="text-xs text-muted-foreground">Session records and financial intake</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-all">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground transition-all">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full ledger-table">
            <thead>
              <tr className="bg-secondary/40">
                <th className="w-[80px]">No.</th>
                <th>Patient</th>
                <th>G/A</th>
                <th>Treatment</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Method</th>
                <th>Doctor</th>
                <th>Rec.</th>
                <th className="w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={13} className="text-center py-20 text-muted-foreground">Loading records...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <BookOpen className="w-12 h-12" />
                      <p className="text-sm font-medium">No entries for this date.</p>
                      <button className="text-primary text-xs hover:underline decoration-2 underline-offset-4">Add the first one</button>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={entry.id} className="ledger-row group cursor-pointer">
                    <td className="text-muted-foreground font-mono">{index + 1}</td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{entry.patients?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">ID: {entry.patient_id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {entry.patients?.gender}/{entry.patients?.age}
                      </span>
                    </td>
                    <td>{entry.treatments?.name || entry.description}</td>
                    <td>${Number(entry.unit_price).toFixed(2)}</td>
                    <td>{entry.quantity}</td>
                    <td className="font-bold text-foreground font-mono">${Number(entry.total_price).toFixed(2)}</td>
                    <td className="text-green-400 font-bold font-mono">${Number(entry.amount_paid).toFixed(2)}</td>
                    <td className="text-red-400 font-bold font-mono">${Number(entry.amount_remaining).toFixed(2)}</td>
                    <td>
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-1 rounded-full border uppercase tracking-widest",
                        entry.method === 'ABA' ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : "border-amber-500/50 text-amber-400 bg-amber-500/10"
                      )}>
                        {entry.method}
                      </span>
                    </td>
                    <td className="text-xs opacity-80">{entry.doctor?.name}</td>
                    <td className="text-xs opacity-80">{entry.receptionist?.name}</td>
                    <td>
                      <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-secondary rounded">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="summary-bar">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Received (USD)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-green-400">$</span>
              <span className="text-2xl font-black text-foreground">{totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <div className="h-8 w-px bg-border/50" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Equivalent (KHR)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-blue-400">៛</span>
              <span className="text-xl font-bold text-foreground">{totalKHR.toLocaleString('en-KH')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Daily Goal</span>
            <div className="w-32 h-2 bg-secondary rounded-full mt-1 overflow-hidden">
              <div className="w-2/3 h-full bg-gradient-to-r from-blue-600 to-blue-400" />
            </div>
          </div>
          <button className="bg-foreground text-background px-6 py-2 rounded-xl text-sm font-black hover:opacity-90 transition-opacity uppercase tracking-tighter">
            Close Session
          </button>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

"use client";

import React, { useState, useEffect } from "react";
import { X, DollarSign, Wallet, Zap, FileText, Save, Calculator } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface DailyReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date;
    branchId: string;
}

import { createPortal } from "react-dom";

export default function DailyReportModal({ isOpen, onClose, date, branchId }: DailyReportModalProps) {
    const [incomeAba, setIncomeAba] = useState(0);
    const [incomeUsd, setIncomeUsd] = useState(0);
    const [incomeKhr, setIncomeKhr] = useState(0);
    const [spending, setSpending] = useState(0);
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && branchId) {
            fetchReportData();
        }
    }, [isOpen, date, branchId]);

    const fetchReportData = async () => {
        setIsLoading(true);
        const dateStr = format(date, 'yyyy-MM-dd');

        // 1. Fetch Income from Ledger
        const { data: ledgerData, error: ledgerError } = await supabase
            .from('ledger_entries')
            .select('paid_aba, paid_cash_usd, paid_cash_khr')
            .eq('branch_id', branchId)
            .eq('date', dateStr);

        if (ledgerData) {
            const aba = ledgerData.reduce((sum, e) => sum + (Number(e.paid_aba) || 0), 0);
            const usd = ledgerData.reduce((sum, e) => sum + (Number(e.paid_cash_usd) || 0), 0);
            const khr = ledgerData.reduce((sum, e) => sum + (Number(e.paid_cash_khr) || 0), 0);
            setIncomeAba(aba);
            setIncomeUsd(usd);
            setIncomeKhr(khr);
        }

        // 2. Fetch Existing Report (Spending)
        const { data: reportData, error: reportError } = await supabase
            .from('daily_reports')
            .select('*')
            .eq('branch_id', branchId)
            .eq('date', dateStr)
            .maybeSingle();

        if (reportData) {
            setSpending(Number(reportData.spending) || 0);
            setNotes(reportData.notes || "");
        } else {
            setSpending(0);
            setNotes("");
        }

        setIsLoading(false);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const dateStr = format(date, 'yyyy-MM-dd');

        const { error } = await supabase
            .from('daily_reports')
            .upsert({
                date: dateStr,
                branch_id: branchId,
                income_aba: incomeAba,
                income_usd: incomeUsd,
                income_khr: incomeKhr,
                spending: spending,
                notes: notes,
            }, { onConflict: 'date, branch_id' });

        setIsSaving(false);
        if (!error) {
            onClose();
        } else {
            alert("Error saving report: " + error.message);
        }
    };

    if (!isOpen || !mounted) return null;

    const totalIncomeUsd = incomeAba + incomeUsd + (incomeKhr / 4100);
    const netIncome = totalIncomeUsd - spending;

    return createPortal(
        <div className="daily-report-portal fixed inset-0 z-[9999] flex items-center justify-center bg-[#1B2559]/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <style jsx global>{`
                @media print {
                    /* Hide everything in the body except our portal */
                    body > *:not(.daily-report-portal) {
                        display: none !important;
                    }

                    /* Ensure body/html don't have scroll/height issues */
                    html, body {
                        height: 100% !important;
                        overflow: hidden !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    /* Make portal visible and fullscreen */
                    .daily-report-portal {
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        display: flex !important;
                        align-items: flex-start !important; /* Start at top for printing */
                        justify-content: center !important;
                        background: white !important;
                        z-index: 99999 !important;
                        padding: 0 !important;
                    }

                    /* Hide UI Controls inside modal */
                    .print\\:hidden {
                        display: none !important;
                    }

                    /* Ensure printable area is correct */
                    #printable-report {
                        width: 100% !important;
                        height: 100% !important;
                        padding: 40px !important; /* Clean margin */
                        box-shadow: none !important;
                        border: none !important;
                    }
                }
            `}</style>

            <div className="bg-white rounded-[1.5rem] w-full max-w-4xl shadow-2xl relative border border-[#E0E5F2] flex flex-col min-h-[500px] max-h-[90vh] overflow-hidden">
                {/* Modal Controls */}
                <div className="p-4 flex justify-between items-center border-b border-[#F4F7FE] print:hidden bg-white z-10">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-4 py-2 bg-[#1B2559] text-white rounded-lg text-[10px] font-medium uppercase tracking-widest hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Save Changes
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-[#F4F7FE] text-[#1B2559] border border-[#E0E5F2] rounded-lg text-[10px] font-medium uppercase tracking-widest hover:bg-white transition-all flex items-center gap-2"
                        >
                            <FileText className="w-3.5 h-3.5" />
                            Print Report
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Report Content - This is what will be printed */}
                <div id="printable-report" className="flex-1 p-16 md:p-24 bg-white relative overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto h-full flex flex-col">
                        {/* Header */}
                        <div className="mb-12">
                            <h1 className="text-xl font-medium text-black">Date: <span className="font-medium">{format(date, 'dd/MM/yyyy')}</span></h1>
                        </div>

                        {/* Split Content */}
                        <div className="flex-1 flex relative min-h-[400px]">
                            {/* Vertical Divider Line */}
                            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-black -translate-x-1/2" />

                            {/* Left Column: Income (ចំណូល) */}
                            <div className="flex-1 pr-12 text-center">
                                <h2 className="text-[28px] font-medium text-black mb-12 font-kantumruy">ចំណូល</h2>

                                <div className="space-y-8 text-left max-w-[200px] mx-auto">
                                    <div className="border-b border-black/10 pb-2">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">ABA BANK</p>
                                        <p className="text-xl font-medium text-black">${incomeAba.toLocaleString()}</p>
                                    </div>
                                    <div className="border-b border-black/10 pb-2">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">USD CASH</p>
                                        <p className="text-xl font-medium text-black">${incomeUsd.toLocaleString()}</p>
                                    </div>
                                    <div className="border-b border-black/10 pb-2">
                                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-1">KHR CASH</p>
                                        <p className="text-xl font-medium text-black">{incomeKhr.toLocaleString()} ៛</p>
                                    </div>

                                    <div className="pt-4">
                                        <p className="text-[10px] font-medium text-black uppercase tracking-widest mb-1">Total Income</p>
                                        <p className="text-2xl font-medium text-black">${totalIncomeUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Spending (ចំណាយ) */}
                            <div className="flex-1 pl-12 text-center">
                                <h2 className="text-[28px] font-medium text-black mb-12 font-kantumruy">ចំណាយ</h2>

                                <div className="space-y-12 text-left max-w-[240px] mx-auto">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Total Spending ($)</label>
                                        <input
                                            type="number"
                                            value={spending === 0 ? "" : spending}
                                            onChange={(e) => setSpending(Number(e.target.value))}
                                            className="w-full bg-transparent border-b-2 border-black text-2xl font-medium text-black outline-none py-2 placeholder:text-gray-200"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Notes / Remarks</label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full bg-transparent border border-black/10 rounded-lg p-3 text-sm font-medium text-black outline-none min-h-[150px] resize-none focus:border-black transition-all"
                                            placeholder="Enter details here..."
                                        />
                                    </div>

                                    <div className="pt-4 border-t-2 border-black">
                                        <p className="text-[10px] font-medium text-black uppercase tracking-widest mb-1">Net Summary</p>
                                        <p className={cn(
                                            "text-2xl font-medium",
                                            netIncome >= 0 ? "text-green-600" : "text-red-600"
                                        )}>
                                            ${netIncome.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

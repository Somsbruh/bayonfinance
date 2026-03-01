"use client";

import React, { useState, useRef } from "react";
import {
    X as XIcon,
    FileText,
    Printer,
    Check,
    ChevronDown,
    Plus,
    Trash2,
    DollarSign,
    Calendar,
    User,
} from "lucide-react";
import { format } from "date-fns";
import TreatmentQuotationPDF, { QuotationItem } from "./TreatmentQuotationPDF";
import PaymentAgreementPDF, { InstallmentSchedule } from "./PaymentAgreementPDF";
import SignaturePad from "./SignaturePad";

interface DocumentGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: any;
    staff: any[];
    history: any[];
    accentColor?: string;
}

type DocMode = "select" | "quotation-builder" | "agreement-builder" | "preview";

export default function DocumentGeneratorModal({
    isOpen,
    onClose,
    patient,
    staff,
    history,
    accentColor = "#4318FF",
}: DocumentGeneratorModalProps) {
    const [mode, setMode] = useState<DocMode>("select");
    const [docType, setDocType] = useState<"quotation" | "agreement">("quotation");
    const printRef = useRef<HTMLDivElement>(null);

    // Quotation State
    const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
    const [quotationNotes, setQuotationNotes] = useState("");
    const [selectedDoctorId, setSelectedDoctorId] = useState(staff[0]?.id || "");
    const [newItemName, setNewItemName] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemQty, setNewItemQty] = useState("1");
    const [newItemTooth, setNewItemTooth] = useState("");

    // Agreement State
    const [treatmentDesc, setTreatmentDesc] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [depositAmount, setDepositAmount] = useState("");
    const [monthlyAmount, setMonthlyAmount] = useState("");
    const [numInstallments, setNumInstallments] = useState("6");
    const [agreementNotes, setAgreementNotes] = useState("");

    // Signature
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

    if (!isOpen) return null;

    const selectedDoctor = staff.find((s: any) => s.id === selectedDoctorId);
    const doctorName = selectedDoctor?.name || "Doctor";

    // Generate quotation number
    const quotationNumber = `QT-${patient.id.replace(/-/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const agreementNumber = `PA-${patient.id.replace(/-/g, '').slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    function addQuotationItem() {
        if (!newItemName || !newItemPrice) return;
        const qty = parseInt(newItemQty) || 1;
        const price = parseFloat(newItemPrice) || 0;
        setQuotationItems([...quotationItems, {
            name: newItemName,
            toothNumbers: newItemTooth || undefined,
            quantity: qty,
            unitPrice: price,
            total: price * qty,
        }]);
        setNewItemName("");
        setNewItemPrice("");
        setNewItemQty("1");
        setNewItemTooth("");
    }

    function addFromHistory(entry: any) {
        const name = entry.treatments?.name || entry.description;
        const price = Number(entry.unit_price) || Number(entry.total_price) || 0;
        setQuotationItems([...quotationItems, {
            name,
            quantity: entry.quantity || 1,
            unitPrice: price,
            total: price * (entry.quantity || 1),
        }]);
    }

    function removeQuotationItem(idx: number) {
        setQuotationItems(quotationItems.filter((_, i) => i !== idx));
    }

    function generateInstallments(): InstallmentSchedule[] {
        const n = parseInt(numInstallments) || 6;
        const monthly = parseFloat(monthlyAmount) || 0;
        const schedules: InstallmentSchedule[] = [];
        const startDate = new Date();

        for (let i = 1; i <= n; i++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(dueDate.getMonth() + i);
            schedules.push({
                month: i,
                dueDate: format(dueDate, 'yyyy-MM-dd'),
                amount: monthly,
                isPaid: false,
            });
        }
        return schedules;
    }

    function handlePrint() {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${docType === 'quotation' ? 'Treatment Quotation' : 'Payment Agreement'} - ${patient.name}</title>
                <meta charset="utf-8" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap" rel="stylesheet" />
                <script src="https://cdn.tailwindcss.com"><\/script>
                <style>
                    body { font-family: 'DM Sans', sans-serif; margin: 0; padding: 0; }
                    @media print {
                        body { padding: 0; margin: 0; }
                        .print-container { padding: 40px; max-width: 210mm; margin: 0 auto; }
                    }
                    @page { size: A4; margin: 15mm; }
                </style>
            </head>
            <body>
                <div class="print-container" style="padding: 40px; max-width: 210mm; margin: 0 auto;">
                    ${printContent.innerHTML}
                </div>
                <script>
                    setTimeout(() => window.print(), 800);
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    // ========================
    //  RENDER: Select Mode
    // ========================
    if (mode === "select") {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4318FF] via-[#7551FF] to-[#4318FF]" />

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-[#4318FF] transition-all border border-[#E0E5F2]"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>

                    <div className="text-center space-y-2">
                        <div className="w-16 h-16 bg-[#4318FF]/10 rounded-[2rem] flex items-center justify-center mx-auto">
                            <FileText className="w-7 h-7 text-[#4318FF]" />
                        </div>
                        <h3 className="text-2xl font-black text-[#1B2559] tracking-tight">Generate Document</h3>
                        <p className="text-xs text-[#707EAE] font-bold">Select the type of document to create for <span className="text-[#1B2559]">{patient.name}</span></p>
                    </div>

                    <div className="space-y-4">
                        <button
                            onClick={() => { setDocType("quotation"); setMode("quotation-builder"); }}
                            className="w-full group relative bg-white border-2 border-[#E0E5F2] hover:border-[#4318FF] rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:shadow-[#4318FF]/5"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#F4F7FE] group-hover:bg-[#4318FF]/10 rounded-xl flex items-center justify-center transition-colors">
                                    <FileText className="w-5 h-5 text-[#4318FF]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-[#1B2559] tracking-tight group-hover:text-[#4318FF] transition-colors">Treatment Quotation</h4>
                                    <p className="text-[10px] font-bold text-[#A3AED0] mt-0.5">Itemized treatment plan with prices and tooth numbers</p>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => { setDocType("agreement"); setMode("agreement-builder"); }}
                            className="w-full group relative bg-white border-2 border-[#E0E5F2] hover:border-[#4318FF] rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:shadow-[#4318FF]/5"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#F4F7FE] group-hover:bg-[#4318FF]/10 rounded-xl flex items-center justify-center transition-colors">
                                    <DollarSign className="w-5 h-5 text-[#4318FF]" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-[#1B2559] tracking-tight group-hover:text-[#4318FF] transition-colors">Payment Agreement</h4>
                                    <p className="text-[10px] font-bold text-[#A3AED0] mt-0.5">Installment plan with deposit, monthly schedule, and terms</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ========================
    //  RENDER: Quotation Builder
    // ========================
    if (mode === "quotation-builder") {
        const subtotal = quotationItems.reduce((sum, item) => sum + item.total, 0);
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden my-4">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4318FF] via-[#7551FF] to-[#4318FF]" />

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMode("select")} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-[#4318FF] transition-all">
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                </button>
                                <div>
                                    <h3 className="text-xl font-black text-[#1B2559] tracking-tight">Treatment Quotation</h3>
                                    <p className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-widest">{patient.name}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-[#4318FF] transition-all border border-[#E0E5F2]">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Doctor Selection */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Attending Doctor</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4318FF]" />
                                <select
                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl py-2.5 pl-11 pr-6 text-[10px] font-black text-[#1B2559] outline-none appearance-none cursor-pointer"
                                    value={selectedDoctorId}
                                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                                >
                                    {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Quick Add from History */}
                        {history.length > 0 && (
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Quick Add from Records</label>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(new Set(
                                        history
                                            .filter(e => e.item_type !== 'installment')
                                            .map(e => e.treatments?.name || e.description)
                                    )).slice(0, 8).map((name, idx) => {
                                        const entry = history.find(e => (e.treatments?.name || e.description) === name);
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => entry && addFromHistory(entry)}
                                                className="text-[9px] font-black text-[#1B2559] bg-[#F4F7FE] hover:bg-[#4318FF]/10 hover:text-[#4318FF] px-3 py-1.5 rounded-lg border border-[#E0E5F2] transition-all"
                                            >
                                                + {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Manual Add Item */}
                        <div className="space-y-2 bg-[#F4F7FE]/50 p-4 rounded-2xl border border-[#E0E5F2]">
                            <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Add Treatment Line</label>
                            <div className="grid grid-cols-12 gap-2">
                                <input
                                    type="text"
                                    placeholder="Treatment name"
                                    className="col-span-4 bg-white border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-[10px] font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/30"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addQuotationItem()}
                                />
                                <input
                                    type="text"
                                    placeholder="Tooth #"
                                    className="col-span-2 bg-white border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-[10px] font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/30"
                                    value={newItemTooth}
                                    onChange={(e) => setNewItemTooth(e.target.value)}
                                />
                                <input
                                    type="number"
                                    placeholder="Qty"
                                    min="1"
                                    className="col-span-2 bg-white border border-[#E0E5F2] rounded-xl px-3 py-2.5 text-[10px] font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/30 text-center"
                                    value={newItemQty}
                                    onChange={(e) => setNewItemQty(e.target.value)}
                                />
                                <div className="col-span-3 relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#A3AED0]">$</span>
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        min="0"
                                        className="w-full bg-white border border-[#E0E5F2] rounded-xl pl-7 pr-3 py-2.5 text-[10px] font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/30 text-right"
                                        value={newItemPrice}
                                        onChange={(e) => setNewItemPrice(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addQuotationItem()}
                                    />
                                </div>
                                <button
                                    onClick={addQuotationItem}
                                    className="col-span-1 bg-[#4318FF] hover:bg-[#3311DB] text-white rounded-xl flex items-center justify-center transition-all active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Items List */}
                        {quotationItems.length > 0 && (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {quotationItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white border border-[#E0E5F2] rounded-xl px-4 py-3 group hover:border-[#4318FF]/20 transition-all">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-black text-[#A3AED0]">{idx + 1}</span>
                                            <div>
                                                <p className="text-[11px] font-black text-[#1B2559] tracking-tight">{item.name}</p>
                                                {item.toothNumbers && <p className="text-[8px] font-bold text-[#A3AED0]">Tooth: {item.toothNumbers}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-[#A3AED0]">x{item.quantity}</span>
                                            <span className="text-[11px] font-black text-[#1B2559]">${item.total.toLocaleString()}</span>
                                            <button onClick={() => removeQuotationItem(idx)} className="opacity-0 group-hover:opacity-100 text-[#EE5D50] hover:bg-[#EE5D50]/10 p-1 rounded-lg transition-all">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Notes */}
                        <textarea
                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[10px] font-bold text-[#1B2559] outline-none min-h-[60px] placeholder:text-[#A3AED0] focus:border-[#4318FF]/30"
                            placeholder="Additional notes (optional)..."
                            value={quotationNotes}
                            onChange={(e) => setQuotationNotes(e.target.value)}
                        />

                        {/* Subtotal + Generate */}
                        <div className="flex items-center justify-between pt-4 border-t border-[#E0E5F2]">
                            <div>
                                <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Total Estimate</p>
                                <p className="text-2xl font-black text-[#4318FF] tracking-tighter">${subtotal.toLocaleString()}</p>
                            </div>
                            <button
                                onClick={() => setMode("preview")}
                                disabled={quotationItems.length === 0}
                                className="bg-[#4318FF] hover:bg-[#3311DB] disabled:bg-[#A3AED0] disabled:opacity-30 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-[#4318FF]/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Preview Document
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================
    //  RENDER: Agreement Builder
    // ========================
    if (mode === "agreement-builder") {
        const total = parseFloat(totalAmount) || 0;
        const deposit = parseFloat(depositAmount) || 0;
        const monthly = parseFloat(monthlyAmount) || 0;
        const months = parseInt(numInstallments) || 6;

        // Auto-calculate monthly if total and deposit and months are set
        const autoMonthly = months > 0 && total > deposit ? Math.round(((total - deposit) / months) * 100) / 100 : 0;

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative overflow-hidden my-4">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4318FF] via-[#7551FF] to-[#4318FF]" />

                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setMode("select")} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-[#4318FF] transition-all">
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                </button>
                                <div>
                                    <h3 className="text-xl font-black text-[#1B2559] tracking-tight">Payment Agreement</h3>
                                    <p className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-widest">{patient.name}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2.5 hover:bg-[#F4F7FE] rounded-2xl text-[#A3AED0] hover:text-[#4318FF] transition-all border border-[#E0E5F2]">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Doctor Selection */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Attending Doctor</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4318FF]" />
                                <select
                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl py-2.5 pl-11 pr-6 text-[10px] font-black text-[#1B2559] outline-none appearance-none cursor-pointer"
                                    value={selectedDoctorId}
                                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                                >
                                    {staff.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Treatment Description */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Treatment Description</label>
                            <textarea
                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[11px] font-bold text-[#1B2559] outline-none min-h-[60px] placeholder:text-[#A3AED0] focus:border-[#4318FF]/30"
                                placeholder="e.g. Full mouth ceramic veneers (upper and lower arch) — 20 units"
                                value={treatmentDesc}
                                onChange={(e) => setTreatmentDesc(e.target.value)}
                            />
                        </div>

                        {/* Financial Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Total Treatment Cost</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#4318FF]">$</span>
                                    <input
                                        type="number" min="0"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-8 pr-4 py-3 text-sm font-black text-[#1B2559] outline-none focus:border-[#4318FF]/30 text-right"
                                        placeholder="0"
                                        value={totalAmount}
                                        onChange={(e) => setTotalAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Deposit Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#19D5C5]">$</span>
                                    <input
                                        type="number" min="0"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-8 pr-4 py-3 text-sm font-black text-[#1B2559] outline-none focus:border-[#19D5C5]/30 text-right"
                                        placeholder="0"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Number of Months</label>
                                <input
                                    type="number" min="1" max="60"
                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-sm font-black text-[#1B2559] outline-none focus:border-[#4318FF]/30 text-center"
                                    value={numInstallments}
                                    onChange={(e) => setNumInstallments(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Monthly Payment</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[11px] font-black text-[#FFB547]">$</span>
                                    <input
                                        type="number" min="0"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl pl-8 pr-4 py-3 text-sm font-black text-[#1B2559] outline-none focus:border-[#FFB547]/30 text-right"
                                        placeholder={autoMonthly > 0 ? autoMonthly.toString() : "0"}
                                        value={monthlyAmount}
                                        onChange={(e) => setMonthlyAmount(e.target.value)}
                                    />
                                </div>
                                {autoMonthly > 0 && !monthlyAmount && (
                                    <button
                                        onClick={() => setMonthlyAmount(autoMonthly.toString())}
                                        className="text-[8px] font-black text-[#4318FF] uppercase tracking-widest hover:underline pl-1"
                                    >
                                        Use suggested: ${autoMonthly.toLocaleString()}/mo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Summary Banner */}
                        {total > 0 && (
                            <div className="bg-[#F4F7FE]/50 p-4 rounded-2xl border border-[#E0E5F2] grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Total</p>
                                    <p className="text-lg font-black text-[#1B2559] tracking-tighter">${total.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Deposit</p>
                                    <p className="text-lg font-black text-[#4318FF] tracking-tighter">${deposit.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Balance</p>
                                    <p className="text-lg font-black text-[#1B2559] tracking-tighter">${(total - deposit).toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <textarea
                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[10px] font-bold text-[#1B2559] outline-none min-h-[50px] placeholder:text-[#A3AED0] focus:border-[#4318FF]/30"
                            placeholder="Additional notes (optional)..."
                            value={agreementNotes}
                            onChange={(e) => setAgreementNotes(e.target.value)}
                        />

                        {/* Generate */}
                        <div className="flex items-center justify-end pt-4 border-t border-[#E0E5F2]">
                            <button
                                onClick={() => {
                                    if (!monthlyAmount && autoMonthly > 0) setMonthlyAmount(autoMonthly.toString());
                                    setMode("preview");
                                }}
                                disabled={!treatmentDesc || total <= 0}
                                className="bg-[#4318FF] hover:bg-[#3311DB] disabled:bg-[#A3AED0] disabled:opacity-30 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-[#4318FF]/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Preview Document
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ========================
    //  RENDER: Preview
    // ========================
    if (mode === "preview") {
        const monthly = parseFloat(monthlyAmount) || 0;
        const total = parseFloat(totalAmount) || 0;
        const deposit = parseFloat(depositAmount) || 0;

        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300 overflow-y-auto">
                <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-4xl shadow-2xl relative overflow-hidden my-4 flex flex-col max-h-[95vh]">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#4318FF] via-[#7551FF] to-[#4318FF]" />

                    {/* Top Bar */}
                    <div className="p-6 pb-4 flex items-center justify-between border-b border-[#F4F7FE] shrink-0">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setMode(docType === 'quotation' ? 'quotation-builder' : 'agreement-builder')} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-[#4318FF] transition-all">
                                <ChevronDown className="w-4 h-4 rotate-90" />
                            </button>
                            <div>
                                <h3 className="text-lg font-black text-[#1B2559] tracking-tight">Document Preview</h3>
                                <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">{docType === 'quotation' ? 'Treatment Quotation' : 'Payment Agreement'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={onClose} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] transition-all border border-[#E0E5F2]">
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                        {/* Signature Pad (before the preview) */}
                        <SignaturePad
                            onSave={(dataUrl) => setSignatureDataUrl(dataUrl)}
                            onClear={() => setSignatureDataUrl(null)}
                            width={560}
                            height={180}
                        />

                        {/* Document Preview */}
                        <div className="bg-[#F4F7FE]/30 rounded-2xl p-8 border border-[#E0E5F2]">
                            <div ref={printRef}>
                                {docType === "quotation" ? (
                                    <TreatmentQuotationPDF
                                        clinicName="Bayon Dental Clinic"
                                        clinicAddress="Phnom Penh, Cambodia"
                                        clinicPhone="+855 12 345 678"
                                        patientName={patient.name}
                                        patientPhone={patient.phone}
                                        patientId={patient.id}
                                        doctorName={doctorName}
                                        items={quotationItems}
                                        quotationNumber={quotationNumber}
                                        date={format(new Date(), 'yyyy-MM-dd')}
                                        notes={quotationNotes}
                                        signatureDataUrl={signatureDataUrl}
                                        accentColor={accentColor}
                                    />
                                ) : (
                                    <PaymentAgreementPDF
                                        clinicName="Bayon Dental Clinic"
                                        clinicAddress="Phnom Penh, Cambodia"
                                        clinicPhone="+855 12 345 678"
                                        patientName={patient.name}
                                        patientPhone={patient.phone}
                                        patientId={patient.id}
                                        doctorName={doctorName}
                                        treatmentDescription={treatmentDesc}
                                        totalAmount={total}
                                        depositAmount={deposit}
                                        monthlyAmount={monthly}
                                        installments={generateInstallments()}
                                        agreementNumber={agreementNumber}
                                        date={format(new Date(), 'yyyy-MM-dd')}
                                        notes={agreementNotes}
                                        signatureDataUrl={signatureDataUrl}
                                        accentColor={accentColor}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-6 pt-4 border-t border-[#E0E5F2] flex items-center justify-between shrink-0">
                        <p className="text-[9px] font-bold text-[#A3AED0]">
                            {signatureDataUrl ? "✓ Signature captured" : "⚠ No signature yet (optional)"}
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setMode(docType === 'quotation' ? 'quotation-builder' : 'agreement-builder')}
                                className="px-6 py-3 rounded-xl text-[10px] font-black text-[#A3AED0] hover:text-[#1B2559] transition-all uppercase tracking-widest"
                            >
                                Edit
                            </button>
                            <button
                                onClick={handlePrint}
                                className="bg-[#1B2559] hover:bg-[#4318FF] text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print / Save PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

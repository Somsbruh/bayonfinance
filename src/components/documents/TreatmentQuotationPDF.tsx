"use client";

import React from "react";
import { format } from "date-fns";

export interface QuotationItem {
    name: string;
    category?: string;
    toothNumbers?: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface TreatmentQuotationProps {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    patientName: string;
    patientPhone?: string;
    patientId: string;
    doctorName: string;
    items: QuotationItem[];
    quotationNumber: string;
    date: string;
    validUntil?: string;
    notes?: string;
    signatureDataUrl?: string | null;
    accentColor?: string;
}

export default function TreatmentQuotationPDF({
    clinicName = "Bayon Dental Clinic",
    clinicAddress = "Phnom Penh, Cambodia",
    clinicPhone = "+855 12 345 678",
    patientName,
    patientPhone,
    patientId,
    doctorName,
    items,
    quotationNumber,
    date,
    validUntil,
    notes,
    signatureDataUrl,
    accentColor = "#4318FF",
}: TreatmentQuotationProps) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0;
    const total = subtotal + tax;

    return (
        <div className="bg-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
            {/* === HEADER === */}
            <div className="flex justify-between items-start mb-10">
                <div>
                    {/* Logo Mark */}
                    <div className="flex items-center gap-4 mb-5">
                        <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg"
                            style={{ backgroundColor: accentColor }}
                        >
                            BF
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#1B2559] tracking-tight leading-none">{clinicName}</h2>
                            <p className="text-[10px] text-[#A3AED0] font-bold mt-0.5">{clinicAddress}</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <h1
                        className="text-[10px] font-black uppercase tracking-[0.3em] mb-2"
                        style={{ color: accentColor }}
                    >
                        Treatment Quotation
                    </h1>
                    <p className="text-2xl font-black text-[#1B2559] tracking-tighter leading-none">{quotationNumber}</p>
                    <p className="text-[10px] text-[#A3AED0] font-bold mt-1.5">
                        {(() => {
                            try {
                                return format(new Date(date), 'MMMM dd, yyyy');
                            } catch {
                                return date;
                            }
                        })()}
                    </p>
                </div>
            </div>

            {/* === CLIENT & DOCTOR INFO === */}
            <div className="grid grid-cols-3 gap-8 mb-10 pb-8 border-b border-[#F4F7FE]">
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-2">Prepared For</p>
                    <h3 className="text-sm font-black text-[#1B2559] tracking-tight">{patientName}</h3>
                    {patientPhone && (
                        <p className="text-[10px] text-[#A3AED0] font-bold mt-0.5">{patientPhone}</p>
                    )}
                    <p className="text-[10px] text-[#A3AED0] font-bold">ID: {patientId.split('-')[0].toUpperCase()}</p>
                </div>
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-2">Attending Doctor</p>
                    <h3 className="text-sm font-black text-[#1B2559] tracking-tight">Dr. {doctorName}</h3>
                    <p className="text-[10px] text-[#A3AED0] font-bold mt-0.5">{clinicName}</p>
                </div>
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-2">Valid Until</p>
                    <h3 className="text-sm font-black text-[#1B2559] tracking-tight">
                        {validUntil || (() => {
                            try {
                                const d = new Date(date);
                                d.setDate(d.getDate() + 30);
                                return format(d, 'MMMM dd, yyyy');
                            } catch {
                                return '30 days from issue';
                            }
                        })()}
                    </h3>
                    <p className="text-[10px] text-[#A3AED0] font-bold mt-0.5">30-day validity</p>
                </div>
            </div>

            {/* === LINE ITEMS TABLE === */}
            <div className="mb-8">
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2" style={{ borderColor: accentColor }}>
                            <th className="py-3 text-left text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[5%]">#</th>
                            <th className="py-3 text-left text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[40%]">Treatment Description</th>
                            <th className="py-3 text-center text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[15%]">Tooth</th>
                            <th className="py-3 text-center text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[10%]">Qty</th>
                            <th className="py-3 text-right text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[15%]">Unit Price</th>
                            <th className="py-3 text-right text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[15%]">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="border-b border-[#F4F7FE]">
                                <td className="py-3.5 text-[10px] font-bold text-[#A3AED0]">{idx + 1}</td>
                                <td className="py-3.5">
                                    <p className="text-[11px] font-black text-[#1B2559] tracking-tight">{item.name}</p>
                                    {item.category && (
                                        <p className="text-[8px] font-bold text-[#A3AED0] uppercase tracking-widest mt-0.5">{item.category}</p>
                                    )}
                                </td>
                                <td className="py-3.5 text-center text-[10px] font-bold text-[#1B2559]">
                                    {item.toothNumbers || "—"}
                                </td>
                                <td className="py-3.5 text-center text-[10px] font-bold text-[#1B2559]">{item.quantity}</td>
                                <td className="py-3.5 text-right text-[10px] font-bold text-[#A3AED0]">
                                    ${item.unitPrice.toLocaleString()}
                                </td>
                                <td className="py-3.5 text-right text-[11px] font-black text-[#1B2559]">
                                    ${item.total.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* === TOTALS SECTION === */}
            <div className="flex justify-end mb-10">
                <div className="w-72 space-y-2">
                    <div className="flex justify-between items-center py-1">
                        <span className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-wider">Subtotal</span>
                        <span className="text-[11px] font-bold text-[#1B2559]">${subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                        <span className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-wider">Tax (0%)</span>
                        <span className="text-[11px] font-bold text-[#A3AED0]">$0.00</span>
                    </div>
                    <div
                        className="h-0.5 rounded-full my-2"
                        style={{ backgroundColor: accentColor }}
                    />
                    <div className="flex justify-between items-center py-1">
                        <span className="text-xs font-black text-[#1B2559] uppercase tracking-[0.2em]">Total</span>
                        <span
                            className="text-xl font-black tracking-tighter"
                            style={{ color: accentColor }}
                        >
                            ${total.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* === NOTES === */}
            {notes && (
                <div className="mb-8 bg-[#F4F7FE]/50 rounded-xl p-5 border border-[#E0E5F2]">
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-2">Clinical Notes</p>
                    <p className="text-[10px] font-bold text-[#1B2559] leading-relaxed">{notes}</p>
                </div>
            )}

            {/* === SIGNATURE SECTION === */}
            <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-[#E0E5F2]">
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-6">Patient Signature</p>
                    {signatureDataUrl ? (
                        <div className="border-b border-[#1B2559] pb-2">
                            <img src={signatureDataUrl} alt="Patient Signature" className="h-16 object-contain" />
                        </div>
                    ) : (
                        <div className="border-b border-dashed border-[#E0E5F2] h-16" />
                    )}
                    <p className="text-[9px] font-bold text-[#A3AED0] mt-2">{patientName}</p>
                </div>
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-6">Doctor Signature</p>
                    <div className="border-b border-dashed border-[#E0E5F2] h-16" />
                    <p className="text-[9px] font-bold text-[#A3AED0] mt-2">Dr. {doctorName}</p>
                </div>
            </div>

            {/* === FOOTER === */}
            <div className="mt-10 pt-6 border-t border-[#F4F7FE] flex justify-between items-end">
                <div>
                    <p className="text-[8px] font-bold text-[#A3AED0] leading-relaxed">
                        This quotation is valid for 30 days from the date of issue.<br />
                        Prices are subject to change based on clinical findings during treatment.<br />
                        {clinicPhone && `Contact: ${clinicPhone}`}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">{clinicName}</p>
                    <p className="text-[8px] font-bold text-[#A3AED0] mt-0.5">Generated {format(new Date(), 'MMM dd, yyyy · HH:mm')}</p>
                </div>
            </div>
        </div>
    );
}

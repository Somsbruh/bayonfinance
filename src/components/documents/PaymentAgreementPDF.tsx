"use client";

import React from "react";
import { format } from "date-fns";

export interface InstallmentSchedule {
    month: number;
    dueDate: string;
    amount: number;
    isPaid?: boolean;
}

export interface PaymentAgreementProps {
    clinicName: string;
    clinicAddress?: string;
    clinicPhone?: string;
    patientName: string;
    patientPhone?: string;
    patientId: string;
    doctorName: string;
    treatmentDescription: string;
    totalAmount: number;
    depositAmount: number;
    monthlyAmount: number;
    installments: InstallmentSchedule[];
    agreementNumber: string;
    date: string;
    notes?: string;
    signatureDataUrl?: string | null;
    accentColor?: string;
}

export default function PaymentAgreementPDF({
    clinicName = "Bayon Dental Clinic",
    clinicAddress = "Phnom Penh, Cambodia",
    clinicPhone = "+855 12 345 678",
    patientName,
    patientPhone,
    patientId,
    doctorName,
    treatmentDescription,
    totalAmount,
    depositAmount,
    monthlyAmount,
    installments,
    agreementNumber,
    date,
    notes,
    signatureDataUrl,
    accentColor = "#4318FF",
}: PaymentAgreementProps) {
    const remainingAfterDeposit = totalAmount - depositAmount;

    return (
        <div className="bg-white" style={{ fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
            {/* === HEADER === */}
            <div className="flex justify-between items-start mb-8">
                <div>
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
                        Payment Agreement
                    </h1>
                    <p className="text-2xl font-black text-[#1B2559] tracking-tighter leading-none">{agreementNumber}</p>
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

            {/* === PARTIES === */}
            <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-[#F4F7FE]">
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-2">Patient (Party A)</p>
                    <h3 className="text-sm font-black text-[#1B2559] tracking-tight">{patientName}</h3>
                    {patientPhone && (
                        <p className="text-[10px] text-[#A3AED0] font-bold mt-0.5">{patientPhone}</p>
                    )}
                    <p className="text-[10px] text-[#A3AED0] font-bold">ID: {patientId.split('-')[0].toUpperCase()}</p>
                </div>
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-2">Clinic (Party B)</p>
                    <h3 className="text-sm font-black text-[#1B2559] tracking-tight">{clinicName}</h3>
                    <p className="text-[10px] text-[#A3AED0] font-bold mt-0.5">Dr. {doctorName}</p>
                    {clinicPhone && <p className="text-[10px] text-[#A3AED0] font-bold">{clinicPhone}</p>}
                </div>
            </div>

            {/* === TREATMENT SUMMARY === */}
            <div className="mb-8">
                <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-3">Treatment Summary</p>
                <div className="bg-[#F4F7FE]/50 rounded-xl p-5 border border-[#E0E5F2]">
                    <p className="text-[11px] font-black text-[#1B2559] tracking-tight mb-4">{treatmentDescription}</p>
                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Total Value</p>
                            <p className="text-lg font-black text-[#1B2559] tracking-tighter">${totalAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Deposit</p>
                            <p className="text-lg font-black tracking-tighter" style={{ color: accentColor }}>${depositAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mb-1">Balance</p>
                            <p className="text-lg font-black text-[#1B2559] tracking-tighter">${remainingAfterDeposit.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* === INSTALLMENT SCHEDULE === */}
            <div className="mb-8">
                <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-3">Installment Schedule</p>
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2" style={{ borderColor: accentColor }}>
                            <th className="py-2.5 text-left text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[15%]">Period</th>
                            <th className="py-2.5 text-left text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[35%]">Due Date</th>
                            <th className="py-2.5 text-right text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[25%]">Amount</th>
                            <th className="py-2.5 text-center text-[8px] font-black text-[#1B2559] uppercase tracking-[0.2em] w-[25%]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Deposit Row */}
                        <tr className="border-b border-[#F4F7FE]" style={{ backgroundColor: `${accentColor}08` }}>
                            <td className="py-3 text-[10px] font-black text-[#1B2559]">Deposit</td>
                            <td className="py-3 text-[10px] font-bold text-[#1B2559]">
                                {(() => {
                                    try { return format(new Date(date), 'MMMM dd, yyyy'); } catch { return date; }
                                })()}
                            </td>
                            <td className="py-3 text-right text-[11px] font-black" style={{ color: accentColor }}>
                                ${depositAmount.toLocaleString()}
                            </td>
                            <td className="py-3 text-center">
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#19D5C5] bg-[#19D5C5]/10 px-2.5 py-1 rounded-md">
                                    Due Today
                                </span>
                            </td>
                        </tr>

                        {/* Monthly Installments */}
                        {installments.map((inst, idx) => (
                            <tr key={idx} className="border-b border-[#F4F7FE]">
                                <td className="py-3 text-[10px] font-bold text-[#A3AED0]">Mo. {inst.month}</td>
                                <td className="py-3 text-[10px] font-bold text-[#1B2559]">
                                    {(() => {
                                        try { return format(new Date(inst.dueDate), 'MMMM dd, yyyy'); } catch { return inst.dueDate; }
                                    })()}
                                </td>
                                <td className="py-3 text-right text-[11px] font-black text-[#1B2559]">
                                    ${inst.amount.toLocaleString()}
                                </td>
                                <td className="py-3 text-center">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${inst.isPaid
                                        ? 'text-[#19D5C5] bg-[#19D5C5]/10'
                                        : 'text-[#A3AED0] bg-[#F4F7FE]'
                                        }`}>
                                        {inst.isPaid ? 'Paid' : 'Pending'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Schedule Summary */}
                <div className="flex justify-end mt-4">
                    <div className="w-64 space-y-1.5">
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-[#A3AED0] uppercase tracking-wider">Monthly Payment</span>
                            <span className="text-[11px] font-black text-[#1B2559]">${monthlyAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-[#A3AED0] uppercase tracking-wider">Duration</span>
                            <span className="text-[11px] font-black text-[#1B2559]">{installments.length} months</span>
                        </div>
                        <div className="h-0.5 rounded-full my-2" style={{ backgroundColor: accentColor }} />
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-[#1B2559] uppercase tracking-[0.15em]">Grand Total</span>
                            <span className="text-lg font-black tracking-tighter" style={{ color: accentColor }}>
                                ${totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* === TERMS === */}
            <div className="mb-8 p-5 bg-[#F4F7FE]/50 rounded-xl border border-[#E0E5F2]">
                <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-3">Terms & Conditions</p>
                <div className="space-y-1.5 text-[9px] font-bold text-[#707EAE] leading-relaxed">
                    <p>1. The deposit is non-refundable once the treatment has commenced.</p>
                    <p>2. Monthly payments are due on the dates specified above. A grace period of 5 business days applies.</p>
                    <p>3. Failure to make timely payments may result in suspension of ongoing treatment until the account is settled.</p>
                    <p>4. The clinic reserves the right to adjust treatment plans based on clinical findings. Any changes in cost will be communicated in advance.</p>
                    <p>5. This agreement is between the patient and the clinic. It does not constitute a financial loan or credit arrangement.</p>
                    {notes && <p className="mt-2 pt-2 border-t border-[#E0E5F2] text-[#1B2559]">Additional Note: {notes}</p>}
                </div>
            </div>

            {/* === SIGNATURE SECTION === */}
            <div className="grid grid-cols-2 gap-12 mt-10 pt-8 border-t border-[#E0E5F2]">
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
                    <p className="text-[8px] font-bold text-[#A3AED0]">Date: _______________</p>
                </div>
                <div>
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-6">Clinic Representative</p>
                    <div className="border-b border-dashed border-[#E0E5F2] h-16" />
                    <p className="text-[9px] font-bold text-[#A3AED0] mt-2">Dr. {doctorName}</p>
                    <p className="text-[8px] font-bold text-[#A3AED0]">Date: _______________</p>
                </div>
            </div>

            {/* === FOOTER === */}
            <div className="mt-8 pt-5 border-t border-[#F4F7FE] flex justify-between items-end">
                <p className="text-[8px] font-bold text-[#A3AED0] leading-relaxed">
                    Both parties agree to the terms outlined above.<br />
                    This document is binding upon signature by both parties.<br />
                    {clinicPhone && `Contact: ${clinicPhone}`}
                </p>
                <div className="text-right">
                    <p className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">{clinicName}</p>
                    <p className="text-[8px] font-bold text-[#A3AED0] mt-0.5">Generated {format(new Date(), 'MMM dd, yyyy · HH:mm')}</p>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Printer, ChevronLeft, Download, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function PrintReceiptPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const patientName = searchParams.get('patient') || 'Unknown Patient';
    const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const total = searchParams.get('total') || '0.00';
    const paid = searchParams.get('paid') || '0.00';
    const balance = searchParams.get('balance') || '0.00';

    return (
        <div className="min-h-screen bg-secondary/20 p-8 print:bg-white print:p-0">
            {/* Header / Controls (Hidden on Print) */}
            <div className="max-w-2xl mx-auto mb-8 flex items-center justify-between print:hidden">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all">
                        <Download className="w-4 h-4" />
                        PDF
                    </button>
                    <button className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-xl text-sm font-bold hover:bg-secondary/80 transition-all">
                        <Mail className="w-4 h-4" />
                        Email
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Printer className="w-4 h-4" />
                        Print Now
                    </button>
                </div>
            </div>

            {/* Receipt Paper */}
            <div className="max-w-2xl mx-auto bg-white border border-border shadow-2xl rounded-none print:shadow-none print:border-none p-12 font-serif text-slate-800">
                {/* Clinic Info */}
                <div className="text-center space-y-2 mb-12">
                    <h1 className="text-3xl font-black tracking-tighter text-slate-900">BAYON DENTAL CLINIC</h1>
                    <p className="text-sm italic opacity-70">"Excellence in Smiles, Professionalism in Care"</p>
                    <div className="text-[10px] uppercase tracking-widest font-bold mt-4 space-y-1">
                        <p>#123 Sothearos Blvd, Phnom Penh, Cambodia</p>
                        <p>Tel: +855 23 456 789 | Email: care@bayondental.com</p>
                    </div>
                </div>

                <div className="w-full h-px bg-slate-200 mb-8" />

                {/* Receipt Details */}
                <div className="flex justify-between items-start mb-12">
                    <div className="space-y-1">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bill To</h2>
                        <p className="font-bold text-lg text-slate-900">{patientName}</p>
                    </div>
                    <div className="text-right space-y-1">
                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receipt #</h2>
                        <p className="font-mono text-sm font-bold">REC-2026-{Math.floor(Math.random() * 10000)}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Date</p>
                        <p className="text-sm font-bold">{format(new Date(date), 'MMM do, yyyy')}</p>
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-12">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-left">
                            <th className="py-2 text-[10px] uppercase font-black">Description</th>
                            <th className="py-2 text-right text-[10px] uppercase font-black">Quantity</th>
                            <th className="py-2 text-right text-[10px] uppercase font-black">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr>
                            <td className="py-4">
                                <p className="font-bold">Dental Consultation & Procedure</p>
                                <p className="text-[10px] italic opacity-60">General dental services as per appointment records.</p>
                            </td>
                            <td className="py-4 text-right font-mono">1</td>
                            <td className="py-4 text-right font-mono font-bold">${total}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Totals Section */}
                <div className="flex justify-end mb-20">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Subtotal</span>
                            <span className="font-mono">${total}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Discount</span>
                            <span className="font-mono">$0.00</span>
                        </div>
                        <div className="w-full h-px bg-slate-100 my-2" />
                        <div className="flex justify-between text-lg font-black text-slate-900">
                            <span>TOTAL PAID</span>
                            <span className="font-mono text-green-600">${paid}</span>
                        </div>
                        {Number(balance) > 0 && (
                            <div className="flex justify-between text-sm font-bold text-red-500 italic mt-2">
                                <span>Balance Remaining</span>
                                <span className="font-mono">${balance}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-10 text-center border-t border-slate-100 italic text-[10px] text-slate-400">
                    <p>Thank you for choosing Bayon Dental Clinic.</p>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { Printer, Download, Loader2 } from 'lucide-react';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get('patientId');
    const type = searchParams.get('type') as 'invoice' | 'receipt' || 'invoice';
    const itemIds = searchParams.get('itemIds')?.split(',') || [];

    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState<any>(null);
    const [items, setItems] = useState<any[]>([]);
    const [invoiceColor, setInvoiceColor] = useState('#4318FF');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const printed = useRef(false);

    useEffect(() => {
        async function fetchData() {
            if (!patientId) return;

            // 1. Fetch Clinic Settings
            const { data: settings } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'invoice_color')
                .single();
            if (settings) setInvoiceColor(settings.value);

            // 2. Fetch Patient
            const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();

            if (patientError) {
                console.error("Error fetching patient:", patientError);
                setError(patientError.message);
            }
            setPatient(patientData);

            // 3. Fetch Items
            let query = supabase
                .from('ledger_entries')
                .select('*, treatments(name)')
                .eq('patient_id', patientId);

            if (type === 'invoice') {
                // For Invoice: Get all unpaid or partially paid items
                query = query.gt('amount_remaining', 0);
            } else {
                // For Receipt: Get specific items passed via itemIds or just recently paid?
                // If itemIds provided, use them. Otherwise maybe just show all paid?
                // The prompt implies printing receipts for *settled* bills.
                if (itemIds.length > 0) {
                    query = query.in('id', itemIds);
                } else {
                    // Fallback to recent paid items if no IDs specific
                    query = query.eq('status', 'paid').order('updated_at', { ascending: false }).limit(10);
                }
            }

            const { data: itemsData } = await query;
            if (itemsData) setItems(itemsData);

            // Generate a stable invoice number based on the first item ID, or random if no items
            const seed = itemsData && itemsData.length > 0 ? itemsData[0].id : Math.floor(Math.random() * 1000000).toString();
            const suffix = seed.replace(/-/g, '').slice(0, 6).toUpperCase();
            setInvoiceNumber(`INV-${suffix}`);

            setLoading(false);
        }
        fetchData();

        // Print automatically when loaded
        if (!loading && patient && !printed.current) {
            printed.current = true;
            setTimeout(() => window.print(), 1000);
        }
    }, [patientId, type, itemIds.length, loading, patient]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Generating {type}...</p>
            </div>
        );
    }

    if (error) return <div className="p-10 text-center text-red-500">Error: {error}</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found</div>;

    const subtotal = items.reduce((sum, item) => sum + (type === 'invoice' ? Number(item.amount_remaining) : Number(item.total_price)), 0);
    const tax = 0; // 0% tax for now
    const total = subtotal + tax;

    return (
        <div className="min-h-screen bg-slate-50 p-8 print:p-0 print:bg-white print:overflow-visible print:min-h-0 print:h-auto">
            {/* Controls */}
            <div className="max-w-[210mm] mx-auto mb-8 flex justify-end gap-3 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#1B2559] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-xl hover:bg-[#1B2559]/90 transition-all"
                >
                    <Printer className="w-4 h-4" />
                    Print Document
                </button>
            </div>

            {/* A4 Paper */}
            <div data-id="print-paper" style={{ pageBreakAfter: 'avoid' }} className="max-w-[210mm] mx-auto bg-white shadow-2xl print:shadow-none p-8 print:p-6 relative overflow-hidden print:w-full print:max-w-none print:overflow-visible">
                {/* Accent Header */}
                <div style={{ backgroundColor: invoiceColor }} className="absolute top-0 left-0 w-full h-3" />

                {/* Header Section */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-[#1B2559] tracking-tight mb-2 uppercase">Medical {type}</h1>
                        <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed">
                            {patient.branches?.name || 'Bayon Finance Clinic'}<br />
                            {patient.branches?.location || 'Phnom Penh, Cambodia'}<br />
                            {patient.branches?.phone || '+855 12 345 678'}
                        </p>
                    </div>
                    <div className="text-right">
                        {/* Dynamic Logo Placeholder using Custom Color */}
                        <div
                            style={{ borderColor: invoiceColor }}
                            className="w-20 h-20 border-4 rounded-[2rem] flex items-center justify-center ml-auto mb-4 text-[#1B2559]"
                        >
                            <span className="font-black text-2xl">BF</span>
                        </div>
                        <p className="text-sm font-bold text-[#1B2559]">#{invoiceNumber}</p>
                        <p className="text-xs text-slate-400 font-medium">{format(new Date(), 'MMMM dd, yyyy')}</p>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-8">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Billed To</p>
                    <h2 className="text-2xl font-black text-[#1B2559] mb-1">{patient.name}</h2>
                    <p className="text-sm text-slate-500 font-medium">
                        {patient.phone ? `+${patient.phone}` : 'No phone number'}<br />
                        Patient ID: {patient.id.split('-')[0].toUpperCase()}
                    </p>
                </div>

                {/* Line Items */}
                <div className="mb-12">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-[#1B2559]">
                                <th className="py-3 text-left text-[10px] font-black text-[#1B2559] uppercase tracking-widest w-1/2">Description</th>
                                <th className="py-3 text-center text-[10px] font-black text-[#1B2559] uppercase tracking-widest">Date</th>
                                <th className="py-3 text-right text-[10px] font-black text-[#1B2559] uppercase tracking-widest">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                                <tr key={idx}>
                                    <td className="py-4">
                                        <p className="text-sm font-bold text-[#1B2559]">{item.treatments?.name || item.description}</p>
                                        {item.notes && <p className="text-xs text-slate-400 italic mt-0.5">{item.notes}</p>}
                                    </td>
                                    <td className="py-4 text-center text-xs text-slate-500 font-medium">
                                        {format(new Date(item.date), 'MMM dd, yyyy')}
                                    </td>
                                    <td className="py-4 text-right text-sm font-black text-[#1B2559]">
                                        ${Number(type === 'invoice' ? item.amount_remaining : item.total_price).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                            <span>Subtotal</span>
                            <span>${subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-medium text-slate-500">
                            <span>Tax (0%)</span>
                            <span>$0.00</span>
                        </div>
                        <div className="h-px bg-slate-200 my-2" />
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-black text-[#1B2559] uppercase tracking-widest">Total</span>
                            <span style={{ color: invoiceColor }} className="text-2xl font-black">
                                ${total.toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}

export default function PrintInvoicePage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading Invoice...</div>}>
            <InvoiceContent />
        </Suspense>
    );
}

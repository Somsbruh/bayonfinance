"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Printer, ChevronLeft, Download } from 'lucide-react';
import { format } from 'date-fns';
import { Suspense } from 'react';

function ReportContent() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const timeframe = searchParams.get('timeframe') || 'Monthly';
    const periodRevenue = searchParams.get('periodRevenue') || '0';
    const weeklyIncome = searchParams.get('weeklyIncome') || '0';
    const realizedTotal = searchParams.get('realizedTotal') || '0';
    const patientCount = searchParams.get('patientCount') || '0';
    const topStaffStr = searchParams.get('topStaff') || '[]';
    const topStaff = JSON.parse(topStaffStr);

    return (
        <div className="min-h-screen bg-secondary/20 p-8 print:bg-white print:p-0">
            {/* Header / Controls (Hidden on Print) */}
            <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between print:hidden">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Analytics
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                        <Printer className="w-4 h-4" />
                        Print / Save as PDF
                    </button>
                </div>
            </div>

            {/* Report Paper */}
            <div className="max-w-4xl mx-auto bg-white border border-border shadow-2xl rounded-none print:shadow-none print:border-none p-16 font-serif text-slate-800 min-h-[297mm]">
                {/* Clinic Info */}
                <div className="flex justify-between items-start mb-12">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-medium tracking-tighter text-slate-900 uppercase">Bayon Dental Clinic</h1>
                        <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Financial Performance Report</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400">Date Generated</p>
                        <p className="text-sm font-medium">{format(new Date(), 'MMMM do, yyyy')}</p>
                    </div>
                </div>

                <div className="w-full h-1 bg-slate-900 mb-12" />

                {/* Report Metadata */}
                <div className="grid grid-cols-2 gap-12 mb-16">
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Analysis Scope</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[8px] uppercase font-medium text-slate-400">Timeframe</p>
                                <p className="text-sm font-medium text-slate-900">{timeframe}</p>
                            </div>
                            <div>
                                <p className="text-[8px] uppercase font-medium text-slate-400">Currency</p>
                                <p className="text-sm font-medium text-slate-900">USD ($)</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Patient Reach</h2>
                        <div>
                            <p className="text-[8px] uppercase font-medium text-slate-400">Total Registered Profiles</p>
                            <p className="text-sm font-medium text-slate-900">{patientCount} Clinical Records</p>
                        </div>
                    </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-8 mb-16">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-none space-y-2">
                        <p className="text-[8px] uppercase font-medium text-slate-400 tracking-widest">Period Revenue</p>
                        <p className="text-3xl font-medium text-slate-900">${Number(periodRevenue).toLocaleString()}</p>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-none space-y-2">
                        <p className="text-[8px] uppercase font-medium text-slate-400 tracking-widest">Cycle Income</p>
                        <p className="text-3xl font-medium text-slate-900">${Number(weeklyIncome).toLocaleString()}</p>
                    </div>
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-none space-y-2">
                        <p className="text-[8px] uppercase font-medium text-slate-400 tracking-widest">Realized Total</p>
                        <p className="text-3xl font-medium text-slate-900">${Number(realizedTotal).toLocaleString()}</p>
                    </div>
                </div>

                {/* Historical Growth - Placeholder for simple table since we can't easily print canvas without extra libs */}
                <div className="mb-16">
                    <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-6">Historical Revenue Analysis</h2>
                    <p className="text-xs text-slate-500 mb-8 italic">Revenue trends are captured and visualized within the digital cockpit. This printed summary provides final realized aggregates.</p>
                </div>

                {/* Top Staff Performance */}
                <div className="mb-16">
                    <h2 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-6">Staff Contribution Portfolio</h2>
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b-2 border-slate-900">
                                <th className="py-2 text-[10px] uppercase font-medium">Personnel Name</th>
                                <th className="py-2 text-right text-[10px] uppercase font-medium">Performance Share</th>
                                <th className="py-2 text-right text-[10px] uppercase font-medium">Total Realized</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {topStaff.map((s: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-4 font-medium text-sm">{s.name}</td>
                                    <td className="py-4 text-right text-xs">{(s.total / Number(realizedTotal) * 100).toFixed(1)}%</td>
                                    <td className="py-4 text-right font-mono font-medium text-sm">${s.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Disclaimer */}
                <div className="mt-auto pt-10 text-center border-t border-slate-100 space-y-2">
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest italic">Confidential Biological & Financial Data</p>
                    <p className="text-[8px] text-slate-300 uppercase tracking-[0.3em]">Generated by Bayon Dental Intelligence · NextGen Dental SaaS</p>
                </div>
            </div>
        </div>
    );
}

export default function ClinicalReportPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center font-medium uppercase tracking-widest text-[#A3AED0]">Formatting Clinical Manuscript...</div>}>
            <ReportContent />
        </Suspense>
    );
}

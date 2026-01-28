"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import "./odontogram.css";

// Dynamic import for react-odontogram
const Odontogram = dynamic(() => import("react-odontogram").then(mod => mod.Odontogram), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center p-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    )
});

interface OdontogramViewProps {
    patientId: string;
}

export default function OdontogramView({ patientId }: OdontogramViewProps) {
    const [chartType, setChartType] = useState<'adult' | 'baby'>('adult');
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>([]);

    const handleOdontogramChange = (teeth: any[]) => {
        const ids = teeth.map(t => t.id.replace('teeth-', ''));
        setSelectedTeeth(ids);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-base font-bold text-slate-900 leading-tight">Clinical Odontogram</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">interactive dental chart</p>
                </div>

                <div className="flex bg-slate-100 p-0.5 rounded-lg shrink-0">
                    <button
                        onClick={() => setChartType('adult')}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                            chartType === 'adult'
                                ? "bg-white text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Adult ( permanent )
                    </button>
                    <button
                        onClick={() => setChartType('baby')}
                        className={cn(
                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all",
                            chartType === 'baby'
                                ? "bg-white text-primary shadow-sm"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        Baby ( primary )
                    </button>
                </div>
            </div>

            <div className="flex-1 flex-col flex items-center justify-center p-6 bg-slate-50/10 overflow-hidden">
                <div className="relative w-full h-full max-h-[384px] aspect-square odontogram-stage">
                    {/* Tooth Chart Only - Numbering removed as requested */}
                    <Odontogram
                        theme="light"
                        notation="FDI"
                        colors={{}}
                        maxTeeth={chartType === 'adult' ? 8 : 5}
                        onChange={handleOdontogramChange}
                        className="w-full h-full"
                    />
                </div>
            </div>

            <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Clean view
                </div>
                <span className="italic uppercase tracking-[0.2em]">Clinical Essentials</span>
            </div>

            <style>{`
                .odontogram-stage .Odontogram {
                    max-width: none !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                .odontogram-stage .Odontogram svg {
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>
        </div>
    );
}

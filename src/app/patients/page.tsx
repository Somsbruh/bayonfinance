"use client";

import { useState, useEffect } from "react";
import {
    Users,
    Search,
    Plus,
    Phone,
    User as UserIcon,
    ChevronRight,
    Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import PatientSearch from "@/components/PatientSearch";
import { formatTelegramLink, cn } from "@/lib/utils";

import { useBranch } from "@/context/BranchContext";

export default function PatientsPage() {
    const { currentBranch } = useBranch();
    const [patients, setPatients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterUnpaid, setFilterUnpaid] = useState(false);

    useEffect(() => {
        if (currentBranch) fetchPatients();
    }, [currentBranch]);

    async function fetchPatients() {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('branch_id', currentBranch?.id)
            .neq('is_archived', true)
            .order('name');

        if (data) setPatients(data);
        setIsLoading(false);
    }

    const unpaidCount = patients.filter(p => Number(p.total_remaining) > 0).length;

    return (
        <div className="space-y-10">
            {/* Header & Quick Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
                <div className="space-y-0.5">
                    <h1 className="text-4xl font-black text-[#1B2559] tracking-tight">Patient Portfolio</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setFilterUnpaid(!filterUnpaid)}
                        className={cn(
                            "text-[10px] font-black px-6 py-3.5 rounded-[20px] border transition-all flex items-center gap-3 uppercase tracking-widest shadow-sm hover:shadow-md h-full whitespace-nowrap",
                            filterUnpaid
                                ? "bg-red-500 text-white border-red-400 shadow-xl shadow-red-500/20"
                                : "text-[#1B2559] hover:bg-[#F4F7FE] border-[#E0E5F2] bg-white"
                        )}
                    >
                        <Filter className="w-3.5 h-3.5" />
                        {filterUnpaid ? "Critical Balance" : "Filter Arrears"}
                    </button>
                    <PatientSearch />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="card-premium p-0 border-none overflow-hidden pb-8">
                <div className="p-8 pb-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/5 text-primary">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-lg font-black text-[#1B2559] block tracking-tight">Clinical Directory</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto px-4">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-[#F4F7FE]">
                                <th className="px-4 py-5 text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] min-w-[200px]">Patient Descriptor</th>
                                <th className="px-4 py-5 text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] min-w-[120px]">Demographics</th>
                                <th className="px-4 py-5 text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] min-w-[150px]">Contact Node</th>
                                <th className="px-4 py-5 text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] min-w-[120px]">Aggregate Paid</th>
                                <th className="px-4 py-5 text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] min-w-[120px]">Outstanding</th>
                                <th className="px-4 py-5 text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.2em] w-[60px]"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F4F7FE]">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                            <p className="text-xs font-black text-[#A3AED0] uppercase tracking-widest">Deciphering database records...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-24">
                                        <div className="flex flex-col items-center gap-4 opacity-40">
                                            <div className="w-20 h-20 rounded-full bg-[#F4F7FE] flex items-center justify-center">
                                                <Users className="w-10 h-10 text-[#A3AED0]" />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-[#1B2559]">Portfolio Empty</p>
                                                <p className="text-xs font-bold text-[#A3AED0]">Initialize CRM by adding your first clinical profile.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                patients
                                    .filter(p => !filterUnpaid || Number(p.total_remaining) > 0)
                                    .map((p) => (
                                        <tr key={p.id} className="group hover:bg-[#F4F7FE]/50 transition-all cursor-pointer">
                                            <td className="px-4 py-4">
                                                <Link href={`/patients/${p.id}`} className="flex items-center gap-3 group/link">
                                                    <div className="w-10 h-10 rounded-xl bg-[#F4F7FE] flex items-center justify-center text-primary font-black shadow-inner border border-[#E0E5F2] group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all duration-300">
                                                        {p.name[0]}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-xs text-[#1B2559] group-hover/link:text-primary transition-colors block tracking-tight">{p.name}</span>
                                                        <span className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest mt-0.5 block opacity-60">ID: {p.id.slice(0, 8)}</span>
                                                    </div>
                                                </Link>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] font-black bg-[#E9EDF7] text-[#1B2559] px-2.5 py-1 rounded-full uppercase tracking-widest border border-[#E0E5F2]">
                                                        {p.gender === 'F' ? 'F' : 'M'}
                                                    </span>
                                                    <span className="text-[9px] font-black text-[#707EAE] uppercase tracking-widest">
                                                        {p.age}Y
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                {p.phone ? (
                                                    <a
                                                        href={formatTelegramLink(p.phone)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-[9px] font-black text-primary hover:text-white hover:bg-primary uppercase tracking-widest bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/10 transition-all"
                                                    >
                                                        <Phone className="w-2.5 h-2.5" />
                                                        {p.phone.startsWith('855') ? p.phone.slice(3) : p.phone}
                                                    </a>
                                                ) : (
                                                    <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest italic">Unset</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-black text-[#01B574] tracking-tight">${Number(p.total_paid).toLocaleString()}</div>
                                                    <div className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Realized</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="space-y-0.5">
                                                    <div className={cn(
                                                        "text-xs font-black tracking-tight",
                                                        Number(p.total_remaining) > 0 ? "text-red-500" : "text-[#1B2559]"
                                                    )}>
                                                        ${Number(p.total_remaining).toLocaleString()}
                                                    </div>
                                                    <div className="text-[8px] font-black text-[#A3AED0] uppercase tracking-widest">Liability</div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Link
                                                    href={`/patients/${p.id}`}
                                                    className="w-8 h-8 rounded-xl bg-white border border-[#E0E5F2] flex items-center justify-center text-[#A3AED0] hover:bg-primary hover:text-white hover:border-primary opacity-0 group-hover:opacity-100 transition-all shadow-sm translate-x-2 group-hover:translate-x-0"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

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

export default function PatientsPage() {
    const [patients, setPatients] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPatients();
    }, []);

    async function fetchPatients() {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .order('name');

        if (data) setPatients(data);
        setIsLoading(false);
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black">Patient Directory</h1>
                    <p className="text-sm text-muted-foreground">Manage records and lifetime financial status</p>
                </div>
                <div className="flex items-center gap-3">
                    <PatientSearch />
                </div>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-border bg-secondary/20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-2 rounded-lg">
                            <Users className="w-5 h-5" />
                        </div>
                        <span className="font-bold">{patients.length} Total Patients</span>
                    </div>
                    <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filter List
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full ledger-table">
                        <thead>
                            <tr className="bg-secondary/40">
                                <th>Patient Name</th>
                                <th>Gender/Age</th>
                                <th>Contact</th>
                                <th>Paid to Date</th>
                                <th>Remaining</th>
                                <th className="w-[100px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-muted-foreground">Searching records...</td>
                                </tr>
                            ) : patients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-muted-foreground italic">No patients registered yet.</td>
                                </tr>
                            ) : (
                                patients.map((p) => (
                                    <tr key={p.id} className="ledger-row group">
                                        <td>
                                            <Link href={`/patients/${p.id}`} className="flex items-center gap-3 hover:text-primary transition-colors">
                                                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary font-black">
                                                    {p.name[0]}
                                                </div>
                                                <span className="font-bold">{p.name}</span>
                                            </Link>
                                        </td>
                                        <td>
                                            <span className="text-xs bg-secondary px-2 py-1 rounded-lg">
                                                {p.gender}/{p.age}y
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Phone className="w-3 h-3" />
                                                {p.phone || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="text-green-400 font-bold font-mono">${Number(p.total_paid).toLocaleString()}</td>
                                        <td className="text-red-400 font-bold font-mono">${Number(p.total_remaining).toLocaleString()}</td>
                                        <td>
                                            <Link
                                                href={`/patients/${p.id}`}
                                                className="p-2 hover:bg-primary/10 rounded-xl text-primary opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-xs font-bold"
                                            >
                                                Details <ChevronRight className="w-4 h-4" />
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

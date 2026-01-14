"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Printer,
    Plus,
    Info,
    Calendar,
    DollarSign,
    User,
    Activity,
    ChevronDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

export default function PatientDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [patient, setPatient] = useState<any>(null);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPatientData();
        fetchTreatments();
    }, [id]);

    async function fetchPatientData() {
        setIsLoading(true);
        const { data: pData, error: pError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (pData) {
            setPatient(pData);

            const { data: hData, error: hError } = await supabase
                .from('ledger_entries')
                .select(`
          *,
          treatments (name),
          doctor:staff!doctor_id (name)
        `)
                .eq('patient_id', id)
                .order('date', { ascending: false });

            if (hData) setHistory(hData);
        }
        setIsLoading(false);
    }

    async function fetchTreatments() {
        const { data } = await supabase.from('treatments').select('*');
        if (data) setTreatments(data);
    }

    async function addTreatment(treatment: any) {
        // Basic logic to add treatment to ledger
        const { error } = await supabase
            .from('ledger_entries')
            .insert({
                patient_id: id,
                treatment_id: treatment.id,
                unit_price: treatment.price,
                total_price: treatment.price,
                amount_paid: 0,
                amount_remaining: treatment.price,
                description: treatment.name,
                date: format(new Date(), 'yyyy-MM-dd')
            });

        if (!error) {
            fetchPatientData(); // Refresh
        }
    }

    if (isLoading) return <div className="p-10 text-center">Loading patient...</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found.</div>;

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-20">
            {/* Navigation & Actions */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group"
                >
                    <div className="p-2 rounded-lg bg-card border border-border group-hover:border-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">Back to Ledger</span>
                </button>

                <div className="flex items-center gap-3">
                    <button className="bg-secondary/50 border border-border hover:bg-secondary text-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        <Printer className="w-4 h-4" />
                        Print Receipt (A4)
                    </button>
                    <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                        <Activity className="w-4 h-4" />
                        New Appointment
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-8 items-start">
                {/* Left Section: Patient Profile & History */}
                <div className="col-span-8 space-y-8">

                    {/* Profile Card */}
                    <div className="bg-card border border-border rounded-3xl p-8 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <User className="w-32 h-32" />
                        </div>

                        <div className="flex items-start gap-6 relative z-10">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-3xl font-black text-white shadow-xl">
                                {patient.name[0]}
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-foreground">{patient.name}</h1>
                                    <span className="bg-secondary px-3 py-1 rounded-full text-xs font-bold text-muted-foreground uppercase">
                                        {patient.gender === 'F' ? 'Female' : 'Male'} · Age {patient.age}
                                    </span>
                                </div>
                                <p className="text-muted-foreground flex items-center gap-2">
                                    <Info className="w-4 h-4" />
                                    ID: {patient.id}
                                </p>
                                <div className="flex items-center gap-6 mt-4">
                                    <div className="text-sm">
                                        <span className="text-muted-foreground block text-xs uppercase font-bold tracking-widest mb-1">Total Paid</span>
                                        <span className="text-xl font-black text-green-400">${Number(patient.total_paid).toLocaleString()}</span>
                                    </div>
                                    <div className="h-10 w-px bg-border/50" />
                                    <div className="text-sm">
                                        <span className="text-muted-foreground block text-xs uppercase font-bold tracking-widest mb-1">Remaining Balance</span>
                                        <span className="text-xl font-black text-red-500">${Number(patient.total_remaining).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-primary" />
                            Financial History
                        </h2>

                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg">
                            <table className="w-full ledger-table">
                                <thead>
                                    <tr className="bg-secondary/40">
                                        <th>Date</th>
                                        <th>Treatment / Description</th>
                                        <th>Price</th>
                                        <th>Paid</th>
                                        <th>Balance</th>
                                        <th className="w-[100px]">Doctor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((entry) => (
                                        <tr key={entry.id} className="ledger-row cursor-default">
                                            <td className="text-xs text-muted-foreground">{format(new Date(entry.date), 'dd/MM/yyyy')}</td>
                                            <td>
                                                <div className="font-bold">{entry.treatments?.name || entry.description}</div>
                                            </td>
                                            <td className="font-mono text-sm">${entry.total_price}</td>
                                            <td className="text-green-400 font-bold font-mono text-sm">${entry.amount_paid}</td>
                                            <td className="text-red-400 font-bold font-mono text-sm">${entry.amount_remaining}</td>
                                            <td className="text-[10px] uppercase font-bold tracking-tight opacity-70">{entry.doctor?.name || '---'}</td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-20 text-muted-foreground italic">No history available. Start by adding a treatment.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Section: Treatment Menu (Drag & Drop behavior via Click for now) */}
                <div className="col-span-4 space-y-6 sticky top-8">
                    <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
                        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-primary" />
                            Treatment Menu
                        </h3>

                        <div className="space-y-3">
                            {treatments.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => addTreatment(t)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-secondary/30 border border-border/50 hover:bg-primary/10 hover:border-primary/50 transition-all group text-left"
                                >
                                    <div className="space-y-1">
                                        <div className="text-sm font-bold group-hover:text-primary transition-colors">{t.name}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono uppercase">Std Price: ${t.price}</div>
                                    </div>
                                    <div className="bg-secondary p-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-border">
                            <p className="text-[10px] text-muted-foreground text-center italic">
                                * Click to add treatment to patient history immediately
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Sidebar */}
                    <div className="rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/5 p-6 space-y-4">
                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest">
                            <Activity className="w-4 h-4" />
                            Contract Summary
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Original Total Contract</p>
                            <p className="text-2xl font-black text-foreground">${patient.total_contract_amount}</p>
                        </div>
                        <div className="w-full h-1.5 bg-background/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary"
                                style={{ width: `${(patient.total_paid / patient.total_contract_amount) * 100}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Currently paid {((patient.total_paid / patient.total_contract_amount) * 100).toFixed(1)}% of total debt
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

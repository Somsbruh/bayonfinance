"use client";

import { useState, useEffect } from "react";
import { Search, Plus, UserPlus, X, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PatientSearch({ onSelect }: { onSelect?: (patient: any) => void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [selectionGuard, setSelectionGuard] = useState(false);
    const [newPatient, setNewPatient] = useState({ name: "", gender: "F", age: "", phone: "" });
    const router = useRouter();

    useEffect(() => {
        if (selectionGuard) {
            setSelectionGuard(false);
            return;
        }

        if (query.length > 1) {
            searchPatients();
        } else {
            setResults([]);
        }
    }, [query]);

    async function searchPatients() {
        if (!query || query.length <= 1) return;
        const { data } = await supabase
            .from('patients')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(5);
        if (data) setResults(data);
    }

    async function handleAddPatient() {
        if (!newPatient.name) return;
        const { data, error } = await supabase
            .from('patients')
            .insert({
                name: newPatient.name,
                gender: newPatient.gender,
                age: parseInt(newPatient.age) || 0,
                phone: newPatient.phone
            })
            .select()
            .single();

        if (data) {
            setIsAdding(false);
            setSelectionGuard(true);
            setQuery(data.name);
            setResults([]);
            if (onSelect) onSelect(data);

            // Always push to the patient record after registration as requested
            // and as indicated by the button title "Reify Profile & Open Records"
            router.push(`/patients/${data.id}`);
        }
    }

    return (
        <div className="relative">
            <div className="relative group">
                <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-[#A3AED0] group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search ledger or append patient..."
                    className="bg-white border border-[#E0E5F2] rounded-[1.5rem] pl-12 pr-6 py-4 text-xs font-medium text-[#1B2559] focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 lg:w-96 transition-all placeholder:text-[#A3AED0] shadow-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {/* Results Dropdown */}
            {(results.length > 0 || (query.length > 1 && !isAdding)) && (
                <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-[#E0E5F2] rounded-[2rem] shadow-2xl z-[100] overflow-hidden p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {results.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    if (onSelect) {
                                        onSelect(p);
                                        setSelectionGuard(true);
                                        setQuery(p.name);
                                        setResults([]);
                                    } else {
                                        router.push(`/patients/${p.id}`);
                                    }
                                }}
                                className="w-full flex items-center justify-between p-4 hover:bg-[#F4F7FE] rounded-[1.25rem] transition-all group text-left mb-1 last:mb-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-[#F4F7FE] border border-[#E0E5F2] flex items-center justify-center text-primary font-medium group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                        {p.name[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-[#1B2559] group-hover:text-primary transition-colors tracking-tight">{p.name}</div>
                                        <div className="text-[9px] text-[#A3AED0] font-medium uppercase tracking-widest mt-0.5">{p.gender} · {p.age} Yrs · {p.phone || 'No phone Entry'}</div>
                                    </div>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                    <Plus className="w-4 h-4 text-primary" />
                                </div>
                            </button>
                        ))}

                        {results.length === 0 && (
                            <div className="p-8 text-center space-y-4">
                                <div className="p-4 rounded-full bg-[#F4F7FE] w-fit mx-auto">
                                    <User className="w-6 h-6 text-[#A3AED0]" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-[#1B2559] uppercase tracking-widest">No clinical matches</p>
                                    <p className="text-[10px] text-[#A3AED0] font-medium mt-1">Shall we initialize a new profile for "{query}"?</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setNewPatient({ ...newPatient, name: query });
                                        setIsAdding(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-3 p-4 bg-primary text-white rounded-lg hover:bg-[#2563EB] transition-all text-[10px] font-medium uppercase tracking-[0.2em] shadow-lg shadow-primary/20"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Register "{query}"
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Add Modal Overlay */}
            {isAdding && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 space-y-10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-[#2563EB]" />

                        <button
                            onClick={() => setIsAdding(false)}
                            className="absolute top-10 right-10 p-2.5 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] hover:text-primary transition-all border border-transparent hover:border-[#E0E5F2]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-5">
                            <div className="p-4 rounded-lg bg-primary/10 text-primary shadow-inner">
                                <UserPlus className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-medium text-[#1B2559] tracking-tight">Expand Portfolio</h3>
                                <p className="text-[10px] text-[#A3AED0] font-medium uppercase tracking-widest mt-1">Registering New Patient Profile</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Legal Nomenclature</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-6 py-4 text-sm font-medium text-[#1B2559] outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                    value={newPatient.name}
                                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Gender Node</label>
                                    <select
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-6 py-4 text-sm font-medium text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all outline-none cursor-pointer"
                                        value={newPatient.gender}
                                        onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                                    >
                                        <option value="F">Female</option>
                                        <option value="M">Male</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Chronological Age</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg px-6 py-4 text-sm font-medium text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                        value={newPatient.age}
                                        onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Communication (Telegram)</label>
                                <div className="flex">
                                    <div className="bg-[#E9EDF7] border border-r-0 border-[#E0E5F2] rounded-l-2xl px-5 py-4 text-sm text-[#1B2559] font-medium">
                                        +855
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="85 705 106"
                                        className="flex-1 bg-[#F4F7FE] border border-[#E0E5F2] rounded-r-2xl px-6 py-4 text-sm font-medium text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                        value={newPatient.phone.startsWith('0') ? newPatient.phone.substring(1) : newPatient.phone}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const cleaned = val.startsWith('0') ? val.substring(1) : val;
                                            setNewPatient({ ...newPatient, phone: cleaned });
                                        }}
                                    />
                                </div>
                                <p className="text-[9px] text-[#A3AED0] font-medium italic pl-1 text-center mt-2 tracking-widest uppercase">Endpoint: t.me/+855{newPatient.phone}</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 pt-4">
                            <button
                                onClick={handleAddPatient}
                                className="w-full bg-primary hover:bg-[#2563EB] text-white py-5 rounded-[1.5rem] text-[10px] font-medium transition-all shadow-xl shadow-primary/20 uppercase tracking-[0.2em]"
                            >
                                Reify Profile & Open Records
                            </button>
                            <button
                                onClick={() => setIsAdding(false)}
                                className="w-full bg-[#F4F7FE] hover:bg-[#E9EDF7] text-[#1B2559] py-4 rounded-[1.5rem] text-[10px] font-medium transition-all uppercase tracking-widest"
                            >
                                Discard Registration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

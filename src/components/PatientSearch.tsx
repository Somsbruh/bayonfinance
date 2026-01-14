"use client";

import { useState, useEffect } from "react";
import { Search, Plus, UserPlus, X, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function PatientSearch({ onSelect }: { onSelect?: (patient: any) => void }) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newPatient, setNewPatient] = useState({ name: "", gender: "F", age: "", phone: "" });
    const router = useRouter();

    useEffect(() => {
        if (query.length > 1) {
            searchPatients();
        } else {
            setResults([]);
        }
    }, [query]);

    async function searchPatients() {
        const { data } = await supabase
            .from('patients')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(5);
        if (data) setResults(data);
    }

    async function handleAddPatient() {
        const { data, error } = await supabase
            .from('patients')
            .insert({
                name: newPatient.name,
                gender: newPatient.gender,
                age: parseInt(newPatient.age),
                phone: newPatient.phone
            })
            .select()
            .single();

        if (data) {
            setIsAdding(false);
            setQuery("");
            setResults([]);
            router.push(`/patients/${data.id}`);
        }
    }

    return (
        <div className="relative">
            <div className="relative group">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                    type="text"
                    placeholder="Search or add patient..."
                    className="bg-card border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-80 transition-all font-medium"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {/* Results Dropdown */}
            {(results.length > 0 || (query.length > 1 && !isAdding)) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden p-2 glass">
                    <div className="max-h-[300px] overflow-y-auto">
                        {results.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => {
                                    if (onSelect) onSelect(p);
                                    else router.push(`/patients/${p.id}`);
                                }}
                                className="w-full flex items-center justify-between p-3 hover:bg-primary/10 rounded-xl transition-all group text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-primary font-bold">
                                        {p.name[0]}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold group-hover:text-primary transition-colors">{p.name}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">{p.gender} · {p.age} yrs · {p.phone || 'No phone'}</div>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-4 h-4 text-primary" />
                                </div>
                            </button>
                        ))}

                        {results.length === 0 && (
                            <div className="p-4 text-center">
                                <p className="text-xs text-muted-foreground mb-3">No patient found matching "{query}"</p>
                                <button
                                    onClick={() => {
                                        setNewPatient({ ...newPatient, name: query });
                                        setIsAdding(true);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 p-3 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 transition-all text-sm font-bold"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Quick Add "{query}"
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Add Modal Overlay */}
            {isAdding && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6 relative">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="absolute top-6 right-6 p-2 hover:bg-secondary rounded-full text-muted-foreground transition-all"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                                <UserPlus className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black">Quick Add Patient</h3>
                                <p className="text-xs text-muted-foreground">Register a new patient to the clinic</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={newPatient.name}
                                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Gender</label>
                                    <select
                                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                        value={newPatient.gender}
                                        onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                                    >
                                        <option value="F">Female</option>
                                        <option value="M">Male</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Age</label>
                                    <input
                                        type="number"
                                        className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                        value={newPatient.age}
                                        onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Phone Number</label>
                                <input
                                    type="text"
                                    placeholder="012 345 678"
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                                    value={newPatient.phone}
                                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAddPatient}
                            className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl text-sm font-black transition-all shadow-lg shadow-primary/20 uppercase tracking-widest"
                        >
                            Create Patient Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

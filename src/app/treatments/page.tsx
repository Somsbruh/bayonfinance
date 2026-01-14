"use client";

import { useState, useEffect } from "react";
import {
    Stethoscope,
    Plus,
    Search,
    Tag,
    Trash2,
    Edit3,
    ChevronRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function TreatmentsPage() {
    const [treatments, setTreatments] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newTreatment, setNewTreatment] = useState({ name: "", price: "" });

    useEffect(() => {
        fetchTreatments();
    }, []);

    async function fetchTreatments() {
        const { data } = await supabase.from('treatments').select('*').order('name');
        if (data) setTreatments(data);
    }

    async function handleAdd() {
        const { error } = await supabase.from('treatments').insert({
            name: newTreatment.name,
            price: parseFloat(newTreatment.price)
        });
        if (!error) {
            setIsAdding(false);
            setNewTreatment({ name: "", price: "" });
            fetchTreatments();
        }
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black">Treatments Catalog</h1>
                    <p className="text-sm text-muted-foreground">Manage services and standard pricing</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Add Treatment
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {treatments.map((t) => (
                    <div key={t.id} className="bg-card border border-border p-6 rounded-3xl shadow-lg hover:border-primary/50 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-secondary rounded-2xl text-primary font-bold">
                                <Tag className="w-5 h-5" />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground"><Edit3 className="w-4 h-4" /></button>
                                <button className="p-2 hover:bg-red-500/10 rounded-lg text-red-500"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{t.name}</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-foreground">${t.price}</span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">USD</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground uppercase font-black tracking-tight">
                            <span>Standard Rate</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6">
                        <h3 className="text-xl font-black mb-4">Add New Treatment</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Treatment Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm"
                                    value={newTreatment.name}
                                    onChange={(e) => setNewTreatment({ ...newTreatment, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Standard Price ($)</label>
                                <input
                                    type="number"
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm"
                                    value={newTreatment.price}
                                    onChange={(e) => setNewTreatment({ ...newTreatment, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsAdding(false)} className="flex-1 bg-secondary py-4 rounded-2xl text-sm font-black uppercase">Cancel</button>
                            <button onClick={handleAdd} className="flex-1 bg-primary text-white py-4 rounded-2xl text-sm font-black uppercase shadow-lg shadow-primary/20">Save Service</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

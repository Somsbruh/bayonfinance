"use client";

import { useState, useEffect } from "react";
import {
    UserSquare2,
    Plus,
    Trash2,
    UserCheck,
    Briefcase
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", role: "Doctor" });

    useEffect(() => {
        fetchStaff();
    }, []);

    async function fetchStaff() {
        const { data } = await supabase.from('staff').select('*').order('name');
        if (data) setStaff(data);
    }

    async function handleAdd() {
        const { error } = await supabase.from('staff').insert({
            name: newStaff.name,
            role: newStaff.role
        });
        if (!error) {
            setIsAdding(false);
            setNewStaff({ name: "", role: "Doctor" });
            fetchStaff();
        }
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black">Staff & Personnel</h1>
                    <p className="text-sm text-muted-foreground">Manage doctors, assistants, and receptionists</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                >
                    <Plus className="w-5 h-5" />
                    Register Staff
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {staff.map((s) => (
                    <div key={s.id} className="bg-card border border-border p-6 rounded-3xl shadow-lg relative group">
                        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary mb-4">
                            <UserSquare2 className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-lg">{s.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <Briefcase className="w-3 h-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{s.role}</span>
                        </div>

                        <button className="absolute top-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 rounded-lg text-red-500">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-3xl w-full max-w-md shadow-2xl p-8 space-y-6">
                        <h3 className="text-xl font-black mb-4">Register New Staff</h3>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Full Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm"
                                    value={newStaff.name}
                                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Duty / Role</label>
                                <select
                                    className="w-full bg-secondary/50 border border-border rounded-xl px-4 py-3 text-sm"
                                    value={newStaff.role}
                                    onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                                >
                                    <option value="Doctor">Doctor</option>
                                    <option value="Assistant">Assistant</option>
                                    <option value="Receptionist">Receptionist</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsAdding(false)} className="flex-1 bg-secondary py-4 rounded-2xl text-sm font-black uppercase">Cancel</button>
                            <button onClick={handleAdd} className="flex-1 bg-primary text-white py-4 rounded-2xl text-sm font-black uppercase shadow-lg shadow-primary/20">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

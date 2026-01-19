"use client";

import { useState, useEffect } from "react";
import {
    Stethoscope,
    Plus,
    Search,
    Tag,
    Trash2,
    Edit3,
    ChevronRight,
    DollarSign,
    X,
    Check,
    Loader2,
    Activity
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Treatment {
    id: string;
    name: string;
    price: number;
    category: string;
    group_name: string;
    specialty_tag: string;
    intent_tag: string;
    created_at?: string;
}

const CATEGORIES = [
    "Diagnostics & Consultation",
    "Preventive Care",
    "Restorative Dentistry",
    "Endodontics",
    "Periodontal Care",
    "Oral Surgery",
    "Prosthodontics (Fixed)",
    "Prosthodontics (Removable)",
    "Implant Treatment",
    "Orthodontics",
    "Cosmetic Dentistry",
    "Pediatric Dentistry",
    "Emergency & Pain Management"
];

const SPECIALTIES = [
    "General Dentistry",
    "Endodontics",
    "Periodontics",
    "Prosthodontics",
    "Oral Surgery",
    "Orthodontics",
    "Pediatric Dentistry"
];

const INTENTS = [
    "Preventive",
    "Diagnostic",
    "Disease Control",
    "Functional Restoration",
    "Tooth Replacement",
    "Aesthetic Enhancement",
    "Pain Relief"
];

import { useBranch } from "@/context/BranchContext";

export default function TreatmentsPage() {
    const { currentBranch } = useBranch();
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newTreatment, setNewTreatment] = useState({
        name: "",
        price: "",
        category: CATEGORIES[0],
        group_name: "",
        specialty_tag: SPECIALTIES[0],
        intent_tag: INTENTS[0]
    });
    const [editingTreatment, setEditingTreatment] = useState<Treatment | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (currentBranch) fetchTreatments();
    }, [currentBranch]);

    async function fetchTreatments() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('treatments')
                .select('*')
                .eq('branch_id', currentBranch?.id)
                .order('name');

            if (error) {
                console.error("Error fetching treatments:", error);
            } else if (data) {
                setTreatments(data);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd() {
        if (!newTreatment.name || !newTreatment.price) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('treatments').insert({
                name: newTreatment.name,
                price: parseFloat(newTreatment.price),
                category: newTreatment.category,
                group_name: newTreatment.group_name,
                specialty_tag: newTreatment.specialty_tag,
                intent_tag: newTreatment.intent_tag,
                branch_id: currentBranch?.id
            });

            if (!error) {
                setIsAdding(false);
                setNewTreatment({
                    name: "",
                    price: "",
                    category: CATEGORIES[0],
                    group_name: "",
                    specialty_tag: SPECIALTIES[0],
                    intent_tag: INTENTS[0]
                });
                fetchTreatments();
            } else {
                console.error("Error adding treatment:", error);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleEdit() {
        if (!editingTreatment || !editingTreatment.name || !editingTreatment.price) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('treatments').update({
                name: editingTreatment.name,
                price: editingTreatment.price,
                category: editingTreatment.category,
                group_name: editingTreatment.group_name,
                specialty_tag: editingTreatment.specialty_tag,
                intent_tag: editingTreatment.intent_tag
            }).eq('id', editingTreatment.id);

            if (!error) {
                setIsEditing(false);
                setEditingTreatment(null);
                fetchTreatments();
            } else {
                console.error("Error updating treatment:", error);
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Confirm removal of this clinical procedure? This action is restricted if historical records are present.")) return;

        try {
            const { error } = await supabase.from('treatments').delete().eq('id', id);
            if (!error) {
                setTreatments(prev => prev.filter(t => t.id !== id));
            } else {
                alert("Integrity Violation: This treatment is cross-referenced in active ledger entries.");
            }
        } catch (err) {
            console.error("Deletion error:", err);
            alert("A system error occurred during deletion.");
        }
    }

    const filteredTreatments = treatments.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.specialty_tag?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedTreatments = CATEGORIES.reduce((acc, category) => {
        const filtered = filteredTreatments.filter(t => t.category === category);
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {} as Record<string, Treatment[]>);

    return (
        <div className="space-y-12 pb-24">
            {/* Header Module */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 text-[#A3AED0] font-black text-[10px] uppercase tracking-[0.2em]">
                        <Activity className="w-4 h-4" />
                        Clinical Lexicon
                    </div>
                    <h1 className="text-4xl font-black text-[#1B2559] tracking-tight">Procedural Catalog</h1>
                    <p className="text-sm font-bold text-[#707EAE]">Standardized dental treatments with industrial pricing benchmarks</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Filter clinical terminology..."
                            className="bg-white border border-[#E0E5F2] rounded-[1.5rem] pl-12 pr-6 py-4 text-xs font-bold text-[#1B2559] focus:outline-none focus:ring-4 focus:ring-primary/5 w-64 lg:w-80 transition-all placeholder:text-[#A3AED0] shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="bg-primary hover:bg-[#3311DB] text-white px-8 py-5 rounded-[1.5rem] text-[10px] font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/25 active:scale-95 group uppercase tracking-[0.2em]"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                        Define Service
                    </button>
                </div>
            </div>

            {/* Catalog Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-[240px] bg-white rounded-[2.5rem] border border-[#E0E5F2] animate-pulse shadow-sm" />
                    ))}
                </div>
            ) : filteredTreatments.length > 0 ? (
                <div className="space-y-16 px-4">
                    {Object.entries(groupedTreatments).map(([category, items]) => (
                        <div key={category} className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-gradient-to-r from-[#E0E5F2] to-transparent" />
                                <h2 className="text-sm font-black text-[#A3AED0] uppercase tracking-[0.3em]">{category}</h2>
                                <div className="h-px flex-1 bg-gradient-to-l from-[#E0E5F2] to-transparent" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {items.map((t) => (
                                    <div
                                        key={t.id}
                                        className="group relative bg-white border border-[#E0E5F2] hover:border-primary/40 transition-all duration-500 rounded-2xl p-6 flex flex-col items-start shadow-sm hover:shadow-xl hover:shadow-primary/5 overflow-hidden"
                                    >
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#F4F7FE] rounded-full group-hover:bg-primary/5 transition-colors duration-500 -z-0" />

                                        <div className="relative z-10 w-full flex items-start justify-between mb-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="p-2.5 bg-[#F4F7FE] rounded-xl text-primary font-bold group-hover:bg-primary group-hover:text-white transition-all duration-500 border border-[#E0E5F2] group-hover:border-primary self-start">
                                                    <Tag className="w-4 h-4" />
                                                </div>
                                                <span className="text-[8px] font-black text-[#A3AED0] uppercase tracking-[0.2em]">{t.group_name}</span>
                                            </div>
                                            <div className="flex gap-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => {
                                                        setEditingTreatment(t);
                                                        setIsEditing(true);
                                                    }}
                                                    className="p-2.5 bg-white border border-[#E0E5F2] hover:bg-primary hover:border-primary rounded-xl text-[#A3AED0] hover:text-white transition-all shadow-md active:scale-90"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(t.id)}
                                                    className="p-2.5 bg-white border border-[#E0E5F2] hover:bg-red-500 hover:border-red-500 rounded-xl text-[#A3AED0] hover:text-white transition-all shadow-md active:scale-90"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative z-10 space-y-3 flex-1">
                                            <div className="space-y-1">
                                                <h3 className="font-black text-lg text-[#1B2559] group-hover:text-primary transition-colors tracking-tight leading-tight">{t.name}</h3>
                                                <div className="flex gap-1.5">
                                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/5 text-primary text-[7px] font-black uppercase tracking-wider">{t.specialty_tag}</span>
                                                    <span className="px-1.5 py-0.5 rounded-md bg-green-500/5 text-green-600 text-[7px] font-black uppercase tracking-wider">{t.intent_tag}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-baseline gap-1.5">
                                                <span className="text-2xl font-black text-[#1B2559] tracking-tighter group-hover:scale-105 transition-transform origin-left duration-300">${t.price}</span>
                                                <span className="text-[8px] text-[#A3AED0] font-black uppercase tracking-[0.2em]">USD</span>
                                            </div>
                                        </div>

                                        <div className="relative z-10 w-full mt-6 pt-4 border-t border-[#F4F7FE] flex items-center justify-between">
                                            <span className="text-[7px] font-black text-[#A3AED0] uppercase tracking-[0.2em]">Clinical Auth Ref: {t.id.substring(0, 8).toUpperCase()}</span>
                                            <div className="w-6 h-6 rounded-full bg-[#F4F7FE] flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all group-hover:scale-110">
                                                <ChevronRight className="w-3 h-3" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-[#E0E5F2] p-24 rounded-[3rem] flex flex-col items-center text-center mx-4">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-[#F4F7FE] flex items-center justify-center mb-8 shadow-inner border border-[#E0E5F2]">
                        <Stethoscope className="w-10 h-10 text-[#A3AED0]" />
                    </div>
                    <h3 className="text-2xl font-black text-[#1B2559] mb-3 tracking-tight">Procedural Gap Identified</h3>
                    <p className="text-sm font-bold text-[#707EAE] max-w-sm">No clinical services found matching your current parameters. Define a new procedure to expand the catalog.</p>
                </div>
            )}

            {/* Advanced Modal System */}
            {(isAdding || isEditing) && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-[#E0E5F2] rounded-[2rem] w-full max-w-lg shadow-2xl p-6 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-purple-500 to-primary" />

                        <button
                            onClick={() => { setIsAdding(false); setIsEditing(false); }}
                            className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-primary transition-all border border-[#E0E5F2]"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-xl bg-primary/10 text-primary shadow-inner">
                                {isAdding ? <Plus className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#1B2559] tracking-tight">{isAdding ? "Add" : "Refine"} Service</h3>
                                <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest leading-none mt-1">Clinical Catalog Entry</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Clinical Label</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3 text-xs font-bold text-[#1B2559] outline-none transition-all placeholder:text-[#94A3B8]"
                                    value={isAdding ? newTreatment.name : editingTreatment?.name || ""}
                                    onChange={(e) => isAdding
                                        ? setNewTreatment({ ...newTreatment, name: e.target.value })
                                        : setEditingTreatment(prev => prev ? { ...prev, name: e.target.value } : null)
                                    }
                                    placeholder="Procedural Nomenclature..."
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Category</label>
                                <select
                                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3 text-[10px] font-bold text-[#1B2559] outline-none cursor-pointer"
                                    value={isAdding ? newTreatment.category : editingTreatment?.category || ""}
                                    onChange={(e) => isAdding
                                        ? setNewTreatment({ ...newTreatment, category: e.target.value })
                                        : setEditingTreatment(prev => prev ? { ...prev, category: e.target.value } : null)
                                    }
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Group</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3 text-[10px] font-bold text-[#1B2559] outline-none"
                                    value={isAdding ? newTreatment.group_name : editingTreatment?.group_name || ""}
                                    onChange={(e) => isAdding
                                        ? setNewTreatment({ ...newTreatment, group_name: e.target.value })
                                        : setEditingTreatment(prev => prev ? { ...prev, group_name: e.target.value } : null)
                                    }
                                    placeholder="e.g. hygiene"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Specialty</label>
                                <select
                                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3 text-[10px] font-bold text-[#1B2559] outline-none cursor-pointer"
                                    value={isAdding ? newTreatment.specialty_tag : editingTreatment?.specialty_tag || ""}
                                    onChange={(e) => isAdding
                                        ? setNewTreatment({ ...newTreatment, specialty_tag: e.target.value })
                                        : setEditingTreatment(prev => prev ? { ...prev, specialty_tag: e.target.value } : null)
                                    }
                                >
                                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Intent</label>
                                <select
                                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3 text-[10px] font-bold text-[#1B2559] outline-none cursor-pointer"
                                    value={isAdding ? newTreatment.intent_tag : editingTreatment?.intent_tag || ""}
                                    onChange={(e) => isAdding
                                        ? setNewTreatment({ ...newTreatment, intent_tag: e.target.value })
                                        : setEditingTreatment(prev => prev ? { ...prev, intent_tag: e.target.value } : null)
                                    }
                                >
                                    {INTENTS.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>

                            <div className="col-span-2 space-y-1.5">
                                <label className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest pl-1 block text-center">Procedural Valuation (USD)</label>
                                <div className="relative">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-primary font-black opacity-30">$</div>
                                    <input
                                        type="number"
                                        className="w-full bg-[#F4F7FE] border-none rounded-2xl px-12 py-4 text-2xl font-black text-[#1B2559] outline-none text-center"
                                        value={isAdding ? newTreatment.price : editingTreatment?.price || 0}
                                        onChange={(e) => isAdding
                                            ? setNewTreatment({ ...newTreatment, price: e.target.value })
                                            : setEditingTreatment(prev => prev ? { ...prev, price: Number(e.target.value) } : null)
                                        }
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                                className="flex-1 bg-[#F4F7FE] hover:bg-[#E9EDF7] text-[#1B2559] py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isAdding ? handleAdd : handleEdit}
                                disabled={submitting}
                                className="flex-[2] bg-primary hover:bg-[#3311DB] text-white py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {isAdding ? "Publish Service" : "Confirm Refinement"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

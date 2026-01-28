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
    Activity,
    Clock,
    Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TREATMENT_CATEGORIES, getCategoryColor } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useBranch } from "@/context/BranchContext";

interface Treatment {
    id: string;
    name: string;
    price: number;
    category: string;
    duration_minutes: number;
    created_at?: string;
}

const CATEGORIES = TREATMENT_CATEGORIES;

export default function TreatmentsPage() {
    const { currentBranch } = useBranch();
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [newTreatment, setNewTreatment] = useState({
        name: "",
        price: "",
        category: CATEGORIES[0],
        duration_minutes: "15"
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
                duration_minutes: parseInt(newTreatment.duration_minutes),
                branch_id: currentBranch?.id
            });

            if (!error) {
                setIsAdding(false);
                setNewTreatment({
                    name: "",
                    price: "",
                    category: CATEGORIES[0],
                    duration_minutes: "15"
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
                duration_minutes: editingTreatment.duration_minutes
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
                setIsEditing(false);
                setEditingTreatment(null);
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
        t.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupedTreatments = CATEGORIES.reduce((acc, category) => {
        const filtered = filteredTreatments.filter(t => t.category === category);
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {} as Record<string, Treatment[]>);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header Module - Standardized */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                    <h1 className="h1-premium">Treatment Catalog</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 min-w-[300px] group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#A3AED0] group-focus-within:text-[#4318FF] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search clinical terminology..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-[#E0E5F2] rounded-[20px] pl-11 pr-4 py-3.5 text-[12px] font-bold text-[#1B2559] shadow-sm focus:border-[#4318FF]/30 transition-all outline-none placeholder:text-[#A3AED0]"
                        />
                    </div>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="btn-primary-premium h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                        New Service
                    </button>
                </div>
            </div>

            {/* Catalog Grid - Refactored to High Density Tables */}
            <div className="space-y-6">
                {loading ? (
                    <div className="grid grid-cols-1 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-40 bg-white rounded-[24px] border border-[#E0E5F2] animate-pulse shadow-sm" />
                        ))}
                    </div>
                ) : filteredTreatments.length > 0 ? (
                    <div className="space-y-8">
                        {Object.entries(groupedTreatments).map(([category, items]) => (
                            <div key={category} className="space-y-4">
                                <div className="flex items-center gap-4 px-4 pt-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCategoryColor(category) }} />
                                    <h2 className="caption-premium">{category}</h2>
                                    <div className="h-[1px] flex-1 bg-[#E0E5F2]/50" />
                                    <span className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest opacity-40">{items.length} units</span>
                                </div>

                                <div className="bg-white rounded-[24px] overflow-hidden border border-[#E0E5F2] shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-[#F4F7FE]">
                                                    <th className="px-5 py-5 text-[11px] font-black text-[#A3AED0] uppercase tracking-widest w-[40%]">Procedure Name</th>
                                                    <th className="px-5 py-5 text-[11px] font-black text-[#A3AED0] uppercase tracking-widest w-[20%]">Duration</th>
                                                    <th className="px-5 py-5 text-[11px] font-black text-[#A3AED0] uppercase tracking-widest w-[25%]">Price (USD)</th>
                                                    <th className="px-5 py-5 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#F4F7FE]">
                                                {items.map((t) => (
                                                    <tr
                                                        key={t.id}
                                                        className="hover:bg-[#F4F7FE]/20 transition-colors group cursor-pointer"
                                                        onClick={() => {
                                                            setEditingTreatment(t);
                                                            setIsEditing(true);
                                                        }}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-4">
                                                                <div
                                                                    className="w-1.5 h-6 rounded-full"
                                                                    style={{ backgroundColor: getCategoryColor(t.category) }}
                                                                />
                                                                <span className="text-[12px] font-black text-[#1B2559] leading-tight font-kantumruy">{t.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-2 text-[#A3AED0]">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                <span className="text-[12px] font-bold text-[#1B2559]">{t.duration_minutes} min</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span className="text-[12px] font-black text-[#1B2559] block tracking-tight">${t.price.toLocaleString()}</span>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="w-8 h-8 rounded-xl bg-white border border-[#E0E5F2] flex items-center justify-center text-[#A3AED0] hover:bg-[#4318FF] hover:text-white hover:border-[#4318FF] opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                                                                <ChevronRight className="w-4 h-4" />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-[#E0E5F2] p-24 rounded-[32px] flex flex-col items-center text-center mx-4">
                        <div className="w-20 h-20 rounded-full bg-[#F4F7FE] flex items-center justify-center mb-6 shadow-inner border border-[#E0E5F2]">
                            <Stethoscope className="w-10 h-10 text-[#A3AED0]" />
                        </div>
                        <h3 className="text-xl font-black text-[#1B2559] mb-2 tracking-tight">Procedural Gap Identified</h3>
                        <p className="text-xs font-bold text-[#707EAE] max-w-sm">No clinical services found matching your current parameters. Define a new procedure to expand the catalog.</p>
                    </div>
                )}
            </div>

            {/* Modal System - Standardized */}
            {(isAdding || isEditing) && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-[#E0E5F2] rounded-[24px] w-full max-w-md shadow-2xl p-8 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#4318FF]" />

                        <button
                            onClick={() => { setIsAdding(false); setIsEditing(false); }}
                            className="absolute top-6 right-6 p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-[#4318FF] transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#4318FF]/10 text-[#4318FF] flex items-center justify-center shadow-inner">
                                {isAdding ? <Plus className="w-6 h-6" /> : <Edit3 className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-[#1B2559] tracking-tight">{isAdding ? "Create" : "Refine"} Service</h3>
                                <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest mt-1">Clinical Catalog Entry</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Procedure Name</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#F4F7FE] border-none rounded-xl px-4 py-3 text-[12px] font-bold text-[#1B2559] outline-none transition-all placeholder:text-[#94A3B8] focus:ring-2 focus:ring-[#4318FF]/10"
                                    value={isAdding ? newTreatment.name : editingTreatment?.name || ""}
                                    onChange={(e) => isAdding
                                        ? setNewTreatment({ ...newTreatment, name: e.target.value })
                                        : setEditingTreatment(prev => prev ? { ...prev, name: e.target.value } : null)
                                    }
                                    placeholder="Procedural Nomenclature..."
                                />
                            </div>

                            <div className="space-y-1.5 relative">
                                <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Clinical Category</label>
                                <div
                                    className="w-full bg-[#F4F7FE] rounded-xl px-4 py-3 cursor-pointer flex items-center justify-between group"
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                >
                                    {(isAdding ? newTreatment.category : editingTreatment?.category) ? (
                                        <div
                                            className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm inline-block"
                                            style={{ backgroundColor: getCategoryColor(isAdding ? newTreatment.category : editingTreatment?.category || "") }}
                                        >
                                            {isAdding ? newTreatment.category : editingTreatment?.category}
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-[#A3AED0]">Select Category...</span>
                                    )}
                                    <ChevronRight className={cn("w-4 h-4 text-[#A3AED0] transition-transform", isCategoryDropdownOpen && "rotate-90")} />
                                </div>

                                {isCategoryDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-[160]" onClick={() => setIsCategoryDropdownOpen(false)} />
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-2xl shadow-xl z-[170] p-3 animate-in fade-in zoom-in-95 duration-200">
                                            <div className="flex flex-wrap gap-2">
                                                {CATEGORIES.map(category => (
                                                    <button
                                                        key={category}
                                                        onClick={() => {
                                                            if (isAdding) {
                                                                setNewTreatment({ ...newTreatment, category });
                                                            } else {
                                                                setEditingTreatment(prev => prev ? { ...prev, category } : null);
                                                            }
                                                            setIsCategoryDropdownOpen(false);
                                                        }}
                                                        className={cn(
                                                            "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                                            (isAdding ? newTreatment.category === category : editingTreatment?.category === category)
                                                                ? "text-white shadow-md border-transparent"
                                                                : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:bg-[#F4F7FE]"
                                                        )}
                                                        style={{
                                                            backgroundColor: (isAdding ? newTreatment.category === category : editingTreatment?.category === category) ? getCategoryColor(category) : undefined,
                                                        }}
                                                    >
                                                        {category}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Valuation (USD)</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4318FF] font-black opacity-30 text-[12px]">$</div>
                                        <input
                                            type="number"
                                            className="w-full bg-[#F4F7FE] border-none rounded-xl px-8 py-3 text-[14px] font-black text-[#1B2559] outline-none"
                                            value={isAdding ? newTreatment.price : editingTreatment?.price || 0}
                                            onChange={(e) => isAdding
                                                ? setNewTreatment({ ...newTreatment, price: e.target.value })
                                                : setEditingTreatment(prev => prev ? { ...prev, price: Number(e.target.value) } : null)
                                            }
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Duration (Min)</label>
                                    <div className="relative">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A3AED0] w-3.5 h-3.5" />
                                        <input
                                            type="number"
                                            className="w-full bg-[#F4F7FE] border-none rounded-xl px-10 py-3 text-[14px] font-black text-[#1B2559] outline-none"
                                            value={isAdding ? newTreatment.duration_minutes : editingTreatment?.duration_minutes || 0}
                                            onChange={(e) => isAdding
                                                ? setNewTreatment({ ...newTreatment, duration_minutes: e.target.value })
                                                : setEditingTreatment(prev => prev ? { ...prev, duration_minutes: Number(e.target.value) } : null)
                                            }
                                            placeholder="Min..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            {isEditing && (
                                <button
                                    onClick={() => editingTreatment && handleDelete(editingTreatment.id)}
                                    className="p-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors shrink-0"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => { setIsAdding(false); setIsEditing(false); }}
                                className="flex-1 bg-[#F4F7FE] hover:bg-[#E9EDF7] text-[#1B2559] py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isAdding ? handleAdd : handleEdit}
                                disabled={submitting}
                                className="flex-[2] bg-[#4318FF] hover:bg-[#3311E0] text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-md shadow-[#4318FF]/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {isAdding ? "Create Service" : "Confirm Update"}
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


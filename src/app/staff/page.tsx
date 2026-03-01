"use client";

import { useState, useEffect } from "react";
import {
    UserSquare2,
    Plus,
    Trash2,
    Briefcase,
    Edit3,
    Search,
    Percent,
    X,
    Check,
    Loader2,
    Lock,
    History,
    Calendar,
    ArrowLeft,
    ChevronDown,
    ArrowUpRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Staff {
    id: string;
    name: string;
    role: string;
    commission_rate: number;
    created_at?: string;
}

import { useBranch } from "@/context/BranchContext";

export default function StaffPage() {
    const { currentBranch } = useBranch();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterRole, setFilterRole] = useState("All");
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: "", role: "Doctor", commission_rate: 0 });
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Portfolio / Folder States
    const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);
    const [staffActivity, setStaffActivity] = useState<any[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [portfolioSearch, setPortfolioSearch] = useState("");

    useEffect(() => {
        if (currentBranch) fetchStaff();
    }, [currentBranch]);

    async function fetchStaff() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('staff')
                .select('*')
                .eq('branch_id', currentBranch?.id)
                .order('name');

            if (error) {
                console.error("Error fetching staff:", error);
            } else if (data) {
                setStaff(data);
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd() {
        if (!newStaff.name) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('staff').insert({
                name: newStaff.name,
                role: newStaff.role,
                commission_rate: newStaff.commission_rate,
                branch_id: currentBranch?.id
            });

            if (!error) {
                setIsAdding(false);
                setNewStaff({ name: "", role: "Doctor", commission_rate: 0 });
                fetchStaff();
            } else {
                console.error("Error adding staff:", error);
                alert("Failed to add staff. Integrity check failed.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Decomissioning this personnel? Historical data will remain, but the entity will be removed from selection.")) return;

        try {
            const { error } = await supabase.from('staff').delete().eq('id', id);
            if (!error) {
                // Optimistic UI update/State sync
                setStaff(prev => prev.filter(s => s.id !== id));
                // If the deleted person was being viewed, close the drawer
                if (viewingStaff?.id === id) setViewingStaff(null);
            } else {
                alert("Execution Reference Violation: Personnel is currently linked to processed clinical entries.");
            }
        } catch (err) {
            console.error("Deletion error:", err);
            alert("A system error occurred during deletion.");
        }
    }

    async function fetchPortfolio(s: Staff) {
        setViewingStaff(s);
        setActivityLoading(true);
        setPortfolioSearch(""); // Reset search when opening new folder
        try {
            const { data, error } = await supabase
                .from('ledger_entries')
                .select(`
                    *,
                    patients (name, gender, age),
                    treatments (name)
                `)
                .eq('doctor_id', s.id)
                .order('date', { ascending: false });

            if (data) {
                setStaffActivity(data);
            } else {
                setStaffActivity([]);
            }
        } finally {
            setActivityLoading(false);
        }
    }

    async function handleEdit() {
        if (!editingStaff || !editingStaff.name) return;
        setSubmitting(true);
        try {
            const { error } = await supabase.from('staff').update({
                name: editingStaff.name,
                role: editingStaff.role,
                commission_rate: editingStaff.commission_rate
            }).eq('id', editingStaff.id);

            if (!error) {
                setIsEditing(false);
                setEditingStaff(null);
                fetchStaff();
            } else {
                console.error("Error updating staff:", error);
            }
        } finally {
            setSubmitting(false);
        }
    }

    const filteredStaff = staff.filter(s => {
        const matchesSearch = s.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === "All" || s.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const filteredActivity = staffActivity.filter(a => {
        if (!portfolioSearch) return true;
        const pName = a.patients?.name?.toLowerCase() || "";
        const tName = a.treatments?.name?.toLowerCase() || "";
        const search = portfolioSearch.toLowerCase();

        // This handles "last name" or any part of the name
        return pName.includes(search) || tName.includes(search);
    });

    const roles = ["All", "Doctor", "Assistant", "Receptionist", "Admin"];
    const actualRoles = ["Doctor", "Assistant", "Receptionist", "Admin"];

    const staffStats = actualRoles.map(role => ({
        role,
        count: staff.filter(s => s.role === role).length
    }));



    return (
        <div className="space-y-6 pb-6 px-4 lg:px-0 relative">
            {/* Onboard Personnel Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-[#E0E5F2] rounded-[2.5rem] w-full max-w-lg shadow-2xl p-10 space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary to-purple-600" />

                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-medium text-[#1B2559]">Onboard Personnel</h3>
                            <button onClick={() => setIsAdding(false)} className="p-2 text-[#A3AED0] hover:text-primary transition-colors"><X className="w-6 h-6" /></button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Full Name</label>
                                <input
                                    className="w-full bg-[#F4F7FE] border-none rounded-lg px-5 py-3 font-medium text-[#1B2559] outline-none focus:ring-2 ring-primary/20"
                                    value={newStaff.name}
                                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                    placeholder="e.g. Dr. Soms"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Role</label>
                                    <select
                                        className="w-full bg-[#F4F7FE] border-none rounded-lg px-5 py-3 font-medium text-[#1B2559] outline-none appearance-none cursor-pointer"
                                        value={newStaff.role}
                                        onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                                    >
                                        <option value="Doctor">Doctor</option>
                                        <option value="Assistant">Assistant</option>
                                        <option value="Receptionist">Receptionist</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Commission (%)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-[#F4F7FE] border-none rounded-lg px-5 py-3 font-medium text-[#1B2559] outline-none focus:ring-2 ring-primary/20"
                                        value={newStaff.commission_rate}
                                        onChange={(e) => setNewStaff({ ...newStaff, commission_rate: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleAdd}
                                disabled={submitting}
                                className="w-full bg-primary text-white py-4 rounded-lg font-medium uppercase tracking-[0.2em] hover:bg-[#2563EB] transition-all shadow-lg shadow-primary/25 mt-4"
                            >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Confirm Onboarding"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header Module */}
            <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#A3AED0] font-medium text-[8px] uppercase tracking-[0.2em]">
                        <UserSquare2 className="w-3 h-3 text-primary" />
                        Human Resources
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h1 className="text-2xl font-medium text-[#1B2559] tracking-tight">Staff Directory</h1>
                        <p className="text-[10px] font-medium text-[#707EAE] hidden md:block">Orchestrate clinical performance metrics</p>
                    </div>
                </div>
            </div>

            {/* Filter Module */}
            <div className="bg-white border border-[#E0E5F2] p-2.5 rounded-[1.5rem] flex flex-wrap items-center gap-3 shadow-sm">
                <div className="relative flex-1 min-w-[200px] group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0] group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search personnel..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-12 pr-4 py-2 text-[11px] font-medium text-[#1B2559] focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all placeholder:text-[#A3AED0]"
                    />
                </div>

                <div className="flex items-center gap-1.5 bg-[#F4F7FE] p-1 rounded-lg border border-[#E0E5F2] overflow-x-auto no-scrollbar">
                    {roles.map(role => {
                        const count = role === 'All' ? staff.length : staff.filter(s => s.role === role).length;
                        return (
                            <button
                                key={role}
                                onClick={() => setFilterRole(role)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2",
                                    filterRole === role
                                        ? "bg-white text-primary shadow-sm border-[#E0E5F2]"
                                        : "text-[#A3AED0] hover:text-[#1B2559]"
                                )}
                            >
                                {role}
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[8px] font-medium",
                                    filterRole === role ? "bg-primary/5 text-primary" : "bg-white text-[#A3AED0]"
                                )}>{count}</span>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg text-[9px] font-medium flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20 active:scale-95 group uppercase tracking-widest shrink-0"
                >
                    <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-300" />
                    Onboard
                </button>
            </div>

            {/* Personnel Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="h-[340px] bg-white rounded-[2.5rem] border border-[#E0E5F2] animate-pulse shadow-sm" />
                    ))}
                </div>
            ) : filteredStaff.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredStaff.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => s.role === 'Doctor' ? fetchPortfolio(s) : null}
                            className={cn(
                                "group relative bg-white border border-[#E0E5F2] hover:border-primary/40 transition-all duration-500 rounded-lg p-6 flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:shadow-primary/5 overflow-hidden",
                                s.role === 'Doctor' ? "cursor-pointer active:scale-[0.98]" : "cursor-default"
                            )}
                        >
                            {/* Role Badge */}
                            <div className={cn(
                                "absolute top-6 left-6 text-[8px] font-medium uppercase tracking-[0.15em] px-2.5 py-1 rounded-full border shadow-sm",
                                s.role === 'Doctor' ? 'bg-blue-50 text-blue-500 border-blue-100' :
                                    s.role === 'Admin' ? 'bg-purple-50 text-purple-500 border-purple-100' :
                                        s.role === 'Assistant' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                            'bg-orange-50 text-orange-500 border-orange-100'
                            )}>
                                {s.role}
                            </div>

                            {/* Actions Overlay */}
                            <div className="absolute top-6 right-6 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingStaff(s);
                                        setIsEditing(true);
                                    }}
                                    className="p-2.5 bg-white border border-[#E0E5F2] hover:bg-primary hover:border-primary rounded-lg text-[#A3AED0] hover:text-white transition-all shadow-md active:scale-90"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(s.id);
                                    }}
                                    className="p-2.5 bg-white border border-[#E0E5F2] hover:bg-red-500 hover:border-red-500 rounded-lg text-[#A3AED0] hover:text-white transition-all shadow-md active:scale-90"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Identity Circle */}
                            <div className="relative mt-6 mb-6">
                                <div className="w-20 h-20 rounded-lg bg-[#F4F7FE] flex items-center justify-center text-primary shadow-inner border border-[#E0E5F2] group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-105 group-hover:rotate-3">
                                    <UserSquare2 className="w-10 h-10" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-lg border border-[#E0E5F2] flex items-center justify-center shadow-lg">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                </div>
                            </div>

                            <div className="space-y-1 mb-6">
                                <h3 className="font-medium text-xl text-[#1B2559] group-hover:text-primary transition-colors tracking-tight line-clamp-1 px-2">{s.name}</h3>
                                <div className="flex items-center justify-center gap-2 text-[#707EAE]">
                                    <Briefcase className="w-2.5 h-2.5" />
                                    <span className="text-[8px] font-medium tracking-widest uppercase">{s.role} Portfolio</span>
                                </div>
                            </div>

                            {/* Performance Matrix Panel */}
                            <div className="w-full bg-[#F4F7FE] rounded-lg p-4 border border-[#E0E5F2] flex justify-between items-center group-hover:bg-[#E9EDF7] transition-colors">
                                <div className="text-left space-y-0.5">
                                    <p className="text-[8px] text-[#A3AED0] font-medium uppercase tracking-[0.15em]">Service Status</p>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)] animate-pulse" />
                                        <span className="text-[10px] font-medium text-[#1B2559]">Active</span>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-[#E0E5F2]" />
                                <div className="text-right space-y-0.5 min-w-[70px]">
                                    {s.role === 'Doctor' ? (
                                        <>
                                            <p className="text-[8px] text-[#A3AED0] font-medium uppercase tracking-[0.15em]">Open Folder</p>
                                            <div className="inline-flex px-2 py-0.5 bg-primary text-white rounded-lg shadow-lg shadow-primary/20 group-hover:bg-[#2563EB]">
                                                <History className="w-3 h-3" />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Lock className="w-3 h-3 text-[#A3AED0] mb-0.5" />
                                            <p className="text-[7px] text-[#A3AED0] font-medium uppercase tracking-tighter">Restricted</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white border-2 border-dashed border-[#E0E5F2] p-24 rounded-[3rem] flex flex-col items-center text-center mx-4">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-[#F4F7FE] flex items-center justify-center mb-8 shadow-inner border border-[#E0E5F2]">
                        <UserSquare2 className="w-10 h-10 text-[#A3AED0]" />
                    </div>
                    <h3 className="text-2xl font-medium text-[#1B2559] mb-3 tracking-tight">Personnel Search Depleted</h3>
                    <p className="text-sm font-medium text-[#707EAE] max-w-sm">No team members correspond with the current filtration. Reset parameters or onboard new personnel.</p>
                    <button
                        onClick={() => { setSearchTerm(""); setFilterRole("All"); }}
                        className="mt-10 bg-primary/10 text-primary px-8 py-4 rounded-lg text-[10px] font-medium uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm active:scale-95"
                    >
                        Reset System Filters
                    </button>
                </div>
            )}

            {/* Personnel Detailed Portfolio / Folder Drawer */}
            {viewingStaff && (
                <div className="fixed inset-0 z-[200] flex items-stretch justify-end bg-[#1B2559]/30 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-[#F4F7FE] shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 relative">
                        {/* Drawer Header */}
                        <div className="bg-white p-10 border-b border-[#E0E5F2] space-y-8">
                            <button
                                onClick={() => setViewingStaff(null)}
                                className="flex items-center gap-2 text-[#A3AED0] hover:text-primary transition-colors font-medium text-[10px] uppercase tracking-widest"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Return to Directory
                            </button>

                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-[2rem] bg-[#F4F7FE] flex items-center justify-center text-primary border border-[#E0E5F2]">
                                    <UserSquare2 className="w-10 h-10" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-medium text-[#1B2559] tracking-tight">{viewingStaff.name}</h2>
                                        <span className="bg-primary/10 text-primary text-[9px] font-medium px-3 py-1 rounded-full uppercase tracking-widest border border-primary/10">
                                            {viewingStaff.role}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-[#707EAE]">Clinical Portfolio & Chronological Record History</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-4">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] group-focus-within:text-primary" />
                                    <input
                                        type="text"
                                        placeholder="Filter patients by name or procedure..."
                                        value={portfolioSearch}
                                        onChange={(e) => setPortfolioSearch(e.target.value)}
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg pl-14 pr-6 py-4 text-xs font-medium text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                    />
                                </div>
                                <div className="bg-[#F4F7FE] rounded-lg px-6 py-4 border border-[#E0E5F2] flex items-center gap-3">
                                    <Calendar className="w-4 h-4 text-[#A3AED0]" />
                                    <span className="text-[10px] font-medium text-[#1B2559] uppercase tracking-widest">All Time Activity</span>
                                </div>
                            </div>
                        </div>

                        {/* Activity Feed */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-6 custom-scrollbar">
                            {activityLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                    <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-[0.2em]">Synchronizing Portfolio...</p>
                                </div>
                            ) : filteredActivity.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredActivity.map((a, idx) => (
                                        <div key={a.id} className="bg-white border border-[#E0E5F2] rounded-3xl p-6 flex items-center justify-between hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all group">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-lg bg-[#F4F7FE] flex flex-col items-center justify-center text-center group-hover:bg-primary group-hover:text-white transition-all">
                                                    <span className="text-[9px] font-medium uppercase opacity-60 leading-none">Day</span>
                                                    <span className="text-xl font-medium leading-tight">{new Date(a.date).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-[#1B2559] group-hover:text-primary transition-colors">{a.patients?.name}</span>
                                                        <span className="text-[9px] font-medium text-[#A3AED0] uppercase bg-[#F4F7FE] px-2 py-0.5 rounded border border-[#E0E5F2]">
                                                            {a.patients?.gender} · {a.patients?.age}Y
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-medium text-[#707EAE] mt-0.5">{a.treatments?.name || a.description}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div className="hidden sm:block">
                                                    <p className="text-[9px] text-[#A3AED0] font-medium uppercase tracking-widest whitespace-nowrap">Session Worth</p>
                                                    <p className="text-lg font-medium text-[#1B2559] tracking-tight">${Number(a.total_price).toFixed(2)}</p>
                                                </div>
                                                <div className="w-12 h-12 rounded-lg bg-[#F4F7FE] flex items-center justify-center text-[#A3AED0] group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                                    <ArrowUpRight className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 opacity-60">
                                    <div className="w-20 h-20 rounded-[2rem] bg-white border border-[#E0E5F2] flex items-center justify-center">
                                        <History className="w-8 h-8 text-[#A3AED0]" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-medium text-[#1B2559]">Portfolio Tabula Rasa</p>
                                        <p className="text-xs font-medium text-[#A3AED0] max-w-[240px] mx-auto">No clinical interactions identified for this personnel under current search parameters.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer / Summary */}
                        <div className="bg-white p-10 border-t border-[#E0E5F2] flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[9px] text-[#A3AED0] font-medium uppercase tracking-[0.2em]">Clinical Retention</p>
                                <p className="text-2xl font-medium text-[#1B2559]">{filteredActivity.length} <span className="text-xs text-[#A3AED0] font-medium uppercase ml-1">Sessions</span></p>
                            </div>
                            <button
                                onClick={() => setViewingStaff(null)}
                                className="bg-[#1B2559] text-white px-10 py-5 rounded-[1.5rem] text-[10px] font-medium uppercase tracking-[0.2em] hover:bg-black transition-all shadow-xl shadow-black/10 active:scale-95"
                            >
                                Close Detailed Folder
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

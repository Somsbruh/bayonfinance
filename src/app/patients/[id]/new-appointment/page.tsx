"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft,
    Search,
    Clock,
    Calendar,
    User,
    Check,
    X,
    ChevronRight,
    Activity,
    DollarSign,
    Plus,
    Trash2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useCurrency } from "@/context/CurrencyContext";
import { useBranch } from "@/context/BranchContext";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const CATEGORIES = [
    "Diagnostics",
    "Preventive",
    "Restorative",
    "Endodontics",
    "Periodontics",
    "Oral Surgery",
    "Prosthodontics",
    "Implant Treatment",
    "Orthodontics",
    "Cosmetics",
    "Pediatrics",
    "Emergency"
];

const FILTER_COLORS: Record<string, string> = {
    "Diagnostics": "#4A90E2",
    "Preventive": "#2ECC71",
    "Restorative": "#F1C40F",
    "Endodontics": "#E67E22",
    "Periodontics": "#8E44AD",
    "Oral Surgery": "#C0392B",
    "Prosthodontics": "#16A085",
    "Implant Treatment": "#2980B9",
    "Orthodontics": "#F39C12",
    "Cosmetics": "#D35400",
    "Pediatrics": "#EC407A",
    "Emergency": "#7F8C8D"
};

const getCategoryColor = (name: string) => FILTER_COLORS[name] || "#A3AED0";

function NewAppointmentContent() {
    const { id: patientId } = useParams();
    const router = useRouter();
    const { usdToKhr } = useCurrency();
    const { currentBranch } = useBranch();

    const [patient, setPatient] = useState<any>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Appointment State
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedTime, setSelectedTime] = useState(format(new Date(), 'HH:mm'));
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [selectedTreatments, setSelectedTreatments] = useState<any[]>([]);

    // Filter/Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        if (currentBranch) {
            fetchInitialData();
        }
    }, [patientId, currentBranch]);

    async function fetchInitialData() {
        setIsLoading(true);
        try {
            // Fetch Patient
            const { data: pData } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();
            setPatient(pData);

            // Fetch Staff (Doctors)
            const { data: sData } = await supabase
                .from('staff')
                .select('*')
                .eq('branch_id', currentBranch?.id)
                .eq('role', 'Doctor');
            setStaff(sData || []);
            if (sData && sData.length > 0) setSelectedDoctorId(sData[0].id);

            // Fetch Treatments
            const { data: tData } = await supabase
                .from('treatments')
                .select('*')
                .order('name');
            setTreatments(tData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredTreatments = treatments.filter(t => {
        const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || t.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const addTreatment = (treatment: any) => {
        setSelectedTreatments(prev => {
            const existing = prev.find(t => t.originalId === treatment.id);
            if (existing) {
                return prev.map(t =>
                    t.originalId === treatment.id
                        ? { ...t, quantity: (t.quantity || 1) + 1 }
                        : t
                );
            }
            return [...prev, { ...treatment, id: `${treatment.id}-${Date.now()}`, originalId: treatment.id, quantity: 1 }];
        });
    };

    const removeTreatment = (id: string) => {
        setSelectedTreatments(prev => prev.filter(t => t.id !== id));
    };

    const handleSave = async () => {
        if (!selectedDoctorId) return alert("Please select a Dentist");
        if (selectedTreatments.length === 0) return alert("Please select at least one treatment");

        try {
            // Create ledger entries for each selected treatment
            const entries = selectedTreatments.map(t => ({
                patient_id: patientId,
                doctor_id: selectedDoctorId,
                treatment_id: t.originalId,
                description: t.name,
                quantity: t.quantity || 1,
                unit_price: t.price,
                total_price: Number(t.price) * (t.quantity || 1),
                amount_paid: 0,
                amount_remaining: Number(t.price) * (t.quantity || 1),
                date: selectedDate,
                appointment_time: `${selectedTime}:00`,
                branch_id: currentBranch?.id,
                status: 'pending'
            }));

            const { error } = await supabase
                .from('ledger_entries')
                .insert(entries);

            if (error) throw error;

            router.push(`/patients/${patientId}`);
        } catch (error: any) {
            alert("Error saving appointment: " + error.message);
        }
    };

    if (isLoading) return <div className="p-10 text-center">Loading Data...</div>;

    return (
        <div className="min-h-screen bg-[#F4F7FE] p-8 pb-24">
            <div className="max-w-[1400px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.back()}
                            className="p-3 bg-white hover:bg-[#F4F7FE] rounded-2xl border border-[#E0E5F2] text-[#A3AED0] transition-all shadow-sm"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-[#1B2559] tracking-tight">New Appointment</h1>
                            <p className="text-sm font-bold text-[#A3AED0] flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Patient: <span className="text-[#1B2559]">{patient?.name}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="px-8 py-4 rounded-2xl text-sm font-black text-[#A3AED0] hover:text-[#1B2559] transition-all uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-primary hover:bg-[#3311DB] text-white px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-[0.98]"
                        >
                            <Check className="w-5 h-5" />
                            Finalize Appointment
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-8">
                    {/* Left Side: Clinical Menu (Treatment Selector) */}
                    <div className="col-span-12 lg:col-span-8 space-y-6">
                        <div className="card-premium p-8 space-y-8">
                            {/* Search and Category Filters */}
                            <div className="space-y-6">
                                <div className="relative">
                                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A3AED0]" />
                                    <input
                                        type="text"
                                        placeholder="Search clinical procedures, diagnostics, or treatments..."
                                        className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-3xl py-5 pl-16 pr-8 text-base font-bold text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={cn(
                                            "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                            !selectedCategory
                                                ? "bg-[#1B2559] text-white border-[#1B2559] shadow-lg shadow-[#1B2559]/20"
                                                : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:border-primary/50"
                                        )}
                                    >
                                        All Procedures
                                    </button>
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                selectedCategory === cat
                                                    ? "text-white shadow-lg"
                                                    : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:border-primary/50"
                                            )}
                                            style={{
                                                backgroundColor: selectedCategory === cat ? getCategoryColor(cat) : undefined,
                                                borderColor: selectedCategory === cat ? getCategoryColor(cat) : undefined,
                                                boxShadow: selectedCategory === cat ? `0 10px 20px ${getCategoryColor(cat)}40` : undefined
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Treatment Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {filteredTreatments.map(t => (
                                    <div
                                        key={t.id}
                                        onClick={() => addTreatment(t)}
                                        className="group p-5 bg-white border border-[#E0E5F2] rounded-3xl hover:border-primary transition-all cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-3 h-12 rounded-full"
                                                style={{ backgroundColor: getCategoryColor(t.category) }}
                                            />
                                            <div>
                                                <h4 className="font-black text-[#1B2559] group-hover:text-primary transition-colors">{t.name}</h4>
                                                <p className="text-[10px] text-[#A3AED0] font-black uppercase tracking-widest">{t.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-black text-[#1B2559]">${t.price}</div>
                                            <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Available</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Appointment Configuration & Cart */}
                    <div className="col-span-12 lg:col-span-4 space-y-6">
                        {/* Config Card */}
                        <div className="card-premium p-8 space-y-8">
                            <h3 className="text-xl font-black text-[#1B2559] tracking-tight">Deployment Context</h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Target Dentist</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-[#1B2559] outline-none appearance-none cursor-pointer"
                                            value={selectedDoctorId}
                                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                                        >
                                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] rotate-90" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Schedule Date</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                            <input
                                                type="date"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[#1B2559] outline-none"
                                                value={selectedDate}
                                                onChange={(e) => setSelectedDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Session Time</label>
                                        <div className="relative">
                                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                                            <input
                                                type="time"
                                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-[#1B2559] outline-none"
                                                value={selectedTime}
                                                onChange={(e) => setSelectedTime(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cart Card */}
                        <div className="card-premium p-8 space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-[#1B2559]">Selected Procedures</h3>
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black">{selectedTreatments.length}</span>
                            </div>

                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedTreatments.map((t, idx) => (
                                    <div key={t.id} className="group p-4 bg-[#F4F7FE]/50 border border-[#E0E5F2] rounded-2xl flex items-center justify-between animate-in slide-in-from-right-2 duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[10px] font-black text-primary shadow-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-black text-[#1B2559]">{t.name}</h5>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-[9px] text-[#A3AED0] font-bold uppercase">${t.price}</p>
                                                    {(t.quantity || 1) > 1 && (
                                                        <span className="text-[9px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg">x{t.quantity}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeTreatment(t.id)}
                                            className="p-2 hover:bg-destructive/10 text-[#A3AED0] hover:text-destructive transition-all rounded-lg"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}

                                {selectedTreatments.length === 0 && (
                                    <div className="py-8 text-center border-2 border-dashed border-[#E0E5F2] rounded-2xl">
                                        <p className="text-xs font-bold text-[#A3AED0]">No treatments selected</p>
                                    </div>
                                )}
                            </div>

                            {selectedTreatments.length > 0 && (
                                <div className="pt-6 border-t border-[#F4F7FE] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-black text-[#A3AED0] uppercase tracking-widest">Total Value</span>
                                        <span className="text-2xl font-black text-primary">
                                            ${selectedTreatments.reduce((sum, t) => sum + (Number(t.price) * (t.quantity || 1)), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-[9px] text-[#A3AED0] font-bold text-center italic uppercase">
                                        Equiv. Approx {(selectedTreatments.reduce((sum, t) => sum + (Number(t.price) * (t.quantity || 1)), 0) * usdToKhr).toLocaleString()} Riel
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NewAppointmentPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading Clinical Environment...</div>}>
            <NewAppointmentContent />
        </Suspense>
    );
}

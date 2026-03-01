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
    ChevronDown,
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
import { TREATMENT_CATEGORIES, getCategoryColor } from "@/lib/constants";
import DatePicker from "@/components/DatePicker";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const CATEGORIES = TREATMENT_CATEGORIES;

function NewAppointmentContent() {
    const { id: patientId } = useParams();
    const router = useRouter();
    const { usdToKhr } = useCurrency();
    const { currentBranch } = useBranch();

    const [patient, setPatient] = useState<any>(null);
    const [staff, setStaff] = useState<any[]>([]);
    const [treatments, setTreatments] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Appointment State
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [selectedTime, setSelectedTime] = useState(() => {
        const now = new Date();
        const minutes = now.getMinutes();
        const roundedDate = new Date(now);
        if (minutes < 30) {
            roundedDate.setMinutes(30, 0, 0);
        } else {
            roundedDate.setHours(now.getHours() + 1, 0, 0, 0);
        }
        return format(roundedDate, 'HH:mm');
    });
    const [selectedDoctorId, setSelectedDoctorId] = useState("");
    const [selectedItems, setSelectedItems] = useState<any[]>([]); // Renamed for clarity

    // Filter/Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [viewMode, setViewMode] = useState<'treatment' | 'medicine'>('treatment');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);

    // Dynamic Medicine Categories
    const medicineCategories = Array.from(new Set(inventoryItems.map(item => item.category))).filter(Boolean);

    // Generate 15-minute intervals for time dropdown
    const timeIntervals = [];
    for (let h = 7; h <= 20; h++) {
        for (let m = 0; m < 60; m += 15) {
            const hh = h.toString().padStart(2, '0');
            const mm = m.toString().padStart(2, '0');
            timeIntervals.push(`${hh}:${mm}`);
        }
    }

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

            // Fetch Treatments (Filtered by Branch)
            const { data: tData } = await supabase
                .from('treatments')
                .select('*')
                .eq('branch_id', currentBranch?.id)
                .order('name');
            setTreatments(tData || []);

            // Fetch Medicine Inventory
            const { data: iData } = await supabase
                .from('inventory')
                .select('*')
                .eq('branch_id', currentBranch?.id)
                .order('name');
            setInventoryItems(iData || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const filteredItems = (viewMode === 'treatment' ? treatments : inventoryItems).filter(t => {
        const normalizedSearch = searchTerm.toLowerCase().trim();
        const normalizedItemName = (t.name || "").toLowerCase();
        const normalizedItemCategory = (t.category || "").toLowerCase();

        const matchesSearch = !normalizedSearch ||
            normalizedItemName.includes(normalizedSearch) ||
            normalizedItemCategory.includes(normalizedSearch);

        const matchesCategory = !selectedCategory ||
            (t.category && t.category.trim().toLowerCase() === selectedCategory.trim().toLowerCase());

        return matchesSearch && matchesCategory;
    });


    const addItem = (item: any, type: 'treatment' | 'medicine') => {
        setSelectedItems(prev => {
            const existing = prev.find(t => t.originalId === item.id && t.item_type === type);
            if (existing) {
                return prev.map(t =>
                    t.originalId === item.id && t.item_type === type
                        ? { ...t, quantity: (t.quantity || 1) + 1 }
                        : t
                );
            }
            return [...prev, {
                ...item,
                id: `${item.id}-${Date.now()}`,
                originalId: item.id,
                quantity: 1,
                item_type: type,
                price: type === 'treatment' ? item.price : item.sell_price
            }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setSelectedItems(prev => prev.map(t => {
            if (t.id === id) {
                const newQty = Math.max(1, (t.quantity || 1) + delta);
                return { ...t, quantity: newQty };
            }
            return t;
        }));
    };

    const removeItem = (id: string) => {
        setSelectedItems(prev => prev.filter(t => t.id !== id));
    };


    const handleSave = async () => {
        if (!selectedDoctorId) return alert("Please select a Dentist");
        if (selectedItems.length === 0) return alert("Please select at least one item");

        try {
            // Create ledger entries for each selected item
            const entries = selectedItems.map(item => ({
                patient_id: patientId,
                doctor_id: selectedDoctorId,
                treatment_id: item.item_type === 'treatment' ? item.originalId : null,
                inventory_id: item.item_type === 'medicine' ? item.originalId : null,
                description: item.name,
                quantity: item.quantity || 1,
                unit_price: item.price,
                total_price: Number(item.price) * (item.quantity || 1),
                amount_paid: 0,
                amount_remaining: Number(item.price) * (item.quantity || 1),
                date: selectedDate,
                appointment_time: `${selectedTime}:00`,
                branch_id: currentBranch?.id,
                status: 'pending',
                item_type: item.item_type
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
        <div className="min-h-screen bg-[#F4F7FE]">
            <div className="max-w-[1400px] mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-[#E0E5F2] rounded-lg text-[#A3AED0] hover:text-[#1B2559] transition-all shadow-sm group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div className="flex items-center gap-4">
                            <h1 className="text-2xl font-medium text-[#1B2559] tracking-tight">New Appointment</h1>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E0E5F2] rounded-lg shadow-sm">
                                <User className="w-3 h-3 text-primary" />
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest whitespace-nowrap">Patient</span>
                                    <span className="text-[9px] font-medium text-[#1B2559] uppercase tracking-widest whitespace-nowrap">{patient?.name}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => router.back()}
                            className="px-5 py-2 rounded-lg text-[8px] font-medium text-[#A3AED0] hover:text-[#1B2559] transition-all uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-primary px-5 py-2.5 rounded-lg text-[9px] font-medium text-white shadow-lg shadow-primary/20 flex items-center gap-2 hover:translate-y-[-1px] transition-all active:translate-y-0"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Finalize Appointment
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-5">
                    {/* Left Side: Clinical Menu (Selector) */}
                    <div className="col-span-12 lg:col-span-8 space-y-5">
                        <div className="bg-white rounded-lg border border-[#E0E5F2] shadow-sm p-6 space-y-5">
                            {/* Search and Category Filters */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-3">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0] group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder={`Search ${viewMode === 'treatment' ? 'clinical procedures' : 'medicines'}...`}
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg py-3 pl-11 pr-4 text-[11px] font-medium text-[#1B2559] focus:ring-4 focus:ring-primary/5 transition-all outline-none placeholder:text-[#A3AED0] placeholder:font-medium"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {/* Context Switcher - Inventory Style Tabs */}
                                    <div className="flex bg-[#F4F7FE] p-1 rounded-lg border border-[#E0E5F2]">
                                        {[
                                            { id: 'treatment', label: 'Treatment', icon: Activity },
                                            { id: 'medicine', label: 'Medicine', icon: DollarSign }
                                        ].map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setViewMode(tab.id as any);
                                                    setSelectedCategory(null);
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all",
                                                    viewMode === tab.id
                                                        ? "bg-white text-primary shadow-sm"
                                                        : "text-[#A3AED0] hover:text-[#1B2559]"
                                                )}
                                            >
                                                <tab.icon className="w-3 h-3" />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-[8px] font-medium uppercase tracking-wider transition-all border whitespace-nowrap",
                                            !selectedCategory
                                                ? "bg-[#1B2559] text-white border-[#1B2559] shadow-md shadow-[#1B2559]/10"
                                                : "bg-[#F4F7FE] text-[#A3AED0] border-[#E0E5F2] hover:border-primary/50"
                                        )}
                                    >
                                        All {viewMode === 'treatment' ? 'Procedures' : 'Categories'}
                                    </button>
                                    {(viewMode === 'treatment' ? CATEGORIES : medicineCategories).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                "px-2.5 py-1.5 rounded-lg text-[8px] font-medium uppercase tracking-wider transition-all border whitespace-nowrap",
                                                selectedCategory === cat
                                                    ? "text-white shadow-md"
                                                    : "bg-[#F4F7FE] text-[#A3AED0] border-[#E0E5F2] hover:border-primary/50"
                                            )}
                                            style={{
                                                backgroundColor: selectedCategory === cat ? getCategoryColor(cat) : undefined,
                                                borderColor: selectedCategory === cat ? getCategoryColor(cat) : undefined,
                                            }}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Item Grid - High Density */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => addItem(item, viewMode)}
                                        className="group p-3.5 bg-white border border-[#E0E5F2] rounded-[1.25rem] hover:border-primary hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-1 h-8 rounded-full"
                                                style={{ backgroundColor: getCategoryColor(item.category) }}
                                            />
                                            <div>
                                                <h4 className="text-[11px] font-medium text-[#1B2559] group-hover:text-primary transition-colors tracking-tight font-kantumruy leading-tight">{item.name}</h4>
                                                <p className="text-[9px] font-medium text-[#A3AED0] uppercase pt-0.5 tracking-tighter">{item.category}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[12px] font-medium text-[#1B2559] tracking-tight">${viewMode === 'treatment' ? item.price : item.sell_price}</div>
                                            <div className={cn(
                                                "text-[8px] font-medium uppercase tracking-widest",
                                                (viewMode === 'treatment' || (item.stock_level > 0)) ? "text-emerald-500" : "text-rose-500"
                                            )}>
                                                {viewMode === 'treatment' ? 'Available' : item.stock_level > 0 ? `${item.stock_level} Unit` : 'Out of Stock'}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredItems.length === 0 && (
                                    <div className="col-span-full py-16 text-center border-2 border-dashed border-[#E0E5F2] rounded-[2rem] space-y-3">
                                        <div className="w-12 h-12 bg-[#F4F7FE] rounded-lg flex items-center justify-center mx-auto">
                                            <Search className="w-6 h-6 text-[#A3AED0]" />
                                        </div>
                                        <div>
                                            <h4 className="text-base font-medium text-[#1B2559]">No {viewMode === 'treatment' ? 'Procedures' : 'Medicines'} Found</h4>
                                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mt-1">
                                                {selectedCategory ? `No results in ${selectedCategory}` : "Try a different search term"}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Appointment Configuration & Cart */}
                    <div className="col-span-12 lg:col-span-4 space-y-5">
                        {/* Config Card */}
                        <div className="bg-white rounded-lg border border-[#E0E5F2] shadow-sm p-6 space-y-5">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Dentist</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary" />
                                        <select
                                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-lg py-2.5 pl-11 pr-6 text-[10px] font-medium text-[#1B2559] outline-none appearance-none cursor-pointer focus:ring-4 focus:ring-primary/5 transition-all"
                                            value={selectedDoctorId}
                                            onChange={(e) => setSelectedDoctorId(e.target.value)}
                                        >
                                            {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3AED0]" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Date</label>
                                        <DatePicker
                                            value={selectedDate}
                                            onChange={(d) => setSelectedDate(format(d, 'yyyy-MM-dd'))}
                                            placeholder="Select Date"
                                            format="EEE, MMM d"
                                        />
                                    </div>
                                    <div className="space-y-1.5 relative">
                                        <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Time</label>
                                        <div
                                            className="h-10 bg-[#F4F7FE] hover:bg-[#E0E5F2] transition-colors rounded-lg border border-[#E0E5F2] px-4 flex items-center justify-between cursor-pointer group"
                                            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[10px] font-medium text-[#1B2559]">
                                                    {format(new Date(`2000-01-01T${selectedTime}:00`), 'h:mm a')}
                                                </span>
                                            </div>
                                            <ChevronDown className={cn("w-3 h-3 text-[#A3AED0] transition-transform", isTimeDropdownOpen && "rotate-180")} />
                                        </div>

                                        {isTimeDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-[40]" onClick={() => setIsTimeDropdownOpen(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-lg shadow-xl z-[100] overflow-hidden max-h-[180px] overflow-y-auto no-scrollbar border border-[#E0E5F2] animate-in fade-in zoom-in-95 duration-200">
                                                    {timeIntervals.map(t => (
                                                        <button
                                                            key={t}
                                                            onClick={() => {
                                                                setSelectedTime(t);
                                                                setIsTimeDropdownOpen(false);
                                                            }}
                                                            className={cn(
                                                                "w-full px-4 py-2.5 text-left text-[9px] font-medium uppercase tracking-wider hover:bg-[#F4F7FE] transition-colors flex items-center justify-between",
                                                                selectedTime === t ? "bg-primary/5 text-primary" : "text-[#1B2559]"
                                                            )}
                                                        >
                                                            {format(new Date(`2000-01-01T${t}:00`), 'h:mm a')}
                                                            {selectedTime === t && <Check className="w-3 h-3" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cart Card */}
                        <div className="bg-white rounded-lg border border-[#E0E5F2] shadow-sm p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-[#1B2559] tracking-tight">Configuration Bundle</h3>
                                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-[10px] font-medium">{selectedItems.length}</span>
                            </div>

                            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                                {selectedItems.map((item, idx) => (
                                    <div key={item.id} className="group relative">
                                        <div className="bg-white border border-[#E0E5F2] rounded-lg p-3 transition-all hover:shadow-md border-l-4" style={{ borderLeftColor: getCategoryColor(item.category) }}>
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <h5 className="text-[10px] font-medium text-[#1B2559] truncate tracking-tight uppercase font-kantumruy">{item.name}</h5>
                                                        <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mt-0.5">{item.category}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="p-1 px-1.5 text-rose-500/30 hover:text-rose-500 hover:bg-rose-50 transition-all rounded-lg"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <div className="flex items-center justify-between pt-1.5 border-t border-[#F4F7FE]">
                                                    <div className="flex items-center gap-1.5 bg-[#F4F7FE] rounded-lg p-0.5 border border-[#E0E5F2]">
                                                        <button
                                                            onClick={() => updateQuantity(item.id, -1)}
                                                            className="w-4.5 h-4.5 flex items-center justify-center bg-white rounded-md text-[#1B2559] hover:text-primary transition-all shadow-sm active:scale-90 disabled:opacity-30"
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <span className="text-[10px] font-medium">-</span>
                                                        </button>
                                                        <div className="w-5 text-center text-[9px] font-medium text-[#1B2559]">
                                                            {item.quantity || 1}
                                                        </div>
                                                        <button
                                                            onClick={() => updateQuantity(item.id, 1)}
                                                            className="w-4.5 h-4.5 flex items-center justify-center bg-white rounded-md text-[#1B2559] hover:text-primary transition-all shadow-sm active:scale-90"
                                                        >
                                                            <Plus className="w-2 h-2" />
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[11px] font-medium text-primary tracking-tighter">
                                                            ${(Number(item.price) * (item.quantity || 1)).toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {selectedItems.length === 0 && (
                                    <div className="py-8 text-center border-2 border-dashed border-[#E0E5F2] rounded-lg">
                                        <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none">No Items Selected</p>
                                    </div>
                                )}
                            </div>

                            {selectedItems.length > 0 && (
                                <div className="pt-5 border-t border-[#F4F7FE] space-y-3">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest">Grand Subtotal</span>
                                        <span className="text-xl font-medium text-primary tracking-tighter">
                                            ${selectedItems.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="bg-[#F8FAFF] rounded-lg py-2 px-3 text-center border border-primary/5">
                                        <p className="text-[8px] text-[#A3AED0] font-medium uppercase tracking-[0.15em] leading-relaxed">
                                            Equiv. Est {(selectedItems.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0) * usdToKhr).toLocaleString()} Riel
                                        </p>
                                    </div>
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

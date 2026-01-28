"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
    ArrowLeft,
    Building2,
    User,
    Phone,
    Package,
    Hash,
    DollarSign,
    ChevronDown,
    Loader2,
    Layers
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// Placeholder vendor database
const VENDOR_DATABASE = [
    { name: "Dentalku", contact: "James Anderson", phone: "084395450343" },
    { name: "MediSupply Co.", contact: "Sarah Miller", phone: "0987654321" },
    { name: "PharmaGlobal", contact: "Robert Wilson", phone: "0123456789" },
];

export default function CreateNewItemPage() {
    const router = useRouter();
    const [vendorSearch, setVendorSearch] = useState("");
    const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [dbCategories, setDbCategories] = useState<string[]>([]);
    const [dbUnits, setDbUnits] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        vendorName: "",
        contactPerson: "",
        phoneNumber: "",
        productName: "",
        category: "",
        sku: "",
        quantity: 0,
        unit: "",
        buyPrice: 0,
        sellPrice: 0
    });

    useEffect(() => {
        const fetchExistingOptions = async () => {
            try {
                const { data, error } = await supabase.from('inventory').select('category, unit');
                if (error) throw error;

                if (data) {
                    const cats = Array.from(new Set(data.map(i => i.category).filter(Boolean)));
                    const units = Array.from(new Set(data.map(i => i.unit).filter(Boolean)));

                    const defaultCats = ["Medicine", "Pain and Anxiety", "Antibiotics", "Supplements", "General"];
                    const defaultUnits = ["Piece", "Pill", "Box", "Bottle"];

                    setDbCategories(Array.from(new Set([...defaultCats, ...cats])));
                    setDbUnits(Array.from(new Set([...defaultUnits, ...units])));
                }
            } catch (err) {
                console.error("Error fetching suggestions:", err);
                // Fallback to defaults
                setDbCategories(["Medicine", "Pain and Anxiety", "Antibiotics", "Supplements", "General"]);
                setDbUnits(["Piece", "Pill", "Box", "Bottle"]);
            }
        };

        fetchExistingOptions();
    }, []);

    const suggestions = useMemo(() => {
        if (!vendorSearch) return [];
        return VENDOR_DATABASE.filter(v =>
            v.name.toLowerCase().includes(vendorSearch.toLowerCase())
        );
    }, [vendorSearch]);

    const selectVendor = (v: typeof VENDOR_DATABASE[0]) => {
        setFormData({
            ...formData,
            vendorName: v.name,
            contactPerson: v.contact,
            phoneNumber: v.phone
        });
        setVendorSearch(v.name);
        setShowVendorSuggestions(false);
    };

    const handleCreate = async () => {
        if (!formData.productName.trim()) {
            setError("Product name is required");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('inventory')
                .insert([{
                    name: formData.productName,
                    vendor: formData.vendorName || null,
                    contact_person: formData.contactPerson || null,
                    phone_number: formData.phoneNumber || null,
                    sku: formData.sku || null,
                    stock_level: formData.quantity,
                    unit: formData.unit,
                    buy_price: formData.buyPrice || 0,
                    sell_price: formData.sellPrice || 0,
                    category: formData.category,
                }]);

            if (insertError) throw insertError;

            router.push('/inventory');
        } catch (err: any) {
            console.error('Error creating item:', err);
            setError(err.message || "Failed to create item");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center gap-4 shrink-0">
                <Link href="/inventory">
                    <button className="w-10 h-10 rounded-full border border-[#E0E5F2] bg-white flex items-center justify-center text-[#1B2559] hover:bg-gray-50 transition-all shadow-sm">
                        <ArrowLeft className="w-5.5 h-5.5" />
                    </button>
                </Link>
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black text-[#1B2559] tracking-tight">Create new item</h1>
                    {error && <span className="text-[10px] font-bold text-[#EE5D50] uppercase mt-1">{error}</span>}
                </div>
            </div>

            {/* Main Content Area - Consolidated Card */}
            <div className="">
                <div className="bg-white rounded-[24px] border border-[#E0E5F2] p-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-2.5">

                        {/* Vendor Section Title */}
                        <div className="md:col-span-3">
                            <h2 className="text-xl font-black text-[#1B2559] flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-[#4318FF]" />
                                Vendor Information <span className="text-[10px] font-bold text-[#A3AED0] uppercase ml-2 tracking-widest">(Optional)</span>
                            </h2>
                        </div>

                        {/* Vendor Name with Autocomplete */}
                        <div className="space-y-1.5 relative">
                            <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Vendor Name</label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    placeholder="e.g. Dentalku"
                                    value={vendorSearch || formData.vendorName}
                                    onFocus={() => setShowVendorSuggestions(true)}
                                    onChange={(e) => {
                                        setVendorSearch(e.target.value);
                                        setFormData({ ...formData, vendorName: e.target.value });
                                    }}
                                    className="w-full bg-[#F4F7FE]/50 border-none rounded-xl px-5 py-3 text-[12px] font-bold text-[#1B2559] outline-none placeholder:text-[#A3AED0] focus:ring-2 focus:ring-[#4318FF]/10 transition-all font-kantumruy"
                                />
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0]" />

                                {showVendorSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        {suggestions.map((v) => (
                                            <button
                                                key={v.name}
                                                onClick={() => selectVendor(v)}
                                                className="w-full px-5 py-3 text-left hover:bg-[#F4F7FE] transition-colors flex flex-col gap-0.5"
                                            >
                                                <span className="text-[12px] font-black text-[#1B2559]">{v.name}</span>
                                                <span className="text-[10px] text-[#A3AED0] font-bold">{v.contact} • {v.phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Person */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Contact Person</label>
                            <div className="relative bg-[#F4F7FE]/50 rounded-xl px-5 py-3 flex items-center gap-3">
                                <User className="w-4 h-4 text-[#4318FF]" />
                                <input
                                    type="text"
                                    placeholder="James Anderson"
                                    value={formData.contactPerson}
                                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                    className="bg-transparent border-none p-0 text-[12px] font-bold text-[#1B2559] outline-none placeholder:text-[#A3AED0] w-full font-kantumruy"
                                />
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Phone Number</label>
                            <div className="relative bg-[#F4F7FE]/50 rounded-xl px-5 py-3 flex items-center gap-3">
                                <Phone className="w-4 h-4 text-[#4318FF]" />
                                <input
                                    type="text"
                                    placeholder="084395450343"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-bold outline-none placeholder:text-[#A3AED0] w-full"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-3 h-px bg-[#F4F7FE] my-0.5" />

                        {/* Product Section Title */}
                        <div className="md:col-span-3">
                            <h2 className="text-xl font-black text-[#1B2559] flex items-center gap-2">
                                <Package className="w-5 h-5 text-[#4318FF]" />
                                Product Details
                            </h2>
                        </div>

                        {/* Row 1: Product Name (50%), Category (25%) & SKU (25%) */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="md:col-span-2 space-y-1.5">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Product Name <span className="text-[#EE5D50] ml-0.5">*</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Braces"
                                    value={formData.productName}
                                    onChange={(e) => {
                                        setFormData({ ...formData, productName: e.target.value });
                                        if (error) setError(null);
                                    }}
                                    className={cn(
                                        "w-full bg-[#F4F7FE]/50 border-none rounded-xl px-5 py-3 text-[12px] font-black text-[#1B2559] outline-none placeholder:text-[#A3AED0] focus:ring-2 focus:ring-[#4318FF]/10 transition-all font-kantumruy",
                                        error === "Product name is required" && "ring-2 ring-[#EE5D50]/20 bg-[#EE5D50]/5"
                                    )}
                                />
                            </div>

                            {/* Category Selection (Typable) */}
                            <div className="space-y-1.5 relative">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Category</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Medicine"
                                        value={formData.category}
                                        onFocus={() => setIsCategoryDropdownOpen(true)}
                                        onChange={(e) => {
                                            setFormData({ ...formData, category: e.target.value });
                                            setIsCategoryDropdownOpen(true);
                                        }}
                                        className="w-full bg-[#F4F7FE]/50 rounded-xl px-5 py-3 text-[12px] font-bold text-[#1B2559] outline-none hover:bg-[#F4F7FE]/80 transition-all border border-transparent focus:border-[#4318FF]/20"
                                    />
                                    <ChevronDown className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] transition-transform pointer-events-none", isCategoryDropdownOpen && "rotate-180")} />

                                    {isCategoryDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsCategoryDropdownOpen(false)}
                                            />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E0E5F2] scrollbar-track-transparent">
                                                    {dbCategories
                                                        .filter(cat => !formData.category || cat.toLowerCase().includes(formData.category.toLowerCase()))
                                                        .map((cat) => (
                                                            <button
                                                                key={cat}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, category: cat });
                                                                    setIsCategoryDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-5 py-2.5 text-left text-[12px] font-bold transition-colors hover:bg-[#F4F7FE]",
                                                                    formData.category === cat ? "text-[#4318FF] bg-[#F4F7FE]/50" : "text-[#1B2559]"
                                                                )}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* SKU */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">SKU <span className="text-[10px] text-[#A3AED0] lowercase ml-1">(Optional)</span></label>
                                <div className="relative bg-[#F4F7FE]/50 rounded-xl px-5 py-3 flex items-center gap-3">
                                    <Hash className="w-4 h-4 text-[#A3AED0]" />
                                    <input
                                        type="text"
                                        placeholder="213-2311"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-bold outline-none placeholder:text-[#A3AED0] w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Qty, Unit, Cost, Price (All 25%) */}
                        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-8">
                            {/* Quantity */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Quantity</label>
                                <div className="relative bg-[#F4F7FE]/50 rounded-xl px-5 py-3 flex items-center gap-3">
                                    <Layers className="w-4 h-4 text-[#4318FF]" />
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={formData.quantity || ""}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                        className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-bold outline-none placeholder:text-[#A3AED0] w-full"
                                    />
                                </div>
                            </div>

                            {/* Unit (Typable) */}
                            <div className="space-y-1.5 relative">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Unit</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Piece"
                                        value={formData.unit}
                                        onFocus={() => setIsUnitDropdownOpen(true)}
                                        onChange={(e) => {
                                            setFormData({ ...formData, unit: e.target.value });
                                            setIsUnitDropdownOpen(true);
                                        }}
                                        className="w-full bg-[#F4F7FE]/50 rounded-xl px-5 py-3 text-[12px] font-bold text-[#1B2559] outline-none hover:bg-[#F4F7FE]/80 transition-all border border-transparent focus:border-[#4318FF]/20"
                                    />
                                    <ChevronDown className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] transition-transform pointer-events-none", isUnitDropdownOpen && "rotate-180")} />

                                    {isUnitDropdownOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsUnitDropdownOpen(false)}
                                            />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E0E5F2] scrollbar-track-transparent">
                                                    {dbUnits
                                                        .filter(unit => !formData.unit || unit.toLowerCase().includes(formData.unit.toLowerCase()))
                                                        .map((unit) => (
                                                            <button
                                                                key={unit}
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData({ ...formData, unit });
                                                                    setIsUnitDropdownOpen(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-5 py-2.5 text-left text-[12px] font-bold transition-colors hover:bg-[#F4F7FE]",
                                                                    formData.unit === unit ? "text-[#4318FF] bg-[#F4F7FE]/50" : "text-[#1B2559]"
                                                                )}
                                                            >
                                                                {unit}
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Buying Price */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Cost (Buy)</label>
                                <div className="relative bg-[#F4F7FE]/50 rounded-xl px-5 py-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-[#19D5C5]" />
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.buyPrice || ""}
                                        onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) || 0 })}
                                        className="bg-transparent border-none p-0 text-[13px] font-black text-[#1B2559] outline-none placeholder:text-[#A3AED0] w-full"
                                    />
                                </div>
                            </div>

                            {/* Selling Price */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest pl-1">Price (Sell)</label>
                                <div className="relative bg-[#F4F7FE]/50 rounded-xl px-5 py-3 flex items-center gap-2">
                                    <DollarSign className="w-4 h-4 text-[#4318FF]" />
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.sellPrice || ""}
                                        onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                                        className="bg-transparent border-none p-0 text-[13px] font-black text-[#1B2559] outline-none placeholder:text-[#A3AED0] w-full"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className="mt-4 flex items-center justify-end gap-10">
                        <Link href="/inventory">
                            <button
                                disabled={loading}
                                className="text-[12px] font-black text-[#A3AED0] hover:text-[#1B2559] transition-all uppercase tracking-[0.1em] disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </Link>
                        <button
                            onClick={handleCreate}
                            disabled={loading}
                            className="bg-[#4318FF] px-14 py-4 rounded-[18px] text-[12px] font-black text-white hover:bg-[#3311E0] transition-all shadow-lg shadow-[#4318FF]/20 uppercase tracking-[0.2em] disabled:opacity-70 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {loading ? "Creating..." : "Create"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

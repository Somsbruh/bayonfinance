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
    Layers,
    Calendar,
    BarChart3,
    Trash2,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// Placeholder vendor database
const VENDOR_DATABASE = [
    { name: "Dentalku", contact: "James Anderson", phone: "084395450343" },
    { name: "MediSupply Co.", contact: "Sarah Miller", phone: "0987654321" },
    { name: "PharmaGlobal", contact: "Robert Wilson", phone: "0123456789" },
];

const MEDICINE_CATEGORIES = ["Medicine", "Pain and Anxiety", "Antibiotics", "Supplements", "General"];
const INVENTORY_CATEGORIES = ["Equipment", "Tools", "Consumables", "Office Supplies", "General"];

export default function ItemDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [vendorSearch, setVendorSearch] = useState("");
    const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isUnitDropdownOpen, setIsUnitDropdownOpen] = useState(false);
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
    const [dbCategories, setDbCategories] = useState<string[]>([]);
    const [dbUnits, setDbUnits] = useState<string[]>([]);
    const [timeframe, setTimeframe] = useState<'1m' | '3m' | '6m'>('1m');

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
        sellPrice: 0,
        lastStockIn: null as string | null,
        lastStockOut: null as string | null,
        item_type: 'medicine' as 'medicine' | 'inventory',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Item details
                const { data: item, error: itemError } = await supabase
                    .from('inventory')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (itemError) throw itemError;

                if (item) {
                    setFormData({
                        vendorName: item.vendor || "",
                        contactPerson: item.contact_person || "",
                        phoneNumber: item.phone_number || "",
                        productName: item.name || "",
                        category: item.category || "",
                        sku: item.sku || "",
                        quantity: item.stock_level || 0,
                        unit: item.unit || "",
                        buyPrice: item.buy_price || 0,
                        sellPrice: item.sell_price || 0,
                        lastStockIn: item.last_stock_in || null,
                        lastStockOut: item.last_stock_out || null,
                        item_type: item.item_type || 'medicine',
                    });
                    setVendorSearch(item.vendor || "");
                }

                // Fetch suggestions scoped to this item_type
                const { data: suggestions, error: sugError } = await supabase
                    .from('inventory')
                    .select('category, unit')
                    .eq('item_type', item?.item_type || 'medicine');
                if (sugError) throw sugError;

                if (suggestions) {
                    const cats = Array.from(new Set(suggestions.map(i => i.category).filter(Boolean)));
                    const units = Array.from(new Set(suggestions.map(i => i.unit).filter(Boolean)));
                    const defaultCats = (item?.item_type || 'medicine') === 'inventory' ? INVENTORY_CATEGORIES : MEDICINE_CATEGORIES;
                    const defaultUnits = ["Piece", "Pill", "Box", "Bottle"];
                    setDbCategories(Array.from(new Set([...defaultCats, ...cats])));
                    setDbUnits(Array.from(new Set([...defaultUnits, ...units])));
                }
            } catch (err: any) {
                console.error("Error fetching item details:", err);
                setError(err.message || "Failed to fetch item details");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchData();
    }, [id]);

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

    const handleUpdate = async () => {
        if (!formData.productName.trim()) {
            setError("Product name is required");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('inventory')
                .update({
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
                    item_type: formData.item_type,
                })
                .eq('id', id);

            if (updateError) throw updateError;
            router.push(`/inventory?tab=${formData.item_type}`);
        } catch (err: any) {
            console.error('Error updating item:', err);
            setError(err.message || "Failed to update item");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) return;

        setDeleting(true);
        try {
            const { error: deleteError } = await supabase
                .from('inventory')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            router.push('/inventory');
        } catch (err: any) {
            console.error('Error deleting item:', err);
            alert(err.message || "Failed to delete item");
        } finally {
            setDeleting(false);
        }
    };

    // Usage Dashboard Stats (Mocked for Visual)
    const usageStats = useMemo(() => {
        const stats = {
            '1m': [45, 52, 38, 65, 48, 55],
            '3m': [120, 145, 132, 168, 155, 142],
            '6m': [280, 310, 295, 340, 325, 315]
        };
        return stats[timeframe];
    }, [timeframe]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#3B82F6]" />
            </div>
        );
    }

    return (
        <div className="max-w-[1440px] mx-auto px-7 pt-1 pb-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/inventory">
                        <button className="w-10 h-10 rounded-full border border-[#E0E5F2] bg-white flex items-center justify-center text-[#1B2559] hover:bg-gray-50 transition-all shadow-sm">
                            <ArrowLeft className="w-5.5 h-5.5" />
                        </button>
                    </Link>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-medium text-[#1B2559] tracking-tight truncate max-w-[400px]">
                            {formData.productName || "Item Details"}
                        </h1>
                        <span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-[0.2em]">
                            Product Identifier: {id.slice(0, 8)}...
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg text-[11px] font-medium uppercase text-[#EE5D50] hover:bg-[#EE5D50]/5 transition-all"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Delete Product
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="bg-[#3B82F6] px-8 py-3 rounded-lg text-[11px] font-medium text-white hover:bg-[#2563EB] transition-all shadow-md shadow-[#3B82F6]/20 uppercase tracking-widest flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Updating..." : "Update Details"}
                    </button>
                </div>
            </div>

            {/* Grid Layout for Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Left Side: Forms (8 Cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Item Information Card (Same as New Item) */}
                    <div className="bg-white rounded-lg border border-[#E0E5F2] px-8 py-5 shadow-sm space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                            {/* Vendor Section Title */}
                            <div className="md:col-span-3">
                                <h2 className="text-xl font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy">
                                    <Building2 className="w-5 h-5 text-[#3B82F6]" />
                                    Vendor Information
                                </h2>
                            </div>

                            {/* Vendor Name with Autocomplete */}
                            <div className="space-y-1.5 relative">
                                <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Vendor Name</label>
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
                                        className="w-full bg-[#F4F7FE]/50 border-none rounded-lg px-5 py-3 text-[12px] font-medium text-[#1B2559] outline-none placeholder:text-[#A3AED0] focus:ring-2 focus:ring-[#3B82F6]/10 transition-all font-kantumruy"
                                    />
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0]" />

                                    {showVendorSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {suggestions.map((v) => (
                                                <button
                                                    key={v.name}
                                                    onClick={() => selectVendor(v)}
                                                    className="w-full px-5 py-3 text-left hover:bg-[#F4F7FE] transition-colors flex flex-col gap-0.5"
                                                >
                                                    <span className="text-[12px] font-medium text-[#1B2559]">{v.name}</span>
                                                    <span className="text-[10px] text-[#A3AED0] font-medium">{v.contact} • {v.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Contact Person</label>
                                <div className="relative bg-[#F4F7FE]/50 rounded-lg px-5 py-3 flex items-center gap-3">
                                    <User className="w-4 h-4 text-[#3B82F6]" />
                                    <input
                                        type="text"
                                        placeholder="James Anderson"
                                        value={formData.contactPerson}
                                        onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                        className="bg-transparent border-none p-0 text-[12px] font-medium text-[#1B2559] outline-none placeholder:text-[#A3AED0] w-full font-kantumruy"
                                    />
                                </div>
                            </div>

                            {/* Phone Number */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Phone Number</label>
                                <div className="relative bg-[#F4F7FE]/50 rounded-lg px-5 py-3 flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-[#3B82F6]" />
                                    <input
                                        type="text"
                                        placeholder="084395450343"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-medium outline-none placeholder:text-[#A3AED0] w-full"
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-3 h-px bg-[#F4F7FE] my-1" />

                            {/* Product Section Title */}
                            <div className="md:col-span-3">
                                <h2 className="text-xl font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy">
                                    <Package className="w-5 h-5 text-[#3B82F6]" />
                                    Product Details
                                </h2>
                            </div>

                            {/* Row 1: Product Name (50%), Category (25%) & SKU (25%) */}
                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="md:col-span-2 space-y-1.5">
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Product Name <span className="text-[#EE5D50] ml-0.5">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Braces"
                                        value={formData.productName}
                                        onChange={(e) => {
                                            setFormData({ ...formData, productName: e.target.value });
                                            if (error) setError(null);
                                        }}
                                        className={cn(
                                            "w-full bg-[#F4F7FE]/50 border-none rounded-lg px-5 py-3 text-[12px] font-medium text-[#1B2559] outline-none placeholder:text-[#A3AED0] focus:ring-2 focus:ring-[#3B82F6]/10 transition-all font-kantumruy",
                                            error === "Product name is required" && "ring-2 ring-[#EE5D50]/20 bg-[#EE5D50]/5"
                                        )}
                                    />
                                </div>

                                {/* Category Selection (Typable) */}
                                <div className="space-y-1.5 relative">
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Category</label>
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
                                            className="w-full bg-[#F4F7FE]/50 rounded-lg px-5 py-3 text-[12px] font-medium text-[#1B2559] outline-none hover:bg-[#F4F7FE]/80 transition-all border border-transparent focus:border-[#3B82F6]/20"
                                        />
                                        <ChevronDown className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] transition-transform pointer-events-none", isCategoryDropdownOpen && "rotate-180")} />

                                        {isCategoryDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E0E5F2] scrollbar-track-transparent">
                                                        {dbCategories
                                                            .filter(cat => !formData.category || cat.toLowerCase().includes(formData.category.toLowerCase()))
                                                            .map((cat) => (
                                                                <button
                                                                    key={cat}
                                                                    type="button"
                                                                    onClick={() => { setFormData({ ...formData, category: cat }); setIsCategoryDropdownOpen(false); }}
                                                                    className={cn("w-full px-5 py-2.5 text-left text-[12px] font-medium transition-colors hover:bg-[#F4F7FE]", formData.category === cat ? "text-[#3B82F6] bg-[#F4F7FE]/50" : "text-[#1B2559]")}
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
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">SKU</label>
                                    <div className="relative bg-[#F4F7FE]/50 rounded-lg px-5 py-3 flex items-center gap-3">
                                        <Hash className="w-4 h-4 text-[#A3AED0]" />
                                        <input
                                            type="text"
                                            placeholder="213-2311"
                                            value={formData.sku}
                                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                            className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-medium outline-none placeholder:text-[#A3AED0] w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Qty, Unit, Cost, Price */}
                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Quantity</label>
                                    <div className="relative bg-[#F4F7FE]/50 rounded-lg px-5 py-3 flex items-center gap-3">
                                        <Layers className="w-4 h-4 text-[#3B82F6]" />
                                        <input
                                            type="number"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-medium outline-none w-full"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Unit</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Piece"
                                            value={formData.unit}
                                            onFocus={() => setIsUnitDropdownOpen(true)}
                                            onChange={(e) => { setFormData({ ...formData, unit: e.target.value }); setIsUnitDropdownOpen(true); }}
                                            className="w-full bg-[#F4F7FE]/50 rounded-lg px-5 py-3 text-[12px] font-medium text-[#1B2559] outline-none hover:bg-[#F4F7FE]/80 transition-all border border-transparent focus:border-[#3B82F6]/20"
                                        />
                                        <ChevronDown className={cn("absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] pointer-events-none transition-transform", isUnitDropdownOpen && "rotate-180")} />
                                        {isUnitDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsUnitDropdownOpen(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#E0E5F2] rounded-lg shadow-xl z-50 overflow-hidden">
                                                    <div className="max-h-[200px] overflow-y-auto">
                                                        {dbUnits.filter(u => !formData.unit || u.toLowerCase().includes(formData.unit.toLowerCase())).map(u => (
                                                            <button key={u} type="button" onClick={() => { setFormData({ ...formData, unit: u }); setIsUnitDropdownOpen(false); }} className={cn("w-full px-5 py-2.5 text-left text-[12px] font-medium", formData.unit === u ? "text-[#3B82F6] bg-[#F4F7FE]/50" : "text-[#1B2559] hover:bg-[#F4F7FE]")}>
                                                                {u}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Cost (Buy)</label>
                                    <div className="relative bg-[#F4F7FE]/50 rounded-lg px-5 py-3 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-[#19D5C5]" />
                                        <input type="number" value={formData.buyPrice} onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) || 0 })} className="bg-transparent border-none p-0 text-[13px] font-medium text-[#1B2559] outline-none w-full" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Price (Sell)</label>
                                    <div className="relative bg-[#F4F7FE]/50 rounded-lg px-5 py-3 flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-[#3B82F6]" />
                                        <input type="number" value={formData.sellPrice} onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })} className="bg-transparent border-none p-0 text-[13px] font-medium text-[#1B2559] outline-none w-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stock History Section */}
                    <div className="bg-white rounded-lg border border-[#E0E5F2] px-8 py-6 shadow-sm">
                        <h2 className="text-xl font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy mb-6">
                            <Calendar className="w-5 h-5 text-[#3B82F6]" />
                            Stock History
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex items-center gap-5 p-4 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50 hover:border-[#3B82F6]/20 transition-all group">
                                <div className="w-12 h-12 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center group-hover:shadow-sm transition-all">
                                    <ArrowUpRight className="w-6 h-6 text-[#19D5C5]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Last Stock In</p>
                                    <h3 className="text-xl font-medium text-[#1B2559]">
                                        {formData.lastStockIn ? new Date(formData.lastStockIn).toLocaleDateString('en-GB') : "No records found"}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-4 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50 hover:border-[#3B82F6]/20 transition-all group">
                                <div className="w-12 h-12 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center group-hover:shadow-sm transition-all">
                                    <ArrowDownRight className="w-6 h-6 text-[#EE5D50]" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Last Stock Out</p>
                                    <h3 className="text-xl font-medium text-[#1B2559]">
                                        {formData.lastStockOut ? new Date(formData.lastStockOut).toLocaleDateString('en-GB') : "No records found"}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Usage Dashboard (4 Cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white rounded-lg border border-[#E0E5F2] p-8 shadow-sm h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy">
                                <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
                                Usage Dashboard
                            </h2>
                        </div>

                        {/* Usage Value Display */}
                        <div className="mb-10">
                            <p className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Total Units Used</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-5xl font-medium text-[#1B2559] tracking-tighter">
                                    {usageStats.reduce((a, b) => a + b, 0).toLocaleString()}
                                </h3>
                                <span className="text-[14px] font-medium text-[#3B82F6]">{formData.unit || "Units"}</span>
                            </div>
                        </div>

                        {/* Chart Area - Visual Simulation (Premium Aesthetic) */}
                        <div className="flex-1 min-h-[220px] flex items-end justify-between gap-3 px-2 mb-10 group/chart">
                            {usageStats.map((val, i) => {
                                const max = Math.max(...usageStats);
                                const height = (val / max) * 100;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                        <div
                                            className="w-full bg-[#F4F7FE] rounded-lg relative group overflow-hidden transition-all duration-700 ease-out"
                                            style={{ height: `100%`, maxHeight: `${height}%` }}
                                        >
                                            <div className="absolute inset-0 bg-[#3B82F6]/10 scale-0 group-hover:scale-100 transition-transform duration-300" />
                                            <div className="absolute inset-x-0 bottom-0 bg-[#3B82F6]/90 h-[4px] opacity-0 group-hover:opacity-100 transition-all duration-300" />
                                            {/* Value on Hover */}
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#3B82F6] opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                {val}
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-tighter">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Timeframe Toggle */}
                        <div className="bg-[#F4F7FE]/50 p-1.5 rounded-lg flex gap-1">
                            {(['1m', '3m', '6m'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTimeframe(t)}
                                    className={cn(
                                        "flex-1 py-2.5 rounded-lg text-[10px] font-medium uppercase tracking-widest transition-all",
                                        timeframe === t ? "bg-white text-[#3B82F6] shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

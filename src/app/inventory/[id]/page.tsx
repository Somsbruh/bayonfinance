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
    ArrowDownRight,
    Plus
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
    const [adjQty, setAdjQty] = useState<number>(0);
    const [adjNote, setAdjNote] = useState<string>("");
    const [usageData, setUsageData] = useState<number[]>([]);
    const [usageLabels, setUsageLabels] = useState<string[]>([]);
    const [totalConsumption, setTotalConsumption] = useState(0);
    const [usageTrend, setUsageTrend] = useState(0);
    const [showNote, setShowNote] = useState(false);

    const [formData, setFormData] = useState<{
        vendorName: string;
        contactPerson: string;
        phoneNumber: string;
        productName: string;
        category: string;
        sku: string;
        quantity: number;
        unit: string;
        buyPrice: number;
        sellPrice: number;
        lastStockIn: string | null;
        lastStockOut: string | null;
    }>({
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
        lastStockIn: null,
        lastStockOut: null
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
                        lastStockOut: item.last_stock_out || null
                    });
                    setVendorSearch(item.vendor || "");
                }

                // Fetch suggestions
                const { data: suggestions, error: sugError } = await supabase.from('inventory').select('category, unit');
                if (sugError) throw sugError;

                if (suggestions) {
                    const cats = Array.from(new Set(suggestions.map(i => i.category).filter(Boolean)));
                    const units = Array.from(new Set(suggestions.map(i => i.unit).filter(Boolean)));

                    const defaultCats = ["Medicine", "Pain and Anxiety", "Antibiotics", "Supplements", "General"];
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

    const handleAdjustStock = async (amount: number, type: 'IN' | 'OUT') => {
        const adjustment = type === 'IN' ? amount : -amount;
        const newQty = Math.max(0, formData.quantity + adjustment);
        const now = new Date().toISOString();

        setFormData(prev => ({
            ...prev,
            quantity: newQty,
            lastStockIn: type === 'IN' ? now : prev.lastStockIn,
            lastStockOut: type === 'OUT' ? now : prev.lastStockOut
        }));

        try {
            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    stock_level: newQty,
                    [type === 'IN' ? 'last_stock_in' : 'last_stock_out']: now
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Log to audit_logs
            await supabase.from('audit_logs').insert({
                table_name: 'inventory',
                record_id: id,
                action: type === 'IN' ? 'STOCK_IN' : 'STOCK_OUT',
                new_values: {
                    quantity: amount,
                    note: adjNote,
                    previous_stock: formData.quantity,
                    new_stock: newQty
                }
            });

            // Success - Reset adjustment fields
            setAdjQty(0);
            setAdjNote("");
            alert(`Stock ${type === 'IN' ? 'added' : 'decreased'} successfully`);
        } catch (err: any) {
            console.error('Error adjusting stock:', err);
            alert("Failed to adjust stock: " + err.message);
        }
    };

    useEffect(() => {
        const fetchUsageData = async () => {
            if (!id) return;
            try {
                // Fetch audit logs for STOCK_OUT actions
                const { data, error } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .eq('table_name', 'inventory')
                    .eq('record_id', id)
                    .eq('action', 'STOCK_OUT')
                    .order('created_at', { ascending: true });

                if (error) throw error;

                // Simple weekly grouping for 1m, monthly for 3m/6m
                const now = new Date();
                let points = 6;
                let values: number[] = new Array(points).fill(0);
                let labels: string[] = [];

                if (timeframe === '1m') {
                    // Last 6 weeks (approx 1m)
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date();
                        d.setDate(now.getDate() - (i * 7));
                        labels.push(`Week ${6 - i}`);
                    }
                    (data || []).forEach(log => {
                        const logDate = new Date(log.created_at);
                        const weeksAgo = Math.floor((now.getTime() - logDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
                        if (weeksAgo >= 0 && weeksAgo < 6) {
                            values[5 - weeksAgo] += Number(log.new_values?.quantity || 0);
                        }
                    });
                } else {
                    // Last 6 months
                    points = 6;
                    values = new Array(points).fill(0);
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date();
                        d.setMonth(now.getMonth() - i);
                        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
                    }
                    (data || []).forEach(log => {
                        const logDate = new Date(log.created_at);
                        const monthsAgo = (now.getFullYear() - logDate.getFullYear()) * 12 + (now.getMonth() - logDate.getMonth());
                        if (monthsAgo >= 0 && monthsAgo < 6) {
                            values[5 - monthsAgo] += Number(log.new_values?.quantity || 0);
                        }
                    });
                }

                setUsageData(values);
                setUsageLabels(labels);
                setTotalConsumption(values.reduce((a, b) => a + b, 0));

                // Calculate Trend
                const last = values[points - 1];
                const prev = values[points - 2] || 1; // Avoid div by zero
                setUsageTrend(Math.round(((last - prev) / prev) * 100));

            } catch (err) {
                console.error("Error fetching usage data:", err);
            }
        };

        fetchUsageData();
    }, [id, timeframe]);

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
                })
                .eq('id', id);

            if (updateError) throw updateError;
            router.refresh();
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


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-10 h-10 animate-spin text-[#3B82F6]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
                <div className="flex items-center gap-5">
                    <Link href="/inventory">
                        <button className="w-11 h-11 rounded-full border border-[#E0E5F2] bg-white flex items-center justify-center text-[#1B2559] hover:shadow-md transition-all shadow-sm group">
                            <ArrowLeft className="w-5.5 h-5.5 transition-transform group-hover:-translate-x-0.5" />
                        </button>
                    </Link>
                    <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-0.5">Product Profile</p>
                        <h1 className="text-4xl font-medium text-[#1B2559] tracking-tight truncate max-w-[500px] leading-none">
                            {formData.productName || "Item Details"}
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex items-center gap-2 px-6 py-3 rounded-lg text-[11px] font-medium uppercase text-[#EE5D50] hover:bg-[#EE5D50]/5 transition-all"
                    >
                        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4.5 h-4.5" />}
                        Delete
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={saving}
                        className="bg-[#3B82F6] px-8 py-3 rounded-lg text-[11px] font-medium text-white hover:bg-[#2563EB] transition-all shadow-md shadow-[#3B82F6]/20 uppercase tracking-widest flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? "Updating..." : "Update Product"}
                    </button>
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="flex flex-col gap-6">
                {/* Vendor Information (Full Width) */}
                <div className="bg-white rounded-lg border border-[#E0E5F2] p-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
                        <div className="md:col-span-3 mb-2">
                            <h2 className="text-2xl font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy tracking-tight">
                                <Building2 className="w-6 h-6 text-[#3B82F6]" />
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
                    </div>
                </div>

                {/* Product Details (Full Width) */}
                <div className="bg-white rounded-lg border border-[#E0E5F2] p-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6">
                        <div className="md:col-span-4 mb-2">
                            <h2 className="text-2xl font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy tracking-tight">
                                <Package className="w-6 h-6 text-[#3B82F6]" />
                                Product Details
                            </h2>
                        </div>

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
                                            <div className="max-h-[200px] overflow-y-auto">
                                                {dbCategories
                                                    .filter(cat => !formData.category || cat.toLowerCase().includes(formData.category.toLowerCase()))
                                                    .map((cat) => (
                                                        <button
                                                            key={cat}
                                                            type="button"
                                                            onClick={() => { setFormData({ ...formData, category: cat }); setIsCategoryDropdownOpen(false); }}
                                                            className={cn("w-full px-5 py-2.5 text-left text-[11px] font-medium uppercase tracking-widest transition-colors hover:bg-[#F4F7FE]", formData.category === cat ? "text-[#3B82F6] bg-[#F4F7FE]/50" : "text-[#1B2559]")}
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

                {/* Bottom Sections: Stock & Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Stock Management (6/12) */}
                    <div className="lg:col-span-6 flex flex-col">
                        <div className="bg-white rounded-lg border border-[#E0E5F2] p-6 shadow-sm flex-1">
                            <div className="flex items-center justify-between gap-4 mb-4">
                                <h2 className="text-[20px] font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy tracking-tight">
                                    <Calendar className="w-5 h-5 text-[#3B82F6]" />
                                    Stock Management
                                </h2>
                                <button
                                    onClick={() => setShowNote(!showNote)}
                                    className={cn(
                                        "text-[10px] font-medium uppercase tracking-widest transition-colors",
                                        showNote ? "text-[#3B82F6]" : "text-[#A3AED0] hover:text-[#1B2559]"
                                    )}
                                >
                                    {showNote ? "Hide Note" : "Add Note"}
                                </button>
                            </div>

                            <div className="flex-1 space-y-3">
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Amount</label>
                                        <div className="relative bg-[#F4F7FE]/50 rounded-lg px-4 py-2 flex items-center gap-3 border border-transparent focus-within:ring-2 focus-within:ring-[#3B82F6]/10 transition-all">
                                            <Layers className="w-4 h-4 text-[#3B82F6]" />
                                            <input
                                                type="number"
                                                value={adjQty || ""}
                                                onChange={(e) => setAdjQty(parseInt(e.target.value) || 0)}
                                                placeholder="e.g. 10"
                                                className="bg-transparent border-none p-0 text-[12px] font-medium text-[#1B2559] outline-none placeholder:text-[#A3AED0] w-full"
                                            />
                                        </div>
                                    </div>

                                    {showNote && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                            <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Reason / Note</label>
                                            <textarea
                                                value={adjNote}
                                                onChange={(e) => setAdjNote(e.target.value)}
                                                placeholder="e.g. Withdrawing 22 boxes..."
                                                className="w-full bg-[#F4F7FE]/50 border-none rounded-lg px-4 py-2 text-[12px] font-medium text-[#1B2559] outline-none min-h-[60px] resize-none placeholder:text-[#A3AED0] focus:ring-1 focus:ring-[#3B82F6]/10 transition-all"
                                            />
                                        </div>
                                    )}

                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => handleAdjustStock(adjQty, 'IN')}
                                            disabled={!adjQty || adjQty <= 0}
                                            className="flex-1 bg-[#19D5C5] text-white py-2.5 rounded-lg font-medium text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#19D5C5]/20 disabled:opacity-50 disabled:scale-100"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Add
                                        </button>
                                        <button
                                            onClick={() => handleAdjustStock(adjQty, 'OUT')}
                                            disabled={!adjQty || adjQty <= 0 || adjQty > formData.quantity}
                                            className="flex-1 bg-[#EE5D50] text-white py-2.5 rounded-lg font-medium text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#EE5D50]/20 disabled:opacity-50 disabled:scale-100"
                                        >
                                            <div className="w-3 h-0.5 bg-white rounded-full" /> Decrease
                                        </button>
                                    </div>
                                </div>

                                <div className="h-[1px] bg-[#F4F7FE] my-1" />

                                <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50 hover:border-[#3B82F6]/20 transition-all group">
                                        <div className="w-8 h-8 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                            <ArrowUpRight className="w-4 h-4 text-[#19D5C5]" />
                                        </div>
                                        <div className="flex-1 truncate">
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Last In</p>
                                            <h3 className="text-[11px] font-medium text-[#1B2559] truncate leading-tight">
                                                {formData.lastStockIn ? new Date(formData.lastStockIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "—"}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50 hover:border-[#3B82F6]/20 transition-all group">
                                        <div className="w-8 h-8 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                            <ArrowDownRight className="w-4 h-4 text-[#EE5D50]" />
                                        </div>
                                        <div className="flex-1 truncate">
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Last Out</p>
                                            <h3 className="text-[11px] font-medium text-[#1B2559] truncate leading-tight">
                                                {formData.lastStockOut ? new Date(formData.lastStockOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "—"}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50 hover:border-[#3B82F6]/20 transition-all group">
                                        <div className="w-8 h-8 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                            <Layers className="w-4 h-4 text-[#3B82F6]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Qty</p>
                                            <div className="flex items-baseline gap-1 leading-tight">
                                                <h3 className="text-[12px] font-medium text-[#1B2559]">{formData.quantity}</h3>
                                                <span className="text-[8px] font-medium text-[#A3AED0] uppercase">{formData.unit}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50 hover:border-[#3B82F6]/20 transition-all group">
                                        <div className="w-8 h-8 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                formData.quantity > 20 ? "bg-[#19D5C5]" : formData.quantity > 5 ? "bg-[#FFB547]" : "bg-[#EE5D50]"
                                            )} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Health</p>
                                            <h3 className={cn(
                                                "text-[9px] font-medium uppercase tracking-tight leading-tight",
                                                formData.quantity > 20 ? "text-[#19D5C5]" : formData.quantity > 5 ? "text-[#FFB547]" : "text-[#EE5D50]"
                                            )}>
                                                {formData.quantity > 20 ? "OK" : formData.quantity > 0 ? "LOW" : "OUT"}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Section (6/12) */}
                    <div className="lg:col-span-6 flex flex-col">
                        <div className="bg-white rounded-lg border border-[#E0E5F2] p-6 shadow-sm flex-1">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                <h2 className="text-[20px] font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy tracking-tight">
                                    <BarChart3 className="w-5 h-5 text-[#3B82F6]" />
                                    Analysis
                                </h2>

                                <div className="bg-[#F4F7FE]/50 p-0.5 rounded-lg flex gap-1 w-full md:w-36">
                                    {(['1m', '3m', '6m'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setTimeframe(t)}
                                            className={cn(
                                                "flex-1 py-1 rounded-lg text-[9px] font-medium uppercase tracking-widest transition-all",
                                                timeframe === t ? "bg-white text-[#3B82F6] shadow-sm" : "text-[#A3AED0] hover:text-[#1B2559]"
                                            )}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between gap-3 p-4 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50">
                                    <div>
                                        <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Consumption</p>
                                        <div className="flex items-baseline gap-1.5">
                                            <h3 className="text-2xl font-medium text-[#1B2559] tracking-tighter">
                                                {totalConsumption.toLocaleString()}
                                            </h3>
                                            <span className="text-[10px] font-medium text-[#A3AED0] uppercase">{formData.unit}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Trend</p>
                                        <div className={cn(
                                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium",
                                            usageTrend >= 0 ? "bg-[#19D5C5]/10 text-[#19D5C5]" : "bg-[#EE5D50]/10 text-[#EE5D50]"
                                        )}>
                                            {usageTrend >= 0 ? <Plus className="w-2.5 h-2.5" /> : <div className="w-2 h-0.5 bg-current" />}
                                            {Math.abs(usageTrend)}%
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[120px] flex items-end justify-between gap-2 px-1 group/chart">
                                    {usageData.map((val, i) => {
                                        const max = Math.max(...usageData, 1);
                                        const height = (val / max) * 100;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                                <div
                                                    className="w-full bg-[#F4F7FE] rounded-t-xl relative group overflow-hidden transition-all duration-700 ease-out cursor-pointer hover:shadow-md"
                                                    style={{ height: `${height}%`, minHeight: '10%' }}
                                                >
                                                    <div className="absolute inset-x-0 bottom-0 bg-[#3B82F6] h-1 transition-all duration-500 rounded-t-full" />
                                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1B2559] text-white px-2 py-1 rounded-md text-[8px] font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-lg whitespace-nowrap">
                                                        {val} {formData.unit}
                                                    </div>
                                                </div>
                                                <span className="text-[7px] font-medium text-[#A3AED0] uppercase tracking-tight">
                                                    {usageLabels[i]}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

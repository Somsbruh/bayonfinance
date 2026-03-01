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
    Plus,
    ClipboardList,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import DatePicker from "@/components/DatePicker";

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
    const [adjQty, setAdjQty] = useState<number>(0);
    const [adjNote, setAdjNote] = useState<string>("");
    const [usageData, setUsageData] = useState<number[]>([]);
    const [usageLabels, setUsageLabels] = useState<string[]>([]);
    const [totalConsumption, setTotalConsumption] = useState(0);
    const [usageTrend, setUsageTrend] = useState(0);
    const [showNote, setShowNote] = useState(false);
    const [adjExpiry, setAdjExpiry] = useState<string>("");
    const [showVendorInfo, setShowVendorInfo] = useState(false);
    const [showProductDetails, setShowProductDetails] = useState(false);

    interface Transaction {
        id: string;
        created_at: string;
        type: string;
        quantity_change: number;
        resulting_stock: number;
        expiry_date: string | null;
        reason: string | null;
        performed_by: string | null;
    }
    const [transactions, setTransactions] = useState<Transaction[]>([]);

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
        item_type: 'medicine' | 'inventory';
        lowStockThreshold: number;
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
        lastStockOut: null,
        item_type: 'medicine' as 'medicine' | 'inventory',
        lowStockThreshold: 10,
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
                        lowStockThreshold: item.low_stock_threshold ?? 10,
                    });
                    setVendorSearch(item.vendor || "");
                }

                // Fetch suggestions scoped to the same item_type
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

                // Fetch transaction history
                const { data: txns, error: txnError } = await supabase
                    .from('inventory_transactions')
                    .select('*')
                    .eq('inventory_id', id)
                    .order('created_at', { ascending: false });
                if (txnError) throw txnError;
                setTransactions(txns || []);
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
            // 1. Update inventory stock level
            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    stock_level: newQty,
                    [type === 'IN' ? 'last_stock_in' : 'last_stock_out']: now
                })
                .eq('id', id);

            if (updateError) throw updateError;

            // 2. Create transaction log
            const { data: newTxn, error: txnError } = await supabase
                .from('inventory_transactions')
                .insert({
                    inventory_id: id,
                    type: type === 'IN' ? 'in' : 'out',
                    quantity_change: adjustment,
                    resulting_stock: newQty,
                    reason: adjNote || null,
                    expiry_date: type === 'IN' && adjExpiry ? adjExpiry : null,
                })
                .select()
                .single();

            if (txnError) throw txnError;

            // 3. Update local transaction list
            if (newTxn) {
                setTransactions(prev => [newTxn, ...prev]);
            }

            // 4. Reset adjustment fields
            setAdjQty(0);
            setAdjNote("");
            setAdjExpiry("");
            setShowNote(false);
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
                    item_type: formData.item_type,
                    low_stock_threshold: formData.lowStockThreshold || 10,
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
                <div className="bg-white rounded-lg border border-[#E0E5F2] shadow-sm overflow-hidden">
                    {/* Toggle Header */}
                    <button
                        onClick={() => setShowVendorInfo(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F4F7FE]/30 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <Building2 className="w-5 h-5 text-[#3B82F6]" />
                            <h2 className="text-[14px] font-black text-[#1B2559] tracking-tight">Vendor Information</h2>
                            {!showVendorInfo && formData.vendorName && (
                                <span className="text-[11px] font-medium text-[#A3AED0] ml-1">· {formData.vendorName}</span>
                            )}
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-[#A3AED0] transition-transform duration-200", showVendorInfo && "rotate-180")} />
                    </button>

                    {/* Collapsible Content */}
                    <div className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        showVendorInfo ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                        <div className="px-6 pb-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">

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
                    </div>
                </div>

                {/* Product Details (Full Width) */}
                <div className="bg-white rounded-lg border border-[#E0E5F2] shadow-sm overflow-hidden">
                    {/* Toggle Header */}
                    <button
                        onClick={() => setShowProductDetails(v => !v)}
                        className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#F4F7FE]/30 transition-colors"
                    >
                        <div className="flex items-center gap-2.5">
                            <Package className="w-5 h-5 text-[#3B82F6]" />
                            <h2 className="text-[14px] font-black text-[#1B2559] tracking-tight">Product Details</h2>
                            {!showProductDetails && formData.sku && (
                                <span className="text-[11px] font-medium text-[#A3AED0] ml-1">· SKU {formData.sku}</span>
                            )}
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-[#A3AED0] transition-transform duration-200", showProductDetails && "rotate-180")} />
                    </button>

                    {/* Collapsible Content */}
                    <div className={cn(
                        "overflow-hidden transition-all duration-300 ease-in-out",
                        showProductDetails ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                    )}>
                        <div className="px-6 pb-6 pt-2">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-6">

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

                                {/* Low Stock Threshold */}
                                <div className="md:col-span-4">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Low Stock At</label>
                                            <div className="relative bg-[#F4F7FE]/50 rounded-lg px-3 py-3 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-[#FFB547] shrink-0" />
                                                <input
                                                    type="number"
                                                    placeholder="10"
                                                    min={0}
                                                    value={formData.lowStockThreshold || ""}
                                                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                                                    className="bg-transparent border-none p-0 text-[#1B2559] text-[12px] font-medium outline-none placeholder:text-[#A3AED0] w-full"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Quantity</label>
                                            <div className="relative bg-[#F4F7FE]/50 rounded-lg px-3 py-3 flex items-center gap-2">
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
                                                    className="w-full bg-[#F4F7FE]/50 rounded-lg px-3 py-3 text-[12px] font-medium text-[#1B2559] outline-none hover:bg-[#F4F7FE]/80 transition-all border border-transparent focus:border-[#3B82F6]/20"
                                                />
                                                <ChevronDown className={cn("absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3AED0] pointer-events-none transition-transform", isUnitDropdownOpen && "rotate-180")} />
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
                                            <div className="relative bg-[#F4F7FE]/50 rounded-lg px-3 py-3 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-[#19D5C5]" />
                                                <input type="number" value={formData.buyPrice} onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) || 0 })} className="bg-transparent border-none p-0 text-[13px] font-medium text-[#1B2559] outline-none w-full" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Price (Sell)</label>
                                            <div className="relative bg-[#F4F7FE]/50 rounded-lg px-3 py-3 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-[#3B82F6]" />
                                                <input type="number" value={formData.sellPrice} onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })} className="bg-transparent border-none p-0 text-[13px] font-medium text-[#1B2559] outline-none w-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Sections: Stock & Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Stock Management (6/12) */}
                <div className="lg:col-span-6 flex flex-col">
                    <div className="bg-white rounded-lg border border-[#E0E5F2] p-5 shadow-sm flex-1 flex flex-col gap-3">

                        {/* Header */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4.5 h-4.5 text-[#3B82F6] shrink-0" />
                            <h2 className="text-[14px] font-black text-[#1B2559] tracking-tight flex-1">Stock Management</h2>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center justify-between bg-[#F4F7FE]/60 rounded-xl px-4 py-3 border border-[#E0E5F2]/50">
                            <button
                                onClick={() => setAdjQty(q => q - 1)}
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-[#EE5D50] hover:bg-[#EE5D50]/10 active:scale-90 transition-all font-black text-2xl select-none"
                            >
                                −
                            </button>
                            <div className="flex flex-col items-center">
                                <span className={cn(
                                    "text-3xl font-black tabular-nums leading-none transition-colors",
                                    adjQty === 0 ? "text-[#A3AED0]" : adjQty > 0 ? "text-[#19D5C5]" : "text-[#EE5D50]"
                                )}>
                                    {adjQty > 0 ? `+${adjQty}` : adjQty}
                                </span>
                                <span className="text-[8px] font-medium text-[#A3AED0] uppercase tracking-widest mt-1">{formData.unit}</span>
                            </div>
                            <button
                                onClick={() => setAdjQty(q => q + 1)}
                                className="w-12 h-12 rounded-xl flex items-center justify-center text-[#19D5C5] hover:bg-[#19D5C5]/10 active:scale-90 transition-all font-black text-2xl select-none"
                            >
                                +
                            </button>
                        </div>

                        {/* Expiry — greyed out when qty = 0 or negative */}
                        <div className={cn("space-y-1 transition-opacity duration-200", adjQty <= 0 ? "opacity-40 pointer-events-none" : "opacity-100")}>
                            <label className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest pl-1">Batch Expiry Date</label>
                            <DatePicker
                                value={adjExpiry || undefined}
                                onChange={(date) => setAdjExpiry(date.toISOString().split('T')[0])}
                                placeholder="Optional"
                                format="dd/MM/yyyy"
                                triggerClassName="bg-[#F4F7FE]/50 border-[#F4F7FE] hover:bg-[#F4F7FE]/80 h-[36px] px-4"
                            />
                        </div>

                        {/* Reason — inline toggle, no layout shift */}
                        <div>
                            <button
                                onClick={() => setShowNote(n => !n)}
                                className="flex items-center gap-1.5 text-[10px] font-black text-[#A3AED0] hover:text-[#1B2559] uppercase tracking-widest transition-colors"
                            >
                                <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showNote && "rotate-180")} />
                                {showNote ? "Hide reason" : "Add reason"}
                                {adjNote && !showNote && (
                                    <span className="ml-1 text-[#4318FF]/60 normal-case truncate max-w-[120px]">· {adjNote}</span>
                                )}
                            </button>
                            <div className={cn(
                                "overflow-hidden transition-all duration-200",
                                showNote ? "max-h-[80px] mt-1.5 opacity-100" : "max-h-0 opacity-0"
                            )}>
                                <textarea
                                    value={adjNote}
                                    onChange={(e) => setAdjNote(e.target.value)}
                                    placeholder="e.g. Restock from supplier..."
                                    className="w-full bg-[#F4F7FE]/50 border-none rounded-lg px-4 py-2 text-[11px] font-medium text-[#1B2559] outline-none h-[64px] resize-none placeholder:text-[#A3AED0] focus:ring-1 focus:ring-[#3B82F6]/10 transition-all"
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-[1px] bg-[#F4F7FE]" />

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50">
                                <div className="w-6 h-6 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0">
                                    <ArrowUpRight className="w-3 h-3 text-[#19D5C5]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[7px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none mb-0.5">Last In</p>
                                    <p className="text-[9px] font-medium text-[#1B2559] truncate leading-tight">
                                        {formData.lastStockIn ? new Date(formData.lastStockIn).toLocaleDateString('en-GB') : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50">
                                <div className="w-6 h-6 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0">
                                    <ArrowDownRight className="w-3 h-3 text-[#EE5D50]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[7px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none mb-0.5">Last Out</p>
                                    <p className="text-[9px] font-medium text-[#1B2559] truncate leading-tight">
                                        {formData.lastStockOut ? new Date(formData.lastStockOut).toLocaleDateString('en-GB') : "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#F4F7FE]/30 border border-[#E0E5F2]/50">
                                <div className="w-6 h-6 rounded-full bg-white border border-[#E0E5F2] flex items-center justify-center shrink-0">
                                    <Layers className="w-3 h-3 text-[#3B82F6]" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[7px] font-medium text-[#A3AED0] uppercase tracking-widest leading-none mb-0.5">Stock</p>
                                    <p className="text-[9px] font-medium text-[#1B2559] leading-tight">
                                        {formData.quantity} <span className="text-[7px] text-[#A3AED0] uppercase">{formData.unit}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={() => {
                                if (adjQty === 0) return;
                                handleAdjustStock(Math.abs(adjQty), adjQty > 0 ? 'IN' : 'OUT');
                            }}
                            disabled={adjQty === 0}
                            className={cn(
                                "w-full py-3.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-auto shadow-md disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none active:scale-[0.99]",
                                adjQty > 0
                                    ? "bg-[#19D5C5] text-white shadow-[#19D5C5]/25 hover:opacity-90"
                                    : adjQty < 0
                                        ? "bg-[#EE5D50] text-white shadow-[#EE5D50]/25 hover:opacity-90"
                                        : "bg-[#F4F7FE] text-[#A3AED0]"
                            )}
                        >
                            {adjQty > 0 ? <Plus className="w-4 h-4" /> : adjQty < 0 ? <div className="w-3.5 h-0.5 bg-white rounded-full" /> : null}
                            Confirm
                            {adjQty !== 0 && (
                                <span className="opacity-70">
                                    ({adjQty > 0 ? `+${adjQty}` : adjQty} {formData.unit})
                                </span>
                            )}
                        </button>

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

            {/* Transaction History Sheet */}
            <div className="bg-white rounded-lg border border-[#E0E5F2] shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-[#E0E5F2] flex items-center justify-between">
                    <h2 className="text-[20px] font-medium text-[#1B2559] flex items-center gap-2 font-kantumruy tracking-tight">
                        <ClipboardList className="w-5 h-5 text-[#3B82F6]" />
                        Transaction History
                    </h2>
                    <span className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">
                        {transactions.length} record{transactions.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {transactions.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <ClipboardList className="w-10 h-10 text-[#E0E5F2] mx-auto mb-3" />
                        <p className="text-[12px] font-medium text-[#A3AED0]">No transactions yet</p>
                        <p className="text-[10px] text-[#A3AED0]/60 mt-1">Use the stock management controls above to add or remove stock</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#E0E5F2]">
                                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Date & Time</th>
                                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Action</th>
                                    <th className="px-5 py-3.5 text-right text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Change</th>
                                    <th className="px-5 py-3.5 text-right text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Current Stock</th>
                                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Expiry</th>
                                    <th className="px-5 py-3.5 text-left text-[10px] font-black text-[#A3AED0] uppercase tracking-widest">Reason</th>
                                    <th className="px-3 py-3.5 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn, index) => {
                                    const isIn = txn.type === 'in';
                                    const dateObj = new Date(txn.created_at);
                                    return (
                                        <tr
                                            key={txn.id}
                                            className={cn(
                                                "border-b border-[#F4F7FE] transition-colors hover:bg-[#F4F7FE]/30",
                                                index % 2 === 0 ? "bg-white" : "bg-[#FAFBFF]"
                                            )}
                                        >
                                            <td className="px-5 py-3">
                                                <div className="text-[11px] font-medium text-[#1B2559]">
                                                    {dateObj.toLocaleDateString('en-GB')}
                                                </div>
                                                <div className="text-[9px] font-medium text-[#A3AED0] mt-0.5">
                                                    {dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className={cn(
                                                    "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight",
                                                    isIn ? "text-[#19D5C5]" : "text-[#EE5D50]"
                                                )}>
                                                    <div className={cn("w-2 h-2 rounded-full", isIn ? "bg-[#19D5C5]" : "bg-[#EE5D50]")} />
                                                    {isIn ? 'STOCK IN' : 'STOCK OUT'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className={cn(
                                                    "text-[12px] font-black tabular-nums",
                                                    isIn ? "text-[#19D5C5]" : "text-[#EE5D50]"
                                                )}>
                                                    {isIn ? '+' : ''}{txn.quantity_change}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <span className="text-[12px] font-black text-[#1B2559] tabular-nums">
                                                    {txn.resulting_stock}
                                                </span>
                                                <span className="text-[8px] font-medium text-[#A3AED0] uppercase ml-1">{formData.unit}</span>
                                            </td>
                                            <td className="px-5 py-3">
                                                {txn.expiry_date ? (
                                                    <span className="text-[11px] font-medium text-[#FFB547]">
                                                        {new Date(txn.expiry_date).toLocaleDateString('en-GB')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-[#E0E5F2]">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-[11px] font-medium text-[#1B2559] truncate max-w-[200px] block">
                                                    {txn.reason || <span className="text-[#E0E5F2]">—</span>}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Delete this transaction record?')) return;
                                                        const { error } = await supabase
                                                            .from('inventory_transactions')
                                                            .delete()
                                                            .eq('id', txn.id);
                                                        if (!error) {
                                                            setTransactions(prev => prev.filter(t => t.id !== txn.id));
                                                        }
                                                    }}
                                                    className="p-1.5 text-[#A3AED0] hover:text-[#EE5D50] hover:bg-[#EE5D50]/10 rounded-lg transition-all"
                                                    title="Delete record"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

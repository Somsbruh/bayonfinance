"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import {
    Package, Plus, Search, Filter, MoreVertical,
    Building2, CheckCircle2,
    ArrowUpDown, Check, ArrowLeftRight, Columns3, ChevronDown, ZoomIn
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useBranch } from "@/context/BranchContext";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TransferStockModal from "@/components/TransferStockModal";
import { useReadOnly } from "@/context/ReadOnlyContext";
import { cn } from "@/lib/utils";

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    sku: string;
    vendor: string;
    stock_level: number;
    reception_stock: number;
    unit: string;
    sell_price: number;
    item_type: 'medicine' | 'inventory' | 'consumable_medical';
    status: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK';
    last_stock_in: string | null;
    buy_price: number;
    low_stock_threshold: number;
}

type SortConfig = {
    key: keyof InventoryItem | 'asset_value';
    direction: 'asc' | 'desc';
};

type ActiveFilter = 'none' | 'in-stock' | 'low-stock' | 'out-of-stock' | 'last-adjusted';

function InventoryPageInner() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Medicine' | 'Consumable Medical' | 'Inventory' | 'Order Stock'>(
        tabParam === 'inventory' ? 'Inventory' : tabParam === 'consumable' ? 'Consumable Medical' : 'Medicine'
    );
    const [showExtraColumns, setShowExtraColumns] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('none');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });
    const [transferItem, setTransferItem] = useState<InventoryItem | null>(null);
    const [internalTransferItem, setInternalTransferItem] = useState<InventoryItem | null>(null);
    const [internalTransferAmount, setInternalTransferAmount] = useState<string>("1");
    const [internalTransferDirection, setInternalTransferDirection] = useState<'to_reception' | 'to_stock'>('to_reception');
    const [isTransferring, setIsTransferring] = useState(false);
    const [nameFontSize, setNameFontSize] = useState<14 | 16 | 18>(14);
    const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (cat: string) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            next.has(cat) ? next.delete(cat) : next.add(cat);
            return next;
        });
    };

    const { currentBranch, branches } = useBranch();
    const { isReadOnly } = useReadOnly();

    useEffect(() => {
        if (currentBranch) fetchInventory();
    }, [currentBranch]);

    async function fetchInventory() {
        if (!currentBranch) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .eq('branch_id', currentBranch.id)
                .order('name', { ascending: true });

            if (error) throw error;

            // Process data for display
            const processedItems = (data || []).map(item => {
                const stock = item.stock_level || 0;
                const recStock = item.reception_stock || 0;
                const price = item.sell_price || 0;

                let status: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK' = 'OUT OF STOCK';
                if (stock > 5) status = 'IN STOCK';
                else if (stock > 0) status = 'LOW STOCK';

                return {
                    ...item,
                    sku: item.sku || '-',
                    vendor: item.vendor || '-',
                    stock_level: stock,
                    reception_stock: recStock,
                    unit: item.unit || 'Piece',
                    sell_price: price,
                    buy_price: item.buy_price || 0,
                    low_stock_threshold: item.low_stock_threshold || 10,
                    status
                };
            });

            setItems(processedItems);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleInternalTransfer = async () => {
        if (!internalTransferItem || !currentBranch) return;
        if (isReadOnly) return alert("Demo Mode: Action not allowed");

        const amount = parseInt(internalTransferAmount);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return;
        }

        const currentStockMain = internalTransferItem.stock_level;
        const currentStockRec = internalTransferItem.reception_stock;

        if (internalTransferDirection === 'to_reception' && amount > currentStockMain) {
            alert('Not enough items in Stock Room to transfer.');
            return;
        }
        if (internalTransferDirection === 'to_stock' && amount > currentStockRec) {
            alert('Not enough items at Front Desk to transfer.');
            return;
        }

        const newStockMain = internalTransferDirection === 'to_reception' ? currentStockMain - amount : currentStockMain + amount;
        const newStockRec = internalTransferDirection === 'to_reception' ? currentStockRec + amount : currentStockRec - amount;

        try {
            setIsTransferring(true);
            const { error } = await supabase
                .from('inventory')
                .update({
                    stock_level: newStockMain,
                    reception_stock: newStockRec
                })
                .eq('id', internalTransferItem.id);

            if (error) throw error;

            // Update local state immediately
            setItems(prev => prev.map(item =>
                item.id === internalTransferItem.id
                    ? { ...item, stock_level: newStockMain, reception_stock: newStockRec }
                    : item
            ));

            setInternalTransferItem(null);
            setInternalTransferAmount("1");
        } catch (error: any) {
            alert(error.message || 'Failed to transfer stock');
        } finally {
            setIsTransferring(false);
        }
    };

    const cycleFontSize = () => {
        setNameFontSize(prev => prev === 14 ? 16 : prev === 16 ? 18 : 14);
    };

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedItems = useMemo(() => {
        const sortableItems = [...items];
        // If last-adjusted filter is active, sort by last_stock_in descending
        if (activeFilter === 'last-adjusted') {
            sortableItems.sort((a, b) => {
                const dateA = a.last_stock_in ? new Date(a.last_stock_in).getTime() : 0;
                const dateB = b.last_stock_in ? new Date(b.last_stock_in).getTime() : 0;
                return dateB - dateA;
            });
            return sortableItems;
        }
        sortableItems.sort((a, b) => {
            let valA: any = a[sortConfig.key as keyof InventoryItem];
            let valB: any = b[sortConfig.key as keyof InventoryItem];

            if (sortConfig.key === 'asset_value') {
                valA = a.stock_level * a.sell_price;
                valB = b.stock_level * b.sell_price;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortableItems;
    }, [items, sortConfig, activeFilter]);

    const categories = useMemo(() => {
        const tabType = activeTab === 'Medicine' ? 'medicine' : activeTab === 'Consumable Medical' ? 'consumable_medical' : 'inventory';
        const relevantItems = items.filter(i => i.item_type === tabType);
        return ["All", ...Array.from(new Set(relevantItems.map(item => item.category).filter(Boolean)))];
    }, [items, activeTab]);

    const filteredItems = sortedItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTab = false;
        if (activeTab === 'Medicine') {
            matchesTab = item.item_type === 'medicine';
        } else if (activeTab === 'Consumable Medical') {
            matchesTab = item.item_type === 'consumable_medical';
        } else if (activeTab === 'Inventory') {
            matchesTab = item.item_type === 'inventory';
        }

        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;

        // Status filter
        let matchesFilter = true;
        if (activeFilter === 'in-stock') matchesFilter = item.status === 'IN STOCK';
        else if (activeFilter === 'low-stock') matchesFilter = item.status === 'LOW STOCK';
        else if (activeFilter === 'out-of-stock') matchesFilter = item.status === 'OUT OF STOCK';

        return matchesSearch && matchesCategory && matchesTab && matchesFilter;
    });

    const toggleSelectItem = (id: string) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === filteredItems.length) {
            setSelectedItems([]);
        } else {
            setSelectedItems(filteredItems.map(i => i.id));
        }
    };

    const scrollToCategory = (category: string) => {
        const el = document.getElementById(`category-${category.replace(/\s+/g, '-')}`);
        if (el) {
            setCollapsedCategories(prev => {
                const next = new Set(prev);
                Array.from(new Set(filteredItems.map(i => i.category))).forEach(cat => {
                    if ((cat || "Uncategorized") === category) {
                        next.delete(cat);
                    }
                });
                return next;
            });
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 50);
        }
    };

    const stats = useMemo(() => {
        let currentItems = items;
        if (activeTab === 'Medicine') currentItems = items.filter(i => i.item_type === 'medicine');
        else if (activeTab === 'Consumable Medical') currentItems = items.filter(i => i.item_type === 'consumable_medical');
        else if (activeTab === 'Inventory') currentItems = items.filter(i => i.item_type === 'inventory');

        const totalValue = currentItems.reduce((acc, item) => acc + (item.stock_level * item.sell_price), 0);
        const inStock = currentItems.filter(i => i.status === 'IN STOCK').length;
        const lowStock = currentItems.filter(i => i.status === 'LOW STOCK').length;
        const outOfStock = currentItems.filter(i => i.status === 'OUT OF STOCK').length;
        return { totalValue, inStock, lowStock, outOfStock, total: currentItems.length };
    }, [items, activeTab]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Transfer Stock Modal */}
            {transferItem && currentBranch && (
                <TransferStockModal
                    item={transferItem}
                    currentBranch={currentBranch}
                    allBranches={branches}
                    onClose={() => setTransferItem(null)}
                    onSuccess={() => { setTransferItem(null); fetchInventory(); }}
                />
            )}
            {/* Internal Transfer Modal */}
            {internalTransferItem && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-[24px] p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-medium text-[#1B2559]">Transfer Stock</h3>
                            <button onClick={() => setInternalTransferItem(null)} className="text-[#A3AED0] hover:text-[#1B2559]">
                                <ArrowLeftRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-[#F4F7FE] rounded-xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-[#E0E5F2] shadow-sm shrink-0">
                                <Package className="w-6 h-6 text-[#3B82F6]" />
                            </div>
                            <div>
                                <p className="text-[14px] font-bold text-[#1B2559] font-kantumruy leading-tight">{internalTransferItem.name}</p>
                                <p className="text-[11px] font-medium text-[#A3AED0] mt-1">
                                    Stock Room: <span className="text-[#1B2559]">{internalTransferItem.stock_level}</span> |
                                    Front Desk: <span className="text-[#1B2559]">{internalTransferItem.reception_stock}</span>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Direction</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setInternalTransferDirection('to_reception')}
                                        className={cn(
                                            "py-3 px-4 rounded-xl text-[12px] font-medium transition-all text-center border",
                                            internalTransferDirection === 'to_reception'
                                                ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-md shadow-[#3B82F6]/20"
                                                : "bg-white text-[#1B2559] border-[#E0E5F2] hover:bg-[#F4F7FE]"
                                        )}
                                    >
                                        To Front Desk
                                    </button>
                                    <button
                                        onClick={() => setInternalTransferDirection('to_stock')}
                                        className={cn(
                                            "py-3 px-4 rounded-xl text-[12px] font-medium transition-all text-center border",
                                            internalTransferDirection === 'to_stock'
                                                ? "bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20"
                                                : "bg-white text-[#1B2559] border-[#E0E5F2] hover:bg-[#F4F7FE]"
                                        )}
                                    >
                                        To Stock Room
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest mb-2">Transfer Amount</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={internalTransferAmount}
                                        onChange={(e) => setInternalTransferAmount(e.target.value)}
                                        className="w-full bg-white border border-[#E0E5F2] hover:border-[#3B82F6]/50 focus:border-[#3B82F6] rounded-xl px-4 py-3 text-[14px] font-medium text-[#1B2559] outline-none transition-all shadow-sm"
                                        placeholder="Enter amount..."
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#A3AED0]">{internalTransferItem.unit}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setInternalTransferItem(null)}
                                className="flex-1 px-6 py-3 rounded-xl border border-[#E0E5F2] text-[12px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInternalTransfer}
                                disabled={isTransferring}
                                className="flex-1 px-6 py-3 rounded-xl bg-[#3B82F6] text-[12px] font-bold text-white hover:bg-[#2563EB] transition-all shadow-md shadow-[#3B82F6]/20 disabled:opacity-50"
                            >
                                {isTransferring ? 'Transferring...' : 'Confirm Transfer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-medium text-[#1B2559] tracking-tight">Inventory</h1>

                    {/* Accessibility Zoom Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={cycleFontSize}
                            className="p-2.5 text-[#A3AED0] hover:text-[#3B82F6] hover:bg-white border border-transparent hover:border-[#E0E5F2] hover:shadow-sm rounded-[14px] transition-all"
                            title="Adjust item name size (14px, 16px, 18px)"
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        {nameFontSize !== 14 && (
                            <span className="text-[11px] font-bold text-[#A3AED0] bg-white border border-[#E0E5F2] shadow-sm px-2 py-1 rounded-md animate-in fade-in zoom-in duration-200">
                                {nameFontSize}px
                            </span>
                        )}
                    </div>
                </div>

                {/* Compact Header Stats Banner - Compressed Scaling */}
                <div className="flex flex-col lg:flex-row items-center gap-7 pt-0">
                    {/* Asset Value Section */}
                    <div className="flex items-center gap-4">

                        <div>
                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mb-0.5">Total Asset Value</p>
                            <h2 className="text-3xl font-medium text-[#1B2559] tracking-tighter leading-none">
                                ${stats.totalValue.toLocaleString()}
                            </h2>
                        </div>
                    </div>

                    <div className="hidden lg:block w-[1px] h-8 bg-[#E0E5F2]" />

                    <div className="flex-1 w-full lg:min-w-[280px]">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-medium text-[#1B2559] leading-none">{stats.total}</span>
                            <span className="text-[12px] font-medium text-[#A3AED0]">product</span>
                        </div>
                        <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden mb-1.5">
                            <div style={{ width: `${(stats.inStock / (stats.total || 1)) * 100}%` }} className="bg-[#19D5C5]" />
                            <div style={{ width: `${(stats.lowStock / (stats.total || 1)) * 100}%` }} className="bg-[#FFB547]" />
                            <div style={{ width: `${(stats.outOfStock / (stats.total || 1)) * 100}%` }} className="bg-[#EE5D50]" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-[10px] font-medium tracking-tight">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#19D5C5]" />
                                <span className="text-[#A3AED0]">In stock:</span>
                                <span className="text-[#1B2559]">{stats.inStock}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#FFB547]" />
                                <span className="text-[#A3AED0]">Low stock:</span>
                                <span className="text-[#1B2559]">{stats.lowStock}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Header Wrapper */}
            <div className="sticky top-0 z-30 bg-[#F4F7FE] pb-4 pt-2 -mx-7 px-7 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border-b border-[#E0E5F2]/50">
                {/* Selection Area (Tabs) */}
                <div className="flex items-center gap-8 border-b border-[#E0E5F2] pt-2">
                    {(['Medicine', 'Consumable Medical', 'Inventory'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "pb-2.5 text-[12px] font-medium transition-all relative whitespace-nowrap",
                                activeTab === tab ? "text-[#3B82F6]" : "text-[#A3AED0] hover:text-[#1B2559]"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <div className="absolute -bottom-[0.5px] left-0 right-0 h-[2px] bg-[#3B82F6] rounded-t-full" />
                            )}
                        </button>
                    ))}

                    <div className="w-[1px] h-4 bg-[#E0E5F2]" />

                    <button
                        onClick={() => setActiveTab('Order Stock')}
                        className={cn(
                            "pb-2.5 text-[12px] font-medium transition-all relative whitespace-nowrap",
                            activeTab === 'Order Stock' ? "text-[#3B82F6]" : "text-[#A3AED0] hover:text-[#1B2559]"
                        )}
                    >
                        Order Stock
                        {activeTab === 'Order Stock' && (
                            <div className="absolute -bottom-[0.5px] left-0 right-0 h-[2px] bg-[#3B82F6] rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Utility Bar */}
                <div className="flex flex-col md:flex-row items-center gap-4 py-3 mt-1">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#A3AED0] group-focus-within:text-[#3B82F6] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search name or reservation ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-[#E0E5F2] rounded-lg pl-11 pr-4 py-3.5 text-[12px] font-medium text-[#1B2559] shadow-sm focus:border-[#3B82F6]/30 transition-all outline-none placeholder:text-[#A3AED0]"
                        />
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto">
                        {/* Columns Toggle */}
                        <button
                            onClick={() => setShowExtraColumns(c => !c)}
                            className={cn(
                                "flex items-center justify-center gap-2 px-5 py-3 rounded-lg border text-[11px] font-medium transition-all shadow-sm",
                                showExtraColumns
                                    ? "bg-[#3B82F6] border-[#3B82F6] text-white"
                                    : "bg-white border-[#E0E5F2] text-[#1B2559] hover:bg-gray-50"
                            )}
                            title={showExtraColumns ? "Hide SKU / Vendor / Asset Value" : "Show SKU / Vendor / Asset Value"}
                        >
                            <Columns3 className="w-4 h-4" />
                            Columns
                        </button>

                        {/* Status Filters */}
                        <div className="relative">
                            <button
                                onClick={() => setShowFilters(f => !f)}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-5 py-3 rounded-lg border text-[11px] font-medium transition-all shadow-sm",
                                    activeFilter !== 'none'
                                        ? "bg-[#3B82F6] border-[#3B82F6] text-white"
                                        : "bg-white border-[#E0E5F2] text-[#1B2559] hover:bg-gray-50"
                                )}
                            >
                                <Filter className="w-4 h-4" />
                                Filters{activeFilter !== 'none' && ' ●'}
                            </button>

                            {showFilters && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowFilters(false)} />
                                    <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#E0E5F2] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="px-3 py-2 border-b border-[#F4F7FE]">
                                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Filter by Status</p>
                                        </div>
                                        {([
                                            { label: 'All', value: 'none' },
                                            { label: 'In Stock', value: 'in-stock' },
                                            { label: 'Low Stock', value: 'low-stock' },
                                            { label: 'Out of Stock', value: 'out-of-stock' },
                                        ] as const).map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => { setActiveFilter(opt.value); setShowFilters(false); }}
                                                className={cn(
                                                    "w-full text-left px-4 py-2.5 text-[11px] font-medium transition-colors flex items-center justify-between",
                                                    activeFilter === opt.value ? "text-[#3B82F6] bg-[#F4F7FE]" : "text-[#1B2559] hover:bg-[#F4F7FE]"
                                                )}
                                            >
                                                {opt.label}
                                                {activeFilter === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
                                            </button>
                                        ))}
                                        <div className="px-3 py-2 border-t border-[#F4F7FE]">
                                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Sort By</p>
                                        </div>
                                        <button
                                            onClick={() => { setActiveFilter('last-adjusted'); setShowFilters(false); }}
                                            className={cn(
                                                "w-full text-left px-4 py-2.5 text-[11px] font-medium transition-colors flex items-center justify-between",
                                                activeFilter === 'last-adjusted' ? "text-[#3B82F6] bg-[#F4F7FE]" : "text-[#1B2559] hover:bg-[#F4F7FE]"
                                            )}
                                        >
                                            Last Adjusted
                                            {activeFilter === 'last-adjusted' && <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]" />}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <Link
                            href={`/inventory/new?tab=${activeTab === 'Medicine' ? 'medicine' : 'inventory'}`}
                            onClick={(e) => { if (isReadOnly) { e.preventDefault(); alert("Demo Mode: Action not allowed"); } }}
                        >
                            <button
                                disabled={isReadOnly}
                                className="flex items-center justify-center gap-2 bg-[#3B82F6] px-6 py-3 rounded-lg text-[11px] font-medium text-white hover:bg-[#2563EB] transition-all shadow-md shadow-[#3B82F6]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="w-4 h-4" />
                                New Product
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'Medicine' || activeTab === 'Consumable Medical' || activeTab === 'Inventory' ? (
                <div className="flex gap-2 items-start animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
                    {/* Sticky Sidebar (Hover Drawer) */}
                    <div className="hidden lg:block w-4 shrink-0 sticky top-[240px] z-40 group h-0 mt-8">
                        {/* Invisible larger hit area for hover */}
                        <div className="absolute top-0 -left-6 w-12 h-[60vh] bg-transparent cursor-pointer z-10" />

                        {/* Inactive Line Indicator */}
                        <div className="absolute top-10 left-0 w-1.5 h-32 bg-[#E0E5F2] group-hover:bg-[#3B82F6] rounded-full transition-all duration-300 transform origin-left" />

                        {/* Expanded Sidebar Drawer */}
                        <div className="absolute left-6 top-0 w-64 bg-white border border-[#E0E5F2] shadow-[10px_0_40px_-10px_rgba(0,0,0,0.1)] rounded-[20px] opacity-0 -translate-x-4 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-300 overflow-hidden">
                            <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {Array.from(new Set(filteredItems.map(i => i.category))).map((category) => {
                                    const count = filteredItems.filter(i => i.category === category).length;
                                    return (
                                        <button
                                            key={category || "Uncategorized"}
                                            onClick={() => scrollToCategory(category || "Uncategorized")}
                                            className="w-full text-left px-4 py-3 rounded-xl hover:bg-[#F4F7FE] transition-colors flex items-center justify-between group/link"
                                        >
                                            <span className="text-[12px] font-bold text-[#1B2559] truncate pr-2">{category || "Uncategorized"}</span>
                                            <span className="text-[10px] font-black text-[#A3AED0] bg-white border border-[#E0E5F2] group-hover/link:border-[#3B82F6]/30 group-hover/link:text-[#3B82F6] px-2.5 py-0.5 rounded-[10px] transition-all shrink-0">
                                                {count} {count === 1 ? 'item' : 'items'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Main List */}
                    <div className="flex-1 min-w-0 space-y-10 lg:pl-6 pb-20">
                        {Array.from(new Set(filteredItems.map(i => i.category))).map((category) => (
                            <div
                                key={category}
                                id={`category-${(category || "Uncategorized").replace(/\s+/g, '-')}`}
                                className="space-y-4 scroll-m-[240px]"
                            >
                                <button
                                    onClick={() => toggleCategory(category)}
                                    className="w-full px-4 flex items-center gap-4 group text-left"
                                >
                                    <h3 className="text-[30px] font-black uppercase tracking-widest text-[#A3AED0] leading-none group-hover:text-[#1B2559] transition-colors">
                                        {category || "Uncategorized"}
                                    </h3>
                                    <div className="h-px flex-1 bg-[#E0E5F2] opacity-50" />
                                    <ChevronDown className={cn(
                                        "w-5 h-5 text-[#A3AED0] shrink-0 transition-transform duration-150",
                                        collapsedCategories.has(category) ? "-rotate-90" : "rotate-0"
                                    )} />
                                </button>

                                {/* Animated collapsible with scale, fade, and CSS grid trick: 0fr ↔ 1fr */}
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateRows: collapsedCategories.has(category) ? '0fr' : '1fr',
                                        opacity: collapsedCategories.has(category) ? 0 : 1,
                                        transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    <div className="overflow-hidden">
                                        <div
                                            className={cn(
                                                "bg-white rounded-lg border border-[#E0E5F2] shadow-sm overflow-hidden transition-all duration-150 transform origin-top",
                                                collapsedCategories.has(category) ? "scale-[0.98] -translate-y-4" : "scale-100 translate-y-0"
                                            )}
                                        >
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-[#F4F7FE]">
                                                            <th className="px-5 py-5 w-10">
                                                                <div className="w-5 h-5 rounded-md border-2 border-[#E0E5F2] flex items-center justify-center bg-white cursor-pointer" onClick={toggleSelectAll}>
                                                                    {selectedItems.length === filteredItems.length && filteredItems.length > 0 && <Check className="w-3.5 h-3.5 text-[#3B82F6]" />}
                                                                </div>
                                                            </th>
                                                            <th className="px-5 py-5"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">Name</span></th>
                                                            {showExtraColumns && <th className="px-5 py-5"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">SKU</span></th>}
                                                            {showExtraColumns && <th className="px-5 py-5"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">Vendor</span></th>}
                                                            <th className="px-5 py-5"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">Stock Rm</span></th>
                                                            {activeTab === 'Medicine' && <th className="px-5 py-5"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">Front Dsk</span></th>}
                                                            <th className="px-5 py-5"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">Status</span></th>
                                                            {showExtraColumns && <th className="px-5 py-5 text-right"><span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">{activeFilter === 'last-adjusted' ? 'Last Adjusted' : 'Asset Value'}</span></th>}
                                                            <th className="px-5 py-5 w-20"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#F4F7FE]">
                                                        {filteredItems.filter(i => i.category === category).map((item) => (
                                                            <tr key={item.id} className="hover:bg-[#F4F7FE]/20 transition-colors group">
                                                                <td className="px-5 py-4">
                                                                    <div
                                                                        onClick={() => toggleSelectItem(item.id)}
                                                                        className={cn(
                                                                            "w-5 h-5 rounded-md border-2 border-[#E0E5F2] flex items-center justify-center transition-all cursor-pointer",
                                                                            selectedItems.includes(item.id) ? "bg-[#3B82F6] border-[#3B82F6]" : "bg-white group-hover:border-[#3B82F6]/50"
                                                                        )}
                                                                    >
                                                                        {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4">
                                                                    <Link href={`/inventory/${item.id}`} className="flex flex-col group/name cursor-pointer">
                                                                        <span
                                                                            className="font-bold text-[#1B2559] group-hover/name:text-[#3B82F6] leading-tight font-kantumruy transition-all duration-300"
                                                                            style={{ fontSize: `${nameFontSize}px` }}
                                                                        >
                                                                            {item.name}
                                                                        </span>
                                                                        <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-tighter mt-0.5">{item.unit}</span>
                                                                    </Link>
                                                                </td>
                                                                {showExtraColumns && (
                                                                    <td className="px-5 py-4">
                                                                        <span className="text-[12px] font-medium text-[#1B2559]">{item.sku || '—'}</span>
                                                                    </td>
                                                                )}
                                                                {showExtraColumns && (
                                                                    <td className="px-5 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="w-7 h-7 bg-[#F4F7FE] rounded-lg flex items-center justify-center shrink-0">
                                                                                <Building2 className="w-3.5 h-3.5 text-[#3B82F6]" />
                                                                            </div>
                                                                            <span className="text-[12px] font-medium text-[#1B2559]">{item.vendor || '—'}</span>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[13px] font-bold text-[#1B2559]">{item.stock_level}</span>
                                                                    </div>
                                                                </td>
                                                                {activeTab === 'Medicine' && (
                                                                    <td className="px-5 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-[13px] font-bold text-[#3B82F6]">{item.reception_stock || 0}</span>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                                <td className="px-5 py-4">
                                                                    <div className={cn(
                                                                        "inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-tight",
                                                                        item.status === 'IN STOCK' ? "text-[#19D5C5]" :
                                                                            item.status === 'LOW STOCK' ? "text-[#FFB547]" : "text-[#EE5D50]"
                                                                    )}>
                                                                        <div className={cn(
                                                                            "w-2 h-2 rounded-full",
                                                                            item.status === 'IN STOCK' ? "bg-[#19D5C5]" :
                                                                                item.status === 'LOW STOCK' ? "bg-[#FFB547]" : "bg-[#EE5D50]"
                                                                        )} />
                                                                        {item.status}
                                                                    </div>
                                                                </td>
                                                                {showExtraColumns && (
                                                                    <td className="px-5 py-4 text-right">
                                                                        {activeFilter === 'last-adjusted' ? (
                                                                            <span className="text-[12px] font-medium text-[#A3AED0]">
                                                                                {item.last_stock_in
                                                                                    ? new Date(item.last_stock_in).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                                    : '—'}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[12px] font-medium text-[#1B2559]">${(item.stock_level * item.sell_price).toLocaleString()}</span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                                <td className="px-5 py-4 text-right">
                                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {activeTab === 'Medicine' && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (isReadOnly) return alert("Demo Mode: Action not allowed");
                                                                                    setInternalTransferItem(item);
                                                                                }}
                                                                                title="Transfer stock between Stock Room and Front Desk"
                                                                                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-purple-600 transition-all bg-purple-500 rounded-lg flex items-center gap-1 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                <ArrowLeftRight className="w-3 h-3" />
                                                                                Move
                                                                            </button>
                                                                        )}
                                                                        {branches.length > 1 && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    if (isReadOnly) return alert("Demo Mode: Action not allowed");
                                                                                    setTransferItem(item);
                                                                                }}
                                                                                title="Transfer to another branch"
                                                                                className="p-1.5 text-[#A3AED0] hover:text-[#6366F1] transition-all bg-[#F4F7FE]/50 hover:bg-[#6366F1]/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                <Building2 className="w-4 h-4" />
                                                                            </button>
                                                                        )}
                                                                        <Link href={`/inventory/${item.id}`}>
                                                                            <button className="p-1.5 text-[#A3AED0] hover:text-[#3B82F6] transition-all bg-[#F4F7FE]/50 rounded-lg">
                                                                                <MoreVertical className="w-4 h-4" />
                                                                            </button>
                                                                        </Link>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'Order Stock' ? (
                <div className="bg-white rounded-lg overflow-hidden border border-[#E0E5F2] shadow-sm">
                    <div className="overflow-x-auto animate-in slide-in-from-right-4 duration-500">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#F4F7FE]">
                                    {['ORDER', 'CREATED', 'FROM VENDOR', 'STATUS', 'ITEM RECEIVED', 'SEND EMAIL'].map((header) => (
                                        <th key={header} className="px-5 py-5">
                                            <div className="flex items-center gap-2 cursor-pointer group">
                                                <span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">{header}</span>
                                                <ArrowUpDown className="w-3.5 h-3.5 text-[#A3AED0] opacity-30 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-5 py-5 w-32"></th>
                                    <th className="px-5 py-5 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F7FE]">
                                {[
                                    { id: '#OS12KOS', items: 5, total: 1500, date: 'July 14, 2015', vendor: 'Barone LLC.', status: 'PENDING', received: '0/3', progress: 0 },
                                    { id: '#OS11KOS', items: 890, total: 1270, date: 'October 30, 2017', vendor: 'Acme Co.', status: 'PENDING', received: '0/3', progress: 0 },
                                    { id: '#OS10KOS', items: 204, total: 1124, date: 'October 24, 2018', vendor: 'Abstergo Ltd.', status: 'COMPLETE', received: '3/3', progress: 100 },
                                    { id: '#OS09KOS', items: 564, total: 1420, date: 'March 6, 2018', vendor: 'Binford Ltd.', status: 'PENDING', received: '0/3', progress: 0 },
                                    { id: '#OS08KOS', items: 324, total: 1080, date: 'February 11, 2014', vendor: 'K24', status: 'PARTIALLY RECEIVED', received: '2/4', progress: 50 },
                                ].map((order) => (
                                    <tr key={order.id} className="hover:bg-[#F4F7FE]/20 transition-colors">
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-medium text-[#1B2559]">{order.id}</span>
                                                <span className="text-[10px] text-[#A3AED0] font-medium">{order.items} items • ${order.total.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-[12px] font-medium text-[#1B2559]">{order.date}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-[#A3AED0]" />
                                                <span className="text-[12px] font-medium text-[#1B2559]">{order.vendor}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1.5 rounded-[10px] text-[10px] font-medium uppercase tracking-tight",
                                                order.status === 'COMPLETE' ? "bg-green-100/50 text-green-600" :
                                                    order.status === 'PENDING' ? "bg-[#F4F7FE] text-[#1B2559]/60" : "bg-purple-100/50 text-purple-600"
                                            )}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 max-w-[90px] h-[5px] bg-[#F4F7FE] rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#3B82F6] transition-all duration-1000"
                                                        style={{ width: `${order.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-medium text-[#1B2559] whitespace-nowrap">{order.received}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex items-center justify-center w-5 h-5 bg-[#01B574] rounded-full text-white shadow-sm">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <button className={cn(
                                                "w-full py-2 rounded-lg text-[11px] font-medium uppercase tracking-wider transition-all",
                                                order.status === 'COMPLETE' ? "bg-[#F4F7FE] text-[#A3AED0] cursor-not-allowed border-none shadow-none" : "bg-white border border-[#E0E5F2] text-[#3B82F6] hover:border-[#3B82F6]/20 shadow-sm"
                                            )}>
                                                Receive
                                            </button>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button className="p-2 text-[#A3AED0] hover:text-[#1B2559] transition-all">
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg overflow-hidden border border-[#E0E5F2] shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#F4F7FE]">
                                    <th className="px-5 py-5 w-10">
                                        <button
                                            onClick={toggleSelectAll}
                                            className={cn(
                                                "w-5 h-5 rounded-md border-2 border-[#E0E5F2] flex items-center justify-center transition-all",
                                                selectedItems.length === filteredItems.length && filteredItems.length > 0 ? "bg-[#3B82F6] border-[#3B82F6]" : "bg-white"
                                            )}
                                        >
                                            {selectedItems.length === filteredItems.length && filteredItems.length > 0 && <Check className="w-3.5 h-3.5 text-white" />}
                                        </button>
                                    </th>
                                    {[
                                        { label: 'NAME', key: 'name' },
                                        { label: 'CATEGORIES', key: 'category' },
                                        { label: 'SKU', key: 'sku' },
                                        { label: 'VENDOR', key: 'vendor' },
                                        { label: 'STOCK', key: 'stock_level' },
                                        { label: 'STATUS', key: 'status' },
                                        { label: 'ASSET VALUE', key: 'asset_value' }
                                    ].map((col) => (
                                        <th
                                            key={col.label}
                                            className="px-5 py-5 cursor-pointer group"
                                            onClick={() => handleSort(col.key as SortConfig['key'])}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest">{col.label}</span>
                                                <ArrowUpDown className={cn(
                                                    "w-3.5 h-3.5 transition-all",
                                                    sortConfig.key === col.key ? "text-[#3B82F6] opacity-100" : "text-[#A3AED0] opacity-30 group-hover:opacity-100"
                                                )} />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="px-5 py-5 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F7FE]">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className={cn(
                                        "hover:bg-[#F4F7FE]/20 transition-colors group",
                                        selectedItems.includes(item.id) && "bg-[#F4F7FE]/30"
                                    )}>
                                        <td className="px-5 py-4">
                                            <button
                                                onClick={() => toggleSelectItem(item.id)}
                                                className={cn(
                                                    "w-5 h-5 rounded-md border-2 border-[#E0E5F2] flex items-center justify-center transition-all",
                                                    selectedItems.includes(item.id) ? "bg-[#3B82F6] border-[#3B82F6]" : "bg-white group-hover:border-[#3B82F6]/50"
                                                )}
                                            >
                                                {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-medium text-[#1B2559] leading-tight font-kantumruy">{item.name}</span>
                                                <span className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-tighter mt-0.5">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-medium text-[#A3AED0]">{item.category}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-medium text-[#1B2559]">{item.sku || '—'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-[#A3AED0]" />
                                                <span className="text-[12px] font-medium text-[#1B2559]">{item.vendor || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-medium text-[#1B2559]">{item.stock_level}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={cn(
                                                "inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-tight",
                                                item.status === 'IN STOCK' ? "text-[#19D5C5]" :
                                                    item.status === 'LOW STOCK' ? "text-[#FFB547]" : "text-[#EE5D50]"
                                            )}>
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    item.status === 'IN STOCK' ? "bg-[#19D5C5]" :
                                                        item.status === 'LOW STOCK' ? "bg-[#FFB547]" : "bg-[#EE5D50]"
                                                )} />
                                                {item.status}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-medium text-[#1B2559]">${(item.stock_level * item.sell_price).toLocaleString()}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link href={`/inventory/${item.id}`}>
                                                <button className="p-2 text-[#A3AED0] hover:text-[#3B82F6] transition-all bg-[#F4F7FE]/50 rounded-lg">
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }
        </div >
    );
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#3B82F6]" /></div>}>
            <InventoryPageInner />
        </Suspense>
    );
}

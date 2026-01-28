"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Package, Plus, Search, Filter, MoreVertical,
    Building2, DollarSign, CheckCircle2,
    ArrowUpDown, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface InventoryItem {
    id: string;
    name: string;
    category: string;
    sku: string;
    vendor: string;
    stock_level: number;
    unit: string;
    sell_price: number;
    status: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK';
}

type SortConfig = {
    key: keyof InventoryItem | 'asset_value';
    direction: 'asc' | 'desc';
};

export default function InventoryPage() {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'Medicine' | 'Inventory' | 'Order Stock'>('Medicine');
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

    useEffect(() => {
        fetchInventory();
    }, []);

    async function fetchInventory() {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('inventory')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            // Process data for display
            const processedItems = (data || []).map(item => {
                const stock = item.stock_level || 0;
                const price = item.sell_price || 0;

                let status: 'IN STOCK' | 'LOW STOCK' | 'OUT OF STOCK' = 'OUT OF STOCK';
                if (stock > 5) status = 'IN STOCK';
                else if (stock > 0) status = 'LOW STOCK';

                return {
                    ...item,
                    sku: item.sku || '-',
                    vendor: item.vendor || '-',
                    stock_level: stock,
                    unit: item.unit || 'Piece',
                    sell_price: price,
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

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedItems = useMemo(() => {
        const sortableItems = [...items];
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
    }, [items, sortConfig]);

    const categories = useMemo(() => {
        const relevantItems = activeTab === 'Medicine' ? items : []; // Current items are all medicines
        return ["All", ...Array.from(new Set(relevantItems.map(item => item.category)))];
    }, [items, activeTab]);

    const filteredItems = sortedItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.sku.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesTab = true;
        if (activeTab === 'Medicine') {
            // Current data belongs to Medicine (Pharmacy)
            matchesTab = true;
        } else if (activeTab === 'Inventory') {
            // Inventory is blank for now per user request
            matchesTab = false;
        }

        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        return matchesSearch && matchesCategory && matchesTab;
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

    const stats = useMemo(() => {
        const currentItems = activeTab === 'Order Stock' ? items : items.filter(item => {
            if (activeTab === 'Medicine') return true; // All current items are medicines
            if (activeTab === 'Inventory') return true; // Show items in Inventory tab too
            return true;
        });

        const totalValue = currentItems.reduce((acc, item) => acc + (item.stock_level * item.sell_price), 0);
        const inStock = currentItems.filter(i => i.status === 'IN STOCK').length;
        const lowStock = currentItems.filter(i => i.status === 'LOW STOCK').length;
        const outOfStock = currentItems.filter(i => i.status === 'OUT OF STOCK').length;
        return { totalValue, inStock, lowStock, outOfStock, total: currentItems.length };
    }, [items, activeTab]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4318FF]"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-0">
                <h1 className="text-4xl font-black text-[#1B2559] tracking-tight">Inventory</h1>

                {/* Compact Header Stats Banner - Compressed Scaling */}
                <div className="flex flex-col lg:flex-row items-center gap-7 pt-0">
                    {/* Asset Value Section */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border border-[#E0E5F2] shadow-sm shrink-0">
                            <DollarSign className="w-5.5 h-5.5 text-[#4318FF]" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest mb-0.5">Total Asset Value</p>
                            <h2 className="text-3xl font-black text-[#1B2559] tracking-tighter leading-none">
                                ${stats.totalValue.toLocaleString()}
                            </h2>
                        </div>
                    </div>

                    <div className="hidden lg:block w-[1px] h-8 bg-[#E0E5F2]" />

                    <div className="flex-1 w-full lg:min-w-[280px]">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-2xl font-black text-[#1B2559] leading-none">{stats.total}</span>
                            <span className="text-[12px] font-bold text-[#A3AED0]">product</span>
                        </div>
                        <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden mb-1.5">
                            <div style={{ width: `${(stats.inStock / (stats.total || 1)) * 100}%` }} className="bg-[#19D5C5]" />
                            <div style={{ width: `${(stats.lowStock / (stats.total || 1)) * 100}%` }} className="bg-[#FFB547]" />
                            <div style={{ width: `${(stats.outOfStock / (stats.total || 1)) * 100}%` }} className="bg-[#EE5D50]" />
                        </div>
                        <div className="flex flex-wrap gap-4 text-[10px] font-bold tracking-tight">
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

            {/* Selection Area (Tabs) */}
            <div className="flex items-center gap-8 border-b border-[#E0E5F2] pt-2">
                {(['Medicine', 'Inventory', 'Order Stock'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "pb-2.5 text-[12px] font-bold transition-all relative",
                            activeTab === tab ? "text-[#4318FF]" : "text-[#A3AED0] hover:text-[#1B2559]"
                        )}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute -bottom-[0.5px] left-0 right-0 h-[2px] bg-[#4318FF] rounded-t-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Utility Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 py-1">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#A3AED0] group-focus-within:text-[#4318FF] transition-colors" />
                    <input
                        type="text"
                        placeholder="Search name or reservation ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-[#E0E5F2] rounded-[20px] pl-11 pr-4 py-3.5 text-[12px] font-bold text-[#1B2559] shadow-sm focus:border-[#4318FF]/30 transition-all outline-none placeholder:text-[#A3AED0]"
                    />
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <button className="flex items-center justify-center gap-2 bg-white px-5 py-3 rounded-2xl border border-[#E0E5F2] text-[11px] font-black text-[#1B2559] hover:bg-gray-50 transition-all shadow-sm">
                        <Filter className="w-4 h-4 text-[#A3AED0]" />
                        Filters
                    </button>
                    <button className="flex items-center justify-center gap-2 bg-white px-6 py-3 rounded-2xl border border-[#E0E5F2] text-[11px] font-black text-[#4318FF] hover:bg-gray-50 transition-all shadow-sm">
                        Order Stock
                    </button>
                    <Link href="/inventory/new">
                        <button className="flex items-center justify-center gap-2 bg-[#4318FF] px-6 py-3 rounded-2xl text-[11px] font-black text-white hover:bg-[#3311E0] transition-all shadow-md shadow-[#4318FF]/20">
                            <Plus className="w-4 h-4" />
                            New Product
                        </button>
                    </Link>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'Medicine' || activeTab === 'Inventory' ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {Array.from(new Set(filteredItems.map(i => i.category))).map((category) => (
                        <div key={category} className="space-y-4">
                            <div className="px-4 flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#A3AED0]">{category || "Uncategorized"}</h3>
                                <div className="h-px flex-1 bg-[#E0E5F2] ml-4 opacity-50" />
                            </div>

                            <div className="bg-white rounded-[24px] border border-[#E0E5F2] shadow-sm overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-[#F4F7FE]">
                                                <th className="px-5 py-5 w-10">
                                                    <div className="w-5 h-5 rounded-md border-2 border-[#E0E5F2] flex items-center justify-center bg-white cursor-pointer" onClick={toggleSelectAll}>
                                                        {selectedItems.length === filteredItems.length && filteredItems.length > 0 && <Check className="w-3.5 h-3.5 text-[#4318FF]" />}
                                                    </div>
                                                </th>
                                                <th className="px-5 py-5"><span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">Name</span></th>
                                                <th className="px-5 py-5"><span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">SKU</span></th>
                                                <th className="px-5 py-5"><span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">Vendor</span></th>
                                                <th className="px-5 py-5"><span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">Stock</span></th>
                                                <th className="px-5 py-5"><span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">Status</span></th>
                                                <th className="px-5 py-5 text-right"><span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">Asset Value</span></th>
                                                <th className="px-5 py-5 w-12"></th>
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
                                                                selectedItems.includes(item.id) ? "bg-[#4318FF] border-[#4318FF]" : "bg-white group-hover:border-[#4318FF]/50"
                                                            )}
                                                        >
                                                            {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[12px] font-black text-[#1B2559] leading-tight font-kantumruy">{item.name}</span>
                                                            <span className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-tighter mt-0.5">{item.unit}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-[12px] font-bold text-[#1B2559]">{item.sku || '—'}</span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 bg-[#F4F7FE] rounded-lg flex items-center justify-center shrink-0">
                                                                <Building2 className="w-3.5 h-3.5 text-[#4318FF]" />
                                                            </div>
                                                            <span className="text-[12px] font-bold text-[#1B2559]">{item.vendor || '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className="text-[12px] font-black text-[#1B2559]">{item.stock_level}</span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className={cn(
                                                            "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-tight",
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
                                                    <td className="px-5 py-4 text-right">
                                                        <span className="text-[12px] font-black text-[#1B2559]">${(item.stock_level * item.sell_price).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-5 py-4 text-right">
                                                        <Link href={`/inventory/${item.id}`}>
                                                            <button className="p-2 text-[#A3AED0] hover:text-[#4318FF] transition-all bg-[#F4F7FE]/50 rounded-lg">
                                                                <MoreVertical className="w-4.5 h-4.5" />
                                                            </button>
                                                        </Link>
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
            ) : activeTab === 'Order Stock' ? (
                <div className="bg-white rounded-[24px] overflow-hidden border border-[#E0E5F2] shadow-sm">
                    <div className="overflow-x-auto animate-in slide-in-from-right-4 duration-500">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#F4F7FE]">
                                    {['ORDER', 'CREATED', 'FROM VENDOR', 'STATUS', 'ITEM RECEIVED', 'SEND EMAIL'].map((header) => (
                                        <th key={header} className="px-5 py-5">
                                            <div className="flex items-center gap-2 cursor-pointer group">
                                                <span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">{header}</span>
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
                                                <span className="text-[12px] font-black text-[#1B2559]">{order.id}</span>
                                                <span className="text-[10px] text-[#A3AED0] font-bold">{order.items} items • ${order.total.toLocaleString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-[12px] font-bold text-[#1B2559]">{order.date}</td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-[#A3AED0]" />
                                                <span className="text-[12px] font-bold text-[#1B2559]">{order.vendor}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={cn(
                                                "px-2.5 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-tight",
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
                                                        className="h-full bg-[#4318FF] transition-all duration-1000"
                                                        style={{ width: `${order.progress}%` }}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-black text-[#1B2559] whitespace-nowrap">{order.received}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <div className="inline-flex items-center justify-center w-5 h-5 bg-[#01B574] rounded-full text-white shadow-sm">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <button className={cn(
                                                "w-full py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                                                order.status === 'COMPLETE' ? "bg-[#F4F7FE] text-[#A3AED0] cursor-not-allowed border-none shadow-none" : "bg-white border border-[#E0E5F2] text-[#4318FF] hover:border-[#4318FF]/20 shadow-sm"
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
                <div className="bg-white rounded-[24px] overflow-hidden border border-[#E0E5F2] shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-[#F4F7FE]">
                                    <th className="px-5 py-5 w-10">
                                        <button
                                            onClick={toggleSelectAll}
                                            className={cn(
                                                "w-5 h-5 rounded-md border-2 border-[#E0E5F2] flex items-center justify-center transition-all",
                                                selectedItems.length === filteredItems.length && filteredItems.length > 0 ? "bg-[#4318FF] border-[#4318FF]" : "bg-white"
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
                                                <span className="text-[11px] font-black text-[#A3AED0] uppercase tracking-widest">{col.label}</span>
                                                <ArrowUpDown className={cn(
                                                    "w-3.5 h-3.5 transition-all",
                                                    sortConfig.key === col.key ? "text-[#4318FF] opacity-100" : "text-[#A3AED0] opacity-30 group-hover:opacity-100"
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
                                                    selectedItems.includes(item.id) ? "bg-[#4318FF] border-[#4318FF]" : "bg-white group-hover:border-[#4318FF]/50"
                                                )}
                                            >
                                                {selectedItems.includes(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                                            </button>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-[12px] font-black text-[#1B2559] leading-tight font-kantumruy">{item.name}</span>
                                                <span className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-tighter mt-0.5">{item.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-bold text-[#A3AED0]">{item.category}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-bold text-[#1B2559]">{item.sku || '—'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-[#A3AED0]" />
                                                <span className="text-[12px] font-bold text-[#1B2559]">{item.vendor || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-[12px] font-black text-[#1B2559]">{item.stock_level}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className={cn(
                                                "inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-tight",
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
                                            <span className="text-[12px] font-black text-[#1B2559]">${(item.stock_level * item.sell_price).toLocaleString()}</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <Link href={`/inventory/${item.id}`}>
                                                <button className="p-2 text-[#A3AED0] hover:text-[#4318FF] transition-all bg-[#F4F7FE]/50 rounded-lg">
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
            )}
        </div>
    );
}

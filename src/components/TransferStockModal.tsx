"use client";

import { useState } from "react";
import { X, ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface Branch {
    id: string;
    name: string;
    location?: string;
}

interface TransferItem {
    id: string;
    name: string;
    stock_level: number;
    unit: string;
    item_type: string;
    category: string;
    sku: string;
    vendor: string;
    buy_price: number;
    sell_price: number;
    low_stock_threshold: number;
}

interface Props {
    item: TransferItem;
    currentBranch: Branch;
    allBranches: Branch[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function TransferStockModal({ item, currentBranch, allBranches, onClose, onSuccess }: Props) {
    const otherBranches = allBranches.filter(b => b.id !== currentBranch.id);
    const [targetBranchId, setTargetBranchId] = useState(otherBranches[0]?.id || "");
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const targetBranch = allBranches.find(b => b.id === targetBranchId);
    const isOver = quantity > item.stock_level;
    const isValid = quantity > 0 && !isOver && targetBranchId;

    async function handleTransfer() {
        if (!isValid) return;
        setLoading(true);
        setError(null);

        try {
            const now = new Date().toISOString();

            // 1. Deduct stock from current branch
            const { error: deductErr } = await supabase
                .from('inventory')
                .update({
                    stock_level: item.stock_level - quantity,
                    last_stock_out: now
                })
                .eq('id', item.id);
            if (deductErr) throw deductErr;

            // 2. Find the same item in target branch (match by name + item_type)
            const { data: targetItems, error: findErr } = await supabase
                .from('inventory')
                .select('id, stock_level')
                .eq('branch_id', targetBranchId)
                .eq('name', item.name)
                .eq('item_type', item.item_type)
                .limit(1);
            if (findErr) throw findErr;

            let toInventoryItemId: string;

            if (targetItems && targetItems.length > 0) {
                // Item exists in target branch — increment
                const existing = targetItems[0];
                const { error: addErr } = await supabase
                    .from('inventory')
                    .update({
                        stock_level: existing.stock_level + quantity,
                        last_stock_in: now
                    })
                    .eq('id', existing.id);
                if (addErr) throw addErr;
                toInventoryItemId = existing.id;
            } else {
                // Item doesn't exist in target branch — create a copy
                const { data: created, error: createErr } = await supabase
                    .from('inventory')
                    .insert({
                        name: item.name,
                        branch_id: targetBranchId,
                        category: item.category,
                        sku: item.sku || null,
                        vendor: item.vendor || null,
                        buy_price: item.buy_price || 0,
                        sell_price: item.sell_price || 0,
                        unit: item.unit,
                        item_type: item.item_type,
                        stock_level: quantity,
                        low_stock_threshold: item.low_stock_threshold || 10,
                        last_stock_in: now
                    })
                    .select('id')
                    .single();
                if (createErr) throw createErr;
                toInventoryItemId = created.id;
            }

            // 3. Record the transfer in audit log
            const { error: logErr } = await supabase
                .from('stock_transfers')
                .insert({
                    from_branch_id: currentBranch.id,
                    to_branch_id: targetBranchId,
                    inventory_item_id: item.id,
                    to_inventory_item_id: toInventoryItemId,
                    item_name: item.name,
                    quantity,
                    notes: notes || null
                });
            if (logErr) throw logErr;

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1200);
        } catch (err: any) {
            setError(err.message || "Transfer failed. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/30 backdrop-blur-sm animate-in fade-in duration-300 p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md border border-[#E0E5F2] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-400">
                {/* Header accent */}
                <div className="h-1 bg-gradient-to-r from-[#3B82F6] via-[#6366F1] to-[#19D5C5]" />

                <div className="p-8">
                    {/* Title Row */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-[15px] font-medium text-[#1B2559] tracking-tight">Transfer Stock</h2>
                            <p className="text-[10px] font-medium text-[#A3AED0] uppercase tracking-widest mt-0.5">Cross-branch transfer</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-[#F4F7FE] rounded-lg text-[#A3AED0] hover:text-[#1B2559] transition-all">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Item Preview */}
                    <div className="bg-[#F4F7FE] rounded-xl p-4 mb-6 border border-[#E0E5F2]">
                        <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Item</p>
                        <p className="text-[13px] font-medium text-[#1B2559] truncate">{item.name}</p>
                        <p className="text-[10px] font-medium text-[#A3AED0] mt-0.5">
                            Available: <span className="text-[#1B2559]">{item.stock_level} {item.unit}</span>
                        </p>
                    </div>

                    {/* Transfer Arrow Diagram */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 bg-[#F4F7FE] rounded-xl p-3 border border-[#E0E5F2] text-center">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">From</p>
                            <p className="text-[12px] font-medium text-[#1B2559]">{currentBranch.name}</p>
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 bg-[#3B82F6] rounded-full flex items-center justify-center shadow-md shadow-[#3B82F6]/30">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 bg-[#F4F7FE] rounded-xl p-3 border border-[#E0E5F2] text-center">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">To</p>
                            <select
                                value={targetBranchId}
                                onChange={e => setTargetBranchId(e.target.value)}
                                className="w-full text-[12px] font-medium text-[#1B2559] bg-transparent outline-none text-center cursor-pointer"
                            >
                                {otherBranches.map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="mb-4">
                        <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest block mb-2">
                            Quantity to Transfer
                        </label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="w-10 h-10 rounded-lg bg-[#F4F7FE] border border-[#E0E5F2] flex items-center justify-center text-[#1B2559] hover:bg-[#E0E5F2] transition-all text-lg font-medium"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                min={1}
                                max={item.stock_level}
                                value={quantity}
                                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className={cn(
                                    "flex-1 text-center bg-white border rounded-lg py-2.5 text-[16px] font-medium text-[#1B2559] outline-none transition-all",
                                    isOver ? "border-[#EE5D50] ring-2 ring-[#EE5D50]/20" : "border-[#E0E5F2] focus:border-[#3B82F6]/40"
                                )}
                            />
                            <button
                                onClick={() => setQuantity(q => Math.min(item.stock_level, q + 1))}
                                className="w-10 h-10 rounded-lg bg-[#F4F7FE] border border-[#E0E5F2] flex items-center justify-center text-[#1B2559] hover:bg-[#E0E5F2] transition-all text-lg font-medium"
                            >
                                +
                            </button>
                        </div>
                        {isOver && (
                            <p className="text-[10px] font-medium text-[#EE5D50] mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Exceeds available stock ({item.stock_level} {item.unit})
                            </p>
                        )}
                        {!isOver && quantity > 0 && (
                            <p className="text-[10px] font-medium text-[#A3AED0] mt-1.5">
                                After transfer: <span className="text-[#1B2559]">{item.stock_level - quantity} {item.unit}</span> remaining in {currentBranch.name}
                            </p>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="mb-6">
                        <label className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest block mb-2">
                            Notes (optional)
                        </label>
                        <textarea
                            rows={2}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Urgent transfer for weekend treatment run"
                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[12px] font-medium text-[#1B2559] outline-none focus:border-[#3B82F6]/40 transition-all placeholder:text-[#A3AED0] resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-[#EE5D50] shrink-0" />
                            <p className="text-[11px] font-medium text-[#EE5D50]">{error}</p>
                        </div>
                    )}

                    {/* CTA */}
                    <button
                        onClick={handleTransfer}
                        disabled={!isValid || loading || success}
                        className={cn(
                            "w-full py-4 rounded-xl text-[11px] font-medium uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                            success
                                ? "bg-[#19D5C5] text-white"
                                : isValid
                                    ? "bg-[#3B82F6] text-white hover:bg-[#2563EB] shadow-md shadow-[#3B82F6]/20 active:scale-[0.99]"
                                    : "bg-[#F4F7FE] text-[#A3AED0] cursor-not-allowed"
                        )}
                    >
                        {success ? (
                            <><CheckCircle2 className="w-4 h-4" /> Transferred Successfully</>
                        ) : loading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Processing Transfer...</>
                        ) : (
                            <>Transfer {quantity} {item.unit} to {targetBranch?.name}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

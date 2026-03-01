"use client";

import React, { useState } from "react";
import { X as XIcon, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { format } from "date-fns";

interface MediaItem {
    id: string;
    file_name: string;
    viewUrl?: string;
    file_url: string;
    category: string;
    tooth_tags: string[];
    comparison_tag: string | null;
    clinical_note: string | null;
    created_at: string;
}

interface CompareMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemA: MediaItem;
    itemB: MediaItem;
}

export default function CompareMediaModal({
    isOpen,
    onClose,
    itemA,
    itemB,
}: CompareMediaModalProps) {
    const [zoomA, setZoomA] = useState(1);
    const [zoomB, setZoomB] = useState(1);

    if (!isOpen) return null;

    // Determine Before/After labels
    const aLabel = itemA.comparison_tag || "Left";
    const bLabel = itemB.comparison_tag || "Right";
    const aColor = aLabel === "before" ? "#FFB547" : aLabel === "after" ? "#19D5C5" : "#4318FF";
    const bColor = bLabel === "before" ? "#FFB547" : bLabel === "after" ? "#19D5C5" : "#4318FF";

    return (
        <div className="fixed inset-0 z-[210] bg-[#1B2559]/95 backdrop-blur-xl p-6 animate-in fade-in duration-300 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Compare Clinical Media</h3>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">Side-by-side comparison view</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>

            {/* Comparison Grid */}
            <div className="flex-1 grid grid-cols-2 gap-6 min-h-0">
                {/* Side A */}
                <div className="flex flex-col bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                    {/* Label */}
                    <div className="px-5 py-3 flex items-center justify-between border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div
                                className="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-white"
                                style={{ backgroundColor: aColor }}
                            >
                                {aLabel}
                            </div>
                            <span className="text-[9px] font-black text-white/60 truncate max-w-[150px]">{itemA.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setZoomA(Math.max(0.3, zoomA - 0.2))}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-all"
                            >
                                <ZoomOut className="w-3 h-3" />
                            </button>
                            <span className="text-[8px] font-black text-white/40 w-8 text-center">{Math.round(zoomA * 100)}%</span>
                            <button
                                onClick={() => setZoomA(Math.min(5, zoomA + 0.2))}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-all"
                            >
                                <ZoomIn className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => setZoomA(1)}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-all ml-1"
                            >
                                <RotateCw className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Image */}
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                        <img
                            src={itemA.viewUrl || itemA.file_url}
                            alt={itemA.file_name}
                            className="transition-transform duration-300 rounded-xl"
                            style={{ transform: `scale(${zoomA})`, maxWidth: "100%", maxHeight: "100%" }}
                            draggable={false}
                        />
                    </div>

                    {/* Info */}
                    <div className="px-5 py-3 border-t border-white/10 flex items-center gap-3">
                        {itemA.tooth_tags?.length > 0 && (
                            <div className="flex gap-1">
                                {itemA.tooth_tags.map(t => (
                                    <span key={t} className="text-[7px] font-black text-[#4318FF] bg-[#4318FF]/20 px-1.5 py-0.5 rounded-md">#{t}</span>
                                ))}
                            </div>
                        )}
                        <span className="text-[8px] font-bold text-white/30">
                            {format(new Date(itemA.created_at), "MMM dd, yyyy")}
                        </span>
                        {itemA.clinical_note && (
                            <span className="text-[8px] font-bold text-white/40 italic truncate flex-1">{itemA.clinical_note}</span>
                        )}
                    </div>
                </div>

                {/* Side B */}
                <div className="flex flex-col bg-white/5 rounded-3xl overflow-hidden border border-white/10">
                    {/* Label */}
                    <div className="px-5 py-3 flex items-center justify-between border-b border-white/10">
                        <div className="flex items-center gap-2">
                            <div
                                className="px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-white"
                                style={{ backgroundColor: bColor }}
                            >
                                {bLabel}
                            </div>
                            <span className="text-[9px] font-black text-white/60 truncate max-w-[150px]">{itemB.file_name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setZoomB(Math.max(0.3, zoomB - 0.2))}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-all"
                            >
                                <ZoomOut className="w-3 h-3" />
                            </button>
                            <span className="text-[8px] font-black text-white/40 w-8 text-center">{Math.round(zoomB * 100)}%</span>
                            <button
                                onClick={() => setZoomB(Math.min(5, zoomB + 0.2))}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-all"
                            >
                                <ZoomIn className="w-3 h-3" />
                            </button>
                            <button
                                onClick={() => setZoomB(1)}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/60 hover:text-white transition-all ml-1"
                            >
                                <RotateCw className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Image */}
                    <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                        <img
                            src={itemB.viewUrl || itemB.file_url}
                            alt={itemB.file_name}
                            className="transition-transform duration-300 rounded-xl"
                            style={{ transform: `scale(${zoomB})`, maxWidth: "100%", maxHeight: "100%" }}
                            draggable={false}
                        />
                    </div>

                    {/* Info */}
                    <div className="px-5 py-3 border-t border-white/10 flex items-center gap-3">
                        {itemB.tooth_tags?.length > 0 && (
                            <div className="flex gap-1">
                                {itemB.tooth_tags.map(t => (
                                    <span key={t} className="text-[7px] font-black text-[#4318FF] bg-[#4318FF]/20 px-1.5 py-0.5 rounded-md">#{t}</span>
                                ))}
                            </div>
                        )}
                        <span className="text-[8px] font-bold text-white/30">
                            {format(new Date(itemB.created_at), "MMM dd, yyyy")}
                        </span>
                        {itemB.clinical_note && (
                            <span className="text-[8px] font-bold text-white/40 italic truncate flex-1">{itemB.clinical_note}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

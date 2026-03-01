"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
    X as XIcon,
    Upload,
    Image as ImageIcon,
    Trash2,
    Edit2,
    Eye,
    Filter,
    Camera,
    FileText,
    Bone,
    Check,
    Loader2,
    Plus,
    ChevronDown,
    ZoomIn,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import CompareMediaModal from "./CompareMediaModal";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface PatientMediaGalleryProps {
    patientId: string;
    branchId: string;
    staff?: any[];
}

interface MediaItem {
    id: string;
    file_url: string;
    file_key: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    category: string;
    tooth_tags: string[];
    comparison_tag: string | null;
    clinical_note: string | null;
    uploaded_by: string | null;
    created_at: string;
    // Runtime: resolved presigned URL
    viewUrl?: string;
}

const CATEGORIES = [
    { id: "xray", label: "X-Rays", icon: Bone, color: "#4318FF" },
    { id: "intraoral", label: "Intraoral", icon: Camera, color: "#19D5C5" },
    { id: "extraoral", label: "Extraoral", icon: ImageIcon, color: "#FFB547" },
    { id: "document", label: "Documents", icon: FileText, color: "#EE5D50" },
];

export default function PatientMediaGallery({ patientId, branchId, staff }: PatientMediaGalleryProps) {
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
    const [editingNote, setEditingNote] = useState<string | null>(null);
    const [noteText, setNoteText] = useState("");
    const [toothTagInput, setToothTagInput] = useState<string | null>(null);
    const [toothTagValue, setToothTagValue] = useState("");
    const [uploadCategory, setUploadCategory] = useState("intraoral");

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);

    // Fetch media on mount
    useEffect(() => {
        fetchMedia();
    }, [patientId]);

    async function fetchMedia() {
        setLoading(true);
        const { data, error } = await supabase
            .from("patient_media")
            .select("*")
            .eq("patient_id", patientId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching media:", error);
            setLoading(false);
            return;
        }

        // Resolve presigned view URLs for all items
        const withUrls = await Promise.all(
            (data || []).map(async (item: MediaItem) => {
                try {
                    const res = await fetch(`/api/media?fileKey=${encodeURIComponent(item.file_key)}`);
                    const { viewUrl } = await res.json();
                    return { ...item, viewUrl };
                } catch {
                    return { ...item, viewUrl: item.file_url };
                }
            })
        );

        setMedia(withUrls);
        setLoading(false);
    }

    // Upload handler
    async function handleUpload(files: FileList | File[]) {
        const fileArr = Array.from(files);
        if (fileArr.length === 0) return;

        setUploading(true);

        for (let i = 0; i < fileArr.length; i++) {
            const file = fileArr[i];
            setUploadProgress(`Uploading ${i + 1} of ${fileArr.length}: ${file.name}`);

            try {
                // Upload via server proxy (no CORS — file goes to our API, API pushes to R2)
                const formData = new FormData();
                formData.append('file', file);
                formData.append('patientId', patientId);

                const uploadRes = await fetch("/api/upload_url", {
                    method: "POST",
                    body: formData,
                });

                if (!uploadRes.ok) {
                    const error = await uploadRes.json();
                    throw new Error(`Upload failed: ${error.error || uploadRes.statusText}`);
                }

                const { fileKey, fileName: fName, fileSize, mimeType } = await uploadRes.json();
                console.log(`[Upload] Successfully uploaded ${file.name} to R2 via proxy`);

                // Save metadata to Supabase
                const { error: dbError } = await supabase.from("patient_media").insert({
                    patient_id: patientId,
                    branch_id: branchId,
                    file_url: fileKey,
                    file_key: fileKey,
                    file_name: fName || file.name,
                    file_size: fileSize || file.size,
                    mime_type: mimeType || file.type || 'application/octet-stream',
                    category: uploadCategory,
                    tooth_tags: [],
                });

                if (dbError) throw dbError;
                console.log(`[Upload] Saved metadata to Supabase for ${file.name}`);

            } catch (err: any) {
                console.error(`[Upload Error] Step ${i + 1}:`, err);
                alert(`Error uploading ${file.name}: ${err.message}`);
            }
        }

        setUploading(false);
        setUploadProgress(null);
        fetchMedia();
    }

    // Delete handler
    async function handleDelete(item: MediaItem) {
        if (!confirm(`Delete ${item.file_name}?`)) return;

        try {
            // 1. Delete from R2
            await fetch("/api/media", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileKey: item.file_key }),
            });

            // 2. Delete from Supabase
            await supabase.from("patient_media").delete().eq("id", item.id);

            setMedia((prev) => prev.filter((m) => m.id !== item.id));
        } catch (err: any) {
            console.error("Delete error:", err);
        }
    }

    // Save note
    async function saveNote(itemId: string) {
        await supabase
            .from("patient_media")
            .update({ clinical_note: noteText })
            .eq("id", itemId);

        setMedia((prev) =>
            prev.map((m) => (m.id === itemId ? { ...m, clinical_note: noteText } : m))
        );
        setEditingNote(null);
        setNoteText("");
    }

    // Save tooth tags
    async function saveToothTags(itemId: string) {
        const tags = toothTagValue.split(",").map((t) => t.trim()).filter(Boolean);
        await supabase
            .from("patient_media")
            .update({ tooth_tags: tags })
            .eq("id", itemId);

        setMedia((prev) =>
            prev.map((m) => (m.id === itemId ? { ...m, tooth_tags: tags } : m))
        );
        setToothTagInput(null);
        setToothTagValue("");
    }

    // Set comparison tag
    async function setComparisonTag(itemId: string, tag: "before" | "after" | null) {
        await supabase
            .from("patient_media")
            .update({ comparison_tag: tag })
            .eq("id", itemId);

        setMedia((prev) =>
            prev.map((m) => (m.id === itemId ? { ...m, comparison_tag: tag } : m))
        );
    }

    // Toggle compare selection
    function toggleCompare(itemId: string) {
        setSelectedForCompare((prev) => {
            if (prev.includes(itemId)) return prev.filter((id) => id !== itemId);
            if (prev.length >= 2) return [prev[1], itemId]; // Replace oldest
            return [...prev, itemId];
        });
    }

    // Drag & Drop handlers  
    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === dropRef.current) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
                handleUpload(e.dataTransfer.files);
            }
        },
        [uploadCategory, patientId, branchId]
    );

    // Filtered media
    const filteredMedia = activeCategory
        ? media.filter((m) => m.category === activeCategory)
        : media;

    // Group by date
    const groupedMedia: Record<string, MediaItem[]> = {};
    filteredMedia.forEach((item) => {
        const dateKey = format(new Date(item.created_at), "yyyy-MM-dd");
        if (!groupedMedia[dateKey]) groupedMedia[dateKey] = [];
        groupedMedia[dateKey].push(item);
    });

    const compareItems = selectedForCompare
        .map((id) => media.find((m) => m.id === id))
        .filter(Boolean) as MediaItem[];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Upload Zone */}
            <div
                ref={dropRef}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                    "card-premium p-6 transition-all border-2 border-dashed",
                    isDragging
                        ? "border-[#4318FF] bg-[#4318FF]/5 shadow-lg shadow-[#4318FF]/10"
                        : "border-[#E0E5F2] hover:border-[#4318FF]/30"
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                            isDragging ? "bg-[#4318FF] text-white" : "bg-[#F4F7FE] text-[#4318FF]"
                        )}>
                            <Upload className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-[#1B2559] tracking-tight">
                                {uploading ? uploadProgress : isDragging ? "Drop files here" : "Upload Clinical Media"}
                            </h3>
                            <p className="text-[9px] font-bold text-[#A3AED0] uppercase tracking-widest mt-0.5">
                                Drag & drop or click to browse • JPG, PNG, PDF
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Category Selector for Upload */}
                        <div className="relative">
                            <select
                                className="bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-2.5 text-[9px] font-black text-[#1B2559] uppercase tracking-widest appearance-none cursor-pointer pr-8 outline-none"
                                value={uploadCategory}
                                onChange={(e) => setUploadCategory(e.target.value)}
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-[#A3AED0] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="bg-[#4318FF] hover:bg-[#3311DB] disabled:bg-[#A3AED0] text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-[#4318FF]/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            {uploading ? "Uploading..." : "Browse"}
                        </button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => e.target.files && handleUpload(e.target.files)}
                />
            </div>

            {/* Filter + Compare Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveCategory(null)}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                            !activeCategory
                                ? "bg-[#1B2559] text-white border-[#1B2559]"
                                : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:text-[#1B2559]"
                        )}
                    >
                        All ({media.length})
                    </button>
                    {CATEGORIES.map((cat) => {
                        const count = media.filter((m) => m.category === cat.id).length;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5",
                                    activeCategory === cat.id
                                        ? "text-white shadow-md"
                                        : "bg-white text-[#A3AED0] border-[#E0E5F2] hover:text-[#1B2559]"
                                )}
                                style={{
                                    backgroundColor: activeCategory === cat.id ? cat.color : undefined,
                                    borderColor: activeCategory === cat.id ? cat.color : undefined,
                                }}
                            >
                                <cat.icon className="w-3 h-3" />
                                {cat.label} ({count})
                            </button>
                        );
                    })}
                </div>

                {selectedForCompare.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">
                            {selectedForCompare.length}/2 selected
                        </span>
                        {selectedForCompare.length === 2 && (
                            <button
                                onClick={() => setIsCompareOpen(true)}
                                className="bg-[#19D5C5] text-white px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-[#19D5C5]/20 transition-all active:scale-95"
                            >
                                Compare
                            </button>
                        )}
                        <button
                            onClick={() => setSelectedForCompare([])}
                            className="text-[9px] font-black text-[#EE5D50] uppercase tracking-widest hover:underline"
                        >
                            Clear
                        </button>
                    </div>
                )}
            </div>

            {/* Media Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 text-[#4318FF] animate-spin" />
                </div>
            ) : filteredMedia.length === 0 ? (
                <div className="card-premium p-12 text-center border-2 border-dashed border-[#E0E5F2]">
                    <div className="w-16 h-16 bg-[#F4F7FE] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-[#A3AED0]" />
                    </div>
                    <h4 className="text-lg font-black text-[#1B2559] mb-1">No Clinical Media</h4>
                    <p className="text-[10px] font-bold text-[#A3AED0] uppercase tracking-widest">
                        Upload X-rays, photos, or documents to get started
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedMedia)
                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                        .map(([dateKey, items]) => (
                            <div key={dateKey}>
                                <h4 className="text-[10px] font-black text-[#A3AED0] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[#4318FF]" />
                                    {format(new Date(dateKey), "MMMM dd, yyyy")}
                                    <span className="text-[#E0E5F2]">·</span>
                                    {items.length} file{items.length > 1 ? "s" : ""}
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {items.map((item) => {
                                        const isImage = item.mime_type?.startsWith("image/");
                                        const isSelected = selectedForCompare.includes(item.id);
                                        const cat = CATEGORIES.find((c) => c.id === item.category);

                                        return (
                                            <div
                                                key={item.id}
                                                className={cn(
                                                    "group relative rounded-2xl overflow-hidden border transition-all hover:shadow-xl cursor-pointer",
                                                    isSelected
                                                        ? "border-[#19D5C5] shadow-lg shadow-[#19D5C5]/10 ring-2 ring-[#19D5C5]/30"
                                                        : "border-[#E0E5F2] hover:border-[#4318FF]/30"
                                                )}
                                            >
                                                {/* Thumbnail */}
                                                <div
                                                    className="aspect-[4/3] bg-[#F4F7FE] relative"
                                                    onClick={() => isImage && setLightboxItem(item)}
                                                >
                                                    {isImage && item.viewUrl ? (
                                                        <img
                                                            src={item.viewUrl}
                                                            alt={item.file_name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <FileText className="w-10 h-10 text-[#A3AED0]" />
                                                        </div>
                                                    )}

                                                    {/* Hover overlay */}
                                                    <div className="absolute inset-0 bg-[#1B2559]/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                                        {isImage && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setLightboxItem(item); }}
                                                                className="w-9 h-9 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-white/30 transition-all"
                                                            >
                                                                <ZoomIn className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleCompare(item.id); }}
                                                            className={cn(
                                                                "w-9 h-9 backdrop-blur rounded-xl flex items-center justify-center transition-all",
                                                                isSelected ? "bg-[#19D5C5] text-white" : "bg-white/20 text-white hover:bg-white/30"
                                                            )}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                                                            className="w-9 h-9 bg-[#EE5D50]/80 backdrop-blur rounded-xl flex items-center justify-center text-white hover:bg-[#EE5D50] transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Category Badge */}
                                                    <div
                                                        className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest text-white"
                                                        style={{ backgroundColor: cat?.color || "#A3AED0" }}
                                                    >
                                                        {cat?.label || item.category}
                                                    </div>

                                                    {/* Comparison Tag */}
                                                    {item.comparison_tag && (
                                                        <div className={cn(
                                                            "absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest text-white",
                                                            item.comparison_tag === "before" ? "bg-[#FFB547]" : "bg-[#19D5C5]"
                                                        )}>
                                                            {item.comparison_tag}
                                                        </div>
                                                    )}

                                                    {/* Selection indicator */}
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#19D5C5] rounded-lg flex items-center justify-center text-white shadow-lg">
                                                            <Check className="w-3.5 h-3.5" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Info Bar */}
                                                <div className="p-3 bg-white space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[9px] font-black text-[#1B2559] truncate flex-1 tracking-tight">{item.file_name}</p>
                                                    </div>

                                                    {/* Tooth Tags */}
                                                    {item.tooth_tags && item.tooth_tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {item.tooth_tags.map((tag) => (
                                                                <span key={tag} className="text-[7px] font-black text-[#4318FF] bg-[#4318FF]/10 px-1.5 py-0.5 rounded-md uppercase">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Note */}
                                                    {item.clinical_note && (
                                                        <p className="text-[8px] font-bold text-[#A3AED0] truncate italic">{item.clinical_note}</p>
                                                    )}

                                                    {/* Quick Actions */}
                                                    <div className="flex items-center gap-1 pt-1 border-t border-[#F4F7FE]">
                                                        <button
                                                            onClick={() => {
                                                                setEditingNote(item.id);
                                                                setNoteText(item.clinical_note || "");
                                                            }}
                                                            className="text-[7px] font-black text-[#A3AED0] hover:text-[#4318FF] uppercase tracking-widest transition-all"
                                                        >
                                                            {item.clinical_note ? "Edit note" : "+ Note"}
                                                        </button>
                                                        <span className="text-[#E0E5F2]">·</span>
                                                        <button
                                                            onClick={() => {
                                                                setToothTagInput(item.id);
                                                                setToothTagValue(item.tooth_tags?.join(", ") || "");
                                                            }}
                                                            className="text-[7px] font-black text-[#A3AED0] hover:text-[#4318FF] uppercase tracking-widest transition-all"
                                                        >
                                                            {item.tooth_tags?.length ? "Edit teeth" : "+ Teeth"}
                                                        </button>
                                                        <span className="text-[#E0E5F2]">·</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => setComparisonTag(item.id, item.comparison_tag === "before" ? null : "before")}
                                                                className={cn("text-[7px] font-black uppercase tracking-widest transition-all", item.comparison_tag === "before" ? "text-[#FFB547]" : "text-[#A3AED0] hover:text-[#FFB547]")}
                                                            >B</button>
                                                            <button
                                                                onClick={() => setComparisonTag(item.id, item.comparison_tag === "after" ? null : "after")}
                                                                className={cn("text-[7px] font-black uppercase tracking-widest transition-all", item.comparison_tag === "after" ? "text-[#19D5C5]" : "text-[#A3AED0] hover:text-[#19D5C5]")}
                                                            >A</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Inline Note Editor */}
            {editingNote && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-[#E0E5F2] rounded-[2rem] w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <h4 className="text-sm font-black text-[#1B2559] tracking-tight">Clinical Note</h4>
                        <textarea
                            autoFocus
                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[11px] font-bold text-[#1B2559] outline-none min-h-[80px] focus:border-[#4318FF]/30"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add clinical observation..."
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingNote(null)} className="px-4 py-2 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Cancel</button>
                            <button
                                onClick={() => saveNote(editingNote)}
                                className="bg-[#4318FF] text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-[#4318FF]/20"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline Tooth Tag Editor */}
            {toothTagInput && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#1B2559]/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
                    <div className="bg-white border border-[#E0E5F2] rounded-[2rem] w-full max-w-sm shadow-2xl p-6 space-y-4">
                        <h4 className="text-sm font-black text-[#1B2559] tracking-tight">Tooth Tags</h4>
                        <p className="text-[9px] font-bold text-[#A3AED0]">Enter tooth numbers separated by commas (e.g. 11, 21, 36)</p>
                        <input
                            autoFocus
                            type="text"
                            className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[11px] font-bold text-[#1B2559] outline-none focus:border-[#4318FF]/30"
                            value={toothTagValue}
                            onChange={(e) => setToothTagValue(e.target.value)}
                            placeholder="11, 21, 36"
                            onKeyDown={(e) => e.key === "Enter" && saveToothTags(toothTagInput)}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setToothTagInput(null)} className="px-4 py-2 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Cancel</button>
                            <button
                                onClick={() => saveToothTags(toothTagInput)}
                                className="bg-[#4318FF] text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-[#4318FF]/20"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightboxItem && (
                <div className="fixed inset-0 z-[200] bg-[#1B2559]/90 backdrop-blur-xl flex items-center justify-center p-8 animate-in fade-in duration-300">
                    <button
                        onClick={() => setLightboxItem(null)}
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                    <div className="max-w-[90vw] max-h-[85vh]">
                        <img
                            src={lightboxItem.viewUrl || lightboxItem.file_url}
                            alt={lightboxItem.file_name}
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <div className="mt-4 flex items-center justify-center gap-4">
                            <p className="text-sm font-black text-white">{lightboxItem.file_name}</p>
                            {lightboxItem.tooth_tags?.length > 0 && (
                                <div className="flex gap-1">
                                    {lightboxItem.tooth_tags.map(t => (
                                        <span key={t} className="text-[8px] font-black text-[#4318FF] bg-white/20 px-2 py-0.5 rounded-md">#{t}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Compare Modal */}
            {isCompareOpen && compareItems.length === 2 && (
                <CompareMediaModal
                    isOpen={isCompareOpen}
                    onClose={() => {
                        setIsCompareOpen(false);
                        setSelectedForCompare([]);
                    }}
                    itemA={compareItems[0]}
                    itemB={compareItems[1]}
                />
            )}
        </div>
    );
}

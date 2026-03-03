"use client";

import { useState } from "react";
import {
    X, User, Stethoscope, Clock, DollarSign, CheckCircle2,
    Loader2, AlertTriangle, Trash2, ChevronRight, Calendar,
    Phone, UserCheck, Edit2, Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import Link from "next/link";

const STATUS_FLOW = ['Registered', 'Doing Treatment', 'Finished'] as const;
type AppointmentStatus = typeof STATUS_FLOW[number];

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
    'Registered': { bg: 'bg-[#19D5C5]/10', text: 'text-[#19D5C5]', dot: 'bg-[#19D5C5]', ring: 'ring-[#19D5C5]/30' },
    'Doing Treatment': { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', dot: 'bg-[#3B82F6]', ring: 'ring-[#3B82F6]/30' },
    'Finished': { bg: 'bg-[#EE5D50]/10', text: 'text-[#EE5D50]', dot: 'bg-[#EE5D50]', ring: 'ring-[#EE5D50]/30' },
};

interface Props {
    appointment: any;
    onClose: () => void;
    onRefresh: () => void;
}

export default function AppointmentDetailModal({ appointment, onClose, onRefresh }: Props) {
    const [status, setStatus] = useState<string>(appointment.status || 'Registered');
    const [notes, setNotes] = useState<string>(appointment.notes || '');
    const [editingNotes, setEditingNotes] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const appt = appointment;
    const patientName = appt.patients?.name || appt.manual_patient_name || '—';
    const treatmentName = appt.treatments?.name || appt.description || '—';
    const doctorName = appt.staff?.name || '—';
    const styles = STATUS_STYLES[status] || STATUS_STYLES['Registered'];

    async function handleStatusChange(newStatus: string) {
        if (newStatus === status) return;
        setLoading(true);
        setError(null);
        try {
            const { error: err } = await supabase
                .from('ledger_entries')
                .update({ status: newStatus })
                .eq('id', appt.id);
            if (err) throw err;
            setStatus(newStatus);
            onRefresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveNotes() {
        setLoading(true);
        setError(null);
        try {
            const { error: err } = await supabase
                .from('ledger_entries')
                .update({ notes })
                .eq('id', appt.id);
            if (err) throw err;
            setEditingNotes(false);
            onRefresh();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }
        setDeleting(true);
        setError(null);
        try {
            const { error: err } = await supabase
                .from('ledger_entries')
                .delete()
                .eq('id', appt.id);
            if (err) throw err;
            onRefresh();
            onClose();
        } catch (e: any) {
            setError(e.message);
            setDeleting(false);
        }
    }

    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(status as AppointmentStatus) + 1];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#1B2559]/25 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-md border border-[#E0E5F2] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                {/* Status color header */}
                <div className={cn("h-1.5 w-full", styles.dot === 'bg-[#19D5C5]' ? 'bg-[#19D5C5]' : styles.dot === 'bg-[#3B82F6]' ? 'bg-[#3B82F6]' : 'bg-[#EE5D50]')} />

                <div className="p-7 space-y-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            {appt.patient_id ? (
                                <Link href={`/patients/${appt.patient_id}`} className="hover:opacity-80 transition-opacity">
                                    <h2 className="text-[16px] font-black text-[#1B2559] tracking-tight underline decoration-[#E0E5F2] underline-offset-4 decoration-2">{patientName}</h2>
                                </Link>
                            ) : (
                                <h2 className="text-[16px] font-black text-[#1B2559] tracking-tight">{patientName}</h2>
                            )}
                            <p className="text-[11px] font-medium text-[#A3AED0] uppercase tracking-widest mt-0.5">
                                {appt.date && format(new Date(appt.date + 'T00:00:00'), 'EEE, MMM d yyyy')}
                                {appt.appointment_time && ` · ${appt.appointment_time.slice(0, 5)}`}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] transition-all">
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#F4F7FE] rounded-xl p-3.5 border border-[#E0E5F2]">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Treatment</p>
                            <p className="text-[12px] font-black text-[#1B2559] leading-tight">{treatmentName}</p>
                        </div>
                        <div className="bg-[#F4F7FE] rounded-xl p-3.5 border border-[#E0E5F2]">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Duration</p>
                            <p className="text-[12px] font-black text-[#1B2559]">{appt.duration_minutes || 15} min</p>
                        </div>
                        <div className="bg-[#F4F7FE] rounded-xl p-3.5 border border-[#E0E5F2]">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Total Price</p>
                            <p className="text-[12px] font-black text-[#1B2559]">${(appt.total_price || 0).toLocaleString()}</p>
                        </div>
                        <div className="bg-[#F4F7FE] rounded-xl p-3.5 border border-[#E0E5F2]">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest mb-1">Remaining</p>
                            <p className={cn("text-[12px] font-black", appt.amount_remaining > 0 ? "text-[#EE5D50]" : "text-[#19D5C5]")}>
                                ${(appt.amount_remaining || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>

                    {/* Status Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Status</p>
                            {status === 'Finished' && appt.amount_remaining > 0 && appt.patient_id && (
                                <Link
                                    href={`/ledger?patient=${appt.patient_id}`}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-[#EE5D50]/10 text-[#EE5D50] rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#EE5D50] hover:text-white transition-all shadow-sm group"
                                >
                                    Receive Payment
                                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                </Link>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {STATUS_FLOW.map((s, i) => {
                                const st = STATUS_STYLES[s];
                                const isActive = status === s;
                                const isPast = STATUS_FLOW.indexOf(status as AppointmentStatus) > i;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => handleStatusChange(s)}
                                        disabled={loading}
                                        className={cn(
                                            "flex-1 py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                                            isActive
                                                ? `${st.bg} ${st.text} border-current ring-2 ${st.ring}`
                                                : isPast
                                                    ? "bg-[#F4F7FE] text-[#1B2559] border-[#E0E5F2] opacity-60"
                                                    : "bg-[#F4F7FE] text-[#A3AED0] border-[#E0E5F2] hover:border-[#1B2559]/20 hover:text-[#1B2559]"
                                        )}
                                    >
                                        {s === 'Registered' ? 'Registered' : s === 'Doing Treatment' ? 'In Chair' : 'Done'}
                                    </button>
                                );
                            })}
                        </div>
                        {nextStatus && (
                            <button
                                onClick={() => handleStatusChange(nextStatus)}
                                disabled={loading}
                                className="w-full mt-2.5 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest bg-[#1B2559] text-white hover:bg-[#253375] transition-all active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                                Move to {nextStatus === 'Doing Treatment' ? 'In Chair' : 'Done'}
                            </button>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-medium text-[#A3AED0] uppercase tracking-widest">Notes</p>
                            {!editingNotes ? (
                                <button onClick={() => setEditingNotes(true)} className="flex items-center gap-1 text-[10px] font-medium text-[#3B82F6] hover:underline">
                                    <Edit2 className="w-3 h-3" /> Edit
                                </button>
                            ) : (
                                <button onClick={handleSaveNotes} disabled={loading} className="flex items-center gap-1 text-[10px] font-black text-[#19D5C5] hover:underline">
                                    <Save className="w-3 h-3" /> Save
                                </button>
                            )}
                        </div>
                        {editingNotes ? (
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="w-full bg-[#F4F7FE] border border-[#E0E5F2] rounded-xl px-4 py-3 text-[12px] font-medium text-[#1B2559] outline-none focus:border-[#3B82F6]/40 transition-all resize-none placeholder:text-[#A3AED0]"
                                placeholder="Add clinical notes..."
                                autoFocus
                            />
                        ) : (
                            <p className={cn("text-[12px] font-medium min-h-[40px] px-1", notes ? "text-[#1B2559]" : "text-[#A3AED0] italic")}>
                                {notes || 'No notes yet'}
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                            <AlertTriangle className="w-4 h-4 text-[#EE5D50] shrink-0" />
                            <p className="text-[11px] font-medium text-[#EE5D50]">{error}</p>
                        </div>
                    )}

                    {/* Delete */}
                    <div className="pt-1 border-t border-[#F4F7FE]">
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className={cn(
                                "w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                confirmDelete
                                    ? "bg-[#EE5D50] text-white hover:bg-red-600 shadow-sm"
                                    : "bg-[#F4F7FE] text-[#EE5D50] hover:bg-red-50 border border-[#EE5D50]/20"
                            )}
                        >
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            {confirmDelete ? 'Confirm Cancellation' : 'Cancel Appointment'}
                        </button>
                        {confirmDelete && (
                            <button onClick={() => setConfirmDelete(false)} className="w-full mt-1.5 text-center text-[10px] font-medium text-[#A3AED0] hover:text-[#1B2559]">
                                Keep it
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

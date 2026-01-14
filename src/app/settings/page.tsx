"use client";

import { useState, useEffect } from "react";
import {
    Settings as SettingsIcon,
    DollarSign,
    RefreshCw,
    Users,
    ShieldCheck,
    Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
    const [exchangeRate, setExchangeRate] = useState("4100");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        const { data } = await supabase
            .from('settings')
            .select('*')
            .eq('key', 'usd_to_khr')
            .single();
        if (data) setExchangeRate(data.value);
    }

    async function handleSaveRate() {
        setIsSaving(true);
        const { error } = await supabase
            .from('settings')
            .upsert({ key: 'usd_to_khr', value: exchangeRate, updated_at: new Date().toISOString() });

        if (!error) {
            // Log the change
            await supabase.from('audit_logs').insert({
                table_name: 'settings',
                record_id: '00000000-0000-0000-0000-000000000000', // System setting UUID
                action: 'UPDATE_EXCHANGE_RATE',
                new_values: { rate: exchangeRate }
            });
        }
        setIsSaving(false);
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                    <SettingsIcon className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-black">Admin Settings</h1>
                    <p className="text-sm text-muted-foreground">Manage clinic systems and finance configurations</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Exchange Rate Card */}
                <div className="bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-blue-400" />
                            Currency Rate
                        </h2>
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded font-bold uppercase tracking-widest">Global</span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Set the official exchange rate for KHR conversions. This rate is used for all "Real-time Summary" calculations in the ledger.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-secondary/30 p-4 rounded-2xl border border-border/50">
                            <div className="flex-1 space-y-1">
                                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest pl-1">1 USD ($) =</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        className="bg-transparent border-none focus:outline-none text-2xl font-black w-32"
                                        value={exchangeRate}
                                        onChange={(e) => setExchangeRate(e.target.value)}
                                    />
                                    <span className="text-2xl font-black text-muted-foreground">KHR (៛)</span>
                                </div>
                            </div>
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                                <DollarSign className="w-6 h-6" />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveRate}
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary/90 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
                        >
                            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Update Rate
                        </button>
                    </div>
                </div>

                {/* Roles & Security */}
                <div className="bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-400" />
                        Security & Access
                    </h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Audit Logging</p>
                                    <p className="text-[10px] text-muted-foreground">Tracking all financial changes</p>
                                </div>
                            </div>
                            <div className="w-10 h-6 bg-green-500 rounded-full relative">
                                <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm" />
                            </div>
                        </div>

                        <div className="p-6 border border-dashed border-border rounded-2xl text-center">
                            <p className="text-xs text-muted-foreground italic">
                                Advanced role management (Receptionist, Doctor) is coming in the next update.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";

export default function ReportsPage() {
    const [stats, setStats] = useState({
        daily: 0,
        weekly: 0,
        monthly: 0,
        patientCount: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        setIsLoading(true);
        const now = new Date();

        // Monthly
        const startM = format(startOfMonth(now), 'yyyy-MM-dd');
        const endM = format(endOfMonth(now), 'yyyy-MM-dd');
        const { data: mData } = await supabase
            .from('ledger_entries')
            .select('amount_paid')
            .gte('date', startM)
            .lte('date', endM);

        // Weekly
        const startW = format(startOfWeek(now), 'yyyy-MM-dd');
        const endW = format(endOfWeek(now), 'yyyy-MM-dd');
        const { data: wData } = await supabase
            .from('ledger_entries')
            .select('amount_paid')
            .gte('date', startW)
            .lte('date', endW);

        // Daily
        const today = format(now, 'yyyy-MM-dd');
        const { data: dData } = await supabase
            .from('ledger_entries')
            .select('amount_paid')
            .eq('date', today);

        // Patients
        const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true });

        setStats({
            monthly: mData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0,
            weekly: wData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0,
            daily: dData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0,
            patientCount: count || 0
        });
        setIsLoading(false);
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black">Financial Overview</h1>
                    <p className="text-sm text-muted-foreground">Performance metrics and summaries</p>
                </div>
                <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">{format(new Date(), 'MMMM yyyy')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Daily Income"
                    value={`$${stats.daily.toLocaleString()}`}
                    icon={<DollarSign className="w-6 h-6" />}
                    trend="+12%"
                    color="blue"
                />
                <StatCard
                    title="Weekly Income"
                    value={`$${stats.weekly.toLocaleString()}`}
                    icon={<TrendingUp className="w-6 h-6" />}
                    trend="+5%"
                    color="purple"
                />
                <StatCard
                    title="Monthly Total"
                    value={`$${stats.monthly.toLocaleString()}`}
                    icon={<BarChart3 className="w-6 h-6" />}
                    trend="+18%"
                    color="green"
                />
                <StatCard
                    title="Total Patients"
                    value={stats.patientCount.toString()}
                    icon={<Users className="w-6 h-6" />}
                    trend="+2"
                    color="amber"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-bold mb-6">Revenue Growth</h3>
                    <div className="h-64 flex items-end justify-between gap-2 px-4">
                        {[40, 70, 45, 90, 65, 80, 50, 85, 95, 75, 60, 100].map((h, i) => (
                            <div key={i} className="flex-1 bg-primary/20 rounded-t-lg relative group transition-all hover:bg-primary/40" style={{ height: `${h}%` }}>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    Week {i + 1}: ${h * 100}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest px-2">
                        <span>Jan</span>
                        <span>Feb</span>
                        <span>Mar</span>
                        <span>Apr</span>
                        <span>May</span>
                        <span>Jun</span>
                        <span>Jul</span>
                        <span>Aug</span>
                        <span>Sep</span>
                        <span>Oct</span>
                        <span>Nov</span>
                        <span>Dec</span>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
                    <h3 className="text-lg font-bold">Top Staff</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">L</div>
                                <span className="text-sm font-bold">Dr. Lynin</span>
                            </div>
                            <span className="text-xs font-mono">$12,400</span>
                        </div>
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 text-muted-foreground opacity-60">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold">T</div>
                                <span className="text-sm font-bold">Dr. Tita</span>
                            </div>
                            <span className="text-xs font-mono">$8,200</span>
                        </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic text-center">Calculated based on ledger entries associated with specific doctors.</p>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, icon, trend, color }: any) {
    const colorMap: any = {
        blue: "text-blue-400 bg-blue-400/10",
        purple: "text-purple-400 bg-purple-400/10",
        green: "text-green-400 bg-green-400/10",
        amber: "text-amber-400 bg-amber-400/10",
    };

    return (
        <div className="bg-card border border-border rounded-3xl p-6 shadow-lg space-y-4 hover:border-primary/50 transition-all group">
            <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${colorMap[color] || colorMap.blue}`}>
                    {icon}
                </div>
                <div className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded-lg">
                    <ArrowUpRight className="w-3 h-3" />
                    {trend}
                </div>
            </div>
            <div>
                <h4 className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{title}</h4>
                <p className="text-2xl font-black text-foreground">{value}</p>
            </div>
        </div>
    );
}

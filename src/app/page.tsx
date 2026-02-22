"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    TrendingUp,
    DollarSign,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Clock,
    AlertCircle,
    ChevronRight,
    LayoutGrid,
    Wallet,
    ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function ReportsPage() {
    const [stats, setStats] = useState({
        daily: 0,
        weekly: 0,
        monthly: 0,
        patientCount: 0,
        periodRevenue: 0,
        chartData: [] as number[],
        chartLabels: [] as string[],
        topStaff: [] as any[],
        overdueCount: 0,
        forecastedRevenue: 0,
        debtAging30: 0,
        overdueItems: [] as any[]
    });
    const [timeframe, setTimeframe] = useState<'1' | '7' | '30' | '90' | '180' | '365'>('30');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(true);

    const generateReport = async () => {
        const tsParam = encodeURIComponent(JSON.stringify(stats.topStaff));
        const timeframeLabel =
            timeframe === '365' ? `Annual (${selectedYear})` :
                timeframe === '180' ? 'Semi-Annual' :
                    timeframe === '90' ? 'Quarterly' :
                        timeframe === '30' ? 'Monthly' :
                            timeframe === '7' ? 'Weekly' : 'Daily';

        const url = `/print-report?timeframe=${timeframeLabel}&periodRevenue=${stats.periodRevenue}&weeklyIncome=${stats.weekly}&realizedTotal=${stats.monthly}&patientCount=${stats.patientCount}&topStaff=${tsParam}`;
        window.open(url, '_blank');
    };

    useEffect(() => {
        fetchStats();
    }, [timeframe, selectedYear]);

    async function fetchStats() {
        setIsLoading(true);
        const refDate = new Date();

        // Monthly
        const startM = format(startOfMonth(refDate), 'yyyy-MM-dd');
        const endM = format(endOfMonth(refDate), 'yyyy-MM-dd');
        const { data: mData } = await supabase
            .from('ledger_entries')
            .select('amount_paid')
            .gte('date', startM)
            .lte('date', endM);

        // Weekly
        const startW = format(startOfWeek(refDate), 'yyyy-MM-dd');
        const endW = format(endOfWeek(refDate), 'yyyy-MM-dd');
        const { data: wData } = await supabase
            .from('ledger_entries')
            .select('amount_paid')
            .gte('date', startW)
            .lte('date', endW);

        // Daily
        const today = format(refDate, 'yyyy-MM-dd');
        const { data: dData } = await supabase
            .from('ledger_entries')
            .select('amount_paid')
            .eq('date', today);

        // Period Based (Filter)
        const periodStartDate = new Date();
        if (timeframe === '365') {
            periodStartDate.setFullYear(selectedYear, 0, 1);
            const periodEndDate = new Date(selectedYear, 11, 31);
            const { data: pData } = await supabase
                .from('ledger_entries')
                .select('amount_paid')
                .gte('date', format(periodStartDate, 'yyyy-MM-dd'))
                .lte('date', format(periodEndDate, 'yyyy-MM-dd'));
            stats.periodRevenue = pData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0;
        } else {
            periodStartDate.setDate(refDate.getDate() - parseInt(timeframe));
            const periodStartStr = format(periodStartDate, 'yyyy-MM-dd');
            const { data: pData } = await supabase
                .from('ledger_entries')
                .select('amount_paid')
                .gte('date', periodStartStr)
                .lte('date', today);
            stats.periodRevenue = pData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0;
        }

        // Growth Chart Logic - DYNAMIC GROUPING
        const chartValues: number[] = [];
        const chartLabels: string[] = [];

        if (timeframe === '1') {
            // TODAY: Hourly bins
            const hours = Array.from({ length: 24 }).map((_, i) => i);
            chartLabels.push(...hours.map(h => `${h}:00`));

            const { data: dayEntries } = await supabase
                .from('ledger_entries')
                .select('amount_paid, created_at')
                .eq('date', today);

            hours.forEach(hour => {
                const total = (dayEntries || [])
                    .filter(e => new Date(e.created_at).getHours() === hour)
                    .reduce((acc, curr) => acc + Number(curr.amount_paid), 0);
                chartValues.push(total);
            });
        } else if (timeframe === '7') {
            // 7 DAYS: Daily bins (Mon-Sun)
            const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            chartLabels.push(...weekdays);

            const startW = format(startOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const endW = format(endOfWeek(refDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
            const { data: weekEntries } = await supabase
                .from('ledger_entries')
                .select('amount_paid, date')
                .gte('date', startW)
                .lte('date', endW);

            weekdays.forEach((_, idx) => {
                const total = (weekEntries || [])
                    .filter(e => {
                        const d = new Date(e.date);
                        // Convert to day of week (0=Mon, 6=Sun)
                        let day = d.getDay() - 1;
                        if (day === -1) day = 6;
                        return day === idx;
                    })
                    .reduce((acc, curr) => acc + Number(curr.amount_paid), 0);
                chartValues.push(total);
            });
        } else if (timeframe === '30') {
            // 1 MONTH: Weekly bins (W1-W4)
            const weeks = ['W1', 'W2', 'W3', 'W4'];
            chartLabels.push(...weeks);

            const startM = format(startOfMonth(refDate), 'yyyy-MM-dd');
            const endM = format(endOfMonth(refDate), 'yyyy-MM-dd');
            const { data: monthEntries } = await supabase
                .from('ledger_entries')
                .select('amount_paid, date')
                .gte('date', startM)
                .lte('date', endM);

            weeks.forEach((_, idx) => {
                const total = (monthEntries || [])
                    .filter(e => {
                        const dom = new Date(e.date).getDate();
                        const weekIdx = Math.min(Math.floor((dom - 1) / 7), 3);
                        return weekIdx === idx;
                    })
                    .reduce((acc, curr) => acc + Number(curr.amount_paid), 0);
                chartValues.push(total);
            });
        } else {
            // 3M, 6M, 1Y: Monthly bins
            const monthCount = parseInt(timeframe === '90' ? '3' : timeframe === '180' ? '6' : '12');
            for (let i = monthCount - 1; i >= 0; i--) {
                const d = new Date();
                d.setMonth(refDate.getMonth() - i);
                chartLabels.push(format(d, 'MMM'));

                const s = format(startOfMonth(d), 'yyyy-MM-dd');
                const e = format(endOfMonth(d), 'yyyy-MM-dd');
                const { data: hist } = await supabase
                    .from('ledger_entries')
                    .select('amount_paid')
                    .gte('date', s)
                    .lte('date', e);
                const total = hist?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0;
                chartValues.push(total);
            }
        }

        // Top Staff Fetching
        const { data: staffData } = await supabase
            .from('ledger_entries')
            .select(`
                amount_paid,
                staff:doctor_id (name)
            `);

        const staffAgg = (staffData || []).reduce((acc: any, curr: any) => {
            const name = curr.staff?.name || "Unknown";
            if (!acc[name]) acc[name] = 0;
            acc[name] += Number(curr.amount_paid);
            return acc;
        }, {});

        const topStaff = Object.entries(staffAgg)
            .map(([name, total]) => ({ name, total: total as number }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 3);

        // Patients
        const { count } = await supabase.from('patients').select('*', { count: 'exact', head: true });

        // Installment Logic
        const startOfMonthStr = format(startOfMonth(refDate), 'yyyy-MM-dd');
        const endOfMonthStr = format(endOfMonth(refDate), 'yyyy-MM-dd');
        const thirtyDaysAgo = format(new Date(refDate.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

        const { data: overdueData } = await supabase
            .from('ledger_entries')
            .select('*, patients(name, phone), payment_plans(description)')
            .not('payment_plan_id', 'is', null)
            .eq('status', 'pending')
            .lt('date', today);

        const { data: forecastData } = await supabase
            .from('ledger_entries')
            .select('total_price')
            .not('payment_plan_id', 'is', null)
            .eq('status', 'pending')
            .gte('date', startOfMonthStr)
            .lte('date', endOfMonthStr);

        setStats({
            monthly: mData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0,
            weekly: wData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0,
            daily: dData?.reduce((acc, curr) => acc + Number(curr.amount_paid), 0) || 0,
            periodRevenue: stats.periodRevenue, // Use the already calculated period revenue
            patientCount: count || 0,
            chartData: chartValues,
            chartLabels,
            topStaff,
            overdueCount: overdueData?.length || 0,
            forecastedRevenue: forecastData?.reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0,
            debtAging30: overdueData?.filter(item => item.date < thirtyDaysAgo).reduce((acc, curr) => acc + Number(curr.total_price), 0) || 0,
            overdueItems: overdueData || []
        });
        setIsLoading(false);
    }

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="h1-premium border-b border-transparent">Clinic Dashboard</h1>
                </div>
                <div className="flex items-center gap-3">
                    {timeframe === '365' && (
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="bg-secondary/50 border border-border rounded-xl px-4 py-1.5 text-xs font-bold outline-none focus:ring-2 ring-primary/20"
                        >
                            {[2024, 2025, 2026, 2027].map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    )}
                    <div className="flex bg-secondary/50 p-1 rounded-xl border border-border overflow-x-auto no-scrollbar max-w-[400px]">
                        {(['1', '7', '30', '90', '180', '365'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTimeframe(t)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                    timeframe === t ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {t === '1' ? 'Today' : t === '7' ? '7D' : t === '30' ? '1M' : t === '90' ? '3M' : t === '180' ? '6M' : '1Y'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={generateReport}
                        className="btn-primary-premium !bg-[#1B2559] hover:!bg-black h-[42px]"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Revenue Forecast"
                    value={`$${stats.forecastedRevenue.toLocaleString()}`}
                    icon={<TrendingUp className="w-6 h-6" />}
                    trend="Est. Month"
                    color="blue"
                    isActive={true}
                />
                <StatCard
                    title="Overdue Installments"
                    value={stats.overdueCount.toString()}
                    icon={<AlertCircle className="w-6 h-6" />}
                    trend={`${stats.overdueCount} Pending`}
                    color="red"
                />
                <StatCard
                    title="Debt Aging >30D"
                    value={`$${stats.debtAging30.toLocaleString()}`}
                    icon={<Clock className="w-6 h-6" />}
                    trend="Critical"
                    color="amber"
                />
                <StatCard
                    title="Total Patients"
                    value={stats.patientCount.toString()}
                    icon={<Users className="w-6 h-6" />}
                    trend="+2 Today"
                    color="purple"
                />
            </div>

            {/* Overdue Installments List */}
            {stats.overdueItems.length > 0 && (
                <div className="bg-white border border-[#EE5D50]/20 rounded-[2rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-[#EE5D50]/5 px-8 py-5 flex items-center justify-between border-b border-[#EE5D50]/10">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#EE5D50] flex items-center justify-center text-white shadow-lg shadow-[#EE5D50]/20">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-[#1B2559] uppercase tracking-widest">Critical: Overdue Installments</h3>
                                <p className="text-[10px] font-bold text-[#EE5D50] uppercase tracking-tighter">Action required to secure revenue flow</p>
                            </div>
                        </div>
                        <button className="text-[10px] font-black text-[#EE5D50] uppercase tracking-widest hover:underline">View All Collection Tasks</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#F4F7FE]/30 border-b border-[#E0E5F2]">
                                <tr>
                                    <th className="px-8 py-4 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Patient</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">Plan Detail</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest text-right">Amount Due</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest text-center">Due Date</th>
                                    <th className="px-8 py-4 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F4F7FE]">
                                {stats.overdueItems.slice(0, 5).map((item, idx) => (
                                    <tr key={idx} className="hover:bg-[#F4F7FE]/20 transition-all group">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-[#E0E5F2] flex items-center justify-center text-[10px] font-black text-[#1B2559]">
                                                    {item.patients?.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-black text-[#1B2559] leading-tight">{item.patients?.name}</p>
                                                    <p className="text-[9px] font-bold text-[#A3AED0]">{item.patients?.phone || 'No Contact'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-4">
                                            <p className="text-[11px] font-bold text-[#1B2559]">{item.payment_plans?.description || 'Treatment Installment'}</p>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <p className="text-[12px] font-black text-[#EE5D50]">${Number(item.total_price).toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-4 text-center">
                                            <span className="inline-flex px-2 py-1 rounded-lg bg-[#EE5D50]/10 text-[#EE5D50] text-[10px] font-black">
                                                {format(new Date(item.date), 'MMM d, yyyy')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button className="p-2 text-[#A3AED0] hover:text-[#4318FF] hover:bg-[#F4F7FE] rounded-xl transition-all">
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-card border border-border rounded-3xl p-8 shadow-xl">
                    <h3 className="text-lg font-bold mb-6">Revenue Growth</h3>
                    <div className={cn(
                        "h-64 flex items-end justify-between px-4",
                        stats.chartData.length > 12 ? "gap-1" : "gap-2"
                    )}>
                        {stats.chartData.map((h, i) => {
                            const max = Math.max(...stats.chartData, 1);
                            const height = (h / max) * 100;
                            return (
                                <div key={i} className="flex-1 bg-primary/20 rounded-t-lg relative group transition-all hover:bg-primary/40" style={{ height: `${height}%` }}>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        ${h.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-4 text-[10px] text-muted-foreground font-black uppercase tracking-widest px-2 overflow-x-auto no-scrollbar gap-1">
                        {stats.chartLabels.map((label, i) => (
                            <span key={i} className="flex-1 text-center min-w-[30px]">{label}</span>
                        ))}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
                    <h3 className="text-lg font-bold">Top Staff</h3>
                    <div className="space-y-4">
                        {stats.topStaff.map((s, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold">
                                        {s.name[0]}
                                    </div>
                                    <span className="text-sm font-bold">{s.name}</span>
                                </div>
                                <span className="text-xs font-mono">${s.total.toLocaleString()}</span>
                            </div>
                        ))}
                        {stats.topStaff.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground pt-10">No data available</p>
                        )}
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
        red: "text-[#EE5D50] bg-[#EE5D50]/10",
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

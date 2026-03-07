"use client";

import React, { useState, useMemo } from 'react';
import { ChevronDown, ArrowUp } from 'lucide-react';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CashflowChartProps {
    data: number[];
    labels: string[];
    timeframe: string;
    onTimeframeChange?: (t: string) => void;
    totalRevenue: number;
    trend: number; // percentage growth
}

export function CashflowChart({ data, labels, timeframe, onTimeframeChange, totalRevenue, trend }: CashflowChartProps) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const timeframeOptions: Record<string, string> = {
        '1': 'Today',
        '7': 'Last 7 days',
        '30': 'Last 30 days',
        '90': 'Last 3 months',
        '180': 'Last 6 months',
        '365': 'Last 12 months'
    };

    // Chart Dimensions
    const width = 800;
    const height = 300;
    const padding = { top: 60, right: 20, bottom: 40, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Derived values
    const maxDataValue = useMemo(() => Math.max(...data, 1000), [data]);

    // We want the Y axis to have 5-6 ticks. Let's calculate a nice max Y.
    // round up to nearest 1000 or 5000 depending on magnitude
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxDataValue)));
    const yMax = Math.ceil(maxDataValue / magnitude) * magnitude;
    const yTicks = [0, yMax * 0.2, yMax * 0.4, yMax * 0.6, yMax * 0.8, yMax];

    const formatYAxis = (val: number) => {
        if (val === 0) return '0';
        if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
        return val.toString();
    };

    const points = data.map((value, index) => {
        const x = padding.left + (index * (chartWidth / Math.max(data.length - 1, 1)));
        const y = padding.top + chartHeight - ((value / yMax) * chartHeight);
        return { x, y, value, label: labels[index] };
    });

    // SVG Path strings
    const linePath = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${padding.top + chartHeight} L ${points[0]?.x || 0} ${padding.top + chartHeight} Z`;

    const getYearLabel = () => {
        if (timeframe === '365') return `${new Date().getFullYear() - 1} - ${new Date().getFullYear()}`;
        return new Date().getFullYear().toString();
    };

    return (
        <div className="bg-white rounded-[24px] shadow-sm p-7 border border-[#E0E5F2] w-full relative">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-[18px] font-black text-[#1B2559] mb-4">Cashflow</h2>
                    <div className="space-y-1">
                        <span className="text-[11px] font-bold text-[#A3AED0] uppercase tracking-widest">Total Cash</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[32px] font-black tracking-tighter text-[#1B2559] leading-none">
                                ${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                            <div className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-black",
                                trend >= 0 ? "bg-[#19D5C5]/10 text-[#19D5C5]" : "bg-[#EE5D50]/10 text-[#EE5D50]"
                            )}>
                                <ArrowUp className={cn("w-3 h-3", trend < 0 && "rotate-180")} />
                                {Math.abs(trend)}%
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="relative z-50">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E5F2] rounded-xl text-[12px] font-bold text-[#1B2559] hover:bg-[#F4F7FE] transition-colors shadow-sm"
                        >
                            {timeframeOptions[timeframe] || 'Timeframe'}
                            <ChevronDown className="w-4 h-4 text-[#A3AED0]" />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E0E5F2] rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                {Object.entries(timeframeOptions).map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            onTimeframeChange?.(key);
                                            setIsFilterOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-left px-4 py-2.5 rounded-xl text-[12px] font-bold transition-all",
                                            timeframe === key ? "bg-[#4318FF] text-white" : "text-[#1B2559] hover:bg-[#F4F7FE]"
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <span className="text-[13px] font-bold text-[#1B2559]">{getYearLabel()}</span>
                </div>
            </div>

            {/* SVG Chart */}
            <div className="w-full relative min-h-[300px] overflow-hidden group">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-full text-sm font-sans"
                    preserveAspectRatio="none"
                    onMouseLeave={() => setHoverIndex(null)}
                >
                    <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4318FF" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#4318FF" stopOpacity="0.00" />
                        </linearGradient>
                    </defs>

                    {/* Grid lines & Y Axis */}
                    {yTicks.map((tick, i) => {
                        const y = padding.top + chartHeight - ((tick / yMax) * chartHeight);
                        return (
                            <g key={i}>
                                <text x={padding.left - 15} y={y + 4} textAnchor="end" className="text-[11px] font-bold fill-[#A3AED0]">
                                    {formatYAxis(tick)}
                                </text>
                                <line
                                    x1={padding.left}
                                    y1={y}
                                    x2={width - padding.right}
                                    y2={y}
                                    stroke="#E0E5F2"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                            </g>
                        );
                    })}

                    {/* X Axis Labels & Verticals */}
                    {points.map((p, i) => (
                        <g key={i}>
                            <text
                                x={p.x}
                                y={height - 10}
                                textAnchor="middle"
                                className={cn(
                                    "text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
                                    hoverIndex === i ? "fill-[#1B2559]" : "fill-[#A3AED0]"
                                )}
                            >
                                {p.label.substring(0, 3)}
                            </text>
                            {/* Dots for x-axis line representation instead of full vertical line */}
                            <circle cx={p.x} cy={padding.top + chartHeight + 10} r="1" fill="#A3AED0" />
                        </g>
                    ))}

                    {/* Line Path Area */}
                    <path
                        d={areaPath}
                        fill="url(#areaGradient)"
                        className="animate-in fade-in duration-1000"
                    />

                    {/* The Main Line */}
                    <path
                        d={linePath}
                        fill="none"
                        stroke="#4318FF"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Hover Interactions */}
                    {points.map((p, i) => (
                        <g
                            key={i}
                            onMouseEnter={() => setHoverIndex(i)}
                            className="cursor-pointer"
                        >
                            {/* Invisible wide interaction rect for easy hovering */}
                            <rect
                                x={p.x - Math.max(chartWidth / (data.length * 2), 10)}
                                y={padding.top}
                                width={Math.max(chartWidth / data.length, 20)}
                                height={chartHeight}
                                fill="transparent"
                            />

                            {/* Hover Effects */}
                            <g className={cn("transition-opacity duration-200", hoverIndex === i ? "opacity-100" : "opacity-0")}>
                                {/* Vertical Highlight Line */}
                                <line
                                    x1={p.x}
                                    y1={p.y}
                                    x2={p.x}
                                    y2={padding.top + chartHeight}
                                    stroke="#4318FF"
                                    strokeWidth="1.5"
                                    strokeDasharray="4 4"
                                    className="opacity-50"
                                />

                                {/* Data Point Circle */}
                                <circle
                                    cx={p.x}
                                    cy={p.y}
                                    r="4"
                                    fill="white"
                                    stroke="#4318FF"
                                    strokeWidth="2.5"
                                    className="filter drop-shadow-md cursor-pointer pointer-events-none"
                                />
                            </g>
                        </g>
                    ))}

                    {/* Tooltip implementation within SVG for perfect coordinate mapping */}
                    {hoverIndex !== null && points[hoverIndex] && (
                        <g
                            className="transition-all duration-200 ease-out pointer-events-none"
                            transform={`translate(${points[hoverIndex].x}, ${points[hoverIndex].y - 60})`}
                        >
                            <rect
                                x="-45"
                                y="0"
                                width="90"
                                height="45"
                                rx="6"
                                fill="#1B2559"
                                className="filter drop-shadow-xl"
                            />
                            {/* Triangle Base */}
                            <polygon points="-5,45 5,45 0,52" fill="#1B2559" />

                            <text x="0" y="16" textAnchor="middle" className="text-[10px] fill-[#A3AED0] font-bold">
                                Total:
                            </text>
                            <text x="0" y="34" textAnchor="middle" className="text-[13px] fill-white font-black tracking-tighter">
                                ${points[hoverIndex].value.toLocaleString()}
                            </text>
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}

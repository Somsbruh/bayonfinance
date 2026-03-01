"use client";

import React, { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCategoryColor } from '@/lib/constants';

interface RevenueData {
    category: string;
    amount: number;
}

interface RevenueBreakdownChartProps {
    data: RevenueData[];
    title?: string;
}

export function RevenueBreakdownChart({ data, title = "Income" }: RevenueBreakdownChartProps) {
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const totalAmount = useMemo(() => data.reduce((sum, item) => sum + item.amount, 0), [data]);

    // Aggregate and sort
    const displayData = useMemo(() => {
        return data
            .filter(item => item.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .map(item => {
                // Map common names to the ones in the new reference if they match
                let label = item.category;
                if (label === 'Ortho') label = 'Orthodontics';
                if (label === 'Implants') label = 'Implant Treatment';

                // Grab color from treatment constants, or fallback for 'Medicine (Sales)'
                let derivedColor = getCategoryColor(label);
                if (label === 'Medicine (Sales)') derivedColor = '#A855F7'; // Keep Medicine purple as it's distinct
                if (derivedColor === '#A3AED0' && label === 'Other') derivedColor = '#FBBF24'; // Brighter Yellow for 'Other'

                return {
                    category: label,
                    amount: item.amount,
                    percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
                    color: derivedColor
                };
            });
    }, [data, totalAmount]);

    const topCategories = displayData.slice(0, 4);

    // SVG Chart Math
    const radius = 70;
    const baseStrokeWidth = 11;
    const hoverStrokeWidth = 15;
    const circumference = 2 * Math.PI * radius;

    // We need physical gaps to separate the rounded caps.
    // The caps bleed by strokeWidth/2 on each side (total ~11px bleed = ~2.5% of circumference).
    // A gap of 3.5% ensures they clear each other and leave ~1% of true empty space.
    const gapPercentage = 3.5;
    const totalGapPercentage = displayData.length * gapPercentage;
    const usablePercentage = Math.max(0, 100 - totalGapPercentage);

    // Calculate stroke offsets with physical gaps between them
    let cumulativePercentage = 0;
    const segments = displayData.map((item) => {
        // Scale the data proportion to fit only the safe, un-gapped space
        let scaledPercentage = (item.percentage / 100) * usablePercentage;

        // Ensure even the smallest slice gets a minimum stroke length so it renders properly as a dot
        if (scaledPercentage < 0.1) scaledPercentage = 0.1;

        const segmentLength = (scaledPercentage / 100) * circumference;
        const strokeDasharray = `${segmentLength} ${circumference - segmentLength}`;

        // Start drawing at current offset
        const strokeDashoffset = circumference - ((cumulativePercentage / 100) * circumference);

        // Advance offset by slice length + gap explicitly
        cumulativePercentage += scaledPercentage + gapPercentage;

        return {
            category: item.category,
            color: item.color,
            strokeDasharray,
            strokeDashoffset,
            percentage: item.percentage
        };
    });

    // Segments no longer overlap, so paint order does not need manipulating
    const renderSegments = segments;

    // Inner circle dashed boundary
    const innerRadius = radius - (baseStrokeWidth / 2) - 4;

    return (
        <div className="bg-white rounded-[24px] shadow-sm p-7 w-full max-w-[420px] font-sans mx-auto flex flex-col h-full border border-[#E0E5F2]">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 text-[#1B2559]">
                <h2 className="text-[22px] font-black tracking-tight">{title}</h2>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0E5F2] hover:bg-[#F4F7FE] transition-colors">
                    <span className="text-[12px] font-bold text-[#A3AED0]">Last 6 months</span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#A3AED0]" />
                </button>
            </div>

            {/* Chart & Legend Row */}
            <div className="flex items-center gap-8 mb-10">
                {/* Custom SVG Chart Area */}
                <div className="relative w-[180px] h-[180px] shrink-0">
                    <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90 overflow-visible">
                        {/* The overlapping colored segments */}
                        {renderSegments.map((segment) => {
                            const isHovered = hoveredCategory === segment.category;
                            return (
                                <circle
                                    key={segment.category}
                                    cx="90"
                                    cy="90"
                                    r={radius}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeWidth={isHovered ? hoverStrokeWidth : baseStrokeWidth}
                                    strokeLinecap="round"
                                    strokeDasharray={segment.strokeDasharray}
                                    strokeDashoffset={segment.strokeDashoffset}
                                    className="transition-all duration-300 ease-out cursor-pointer origin-center"
                                    style={{
                                        filter: isHovered ? `drop-shadow(0 0 8px ${segment.color}80)` : 'none',
                                        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                                    }}
                                    onMouseEnter={() => setHoveredCategory(segment.category)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                />
                            );
                        })}

                        {/* The inner dashed ring */}
                        <circle
                            cx="90"
                            cy="90"
                            r={innerRadius}
                            fill="none"
                            stroke="#E0E5F2"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                        />
                    </svg>

                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center mt-1 pointer-events-none">
                        <span className="text-[7.5px] font-black text-[#8B95B7] mb-0.5 uppercase tracking-widest">Total {title}</span>
                        <span className="text-[16px] font-black text-[#1B2559] tracking-tighter leading-none">
                            ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Legend List */}
                <div className="flex-1 min-w-[130px] flex flex-col justify-center gap-3.5">
                    {displayData.slice(0, 5).map((item) => (
                        <div
                            key={item.category}
                            className="flex items-center justify-between group cursor-pointer"
                            onMouseEnter={() => setHoveredCategory(item.category)}
                            onMouseLeave={() => setHoveredCategory(null)}
                        >
                            <div className="flex items-center gap-2.5">
                                <div
                                    className="w-4 h-[7px] rounded-full shrink-0 transition-transform duration-300"
                                    style={{
                                        backgroundColor: item.color,
                                        transform: hoveredCategory === item.category ? 'scale(1.2)' : 'scale(1)'
                                    }}
                                />
                                <span
                                    className={`text-[12px] font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[85px] md:max-w-[100px] transition-colors duration-300 ${hoveredCategory === item.category ? 'text-black' : 'text-[#1B2559]'}`}
                                    title={item.category}
                                >
                                    {item.category}
                                </span>
                            </div>
                            <span className={`text-[12px] font-black transition-colors duration-300 ${hoveredCategory === item.category ? 'text-black' : 'text-[#1B2559]'}`}>
                                {item.percentage.toFixed(0)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Categories Row */}
            {topCategories.length > 0 && (
                <div className="mt-auto">
                    <h3 className="text-[11px] font-black text-[#A3AED0] uppercase tracking-[0.15em] mb-4">Top {title}</h3>
                    <div className="grid grid-cols-2 gap-3.5">
                        {topCategories.map((item) => (
                            <div
                                key={item.category}
                                className="bg-[#F8FAFC]/80 rounded-[14px] p-3.5 flex flex-col justify-center transition-all duration-300 cursor-pointer hover:bg-white hover:shadow-md hover:border-[#E0E5F2] border border-transparent"
                                onMouseEnter={() => setHoveredCategory(item.category)}
                                onMouseLeave={() => setHoveredCategory(null)}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-[11px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                    <span className="text-[12px] font-medium text-[#8B95B7] whitespace-nowrap overflow-hidden text-ellipsis">
                                        {item.category}
                                    </span>
                                </div>
                                <span className="text-[16px] font-black text-[#1B2559] pl-5 tracking-tight">
                                    ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

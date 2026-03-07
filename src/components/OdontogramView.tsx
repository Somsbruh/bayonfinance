"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import "./odontogram.css";

// Dynamic import for react-odontogram
const Odontogram = dynamic(() => import("react-odontogram").then(mod => mod.Odontogram), {
    ssr: false,
    loading: () => (
        <div className="flex flex-col items-center justify-center p-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    )
});

interface OdontogramViewProps {
    patientId: string;
    initialSelectedTeeth?: string[];
    onSelectionChange?: (teeth: string[]) => void;
    chartType: 'adult' | 'baby';
    onChartTypeChange?: (type: 'adult' | 'baby') => void;
}

export default function OdontogramView({
    patientId,
    initialSelectedTeeth = [],
    onSelectionChange,
    chartType,
    onChartTypeChange
}: OdontogramViewProps) {
    const [selectedTeeth, setSelectedTeeth] = useState<string[]>(initialSelectedTeeth);

    const handleOdontogramChange = (teeth: any[]) => {
        const ids = teeth.map(t => t.id.replace('teeth-', ''));
        setTimeout(() => {
            setSelectedTeeth(ids);
            if (onSelectionChange) {
                onSelectionChange(ids);
            }
        }, 0);
    };

    const [toothPositions, setToothPositions] = useState<Record<string, { x: number, y: number, isUpper: boolean }>>({});

    useEffect(() => {
        const updatePositions = () => {
            const container = document.querySelector('.odontogram-stage');
            if (!container) return;
            const containerRect = container.getBoundingClientRect();

            const gs = document.querySelectorAll('.odontogram-stage g');
            const positions: Record<string, { x: number, y: number, isUpper: boolean }> = {};

            gs.forEach(el => {
                let id = '';
                if (el.id?.startsWith('teeth-')) {
                    id = el.id.replace('teeth-', '');
                } else {
                    const className = Array.from(el.classList).find(c => c.startsWith('teeth-'));
                    if (className) id = className.replace('teeth-', '');
                }

                if (!id) return;

                const pathGroup = el.querySelector('path');
                const targetEl = pathGroup || el;
                const rect = targetEl.getBoundingClientRect();

                const localX = (rect.left + rect.width / 2) - containerRect.left;
                const localY = (rect.top + rect.height / 2) - containerRect.top;

                const isUpper = /^[1256]/.test(id);
                const toothNum = Number(id[1]);
                const isLeft = /^[2468]/.test(id);

                let adjustedX = localX;
                let adjustedY = localY;

                // Scale factor: assume original offsets were designed for ~400px width
                const scale = containerRect.width / 400;

                if (toothNum === 1) {
                    adjustedY += (isUpper ? -34 : 34) * scale;
                    adjustedX += (isLeft ? 0 : 0) * scale; // Centered exactly
                } else if (toothNum === 2) {
                    adjustedY += (isUpper ? -28 : 28) * scale;
                    adjustedX += (isLeft ? 14 : -14) * scale;
                } else if (toothNum === 3) {
                    adjustedY += (isUpper ? -26 : 26) * scale;
                    adjustedX += (isLeft ? 26 : -26) * scale;
                } else if (toothNum <= 5) {
                    adjustedY += (isUpper ? -10 : 10) * scale;
                    adjustedX += (isLeft ? 35 : -35) * scale;
                } else {
                    adjustedX += (isLeft ? 40 : -40) * scale;
                }

                const percentX = (adjustedX / containerRect.width) * 100;
                const percentY = (adjustedY / containerRect.height) * 100;

                positions[id] = { x: percentX, y: percentY, isUpper };
            });

            setToothPositions(positions);
        };

        const timeouts = [100, 500, 1000, 2000].map(delay => setTimeout(updatePositions, delay));

        const stage = document.querySelector('.odontogram-stage');
        let ro: ResizeObserver | null = null;
        if (stage) {
            ro = new ResizeObserver(() => updatePositions());
            ro.observe(stage);
        }

        return () => {
            timeouts.forEach(clearTimeout);
            if (ro) ro.disconnect();
        };
    }, [chartType]);

    return (
        <div className="w-full h-full flex flex-col relative">
            <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                <div className="relative w-full h-full max-w-[290px] max-h-[290px] sm:max-w-[340px] sm:max-h-[340px] md:max-w-[388px] md:max-h-[388px] aspect-square odontogram-stage">
                    <div className="absolute inset-x-0 inset-y-2 sm:inset-4 p-4">
                        <Odontogram
                            theme="light"
                            notation="FDI"
                            colors={{}}
                            maxTeeth={chartType === 'adult' ? 8 : 5}
                            onChange={handleOdontogramChange}
                            className="w-full h-full"
                        />
                    </div>

                    {Object.entries(toothPositions).map(([id, pos]) => {
                        const isActive = selectedTeeth.includes(id);
                        return (
                            <div
                                key={id}
                                className={cn(
                                    "absolute transform -translate-x-1/2 -translate-y-1/2 text-[11px] font-black pointer-events-none transition-all duration-300 flex items-center justify-center rounded-full",
                                    isActive
                                        ? "text-white bg-[#4318FF] w-7 h-7 shadow-[0_4px_16px_rgba(67,24,255,0.4)] scale-110 z-10 animate-in zoom-in-90"
                                        : "text-[#A3AED0] w-6 h-6 hover:text-[#1B2559]"
                                )}
                                style={{
                                    left: `${pos.x}%`,
                                    top: `${pos.y}%`
                                }}
                            >
                                {id}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style jsx global>{`
                .odontogram-stage .Odontogram {
                    max-width: none !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                .odontogram-stage .Odontogram svg {
                    width: 100% !important;
                    height: 100% !important;
                }
            `}</style>
        </div>
    );
}

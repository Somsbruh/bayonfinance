"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";

interface SignaturePadProps {
    onSave: (dataUrl: string) => void;
    onClear?: () => void;
    width?: number;
    height?: number;
    penColor?: string;
    className?: string;
}

export default function SignaturePad({
    onSave,
    onClear,
    width = 560,
    height = 200,
    penColor = "#1B2559",
    className = "",
}: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const lastPoint = useRef<{ x: number; y: number } | null>(null);

    // Setup canvas with high-DPI support
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = penColor;
        ctx.lineWidth = 2.5;

        // Draw baseline guide
        drawBaseline(ctx);
    }, [width, height, penColor]);

    function drawBaseline(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = "#E0E5F2";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, height - 50);
        ctx.lineTo(width - 40, height - 50);
        ctx.stroke();
        ctx.restore();

        // "Sign here" text
        ctx.save();
        ctx.font = "10px 'DM Sans', sans-serif";
        ctx.fillStyle = "#A3AED0";
        ctx.textAlign = "left";
        ctx.fillText("Sign above this line", 40, height - 30);
        ctx.restore();
    }

    const getPoint = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();

            if ("touches" in e) {
                const touch = e.touches[0];
                return {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                };
            }
            return {
                x: (e as React.MouseEvent).clientX - rect.left,
                y: (e as React.MouseEvent).clientY - rect.top,
            };
        },
        []
    );

    const startDrawing = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            const point = getPoint(e);
            lastPoint.current = point;
            setIsDrawing(true);
            setHasSignature(true);
        },
        [getPoint]
    );

    const draw = useCallback(
        (e: React.MouseEvent | React.TouchEvent) => {
            e.preventDefault();
            if (!isDrawing || !lastPoint.current) return;

            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");
            if (!ctx) return;

            const currentPoint = getPoint(e);

            // Smooth bezier curve between points for natural handwriting feel
            ctx.beginPath();
            ctx.strokeStyle = penColor;
            ctx.lineWidth = 2.5;
            ctx.setLineDash([]);

            const midX = (lastPoint.current.x + currentPoint.x) / 2;
            const midY = (lastPoint.current.y + currentPoint.y) / 2;

            ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
            ctx.quadraticCurveTo(
                lastPoint.current.x,
                lastPoint.current.y,
                midX,
                midY
            );
            ctx.stroke();

            lastPoint.current = currentPoint;
        },
        [isDrawing, getPoint, penColor]
    );

    const stopDrawing = useCallback(() => {
        setIsDrawing(false);
        lastPoint.current = null;
    }, []);

    function clearSignature() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, width, height);
        drawBaseline(ctx);
        setHasSignature(false);
        onClear?.();
    }

    function saveSignature() {
        const canvas = canvasRef.current;
        if (!canvas || !hasSignature) return;
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl);
    }

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Label */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#4318FF]" />
                    <span className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest">
                        Patient Signature
                    </span>
                </div>
                {hasSignature && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearSignature}
                            className="text-[9px] font-black text-[#EE5D50] uppercase tracking-widest hover:underline transition-all"
                        >
                            Clear
                        </button>
                        <button
                            onClick={saveSignature}
                            className="text-[9px] font-black text-[#19D5C5] uppercase tracking-widest bg-[#19D5C5]/10 px-3 py-1 rounded-lg hover:bg-[#19D5C5]/20 transition-all"
                        >
                            Confirm ✓
                        </button>
                    </div>
                )}
            </div>

            {/* Canvas */}
            <div className="relative rounded-2xl border-2 border-dashed border-[#E0E5F2] bg-white overflow-hidden transition-all hover:border-[#4318FF]/30">
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-[11px] font-bold text-[#A3AED0] opacity-40">
                            Tap or click and drag to sign
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

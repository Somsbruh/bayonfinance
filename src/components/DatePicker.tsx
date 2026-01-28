"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface DatePickerProps {
    value?: Date | string;
    onChange: (date: Date) => void;
    className?: string;
    placeholder?: string;
    format?: string;
    triggerClassName?: string;
}

export default function DatePicker({
    value,
    onChange,
    className,
    placeholder = "Select date",
    format: dateFormat = "EEEE, MMMM d",
    triggerClassName
}: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const selectedDate = value ? new Date(value) : null;

    useEffect(() => {
        setMounted(true);
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // If using portal, we need a different check, but for now we close on container click outside
                // If portals are used, we'll need to check the portal's ref too.
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (value) {
            setViewDate(new Date(value));
        }
    }, [value]);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: Math.max(320, rect.width)
            });
        }
    };

    const toggleOpen = () => {
        if (!isOpen) updateCoords();
        setIsOpen(!isOpen);
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(subMonths(viewDate, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(addMonths(viewDate, 1));
    };

    const handleDateClick = (date: Date) => {
        onChange(date);
        setIsOpen(false);
    };

    // Calendar Grid Logic
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const calendarContent = (
        <>
            <div
                className="fixed inset-0 z-[9998]"
                onClick={() => setIsOpen(false)}
            />
            <div
                className="fixed z-[9999] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-[#E0E5F2] p-5 w-[320px] animate-in fade-in zoom-in-95 duration-200"
                style={{
                    top: `calc(${coords.top}px + 0.5rem)`,
                    left: `${Math.min(window.innerWidth - 340, coords.left)}px`
                }}
            >
                <div className="flex items-center justify-between mb-5 px-1">
                    <span className="text-[12px] font-black text-[#1B2559] uppercase tracking-wider">
                        {format(viewDate, 'MMMM yyyy')}
                    </span>
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-primary transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-primary transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-3 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                        <div key={`${day}-${idx}`} className="text-[9px] font-black text-[#A3AED0] uppercase tracking-widest py-1">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                    {calendarDays.map((day, idx) => {
                        const isSelected = selectedDate && isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={day.toString()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDateClick(day);
                                }}
                                className={cn(
                                    "w-9 h-9 flex items-center justify-center rounded-xl text-[10px] font-black tracking-tight transition-all relative mx-auto",
                                    !isCurrentMonth && "text-[#E0E5F2]",
                                    isCurrentMonth && "text-[#1B2559] hover:bg-[#F4F7FE] hover:text-primary",
                                    isSelected && "bg-primary text-white hover:bg-[#3311DB] shadow-lg shadow-primary/20",
                                    isTodayDate && !isSelected && "bg-primary/5 text-primary"
                                )}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {/* Input Trigger - Fixed to match project pattern */}
            <div
                ref={triggerRef}
                onClick={toggleOpen}
                className={cn(
                    "flex items-center justify-between h-10 px-4 cursor-pointer group rounded-xl border border-[#E0E5F2] bg-[#F4F7FE] hover:bg-[#E0E5F2] transition-all",
                    triggerClassName
                )}
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                    <span className={cn("text-[10px] font-black text-[#1B2559] whitespace-nowrap", !selectedDate && "text-[#A3AED0]")}>
                        {selectedDate ? format(selectedDate, dateFormat) : placeholder}
                    </span>
                </div>
                <ChevronDown className={cn("w-3 h-3 text-[#A3AED0] transition-transform", isOpen && "rotate-180")} />
            </div>

            {/* Portal Dropdown Calendar */}
            {isOpen && mounted && createPortal(calendarContent, document.body)}
        </div>
    );
}

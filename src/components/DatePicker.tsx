"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek, setMonth, setYear } from 'date-fns';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

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
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const monthListRef = useRef<HTMLDivElement>(null);
    const yearListRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const selectedDate = value ? new Date(value) : null;

    useEffect(() => {
        setMounted(true);
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

    // Auto-scroll to current month/year when picker opens
    useEffect(() => {
        if (showMonthPicker && monthListRef.current) {
            const activeBtn = monthListRef.current.querySelector('[data-active="true"]');
            if (activeBtn) activeBtn.scrollIntoView({ block: 'center' });
        }
    }, [showMonthPicker]);

    useEffect(() => {
        if (showYearPicker && yearListRef.current) {
            const activeBtn = yearListRef.current.querySelector('[data-active="true"]');
            if (activeBtn) activeBtn.scrollIntoView({ block: 'center' });
        }
    }, [showYearPicker]);

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
        setShowMonthPicker(false);
        setShowYearPicker(false);
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(subMonths(viewDate, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(addMonths(viewDate, 1));
    };

    const handleMonthSelect = (monthIndex: number) => {
        setViewDate(setMonth(viewDate, monthIndex));
        setShowMonthPicker(false);
    };

    const handleYearSelect = (year: number) => {
        setViewDate(setYear(viewDate, year));
        setShowYearPicker(false);
    };

    const handleDateClick = (date: Date) => {
        onChange(date);
        setIsOpen(false);
    };

    // Year range: current year +/- 50
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 101 }, (_, i) => currentYear - 50 + i);

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
                    <div className="flex items-center gap-1.5">
                        {/* Clickable Month */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMonthPicker(!showMonthPicker);
                                setShowYearPicker(false);
                            }}
                            className={cn(
                                "text-[12px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all",
                                showMonthPicker ? "bg-primary text-white" : "text-[#1B2559] hover:bg-[#F4F7FE] hover:text-primary"
                            )}
                        >
                            {format(viewDate, 'MMMM')}
                        </button>
                        {/* Clickable Year */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowYearPicker(!showYearPicker);
                                setShowMonthPicker(false);
                            }}
                            className={cn(
                                "text-[12px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all",
                                showYearPicker ? "bg-primary text-white" : "text-[#1B2559] hover:bg-[#F4F7FE] hover:text-primary"
                            )}
                        >
                            {format(viewDate, 'yyyy')}
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-primary transition-all">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-[#F4F7FE] rounded-xl text-[#A3AED0] hover:text-primary transition-all">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Month Picker Dropdown */}
                {showMonthPicker && (
                    <div ref={monthListRef} className="max-h-[200px] overflow-y-auto custom-scrollbar mb-4 rounded-2xl border border-[#E0E5F2] bg-[#F4F7FE]/50">
                        {MONTHS.map((month, idx) => (
                            <button
                                key={month}
                                data-active={viewDate.getMonth() === idx}
                                onClick={(e) => { e.stopPropagation(); handleMonthSelect(idx); }}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all",
                                    viewDate.getMonth() === idx
                                        ? "bg-primary text-white"
                                        : "text-[#1B2559] hover:bg-[#E0E5F2]"
                                )}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                )}

                {/* Year Picker Dropdown */}
                {showYearPicker && (
                    <div ref={yearListRef} className="max-h-[200px] overflow-y-auto custom-scrollbar mb-4 rounded-2xl border border-[#E0E5F2] bg-[#F4F7FE]/50">
                        {years.map((year) => (
                            <button
                                key={year}
                                data-active={viewDate.getFullYear() === year}
                                onClick={(e) => { e.stopPropagation(); handleYearSelect(year); }}
                                className={cn(
                                    "w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all",
                                    viewDate.getFullYear() === year
                                        ? "bg-primary text-white"
                                        : "text-[#1B2559] hover:bg-[#E0E5F2]"
                                )}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                )}

                {/* Calendar Grid (hidden when pickers are open) */}
                {!showMonthPicker && !showYearPicker && (
                    <>
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
                    </>
                )}
            </div>
        </>
    );

    return (
        <div className={cn("relative w-full", className)} ref={containerRef}>
            {/* Input Trigger */}
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

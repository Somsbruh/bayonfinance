"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
    value?: Date | string;
    onChange: (date: Date) => void;
    className?: string;
    placeholder?: string;
}

export default function DatePicker({ value, onChange, className, placeholder = "Select date" }: DatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedDate = value ? new Date(value) : null;

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
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

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            {/* Input Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 cursor-pointer group hover:bg-gray-100 p-2 rounded-md transition-colors"
            >
                <CalendarIcon className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                <span className={cn("text-sm font-medium", !selectedDate && "text-gray-400")}>
                    {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : placeholder}
                </span>
            </div>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-50 w-[320px] animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <span className="text-base font-bold text-gray-800">
                            {format(viewDate, 'MMMM yyyy')}
                        </span>
                        <div className="flex items-center gap-1">
                            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                            <div key={`${day}-${idx}`} className="text-[10px] font-bold text-gray-400 py-1">
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
                                        "w-9 h-9 flex items-center justify-center rounded-full text-xs font-medium transition-all relative mx-auto",
                                        !isCurrentMonth && "text-gray-300",
                                        isCurrentMonth && "text-gray-700 hover:bg-gray-100",
                                        isSelected && "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
                                        isTodayDate && !isSelected && "bg-blue-50 text-blue-600 font-bold"
                                    )}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

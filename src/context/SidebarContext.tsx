"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (value: boolean) => void;
    toggleSidebar: () => void;
    showSummary: boolean;
    setShowSummary: (value: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showSummary, setShowSummary] = useState(true);

    // Persist preference
    useEffect(() => {
        const initSidebar = () => {
            const savedCollapsed = localStorage.getItem("sidebar-collapsed");
            if (savedCollapsed) setIsCollapsed(JSON.parse(savedCollapsed));

            const savedSummary = localStorage.getItem("show-summary");
            if (savedSummary) setShowSummary(JSON.parse(savedSummary));
        };
        initSidebar();
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            localStorage.setItem("sidebar-collapsed", JSON.stringify(next));
            return next;
        });
    };

    const handleSetShowSummary = (value: boolean) => {
        setShowSummary(value);
        localStorage.setItem("show-summary", JSON.stringify(value));
    };

    return (
        <SidebarContext.Provider value={{
            isCollapsed,
            setIsCollapsed,
            toggleSidebar,
            showSummary,
            setShowSummary: handleSetShowSummary
        }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}

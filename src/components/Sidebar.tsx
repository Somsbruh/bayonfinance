"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import { useBranch } from "@/context/BranchContext";
import { useCurrency } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";
import {
    Users,
    Stethoscope,
    UserSquare2,
    Settings,
    ShieldPlus,
    BarChart3,
    Activity,
    ChevronLeft,
    ChevronRight,
    LogOut,
    ChevronDown,
    Building2,
    Package,
    LayoutGrid
} from "lucide-react";

const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutGrid },
    { name: "Clinic Ledger", href: "/ledger", icon: Activity },
    { name: "Reservations", href: "/reservations", icon: Stethoscope },
    { name: "Patients Overview", href: "/patients", icon: Users },
    { name: "Treatments Catalog", href: "/treatments", icon: ShieldPlus },
    { name: "Inventory", href: "/inventory", icon: Package },
    { name: "Staff Directory", href: "/staff", icon: UserSquare2 },
    { name: "System Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, toggleSidebar } = useSidebar();
    const { currentBranch, branches, setBranch } = useBranch();
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);

    return (
        <div
            className={cn(
                "h-screen bg-white border-r border-[#E0E5F2] flex flex-col fixed left-0 top-0 z-[100] transition-all duration-500 ease-in-out shadow-[14px_17px_40px_4px_rgba(112,144,176,0.08)] print:hidden no-scrollbar overflow-hidden",
                isCollapsed ? "w-20" : "w-[264px]"
            )}
        >
            {/* Header / Logo */}
            <div className={cn(
                "p-4 px-[18px] pb-1 transition-all duration-500"
            )}>
                <div className="flex items-center gap-3 relative">
                    <div className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-primary/20 shrink-0">
                        <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    {!isCollapsed && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                            <h1 className="text-xl font-black text-[#1B2559] tracking-tighter leading-tight">
                                Bayon<span className="text-primary">Finance</span>
                            </h1>
                        </div>
                    )}

                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "absolute -right-4 top-1.5 w-8 h-8 bg-white border border-[#E0E5F2] rounded-full flex items-center justify-center text-[#A3AED0] hover:text-primary hover:border-primary transition-all shadow-md z-[120]",
                            isCollapsed && "-right-4"
                        )}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Branch Switcher Card */}
            <div className={cn(
                "px-[20px] transition-all duration-500 relative z-50",
                isCollapsed ? "mt-4" : "mt-8 mb-4"
            )}>
                <div className="relative">
                    <button
                        onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                        className={cn(
                            "group bg-[#F4F7FE] border border-[#E0E5F2] hover:border-primary/30 transition-all active:scale-[0.98] mx-auto",
                            isCollapsed ? "w-12 h-12 flex items-center justify-center rounded-2xl" : "w-full rounded-2xl p-2.5 flex items-center gap-3"
                        )}
                    >
                        <div className={cn(
                            "flex items-center justify-center text-primary transition-all shrink-0",
                            isCollapsed ? "w-6 h-6" : "w-8 h-8 ml-1"
                        )}>
                            <Building2 className={cn(isCollapsed ? "w-5 h-5" : "w-4 h-4")} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 text-left animate-in fade-in slide-in-from-left-2 duration-300">
                                <p className="text-[9px] font-black text-[#A3AED0] uppercase tracking-[0.15em] leading-none mb-0.5">Clinic</p>
                                <h3 className="text-xs font-black text-[#1B2559] truncate">{currentBranch?.name || "Loading..."}</h3>
                            </div>
                        )}
                        {!isCollapsed && (
                            <ChevronDown className={cn("w-3.5 h-3.5 text-[#A3AED0] transition-transform mr-1", isBranchMenuOpen && "rotate-180")} />
                        )}
                    </button>

                    {isBranchMenuOpen && (
                        <div className={cn(
                            "absolute mt-2 bg-white border border-[#E0E5F2] rounded-3xl shadow-2xl p-2 z-[200] animate-in zoom-in-95 duration-200 glass",
                            isCollapsed ? "left-full ml-4 top-0 w-64" : "top-full left-0 w-80"
                        )}>
                            <div className="px-4 py-2 text-[9px] font-black text-[#A3AED0] uppercase tracking-widest border-b border-[#F4F7FE] mb-2">
                                Select System Node
                            </div>
                            {branches.map(branch => (
                                <button
                                    key={branch.id}
                                    onClick={() => {
                                        setBranch(branch.id);
                                        setIsBranchMenuOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 p-3 rounded-2xl transition-all font-bold text-xs capitalize",
                                        currentBranch?.id === branch.id
                                            ? "bg-primary text-white"
                                            : "text-[#707EAE] hover:bg-[#F4F7FE] hover:text-primary"
                                    )}
                                >
                                    <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        currentBranch?.id === branch.id ? "bg-white" : "bg-primary/20"
                                    )} />
                                    {branch.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <nav className={cn(
                "flex-1 space-y-3 py-2",
                isCollapsed ? "px-0" : "px-3"
            )}>
                {navItems
                    .filter(item => {
                        // Basic RBAC: Only show Analytics & Settings if user is CEO/Admin
                        // Mocking role for now - in production this would come from a UserContext
                        const userRole = 'CEO'; // Mock role
                        if (['Analytics', 'System Settings'].includes(item.name) && userRole !== 'CEO') {
                            return false;
                        }
                        return true;
                    })
                    .map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                title={isCollapsed ? item.name : ""}
                                className={cn(
                                    "flex items-center gap-4 rounded-2xl transition-all duration-300 group relative mx-auto",
                                    isCollapsed ? "w-12 h-12 justify-center" : "w-full pl-[27px] pr-4 py-2.5",
                                    isActive
                                        ? "bg-primary text-white shadow-xl shadow-primary/25"
                                        : "text-[#A3AED0] hover:bg-gray-100 hover:text-[#1B2559]"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 shrink-0",
                                    isActive ? "text-white" : "text-[#A3AED0] group-hover:text-primary transition-colors"
                                )} />

                                {!isCollapsed && (
                                    <span className="text-[13px] font-bold tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                                        {item.name}
                                    </span>
                                )}

                                {isActive && !isCollapsed && (
                                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                )}
                            </Link>
                        );
                    })}

                {/* Log Out as part of scrollable list */}
                <button
                    onClick={() => {/* log out logic */ }}
                    title={isCollapsed ? "System Exit" : ""}
                    className={cn(
                        "flex items-center gap-4 rounded-2xl transition-all duration-300 group relative mt-1 mx-auto",
                        isCollapsed ? "w-12 h-12 justify-center" : "w-full pl-[27px] pr-4 py-2.5",
                        "text-[#A3AED0] hover:bg-red-50 hover:text-red-500"
                    )}
                >
                    <LogOut className={cn(
                        "w-5 h-5 shrink-0 transition-transform group-hover:rotate-12",
                        "text-[#A3AED0]"
                    )} />

                    {!isCollapsed && (
                        <span className="text-[13px] font-bold tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                            System Exit
                        </span>
                    )}
                </button>
            </nav>

            {/* Footer empty space for padding */}
            <div className="h-8 shrink-0" />
        </div >
    );
}

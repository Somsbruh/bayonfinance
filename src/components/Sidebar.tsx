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
    Building2
} from "lucide-react";

const navItems = [
    { name: "Dashboard & Ledger", href: "/", icon: Activity },
    { name: "Patients Overview", href: "/patients", icon: Users },
    { name: "Treatments Catalog", href: "/treatments", icon: ShieldPlus },
    { name: "Staff Directory", href: "/staff", icon: UserSquare2 },
    { name: "Analytics", href: "/reports", icon: BarChart3 },
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
                "h-screen bg-white border-r border-[#E0E5F2] flex flex-col fixed left-0 top-0 z-[100] transition-all duration-500 ease-in-out shadow-[14px_17px_40px_4px_rgba(112,144,176,0.08)] print:hidden",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Header / Logo */}
            <div className={cn(
                "p-8 pb-4 transition-all duration-500",
                isCollapsed ? "px-5" : "px-8"
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
                            <p className="text-[10px] text-[#A3AED0] uppercase tracking-widest font-black opacity-60">Dental Intelligence</p>
                        </div>
                    )}

                    <button
                        onClick={toggleSidebar}
                        className={cn(
                            "absolute -right-12 top-1.5 w-8 h-8 bg-white border border-[#E0E5F2] rounded-full flex items-center justify-center text-[#A3AED0] hover:text-primary hover:border-primary transition-all shadow-md z-[110]",
                            isCollapsed && "-right-10"
                        )}
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Branch Switcher Card */}
            <div className={cn(
                "px-4 mb-6 transition-all duration-500 relative z-50",
                isCollapsed ? "opacity-0 scale-95 pointer-events-none h-0" : "opacity-100 scale-100 h-auto"
            )}>
                <div className="relative">
                    <button
                        onClick={() => setIsBranchMenuOpen(!isBranchMenuOpen)}
                        className="w-full group bg-[#F4F7FE] border border-[#E0E5F2] hover:border-primary/30 rounded-3xl p-4 flex items-center gap-4 transition-all active:scale-[0.98]"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-white border border-[#E0E5F2] flex items-center justify-center text-primary shadow-sm group-hover:shadow-md transition-all">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest leading-none mb-1">Active Clinic</p>
                            <h3 className="text-sm font-black text-[#1B2559] truncate">{currentBranch?.name || "Loading..."}</h3>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-[#A3AED0] transition-transform", isBranchMenuOpen && "rotate-180")} />
                    </button>

                    {isBranchMenuOpen && (
                        <div className="absolute top-full left-0 w-80 mt-2 bg-white border border-[#E0E5F2] rounded-3xl shadow-2xl p-2 z-[200] animate-in zoom-in-95 duration-200">
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
                "flex-1 space-y-2 overflow-y-auto no-scrollbar py-2",
                isCollapsed ? "px-3" : "px-4"
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
                                    "flex items-center gap-4 rounded-2xl transition-all duration-300 group relative",
                                    isCollapsed ? "p-4 justify-center" : "px-5 py-4",
                                    isActive
                                        ? "bg-primary text-white shadow-xl shadow-primary/25"
                                        : "text-[#A3AED0] hover:bg-[#F4F7FE] hover:text-primary"
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
            </nav>

            <div className={cn(
                "p-4 mt-auto border-t border-[#F4F7FE] transition-all duration-500",
                isCollapsed ? "px-3" : "px-6"
            )}>
                {!isCollapsed ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[#A3AED0] hover:bg-red-50 hover:text-red-500 transition-all font-bold text-[13px] group">
                            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            <span>System Exit</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-6 py-4 animate-in fade-in duration-500">
                        <button className="p-3 text-[#A3AED0] hover:text-red-500 transition-all">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}

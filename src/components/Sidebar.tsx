"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BookOpen,
    Users,
    Stethoscope,
    UserSquare2,
    Settings,
    LayoutDashboard,
    Search
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Ledger", href: "/", icon: BookOpen },
    { name: "Patients", href: "/patients", icon: Users },
    { name: "Treatments", href: "/treatments", icon: Stethoscope },
    { name: "Staff", href: "/staff", icon: UserSquare2 },
    { name: "Reports", href: "/reports", icon: LayoutDashboard },
    { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-50">
            <div className="p-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent uppercase tracking-wider">
                    Bayon Finance
                </h1>
                <p className="text-[10px] text-muted-foreground mt-1 opacity-60">Dental Clinic Management</p>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group text-sm font-medium",
                                isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "w-5 h-5",
                                isActive ? "text-white" : "group-hover:text-primary transition-colors"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 mt-auto">
                <div className="p-4 rounded-2xl bg-secondary/50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Daily Status</span>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Exchange Rate</p>
                        <p className="text-sm font-bold text-foreground">1 USD = 4,100 KHR</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

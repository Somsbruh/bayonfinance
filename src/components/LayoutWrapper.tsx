"use client";

import Sidebar from "@/components/Sidebar";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen">
            <Sidebar />
            <main
                className={cn(
                    "flex-1 relative pb-24 transition-all duration-500 ease-in-out print:ml-0 print:p-0 overflow-x-hidden",
                    isCollapsed ? "ml-20" : "ml-[264px]"
                )}
            >
                <div className="max-w-[1440px] px-7 py-10">
                    {children}
                </div>
            </main>
        </div>
    );
}

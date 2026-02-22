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
        <div className="flex justify-center h-screen bg-[#F4F7FE] w-full overflow-hidden">
            <div className="flex w-full max-w-[1440px] 2xl:max-w-[2560px] relative mx-auto transition-all duration-500 h-full">
                <Sidebar />
                <main
                    className={cn(
                        "flex-1 relative transition-all duration-500 ease-in-out print:p-0 overflow-x-hidden overflow-y-auto min-w-0 bg-[#F4F7FE] h-full custom-scrollbar",
                        pathname === "/reservations" ? "pb-0" : "pb-24"
                    )}
                >
                    {pathname === "/reservations" ? (
                        children
                    ) : (
                        <div className="w-full px-7 py-7">
                            {children}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

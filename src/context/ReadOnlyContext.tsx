"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface ReadOnlyContextType {
    isReadOnly: boolean;
}

const ReadOnlyContext = createContext<ReadOnlyContextType>({ isReadOnly: false });

export function ReadOnlyProvider({ children }: { children: React.ReactNode }) {
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        const flag = localStorage.getItem("bayon_readonly");
        setIsReadOnly(flag === "true");
    }, []);

    return (
        <ReadOnlyContext.Provider value={{ isReadOnly }}>
            {isReadOnly && (
                <div className="fixed top-0 left-0 right-0 z-[99999] bg-amber-400 text-amber-900 text-[10px] font-black uppercase tracking-widest text-center py-1.5 flex items-center justify-center gap-2 shadow-md">
                    <span>👀</span>
                    <span>Demo Mode — Read Only. Changes are disabled.</span>
                    <span>👀</span>
                </div>
            )}
            <div className={isReadOnly ? "mt-[28px]" : ""}>
                {children}
            </div>
        </ReadOnlyContext.Provider>
    );
}

export function useReadOnly() {
    return useContext(ReadOnlyContext);
}

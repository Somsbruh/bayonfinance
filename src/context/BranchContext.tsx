"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Branch {
    id: string;
    name: string;
    location: string;
    is_main: boolean;
}

interface BranchContextType {
    currentBranch: Branch | null;
    branches: Branch[];
    setBranch: (branchId: string) => void;
    isLoading: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBranches = async () => {
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .order('name');

            if (data && data.length > 0) {
                setBranches(data);

                // Try to load from localStorage
                const savedBranchId = localStorage.getItem('active-branch-id');
                const savedBranch = data.find(b => b.id === savedBranchId);

                if (savedBranch) {
                    setCurrentBranch(savedBranch);
                } else {
                    // Default to main branch or first one
                    const main = data.find(b => b.is_main) || data[0];
                    setCurrentBranch(main);
                }
            }
            setIsLoading(false);
        };

        fetchBranches();

        // Subscribe to branch changes
        const subscription = supabase
            .channel('branches_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'branches' }, () => {
                fetchBranches();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const setBranch = (branchId: string) => {
        const branch = branches.find(b => b.id === branchId);
        if (branch) {
            setCurrentBranch(branch);
            localStorage.setItem('active-branch-id', branchId);
        }
    };

    return (
        <BranchContext.Provider value={{ currentBranch, branches, setBranch, isLoading }}>
            {children}
        </BranchContext.Provider>
    );
}

export function useBranch() {
    const context = useContext(BranchContext);
    if (context === undefined) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
}

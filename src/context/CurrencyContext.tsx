"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CurrencyContextType {
    usdToKhr: number;
    refreshRate: () => Promise<void>;
    isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const [usdToKhr, setUsdToKhr] = useState<number>(4100);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRate = async () => {
        try {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'usd_to_khr')
                .single();

            if (data) {
                setUsdToKhr(parseInt(data.value));
            }
        } catch (err) {
            console.error('Error fetching exchange rate:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let mounted = true;

        const fetchData = async () => {
            const { data } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'usd_to_khr')
                .single();

            if (data && mounted) {
                setUsdToKhr(parseInt(data.value));
                setIsLoading(false);
            }
        };

        fetchData();

        // Subscribe to changes in the settings table
        const subscription = supabase
            .channel('settings_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
                if (payload.new && payload.new.key === 'usd_to_khr' && mounted) {
                    setUsdToKhr(parseInt(payload.new.value));
                }
            })
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(subscription);
        };
    }, []);

    return (
        <CurrencyContext.Provider value={{ usdToKhr, refreshRate: fetchRate, isLoading }}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrency() {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
}

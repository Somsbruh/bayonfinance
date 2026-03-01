import type { Metadata } from "next";
import { Kantumruy_Pro } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { cn } from "@/lib/utils";


const kantumruy = Kantumruy_Pro({
  subsets: ["khmer", "latin"],
  variable: '--font-kantumruy'
});

export const metadata: Metadata = {
  title: "Bayon Finance | Dental Ledger",
  description: "Digital Finance Management for Bayon Dental Clinic",
};

import { SidebarProvider } from "@/context/SidebarContext";
import { BranchProvider } from "@/context/BranchContext";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(kantumruy.className, kantumruy.variable)}>
        <BranchProvider>
          <CurrencyProvider>
            <SidebarProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
            </SidebarProvider>
          </CurrencyProvider>
        </BranchProvider>
      </body>
    </html>
  );
}

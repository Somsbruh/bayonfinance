import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { CurrencyProvider } from "@/context/CurrencyContext";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
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

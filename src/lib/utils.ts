import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTelegramLink(phone: string) {
    if (!phone) return "";

    // If it's already an international number (starts with +)
    if (phone.startsWith('+')) {
        return `https://t.me/${phone}`;
    }

    // Otherwise, handle it as a local number (standard 855)
    let cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    if (!cleaned.startsWith('855')) {
        cleaned = '855' + cleaned;
    }

    return `https://t.me/+${cleaned}`;
}

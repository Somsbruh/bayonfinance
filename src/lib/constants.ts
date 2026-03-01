export const TREATMENT_CATEGORIES = [
    "Diagnostic",
    "Preventive",
    "Restorative",
    "Endodontic",
    "Periodontic",
    "Oral Surgery",
    "Prosthodontic",
    "Implant Treatment",
    "Orthodontics",
    "Cosmetic",
    "Pediatric"
];

export const CATEGORY_COLORS: Record<string, string> = {
    "Diagnostic": "#00E5FF",      // Vibrant Cyan
    "Preventive": "#00FF87",      // Neon Green
    "Restorative": "#FFD700",     // Bright Gold
    "Endodontic": "#FF6B00",      // Vibrant Neon Orange
    "Periodontic": "#D500F9",     // Hot Purple
    "Oral Surgery": "#FF1744",    // Bright Scarlet Red
    "Prosthodontic": "#00B0FF",   // Bright Sky Blue
    "Implant Treatment": "#FFAB00",// Bright Amber
    "Orthodontics": "#F59E0B",    // Bright Golden Yellow
    "Cosmetic": "#FF007F",        // Neon Pink
    "Pediatric": "#00E676"        // Vivid Mint
};

export const getCategoryColor = (name: string) => CATEGORY_COLORS[name] || "#A3AED0";

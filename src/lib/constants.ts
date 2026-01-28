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
    "Diagnostic": "#4A90E2",
    "Preventive": "#2ECC71",
    "Restorative": "#F1C40F",
    "Endodontic": "#E67E22",
    "Periodontic": "#8E44AD",
    "Oral Surgery": "#C0392B",
    "Prosthodontic": "#16A085",
    "Implant Treatment": "#2980B9",
    "Orthodontics": "#F39C12",
    "Cosmetic": "#D35400",
    "Pediatric": "#EC407A"
};

export const getCategoryColor = (name: string) => CATEGORY_COLORS[name] || "#A3AED0";

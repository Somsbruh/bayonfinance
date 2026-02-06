# Bayon Finance: Default UI Design Standards

## 1. Global Layout
- **Page Padding:** `px-7 py-7` (Mandatory for all dashboards and listing views).
- **Max Width:** `max-w-[1440px]` (Defined in `LayoutWrapper.tsx`).
- **Section Spacing:** `space-y-6` between major layout blocks.

## 2. Core Palette
| Element | Hex Code | Description |
| :--- | :--- | :--- |
| **Primary Blue** | `#4318FF` | Main brand color for buttons and active states. |
| **Deep Navy** | `#1B2559` | Primary text color and heavy accents. |
| **Muted Text** | `#A3AED0` | Secondary labels, captions, and icons. |
| **Background** | `#F4F7FE` | Dashboard background. |
| **Surface** | `#FFFFFF` | Card background and input background. |
| **Border Color** | `#E0E5F2` | Standard divider and component border color. |
| **Teal** | `#19D5C5` | Active/In-stock status. |
| **Orange** | `#FFB547` | Warning/Low-stock status. |
| **Red** | `#EE5D50` | Critical/Out-of-stock status. |

## 3. Typography (High-Density Scaling)
- **Scale Objective:** Maintain a ~70% compact visual scale compared to standard web apps.
- **Weights:** Use `900` (Black) for headings and `700` (Bold) for data points.
- **Hierarchy:**
    - **Page Title:** `text-4xl font-black text-[#1B2559] tracking-tight`
    - **Header 1 (Stats):** `text-3xl font-black text-[#1B2559] tracking-tighter leading-none`
    - **Header 2 (Section):** `text-2xl font-black text-[#1B2559] leading-none`
    - **Product/Item Names:** `text-[12px] font-black text-[#1B2559] font-kantumruy`
    - **Table Headings:** `text-[11px] font-black text-[#A3AED0] uppercase tracking-widest`
    - **Table Body (Primary):** `text-[12px] font-black text-[#1B2559]`
    - **Table Body (Secondary):** `text-[10px] font-bold text-[#A3AED0] uppercase tracking-tighter`
    - **Constraints:** NO decorative labels or flavor text. Keep titles clean and direct.

## 4. Component Standards (Inventory Pattern)
### Header & Stats Banner
- **Container Path:** `flex flex-col md:flex-row md:items-end justify-between gap-6 pt-0`.
- **Stats Group:** `flex flex-col lg:flex-row items-center gap-7 pt-0`.
- **Icon Container:** `w-11 h-11`, `rounded-full`, `border border-[#E0E5F2]`.
- **Icon Size:** `w-5.5 h-5.5`.
- **Vertical Divider:** `w-[1px] h-8 bg-[#E0E5F2]`.
- **Progress Bar:** `h-1.5`, `rounded-full`.
- **Status Bar Max Width:** `max-w-[315px]`.

### Cards & Surfaces
- **Primary Card:** `bg-white rounded-[24px] border border-[#E0E5F2] shadow-sm p-8`.
- **Secondary Radius:** `rounded-[20px]`.
- **Section Spacing:** Margin bottom `mb-10` between major card groups.

### Tabs & Navigation
- **Container:** `flex items-center gap-8 border-b border-[#E0E5F2] pt-2`.
- **Tab Font:** `text-[12px] font-bold`.
- **Active State:** `text-[#4318FF]` with `h-[2px] bg-[#4318FF]` underline.
- **Padding:** `pb-2.5`.

### Utility & Control Bar
- **Container:** `flex flex-col md:flex-row items-center gap-4 py-1`.
- **Search Bar:** `rounded-[20px]`, `px-11 py-3.5`, `text-[12px] font-bold`.
- **Buttons (Small):** `px-5 py-3 rounded-2xl text-[11px] font-black uppercase`.
- **Buttons (Action):** `px-6 py-3 rounded-2xl text-[11px] font-black uppercase shadow-md shadow-[#4318FF]/20`.

### Tables (High Density)
- **Container:** `bg-white rounded-[24px] border border-[#E0E5F2] shadow-sm overflow-hidden`.
- **Header Padding:** `px-5 py-5`.
- **Row Padding:** `px-5 py-4`.
- **Row Hover:** `hover:bg-[#F4F7FE]/20`.
- **Badges:** `text-[10px] font-black uppercase px-2.5 py-1.5 rounded-[10px]`.
- **Compact Progress:** `h-[5px] max-w-[90px] rounded-full`.

## 5. Component Architecture & Implementation

Maintain a high-density premium aesthetic (~70% visual scale) using these specific patterns.

### 5.1. Global Page Wrapper
All pages MUST use this entry animation and spacing.
```tsx
<div className="max-w-[1440px] px-7 py-7 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
    {/* Page Content */}
</div>
```

### 5.2. Page Header & Stats Banner
Compact metrics section for leading dashboard/listing views.
```tsx
<div className="flex flex-col lg:flex-row items-center gap-7 pt-0">
    {/* Major Metric */}
    <div className="flex items-center gap-4">
        <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center border border-[#E0E5F2] shadow-sm shrink-0">
            <Icon className="w-5.5 h-5.5 text-[#4318FF]" />
        </div>
        <div>
            <p className="text-[10px] font-black text-[#A3AED0] uppercase tracking-widest mb-0.5">Title</p>
            <h2 className="text-3xl font-black text-[#1B2559] tracking-tighter">$0,000</h2>
        </div>
    </div>

    <div className="hidden lg:block w-[1px] h-8 bg-[#E0E5F2]" />

    {/* Segmented Status Section */}
    <div className="flex-1 w-full lg:max-w-[315px]">
        <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-black text-[#1B2559]">Count</span>
            <span className="text-[12px] font-bold text-[#A3AED0]">description</span>
        </div>
        <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden mb-1.5">
            <div style={{ width: '70%' }} className="bg-[#19D5C5]" />
            <div style={{ width: '20%' }} className="bg-[#FFB547]" />
            <div style={{ width: '10%' }} className="bg-[#EE5D50]" />
        </div>
    </div>
</div>
```

### 5.3. Flat Navigation Tabs
Minimalist interactive tabs with smooth transitions.
```tsx
<div className="flex items-center gap-8 border-b border-[#E0E5F2] pt-2">
    {['Tab 1', 'Tab 2'].map((tab) => (
        <button key={tab} className={cn(
            "pb-2.5 text-[12px] font-bold transition-all relative",
            isActive ? "text-[#4318FF]" : "text-[#A3AED0] hover:text-[#1B2559]"
        )}>
            {tab}
            {isActive && <div className="absolute -bottom-[0.5px] left-0 right-0 h-[2px] bg-[#4318FF] rounded-t-full" />}
        </button>
    ))}
</div>
```

### 5.4. Utility & Control Bar
Standard row for search, filters, and primary actions.
```tsx
<div className="flex flex-col md:flex-row items-center gap-4 py-1">
    <div className="relative flex-1 w-full group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#A3AED0] group-focus-within:text-[#4318FF]" />
        <input className="w-full bg-white border border-[#E0E5F2] rounded-[20px] pl-11 pr-4 py-3.5 text-[12px] font-bold text-[#1B2559] focus:border-[#4318FF]/30 outline-none" />
    </div>
    <div className="flex items-center gap-2.5">
        <button className="bg-white px-5 py-3 rounded-2xl border border-[#E0E5F2] text-[11px] font-black text-[#1B2559]">Button</button>
        <button className="bg-[#4318FF] px-6 py-3 rounded-2xl text-[11px] font-black text-white shadow-md shadow-[#4318FF]/20">Action</button>
    </div>
</div>
```

### 5.5. Premium Data Tables
High-density, sortable tables with specific typography and status badges.
```tsx
{/* Row Item Sample */}
<tr className="hover:bg-[#F4F7FE]/20 transition-colors group">
    <td className="px-5 py-4">
        <span className="text-[12px] font-black text-[#1B2559] leading-tight font-kantumruy">Name</span>
    </td>
    <td className="px-5 py-4">
        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-tight text-[#19D5C5]">
            <div className="w-2 h-2 rounded-full bg-[#19D5C5]" />
            ACTIVE
        </div>
    </td>
    <td className="px-5 py-4 text-right">
        <button className="p-2 text-[#A3AED0] hover:text-[#4318FF] transition-all bg-[#F4F7FE]/50 rounded-lg">
            Details
        </button>
    </td>
</tr>
```

# 🧪 Bayon Finance - QC Audit & Bug Report

**Date:** January 14, 2026
**Auditor:** Antigravity (Nerd Mode)
**Status:** Core flows stable, specific UI/Logic bugs found.

---

## 🐞 Bugs Found (Priority: High)

### 1. Staff Deletion Failure
- **Location:** `src/app/staff/page.tsx`
- **Issue:** The "Trash" button on staff cards is purely cosmetic. It lacks an `onClick` event handler to trigger the Supabase deletion.
- **Impact:** Cannot remove incorrectly registered staff members.

### 2. Stale Exchange Rate in Sidebar
- **Location:** `src/components/Sidebar.tsx`
- **Issue:** The exchange rate (1 USD = 4,100 KHR) is hardcoded in the sidebar. Updating it in **Settings** updates the database but does not reflect in the UI globally.
- **Impact:** Confusion for receptionists seeing different rates on different screens.

---

## 🛠️ Minor UI/Logic Observations

### 3. Hydration Mismatch
- **Issue:** React warning on first load related to `data-jetski-tab-id` and date strings.
- **Current Fix:** Partial fix implemented for the home page date, but could be cleaner globally.

### 4. Treatment Catalog Deletion/Edit
- **Issue:** Buttons exist but are not yet linked to logic (similar to staff).

---

## ✅ Verified Working (Pass)
- [x] **Patient Search & Quick Add**: New patients are correctly registered and redirected.
- [x] **Daily Ledger View**: Dates switch correctly, and data is fetched reliably.
- [x] **Treatment Logging**: "Treatment Menu" clicks instantly record data to the patient history and ledger.
- [x] **Revenue Summary**: The bottom bar correctly calculates USD and KHR totals based on entries.
- [x] **Reports Dashboard**: Monthly, weekly, and daily stats are calculating from live data.
- [x] **Settings Persistence**: Exchange rate changes save correctly to Supabase.

---

## 🏁 Recommended Fix Actions
1. Implement `handleDeleteStaff` in `StaffPage`.
2. Fetch the actual exchange rate from `settings` table in a `Sidebar` useEffect or via a shared Context/Store.
3. Link the Treatment Edit/Delete buttons.

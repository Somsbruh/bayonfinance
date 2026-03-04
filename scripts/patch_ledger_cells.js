const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'ledger', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Lines are 1-indexed. Find the groupTotal line near the Total cell section.
// We want to replace lines 1695 through 1710 (the total + paid button)

const startReplace = 1695; // groupTotal const
const endReplace = 1710;   // up to and including the </button>

const newLines = [
    `                                             const groupTotal = group.reduce((sum, g) => sum + (g.total_price || 0), 0);\r`,
    `                                             const groupPaid = group.reduce((sum, g) => sum + (g.amount_paid || 0), 0);\r`,
    `                                             const groupRemaining = groupTotal - groupPaid;\r`,
    `                                             const paidPercent = groupTotal > 0 ? Math.min((groupPaid / groupTotal) * 100, 100) : 0;\r`,
    `                                             const hasDiscount = group.some(g => g.discount_type);\r`,
    `                                             const originalTotal = group.reduce((sum, g) => sum + (g.unit_price || 0) * (g.quantity || 1), 0);\r`,
    `                                             return (\r`,
    `                                               <>\r`,
    `                                                 {/* Total Cell */}\r`,
    `                                                 <td rowSpan={group.length} className="px-4 py-1.5 border-r border-[#E0E5F2] text-center bg-[#F4F7FE]/10 align-middle">\r`,
    `                                                   {hasDiscount && originalTotal > groupTotal && (\r`,
    `                                                     <div className="text-[9px] font-medium text-[#A3AED0] line-through">${'$'}{originalTotal.toLocaleString()}</div>\r`,
    `                                                   )}\r`,
    `                                                   <span className={cn("text-[11px] font-black", hasDiscount ? "text-emerald-600" : "text-[#1B2559]")}>${'$'}{groupTotal.toLocaleString()}</span>\r`,
    `                                                   {hasDiscount && <div className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Disc</div>}\r`,
    `                                                 </td>\r`,
    `                                                 {/* Paid Cell + Progress Bar */}\r`,
    `                                                 <td rowSpan={group.length} className="px-3 py-1.5 border-r border-[#E0E5F2] text-center align-middle min-w-[110px]">\r`,
    `                                                   <button\r`,
    `                                                     data-payment-trigger={firstEntry.id}\r`,
    `                                                     onClick={() => !isReadOnly && setActivePaymentDropdown(prev => prev === firstEntry.id ? null : firstEntry.id)}\r`,
    `                                                     className={cn("w-full text-center rounded-lg py-1 px-2 transition-all", isReadOnly ? "cursor-default" : "hover:bg-[#F4F7FE] cursor-pointer")}\r`,
    `                                                   >\r`,
    `                                                     <div className="flex items-center justify-center gap-1 mb-1">\r`,
    `                                                       <span className={cn("text-[11px] font-black",\r`,
    `                                                         paidPercent >= 100 ? "text-[#19D5C5]" : groupPaid > 0 ? "text-[#FFB547]" : "text-[#A3AED0]"\r`,
    `                                                       )}>${'$'}{groupPaid.toLocaleString()}</span>\r`,
    `                                                       {groupTotal > 0 && <span className="text-[9px] text-[#A3AED0] font-medium">/ ${'$'}{groupTotal.toLocaleString()}</span>}\r`,
    `                                                     </div>\r`,
    `                                                     {groupTotal > 0 && (\r`,
    `                                                       <div className="h-[3px] w-full bg-[#E0E5F2] rounded-full overflow-hidden">\r`,
    `                                                         <div className={cn("h-full rounded-full transition-all duration-500",\r`,
    `                                                           paidPercent >= 100 ? "bg-[#19D5C5]" : paidPercent > 0 ? "bg-[#FFB547]" : "bg-[#E0E5F2]"\r`,
    `                                                         )} style={{ width: \`\${paidPercent}%\` }} />\r`,
    `                                                       </div>\r`,
    `                                                     )}\r`,
];

// Verify the lines we're about to replace look right
console.log('Lines to replace:');
for (let i = startReplace; i <= endReplace; i++) {
    console.log(i + ': ' + lines[i - 1]?.substring(0, 100));
}

// Do the replacement
lines.splice(startReplace - 1, endReplace - startReplace + 1, ...newLines);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
console.log('Done! Replaced', (endReplace - startReplace + 1), 'lines with', newLines.length, 'lines');

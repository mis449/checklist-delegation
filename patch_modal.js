const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'Settings.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const targetStr = `                                                    ) : filteredTasks.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-6 text-center text-xs text-gray-500">
                                                                {checklistTasks.length === 0
                                                                    ? "No checklist tasks found for this user."
                                                                    : "No tasks match the selected date range."}
                                                            </td>
                                                        </tr>
                                                    ) : (`;

const newStr = `                                                    ) : filteredTasks.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-6 text-center text-xs text-gray-500">
                                                                <div className="flex flex-col items-center gap-2">
                                                                    <p>{checklistTasks.length === 0
                                                                        ? "No checklist tasks found for this user."
                                                                        : "No tasks match the selected date range."}
                                                                    </p>
                                                                    {checklistTasks.length === 0 && debugInfo && (
                                                                        <div className="mt-2 p-3 bg-red-50 text-red-800 text-[10px] rounded border border-red-100 text-left w-full max-w-md overflow-hidden">
                                                                            <p className="font-bold text-red-900 border-b border-red-200 pb-1 mb-1">Debug Info</p>
                                                                            <p><strong>Target User:</strong> <span className="font-mono bg-white px-1 border rounded">"{debugInfo.targetUser}"</span></p>
                                                                            <p><strong>Column Found:</strong> {debugInfo.doerIndex !== -1 ? \`Index \${debugInfo.doerIndex}\` : 'Not Found (Using Index 5)'}</p>
                                                                            
                                                                            <div className="mt-2">
                                                                                <p className="font-semibold">Headers:</p>
                                                                                <div className="font-mono text-[9px] bg-white p-1 rounded border overflow-x-auto whitespace-nowrap">
                                                                                    {JSON.stringify(debugInfo.headers)}
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-2">
                                                                                <p className="font-semibold">Sample Row Values (First 5):</p>
                                                                                <div className="bg-white p-1 rounded border">
                                                                                    <ul className="list-decimal pl-4 space-y-0.5">
                                                                                        {debugInfo.firstFewAssignees?.map((a, i) => (
                                                                                            <li key={i} className="font-mono">"{a}"</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ) : (`;

// Normalize logic to handle potential whitespace variations
// We'll try to find a specialized identifying string first
const uniqueIdentifier = '{checklistTasks.length === 0';
const startIdx = content.indexOf(uniqueIdentifier);

if (startIdx !== -1) {
    // Find the surrounding tr
    const trStart = content.lastIndexOf('<tr', startIdx);
    const trEnd = content.indexOf('</tr>', startIdx) + 5;

    // Find the conditional start and else
    const condStart = content.lastIndexOf(') : filteredTasks.length === 0 ? (', trStart);
    const condEnd = content.indexOf(') : (', trEnd) + 5;

    if (condStart !== -1 && condEnd !== -1) {
        // We found the block!
        const originalBlock = content.substring(condStart, condEnd);
        content = content.replace(originalBlock, newStr);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Successfully patched modal with debug info');
    } else {
        console.error('Could not find conditional boundaries');
        // Fallback to strict string replacement if logic fails
        if (content.includes(targetStr)) {
            content = content.replace(targetStr, newStr);
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('Successfully patched modal using strict replacement');
        } else {
            // Try to handle indentation differences by normalising spaces
            console.error('Strict replacement failed too. Please update manually.');
            process.exit(1);
        }
    }
} else {
    console.error('Could not find unique identifier');
    process.exit(1);
}

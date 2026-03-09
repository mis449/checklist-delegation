const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'Settings.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Find the block using simpler strings
const startAnchor = '{checklistTasks.length === 0';
const endAnchor = ': "No tasks match the selected date range."}';

const startIdx = content.indexOf(startAnchor);
const endIdx = content.indexOf(endAnchor);

if (startIdx !== -1 && endIdx !== -1) {
    const originalBlock = content.substring(startIdx, endIdx + endAnchor.length);
    console.log('Found block to replace:', originalBlock);

    const newBlock = `<div className="flex flex-col items-center gap-2">
                                                                    <p>{checklistTasks.length === 0
                                                                        ? "No checklist tasks found for this user."
                                                                        : "No tasks match the selected date range."}
                                                                    </p>
                                                                    {checklistTasks.length === 0 && debugInfo && (
                                                                        <div className="mt-4 p-3 bg-red-50 text-red-800 text-[10px] rounded border border-red-100 text-left w-full max-w-lg overflow-hidden font-mono">
                                                                            <p className="font-bold border-b border-red-200 pb-1 mb-2">Debug Info</p>
                                                                            <div className="grid grid-cols-[100px_1fr] gap-1">
                                                                                <span className="font-semibold text-red-900">Target User:</span>
                                                                                <span>"{debugInfo.targetUser}"</span>
                                                                                
                                                                                <span className="font-semibold text-red-900">Column Index:</span>
                                                                                <span>{debugInfo.doerIndex !== -1 ? debugInfo.doerIndex : 'Not Found (Using 5)'}</span>
                                                                            </div>

                                                                            <div className="mt-2">
                                                                                <p className="font-semibold text-red-900 mb-0.5">Headers Found:</p>
                                                                                <div className="bg-white p-1.5 rounded border border-red-100 overflow-x-auto whitespace-nowrap text-[9px]">
                                                                                    {JSON.stringify(debugInfo.headers)}
                                                                                </div>
                                                                            </div>

                                                                            <div className="mt-2">
                                                                                <p className="font-semibold text-red-900 mb-0.5">First 5 Row Values:</p>
                                                                                <div className="bg-white p-1.5 rounded border border-red-100">
                                                                                    <ul className="list-decimal pl-4 space-y-0.5">
                                                                                        {debugInfo.firstFewAssignees?.map((val, idx) => (
                                                                                            <li key={idx}>"{val}"</li>
                                                                                        ))}
                                                                                    </ul>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>`;

    // Replace carefully
    content = content.replace(originalBlock, newBlock);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Successfully patched modal with robust debug UI');
} else {
    console.error('Could not find the target block');
    console.log('Start index:', startIdx);
    console.log('End index:', endIdx);
    process.exit(1);
}

// const fs = require('fs');
// const path = require('path');

// const filePath = path.join(__dirname, 'src', 'pages', 'admin', 'Settings.jsx');
// let content = fs.readFileSync(filePath, 'utf-8');

// // ============================================================
// // 1. Add new state variables after the transferring state
// // ============================================================
// const stateAnchor = '    const [transferring, setTransferring] = useState(false)';
// const newStates = `    const [transferring, setTransferring] = useState(false)
//     const [checklistTasks, setChecklistTasks] = useState([])
//     const [checklistLoading, setChecklistLoading] = useState(false)
//     const [selectedChecklistTaskIds, setSelectedChecklistTaskIds] = useState([])`;

// if (content.includes(stateAnchor) && !content.includes('checklistTasks')) {
//     content = content.replace(stateAnchor, newStates);
//     console.log('✅ 1. Added new state variables');
// } else if (content.includes('checklistTasks')) {
//     console.log('⏭️ 1. State variables already exist, skipping');
// } else {
//     console.log('❌ 1. Could not find state anchor');
// }

// // ============================================================
// // 2. Replace handleCheckboxClick with version that fetches user tasks
// //    AND replace handleTransferSubmit with multi-task version
// // ============================================================
// const oldHandleCheckboxStart = '    const handleCheckboxClick = (row) => {';
// const handleEditStart = '    const handleEditClick';

// const checkboxStartIdx = content.indexOf(oldHandleCheckboxStart);
// const editStartIdx = content.indexOf(handleEditStart);

// if (checkboxStartIdx === -1) {
//     console.log('❌ 2. Could not find handleCheckboxClick');
//     process.exit(1);
// }
// if (editStartIdx === -1) {
//     console.log('❌ 2. Could not find handleEditClick');
//     process.exit(1);
// }

// const newFunctions = `    // Fetch checklist tasks for a specific user
//     const fetchUserChecklistTasks = async (userName) => {
//         try {
//             setChecklistLoading(true)
//             setChecklistTasks([])

//             const response = await fetch(
//                 \`\${CONFIG.APPS_SCRIPT_URL}?sheet=\${CONFIG.CHECKLIST_SHEET_NAME}&action=fetch\`
//             )

//             if (!response.ok) throw new Error("Failed to fetch checklist data")

//             const txt = await response.text()
//             let allRows = []

//             try {
//                 const parsed = JSON.parse(txt)
//                 if (parsed.table && parsed.table.rows) allRows = parsed.table.rows
//                 else if (Array.isArray(parsed)) allRows = parsed
//                 else if (parsed.values) allRows = parsed.values.map(r => ({ c: r.map(v => ({ v: v })) }))
//             } catch (e) {
//                 const jsonStart = txt.indexOf("{")
//                 const jsonEnd = txt.lastIndexOf("}")
//                 if (jsonStart !== -1 && jsonEnd !== -1) {
//                     const parsed = JSON.parse(txt.substring(jsonStart, jsonEnd + 1))
//                     if (parsed.table && parsed.table.rows) allRows = parsed.table.rows
//                 }
//             }

//             // Get headers from row 0
//             const headers = allRows[0]?.c?.map(c => c?.v) || []
//             const doerIndex = headers.findIndex(h => 
//                 h?.toString().toLowerCase().includes('doer') || 
//                 h?.toString().toLowerCase().includes('assignee') || 
//                 h?.toString().toLowerCase().includes('user')
//             )

//             const userTasks = allRows.slice(1).map((row, idx) => {
//                 let vals = []
//                 if (row.c) vals = row.c.map(c => c?.v)
//                 else if (Array.isArray(row)) vals = row
                
//                 const assignee = doerIndex !== -1 ? vals[doerIndex] : vals[5]
//                 const isAssignedToUser = String(assignee || '').trim().toLowerCase() === String(userName || '').trim().toLowerCase()

//                 if (isAssignedToUser) {
//                     // Find date column
//                     const dateIdx = headers.findIndex(h => h?.toString().toLowerCase().includes('date'))
//                     const taskDate = dateIdx !== -1 ? vals[dateIdx] : (vals[2] || vals[3] || 'N/A')
                    
//                     return {
//                         id: vals[0],
//                         description: vals[1],
//                         date: taskDate,
//                         originalRowIndex: idx + 2,
//                         allValues: vals
//                     }
//                 }
//                 return null
//             }).filter(t => t !== null)

//             setChecklistTasks(userTasks)

//         } catch (e) {
//             console.error("Error fetching checklist tasks:", e)
//         } finally {
//             setChecklistLoading(false)
//         }
//     }

//     const handleCheckboxClick = (row) => {
//         const headers = leaveData[0]?.headers || []
        
//         const getVal = (name) => {
//             const idx = headers.findIndex(h => h?.toLowerCase().includes(name.toLowerCase()))
//             return idx !== -1 ? row.values[idx] : ''
//         }
        
//         const userName = row.values[3] || "User"

//         const taskObj = {
//             id: row.id,
//             taskId: getVal('task id') || getVal('id') || row.values[0],
//             description: getVal('description') || getVal('desc') || getVal('task') || row.values[1],
//             date: getVal('date') || getVal('time') || new Date().toLocaleDateString(),
//             userName: userName,
//             ...row
//         }
        
//         setTransferTask(taskObj)
//         setTransferForm({
//             startDate: '',
//             endDate: '',
//             isChecked: false
//         })
//         setSelectedChecklistTaskIds([])
//         setShowTransferModal(true)
        
//         if (userName && userName !== "User") {
//             fetchUserChecklistTasks(userName)
//         }
//     }

//     const handleTransferSubmit = async () => {
//         if (selectedChecklistTaskIds.length === 0) {
//             alert("Please select at least one task to transfer.")
//             return
//         }
        
//         try {
//             setTransferring(true)
            
//             const startDateStr = transferForm.startDate ? new Date(transferForm.startDate).toLocaleDateString() : 'N/A'
//             const endDateStr = transferForm.endDate ? new Date(transferForm.endDate).toLocaleDateString() : 'N/A'
//             const remarkText = \`Leave from \${startDateStr} to \${endDateStr}\`

//             const promises = selectedChecklistTaskIds.map(async (taskId) => {
//                 const task = checklistTasks.find(t => t.id === taskId)
//                 if (!task) return null

//                 let fullRowData = [...task.allValues]
//                 while (fullRowData.length < 14) fullRowData.push("")
                
//                 fullRowData[13] = remarkText

//                 return fetch(CONFIG.APPS_SCRIPT_URL, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
//                     body: new URLSearchParams({
//                         sheetName: CONFIG.CHECKLIST_SHEET_NAME,
//                         action: 'update',
//                         rowIndex: String(task.originalRowIndex),
//                         rowData: JSON.stringify(fullRowData)
//                     })
//                 })
//             })

//             await Promise.all(promises)
            
//             setSuccessMessage(\`\${selectedChecklistTaskIds.length} tasks transferred successfully!\`)
//             setTimeout(() => setSuccessMessage(''), 3000)
//             setShowTransferModal(false)
            
//         } catch (e) {
//             console.error(e)
//             alert("Error transferring tasks: " + e.message)
//         } finally {
//             setTransferring(false)
//         }
//     }

// `;

// content = content.substring(0, checkboxStartIdx) + newFunctions + content.substring(editStartIdx);
// console.log('✅ 2. Replaced handleCheckboxClick and handleTransferSubmit');

// // ============================================================
// // 3. Restore the onClick handler on the checkbox in the Leave tab
// // ============================================================
// const checkboxNoClick = `                                                        <input
//                                                             type="checkbox"
//                                                             className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
//                                                         />`;

// const checkboxWithClick = `                                                        <input
//                                                             type="checkbox"
//                                                             className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 mt-1 cursor-pointer"
//                                                             onClick={(e) => {
//                                                                 e.stopPropagation()
//                                                                 handleCheckboxClick(row)
//                                                             }}
//                                                         />`;

// if (content.includes(checkboxNoClick)) {
//     content = content.replace(checkboxNoClick, checkboxWithClick);
//     console.log('✅ 3. Restored checkbox onClick handler');
// } else {
//     console.log('⚠️ 3. Checkbox pattern not found, might already have onClick');
// }

// // ============================================================
// // 4. Replace the Transfer/Leave Modal with new dynamic version
// // ============================================================
// const modalStart = '            {/* Transfer/Leave Modal */}';
// const modalEndMarker = '        </AdminLayout >';

// const modalStartIdx = content.indexOf(modalStart);
// const modalEndIdx = content.indexOf(modalEndMarker);

// if (modalStartIdx === -1) {
//     console.log('❌ 4. Could not find Transfer/Leave Modal start');
//     process.exit(1);
// }
// if (modalEndIdx === -1) {
//     console.log('❌ 4. Could not find AdminLayout closing tag');
//     process.exit(1);
// }

// const newModal = `            {/* Transfer/Leave Modal */}
//             {showTransferModal && transferTask && (() => {
//                 // Date filtering logic
//                 const parseDate = (dateStr) => {
//                     if (!dateStr) return null
//                     const d = new Date(dateStr)
//                     return isNaN(d.getTime()) ? null : d
//                 }

//                 const filterStart = parseDate(transferForm.startDate)
//                 const filterEnd = parseDate(transferForm.endDate)

//                 const filteredTasks = checklistTasks.filter(task => {
//                     if (!filterStart && !filterEnd) return true
//                     const taskDate = parseDate(task.date)
//                     if (!taskDate) return true
//                     if (filterStart && filterEnd) return taskDate >= filterStart && taskDate <= filterEnd
//                     if (filterStart) return taskDate >= filterStart
//                     if (filterEnd) return taskDate <= filterEnd
//                     return true
//                 })

//                 return (
//                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
//                     <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowTransferModal(false)}></div>
//                     <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col" style={{ maxHeight: '90vh' }}>
//                         {/* Header */}
//                         <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
//                             <h2 className="text-lg font-bold text-gray-800">
//                                 Transfer Tasks for <span className="text-purple-600">{transferTask.userName || transferTask.values[3] || "User"}</span>
//                             </h2>
//                             <button
//                                 onClick={() => setShowTransferModal(false)}
//                                 className="text-gray-400 hover:text-gray-600 transition-colors"
//                             >
//                                 <X size={20} />
//                             </button>
//                         </div>

//                         {/* Scrollable Body */}
//                         <div className="p-6 space-y-6 overflow-y-auto flex-1">

//                             {/* Dates */}
//                             <div className="grid grid-cols-2 gap-4">
//                                 <div>
//                                     <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date</label>
//                                     <input
//                                         type="date"
//                                         value={transferForm.startDate}
//                                         onChange={(e) => setTransferForm(prev => ({ ...prev, startDate: e.target.value }))}
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Date</label>
//                                     <input
//                                         type="date"
//                                         value={transferForm.endDate}
//                                         onChange={(e) => setTransferForm(prev => ({ ...prev, endDate: e.target.value }))}
//                                         className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
//                                     />
//                                 </div>
//                             </div>

//                             {/* Task List */}
//                             <div className="space-y-2">
//                                 <div className="flex items-center justify-between">
//                                     <h3 className="text-xs font-bold text-gray-700 uppercase">Tasks to Assign ({filteredTasks.length})</h3>
//                                     {selectedChecklistTaskIds.length > 0 && (
//                                         <span className="text-xs text-purple-600 font-medium">{selectedChecklistTaskIds.length} selected</span>
//                                     )}
//                                 </div>
//                                 <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ maxHeight: '340px' }}>
//                                     <div className="overflow-auto" style={{ maxHeight: '340px' }}>
//                                         <table className="min-w-full divide-y divide-gray-200">
//                                             <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
//                                                 <tr>
//                                                     <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase w-10">
//                                                         <input 
//                                                             type="checkbox"
//                                                             className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
//                                                             onChange={(e) => {
//                                                                 if (e.target.checked) {
//                                                                     setSelectedChecklistTaskIds(filteredTasks.map(t => t.id))
//                                                                 } else {
//                                                                     setSelectedChecklistTaskIds([])
//                                                                 }
//                                                             }}
//                                                             checked={filteredTasks.length > 0 && selectedChecklistTaskIds.length === filteredTasks.length}
//                                                         />
//                                                     </th>
//                                                     <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Task ID</th>
//                                                     <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Description</th>
//                                                     <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Date</th>
//                                                 </tr>
//                                             </thead>
//                                             <tbody className="bg-white divide-y divide-gray-100">
//                                                 {checklistLoading ? (
//                                                     <tr>
//                                                         <td colSpan={4} className="py-8 text-center text-gray-500">
//                                                             <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-600" />
//                                                             <p className="mt-2 text-xs">Loading tasks...</p>
//                                                         </td>
//                                                     </tr>
//                                                 ) : filteredTasks.length === 0 ? (
//                                                     <tr>
//                                                         <td colSpan={4} className="py-6 text-center text-xs text-gray-500">
//                                                             {checklistTasks.length === 0 
//                                                                 ? "No checklist tasks found for this user." 
//                                                                 : "No tasks match the selected date range."}
//                                                         </td>
//                                                     </tr>
//                                                 ) : (
//                                                     filteredTasks.map((task) => (
//                                                         <tr key={task.id} className={\`hover:bg-gray-50 cursor-pointer \${selectedChecklistTaskIds.includes(task.id) ? 'bg-purple-50' : ''}\`}
//                                                             onClick={() => {
//                                                                 setSelectedChecklistTaskIds(prev => 
//                                                                     prev.includes(task.id) 
//                                                                         ? prev.filter(id => id !== task.id) 
//                                                                         : [...prev, task.id]
//                                                                 )
//                                                             }}
//                                                         >
//                                                             <td className="px-4 py-3 text-center">
//                                                                 <input
//                                                                     type="checkbox"
//                                                                     checked={selectedChecklistTaskIds.includes(task.id)}
//                                                                     onChange={() => {}}
//                                                                     className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
//                                                                 />
//                                                             </td>
//                                                             <td className="px-4 py-3 text-xs font-medium text-gray-900">{task.id}</td>
//                                                             <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{task.description}</td>
//                                                             <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{task.date}</td>
//                                                         </tr>
//                                                     ))
//                                                 )}
//                                             </tbody>
//                                         </table>
//                                     </div>
//                                 </div>
//                             </div>

//                         </div>

//                         {/* Footer */}
//                         <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
//                             <span className="text-xs text-gray-500">
//                                 {selectedChecklistTaskIds.length === 0 
//                                     ? 'No tasks selected' 
//                                     : \`\${selectedChecklistTaskIds.length} task(s) selected\`}
//                             </span>
//                             <div className="flex gap-3">
//                                 <button
//                                     onClick={() => setShowTransferModal(false)}
//                                     className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
//                                 >
//                                     Cancel
//                                 </button>
//                                 <button
//                                     onClick={handleTransferSubmit}
//                                     disabled={transferring || selectedChecklistTaskIds.length === 0}
//                                     className={\`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 \${
//                                         selectedChecklistTaskIds.length === 0 
//                                             ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
//                                             : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
//                                     }\`}
//                                 >
//                                     {transferring ? <Loader2 size={16} className="animate-spin" /> : <span>⇆</span>}
//                                     Leave
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//                 )
//             })()}
// `;

// content = content.substring(0, modalStartIdx) + newModal + content.substring(modalEndIdx);
// console.log('✅ 4. Replaced Transfer/Leave Modal with dynamic version');

// // Write back
// fs.writeFileSync(filePath, content, 'utf-8');
// console.log('\n✅ All changes applied successfully!');

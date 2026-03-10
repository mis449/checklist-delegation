import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import { Plus, User, Building, X, Save, Edit, Trash2, Search, ChevronDown, Loader2, Building2, Users, RefreshCw, Pencil, LogOut, Upload } from 'lucide-react'

// Configuration
const CONFIG = {
    SHEET_ID: "1O07ebj7ht7tKqVjHjQPOJ90UETRLQwJ2SiIgE5Uqo4k",
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzfrYD9dNLvntXzm3TB-iSfH-0zlkOS5gWG83VLqsv9Hua-9VgjGOgE0sOE7H9xD2gj/exec",
    SHEET_NAME: "Whatsapp",
    LEAVE_SHEET_NAME: "Unique",
    CHECKLIST_SHEET_NAME: "Checklist"
}

function Settings() {
    const navigate = useNavigate()
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [editingId, setEditingId] = useState(null)
    const [editedValues, setEditedValues] = useState({ doerName: '', password: '', role: '', idEmail: '', number: '' })
    const [saving, setSaving] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [deleting, setDeleting] = useState(null)
    const [authorized, setAuthorized] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newEntry, setNewEntry] = useState({ doerName: '', password: '', role: '', idEmail: '', number: '' })
    const [adding, setAdding] = useState(false)

    // UI states from reference
    const [activeTab, setActiveTab] = useState('users') // 'users' or 'departments'
    const [usernameFilter, setUsernameFilter] = useState('')
    const [usernameDropdownOpen, setUsernameDropdownOpen] = useState(false)
    const [activeDeptSubTab, setActiveDeptSubTab] = useState('departments') // 'departments' or 'givenBy'

    // Department states
    const [showDeptModal, setShowDeptModal] = useState(false)
    const [newDeptEntry, setNewDeptEntry] = useState({ department: '', givenBy: '' })
    const [addingDept, setAddingDept] = useState(false)
    const [editingDeptId, setEditingDeptId] = useState(null)
    const [editedDeptValues, setEditedDeptValues] = useState({ department: '', givenBy: '' })
    const [savingDept, setSavingDept] = useState(false)

    // Leave states
    const [leaveData, setLeaveData] = useState([])
    const [leaveLoading, setLeaveLoading] = useState(false)
    const [leaveError, setLeaveError] = useState(null)
    const [leaveRemarks, setLeaveRemarks] = useState({}) // { [_rowIndex]: remarksValue }
    const [savingRemarksId, setSavingRemarksId] = useState(null)

    // Transfer/Leave Modal States
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [transferTask, setTransferTask] = useState(null)
    const [transferForm, setTransferForm] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        remarks: '',
        isChecked: false
    })
    const [transferring, setTransferring] = useState(false)
    const [checklistTasks, setChecklistTasks] = useState([])
    const [checklistLoading, setChecklistLoading] = useState(false)
    const [selectedChecklistTaskIds, setSelectedChecklistTaskIds] = useState([])
    const [debugInfo, setDebugInfo] = useState(null)

    // Fetch leave data when tab is active
    useEffect(() => {
        if (authorized && activeTab === 'leave' && leaveData.length === 0) {
            fetchLeaveData()
        }
    }, [activeTab, authorized, leaveData.length])

    // Check authorization on mount
    useEffect(() => {
        const userRole = String(sessionStorage.getItem("role") || "").toLowerCase();
        const normalizedRole = userRole.toLowerCase().trim().replace(/\s+/g, '_')

        // Only allow admin, super_admin or superadmin
        if (normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'superadmin') {
            setAuthorized(true)
            fetchWhatsappData()
        } else {
            navigate('/dashboard/admin', { replace: true })
        }
    }, [navigate])

    const fetchWhatsappData = async () => {
        try {
            setLoading(true)
            setError(null)

            const sheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`
            const response = await fetch(sheetUrl)

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`)
            }

            const responseText = await response.text()

            // Extract the JSON part from the gviz wrapper
            const jsonStart = responseText.indexOf('{')
            const jsonEnd = responseText.lastIndexOf('}') + 1
            const jsonData = responseText.substring(jsonStart, jsonEnd)
            const parsedData = JSON.parse(jsonData)

            let rows = []
            if (parsedData.table && parsedData.table.rows) {
                rows = parsedData.table.rows
            } else if (Array.isArray(parsedData)) {
                rows = parsedData
            } else if (parsedData.values) {
                rows = parsedData.values.map((row) => ({
                    c: row.map((val) => ({ v: val })),
                }))
            }

            const extractedData = rows
                .map((row, index) => {
                    let rowValues = []
                    if (row.c) {
                        rowValues = row.c.map((cell) =>
                            cell && cell.v !== undefined ? cell.v : ""
                        )
                    } else if (Array.isArray(row)) {
                        rowValues = row
                    }

                    // Whatsapp sheet columns:
                    // A(0)=Department, B(1)=Given By, C(2)=Designation,
                    // D(3)=Doer's Name, E(4)=Password, F(5)=Role,
                    // G(6)=ID/Email, H(7)=Number
                    const department = rowValues[0] || ""
                    const givenBy = rowValues[1] || ""
                    const doerName = rowValues[3] || ""
                    const password = rowValues[4] || ""
                    const role = rowValues[5] || ""
                    const idEmail = rowValues[6] || ""
                    const number = rowValues[7] || ""

                    if (doerName || password || department || givenBy) {
                        return {
                            id: index,
                            _rowIndex: index + 2, // gviz rows[0] = Sheet Row 2 (row after header)
                            department: department.toString().trim(),
                            givenBy: givenBy.toString().trim(),
                            doerName: doerName.toString().trim(),
                            password: password.toString().trim(),
                            role: role.toString().trim(),
                            idEmail: idEmail.toString().trim(),
                            number: number.toString().trim(),
                            _originalRow: rowValues
                        }
                    }
                    return null
                })
                .filter(Boolean)


            setData(extractedData)
        } catch (err) {
            console.error("Error fetching Whatsapp data:", err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const fetchLeaveData = async () => {
        try {
            setLeaveLoading(true)
            setLeaveError(null)

            const sheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.LEAVE_SHEET_NAME)}`
            const response = await fetch(sheetUrl)

            if (!response.ok) {
                throw new Error(`Failed to fetch data: ${response.status}`)
            }

            const responseText = await response.text()

            // Extract the JSON part from the gviz wrapper
            const jsonStart = responseText.indexOf('{')
            const jsonEnd = responseText.lastIndexOf('}') + 1
            const jsonData = responseText.substring(jsonStart, jsonEnd)
            const parsedData = JSON.parse(jsonData)

            let rows = []
            // Read actual column headers from parsedData.table.cols (gviz standard)
            let colHeaders = []
            if (parsedData.table) {
                rows = parsedData.table.rows || []
                colHeaders = (parsedData.table.cols || []).map(col => col.label || col.id || '')
            } else if (Array.isArray(parsedData)) {
                rows = parsedData
            } else if (parsedData.values) {
                rows = parsedData.values.map((row) => ({
                    c: row.map((val) => ({ v: val })),
                }))
            }

            // If gviz cols had no labels, fall back to first row as header
            const allColsEmpty = colHeaders.every(h => !h)
            if (allColsEmpty && rows.length > 0) {
                const firstRow = rows[0]
                colHeaders = firstRow?.c
                    ? firstRow.c.map(cell => (cell && cell.v !== undefined ? String(cell.v) : ''))
                    : (Array.isArray(firstRow) ? firstRow.map(String) : [])
                rows = rows.slice(1) // skip header row from data
            }

            const extractedData = rows
                .map((row, index) => {
                    let rowValues = []
                    if (row.c) {
                        rowValues = row.c.map((cell) =>
                            cell && cell.v !== undefined ? cell.v : ''
                        )
                    } else if (Array.isArray(row)) {
                        rowValues = row
                    }
                    // Skip fully empty rows
                    if (rowValues.every(v => v === '' || v === null || v === undefined)) return null
                    return {
                        id: index,
                        _rowIndex: index + 2,
                        values: rowValues,
                        headers: colHeaders
                    }
                })
                .filter(Boolean)

            console.log('leave headers:', colHeaders)
            console.log('leave data:', extractedData)
            setLeaveData(extractedData)
        } catch (err) {
            console.error('Error fetching Leave data:', err)
            setLeaveError(err.message)
        } finally {
            setLeaveLoading(false)
        }
    }

    // Fetch checklist tasks for a specific user
    const fetchUserChecklistTasks = async (userName) => {
        try {
            setChecklistLoading(true)
            setChecklistTasks([])

            const sheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.CHECKLIST_SHEET_NAME)}`
            const response = await fetch(sheetUrl)

            if (!response.ok) throw new Error("Failed to fetch checklist data")

            const responseText = await response.text()

            // Extract the JSON part from the gviz wrapper
            const jsonStart = responseText.indexOf('{')
            const jsonEnd = responseText.lastIndexOf('}') + 1
            const jsonData = responseText.substring(jsonStart, jsonEnd)
            const parsedData = JSON.parse(jsonData)

            let allRows = []
            let headers = []
            if (parsedData.table) {
                allRows = parsedData.table.rows || []
                headers = (parsedData.table.cols || []).map(col => col.label || col.id || '')
            }

            console.log("Checklist Headers:", headers)

            // Find column indices by searching header labels
            const findIdx = (keywords) => headers.findIndex(h =>
                keywords.some(k => String(h || '').toLowerCase().includes(k))
            )

            const doerIndex = findIdx(['doer', 'assignee', 'user', 'name'])
            const taskIdIdx = findIdx(['task id', 'id'])
            const descIdx = findIdx(['description', 'desc', 'task name', 'task description'])
            const dateColIdx = findIdx(['start date', 'date', 'time'])

            const finalDoerIdx = doerIndex !== -1 ? doerIndex : 5
            const finalTaskIdIdx = taskIdIdx !== -1 ? taskIdIdx : 1
            const finalDescIdx = descIdx !== -1 ? descIdx : 5
            const finalDateIdx = dateColIdx !== -1 ? dateColIdx : 6

            console.log("Searching for User:", userName, "| Doer Col:", finalDoerIdx, "| ID col:", finalTaskIdIdx, "| Desc col:", finalDescIdx, "| Date col:", finalDateIdx)

            const userTasks = allRows.map((row, idx) => {
                let vals = []
                if (row.c) vals = row.c.map(c => c?.v)
                else if (Array.isArray(row)) vals = row

                const assignee = vals[finalDoerIdx]

                // Match user name (trim + lowercase)
                const aName = String(assignee || '').trim().toLowerCase()
                const uName = String(userName || '').trim().toLowerCase()
                const isAssignedToUser = aName !== '' && uName !== '' && (aName === uName || aName.includes(uName))

                if (isAssignedToUser) {
                    return {
                        id: vals[finalTaskIdIdx],
                        description: vals[finalDescIdx] || 'No Description',
                        date: formatGvizValue(vals[finalDateIdx]) || 'N/A',
                        originalRowIndex: idx + 2,
                        allValues: vals
                    }
                }
                return null
            }).filter(t => t !== null)

            console.log(`Found ${userTasks.length} tasks for ${userName}`)
            setChecklistTasks(userTasks)

        } catch (e) {
            console.error("Error fetching checklist tasks:", e)
        } finally {
            setChecklistLoading(false)
        }
    }

    const handleCheckboxClick = (row) => {
        const headers = leaveData[0]?.headers || []

        const getVal = (name) => {
            const idx = headers.findIndex(h => String(h || '').toLowerCase().includes(String(name || '').toLowerCase()))
            return idx !== -1 ? row.values[idx] : ''
        }

        // Extract User Name dynamically from the row headers
        const userName = getVal('name') || getVal('doer') || getVal('assignee') || row.values[3] || "User"

        const taskObj = {
            id: row.id,
            taskId: getVal('task id') || getVal('id') || row.values[0],
            description: getVal('description') || getVal('desc') || getVal('task') || row.values[1],
            date: getVal('date') || getVal('time') || new Date().toLocaleDateString(),
            userName: userName,
            ...row
        }

        const todayStr = new Date().toISOString().split('T')[0]
        setTransferTask(taskObj)
        setTransferForm({
            startDate: todayStr,
            endDate: todayStr,
            isChecked: false
        })
        setSelectedChecklistTaskIds([])
        setShowTransferModal(true)

        if (userName && userName !== "User") {
            fetchUserChecklistTasks(userName)
        }
    }

    const handleTransferSubmit = async () => {
        if (selectedChecklistTaskIds.length === 0) {
            alert("Please select at least one task to transfer.")
            return
        }

        try {
            setTransferring(true)

            // Format a Date as DD/MM/YYYY HH:MM:SS  (e.g. "29/12/2025 13:04:34")
            const formatDateTime = (dateStr) => {
                if (!dateStr) return 'N/A'
                const d = new Date(dateStr)
                if (isNaN(d.getTime())) return 'N/A'
                const dd = String(d.getDate()).padStart(2, '0')
                const mm = String(d.getMonth() + 1).padStart(2, '0')
                const yyyy = d.getFullYear()
                const hh = String(d.getHours()).padStart(2, '0')
                const min = String(d.getMinutes()).padStart(2, '0')
                const ss = String(d.getSeconds()).padStart(2, '0')
                return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
            }

            const startDateStr = formatDateTime(transferForm.startDate)
            const endDateStr = formatDateTime(transferForm.endDate)
            const remarkText = `Leave from ${startDateStr} to ${endDateStr}`

            const promises = selectedChecklistTaskIds.map(async (taskId) => {
                const task = checklistTasks.find(t => t.id === taskId)
                if (!task) return null

                let fullRowData = [...task.allValues]
                while (fullRowData.length < 14) fullRowData.push("")

                // Do NOT submit Task ID — clear the Task ID column (index 1) before posting
                fullRowData[1] = ""

                // Column K (index 10): submission timestamp in DD/MM/YYYY HH:MM:SS format
                fullRowData[10] = formatDateTime(new Date().toISOString())

                // Column L (index 11): do NOT submit any delay value
                fullRowData[11] = ""

                fullRowData[13] = remarkText

                return fetch(CONFIG.APPS_SCRIPT_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        sheetName: CONFIG.CHECKLIST_SHEET_NAME,
                        action: 'update',
                        rowIndex: String(task.originalRowIndex),
                        rowData: JSON.stringify(fullRowData)
                    })
                })
            })

            await Promise.all(promises)

            setSuccessMessage(`${selectedChecklistTaskIds.length} tasks transferred successfully!`)
            setTimeout(() => setSuccessMessage(''), 3000)
            setShowTransferModal(false)

        } catch (e) {
            console.error(e)
            alert("Error transferring tasks: " + e.message)
        } finally {
            setTransferring(false)
        }
    }

    // Submit only the Remarks column for a Leave row back to the Unique sheet
    const submitLeaveRemark = async (row) => {
        const headers = leaveData[0]?.headers || []
        const remarksColIndex = headers.findIndex(h => String(h || '').toLowerCase().includes('remark'))
        if (remarksColIndex === -1) {
            alert('Remarks column not found in the Unique sheet headers.')
            return
        }

        const remarkValue = leaveRemarks[row._rowIndex] ?? row.values[remarksColIndex] ?? ''

        try {
            setSavingRemarksId(row._rowIndex)

            // Build a full row copy and replace only the Remarks cell
            const fullRowData = [...row.values]
            while (fullRowData.length <= remarksColIndex) fullRowData.push('')
            fullRowData[remarksColIndex] = remarkValue

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    sheetName: CONFIG.LEAVE_SHEET_NAME,
                    action: 'update',
                    rowIndex: String(row._rowIndex),
                    rowData: JSON.stringify(fullRowData)
                })
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()

            if (result.success) {
                // Update local leaveData so it reflects the saved value
                setLeaveData(prev => prev.map(r =>
                    r._rowIndex === row._rowIndex
                        ? { ...r, values: fullRowData }
                        : r
                ))
                setSuccessMessage('Remarks saved successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to save remarks')
            }
        } catch (err) {
            console.error('Error saving remarks:', err)
            alert(`Error: ${err.message}`)
        } finally {
            setSavingRemarksId(null)
        }
    }

    const handleEditClick = (row) => {
        setEditingId(row.id)
        setEditedValues({
            doerName: row.doerName,
            password: row.password,
            role: row.role,
            idEmail: row.idEmail,
            number: row.number
        })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditedValues({ doerName: '', password: '', role: '', idEmail: '', number: '' })
    }

    const handleSaveEdit = async (row) => {
        if (saving) return
        try {
            setSaving(true)
            setSuccessMessage('')
            const originalRow = row._originalRow || []
            const rowData = [...originalRow]

            rowData[3] = editedValues.doerName
            rowData[4] = editedValues.password
            rowData[5] = editedValues.role
            rowData[6] = editedValues.idEmail
            rowData[7] = editedValues.number

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    sheetName: CONFIG.SHEET_NAME,
                    action: 'update',
                    rowIndex: String(row._rowIndex),
                    rowData: JSON.stringify(rowData)
                })
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()

            if (result.success) {
                setData(prev => prev.map(item =>
                    item.id === row.id
                        ? {
                            ...item,
                            doerName: editedValues.doerName,
                            password: editedValues.password,
                            role: editedValues.role,
                            idEmail: editedValues.idEmail,
                            number: editedValues.number,
                            _originalRow: rowData
                        }
                        : item
                ))
                setEditingId(null)
                setSuccessMessage('Updated successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to update')
            }
        } catch (err) {
            console.error("Error updating data:", err)
            alert(`Error: ${err.message}`)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteRow = async (row) => {
        if (!confirm(`Are you sure you want to delete this entry?\n\nDoer's Name: ${row.doerName}\nPassword: ${row.password}`)) {
            return
        }
        try {
            setDeleting(row.id)
            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'deleteRow',
                    sheet: CONFIG.SHEET_NAME,
                    rowIndex: String(row._rowIndex)
                })
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()

            if (result.success) {
                await fetchWhatsappData()
                setSuccessMessage('Deleted successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to delete')
            }
        } catch (err) {
            console.error("Error deleting row:", err)
            alert(`Error: ${err.message}`)
        } finally {
            setDeleting(null)
        }
    }

    const handleAddNewEntry = async () => {
        if (adding) return
        if (!newEntry.doerName.trim()) {
            alert('Doer\'s Name is required')
            return
        }

        try {
            setAdding(true)
            const usersWithData = data.filter(row => row.doerName && row.doerName.trim() !== '')
            const lastUserRowIndex = usersWithData.length > 0
                ? Math.max(...usersWithData.map(row => row._rowIndex))
                : 1
            const nextRowIndex = lastUserRowIndex + 1

            const rowData = ['', '', '', newEntry.doerName, newEntry.password, newEntry.role, newEntry.idEmail, newEntry.number]

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    sheetName: CONFIG.SHEET_NAME,
                    action: 'update',
                    rowIndex: String(nextRowIndex),
                    rowData: JSON.stringify(rowData)
                })
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()

            if (result.success) {
                setNewEntry({ doerName: '', password: '', role: '', idEmail: '', number: '' })
                setShowAddModal(false)
                setSuccessMessage('New user added successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
                await fetchWhatsappData()
            } else {
                throw new Error(result.error || 'Failed to add user')
            }
        } catch (err) {
            console.error("Error adding user:", err)
            alert(`Error: ${err.message}`)
        } finally {
            setAdding(false)
        }
    }

    const handleAddDepartment = async () => {
        if (addingDept) return
        if (!newDeptEntry.department.trim()) {
            alert('Department is required')
            return
        }

        try {
            setAddingDept(true)
            const deptsWithData = data.filter(row => row.department && row.department.trim() !== '')
            const lastDeptRowIndex = deptsWithData.length > 0
                ? Math.max(...deptsWithData.map(row => row._rowIndex))
                : 1
            const nextRowIndex = lastDeptRowIndex + 1

            const rowData = [newDeptEntry.department, newDeptEntry.givenBy, '', '', '', '', '', '']

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    sheetName: CONFIG.SHEET_NAME,
                    action: 'update',
                    rowIndex: String(nextRowIndex),
                    rowData: JSON.stringify(rowData)
                })
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()

            if (result.success) {
                setNewDeptEntry({ department: '', givenBy: '' })
                setShowDeptModal(false)
                setSuccessMessage('New department added successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
                await fetchWhatsappData()
            } else {
                throw new Error(result.error || 'Failed to add department')
            }
        } catch (err) {
            console.error("Error adding department:", err)
            alert(`Error: ${err.message}`)
        } finally {
            setAddingDept(false)
        }
    }

    const handleDeptEditClick = (row) => {
        setEditingDeptId(row.id)
        setEditedDeptValues({
            department: row.department,
            givenBy: row.givenBy
        })
    }

    const handleCancelDeptEdit = () => {
        setEditingDeptId(null)
        setEditedDeptValues({ department: '', givenBy: '' })
    }

    const handleSaveDeptEdit = async (row) => {
        if (savingDept) return
        try {
            setSavingDept(true)
            const originalRow = row._originalRow || []
            const rowData = [...originalRow]
            rowData[0] = editedDeptValues.department
            rowData[1] = editedDeptValues.givenBy

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    sheetName: CONFIG.SHEET_NAME,
                    action: 'update',
                    rowIndex: String(row._rowIndex),
                    rowData: JSON.stringify(rowData)
                })
            })

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
            const result = await response.json()

            if (result.success) {
                // If department name changed, optionally update all users in that department
                // For simplicity, we just refresh local data
                setData(prev => prev.map(item =>
                    item.id === row.id
                        ? {
                            ...item,
                            department: editedDeptValues.department,
                            givenBy: editedDeptValues.givenBy,
                            _originalRow: rowData
                        }
                        : item
                ))
                setEditingDeptId(null)
                setSuccessMessage('Department updated successfully!')
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to update department')
            }
        } catch (err) {
            console.error("Error updating department:", err)
            alert(`Error: ${err.message}`)
        } finally {
            setSavingDept(false)
        }
    }

    // Filter handlers
    const clearUsernameFilter = () => {
        setUsernameFilter('')
        setUsernameDropdownOpen(false)
    }

    const handleUsernameFilterSelect = (name) => {
        setUsernameFilter(name)
        setUsernameDropdownOpen(false)
    }

    const toggleUsernameDropdown = () => {
        setUsernameDropdownOpen(!usernameDropdownOpen)
    }

    const getRoleColor = (role) => {
        const r = role ? role.toLowerCase() : ""
        if (r.includes('admin')) return 'bg-blue-100 text-blue-800'
        if (r.includes('super')) return 'bg-purple-100 text-purple-800'
        return 'bg-gray-100 text-gray-800'
    }

    // Converts raw gviz Date values like Date(2026,2,9,16,43,49) → "09/03/2026 16:43:49"
    const formatGvizValue = (val) => {
        if (!val && val !== 0) return val
        const str = String(val)
        const match = str.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/)
        if (match) {
            const year  = match[1]
            const month = String(Number(match[2]) + 1).padStart(2, '0') // 0-indexed
            const day   = String(Number(match[3])).padStart(2, '0')
            const hh    = match[4] !== undefined ? String(Number(match[4])).padStart(2, '0') : '00'
            const mm    = match[5] !== undefined ? String(Number(match[5])).padStart(2, '0') : '00'
            const ss    = match[6] !== undefined ? String(Number(match[6])).padStart(2, '0') : '00'
            return `${day}/${month}/${year} ${hh}:${mm}:${ss}`
        }
        return str
    }

    if (!authorized) return null

    return (
        <AdminLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                {/* Header and Tabs */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
                    <div className="w-full lg:w-auto">
                        <h1 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                            User Management System
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm md:text-base">Manage your organization's users and departments</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                        <div className="flex border border-purple-200 rounded-lg overflow-x-auto no-scrollbar shadow-sm bg-white min-w-0">
                            <button
                                className={`flex px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'users' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                onClick={() => setActiveTab('users')}
                            >
                                <User size={18} className="mr-2" />
                                Users
                            </button>
                            <button
                                className={`flex px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'departments' ? 'bg-purple-600 text-white' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                onClick={() => setActiveTab('departments')}
                            >
                                <Building size={18} className="mr-2" />
                                Departments
                            </button>
                            <button
                                className={`flex items-center px-4 py-2.5 text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'leave' ? 'bg-purple-600 text-white shadow-inner' : 'bg-white text-purple-600 hover:bg-purple-50'}`}
                                onClick={() => setActiveTab('leave')}
                            >
                                <LogOut size={16} className="mr-2" />
                                Leave
                            </button>
                        </div>

                        <button
                            onClick={() => activeTab === 'users' ? setShowAddModal(true) : setShowDeptModal(true)}
                            className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 px-6 text-white hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md transition-all active:scale-95 flex items-center justify-center font-bold"
                        >
                            <Plus size={18} className="mr-2" />
                            <span>{activeTab === 'users' ? 'Add User' : 'Add Department'}</span>
                        </button>
                    </div>
                </div>

                {/* Success/Error messages */}
                {successMessage && (
                    <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-lg shadow-sm animate-in slide-in-from-top duration-300">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <RefreshCw className="h-5 w-5 text-green-400" />
                            </div>
                            <p className="ml-3 text-sm font-medium">{successMessage}</p>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-lg shadow-sm">
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-100 transition-all hover:shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 px-4 md:px-6 py-5 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
                            <div className="flex items-center justify-between lg:justify-start gap-3">
                                <div className="flex items-center gap-2">
                                    <Users className="text-purple-600" size={20} />
                                    <h2 className="text-base md:text-lg font-bold text-purple-800">User Directory</h2>
                                </div>
                                <button
                                    onClick={fetchWhatsappData}
                                    className="lg:hidden p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-colors bg-white shadow-sm border border-purple-100"
                                    title="Refresh Data"
                                >
                                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>

                            {/* Username Filter */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="relative group flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 group-focus-within:text-purple-600 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Filter by name..."
                                        value={usernameFilter}
                                        onChange={(e) => setUsernameFilter(e.target.value)}
                                        className="w-full sm:w-48 pl-10 pr-8 py-2 border border-purple-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white/80 backdrop-blur-sm transition-all"
                                    />
                                    {usernameFilter && (
                                        <button
                                            onClick={clearUsernameFilter}
                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-600 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1 sm:flex-none">
                                        <button
                                            onClick={toggleUsernameDropdown}
                                            className="w-full flex items-center justify-between gap-2 px-4 py-2 border border-purple-200 rounded-full bg-white text-xs font-semibold text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
                                        >
                                            <span className="truncate max-w-[100px]">{usernameFilter || 'Names'}</span>
                                            <ChevronDown size={14} className={`flex-shrink-0 transition-transform duration-300 ${usernameDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {usernameDropdownOpen && (
                                            <div className="absolute z-50 mt-2 w-56 rounded-xl bg-white shadow-2xl border border-purple-100 max-h-64 overflow-auto top-full right-0 animate-in zoom-in-95 duration-200">
                                                <div className="p-2 space-y-1">
                                                    <button
                                                        onClick={clearUsernameFilter}
                                                        className={`block w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${!usernameFilter ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-purple-50'}`}
                                                    >
                                                        All Users
                                                    </button>
                                                    {data.filter(u => u.doerName).map(user => (
                                                        <button
                                                            key={`filter-${user.id}`}
                                                            onClick={() => handleUsernameFilterSelect(user.doerName)}
                                                            className={`block w-full text-left px-4 py-2 text-sm rounded-lg transition-colors ${usernameFilter === user.doerName ? 'bg-purple-100 text-purple-900 border-l-4 border-purple-600' : 'text-gray-700 hover:bg-purple-50'}`}
                                                        >
                                                            {user.doerName}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={fetchWhatsappData}
                                        className="hidden lg:block p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-colors"
                                        title="Refresh Data"
                                    >
                                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="flex flex-col justify-center items-center py-24 gap-3">
                                    <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                                    <p className="text-purple-600 font-medium animate-pulse">Fetching users...</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-purple-100">
                                    <thead className="bg-purple-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Department</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Given By</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Doer's Name</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Password</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Role</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">ID/Email</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Number</th>
                                            <th className="px-6 py-4 text-center text-xs font-bold text-purple-700 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-purple-50">
                                        {data
                                            .filter(user =>
                                                (!usernameFilter || user.doerName.toLowerCase().includes(usernameFilter.toLowerCase()))
                                            )
                                            .map((row) => (
                                                <tr key={row.id} className={`hover:bg-purple-50/30 transition-colors ${editingId === row.id ? 'bg-indigo-50/50' : ''}`}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{row.department || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.givenBy || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {editingId === row.id ? (
                                                            <input
                                                                type="text"
                                                                value={editedValues.doerName}
                                                                onChange={(e) => setEditedValues(prev => ({ ...prev, doerName: e.target.value }))}
                                                                className="w-full px-3 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm shadow-inner"
                                                            />
                                                        ) : (
                                                            <div className="text-sm font-bold text-gray-900">{row.doerName}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {editingId === row.id ? (
                                                            <input
                                                                type="text"
                                                                value={editedValues.password}
                                                                onChange={(e) => setEditedValues(prev => ({ ...prev, password: e.target.value }))}
                                                                className="w-full px-3 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-mono shadow-inner"
                                                            />
                                                        ) : (
                                                            <div className="text-sm text-gray-900 font-mono tracking-wider">{row.password}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {editingId === row.id ? (
                                                            <select
                                                                value={editedValues.role}
                                                                onChange={(e) => setEditedValues(prev => ({ ...prev, role: e.target.value }))}
                                                                className="w-full px-3 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                                                            >
                                                                <option value="user">user</option>
                                                                <option value="admin">admin</option>
                                                                <option value="super_admin">super_admin</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full shadow-sm capitalize ${getRoleColor(row.role)}`}>
                                                                {row.role}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {editingId === row.id ? (
                                                            <input
                                                                type="text"
                                                                value={editedValues.idEmail}
                                                                onChange={(e) => setEditedValues(prev => ({ ...prev, idEmail: e.target.value }))}
                                                                className="w-full px-3 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm shadow-inner"
                                                            />
                                                        ) : (
                                                            <div className="text-sm text-gray-600">{row.idEmail || '-'}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {editingId === row.id ? (
                                                            <input
                                                                type="text"
                                                                value={editedValues.number}
                                                                onChange={(e) => setEditedValues(prev => ({ ...prev, number: e.target.value }))}
                                                                className="w-full px-3 py-1.5 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm shadow-inner"
                                                            />
                                                        ) : (
                                                            <div className="text-sm text-gray-600">{row.number || '-'}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {editingId === row.id ? (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleSaveEdit(row)}
                                                                    disabled={saving}
                                                                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md active:scale-90"
                                                                    title="Save Changes"
                                                                >
                                                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                                </button>
                                                                <button
                                                                    onClick={handleCancelEdit}
                                                                    className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all shadow-md active:scale-90"
                                                                    title="Cancel"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => handleEditClick(row)}
                                                                    className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all active:scale-90"
                                                                    title="Edit User"
                                                                >
                                                                    <Edit size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRow(row)}
                                                                    disabled={deleting === row.id}
                                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                                                                    title="Delete User"
                                                                >
                                                                    {deleting === row.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {/* Departments Tab */}
                {activeTab === 'departments' && (
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-100 transition-all hover:shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 px-4 md:px-6 py-5">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <Building2 className="text-purple-600" size={20} />
                                    <h2 className="text-base md:text-lg font-bold text-purple-800">Department Management</h2>
                                </div>

                                <div className="flex border border-purple-200 rounded-full overflow-hidden p-1 bg-white shadow-sm self-stretch sm:self-auto">
                                    <button
                                        className={`flex-1 sm:flex-none px-6 py-2 text-xs font-bold rounded-full transition-all duration-300 ${activeDeptSubTab === 'departments' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-100'}`}
                                        onClick={() => setActiveDeptSubTab('departments')}
                                    >
                                        Names
                                    </button>
                                    <button
                                        className={`flex-1 sm:flex-none px-6 py-2 text-xs font-bold rounded-full transition-all duration-300 ${activeDeptSubTab === 'givenBy' ? 'bg-purple-600 text-white shadow-md' : 'text-purple-600 hover:bg-purple-100'}`}
                                        onClick={() => setActiveDeptSubTab('givenBy')}
                                    >
                                        Assignees
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            {loading ? (
                                <div className="flex flex-col justify-center items-center py-24 gap-3">
                                    <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                                    <p className="text-purple-600 font-medium">Fetching departments...</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-purple-100">
                                    <thead className="bg-purple-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest w-20">#</th>
                                            {activeDeptSubTab === 'departments' ? (
                                                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Department Name</th>
                                            ) : (
                                                <th className="px-6 py-4 text-left text-xs font-bold text-purple-700 uppercase tracking-widest">Given By</th>
                                            )}
                                            <th className="px-6 py-4 text-center text-xs font-bold text-purple-700 uppercase tracking-widest w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-purple-50">
                                        {data.filter(row => row.department || row.givenBy).map((row, index) => (
                                            <tr key={`dept-${row.id}`} className={`hover:bg-purple-50/30 transition-colors ${editingDeptId === row.id ? 'bg-indigo-50/50' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{index + 1}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {editingDeptId === row.id ? (
                                                        <div className="flex gap-4">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-purple-400 uppercase">Department</label>
                                                                <input
                                                                    type="text"
                                                                    value={editedDeptValues.department}
                                                                    onChange={(e) => setEditedDeptValues(prev => ({ ...prev, department: e.target.value }))}
                                                                    className="w-full px-3 py-2 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm shadow-inner mt-1"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-purple-400 uppercase">Given By</label>
                                                                <input
                                                                    type="text"
                                                                    value={editedDeptValues.givenBy}
                                                                    onChange={(e) => setEditedDeptValues(prev => ({ ...prev, givenBy: e.target.value }))}
                                                                    className="w-full px-3 py-2 border border-purple-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm shadow-inner mt-1"
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm font-bold text-gray-900">
                                                            {activeDeptSubTab === 'departments' ? (row.department || '-') : (row.givenBy || '-')}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {editingDeptId === row.id ? (
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => handleSaveDeptEdit(row)}
                                                                disabled={savingDept}
                                                                className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all shadow-md active:scale-90"
                                                                title="Save Changes"
                                                            >
                                                                {savingDept ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                            </button>
                                                            <button
                                                                onClick={handleCancelDeptEdit}
                                                                className="p-2 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all shadow-md active:scale-90"
                                                                title="Cancel"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleDeptEditClick(row)}
                                                            className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-lg transition-all active:scale-90"
                                                            title="Edit Department"
                                                        >
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                )}

                {/* Leave Tab */}
                {activeTab === 'leave' && (
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-100 transition-all hover:shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-100 px-4 md:px-6 py-5 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <LogOut className="text-purple-600" size={20} />
                                <h2 className="text-base md:text-lg font-bold text-purple-800">Leave Management</h2>
                            </div>
                            <button
                                onClick={fetchLeaveData}
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded-full transition-colors bg-white shadow-sm border border-purple-100"
                                title="Refresh Data"
                            >
                                <RefreshCw size={18} className={leaveLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '60vh' }}>
                            {leaveLoading ? (
                                <div className="flex flex-col justify-center items-center py-24 gap-3">
                                    <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
                                    <p className="text-purple-600 font-medium animate-pulse">Fetching leave data...</p>
                                </div>
                            ) : leaveError ? (
                                <div className="p-8 text-center text-red-500">
                                    <p>Error loading data: {leaveError}</p>
                                    <button onClick={fetchLeaveData} className="mt-4 px-4 py-2 bg-red-100 rounded-lg hover:bg-red-200 text-red-700 font-semibold">Retry</button>
                                </div>
                            ) : leaveData.length === 0 ? (
                                <div className="p-12 text-center text-gray-500">
                                    <p>No records found in Unique sheet.</p>
                                </div>
                            ) : (() => {
                                // ── Identify strictly needed columns from headers ──
                                const headers = leaveData[0]?.headers || []
                                
                                const findHeaderIdx = (keywords) => headers.findIndex(h => {
                                    const l = String(h || '').toLowerCase()
                                    return keywords.some(k => l.includes(k))
                                })

                                const deptIdx = findHeaderIdx(['dept', 'department'])
                                const givenIdx = findHeaderIdx(['given', 'assignee', 'admin'])
                                const nameIdx = findHeaderIdx(['name', 'doer', 'user'])

                                // Map columns with fallbacks (adjusting based on typical sheet layout seen in screenshot)
                                const visibleCols = [
                                    { label: 'DEPARTMENT', index: deptIdx !== -1 ? deptIdx : 2 },
                                    { label: 'GIVEN BY', index: givenIdx !== -1 ? givenIdx : 1 },
                                    { label: 'NAME', index: nameIdx !== -1 ? nameIdx : 3 }
                                ]

                                // Keep one row per unique name (first occurrence wins)
                                const seen = new Set()
                                const uniqueRows = leaveData.filter(row => {
                                    const actualNameIdx = nameIdx !== -1 ? nameIdx : 3 // fallback to 3 for deduplication
                                    const name = String(row.values[actualNameIdx] || '').trim().toLowerCase()
                                    if (!name || seen.has(name)) return false
                                    seen.add(name)
                                    return true
                                })

                                return (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-3 py-3 w-10 text-center">
                                                    <span className="sr-only">Action</span>
                                                </th>
                                                {visibleCols.map(col => (
                                                    <th
                                                        key={col.label}
                                                        className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                                                    >
                                                        {col.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {uniqueRows.map((row, rowIndex) => (
                                                <tr
                                                    key={row.id || rowIndex}
                                                    className="hover:bg-purple-50/30 transition-colors group"
                                                >
                                                    {/* Checkbox — opens transfer/leave modal */}
                                                    <td className="px-3 py-3 text-center whitespace-nowrap">
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleCheckboxClick(row)
                                                            }}
                                                        />
                                                    </td>
                                                    {visibleCols.map(col => (
                                                        <td
                                                            key={col.label}
                                                            className="px-4 py-3 text-xs text-gray-800 whitespace-nowrap"
                                                        >
                                                            {formatGvizValue(row.values[col.index]) || '—'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals with Updated Styling */}
            {/* User Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowAddModal(false)}></div>
                        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">Create New User</h2>
                                    <p className="text-purple-100 text-xs mt-1">Add a new doer to the system</p>
                                </div>
                                <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                                    <X className="text-white" size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-600 uppercase ml-1">Doer's Name *</label>
                                        <input
                                            type="text"
                                            value={newEntry.doerName}
                                            onChange={(e) => setNewEntry(prev => ({ ...prev, doerName: e.target.value }))}
                                            placeholder="Enter name"
                                            className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-purple-50/30 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-600 uppercase ml-1">Password</label>
                                        <input
                                            type="text"
                                            value={newEntry.password}
                                            onChange={(e) => setNewEntry(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Enter password"
                                            className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-mono bg-purple-50/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-600 uppercase ml-1">Role</label>
                                        <select
                                            value={newEntry.role}
                                            onChange={(e) => setNewEntry(prev => ({ ...prev, role: e.target.value }))}
                                            className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-purple-50/30 appearance-none transition-all"
                                        >
                                            <option value="">Select Role</option>
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-purple-600 uppercase ml-1">ID / Email</label>
                                        <input
                                            type="text"
                                            value={newEntry.idEmail}
                                            onChange={(e) => setNewEntry(prev => ({ ...prev, idEmail: e.target.value }))}
                                            placeholder="ID or Email"
                                            className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-purple-50/30 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-purple-600 uppercase ml-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={newEntry.number}
                                        onChange={(e) => setNewEntry(prev => ({ ...prev, number: e.target.value }))}
                                        placeholder="Enter number"
                                        className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-purple-50/30 transition-all"
                                    />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-3 px-6 rounded-2xl border border-purple-100 font-bold text-purple-600 hover:bg-purple-50 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddNewEntry}
                                        disabled={adding}
                                        className="flex-[2] py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-purple-200 transition-all active:scale-95 flex justify-center items-center"
                                    >
                                        {adding ? <Loader2 size={18} className="animate-spin" /> : 'Create User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Department Modal */}
            {
                showDeptModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-purple-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowDeptModal(false)}></div>
                        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-white">New Department</h2>
                                    <p className="text-purple-100 text-xs mt-1">Add a functional group</p>
                                </div>
                                <button onClick={() => setShowDeptModal(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                                    <X className="text-white" size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-purple-600 uppercase ml-1">Department Name *</label>
                                    <input
                                        type="text"
                                        value={newDeptEntry.department}
                                        onChange={(e) => setNewDeptEntry(prev => ({ ...prev, department: e.target.value }))}
                                        placeholder="e.g. Sales, HR"
                                        className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-purple-50/30 transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-purple-600 uppercase ml-1">Given By (Assignee)</label>
                                    <input
                                        type="text"
                                        value={newDeptEntry.givenBy}
                                        onChange={(e) => setNewDeptEntry(prev => ({ ...prev, givenBy: e.target.value }))}
                                        placeholder="Enter name"
                                        className="w-full px-4 py-3 border border-purple-100 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm bg-purple-50/30 transition-all"
                                    />
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        onClick={() => setShowDeptModal(false)}
                                        className="flex-1 py-3 px-6 rounded-2xl border border-purple-100 font-bold text-purple-600 hover:bg-purple-50 transition-all active:scale-95"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddDepartment}
                                        disabled={addingDept}
                                        className="flex-[2] py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold shadow-lg hover:shadow-purple-200 transition-all active:scale-95 flex justify-center items-center"
                                    >
                                        {addingDept ? <Loader2 size={18} className="animate-spin" /> : 'Create Department'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Transfer/Leave Modal */}
            {/* Transfer/Leave Modal */}
            {showTransferModal && transferTask && (() => {
                // Robust date parser — handles ISO strings, DD/MM/YYYY, and
                // Google Sheets' Date(year,month,day) serial format
                const parseDate = (dateStr) => {
                    if (!dateStr) return null
                    const s = String(dateStr).trim()
                    // Google Sheets format: Date(2025,0,15) — month is 0-based
                    const gsMatch = s.match(/^Date\((\d+),(\d+),(\d+)\)$/)
                    if (gsMatch) {
                        return new Date(Number(gsMatch[1]), Number(gsMatch[2]), Number(gsMatch[3]))
                    }
                    // DD/MM/YYYY
                    const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
                    if (dmyMatch) {
                        return new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`)
                    }
                    // ISO / standard
                    const d = new Date(s)
                    return isNaN(d.getTime()) ? null : d
                }

                // Format a date value → "DD/MM/YYYY HH:MM:SS"
                const formatDisplayDate = (dateStr) => {
                    if (!dateStr || dateStr === 'N/A') return dateStr || 'N/A'
                    const d = parseDate(dateStr)
                    if (!d || isNaN(d.getTime())) return String(dateStr)
                    const dd = String(d.getDate()).padStart(2, '0')
                    const mm = String(d.getMonth() + 1).padStart(2, '0')
                    const yyyy = d.getFullYear()
                    const hh = String(d.getHours()).padStart(2, '0')
                    const min = String(d.getMinutes()).padStart(2, '0')
                    const ss = String(d.getSeconds()).padStart(2, '0')
                    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
                }

                const filterStart = parseDate(transferForm.startDate)
                const filterEnd = parseDate(transferForm.endDate)

                // Normalise filterEnd to end-of-day so tasks on that day are included
                if (filterEnd) filterEnd.setHours(23, 59, 59, 999)

                const filteredTasks = checklistTasks.filter(task => {
                    // No date selected → show ALL tasks for this user
                    if (!filterStart && !filterEnd) return true

                    const taskDate = parseDate(task.date)
                    // If date filter active but task date unparseable → hide
                    if (!taskDate) return false

                    // Both dates selected → show tasks within range
                    if (filterStart && filterEnd) return taskDate >= filterStart && taskDate <= filterEnd
                    // Only start date → show tasks from that date onwards
                    if (filterStart) return taskDate >= filterStart
                    // Only end date → show tasks up to that date
                    if (filterEnd) return taskDate <= filterEnd
                    return true
                })

                return (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowTransferModal(false)}></div>
                        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col" style={{ maxHeight: '90vh' }}>
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white flex-shrink-0">
                                <h2 className="text-lg font-bold text-gray-800">
                                    Transfer Tasks for <span className="text-purple-600">{transferTask.userName || transferTask.values[3] || "User"}</span>
                                </h2>
                                <button
                                    onClick={() => setShowTransferModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Scrollable Body */}
                            <div className="p-6 space-y-6 overflow-y-auto flex-1">

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={transferForm.startDate}
                                            onChange={(e) => setTransferForm(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={transferForm.endDate}
                                            onChange={(e) => setTransferForm(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Task List */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-gray-700 uppercase">Tasks to Assign ({filteredTasks.length})</h3>
                                        {selectedChecklistTaskIds.length > 0 && (
                                            <span className="text-xs text-purple-600 font-medium">{selectedChecklistTaskIds.length} selected</span>
                                        )}
                                    </div>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden" style={{ maxHeight: '340px' }}>
                                        <div className="overflow-auto" style={{ maxHeight: '340px' }}>
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                                    <tr>
                                                        <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase w-10">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedChecklistTaskIds(filteredTasks.map(t => t.id))
                                                                    } else {
                                                                        setSelectedChecklistTaskIds([])
                                                                    }
                                                                }}
                                                                checked={filteredTasks.length > 0 && selectedChecklistTaskIds.length === filteredTasks.length}
                                                            />
                                                        </th>
                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Task ID</th>
                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Description</th>
                                                        <th className="px-4 py-2 text-left text-[10px] font-bold text-gray-500 uppercase">Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {checklistLoading ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-8 text-center text-gray-500">
                                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-purple-600" />
                                                                <p className="mt-2 text-xs">Loading tasks...</p>
                                                            </td>
                                                        </tr>
                                                    ) : filteredTasks.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="py-6 text-center text-xs text-gray-500">
                                                                {checklistTasks.length === 0
                                                                    ? "No checklist tasks found for this user."
                                                                    : "No tasks match the selected date range."}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        filteredTasks.map((task) => (
                                                            <tr key={task.id} className={`hover:bg-gray-50 cursor-pointer ${selectedChecklistTaskIds.includes(task.id) ? 'bg-purple-50' : ''}`}
                                                                onClick={() => {
                                                                    setSelectedChecklistTaskIds(prev =>
                                                                        prev.includes(task.id)
                                                                            ? prev.filter(id => id !== task.id)
                                                                            : [...prev, task.id]
                                                                    )
                                                                }}
                                                            >
                                                                <td className="px-4 py-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedChecklistTaskIds.includes(task.id)}
                                                                        onChange={() => { }}
                                                                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-3 text-xs font-medium text-gray-900">{task.id}</td>
                                                                <td className="px-4 py-3 text-xs text-gray-600 max-w-xs truncate">{task.description}</td>
                                                                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDisplayDate(task.date)}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                                <span className="text-xs text-gray-500">
                                    {selectedChecklistTaskIds.length === 0
                                        ? 'No tasks selected'
                                        : `${selectedChecklistTaskIds.length} task(s) selected`}
                                </span>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowTransferModal(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleTransferSubmit}
                                        disabled={transferring || selectedChecklistTaskIds.length === 0}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center gap-2 ${selectedChecklistTaskIds.length === 0
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90'
                                            }`}
                                    >
                                        {transferring ? <Loader2 size={16} className="animate-spin" /> : <span>⇆</span>}
                                        Leave
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })()}
        </AdminLayout >
    )
}

export default Settings
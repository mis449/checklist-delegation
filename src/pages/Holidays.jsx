"use client"
import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Briefcase, Plus, X, Loader2, RefreshCw, Edit, Save } from 'lucide-react'
import AdminLayout from '../components/layout/AdminLayout'
import { isSuperAdmin, isAdminUser } from '../utils/authUtils'

// Configuration
const CONFIG = {
    SHEET_ID: "1O07ebj7ht7tKqVjHjQPOJ90UETRLQwJ2SiIgE5Uqo4k",
    SHEET_NAME: "Working Day Calendar",
    HOLIDAY_SHEET_NAME: "Working Day Calendar",
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzfrYD9dNLvntXzm3TB-iSfH-0zlkOS5gWG83VLqsv9Hua-9VgjGOgE0sOE7H9xD2gj/exec"
}

function Holidays() {
    const [activeTab, setActiveTab] = useState('working-days')
    const [workingDaysData, setWorkingDaysData] = useState([])
    const [holidaysData, setHolidaysData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')

    // Form states for adding new data
    const [newWorkingDay, setNewWorkingDay] = useState({
        workingDate: '',
        day: '',
        weekNum: '',
        month: ''
    })
    const [newHoliday, setNewHoliday] = useState({
        date: '',
        day: '',
        reason: ''
    })

    const [editingId, setEditingId] = useState(null)
    const [editValues, setEditValues] = useState({})

    const canAddData = isAdminUser()

    const tabs = [
        { id: 'working-days', label: 'Working Days', icon: Briefcase },
        { id: 'holidays', label: 'Holidays', icon: Calendar },
    ]

    // Format date from Google Sheets format
    const formatDate = (dateValue) => {
        if (!dateValue) return ""
        try {
            // Already in DD/MM/YYYY format
            if (typeof dateValue === "string" && dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                return dateValue
            }

            // Google Sheets Date format: Date(2025,11,12)
            if (typeof dateValue === "string" && dateValue.startsWith("Date(")) {
                const match = dateValue.match(/Date\((\d+),(\d+),(\d+)/)
                if (match) {
                    const year = parseInt(match[1], 10)
                    const month = parseInt(match[2], 10) + 1 // 0-indexed
                    const day = parseInt(match[3], 10)
                    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`
                }
            }

            // Try parsing as date
            const d = new Date(dateValue)
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, "0")
                const mm = String(d.getMonth() + 1).padStart(2, "0")
                const yyyy = d.getFullYear()
                return `${dd}/${mm}/${yyyy}`
            }

            return dateValue
        } catch {
            return dateValue
        }
    }

    // Fetch data from Google Sheets
    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const sheetUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(CONFIG.SHEET_NAME)}`
            const response = await fetch(sheetUrl)
            const text = await response.text()

            const jsonStart = text.indexOf('{')
            const jsonEnd = text.lastIndexOf('}') + 1
            const jsonData = text.substring(jsonStart, jsonEnd)
            const data = JSON.parse(jsonData)

            const workingDays = []
            const holidays = []

            if (data?.table?.rows) {
                data.table.rows.forEach((row, index) => {
                    if (!row.c) return

                    // Working Days: Columns A-D (indices 0-3)
                    const workingDate = row.c[0]?.v || ""
                    const workingDay = row.c[1]?.v || ""
                    const weekNum = row.c[2]?.v || ""
                    const month = row.c[3]?.v || ""

                    if (workingDate || workingDay || weekNum || month) {
                        workingDays.push({
                            _id: `working_${index}`,
                            _rowIndex: index + 2,
                            _raw: row.c.map(cell => cell?.v || ""), // Store raw row
                            workingDate: formatDate(workingDate),
                            day: workingDay,
                            weekNum: weekNum,
                            month: month
                        })
                    }

                    // Holidays: Columns F-H (indices 5-7) as per screenshot
                    const holidayDate = row.c[5]?.v || ""
                    const holidayDay = row.c[6]?.v || ""
                    const holidayReason = row.c[7]?.v || ""

                    if (holidayDate || holidayDay || holidayReason) {
                        holidays.push({
                            _id: `holiday_${index}`,
                            _rowIndex: index + 2,
                            _raw: row.c.map(cell => cell?.v || ""), // Store raw row
                            date: formatDate(holidayDate),
                            day: holidayDay,
                            reason: holidayReason
                        })
                    }
                })
            }

            setWorkingDaysData(workingDays)
            setHolidaysData(holidays)

        } catch (err) {
            console.error("Error fetching data:", err)
            setError("Failed to load data. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Get day name from date
    const getDayName = (dateString) => {
        if (!dateString) return ''
        try {
            const [day, month, year] = dateString.split('/')
            const date = new Date(year, month - 1, day)
            return date.toLocaleDateString('en-US', { weekday: 'short' })
        } catch {
            return ''
        }
    }

    // Get week number from date
    const getWeekNumber = (dateString) => {
        if (!dateString) return ''
        try {
            const [day, month, year] = dateString.split('/')
            const date = new Date(year, month - 1, day)
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
            const pastDaysOfYear = (date - firstDayOfYear) / 86400000
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
        } catch {
            return ''
        }
    }

    // Get month name from date
    const getMonthNumber = (dateString) => {
        if (!dateString) return ''
        try {
            const [day, month, year] = dateString.split('/')
            return parseInt(month)
        } catch {
            return ''
        }
    }

    // Handle date input change for working days
    const handleWorkingDateChange = (e) => {
        const inputDate = e.target.value // YYYY-MM-DD format
        if (inputDate) {
            const [year, month, day] = inputDate.split('-')
            const formattedDate = `${day}/${month}/${year}`
            setNewWorkingDay({
                workingDate: formattedDate,
                day: getDayName(formattedDate),
                weekNum: getWeekNumber(formattedDate),
                month: getMonthNumber(formattedDate)
            })
        } else {
            setNewWorkingDay({ workingDate: '', day: '', weekNum: '', month: '' })
        }
    }

    // Handle date input change for holidays
    const handleHolidayDateChange = (e) => {
        const inputDate = e.target.value // YYYY-MM-DD format
        if (inputDate) {
            const [year, month, day] = inputDate.split('-')
            const formattedDate = `${day}/${month}/${year}`
            setNewHoliday(prev => ({
                ...prev,
                date: formattedDate,
                day: getDayName(formattedDate)
            }))
        } else {
            setNewHoliday(prev => ({ ...prev, date: '', day: '' }))
        }
    }

    // Submit new working day
    const handleAddWorkingDay = async () => {
        if (!newWorkingDay.workingDate) {
            alert('Please select a date')
            return
        }

        try {
            setSubmitting(true)

            // Find last row index to append
            const allIndices = [
                ...workingDaysData.map(d => d._rowIndex),
                ...holidaysData.map(d => d._rowIndex)
            ]
            const lastIndex = allIndices.length > 0 ? Math.max(...allIndices) : 1
            const nextRowIndex = lastIndex + 1

            // Format data as simple array for columns A-D (Working Days)
            const rowData = [
                newWorkingDay.workingDate,     // Column A - Working Date
                newWorkingDay.day,             // Column B - Day
                String(newWorkingDay.weekNum), // Column C - Week Num
                String(newWorkingDay.month),   // Column D - Month
                "",                            // Column E
                "",                            // Column F
                "",                            // Column G
                ""                             // Column H
            ]

            const params = new URLSearchParams()
            params.append('action', 'update')
            params.append('sheetName', CONFIG.SHEET_NAME)
            params.append('rowIndex', String(nextRowIndex))
            params.append('rowData', JSON.stringify(rowData))

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })

            const result = await response.json()

            if (result.success) {
                setSuccessMessage('Working day added successfully!')
                setNewWorkingDay({ workingDate: '', day: '', weekNum: '', month: '' })
                setShowAddModal(false)
                fetchData()
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to add working day')
            }
        } catch (err) {
            console.error('Error adding working day:', err)
            alert('Failed to add working day: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Submit new holiday
    const handleAddHoliday = async () => {
        if (!newHoliday.date || !newHoliday.reason) {
            alert('Please fill in all required fields')
            return
        }

        try {
            setSubmitting(true)

            // Find last row index to append
            const allIndices = [
                ...workingDaysData.map(d => d._rowIndex),
                ...holidaysData.map(d => d._rowIndex)
            ]
            const lastIndex = allIndices.length > 0 ? Math.max(...allIndices) : 1
            const nextRowIndex = lastIndex + 1

            // Format data for columns F-H (Holiday List)
            // We pad the first 5 columns with empty strings
            const rowData = [
                "",                 // Column A
                "",                 // Column B
                "",                 // Column C
                "",                 // Column D
                "",                 // Column E
                newHoliday.date,    // Column F - Date
                newHoliday.day,     // Column G - Day
                newHoliday.reason   // Column H - Holiday Reason
            ]

            const params = new URLSearchParams()
            params.append('action', 'update')
            params.append('sheetName', CONFIG.HOLIDAY_SHEET_NAME)
            params.append('rowIndex', String(nextRowIndex))
            params.append('rowData', JSON.stringify(rowData))

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })

            const result = await response.json()

            if (result.success) {
                setSuccessMessage('Holiday added successfully!')
                setNewHoliday({ date: '', day: '', reason: '' })
                setShowAddModal(false)
                fetchData()
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to add holiday')
            }
        } catch (err) {
            console.error('Error adding holiday:', err)
            alert('Failed to add holiday: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Handle Edit click
    const handleEditClick = (row) => {
        setEditingId(row._id)
        if (activeTab === 'working-days') {
            setEditValues({
                workingDate: row.workingDate,
                day: row.day,
                weekNum: row.weekNum,
                month: row.month,
                _rowIndex: row._rowIndex,
                _raw: row._raw // Preserve original row
            })
        } else {
            setEditValues({
                date: row.date,
                day: row.day,
                reason: row.reason,
                _rowIndex: row._rowIndex,
                _raw: row._raw // Preserve original row
            })
        }
    }

    // Handle Cancel Edit
    const handleCancelEdit = () => {
        setEditingId(null)
        setEditValues({})
    }

    // Handle Update Submission
    const handleUpdate = async () => {
        try {
            setSubmitting(true)

            // Reconstruct full row to avoid overwriting other columns
            let fullRowData = [...(editValues._raw || [])]
            // Ensure array has at least 8 elements
            while (fullRowData.length < 8) fullRowData.push("")

            if (activeTab === 'working-days') {
                fullRowData[0] = editValues.workingDate
                fullRowData[1] = editValues.day
                fullRowData[2] = String(editValues.weekNum)
                fullRowData[3] = String(editValues.month)
            } else {
                // For holidays in the unified sheet, they are in F-H (indices 5-7)
                fullRowData[5] = editValues.date
                fullRowData[6] = editValues.day
                fullRowData[7] = editValues.reason
            }

            const params = new URLSearchParams()
            params.append('action', 'update')
            params.append('sheetName', CONFIG.SHEET_NAME)
            params.append('rowIndex', String(editValues._rowIndex))
            params.append('rowData', JSON.stringify(fullRowData))

            const response = await fetch(CONFIG.APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            })

            const result = await response.json()

            if (result.success) {
                setSuccessMessage('Record updated successfully!')
                setEditingId(null)
                setEditValues({})
                fetchData()
                setTimeout(() => setSuccessMessage(''), 3000)
            } else {
                throw new Error(result.error || 'Failed to update record')
            }
        } catch (err) {
            console.error('Error updating record:', err)
            alert('Failed to update record: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    // Convert DD/MM/YYYY to YYYY-MM-DD for input
    const toInputDateFormat = (dateStr) => {
        if (!dateStr) return ''
        const [day, month, year] = dateStr.split('/')
        return `${year}-${month}-${day}`
    }

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header with Tabs and Add Button */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Tabs */}
                        <div className="flex gap-2">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                const isActive = activeTab === tab.id
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm
                                            transition-all duration-200 ease-in-out
                                            ${isActive
                                                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25'
                                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800 shadow-sm border border-gray-200'
                                            }
                                        `}
                                    >
                                        <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                                        {tab.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Refresh Button only in Header */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={fetchData}
                                disabled={loading}
                                className="p-2 rounded-lg bg-white text-gray-600 hover:bg-gray-50 shadow-sm border border-gray-200 transition-all"
                                title="Refresh data"
                            >
                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Success Message */}
                    {successMessage && (
                        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
                            <span>{successMessage}</span>
                            <button onClick={() => setSuccessMessage('')} className="text-green-500 hover:text-green-700">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Tab Content */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center">
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto mb-4" />
                                <p className="text-gray-600">Loading data...</p>
                            </div>
                        ) : error ? (
                            <div className="p-12 text-center">
                                <p className="text-red-600 mb-4">{error}</p>
                                <button
                                    onClick={fetchData}
                                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <div className="p-6">
                                {activeTab === 'working-days' && (
                                    <div>
                                        <div className="flex items-center justify-between gap-3 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                                                    <Briefcase className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-semibold text-gray-800">Working Days</h2>
                                                    <p className="text-sm text-gray-500">{workingDaysData.length} records</p>
                                                </div>
                                            </div>

                                            {canAddData && (
                                                <button
                                                    onClick={() => setShowAddModal(true)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                                        bg-gradient-to-r from-green-500 to-emerald-500 text-white 
                                                        hover:from-green-600 hover:to-emerald-600 
                                                        shadow-lg shadow-green-500/25 transition-all duration-200"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Working Day
                                                </button>
                                            )}
                                        </div>

                                        {/* Working Days Table */}
                                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-blue-50 sticky top-0 z-10">
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">S.No</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Working Dates</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Day</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Week Num</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Month</th>
                                                        {canAddData && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b bg-blue-50">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {workingDaysData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={canAddData ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                                                                No working days data available
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        workingDaysData.map((row, index) => {
                                                            const isEditing = editingId === row._id
                                                            return (
                                                                <tr
                                                                    key={row._id}
                                                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="date"
                                                                                value={toInputDateFormat(editValues.workingDate)}
                                                                                onChange={(e) => {
                                                                                    const inputDate = e.target.value
                                                                                    if (inputDate) {
                                                                                        const [y, m, d] = inputDate.split('-')
                                                                                        const fmt = `${d}/${m}/${y}`
                                                                                        setEditValues(prev => ({
                                                                                            ...prev,
                                                                                            workingDate: fmt,
                                                                                            day: getDayName(fmt),
                                                                                            weekNum: getWeekNumber(fmt),
                                                                                            month: getMonthNumber(fmt)
                                                                                        }))
                                                                                    }
                                                                                }}
                                                                                className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                                                                            />
                                                                        ) : (
                                                                            row.workingDate
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {isEditing ? editValues.day : row.day}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {isEditing ? editValues.weekNum : row.weekNum}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {isEditing ? editValues.month : row.month}
                                                                    </td>
                                                                    {canAddData && (
                                                                        <td className="px-4 py-3 text-right">
                                                                            {isEditing ? (
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <button
                                                                                        onClick={handleUpdate}
                                                                                        disabled={submitting}
                                                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                                        title="Save"
                                                                                    >
                                                                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleCancelEdit}
                                                                                        disabled={submitting}
                                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        title="Cancel"
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleEditClick(row)}
                                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                                    title="Edit"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            )
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'holidays' && (
                                    <div>
                                        <div className="flex items-center justify-between gap-3 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                                                    <Calendar className="h-5 w-5 text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-semibold text-gray-800">Holidays</h2>
                                                    <p className="text-sm text-gray-500">{holidaysData.length} records</p>
                                                </div>
                                            </div>

                                            {canAddData && (
                                                <button
                                                    onClick={() => setShowAddModal(true)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
                                                        bg-gradient-to-r from-green-500 to-emerald-500 text-white 
                                                        hover:from-green-600 hover:to-emerald-600 
                                                        shadow-lg shadow-green-500/25 transition-all duration-200"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add Holiday
                                                </button>
                                            )}
                                        </div>

                                        {/* Holidays Table */}
                                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-blue-50 sticky top-0 z-10">
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">S.No</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Date</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Day</th>
                                                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b bg-blue-50">Holiday (Reason)</th>
                                                        {canAddData && <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 border-b bg-blue-50">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {holidaysData.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={canAddData ? 5 : 4} className="px-4 py-8 text-center text-gray-500">
                                                                No holidays data available
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        holidaysData.map((row, index) => {
                                                            const isEditing = editingId === row._id
                                                            return (
                                                                <tr
                                                                    key={row._id}
                                                                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                                >
                                                                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                                                                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="date"
                                                                                value={toInputDateFormat(editValues.date)}
                                                                                onChange={(e) => {
                                                                                    const inputDate = e.target.value
                                                                                    if (inputDate) {
                                                                                        const [y, m, d] = inputDate.split('-')
                                                                                        const fmt = `${d}/${m}/${y}`
                                                                                        setEditValues(prev => ({
                                                                                            ...prev,
                                                                                            date: fmt,
                                                                                            day: getDayName(fmt)
                                                                                        }))
                                                                                    }
                                                                                }}
                                                                                className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                                                                            />
                                                                        ) : (
                                                                            row.date
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {isEditing ? editValues.day : row.day}
                                                                    </td>
                                                                    <td className="px-4 py-3 text-sm text-gray-600">
                                                                        {isEditing ? (
                                                                            <input
                                                                                type="text"
                                                                                value={editValues.reason}
                                                                                onChange={(e) => setEditValues(prev => ({ ...prev, reason: e.target.value }))}
                                                                                className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                                                                            />
                                                                        ) : (
                                                                            row.reason
                                                                        )}
                                                                    </td>
                                                                    {canAddData && (
                                                                        <td className="px-4 py-3 text-right">
                                                                            {isEditing ? (
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <button
                                                                                        onClick={handleUpdate}
                                                                                        disabled={submitting}
                                                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                                                        title="Save"
                                                                                    >
                                                                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={handleCancelEdit}
                                                                                        disabled={submitting}
                                                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        title="Cancel"
                                                                                    >
                                                                                        <X className="h-4 w-4" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => handleEditClick(row)}
                                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                                    title="Edit"
                                                                                >
                                                                                    <Edit className="h-4 w-4" />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            )
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 transform transition-all">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-gray-800">
                                Add {activeTab === 'working-days' ? 'Working Day' : 'Holiday'}
                            </h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        {activeTab === 'working-days' ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={toInputDateFormat(newWorkingDay.workingDate)}
                                        onChange={handleWorkingDateChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                                        <input
                                            type="text"
                                            value={newWorkingDay.day}
                                            readOnly
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                                        <input
                                            type="text"
                                            value={newWorkingDay.weekNum}
                                            readOnly
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                                        <input
                                            type="text"
                                            value={newWorkingDay.month}
                                            readOnly
                                            className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={handleAddWorkingDay}
                                    disabled={submitting || !newWorkingDay.workingDate}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg
                                        hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Add Working Day
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={toInputDateFormat(newHoliday.date)}
                                        onChange={handleHolidayDateChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                                    <input
                                        type="text"
                                        value={newHoliday.day}
                                        readOnly
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Holiday Reason <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newHoliday.reason}
                                        onChange={(e) => setNewHoliday(prev => ({ ...prev, reason: e.target.value }))}
                                        placeholder="e.g., Republic Day, Diwali"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleAddHoliday}
                                    disabled={submitting || !newHoliday.date || !newHoliday.reason}
                                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg
                                        hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed
                                        transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" />
                                            Add Holiday
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}

export default Holidays
import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  Calendar as CalendarIcon,
  User as UserIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Filter,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { User, AttendanceRecord, AttendanceStatus } from '../types';
import {
  getAttendanceFromFirebase,
  saveAttendanceToFirebase,
  getUsersFromFirebase,
} from '../lib/firebase';

interface AttendanceViewProps {
  currentUser: User;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ currentUser }) => {
  // If Admin, allow selecting which user's attendance to inspect/manage
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [selectedUserName, setSelectedUserName] = useState<string>(currentUser.name);
  const [users, setUsers] = useState<User[]>([]);

  // Selected calendar month (YYYY-MM)
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth()); // 0-indexed

  // Attendance Records
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Today / Selected Date Mark Form
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('Present');
  const [notes, setNotes] = useState<string>('');
  const [checkInTime, setCheckInTime] = useState<string>(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );

  // Success Toast
  const [msg, setMsg] = useState<string>('');

  // Load team users if Admin
  useEffect(() => {
    if (currentUser.role === 'ADMIN') {
      getUsersFromFirebase().then((allUsers) => {
        setUsers(allUsers);
        if (allUsers.length > 0) {
          const match = allUsers.find((u) => u.id === currentUser.id) || allUsers[0];
          setSelectedUserId(match.id);
          setSelectedUserName(match.name);
        }
      });
    } else {
      setSelectedUserId(currentUser.id);
      setSelectedUserName(currentUser.name);
    }
  }, [currentUser]);

  // Load Attendance Records for target user
  const loadAttendance = async () => {
    setLoading(true);
    try {
      const data = await getAttendanceFromFirebase(selectedUserId);
      setRecords(data);

      // Check if selectedDate already has a record
      const existing = data.find((r) => r.date === selectedDate);
      if (existing) {
        setSelectedStatus(existing.status);
        setNotes(existing.notes || '');
        if (existing.checkInTime) setCheckInTime(existing.checkInTime);
      }
    } catch (err) {
      console.error('Error fetching attendance records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUserId) {
      loadAttendance();
    }
  }, [selectedUserId, selectedDate]);

  // Handle Mark Attendance
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const targetUser = users.find((u) => u.id === selectedUserId) || currentUser;
      await saveAttendanceToFirebase(
        targetUser.id,
        targetUser.name,
        targetUser.role,
        selectedDate,
        selectedStatus,
        checkInTime,
        notes
      );

      setMsg(`Attendance for ${selectedDate} saved as ${selectedStatus}!`);
      setTimeout(() => setMsg(''), 3000);
      await loadAttendance();
    } catch (err) {
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  // Calendar Helpers
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const formattedMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Filter records for selected month
  const monthlyRecords = records.filter((r) => r.date.startsWith(formattedMonthStr));

  // Summary Metrics
  const totalDaysInMonth = daysInMonth;
  const totalPresent = monthlyRecords.filter((r) => r.status === 'Present').length;
  const totalAbsent = monthlyRecords.filter((r) => r.status === 'Absent').length;
  const totalLeave = monthlyRecords.filter((r) => r.status === 'Leave').length;
  const totalHolidays = monthlyRecords.filter((r) => r.status === 'Holiday').length;

  const totalWorkingDays = totalPresent + totalAbsent;
  const attendancePercentage =
    totalWorkingDays > 0 ? Math.round((totalPresent / totalWorkingDays) * 100) : 100;

  // Render Calendar Grid Cells
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] uppercase font-black tracking-wider border border-sky-400/30">
              Daily Attendance Register
            </span>
            <span className="text-xs text-slate-300 font-semibold">• Permanent Firestore Sync</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 flex items-center space-x-2">
            <CalendarCheck className="w-7 h-7 text-sky-400" />
            <span>Attendance & Leave Management</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Record daily work attendance, track present days, leaves, and holidays with automatic percentage calculations.
          </p>
        </div>

        {/* User Selector for Admin */}
        {currentUser.role === 'ADMIN' && users.length > 0 && (
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-xs shrink-0 w-full md:w-auto">
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              Select User Profile:
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                const u = users.find((x) => x.id === e.target.value);
                if (u) {
                  setSelectedUserId(u.id);
                  setSelectedUserName(u.name);
                }
              }}
              className="w-full md:w-56 px-2.5 py-1.5 bg-slate-900 text-white border border-slate-600 rounded-lg font-bold outline-none focus:ring-2 focus:ring-sky-400 cursor-pointer"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total Days</span>
          <div className="text-xl font-black text-slate-900 mt-1">{totalDaysInMonth}</div>
          <span className="text-[10px] text-slate-400 font-medium">{monthNames[currentMonth]}</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600">Present Days</span>
          <div className="text-xl font-black text-emerald-700 mt-1">{totalPresent}</div>
          <span className="text-[10px] text-emerald-600 font-bold">Work Done</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-red-600">Absent Days</span>
          <div className="text-xl font-black text-red-700 mt-1">{totalAbsent}</div>
          <span className="text-[10px] text-red-500 font-medium">Unexcused</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600">Leave Days</span>
          <div className="text-xl font-black text-amber-700 mt-1">{totalLeave}</div>
          <span className="text-[10px] text-amber-600 font-medium">Approved</span>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-600">Holidays</span>
          <div className="text-xl font-black text-blue-700 mt-1">{totalHolidays}</div>
          <span className="text-[10px] text-blue-500 font-medium">Off Days</span>
        </div>

        <div className="bg-gradient-to-tr from-sky-600 to-blue-700 text-white p-3.5 rounded-2xl shadow-xs">
          <span className="text-[10px] font-bold uppercase text-sky-200">Attendance %</span>
          <div className="text-2xl font-black mt-1">{attendancePercentage}%</div>
          <span className="text-[10px] text-sky-100 font-medium">{selectedUserName.split(' ')[0]}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Marker Form Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-sky-600" />
              <span>Mark Attendance Status</span>
            </h3>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              {selectedUserName}
            </span>
          </div>

          {msg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{msg}</span>
            </div>
          )}

          <form onSubmit={handleSaveAttendance} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Date *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStatus('Present')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    selectedStatus === 'Present'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Present</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('Absent')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    selectedStatus === 'Absent'
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Absent</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('Leave')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    selectedStatus === 'Leave'
                      ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStatus('Holiday')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    selectedStatus === 'Holiday'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  <span>Holiday</span>
                </button>
              </div>
            </div>

            {selectedStatus === 'Present' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Check-in Time</label>
                <input
                  type="text"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                  placeholder="e.g. 09:30 AM"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Remarks</label>
              <textarea
                rows={2}
                placeholder="e.g. Market visit in Ranchi Route #1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Attendance Record'}</span>
            </button>
          </form>
        </div>

        {/* Calendar View Grid */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h3 className="font-extrabold text-slate-900 text-sm">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Legend */}
            <div className="hidden sm:flex items-center space-x-2 text-[10px] font-bold">
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span>Present</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>Absent</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span>Leave</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span>Holiday</span>
              </span>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-[11px] text-slate-400 py-1">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((dayNum, index) => {
              if (dayNum === null) {
                return <div key={`empty-${index}`} className="h-14 bg-slate-50/50 rounded-xl"></div>;
              }

              const dateStr = `${formattedMonthStr}-${String(dayNum).padStart(2, '0')}`;
              const record = monthlyRecords.find((r) => r.date === dateStr);
              const isSelected = selectedDate === dateStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => {
                    setSelectedDate(dateStr);
                    if (record) {
                      setSelectedStatus(record.status);
                      setNotes(record.notes || '');
                    }
                  }}
                  className={`h-14 p-1 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-sky-600 ring-2 ring-sky-300 bg-sky-50/80 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${isSelected ? 'text-sky-800' : 'text-slate-700'}`}>
                      {dayNum}
                    </span>
                    {dateStr === todayStr && (
                      <span className="text-[8px] font-black uppercase text-sky-600 bg-sky-100 px-1 rounded">
                        Today
                      </span>
                    )}
                  </div>

                  {record ? (
                    <div className="mt-auto">
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md inline-block w-full text-center truncate ${
                          record.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : record.status === 'Absent'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : record.status === 'Leave'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {record.status}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <span className="text-[9px] text-slate-300 block text-center font-medium">–</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Monthly Attendance Table View */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-extrabold text-slate-800 text-xs mb-2 flex items-center justify-between">
              <span>Attendance Log ({monthNames[currentMonth]} {currentYear})</span>
              <span className="text-[10px] text-slate-400 font-normal">{monthlyRecords.length} records logged</span>
            </h4>

            {monthlyRecords.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">
                No attendance marked yet for {monthNames[currentMonth]} {currentYear}. Select a date above to mark status.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {monthlyRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-800">{rec.date}</span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          rec.status === 'Present'
                            ? 'bg-emerald-100 text-emerald-800'
                            : rec.status === 'Absent'
                            ? 'bg-red-100 text-red-800'
                            : rec.status === 'Leave'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {rec.status}
                      </span>
                      {rec.checkInTime && <span className="text-[10px] text-slate-400">({rec.checkInTime})</span>}
                    </div>

                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[200px]">
                      {rec.notes || 'No remarks'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Receipt,
  DollarSign,
  Fuel,
  Plus,
  Trash2,
  Edit,
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  UserCheck,
  AlertTriangle,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import { User, ExpenseRecord, SalaryRecord, FuelExpenseRecord, ExpenseCategory, SalaryStatus } from '../types';
import {
  getExpensesFromFirebase,
  addExpenseToFirebase,
  updateExpenseInFirebase,
  deleteExpenseFromFirebase,
  getSalariesFromFirebase,
  addSalaryToFirebase,
  updateSalaryInFirebase,
  deleteSalaryFromFirebase,
  getFuelExpensesFromFirebase,
  addFuelExpenseToFirebase,
  deleteFuelExpenseFromFirebase,
  getUsersFromFirebase,
} from '../lib/firebase';

interface PersonalManagementViewProps {
  currentUser: User;
}

export const PersonalManagementView: React.FC<PersonalManagementViewProps> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'EXPENSES' | 'SALARIES' | 'FUEL'>('EXPENSES');

  // Data states
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [fuelExpenses, setFuelExpenses] = useState<FuelExpenseRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Expense form state
  const [expenseForm, setExpenseForm] = useState<{
    id?: string;
    date: string;
    category: ExpenseCategory;
    amount: string;
    description: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    category: 'Travel',
    amount: '',
    description: '',
  });

  // Salary form state
  const [salaryForm, setSalaryForm] = useState<{
    id?: string;
    userId: string;
    userName: string;
    amount: string;
    creditDate: string;
    month: string;
    status: SalaryStatus;
    notes: string;
  }>({
    userId: '',
    userName: '',
    amount: '',
    creditDate: new Date().toISOString().split('T')[0],
    month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    status: 'Credited',
    notes: '',
  });

  // Fuel form state
  const [fuelForm, setFuelForm] = useState<{
    id?: string;
    date: string;
    amount: string;
    notes: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load all data from Firebase
  const loadData = async () => {
    setLoading(true);
    try {
      const [expData, salData, fuelData, userData] = await Promise.all([
        getExpensesFromFirebase(),
        getSalariesFromFirebase(),
        getFuelExpensesFromFirebase(),
        getUsersFromFirebase(),
      ]);
      setExpenses(expData);
      setSalaries(salData);
      setFuelExpenses(fuelData);
      setUsers(userData);

      if (userData.length > 0 && !salaryForm.userId) {
        setSalaryForm((prev) => ({
          ...prev,
          userId: userData[0].id,
          userName: userData[0].name,
        }));
      }
    } catch (err) {
      console.error('Error loading Personal Management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary Metrics Calculations
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const totalGeneralExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSalaries = salaries.reduce((sum, s) => sum + (s.status === 'Credited' ? s.amount : 0), 0);
  const totalFuel = fuelExpenses.reduce((sum, f) => sum + f.amount, 0);

  const monthlyGeneral = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0);
  const monthlyFuel = fuelExpenses
    .filter((f) => f.date.startsWith(currentMonth))
    .reduce((sum, f) => sum + f.amount, 0);
  const monthlySalaries = salaries
    .filter((s) => s.creditDate.startsWith(currentMonth) && s.status === 'Credited')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalAllExpenses = totalGeneralExpenses + totalSalaries + totalFuel;
  const currentMonthExpensesTotal = monthlyGeneral + monthlyFuel + monthlySalaries;

  // Handlers for Expenses
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || Number(expenseForm.amount) <= 0) return;
    setSaving(true);
    try {
      if (expenseForm.id) {
        await updateExpenseInFirebase(expenseForm.id, {
          date: expenseForm.date,
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          description: expenseForm.description,
        });
      } else {
        await addExpenseToFirebase({
          date: expenseForm.date,
          category: expenseForm.category,
          amount: Number(expenseForm.amount),
          description: expenseForm.description,
          createdBy: currentUser.name,
          createdById: currentUser.id,
        });
      }
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        category: 'Travel',
        amount: '',
        description: '',
      });
      await loadData();
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await deleteExpenseFromFirebase(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    }
  };

  // Handlers for Salary
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryForm.amount || Number(salaryForm.amount) <= 0) return;
    setSaving(true);
    try {
      const targetUser = users.find((u) => u.id === salaryForm.userId);
      const targetUserName = targetUser ? targetUser.name : salaryForm.userName || 'Employee';

      if (salaryForm.id) {
        await updateSalaryInFirebase(salaryForm.id, {
          userId: salaryForm.userId,
          userName: targetUserName,
          amount: Number(salaryForm.amount),
          creditDate: salaryForm.creditDate,
          month: salaryForm.month,
          status: salaryForm.status,
          notes: salaryForm.notes,
        });
      } else {
        await addSalaryToFirebase({
          userId: salaryForm.userId,
          userName: targetUserName,
          amount: Number(salaryForm.amount),
          creditDate: salaryForm.creditDate,
          month: salaryForm.month,
          status: salaryForm.status,
          notes: salaryForm.notes,
          recordedBy: currentUser.name,
        });
      }
      setSalaryForm({
        userId: users[0]?.id || '',
        userName: users[0]?.name || '',
        amount: '',
        creditDate: new Date().toISOString().split('T')[0],
        month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        status: 'Credited',
        notes: '',
      });
      await loadData();
    } catch (err) {
      console.error('Error saving salary record:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!window.confirm('Delete this salary credit entry?')) return;
    try {
      await deleteSalaryFromFirebase(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting salary record:', err);
    }
  };

  // Handlers for Fuel
  const handleSaveFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fuelForm.amount || Number(fuelForm.amount) <= 0) return;
    setSaving(true);
    try {
      await addFuelExpenseToFirebase({
        date: fuelForm.date,
        amount: Number(fuelForm.amount),
        notes: fuelForm.notes,
        recordedBy: currentUser.name,
        recordedById: currentUser.id,
      });
      setFuelForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        notes: '',
      });
      await loadData();
    } catch (err) {
      console.error('Error saving fuel expense:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFuel = async (id: string) => {
    if (!window.confirm('Delete this fuel expense record?')) return;
    try {
      await deleteFuelExpenseFromFirebase(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting fuel expense:', err);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-6 rounded-2xl text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-black tracking-wider border border-emerald-400/30">
              Admin Restricted
            </span>
            <span className="text-xs text-sky-300 font-semibold">• Permanent Firebase Ledger</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight mt-1 flex items-center space-x-2">
            <Wallet className="w-7 h-7 text-sky-400" />
            <span>Personal & Financial Management</span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Track business expenses, staff salary credits, and fuel logs with automatic monthly audit summaries.
          </p>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Total Expenses</span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">₹{totalAllExpenses.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">All recorded financial outlays</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Salary Credited</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-900">₹{totalSalaries.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{salaries.length} salary disbursals logged</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Fuel Expenses</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-900">₹{totalFuel.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Monthly: ₹{monthlyFuel.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">This Month Expenses</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-900">₹{currentMonthExpensesTotal.toLocaleString('en-IN')}</div>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Sub Tabs Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          onClick={() => setActiveSubTab('EXPENSES')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'EXPENSES'
              ? 'bg-white text-sky-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4 text-sky-600" />
          <span>General Expenses</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 font-bold">
            {expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('SALARIES')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'SALARIES'
              ? 'bg-white text-purple-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 text-purple-600" />
          <span>Salary Credit Records</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 font-bold">
            {salaries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('FUEL')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubTab === 'FUEL'
              ? 'bg-white text-amber-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Fuel className="w-4 h-4 text-amber-600" />
          <span>Fuel Expenses</span>
          <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600 font-bold">
            {fuelExpenses.length}
          </span>
        </button>
      </div>

      {/* MODULE 1: GENERAL EXPENSE MANAGEMENT */}
      {activeSubTab === 'EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Receipt className="w-4 h-4 text-sky-600" />
              <span>{expenseForm.id ? 'Edit Expense Record' : 'Record New Expense'}</span>
            </h3>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                >
                  <option value="Travel">Travel / Transport</option>
                  <option value="Food">Food & Refreshments</option>
                  <option value="Office">Office Supplies</option>
                  <option value="Vehicle Repair">Vehicle Maintenance</option>
                  <option value="Marketing">Marketing & Banners</option>
                  <option value="Misc">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 1500"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Details regarding expense..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-400 outline-none resize-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{expenseForm.id ? 'Update Expense' : 'Save Expense Record'}</span>
                </button>
                {expenseForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpenseForm({
                        date: new Date().toISOString().split('T')[0],
                        category: 'Travel',
                        amount: '',
                        description: '',
                      })
                    }
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* History List */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-600" />
                <span>Expense History Ledger</span>
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Total: ₹{totalGeneralExpenses.toLocaleString('en-IN')}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading expense ledger from Firebase...</div>
            ) : expenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No expense entries recorded yet. Use the form to record expenses.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase">
                          {exp.category}
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">{exp.date}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{exp.description || 'No notes provided'}</p>
                      <span className="text-[10px] text-slate-400">By {exp.createdBy || 'Admin'}</span>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-sm font-black text-slate-900">₹{exp.amount.toLocaleString('en-IN')}</span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            setExpenseForm({
                              id: exp.id,
                              date: exp.date,
                              category: exp.category,
                              amount: exp.amount.toString(),
                              description: exp.description,
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 2: SALARY CREDIT MANAGEMENT */}
      {activeSubTab === 'SALARIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 pb-2 border-b border-slate-100">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <span>{salaryForm.id ? 'Edit Salary Disbursal' : 'Record Salary Credit'}</span>
            </h3>

            <form onSubmit={handleSaveSalary} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee / Sales Exec *</label>
                <select
                  value={salaryForm.userId}
                  onChange={(e) => {
                    const u = users.find((x) => x.id === e.target.value);
                    setSalaryForm({
                      ...salaryForm,
                      userId: e.target.value,
                      userName: u ? u.name : '',
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
                  required
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Salary Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={salaryForm.amount}
                  onChange={(e) => setSalaryForm({ ...salaryForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Credit Date *</label>
                  <input
                    type="date"
                    value={salaryForm.creditDate}
                    onChange={(e) => setSalaryForm({ ...salaryForm, creditDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salary Month *</label>
                  <input
                    type="text"
                    placeholder="e.g. July 2026"
                    value={salaryForm.month}
                    onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Status *</label>
                <select
                  value={salaryForm.status}
                  onChange={(e) => setSalaryForm({ ...salaryForm, status: e.target.value as SalaryStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
                >
                  <option value="Credited">Credited (Paid)</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes / Transaction Ref</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank Transfer Ref #928301"
                  value={salaryForm.notes}
                  onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-400 outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{salaryForm.id ? 'Update Salary' : 'Credit Salary'}</span>
                </button>
                {salaryForm.id && (
                  <button
                    type="button"
                    onClick={() =>
                      setSalaryForm({
                        userId: users[0]?.id || '',
                        userName: users[0]?.name || '',
                        amount: '',
                        creditDate: new Date().toISOString().split('T')[0],
                        month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                        status: 'Credited',
                        notes: '',
                      })
                    }
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Ledger History */}
          <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-purple-600" />
                <span>Salary Credit History Ledger</span>
              </h3>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                Total Credited: ₹{totalSalaries.toLocaleString('en-IN')}
              </span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">Loading salary records...</div>
            ) : salaries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No salary credit records registered yet.</div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[500px] pr-1">
                {salaries.map((sal) => (
                  <div
                    key={sal.id}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-black text-slate-900 text-xs">{sal.userName}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            sal.status === 'Credited'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sal.status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">• {sal.month}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-600">
                        Credit Date: {sal.creditDate} {sal.notes ? `(${sal.notes})` : ''}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="text-sm font-black text-purple-900">₹{sal.amount.toLocaleString('en-IN')}</span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() =>
                            setSalaryForm({
                              id: sal.id,
                              userId: sal.userId,
                              userName: sal.userName,
                              amount: sal.amount.toString(),
                              creditDate: sal.creditDate,
                              month: sal.month,
                              status: sal.status,
                              notes: sal.notes || '',
                            })
                          }
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Edit Record"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSalary(sal.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULE 3: FUEL EXPENSE MANAGEMENT */}
      {activeSubTab === 'FUEL' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Fuel Entry Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs h-fit space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Fuel className="w-4 h-4 text-amber-600" />
              <span>Record Fuel Expense</span>
            </h3>

            <form onSubmit={handleSaveFuel} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={fuelForm.date}
                  onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fuel Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={fuelForm.amount}
                  onChange={(e) => setFuelForm({ ...fuelForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-400 outline-none"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle / Route Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Hero Splendor - Route #2 Market Visit"
                  value={fuelForm.notes}
                  onChange={(e) => setFuelForm({ ...fuelForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Save Fuel Log</span>
              </button>
            </form>
          </div>

          {/* Fuel History & Monthly Summaries */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider">
                    This Month Fuel
                  </span>
                  <div className="text-xl font-black text-amber-950 mt-0.5">₹{monthlyFuel.toLocaleString('en-IN')}</div>
                </div>
                <Fuel className="w-6 h-6 text-amber-600 opacity-60" />
              </div>

              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-300 tracking-wider">
                    Lifetime Fuel Total
                  </span>
                  <div className="text-xl font-black text-white mt-0.5">₹{totalFuel.toLocaleString('en-IN')}</div>
                </div>
                <Wallet className="w-6 h-6 text-amber-400 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  <span>Fuel Log History</span>
                </div>
                <span className="text-xs text-slate-400">{fuelExpenses.length} entries</span>
              </h3>

              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading fuel history...</div>
              ) : fuelExpenses.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No fuel expense entries recorded yet.</div>
              ) : (
                <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
                  {fuelExpenses.map((fuel) => (
                    <div
                      key={fuel.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 flex items-center justify-between gap-3 transition-all"
                    >
                      <div>
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span className="text-xs font-black text-slate-900">{fuel.date}</span>
                          <span className="text-[10px] text-slate-400">• By {fuel.recordedBy}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-700">{fuel.notes || 'Fuel fill'}</p>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0">
                        <span className="text-sm font-black text-amber-900">₹{fuel.amount.toLocaleString('en-IN')}</span>
                        <button
                          onClick={() => handleDeleteFuel(fuel.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                          title="Delete Fuel Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

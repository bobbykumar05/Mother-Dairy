import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X,
  Store,
  MapPin,
  Phone,
  User,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Check,
  AlertCircle,
  ArrowRight,
  ClipboardPaste,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Route, Party } from '../types';
import {
  extractTextLinesFromPdf,
  parseRetailersFromText,
  extractRouteArea,
  ExtractedRetailerCandidate,
} from '../lib/pdfRetailerParser';

interface RetailerPdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  routes: Route[];
  existingParties: Party[];
  initialRouteId?: string;
  onImportRetailers: (
    retailers: Array<Omit<Party, 'id' | 'createdAt' | 'lifetimeOrders' | 'lifetimeValue'>>,
    targetRoute: Route
  ) => Promise<{ successCount: number; failCount: number }>;
}

export const RetailerPdfImportModal: React.FC<RetailerPdfImportModalProps> = ({
  isOpen,
  onClose,
  routes,
  existingParties,
  initialRouteId,
  onImportRetailers,
}) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>(
    initialRouteId || routes[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'PASTE'>('UPLOAD');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<string>('');

  // Extracted Data Review State
  const [extractedList, setExtractedList] = useState<ExtractedRetailerCandidate[]>([]);
  const [step, setStep] = useState<'CONFIG' | 'REVIEW' | 'SUCCESS'>('CONFIG');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'DUPLICATES'>('ALL');

  // Import Execution State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importResults, setImportResults] = useState<{ successCount: number; failCount: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const targetRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setProcessingError('Please upload a valid .pdf document');
      return;
    }
    setUploadedFile(file);
    setProcessingError('');
    await processPdfFile(file);
  };

  const processPdfFile = async (file: File) => {
    if (!targetRoute) {
      setProcessingError('Please select a target Route first.');
      return;
    }
    setIsProcessing(true);
    setProcessingError('');
    try {
      const { fullText } = await extractTextLinesFromPdf(file);
      if (!fullText || fullText.trim().length === 0) {
        throw new Error('No selectable text found in the PDF. If this is a scanned document image, please use the Paste Text option or verify PDF contents.');
      }
      const candidates = parseRetailersFromText(fullText, targetRoute, existingParties);
      if (candidates.length === 0) {
        throw new Error('Could not identify retailer records automatically from this PDF. You can paste the raw retailer text directly in the Paste Text tab.');
      }
      setExtractedList(candidates);
      setStep('REVIEW');
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      setProcessingError(err?.message || 'Failed to parse PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessPastedText = () => {
    if (!targetRoute) {
      setProcessingError('Please select a target Route first.');
      return;
    }
    if (!pastedText.trim()) {
      setProcessingError('Please paste retailer text from your document or sheet.');
      return;
    }
    setIsProcessing(true);
    setProcessingError('');
    try {
      const candidates = parseRetailersFromText(pastedText, targetRoute, existingParties);
      if (candidates.length === 0) {
        throw new Error('Could not parse retailer records from the pasted text. Please make sure shop names and phone numbers are present.');
      }
      setExtractedList(candidates);
      setStep('REVIEW');
    } catch (err: any) {
      setProcessingError(err?.message || 'Failed to parse text.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Selection Toggles
  const handleToggleSelectAll = (select: boolean) => {
    setExtractedList((prev) =>
      prev.map((item) => ({
        ...item,
        selected: select ? item.validationStatus !== 'DUPLICATE_EXISTING' : false,
      }))
    );
  };

  const handleToggleItem = (tempId: string) => {
    setExtractedList((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleUpdateItem = (tempId: string, field: keyof ExtractedRetailerCandidate, value: string) => {
    setExtractedList((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, [field]: value };
        // Recalculate validation if phone changed
        if (field === 'phone') {
          const cleanPhone = value.replace(/\D/g, '').slice(-10);
          const isDup = existingParties.some(
            (p) => p.active && p.phone && p.phone.replace(/\D/g, '').slice(-10) === cleanPhone
          );
          if (isDup) {
            updated.validationStatus = 'DUPLICATE_EXISTING';
            updated.validationMessage = 'Phone already registered to an existing store in database';
          } else if (cleanPhone.length === 10) {
            updated.validationStatus = 'VALID';
            updated.validationMessage = 'Valid new retailer';
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteItem = (tempId: string) => {
    setExtractedList((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const routeArea = targetRoute ? extractRouteArea(targetRoute.name) : 'Local';

  const handleAddNewRow = () => {
    if (!targetRoute) return;
    const newCandidate: ExtractedRetailerCandidate = {
      tempId: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      shopNumber: `SH-${100 + existingParties.length + extractedList.length + 1}`,
      shopName: '',
      ownerName: '',
      phone: '',
      address: `${routeArea}, Ranchi`,
      area: routeArea,
      landmark: '',
      routeId: targetRoute.id,
      routeName: targetRoute.name,
      selected: true,
      validationStatus: 'VALID',
      validationMessage: 'Manual entry',
      confidenceScore: 100,
    };
    setExtractedList((prev) => [newCandidate, ...prev]);
  };

  // Final Import Handler
  const handleFinalizeImport = async () => {
    const selectedRetailers = extractedList.filter((item) => item.selected);
    if (selectedRetailers.length === 0) {
      alert('Please select at least one retailer to import.');
      return;
    }

    if (!targetRoute) {
      alert('Target route not selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = selectedRetailers.map((item) => ({
        shopNumber: item.shopNumber || `SH-${Math.floor(100 + Math.random() * 900)}`,
        shopName: item.shopName.trim(),
        ownerName: item.ownerName.trim(), // Kept exact as typed or blank
        phone: item.phone.trim(), // Can be empty or 10-digit mobile
        altPhone: item.altPhone?.trim() || '',
        address: item.address.trim() || `${item.area || routeArea}, Ranchi`,
        landmark: item.landmark?.trim() || '',
        routeId: targetRoute.id,
        routeName: targetRoute.name,
        area: item.area.trim() || routeArea,
        notes: `Imported via PDF Beat Import (${new Date().toLocaleDateString('en-IN')})`,
        active: true,
      }));

      const results = await onImportRetailers(payload, targetRoute);
      setImportResults(results);
      setStep('SUCCESS');
    } catch (err: any) {
      console.error('Import finalization error:', err);
      alert(err?.message || 'Failed to complete import process.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Review List
  const filteredReviewList = extractedList.filter((item) => {
    const matchesSearch =
      item.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'VALID' && item.validationStatus === 'VALID') ||
      (statusFilter === 'DUPLICATES' &&
        (item.validationStatus === 'DUPLICATE_EXISTING' || item.validationStatus === 'DUPLICATE_IN_PDF'));

    return matchesSearch && matchesStatus;
  });

  const selectedCount = extractedList.filter((i) => i.selected).length;
  const duplicateCount = extractedList.filter(
    (i) => i.validationStatus === 'DUPLICATE_EXISTING' || i.validationStatus === 'DUPLICATE_IN_PDF'
  ).length;
  const validCount = extractedList.filter((i) => i.validationStatus === 'VALID').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0f2942] to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">PDF Retailer & Beat Importer</h2>
              <p className="text-xs text-slate-300">
                Upload route PDF to auto-extract outlets, validate duplicates, and bulk create stores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: CONFIG & UPLOAD */}
          {step === 'CONFIG' && (
            <div className="space-y-6">
              {/* Route Selector (Prominent Mandatory Step) */}
              <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-4 sm:p-5">
                <label className="block text-xs font-bold text-sky-950 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>Step 1: Select Target Route (Retailers will be created under this route)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {routes.map((r) => {
                    const isSelected = r.id === selectedRouteId;
                    const existingCount = existingParties.filter(
                      (p) => p.active && (p.routeId === r.id || p.routeName === r.name)
                    ).length;

                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRouteId(r.id)}
                        className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm ring-2 ring-sky-300/40'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm truncate">{r.name}</div>
                          <div className={`text-xs ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>
                            {r.day} • {existingCount} existing stores
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-2" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Upload or Paste Choice Tabs */}
              <div>
                <div className="flex items-center space-x-2 border-b border-slate-200 mb-4">
                  <button
                    onClick={() => setActiveTab('UPLOAD')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-2 ${
                      activeTab === 'UPLOAD'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload PDF Document</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('PASTE')}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center space-x-2 ${
                      activeTab === 'PASTE'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>Paste PDF Text / Table</span>
                  </button>
                </div>

                {activeTab === 'UPLOAD' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50/50 hover:bg-sky-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-100 group-hover:bg-sky-200 text-sky-600 flex items-center justify-center mb-3 transition-colors">
                      <Upload className="w-7 h-7" />
                    </div>
                    <div className="font-bold text-slate-800 text-sm sm:text-base">
                      {uploadedFile ? uploadedFile.name : 'Click to browse or drag & drop Route PDF file'}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Supports retailer master lists, beat plans, route registers, and distributor billing sheets.
                    </p>
                    <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-slate-700 text-[11px] font-semibold">
                      <span>Auto-extracts: Store Name, Phone Number, Full Address & Area</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder={`Paste retailer names, phones, and addresses here from your PDF or Excel...\nExample:\n1. Gupta General Store | Rajesh Gupta | 9835123456 | Main Road Chowk\n2. Mother Dairy Parlour | Amit Kumar | 9431102938 | Kanke Road`}
                      rows={7}
                      className="w-full p-3.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleProcessPastedText}
                        disabled={isProcessing || !pastedText.trim()}
                        className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Parse Retailers from Text</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Processing Loader */}
              {isProcessing && (
                <div className="p-6 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center space-y-3 text-center animate-pulse">
                  <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                  <div className="font-bold text-sm">Extracting Retailer Data from PDF...</div>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Reading text tokens, parsing Indian mobile numbers, and preparing verification table for {targetRoute?.name}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {processingError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold">Extraction Notice:</div>
                    <div>{processingError}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: REVIEW, EDIT & VALIDATE GRID */}
          {step === 'REVIEW' && (
            <div className="space-y-4">
              {/* Review Banner Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-slate-500">Target Route</div>
                  <div className="text-sm font-black text-slate-800 truncate">{targetRoute?.name}</div>
                </div>
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-sky-700">Total Extracted</div>
                  <div className="text-base font-black text-sky-900">{extractedList.length} Stores</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-emerald-700">Ready to Import</div>
                  <div className="text-base font-black text-emerald-900">{validCount} Ready</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-[11px] font-semibold text-amber-700">Duplicates Detected</div>
                  <div className="text-base font-black text-amber-900">{duplicateCount} Flagged</div>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search extracted stores..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent border-none text-xs focus:outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg font-medium text-slate-700"
                  >
                    <option value="ALL">All ({extractedList.length})</option>
                    <option value="VALID">Valid ({validCount})</option>
                    <option value="DUPLICATES">Duplicates ({duplicateCount})</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleToggleSelectAll(true)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => handleToggleSelectAll(false)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={handleAddNewRow}
                    className="px-2.5 py-1 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 font-bold text-xs rounded-lg cursor-pointer flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Row</span>
                  </button>
                </div>
              </div>

              {/* Editable Review Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs max-h-[48vh] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCount > 0 && selectedCount === extractedList.length}
                          onChange={(e) => handleToggleSelectAll(e.target.checked)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </th>
                      <th className="p-2.5 min-w-[150px]">Retailer / Outlet Name *</th>
                      <th className="p-2.5 min-w-[110px]">Phone Number</th>
                      <th className="p-2.5 min-w-[100px]">Area</th>
                      <th className="p-2.5 min-w-[160px]">Complete Address</th>
                      <th className="p-2.5 min-w-[110px]">Owner Name (Manual)</th>
                      <th className="p-2.5 min-w-[120px]">Status</th>
                      <th className="p-2.5 w-10 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredReviewList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          No retailers match your search filter
                        </td>
                      </tr>
                    ) : (
                      filteredReviewList.map((item) => {
                        const isDup =
                          item.validationStatus === 'DUPLICATE_EXISTING' ||
                          item.validationStatus === 'DUPLICATE_IN_PDF';

                        return (
                          <tr
                            key={item.tempId}
                            className={`hover:bg-slate-50 transition-colors ${
                              !item.selected ? 'opacity-60 bg-slate-50/50' : isDup ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            <td className="p-2.5 text-center">
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={() => handleToggleItem(item.tempId)}
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.shopName}
                                onChange={(e) => handleUpdateItem(item.tempId, 'shopName', e.target.value)}
                                placeholder="Store name"
                                className="w-full p-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-sky-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.phone}
                                onChange={(e) => handleUpdateItem(item.tempId, 'phone', e.target.value)}
                                placeholder="Optional mobile"
                                maxLength={14}
                                className="w-full p-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded font-mono text-slate-800 text-xs focus:ring-1 focus:ring-sky-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.area}
                                onChange={(e) => handleUpdateItem(item.tempId, 'area', e.target.value)}
                                placeholder="Area"
                                className="w-full p-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded font-medium text-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.address}
                                onChange={(e) => handleUpdateItem(item.tempId, 'address', e.target.value)}
                                placeholder="Full address"
                                className="w-full p-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded text-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.ownerName}
                                onChange={(e) => handleUpdateItem(item.tempId, 'ownerName', e.target.value)}
                                placeholder="Leave blank / Owner"
                                className="w-full p-1.5 bg-slate-50 focus:bg-white border border-slate-200 rounded text-slate-700 text-xs focus:ring-1 focus:ring-sky-500"
                              />
                            </td>
                            <td className="p-2">
                              {item.validationStatus === 'VALID' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 mr-1" />
                                  Ready
                                </span>
                              ) : isDup ? (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                                  title={item.validationMessage}
                                >
                                  <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                                  Duplicate
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700"
                                  title={item.validationMessage}
                                >
                                  Check Details
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => handleDeleteItem(item.tempId)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer rounded"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS CONFIRMATION */}
          {step === 'SUCCESS' && (
            <div className="py-8 px-4 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Retailers Imported Successfully!</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Created <strong className="text-emerald-700 font-bold">{importResults?.successCount || selectedCount} retailers</strong> under{' '}
                <strong className="text-slate-900 font-bold">{targetRoute?.name}</strong>. All devices are now synchronized in real-time.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Done & View Stores
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {step !== 'SUCCESS' && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            {step === 'REVIEW' ? (
              <button
                onClick={() => setStep('CONFIG')}
                className="px-3.5 py-2 text-slate-600 hover:text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                ← Back to Upload
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold text-xs rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {step === 'CONFIG' ? (
                <button
                  onClick={() => {
                    if (uploadedFile) processPdfFile(uploadedFile);
                    else if (pastedText.trim()) handleProcessPastedText();
                    else setProcessingError('Please choose a PDF file or paste text first.');
                  }}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <span>Extract Retailers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={handleFinalizeImport}
                  disabled={isSubmitting || selectedCount === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing to {targetRoute?.name}...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Import {selectedCount} Stores</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

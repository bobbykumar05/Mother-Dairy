import React, { useState, useMemo, useRef } from 'react';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  History,
  IndianRupee,
  CheckCircle,
  FileSpreadsheet,
  Sparkles,
  Gift,
  Tag,
  Upload,
  Image as ImageIcon,
  Percent,
} from 'lucide-react';
import { Product, PriceHistory, AppSettings, UserRole, OfferType } from '../types';
import { calculateMargin, calculateCaseValue } from '../lib/calculations';

interface ProductsViewProps {
  products: Product[];
  priceHistories: PriceHistory[];
  settings: AppSettings;
  userRole: UserRole;
  onAddProduct: (prod: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Product>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<Product>;
  onDeleteProduct: (id: string) => Promise<boolean>;
}

const PRESET_IMAGES = [
  { label: 'Ghee 1L', url: 'https://5.imimg.com/data5/SELLER/Default/2021/5/BW/WZ/DN/93887037/mother-dairy-cow-ghee-jar-one-litre-.jpg' },
  { label: 'Cookies Kaju Pista', url: 'https://milkkart.in/wp-content/uploads/2025/01/51pJ1qTkZFL._SL1000_.jpg' },
  { label: 'Cookies Jeera', url: 'https://milkkart.in/wp-content/uploads/2025/01/Jeera.jpg' },
  { label: 'Fl. Milk Cold Coffee', url: 'https://www.bbassets.com/media/uploads/p/l/40039250_2-mother-dairy-cold-coffee-flavoured-milk.jpg' },
  { label: 'Milkshake Strawberry', url: 'https://www.bbassets.com/media/uploads/p/xl/30010297_4-mother-dairy-milk-shake-strawberry.jpg' },
  { label: 'Masala Chaach', url: 'https://rukmini1.flixcart.com/image/1500/1500/xif0q/butter-milk/c/i/z/-original-imahfmchjgdhnhpg.jpeg?q=70' },
  { label: 'Sweet Lassi', url: 'https://www.bbassets.com/media/uploads/p/l/40004523_10-mother-dairy-lassi-sweetened-asli-refreshment.jpg' },
  { label: 'Butter 500g', url: 'https://www.bbassets.com/media/uploads/p/l/30007664_6-mother-dairy-butter.jpg' },
  { label: 'Cheese Block', url: 'https://www.jiomart.com/images/product/original/490006790/mother-dairy-processed-cheese-block-200-g-product-images-o490006790-p591239038-0-202308301736.jpg?im=Resize=(1000,1000)' },
  { label: 'UHT Milk 1L', url: 'https://www.jiomart.com/images/product/original/490066079/mother-dairy-toned-milk-1-l-tetra-pak-product-images-o490066079-p490066079-0-202304261732.jpg?im=Resize=(1000,1000)' },
  { label: 'Safal Pickle', url: 'https://f.nooncdn.com/p/pzsku/ZEEC9DCF54E947AF91BC1Z/45/1754506154/16b57584-8dcd-4077-b1f5-d15d366e92b7.jpg?width=320' },
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  priceHistories,
  settings,
  userRole,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: 'GHEE',
    packSize: '1 L',
    imageUrl: '',
    piecesPerCase: 12,
    mrp: 100,
    ptr: 90,
    hasOffer: false,
    offerTitle: '',
    offerType: 'FREE_BONUS' as OfferType,
    offerDetails: '',
    offerMinQty: 1,
    offerMinUnit: 'CASE' as 'CASE' | 'PIECE',
    offerBonusQty: 30,
    offerBonusUnit: 'PIECE' as 'PIECE' | 'CASE',
    offerSpecialPrice: 100,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom margin state & string inputs for full decimal precision
  const [customMargin, setCustomMargin] = useState<number>(10);
  const [isCustomCategory, setIsCustomCategory] = useState<boolean>(false);
  const [customCategoryInput, setCustomCategoryInput] = useState<string>('');

  const existingCategories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
    const defaultCats = ['GHEE', 'COOKIES', 'FL.MILK', 'MILKSHAKE', 'CHACH', 'LASSI', 'COFFE', 'BUTTER & CHEESE', 'DAIRY WHITENER', 'ESL MILK', 'UHT MILK', 'UHT CREAM', 'SAFAL'];
    return Array.from(new Set([...cats, ...defaultCats]));
  }, [products]);

  const categoriesFilter = useMemo(() => {
    return ['ALL', ...existingCategories];
  }, [existingCategories]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      const matchesCat = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.packSize && p.packSize.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.offerTitle && p.offerTitle.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const handleOpenAdd = () => {
    const defaultMrp = 100;
    const defaultPtr = 90;
    const defaultMargin = calculateMargin(defaultMrp, defaultPtr);
    setCustomMargin(defaultMargin);
    setIsCustomCategory(false);
    setCustomCategoryInput('');

    const firstCat = existingCategories[0] || 'GHEE';

    setFormData({
      sku: `MD-PROD-${products.length + 1}`,
      name: '',
      category: firstCat,
      packSize: '',
      imageUrl: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=500&auto=format&fit=crop&q=80',
      piecesPerCase: 12,
      mrp: defaultMrp,
      ptr: defaultPtr,
      hasOffer: false,
      offerTitle: '',
      offerType: 'FREE_BONUS',
      offerDetails: '',
      offerMinQty: 1,
      offerMinUnit: 'CASE',
      offerBonusQty: 30,
      offerBonusUnit: 'PIECE',
      offerSpecialPrice: defaultPtr,
    });
    setIsAddOpen(true);
  };

  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    const m = calculateMargin(p.mrp, p.ptr);
    setCustomMargin(m);

    const isExisting = existingCategories.includes(p.category);
    setIsCustomCategory(!isExisting);
    setCustomCategoryInput(!isExisting ? p.category : '');

    setFormData({
      sku: p.sku,
      name: p.name,
      category: p.category,
      packSize: p.packSize,
      imageUrl: p.imageUrl,
      piecesPerCase: p.piecesPerCase,
      mrp: p.mrp,
      ptr: p.ptr,
      hasOffer: !!p.hasOffer,
      offerTitle: p.offerTitle || '',
      offerType: p.offerType || 'FREE_BONUS',
      offerDetails: p.offerDetails || '',
      offerMinQty: p.offerMinQty || 1,
      offerMinUnit: p.offerMinUnit || 'CASE',
      offerBonusQty: p.offerBonusQty || 30,
      offerBonusUnit: p.offerBonusUnit || 'PIECE',
      offerSpecialPrice: p.offerSpecialPrice || p.ptr,
    });
  };

  // Dynamic Rate and Margin Handlers with full decimal freedom
  const handleMrpChange = (valStr: string) => {
    const val = parseFloat(valStr);
    const newMrp = isNaN(val) ? 0 : val;
    setFormData((prev) => {
      // Calculate PTR based on customMargin if MRP changed
      const calculatedPtr = Number((newMrp * (1 - customMargin / 100)).toFixed(2));
      return {
        ...prev,
        mrp: newMrp,
        ptr: calculatedPtr,
      };
    });
  };

  const handlePtrChange = (valStr: string) => {
    const val = parseFloat(valStr);
    const newPtr = isNaN(val) ? 0 : val;
    setFormData((prev) => {
      if (prev.mrp > 0 && newPtr >= 0) {
        const newMargin = calculateMargin(prev.mrp, newPtr);
        setCustomMargin(newMargin);
      }
      return {
        ...prev,
        ptr: newPtr,
      };
    });
  };

  const handleMarginChange = (valStr: string) => {
    const val = parseFloat(valStr);
    const newMargin = isNaN(val) ? 0 : val;
    setCustomMargin(newMargin);
    setFormData((prev) => {
      const calculatedPtr = Number((prev.mrp * (1 - newMargin / 100)).toFixed(2));
      return {
        ...prev,
        ptr: calculatedPtr,
      };
    });
  };

  // Image Upload File Handler
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image file size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, imageUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const margin = calculateMargin(formData.mrp, formData.ptr);
    const casePtr = calculateCaseValue(formData.ptr, formData.piecesPerCase);

    const payload = {
      ...formData,
      ptrMargin: margin,
      casePtr: casePtr,
      active: true,
    };

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, payload);
        setEditingProduct(null);
      } else {
        await onAddProduct(payload);
        setIsAddOpen(false);
      }
    } catch (err) {
      alert('Failed to save product');
    }
  };

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900">Mother Dairy Product Master & Price List</h2>
          <p className="text-xs text-slate-500">Official FMCG Price List source of truth with Case & Loose Piece PTR</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
          >
            <History className="w-4 h-4 text-sky-400" />
            <span>Price Log</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* SEARCH & CATEGORY CHIPS */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
          <Search className="w-5 h-5 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="Search Mother Dairy products, categories, pack sizes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-900 focus:outline-none placeholder:text-slate-400 font-medium"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {categoriesFilter.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#0f2942] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRICE LIST TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0f2942] text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="p-3">Product Description</th>
                <th className="p-3">Category</th>
                <th className="p-3">Pcs / Case</th>
                <th className="p-3">MRP (₹)</th>
                <th className="p-3">PTR (₹)</th>
                <th className="p-3">Case PTR (₹)</th>
                <th className="p-3">PTR Margin</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-11 h-11 rounded-lg border border-slate-200 bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden shadow-2xs">
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                          <span>{p.name}</span>
                          {p.hasOffer && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
                              <Sparkles className="w-2.5 h-2.5 fill-current text-amber-100" />
                              <span>SPECIAL OFFER</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">Pack: {p.packSize || 'Standard'} • SKU: {p.sku}</div>
                        {p.hasOffer && p.offerTitle && (
                          <div className="mt-0.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md inline-block">
                            🎁 {p.offerTitle}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="font-extrabold text-[10px] text-sky-800 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      {p.category}
                    </span>
                  </td>

                  <td className="p-3 font-bold">{p.piecesPerCase} pcs</td>
                  <td className="p-3 text-slate-500 font-bold">₹{p.mrp}</td>
                  <td className="p-3 font-black text-slate-900">₹{p.ptr}</td>
                  <td className="p-3 font-black text-sky-700">₹{p.casePtr || (p.ptr * p.piecesPerCase)}</td>

                  <td className="p-3">
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {p.ptrMargin}%
                    </span>
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleStartEdit(p)}
                        title="Edit Product & Customize Rates/Margins"
                        className="p-1.5 text-slate-500 hover:text-sky-600 cursor-pointer bg-slate-100 hover:bg-sky-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(p.id)}
                        title="Delete Product"
                        className="p-1.5 text-slate-500 hover:text-rose-600 cursor-pointer bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {(isAddOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSave}
            className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
          >
            <div className="p-4 bg-[#0f2942] text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Mother Dairy Product'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1 text-slate-300 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. COW GHEE 1 L PET JAR"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  {!isCustomCategory ? (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCategory(true);
                          setCustomCategoryInput('');
                          setFormData({ ...formData, category: '' });
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold uppercase cursor-pointer text-xs"
                    >
                      {existingCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__NEW__">+ Create New Category...</option>
                    </select>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        required
                        placeholder="e.g. MILKSHAKE"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                        className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl font-bold uppercase text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(false);
                          setFormData({ ...formData, category: existingCategories[0] || 'GHEE' });
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200"
                        title="Back to dropdown"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pack Size</label>
                  <input
                    type="text"
                    placeholder="1 L, 200 ML, 150 GM"
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {/* RATES & MARGINS CUSTOMIZATION */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs flex items-center space-x-1">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Customize Rates & Retailer Margins</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">Supports Decimals (e.g. 11.11, 27.35)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">Pcs / Case *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.piecesPerCase || ''}
                      onChange={(e) => setFormData({ ...formData, piecesPerCase: Number(e.target.value) })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">MRP / Pc (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.mrp === 0 ? '' : formData.mrp}
                      onChange={(e) => handleMrpChange(e.target.value)}
                      placeholder="e.g. 30.00"
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-center text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">PTR / Pc (₹) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.ptr === 0 ? '' : formData.ptr}
                      onChange={(e) => handlePtrChange(e.target.value)}
                      placeholder="e.g. 27.35"
                      className="w-full p-2 bg-sky-50 border border-sky-400 rounded-xl font-extrabold text-center text-sky-800"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 text-[11px] mb-1">PTR Margin % *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        value={customMargin === 0 ? '' : customMargin}
                        onChange={(e) => handleMarginChange(e.target.value)}
                        placeholder="e.g. 11.11"
                        className="w-full p-2 pr-6 bg-emerald-50 border border-emerald-400 rounded-xl font-extrabold text-center text-emerald-800"
                      />
                      <Percent className="w-3 h-3 text-emerald-600 absolute right-2 top-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] bg-white p-2 rounded-xl border border-slate-200 font-semibold">
                  <span className="text-slate-600">Calculated Case PTR (1 Case):</span>
                  <span className="font-extrabold text-sky-700">₹{(formData.ptr * formData.piecesPerCase).toFixed(2)} ({formData.piecesPerCase} pcs)</span>
                </div>
              </div>

              {/* IMAGE UPLOADER & PRESETS */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <label className="block font-extrabold text-slate-800 text-xs flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-600" />
                  <span>Product Image</span>
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-contain p-0.5" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageFileUpload}
                      accept="image/*"
                      className="hidden"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer flex items-center space-x-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Local Image</span>
                      </button>

                      <span className="text-[10px] text-slate-400 font-medium">Or paste link below</span>
                    </div>

                    <input
                      type="text"
                      placeholder="https://images.unsplash.com/..."
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-700 text-xs"
                    />
                  </div>
                </div>

                {/* SAMPLE PHOTO PRESETS */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Select Sample Product Photo:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {PRESET_IMAGES.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: preset.url }))}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap cursor-pointer transition-all ${
                          formData.imageUrl === preset.url
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SPECIAL OFFER CONFIGURATION SECTION */}
              <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-amber-950 text-xs flex items-center space-x-1.5 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Enable Special Offer / Scheme on this Product</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={formData.hasOffer}
                    onChange={(e) => setFormData({ ...formData, hasOffer: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                </div>

                {formData.hasOffer && (
                  <div className="space-y-2.5 pt-1 border-t border-amber-200">
                    <div>
                      <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                        Offer Headline / Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BUY 1 BOX GET 30 PCS EXTRA CHEESE FREE"
                        value={formData.offerTitle}
                        onChange={(e) => setFormData({ ...formData, offerTitle: e.target.value })}
                        className="w-full p-2 bg-white border border-amber-300 rounded-xl font-bold text-slate-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                          Offer Scheme Type
                        </label>
                        <select
                          value={formData.offerType}
                          onChange={(e) => setFormData({ ...formData, offerType: e.target.value as any })}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium text-xs"
                        >
                          <option value="FREE_BONUS">Free Bonus Items (+30 Pcs Free)</option>
                          <option value="SPECIAL_PRICE">Special Bulk Rate (e.g. ₹100/pc)</option>
                          <option value="CUSTOM">Custom Promotional Scheme</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                          Min Requirement
                        </label>
                        <div className="flex space-x-1">
                          <input
                            type="number"
                            min="1"
                            value={formData.offerMinQty}
                            onChange={(e) => setFormData({ ...formData, offerMinQty: Number(e.target.value) })}
                            className="w-16 p-2 bg-white border border-slate-300 rounded-xl font-bold text-center text-xs"
                          />
                          <select
                            value={formData.offerMinUnit}
                            onChange={(e) => setFormData({ ...formData, offerMinUnit: e.target.value as any })}
                            className="flex-1 p-2 bg-white border border-slate-300 rounded-xl font-medium text-xs"
                          >
                            <option value="CASE">Box / Case</option>
                            <option value="PIECE">Pieces</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {formData.offerType === 'FREE_BONUS' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                            Extra Free Bonus Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.offerBonusQty}
                            onChange={(e) => setFormData({ ...formData, offerBonusQty: Number(e.target.value) })}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-emerald-700 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                            Bonus Unit
                          </label>
                          <select
                            value={formData.offerBonusUnit}
                            onChange={(e) => setFormData({ ...formData, offerBonusUnit: e.target.value as any })}
                            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-medium text-xs"
                          >
                            <option value="PIECE">Extra Free Pieces</option>
                            <option value="CASE">Extra Free Cases</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {formData.offerType === 'SPECIAL_PRICE' && (
                      <div>
                        <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                          Special Discounted PTR Price per Piece (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 100"
                          value={formData.offerSpecialPrice}
                          onChange={(e) => setFormData({ ...formData, offerSpecialPrice: Number(e.target.value) })}
                          className="w-full p-2 bg-white border border-emerald-400 rounded-xl font-extrabold text-emerald-800 text-xs"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-slate-800 text-[11px] mb-1">
                        Detailed Offer Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Buy 1 Box Cheese Tube get 30 pieces extra cheese free!"
                        value={formData.offerDetails}
                        onChange={(e) => setFormData({ ...formData, offerDetails: e.target.value })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl text-slate-700 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Calculated preview */}
              <div className="p-3 bg-slate-100 rounded-xl space-y-1 text-slate-700 font-semibold">
                <div>Calculated PTR Margin: <span className="text-emerald-600 font-bold">{calculateMargin(formData.mrp, formData.ptr)}%</span></div>
                <div>Case PTR Total: <span className="text-sky-700 font-bold">₹{calculateCaseValue(formData.ptr, formData.piecesPerCase)}</span></div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingProduct(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                SAVE PRODUCT
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PRICE HISTORY MODAL */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <History className="w-5 h-5 text-sky-600" />
                <span>Historical Price Changes Log</span>
              </h3>
              <button onClick={() => setShowHistory(false)} className="p-1 text-slate-400 hover:text-slate-800">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 text-xs">
              {priceHistories.length === 0 ? (
                <p className="text-center py-6 text-slate-400">No price updates recorded yet.</p>
              ) : (
                priceHistories.map((ph) => (
                  <div key={ph.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">{ph.productName}</div>
                    <div className="text-slate-600">
                      PTR: ₹{ph.oldPtr} → <span className="font-bold text-sky-700">₹{ph.newPtr}</span> | MRP: ₹{ph.oldMrp} → ₹{ph.newMrp}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      By {ph.changedBy} on {new Date(ph.changedAt).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

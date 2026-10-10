'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Award,
  GraduationCap,
  Landmark,
  Shield,
  Sliders,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MASTER_CATEGORIES = [
  {
    id: 'TEACHER_TYPE',
    name: 'Teacher / Staff Types (सेवाको किसिम)',
    nepali: 'सेवाको किसिम',
    desc: 'स्थायी, अस्थायी, राहत, करार, बालविकास, निजी स्रोत, स्वयंसेवक आदि',
    icon: GraduationCap,
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'POST',
    name: 'Designations / Posts (पद तथा पदवी)',
    nepali: 'पद तथा पदवी',
    desc: 'प्रधानाध्यापक, सहायक प्र.अ., मावि/निमावि/प्रावि शिक्षक, लेखापाल, कार्यालय सहयोगी आदि',
    icon: Briefcase,
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'INCHARGE_ROLE',
    name: 'Incharge Roles & Portfolios (विशेष जिम्मेवारी)',
    nepali: 'विशेष जिम्मेवारी / इन्चार्ज',
    desc: 'परीक्षा प्रमुख, पुस्तकालय प्रमुख, लेखा प्रमुख, अनुशासन प्रमुख, अतिरिक्त क्रियाकलाप प्रमुख आदि',
    icon: Award,
    color: 'text-purple-700 bg-purple-50 border-purple-200',
  },
  {
    id: 'TAHA',
    name: 'Academic Levels / Taha (तह)',
    nepali: 'शैक्षिक तथा प्रशासनिक तह',
    desc: 'माध्यमिक तह, निम्न माध्यमिक तह, प्राथमिक तह, पूर्व प्राथमिक, प्रशासन आदि',
    icon: Layers,
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'SHRENI',
    name: 'Grades / Shreni (श्रेणी)',
    nepali: 'श्रेणी / तहगत वर्गीकरण',
    desc: 'प्रथम श्रेणी, द्वितीय श्रेणी, तृतीय श्रेणी, विशिष्ट, श्रेणीविहीन आदि',
    icon: Sliders,
    color: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    id: 'BANK_NAME',
    name: 'Commercial & Dev Banks (बैंक सूची)',
    nepali: 'तलब तथा पेस्की बैंक सूची',
    desc: 'राष्ट्रिय वाणिज्य बैंक, नेपाल बैंक, ग्लोबल आइएमई, नबिल, एनआईसी एशिया आदि',
    icon: Landmark,
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
];

export default function StaffMastersTab() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>('TEACHER_TYPE');
  const [search, setSearch] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    code: '',
    title: '',
    titleNepali: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });

  // Fetch all master options
  const { data: options = [], isLoading, refetch } = useQuery({
    queryKey: ['staff-master-options'],
    queryFn: async () => {
      const res = await api.get('/staff-masters/options');
      return res.data?.data || [];
    },
  });

  // Create Option Mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post('/staff-masters/options', { ...data, category: selectedCategory });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'मास्टर विकल्प सफलतापूर्वक थपियो।');
      setIsModalOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['staff-master-options'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create master option');
    },
  });

  // Update Option Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await api.put(`/staff-masters/options/${id}`, data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'मास्टर विकल्प अद्यावधिक गरियो।');
      setIsModalOpen(false);
      setEditingItem(null);
      queryClient.invalidateQueries({ queryKey: ['staff-master-options'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update master option');
    },
  });

  // Delete Option Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/staff-masters/options/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'मास्टर विकल्प हटाइयो।');
      queryClient.invalidateQueries({ queryKey: ['staff-master-options'] });
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete master option');
    },
  });

  // Seed Defaults Mutation
  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/staff-masters/seed-defaults');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'नेपालका मानक विद्यालय मास्टर्स तथा शीर्षकहरू लोड गरियो!');
      queryClient.invalidateQueries({ queryKey: ['staff-master-options'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Seeding failed');
    },
  });

  const openCreateModal = () => {
    setEditingItem(null);
    const catOptions = options.filter((o: any) => o.category === selectedCategory);
    const maxOrder = catOptions.reduce((max: number, o: any) => Math.max(max, o.displayOrder || 0), 0);
    setFormData({
      code: '',
      title: '',
      titleNepali: '',
      description: '',
      displayOrder: maxOrder + 1,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      title: item.title || '',
      titleNepali: item.titleNepali || '',
      description: item.description || '',
      displayOrder: item.displayOrder || 0,
      isActive: item.isActive !== false,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('कृपया शीर्षक / नाम प्रविष्ट गर्नुहोस्।');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter items for current category and search
  const currentCategoryOptions = options.filter((o: any) => o.category === selectedCategory);
  const filteredOptions = currentCategoryOptions.filter((o: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.title?.toLowerCase().includes(q) ||
      o.titleNepali?.toLowerCase().includes(q) ||
      o.code?.toLowerCase().includes(q) ||
      o.description?.toLowerCase().includes(q)
    );
  }).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));

  const activeCategoryMeta = MASTER_CATEGORIES.find((c) => c.id === selectedCategory) || MASTER_CATEGORIES[0];
  const IconComponent = activeCategoryMeta.icon;

  return (
    <div className="space-y-5">
      {/* Category Selection Tabs & Seed Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
            <Sliders size={18} className="text-[#1e3a5f]" />
            <span>Master Heads & Category Settings (शिक्षक तथा कर्मचारी मास्टर्स र ड्रपडाउन व्यवस्थापन)</span>
          </h2>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            शिक्षक दर्ता, पद, तह, श्रेणी, विशेष जिम्मेवारी तथा बैंक खातामा प्रयोग हुने सबै ड्रपडाउन विकल्पहरू थप्न, सम्पादन गर्न र क्रमबद्ध गर्न सकिन्छ।
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="नेपालका मानक विद्यालय मास्टर्स लोड गर्नुहोस् (Reload Nepal School Defaults)"
          >
            <RotateCcw size={13} className={seedMutation.isPending ? 'animate-spin' : ''} />
            <span>{seedMutation.isPending ? 'लोड हुँदैछ...' : 'मानक पूर्वनिर्धारित लोड गर्नुहोस्'}</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>+ नयाँ शीर्षक थप्नुहोस्</span>
          </button>
        </div>
      </div>

      {/* 6 Category Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {MASTER_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const count = options.filter((o: any) => o.category === cat.id).length;
          const CatIcon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSearch('');
              }}
              className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between gap-2 relative overflow-hidden ${
                isSelected
                  ? 'bg-white border-[#1e3a5f] shadow-sm ring-2 ring-[#1e3a5f]/15'
                  : 'bg-slate-50/70 border-gray-200 hover:bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-xl border ${cat.color}`}>
                  <CatIcon size={16} />
                </div>
                <span className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-[#1e3a5f] text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {count}
                </span>
              </div>
              <div>
                <h4 className={`text-xs font-extrabold line-clamp-1 ${isSelected ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
                  {cat.nepali}
                </h4>
                <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">{cat.name.split('(')[0]}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Category Header & Search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-2xs p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${activeCategoryMeta.color}`}>
              <IconComponent size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 flex items-center gap-2">
                <span>{activeCategoryMeta.nepali}</span>
                <span className="text-xs font-normal text-gray-500 font-mono">({filteredOptions.length} विकल्पहरू)</span>
              </h3>
              <p className="text-xs text-gray-500 font-nepali mt-0.5">{activeCategoryMeta.desc}</p>
            </div>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="शीर्षक, नेपाली नाम वा कोड खोज्नुहोस्..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Options Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f] text-white text-[11px] font-extrabold uppercase">
              <tr>
                <th className="py-2.5 px-3 text-center w-14">क्रम</th>
                <th className="py-2.5 px-3 min-w-[140px]">शीर्षक / Title</th>
                <th className="py-2.5 px-3 min-w-[160px]">नेपाली शीर्षक (Nepali Title)</th>
                <th className="py-2.5 px-3 min-w-[110px]">कोड (Code)</th>
                <th className="py-2.5 px-3 min-w-[180px]">विवरण / टिप्पणी</th>
                <th className="py-2.5 px-3 text-center w-24">स्थिति</th>
                <th className="py-2.5 px-3 text-center w-28">कार्य (Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
                    <p className="mt-2 text-xs">Loading master options...</p>
                  </td>
                </tr>
              ) : filteredOptions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <AlertCircle size={28} className="mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-600">कुनै विकल्प भेटिएन।</p>
                    <p className="text-xs text-gray-400 mt-1">
                      माथि '+ नयाँ शीर्षक थप्नुहोस्' मा क्लिक गरी नयाँ विकल्प थप्न सक्नुहुन्छ वा मानक पूर्वनिर्धारित लोड गर्नुहोस्।
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOptions.map((item: any, idx: number) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-gray-500">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                          {item.displayOrder !== null && item.displayOrder !== undefined ? item.displayOrder : idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#1e3a5f]">
                        <div className="flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.isSystem && (
                            <span className="text-[9.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono border border-slate-200" title="प्रणाली पूर्वनिर्धारित (System Default)">
                              मानक
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-nepali font-semibold text-gray-800">
                        {item.titleNepali || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-500 text-[11px]">
                        {item.code || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-gray-600 text-[11px]">
                        {item.description || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => updateMutation.mutate({ id: item.id, data: { isActive: !item.isActive } })}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                            item.isActive !== false
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {item.isActive !== false ? <Check size={10} /> : <X size={10} />}
                          <span>{item.isActive !== false ? 'सक्रिय' : 'निष्क्रिय'}</span>
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="सम्पादन गर्नुहोस् (Edit)"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            disabled={item.isSystem}
                            onClick={() => {
                              if (confirm(`के तपाईं "${item.titleNepali || item.title}" विकल्प हटाउन निश्चित हुनुहुन्छ?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className={`p-1.5 rounded-lg transition ${
                              item.isSystem
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-rose-600 hover:text-rose-900 hover:bg-rose-50 cursor-pointer'
                            }`}
                            title={item.isSystem ? 'प्रणालीगत मानक हटाउन मिल्दैन' : 'हटाउनुहोस् (Delete)'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Master Option Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-[#1e3a5f] px-5 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-amber-300" />
                <h3 className="text-sm font-extrabold">
                  {editingItem ? 'मास्टर विकल्प सम्पादन (Edit Master Option)' : `नयाँ ${activeCategoryMeta.nepali} थप्नुहोस्`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/70 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="rounded-xl bg-blue-50 p-2.5 border border-blue-100 flex items-center gap-2 text-xs text-blue-900">
                <span className="font-bold">श्रेणी (Category):</span>
                <span className="font-extrabold">{activeCategoryMeta.name}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    शीर्षक / Title (English / Standard) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="उदा: Secondary Teacher"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    नेपाली शीर्षक (Nepali Title)
                  </label>
                  <input
                    type="text"
                    value={formData.titleNepali}
                    onChange={(e) => setFormData({ ...formData, titleNepali: e.target.value })}
                    placeholder="उदा: माध्यमिक तह शिक्षक"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-nepali"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    प्रणाली कोड (System Code)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
                    placeholder="उदा: SEC_TEACHER"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">खाली छाडेमा शीर्षकबाट स्वतः बन्नेछ।</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    क्रम नं. (Display Order)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden font-mono"
                  />
                  <p className="text-[10px] text-gray-400 mt-0.5">ड्रपडाउनमा देखाउने प्राथमिकता अङ्क</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  विवरण वा थप टिप्पणी (Description / Remarks)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="थप विवरण..."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs focus:border-[#1e3a5f] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="masterIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-[#1e3a5f] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="masterIsActive" className="text-xs font-bold text-gray-700 cursor-pointer">
                  सक्रिय (Active in dropdowns)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-bold transition cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'सुरक्षित हुँदैछ...'
                    : editingItem
                    ? 'अद्यावधिक गर्नुहोस्'
                    : 'सुरक्षित गर्नुहोस्'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

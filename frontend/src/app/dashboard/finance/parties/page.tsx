'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  Users,
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Wallet,
  Building,
  TrendingDown,
  TrendingUp,
  Landmark,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function PartiesManagementPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal States
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<any>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [partyToDelete, setPartyToDelete] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<'UNLINK' | 'CASCADE'>('UNLINK');
  const [confirmDeleteName, setConfirmDeleteName] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    nameNepali: '',
    partyType: 'VENDOR',
    panNo: '',
    phone: '',
    email: '',
    address: '',
    bankName: '',
    accountNo: '',
  });

  // 1. Fetch Parties
  const {
    data: parties = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['parties-management', selectedType, searchQuery],
    queryFn: async () => {
      const res = await api.get('/parties', {
        params: {
          type: selectedType !== 'ALL' ? selectedType : undefined,
          q: searchQuery || undefined,
        },
      });
      return res.data?.data || [];
    },
  });

  // 2. Add / Edit Mutation
  const savePartyMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingParty) {
        return api.put(`/parties/${editingParty.id}`, payload);
      }
      return api.post('/parties', payload);
    },
    onSuccess: () => {
      toast.success(editingParty ? 'पार्टी विवरण सफलतापूर्वक परिमार्जन भयो!' : 'नयाँ पार्टी सफलतापूर्वक दर्ता भयो!');
      queryClient.invalidateQueries({ queryKey: ['parties-management'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      setIsAddEditModalOpen(false);
      setEditingParty(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'पार्टी बचत गर्न सकिएन।');
    },
  });

  // 3. Delete Mutation
  const deletePartyMutation = useMutation({
    mutationFn: async ({ id, deleteEntries }: { id: number; deleteEntries: boolean }) => {
      return api.post(`/parties/${id}/delete`, { deleteEntries });
    },
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'पार्टी सफलतापूर्वक मेटाइयो।');
      queryClient.invalidateQueries({ queryKey: ['parties-management'] });
      queryClient.invalidateQueries({ queryKey: ['parties'] });
      queryClient.invalidateQueries({ queryKey: ['finance-matrix-report'] });
      setIsDeleteModalOpen(false);
      setPartyToDelete(null);
      setConfirmDeleteName('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'पार्टी मेटाउन असफल भयो।');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      nameNepali: '',
      partyType: 'VENDOR',
      panNo: '',
      phone: '',
      email: '',
      address: '',
      bankName: '',
      accountNo: '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingParty(null);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEdit = (p: any) => {
    setEditingParty(p);
    setFormData({
      name: p.name || '',
      nameNepali: p.nameNepali || '',
      partyType: p.partyType || 'VENDOR',
      panNo: p.panNo || '',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      bankName: p.bankName || '',
      accountNo: p.accountNo || '',
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenDelete = (p: any) => {
    setPartyToDelete(p);
    setDeleteMode('UNLINK');
    setConfirmDeleteName('');
    setIsDeleteModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('पार्टीको नाम अनिवार्य छ!');
      return;
    }
    savePartyMutation.mutate(formData);
  };

  const handleConfirmDelete = () => {
    if (!partyToDelete) return;
    if (deleteMode === 'CASCADE' && confirmDeleteName.trim() !== partyToDelete.name.trim()) {
      toast.error('पुष्टि गर्न पार्टीको नाम ठ्याक्कै टाइप गर्नुहोस्!');
      return;
    }
    deletePartyMutation.mutate({
      id: partyToDelete.id,
      deleteEntries: deleteMode === 'CASCADE',
    });
  };

  // Summary Metrics
  const totalCount = parties.length;
  const vendorCount = parties.filter((p: any) => p.partyType === 'VENDOR' || p.partyType === 'SUPPLIER').length;
  const contractorCount = parties.filter((p: any) => p.partyType === 'CONTRACTOR').length;
  const donorGovCount = parties.filter((p: any) => p.partyType === 'DONOR' || p.partyType === 'GOVERNMENT').length;
  const totalVouchersCount = parties.reduce((sum: number, p: any) => sum + (p.vouchersCount || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
              लेखा तथा पार्टी लगत (Parties & Vendors)
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-[#1e3a5f] mt-1.5 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-700" />
            <span>पार्टी, आपूर्तिकर्ता तथा विक्रेता व्यवस्थापन</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            विद्यालयका सम्पूर्ण सामान तथा सेवा आपूर्तिकर्ता, निर्माण व्यवसायी, दाता तथा भुक्तानी पाउने पक्षहरूको सूची तथा नियन्त्रण
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/dashboard/finance/reports?tab=party_ledger"
            className="px-3.5 py-2 text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            पार्टी खाता लेजर (Ledger)
          </Link>

          <Link
            href="/dashboard/finance/expenses?tab=payables"
            className="px-3.5 py-2 text-xs font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Wallet className="w-3.5 h-3.5 text-rose-600" />
            तिर्न बाँकी बक्यौता (Payables)
          </Link>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            नयाँ पार्टी थप्नुहोस् (Add Party)
          </button>
        </div>
      </div>

      {/* ── SUMMARY METRICS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">कुल दर्ता पार्टीहरू</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">सबै प्रकारका पक्षहरू</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">विक्रेता / सप्लायर्स</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{vendorCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">स्टेशनरी, मसलन्द तथा सामग्री</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">ठेकेदार / निर्माण व्यवसायी</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{contractorCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">भवन तथा मर्मत संभार</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold">कुल संलग्न भौचरहरू</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700">{totalVouchersCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">आम्दानी तथा खर्च कारोबार</div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="पार्टीको नाम, पान नं., फोन वा ठेगाना खोज्नुहोस्..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">सबै प्रकारका पक्षहरू (All Types)</option>
            <option value="VENDOR">विक्रेता / आपूर्तिकर्ता (Vendor)</option>
            <option value="SUPPLIER">सप्लायर (Supplier)</option>
            <option value="CONTRACTOR">ठेकेदार / निर्माण (Contractor)</option>
            <option value="DONOR">दाता / संघ-संस्था (Donor)</option>
            <option value="GOVERNMENT">सरकारी निकाय (Government)</option>
            <option value="OTHER">अन्य (Other)</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
            title="रिफ्रेस गर्नुहोस्"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── PARTIES TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-bold text-slate-800">
              पार्टी विवरण तालिका ({parties.length} वटा दर्ता)
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            पार्टीहरूको विवरण लोड हुँदैछ...
          </div>
        ) : parties.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            कुनै पार्टी फेला परेन। माथिको बटनबाट नयाँ पार्टी दर्ता गर्नुहोस्।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-12">क्र.सं.</th>
                  <th className="p-3 min-w-[180px]">पार्टी / संस्थाको नाम</th>
                  <th className="p-3 min-w-[100px]">प्रकार</th>
                  <th className="p-3 min-w-[110px]">पान / भ्याट नं.</th>
                  <th className="p-3 min-w-[120px]">सम्पर्क फोन / ठेगाना</th>
                  <th className="p-3 min-w-[140px]">बैंक खाता विवरण</th>
                  <th className="p-3 text-center min-w-[100px]">भौचर संख्या</th>
                  <th className="p-3 text-right min-w-[140px]">कार्यहरू (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parties.map((p: any, idx: number) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-center text-slate-400 font-mono font-semibold">
                      {idx + 1}
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 text-sm">{p.name}</div>
                      {p.nameNepali && p.nameNepali !== p.name && (
                        <div className="text-[11px] text-slate-500 font-medium">{p.nameNepali}</div>
                      )}
                    </td>

                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        p.partyType === 'VENDOR' || p.partyType === 'SUPPLIER'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : p.partyType === 'CONTRACTOR'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : p.partyType === 'DONOR' || p.partyType === 'GOVERNMENT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.partyType || 'VENDOR'}
                      </span>
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-700">
                      {p.panNo || <span className="text-slate-300 font-normal">-</span>}
                    </td>

                    <td className="p-3 text-slate-600">
                      {p.phone && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {p.phone}
                        </div>
                      )}
                      {p.address && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{p.address}</span>
                        </div>
                      )}
                      {!p.phone && !p.address && <span className="text-slate-300">-</span>}
                    </td>

                    <td className="p-3 text-slate-600">
                      {p.bankName ? (
                        <div>
                          <div className="font-semibold text-slate-800 text-[11px]">{p.bankName}</div>
                          {p.accountNo && (
                            <div className="font-mono text-[10px] text-slate-500">खाता: {p.accountNo}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold font-mono text-[11px]">
                        {p.vouchersCount || 0} भौचर
                      </span>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/finance/reports?tab=party_ledger&partyId=${p.id}`}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="पार्टी खाता लेजर हेर्नुहोस्"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="पार्टी विवरण सम्पादन"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenDelete(p)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="पार्टी मेटाउनुहोस्"
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
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 1: ADD / EDIT PARTY
         ══════════════════════════════════════════════════════════════════ */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">
                  {editingParty ? 'पार्टी विवरण सम्पादन गर्नुहोस्' : 'नयाँ पार्टी / आपूर्तिकर्ता दर्ता'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    पार्टी / संस्था / फर्मको नाम (Name) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pashupati Stationery / शिवम निर्माण सेवा"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    नाम (नेपालीमा - Name in Nepali)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. पशुपति स्टेशनरी"
                    value={formData.nameNepali}
                    onChange={(e) => setFormData({ ...formData, nameNepali: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    पार्टीको प्रकार (Party Type)
                  </label>
                  <select
                    value={formData.partyType}
                    onChange={(e) => setFormData({ ...formData, partyType: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-semibold"
                  >
                    <option value="VENDOR">विक्रेता / फर्म (Vendor)</option>
                    <option value="SUPPLIER">सप्लायर (Supplier)</option>
                    <option value="CONTRACTOR">ठेकेदार / निर्माण (Contractor)</option>
                    <option value="DONOR">दाता / संघ-संस्था (Donor)</option>
                    <option value="GOVERNMENT">सरकारी निकाय (Government)</option>
                    <option value="OTHER">अन्य (Other)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    पान / भ्याट नं. (PAN / VAT No.)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 601234567"
                    value={formData.panNo}
                    onChange={(e) => setFormData({ ...formData, panNo: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    सम्पर्क फोन (Phone)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9845000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ठेगाना (Address)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. गौर, रौतहट / चन्द्रनिगाहपुर"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    बैंकको नाम (Bank Name)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rastriya Banijya Bank"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    बैंक खाता नं. (Bank Account No.)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1020010023450001"
                    value={formData.accountNo}
                    onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                    className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={savePartyMutation.isPending}
                  className="px-5 py-2 text-xs font-black bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {savePartyMutation.isPending ? 'बचत हुँदैछ...' : 'सुरक्षित गर्नुहोस् (Save Party)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          MODAL 2: INTERACTIVE DELETE PARTY WITH CASCADE CHOICE
         ══════════════════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && partyToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-white" />
                <h3 className="font-black text-sm">पार्टी मेटाउने पुष्टि (Delete Party Confirmation)</h3>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="text-rose-200 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                <div className="font-bold text-rose-950 text-sm">{partyToDelete.name}</div>
                <div className="text-xs text-rose-800 mt-1">
                  पान नं.: <strong>{partyToDelete.panNo || '-'}</strong> • कुल संलग्न भौचरहरू:{' '}
                  <strong>{partyToDelete.vouchersCount || 0} वटा</strong>
                </div>
              </div>

              <div className="text-xs text-slate-700 font-bold">
                कृपया पार्टी मेटाउने विकल्प रोज्नुहोस् (Select deletion mode):
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  deleteMode === 'UNLINK'
                    ? 'border-blue-500 bg-blue-50/50 shadow-2xs ring-1 ring-blue-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === 'UNLINK'}
                      onChange={() => setDeleteMode('UNLINK')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        १. पार्टी मात्र मेटाउनुहोस् (Unlink & Delete Party Only)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        यस पार्टीसँग सम्बन्धित पुराना सम्पूर्ण आम्दानी तथा खर्च भौचरहरू सुरक्षित रहनेछन् (पार्टी नामबाट अलग हुनेछ)।
                      </p>
                    </div>
                  </div>
                </label>

                <label className={`block p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  deleteMode === 'CASCADE'
                    ? 'border-rose-500 bg-rose-50/50 shadow-2xs ring-1 ring-rose-500'
                    : 'border-slate-200 hover:border-slate-300'
                }`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="deleteMode"
                      checked={deleteMode === 'CASCADE'}
                      onChange={() => setDeleteMode('CASCADE')}
                      className="mt-0.5 text-rose-600"
                    />
                    <div>
                      <div className="font-black text-rose-900 text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        २. पार्टी र सम्पूर्ण भौचरहरू एकैचोटि मेटाउनुहोस् (Cascade Delete All Entries)
                      </div>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        चेतावनी: यस पार्टीका सम्पूर्ण <strong>{partyToDelete.vouchersCount || 0} वटा</strong> आम्दानी, खर्च तथा भुक्तानी भौचरहरू स्थायी रूपमा मेटिनेछन्!
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {deleteMode === 'CASCADE' && (
                <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl space-y-1.5">
                  <div className="text-[11px] font-bold text-rose-900">
                    पुष्टि गर्न पार्टीको नाम <span className="underline font-mono font-black">{partyToDelete.name}</span> यहाँ टाइप गर्नुहोस्:
                  </div>
                  <input
                    type="text"
                    placeholder={partyToDelete.name}
                    value={confirmDeleteName}
                    onChange={(e) => setConfirmDeleteName(e.target.value)}
                    className="w-full text-xs font-bold bg-white border border-rose-400 rounded-lg px-3 py-1.5 text-rose-950 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  रद्द गर्नुहोस् (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletePartyMutation.isPending || (deleteMode === 'CASCADE' && confirmDeleteName.trim() !== partyToDelete.name.trim())}
                  className="px-5 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {deletePartyMutation.isPending ? 'मेटाउँदैछ...' : 'निश्चित रूपमा मेटाउनुहोस् (Confirm Delete)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

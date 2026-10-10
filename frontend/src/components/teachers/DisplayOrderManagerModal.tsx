'use client';

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { X, ArrowUpDown, Check, RotateCcw, Sparkles, Users, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface DisplayOrderManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: any[];
}

export default function DisplayOrderManagerModal({
  isOpen,
  onClose,
  staffList,
}: DisplayOrderManagerModalProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<{ id: number; fullName: string; fullNameNepali?: string; post?: string; taha?: string; displayOrder: number }[]>([]);

  useEffect(() => {
    if (staffList && staffList.length > 0) {
      setItems(
        staffList.map((s, idx) => ({
          id: s.id,
          fullName: s.fullName,
          fullNameNepali: s.fullNameNepali,
          post: s.post,
          taha: s.taha,
          displayOrder: s.displayOrder !== null && s.displayOrder !== undefined ? s.displayOrder : idx + 1,
        }))
      );
    }
  }, [staffList, isOpen]);

  const bulkReorderMutation = useMutation({
    mutationFn: async (payload: { items: { id: number; displayOrder: number }[] }) => {
      const res = await api.post('/teachers/bulk-reorder', payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'शिक्षकहरूको क्रम सफलतापूर्वक सुरक्षित भयो!');
      queryClient.invalidateQueries({ queryKey: ['teachers'] });
      queryClient.invalidateQueries({ queryKey: ['teachers-all-payroll'] });
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save order');
    },
  });

  const handleOrderChange = (id: number, val: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, displayOrder: val } : item))
    );
  };

  const autoSequence = () => {
    setItems((prev) =>
      prev.map((item, idx) => ({
        ...item,
        displayOrder: idx + 1,
      }))
    );
    toast.success('१ देखि क्रमैसँग अङ्क सेट गरियो (Numbered 1 to N).');
  };

  const sortByCurrentOrder = () => {
    setItems((prev) => [...prev].sort((a, b) => a.displayOrder - b.displayOrder));
  };

  const handleSave = () => {
    const payload = items.map((i) => ({
      id: i.id,
      displayOrder: i.displayOrder || 0,
    }));
    bulkReorderMutation.mutate({ items: payload });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="bg-[#1e3a5f] px-5 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={18} className="text-amber-300" />
            <div>
              <h3 className="text-sm font-extrabold">
                शिक्षक तथा कर्मचारी क्रमबद्ध अङ्क व्यवस्थापन (Staff Display Order Manager)
              </h3>
              <p className="text-[11px] text-blue-200 font-nepali">
                यहाँ तोकिएको क्रम नं. शिक्षक सूची, शिक्षक पोर्टल र पेरोल सिटमा प्राथमिकताका साथ प्रयोग हुन्छ।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={autoSequence}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles size={13} className="text-blue-600" />
              <span>१, २, ३... क्रमिक अङ्क भर्नुहोस् (Auto 1..N)</span>
            </button>

            <button
              type="button"
              onClick={sortByCurrentOrder}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowUpDown size={13} />
              <span>क्रम अनुसार मिलाउनुहोस् (Sort by Number)</span>
            </button>
          </div>

          <span className="text-xs font-bold text-gray-500">
            कुल: <strong className="text-[#1e3a5f]">{items.length}</strong> जना
          </span>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-2 flex-1 scrollbar-thin">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#1e3a5f]/5 text-[#1e3a5f] text-[11px] font-extrabold uppercase sticky top-0 bg-white">
              <tr>
                <th className="py-2 px-3 text-center w-20">क्रम नं. (Order)</th>
                <th className="py-2 px-3">कर्मचारीको नाम (Name)</th>
                <th className="py-2 px-3">पद / तह (Post / Level)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-blue-50/40 transition">
                  <td className="py-2 px-3 text-center">
                    <input
                      type="number"
                      min="0"
                      value={item.displayOrder}
                      onChange={(e) => handleOrderChange(item.id, parseInt(e.target.value) || 0)}
                      className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-gray-300 bg-white py-1 focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] focus:outline-hidden"
                    />
                  </td>
                  <td className="py-2 px-3 font-bold text-gray-900">
                    <div className="flex flex-col">
                      <span>{item.fullNameNepali || item.fullName}</span>
                      {item.fullNameNepali && (
                        <span className="text-[10.5px] font-normal text-gray-500">{item.fullName}</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-600">
                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                      {item.post || item.taha || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-gray-500 font-nepali">
            * परिवर्तन सुरक्षित गरेपछि तुरुन्तै शिक्षक सूची र पेरोलमा लागू हुनेछ।
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition cursor-pointer"
            >
              रद्द (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={bulkReorderMutation.isPending}
              className="px-5 py-2 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white text-xs font-bold transition cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={14} />
              <span>{bulkReorderMutation.isPending ? 'सुरक्षित हुँदैछ...' : 'क्रम सुरक्षित गर्नुहोस् (Save Order)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Sparkles,
  Building,
  CheckSquare,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Calendar,
  Layers,
  Search,
  BadgeCheck,
  FileCheck,
  Save,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExamAttendancePortalProps {
  initialExamId?: string | number;
}

export default function ExamAttendancePortal({ initialExamId }: ExamAttendancePortalProps) {
  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId ? String(initialExamId) : '');
  const [selectedDateBs, setSelectedDateBs] = useState<string>(todayBS());
  const [selectedShift, setSelectedShift] = useState<string>('DAY');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Local attendance state for the loaded roster: { [studentId]: { status: 'PRESENT'|'ABSENT'|'LATE'|'EXPELLED', bookletNo: '', remarks: '' } }
  const [rosterAttendance, setRosterAttendance] = useState<Record<number, { status: string; bookletNo: string; remarks: string }>>({});

  // Assign Incharge / Invigilator Modal State
  const [isAssignDutyModalOpen, setIsAssignDutyModalOpen] = useState(false);
  const [dutyTeacherId, setDutyTeacherId] = useState<string>('');
  const [dutyRole, setDutyRole] = useState<'HALL_INCHARGE' | 'INVIGILATOR' | 'RELIEVER'>('HALL_INCHARGE');
  const [dutyReportingTime, setDutyReportingTime] = useState<string>('06:45 AM');
  const [dutyRemarks, setDutyRemarks] = useState<string>('');

  // Fetch Exams
  const { data: examsData } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // Default to first exam if none selected
  useEffect(() => {
    if (examsData?.length > 0 && !selectedExamId) {
      setSelectedExamId(examsData[0].id.toString());
    }
  }, [examsData, selectedExamId]);

  const currentExam = examsData?.find((e: any) => e.id.toString() === selectedExamId);

  // Fetch Rooms
  const { data: roomsData } = useQuery({
    queryKey: ['exam-rooms'],
    queryFn: async () => {
      const res = await api.get('/seat-plans/rooms');
      return res.data?.data || [];
    },
  });

  const rooms: any[] = roomsData || [];

  // Default to first room if none selected
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(rooms[0].id.toString());
    }
  }, [rooms, selectedRoomId]);

  // Fetch Teachers for Hall Incharge Assignment
  const { data: teachersData } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const res = await api.get('/teachers');
      return res.data?.data || [];
    },
  });

  // Fetch Duties for Current Exam & Date & Shift & Room
  const { data: dutiesData, refetch: refetchDuties } = useQuery({
    queryKey: ['exam-duties', selectedExamId, selectedDateBs, selectedShift, selectedRoomId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const params = new URLSearchParams();
      if (selectedDateBs) params.append('dateBs', selectedDateBs);
      if (selectedShift) params.append('shift', selectedShift);
      if (selectedRoomId) params.append('roomId', selectedRoomId);
      const res = await api.get(`/exams/${selectedExamId}/duties?${params.toString()}`);
      return res.data?.data || [];
    },
    enabled: !!selectedExamId,
  });

  const currentRoomDuties: any[] = dutiesData || [];
  const hallIncharge = currentRoomDuties.find((d) => d.dutyRole === 'HALL_INCHARGE');
  const invigilators = currentRoomDuties.filter((d) => d.dutyRole !== 'HALL_INCHARGE');

  // Assign Duty Mutation
  const assignDutyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !selectedRoomId || !selectedDateBs || !dutyTeacherId) {
        throw new Error('Please select Teacher, Exam, Room, and Date.');
      }
      const res = await api.post(`/exams/${selectedExamId}/duties`, {
        examDateBs: selectedDateBs,
        shift: selectedShift,
        roomId: parseInt(selectedRoomId),
        teacherId: parseInt(dutyTeacherId),
        dutyRole,
        reportingTime: dutyReportingTime,
        remarks: dutyRemarks,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'परीक्षा हल ड्युटी सफलतापूर्वक तोकियो!');
      setIsAssignDutyModalOpen(false);
      setDutyTeacherId('');
      setDutyRemarks('');
      refetchDuties();
      queryClient.invalidateQueries({ queryKey: ['exam-duties'] });
      queryClient.invalidateQueries({ queryKey: ['my-exam-duties'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to assign duty');
    },
  });

  // Delete Duty Mutation
  const deleteDutyMutation = useMutation({
    mutationFn: async (dutyId: number) => {
      const res = await api.delete(`/exams/${selectedExamId}/duties/${dutyId}`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'परीक्षा ड्युटी हटाइयो!');
      refetchDuties();
      queryClient.invalidateQueries({ queryKey: ['exam-duties'] });
      queryClient.invalidateQueries({ queryKey: ['my-exam-duties'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete duty');
    },
  });

  // Available shifts for this exam
  const examShifts = currentExam?.shifts || [];
  const availableShifts = useMemo(() => {
    const list = [
      { name: 'MORNING', nameNepali: 'बिहानी सत्र (Morning Shift)', timing: '07:00 AM - 10:00 AM' },
      { name: 'DAY', nameNepali: 'दिवा सत्र (Day Shift)', timing: '11:00 AM - 02:00 PM' },
      { name: 'EVENING', nameNepali: 'साँझ सत्र (Evening Shift)', timing: '03:00 PM - 06:00 PM' },
    ];
    if (examShifts.length > 0) {
      examShifts.forEach((s: any) => {
        const idx = list.findIndex((x) => x.name === s.name);
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            nameNepali: s.nameNepali || list[idx].nameNepali,
            timing: s.startTime ? `${s.startTime} - ${s.endTime}` : list[idx].timing,
          };
        } else {
          list.push({
            name: s.name,
            nameNepali: s.nameNepali || s.name,
            timing: `${s.startTime || ''} - ${s.endTime || ''}`.trim(),
          });
        }
      });
    }
    return list;
  }, [examShifts]);

  // Fetch Room Attendance Roster from Backend
  const { data: attendanceData, isLoading: isRosterLoading } = useQuery({
    queryKey: ['exam-attendance', selectedExamId, selectedDateBs, selectedShift, selectedRoomId],
    queryFn: async () => {
      if (!selectedExamId || !selectedDateBs || !selectedRoomId) return null;
      const params = new URLSearchParams({
        dateBs: selectedDateBs,
        shift: selectedShift,
        roomId: selectedRoomId,
      });
      const res = await api.get(`/exams/${selectedExamId}/attendance?${params.toString()}`);
      return res.data?.data || null;
    },
    enabled: !!selectedExamId && !!selectedDateBs && !!selectedRoomId,
  });

  const studentsRoster: any[] = attendanceData?.students || [];

  // Populate local attendance state when backend data arrives
  useEffect(() => {
    if (studentsRoster && studentsRoster.length > 0) {
      const initialMap: Record<number, { status: string; bookletNo: string; remarks: string }> = {};
      studentsRoster.forEach((s) => {
        initialMap[s.studentId] = {
          status: s.status || 'PRESENT',
          bookletNo: s.bookletNo || '',
          remarks: s.remarks || '',
        };
      });
      setRosterAttendance(initialMap);
    } else {
      setRosterAttendance({});
    }
  }, [studentsRoster]);

  // Save Attendance Mutation
  const saveAttendanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId || !selectedDateBs || !selectedRoomId) {
        throw new Error('Please select Exam, Date, and Room.');
      }
      if (studentsRoster.length === 0) {
        throw new Error('No students seated in this room to record attendance for.');
      }

      const attendanceList = studentsRoster.map((s) => {
        const local = rosterAttendance[s.studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' };
        return {
          studentId: s.studentId,
          classId: s.classId,
          subjectId: s.subjectId,
          status: local.status,
          bookletNo: local.bookletNo,
          remarks: local.remarks,
        };
      });

      const res = await api.post(`/exams/${selectedExamId}/attendance`, {
        dateBs: selectedDateBs,
        shift: selectedShift,
        roomId: parseInt(selectedRoomId),
        attendanceList,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Exam attendance saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['exam-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['marks'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to save attendance');
    },
  });

  // Helpers to update individual student attendance
  const setStudentStatus = (studentId: number, status: string) => {
    setRosterAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' }),
        status,
      },
    }));
  };

  const setStudentBookletNo = (studentId: number, bookletNo: string) => {
    setRosterAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' }),
        bookletNo,
      },
    }));
  };

  const setStudentRemarks = (studentId: number, remarks: string) => {
    setRosterAttendance((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { status: 'PRESENT', bookletNo: '', remarks: '' }),
        remarks,
      },
    }));
  };

  const markAllPresent = () => {
    const updated: Record<number, { status: string; bookletNo: string; remarks: string }> = {};
    studentsRoster.forEach((s) => {
      updated[s.studentId] = {
        ...(rosterAttendance[s.studentId] || { bookletNo: '', remarks: '' }),
        status: 'PRESENT',
      };
    });
    setRosterAttendance(updated);
    toast.success('All students marked as Present!');
  };

  // Filter students by search
  const filteredRoster = useMemo(() => {
    if (!searchQuery.trim()) return studentsRoster;
    const q = searchQuery.toLowerCase().trim();
    return studentsRoster.filter((s) => {
      return (
        (s.fullName || '').toLowerCase().includes(q) ||
        (s.studentCode || '').toLowerCase().includes(q) ||
        (s.className || '').toLowerCase().includes(q) ||
        (s.subjectName || '').toLowerCase().includes(q) ||
        String(s.rollNo || '').includes(q) ||
        String(s.benchNo || '').includes(q)
      );
    });
  }, [studentsRoster, searchQuery]);

  // Statistics Summary
  const stats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let expelled = 0;

    studentsRoster.forEach((s) => {
      const st = rosterAttendance[s.studentId]?.status || 'PRESENT';
      if (st === 'ABSENT') absent++;
      else if (st === 'LATE') late++;
      else if (st === 'EXPELLED') expelled++;
      else present++;
    });

    const total = studentsRoster.length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';

    return { total, present, absent, late, expelled, rate };
  }, [studentsRoster, rosterAttendance]);

  // Print Attendance Sheet (परीक्षा हल विद्यार्थी हाजिरी तथा हस्ताक्षर फाराम)
  const printAttendanceSheet = () => {
    if (studentsRoster.length === 0) {
      toast.error('No attendance roster to print.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const examTitle = currentExam ? `${currentExam.name} ${currentExam.nameNepali ? `(${currentExam.nameNepali})` : ''}` : 'Examination';
    const roomInfo = rooms.find((r) => r.id.toString() === selectedRoomId);
    const shiftInfo = availableShifts.find((s) => s.name === selectedShift);

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Attendance & Signature Roster - ${examTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; font-size: 10px; margin: 0; padding: 0; color: #111; line-height: 1.25; }
          .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 5px; margin-bottom: 8px; }
          .school-name { font-size: 15px; font-weight: 800; color: #1e3a5f; text-transform: uppercase; }
          .school-sub { font-size: 11px; font-weight: 600; color: #444; margin-top: 1px; }
          .sheet-title { font-size: 12.5px; font-weight: 800; color: #991b1b; margin-top: 4px; text-decoration: underline; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 8px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; font-size: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5px; }
          th, td { border: 1px solid #475569; padding: 4px 5px; text-align: left; vertical-align: middle; }
          th { background: #f1f5f9; font-weight: 800; color: #0f172a; text-transform: uppercase; font-size: 9px; }
          .text-center { text-align: center; }
          .font-mono { font-family: monospace; }
          .font-bold { font-weight: 700; }
          .present { color: #166534; font-weight: bold; }
          .absent { color: #991b1b; font-weight: bold; background: #fee2e2; }
          .sign-cell { height: 26px; border: 1px solid #64748b; background: #fafafa; }
          .summary-box { display: flex; justify-content: space-between; font-size: 10px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 5px 10px; border-radius: 4px; margin-bottom: 15px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 30px; font-size: 10px; }
          .sig-box { text-align: center; border-top: 1px dashed #333; padding-top: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">श्री नेपाल राष्ट्रिय माध्यमिक विद्यालय</div>
          <div class="school-sub">गरुडा-४, रौतहट, मधेस प्रदेश, नेपाल</div>
          <div class="sheet-title">परीक्षा हल विद्यार्थी हाजिरी तथा हस्ताक्षर फाराम (EXAM HALL ATTENDANCE & SIGNATURE ROSTER)</div>
        </div>

        <div class="meta-grid">
          <div><strong>परीक्षा (Exam):</strong> ${examTitle}</div>
          <div><strong>मिति (Date):</strong> ${selectedDateBs} BS</div>
          <div><strong>सत्र (Shift):</strong> ${shiftInfo?.nameNepali || selectedShift}</div>
          <div><strong>हल/कोठा (Room):</strong> ${roomInfo?.roomNo || 'Room'} ${roomInfo?.building ? `(${roomInfo.building})` : ''}</div>
          <div style="grid-column: span 2;"><strong>हल इन्चार्ज (Incharge):</strong> ${hallIncharge?.teacher?.fullName || 'तोकिएको छैन'}</div>
          <div style="grid-column: span 2;"><strong>निरीक्षक (Invigilators):</strong> ${invigilators.map((i: any) => i.teacher?.fullName).filter(Boolean).join(', ') || '—'}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 24px;" class="text-center">क्र.सं.</th>
              <th style="width: 40px;" class="text-center">रोल नं</th>
              <th style="width: 75px;" class="text-center">सिम्बोल / EMIS</th>
              <th>विद्यार्थीको नाम (Student Name)</th>
              <th style="width: 55px;">कक्षा</th>
              <th style="width: 55px;" class="text-center">सिट/बेन्च</th>
              <th style="width: 100px;">आजको विषय (Today)</th>
              <th style="width: 105px;">भोलिको विषय (Tomorrow)</th>
              <th style="width: 65px;">उत्तरपुस्तिका नं</th>
              <th style="width: 95px;" class="text-center">विद्यार्थीको हस्ताक्षर (Sign)</th>
              <th style="width: 40px;" class="text-center">हाजिरी</th>
            </tr>
          </thead>
          <tbody>
            ${studentsRoster
              .map((s, idx) => {
                const st = rosterAttendance[s.studentId]?.status || 'PRESENT';
                const bNo = rosterAttendance[s.studentId]?.bookletNo || s.bookletNo || '';
                const emisOrSym = s.symbolNo || s.emisId || s.studentCode || '—';
                const todaySub = s.todaySubjectName || s.subjectName || '—';
                const tomorrowSub = s.tomorrowSubjectName || '—';

                return `
                  <tr>
                    <td class="text-center font-mono font-bold">${idx + 1}</td>
                    <td class="text-center font-mono font-bold">${s.rollNo || '—'}</td>
                    <td class="text-center font-mono">${emisOrSym}</td>
                    <td><strong>${s.fullName || s.studentName}</strong></td>
                    <td>${s.className} ${s.section ? `(${s.section})` : ''}</td>
                    <td class="text-center font-mono">B-${s.benchNo} (${s.seatPosition === 'LEFT' ? 'L' : s.seatPosition === 'RIGHT' ? 'R' : 'M'})</td>
                    <td><strong>${todaySub}</strong></td>
                    <td style="color: #1e3a5f; font-weight: 600;">${tomorrowSub}</td>
                    <td class="font-mono"></td>
                    <td class="sign-cell"></td>
                    <td class="text-center font-mono"></td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>

        <div class="summary-box">
          <div>कुल सिट संख्या: <b>${stats.total}</b></div>
          <div>उपस्थित (Present): <b>_______</b></div>
          <div>अनुपस्थित (Absent): <b>_______</b></div>
          <div>निष्काशित (Expelled): <b>_______</b></div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong>${hallIncharge?.teacher?.fullName || '...........................'}</strong><br/>
            हल इन्चार्ज / निरीक्षकको हस्ताक्षर
          </div>
          <div class="sig-box">
            <strong>........................................</strong><br/>
            सिट योजना / परीक्षा समिति
          </div>
          <div class="sig-box">
            <strong>........................................</strong><br/>
            केन्द्राध्यक्ष / प्रधानाध्यापक
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      {/* ─── HEADER & FILTER BAR ────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-blue-200/80 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-black text-[#1e3a5f] flex items-center gap-2">
              <CheckSquare size={20} className="text-blue-600" />
              <span>Room-Wise Exam Attendance Portal (परीक्षा कोठा हाजिरी)</span>
            </h2>
            <p className="text-xs text-gray-500 font-nepali mt-0.5">
              प्रत्येक कोठाका निरीक्षक शिक्षकले लिने प्रत्यक्ष हाजिरी &bull; अनुपस्थित (Absent) विद्यार्थीको अङ्क प्रविष्टिमा स्वतः Absent सिंक हुन्छ।
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={printAttendanceSheet}
              disabled={studentsRoster.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 transition shadow-2xs disabled:opacity-40"
            >
              <Printer size={14} className="text-blue-600" />
              <span>Print Attendance Roster (प्रिन्ट)</span>
            </button>

            <button
              type="button"
              onClick={markAllPresent}
              disabled={studentsRoster.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-900 transition shadow-2xs disabled:opacity-40"
            >
              <CheckCircle2 size={14} className="text-emerald-700" />
              <span>Mark All Present (सबै उपस्थित)</span>
            </button>

            <button
              type="button"
              onClick={() => saveAttendanceMutation.mutate()}
              disabled={saveAttendanceMutation.isPending || studentsRoster.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50"
            >
              <Save size={14} />
              <span>{saveAttendanceMutation.isPending ? 'Saving...' : 'Save Attendance (हाजिरी सुरक्षित)'}</span>
            </button>
          </div>
        </div>

        {/* ── Selection Dropdowns ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Exam Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Examination *</label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="erp-input font-bold text-[#1e3a5f]"
            >
              {examsData?.map((ex: any) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.nameNepali || 'नेपाली'})
                </option>
              ))}
            </select>
          </div>

          {/* Exam Date BS */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Date (BS) *</label>
            <input
              type="text"
              required
              value={selectedDateBs}
              onChange={(e) => setSelectedDateBs(e.target.value)}
              placeholder="e.g. 2083-05-15"
              className="erp-input font-mono font-bold"
            />
          </div>

          {/* Shift Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Shift (सत्र) *</label>
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="erp-input font-bold"
            >
              {availableShifts.map((sh) => (
                <option key={sh.name} value={sh.name}>
                  {sh.nameNepali} ({sh.timing})
                </option>
              ))}
            </select>
          </div>

          {/* Room Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">Exam Room (परीक्षा कोठा) *</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="erp-input font-bold text-blue-900"
            >
              {rooms.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.roomNo} ({r.building || 'Main Block'} &bull; {r.totalCapacity || r.totalBenches * 2} Seats)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ─── Assigned Hall Incharge & Invigilator Personnel Bar ─── */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 p-4 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-[#1e3a5f] flex items-center gap-1.5 uppercase text-[11px] tracking-wide">
                <Building size={14} className="text-blue-700" />
                <span>{rooms.find((r) => r.id.toString() === selectedRoomId)?.roomNo || 'Room'} &bull; हल कर्मचारी (Duty Personnel):</span>
              </span>

              {hallIncharge ? (
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100/90 border border-amber-300 px-3 py-1 font-bold text-amber-900 shadow-2xs">
                  <span>👑 हल इन्चार्ज:</span>
                  <span className="text-black font-extrabold">{hallIncharge.teacher?.fullName}</span>
                  {hallIncharge.teacher?.phone && (
                    <span className="text-[10px] text-amber-800 font-mono">({hallIncharge.teacher.phone})</span>
                  )}
                  {hallIncharge.reportingTime && (
                    <span className="text-[9px] bg-amber-200/70 text-amber-950 px-1.5 py-0.5 rounded font-mono font-bold">
                      {hallIncharge.reportingTime}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteDutyMutation.mutate(hallIncharge.id)}
                    className="text-red-500 hover:text-red-700 ml-1 p-0.5"
                    title="Remove Hall Incharge"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                  <AlertTriangle size={12} />
                  <span>हल इन्चार्ज तोकिएको छैन (No Incharge Assigned)</span>
                </span>
              )}

              {invigilators.map((inv: any) => (
                <span
                  key={inv.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-semibold text-indigo-900"
                >
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">{inv.dutyRole}:</span>
                  <span>{inv.teacher?.fullName}</span>
                  <button
                    type="button"
                    onClick={() => deleteDutyMutation.mutate(inv.id)}
                    className="text-red-400 hover:text-red-600 ml-0.5"
                    title="Remove Invigilator"
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-[10.5px] text-gray-500 font-nepali">
              यस दिनको परीक्षा हलमा तोकिएका शिक्षकले आफ्नो Teacher Portal बाट सोझै यस कोठाका विद्यार्थीहरूको हाजिरी लिन सक्नुहुन्छ।
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setDutyTeacherId('');
              setDutyRole('HALL_INCHARGE');
              setIsAssignDutyModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-4 py-2 font-bold text-white transition shadow-2xs whitespace-nowrap"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>+ हल इन्चार्ज / निरीक्षक तोक्नुहोस्</span>
          </button>
        </div>

        {/* Live Attendance Stats Metrics */}
        {studentsRoster.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100 font-mono text-xs">
            <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-200/70 text-center">
              <span className="text-[10.5px] text-gray-500 block">कुल सिट (Total Seated)</span>
              <span className="text-base font-black text-gray-900">{stats.total}</span>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2.5 border border-emerald-200 text-center">
              <span className="text-[10.5px] text-emerald-800 font-bold block">🟢 उपस्थित (Present)</span>
              <span className="text-base font-black text-emerald-700">{stats.present}</span>
            </div>
            <div className="rounded-xl bg-rose-50 p-2.5 border border-rose-200 text-center">
              <span className="text-[10.5px] text-rose-800 font-bold block">🔴 अनुपस्थित (Absent)</span>
              <span className="text-base font-black text-rose-700">{stats.absent}</span>
            </div>
            <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200 text-center">
              <span className="text-[10.5px] text-amber-800 font-bold block">🟡 ढिलो (Late)</span>
              <span className="text-base font-black text-amber-700">{stats.late}</span>
            </div>
            <div className="rounded-xl bg-purple-50 p-2.5 border border-purple-200 text-center">
              <span className="text-[10.5px] text-purple-800 font-bold block">📊 उपस्थिति दर (Rate)</span>
              <span className="text-base font-black text-purple-900">{stats.rate}%</span>
            </div>
          </div>
        )}
      </div>

      {/* ─── STUDENTS ATTENDANCE ROSTER TABLE ─────────────────────────────────── */}
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck size={18} className="text-blue-600" />
            <h3 className="text-sm font-extrabold text-gray-900">
              Exam Roster for {rooms.find((r) => r.id.toString() === selectedRoomId)?.roomNo || 'Room'} &bull; {selectedShift} Shift
            </h3>
          </div>

          <div className="w-full sm:w-64 relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, roll, bench..."
              className="erp-input pl-8 py-1.5 text-xs font-medium w-full"
            />
          </div>
        </div>

        {isRosterLoading ? (
          <div className="py-12 text-center text-gray-400 text-xs">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1e3a5f] border-t-transparent" />
            <p className="mt-2">Loading seated students for this room and shift...</p>
          </div>
        ) : filteredRoster.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center space-y-2">
            <AlertTriangle className="mx-auto text-amber-500" size={30} />
            <p className="text-xs font-bold text-gray-700">No Seated Students Found in this Room for {selectedShift} Shift</p>
            <p className="text-[11px] text-gray-400 max-w-md mx-auto">
              Please make sure seat planning has been generated for this exam and shift in &quot;Seat Planning&quot; console, and that this room is selected.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e3a5f] text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3">Bench / Seat</th>
                  <th className="py-2.5 px-2">Roll</th>
                  <th className="py-2.5 px-2.5">EMIS / Symbol</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-2">Class</th>
                  <th className="py-2.5 px-3">आजको विषय (Today)</th>
                  <th className="py-2.5 px-3">भोलिको विषय (Tomorrow)</th>
                  <th className="py-2.5 px-3 text-center">Attendance Status</th>
                  <th className="py-2.5 px-2.5">Booklet No (उत्तरपुस्तिका)</th>
                  <th className="py-2.5 px-2 text-center">Sign Verified</th>
                  <th className="py-2.5 px-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRoster.map((s, idx) => {
                  const currentStatus = rosterAttendance[s.studentId]?.status || 'PRESENT';
                  const currentBookletNo = rosterAttendance[s.studentId]?.bookletNo || '';
                  const currentRemarks = rosterAttendance[s.studentId]?.remarks || '';

                  const isAbsent = currentStatus === 'ABSENT';
                  const isLate = currentStatus === 'LATE';
                  const isExpelled = currentStatus === 'EXPELLED';
                  const emisOrSym = s.symbolNo || s.emisId || s.studentCode || '—';
                  const todaySub = s.todaySubjectName || s.subjectName || '—';
                  const tomorrowSub = s.tomorrowSubjectName || '—';

                  return (
                    <tr
                      key={s.studentId}
                      className={`hover:bg-slate-50/80 transition ${
                        isAbsent ? 'bg-rose-50/40' : isLate ? 'bg-amber-50/30' : isExpelled ? 'bg-red-100/50' : ''
                      }`}
                    >
                      {/* Bench & Seat */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200">
                          B-{s.benchNo} &bull; {s.seatPosition}
                        </span>
                      </td>

                      {/* Roll No */}
                      <td className="py-2.5 px-2 font-mono font-bold text-gray-700">
                        {s.rollNo || '—'}
                      </td>

                      {/* EMIS / Symbol No */}
                      <td className="py-2.5 px-2.5 font-mono text-[10.5px] text-blue-900 font-semibold">
                        {emisOrSym}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-3">
                        <p className="font-extrabold text-gray-900">{s.fullName || s.studentName}</p>
                        {s.fullNameNepali && (
                          <p className="text-[10px] text-gray-500">{s.fullNameNepali}</p>
                        )}
                      </td>

                      {/* Class */}
                      <td className="py-2.5 px-2 font-bold text-blue-900">
                        <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200 text-[10.5px]">
                          {s.className}
                        </span>
                      </td>

                      {/* Subject on Date */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-purple-900 text-[11px]">
                          {todaySub}
                        </span>
                      </td>

                      {/* Tomorrow's Subject */}
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-[#1e3a5f] text-[11px]">
                          {tomorrowSub}
                        </span>
                      </td>

                      {/* Attendance Buttons */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setStudentStatus(s.studentId, 'PRESENT')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] transition cursor-pointer ${
                              currentStatus === 'PRESENT'
                                ? 'bg-emerald-600 text-white shadow-2xs font-extrabold'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            Present
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(s.studentId, 'ABSENT')}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10.5px] transition cursor-pointer ${
                              isAbsent
                                ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>

                          <button
                            type="button"
                            onClick={() => setStudentStatus(s.studentId, 'LATE')}
                            className={`px-2 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                              isLate
                                ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                                : 'bg-slate-100 text-gray-500 hover:bg-slate-200'
                            }`}
                          >
                            Late
                          </button>
                        </div>
                      </td>

                      {/* Booklet Number */}
                      <td className="py-2.5 px-2.5">
                        <input
                          type="text"
                          value={currentBookletNo}
                          disabled={isAbsent}
                          onChange={(e) => setStudentBookletNo(s.studentId, e.target.value)}
                          placeholder={isAbsent ? 'Absent' : 'Booklet...'}
                          className="erp-input font-mono text-[11px] py-1 px-2 disabled:bg-gray-100 disabled:text-gray-400 w-24"
                        />
                      </td>

                      {/* Sign Verified Checkbox */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="checkbox"
                          disabled={isAbsent}
                          checked={!isAbsent && !!currentRemarks.includes('[SIGN_OK]')}
                          onChange={(e) => {
                            const isChecked = e.target.checked;
                            let newRem = currentRemarks.replace('[SIGN_OK]', '').trim();
                            if (isChecked) {
                              newRem = newRem ? `${newRem} [SIGN_OK]` : '[SIGN_OK]';
                            }
                            setStudentRemarks(s.studentId, newRem);
                          }}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                          title="हस्ताक्षर लिइयो / प्रमाणित गरियो (Signature Captured)"
                        />
                      </td>

                      {/* Remarks */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={currentRemarks.replace('[SIGN_OK]', '').trim()}
                          onChange={(e) => {
                            const val = e.target.value;
                            const hasSign = currentRemarks.includes('[SIGN_OK]');
                            setStudentRemarks(s.studentId, hasSign ? `${val} [SIGN_OK]`.trim() : val);
                          }}
                          placeholder="Remarks..."
                          className="erp-input text-[11px] py-1 px-2"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Save Bar */}
        {studentsRoster.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 font-nepali">
              💡 हाजिरी सेभ गर्दा अनुपस्थित (Absent) विद्यार्थीहरूको अङ्क तालिका (Mark Entry) मा स्वतः Absent सेट हुन्छ।
            </p>

            <button
              type="button"
              onClick={() => saveAttendanceMutation.mutate()}
              disabled={saveAttendanceMutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 hover:bg-blue-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
            >
              <Save size={15} />
              <span>{saveAttendanceMutation.isPending ? 'Saving...' : 'Save Exam Attendance (हाजिरी सुरक्षित)'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL: ASSIGN HALL INCHARGE & INVIGILATOR ─── */}
      {isAssignDutyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-[#1e3a5f] flex items-center gap-2">
                  <Building size={16} className="text-blue-600" />
                  <span>हल इन्चार्ज तथा निरीक्षक तोक्नुहोस्</span>
                </h3>
                <p className="text-[11px] text-gray-500 font-nepali">
                  {rooms.find((r) => r.id.toString() === selectedRoomId)?.roomNo} &bull; मिति: {selectedDateBs} &bull; {selectedShift} सत्र
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignDutyModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Select Teacher */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Teacher (शिक्षक छान्नुहोस्) *</label>
                <select
                  required
                  value={dutyTeacherId}
                  onChange={(e) => setDutyTeacherId(e.target.value)}
                  className="erp-input font-bold text-[#1e3a5f]"
                >
                  <option value="">-- शिक्षक छान्नुहोस् --</option>
                  {teachersData?.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.phone ? `(${t.phone})` : ''} - {t.designation || t.post || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Role */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Duty Role (जिम्मेवारी / पद) *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDutyRole('HALL_INCHARGE')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      dutyRole === 'HALL_INCHARGE'
                        ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs font-extrabold'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    👑 हल इन्चार्ज
                  </button>
                  <button
                    type="button"
                    onClick={() => setDutyRole('INVIGILATOR')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      dutyRole === 'INVIGILATOR'
                        ? 'bg-blue-100 border-blue-400 text-blue-900 shadow-2xs font-extrabold'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    🛡️ निरीक्षक
                  </button>
                  <button
                    type="button"
                    onClick={() => setDutyRole('RELIEVER')}
                    className={`p-2 rounded-xl border text-center font-bold transition ${
                      dutyRole === 'RELIEVER'
                        ? 'bg-purple-100 border-purple-400 text-purple-900 shadow-2xs font-extrabold'
                        : 'border-gray-200 text-gray-600 hover:bg-slate-50'
                    }`}
                  >
                    🤝 सह-निरीक्षक
                  </button>
                </div>
              </div>

              {/* Reporting Time */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Reporting Time (उपस्थिति समय)</label>
                <input
                  type="text"
                  value={dutyReportingTime}
                  onChange={(e) => setDutyReportingTime(e.target.value)}
                  placeholder="e.g. 06:45 AM / 10:30 AM"
                  className="erp-input font-mono font-bold"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">Remarks / Note (कैफियत)</label>
                <input
                  type="text"
                  value={dutyRemarks}
                  onChange={(e) => setDutyRemarks(e.target.value)}
                  placeholder="e.g. Handle question booklet distribution"
                  className="erp-input"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAssignDutyModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 font-semibold text-gray-600 hover:bg-gray-50"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                type="button"
                disabled={assignDutyMutation.isPending || !dutyTeacherId}
                onClick={() => assignDutyMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 px-5 py-2 font-bold text-white shadow-sm disabled:opacity-50"
              >
                <Save size={14} />
                <span>{assignDutyMutation.isPending ? 'Saving...' : 'ड्युटी सुरक्षित गर्नुहोस्'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

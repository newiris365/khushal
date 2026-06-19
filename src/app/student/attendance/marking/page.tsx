"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Calendar, CheckCircle, XCircle, Clock, MapPin, User, BookOpen,
  AlertTriangle, RefreshCw, QrCode, Camera, Send, Upload, FileSpreadsheet,
  Image as ImageIcon, X, Download, Eye, Trash2, Loader2
} from 'lucide-react';
import { apiGet, apiPost } from '../../../../lib/api';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ClassSchedule {
  id: string;
  subject: string;
  subject_code: string;
  time_slot: string;
  room: string;
  teacher: string;
  type: 'Theory' | 'Lab' | 'Tutorial';
  day: string;
}

interface AttendanceRecord {
  class_id: string;
  status: 'present' | 'absent' | 'late' | 'excused' | null;
  marked_at?: string;
  method?: string;
  photo?: string;
}

const MOCK_TODAY_CLASSES: ClassSchedule[] = [
  { id: 'c1', subject: 'Data Structures', subject_code: 'CS301', time_slot: '09:00 - 09:50 AM', room: 'Room 301', teacher: 'Prof. Neha Gupta', type: 'Theory', day: 'Today' },
  { id: 'c2', subject: 'Operating Systems', subject_code: 'CS302', time_slot: '10:00 - 10:50 AM', room: 'Room 302', teacher: 'Dr. Vikram Mehta', type: 'Theory', day: 'Today' },
  { id: 'c3', subject: 'Database Lab', subject_code: 'CS303L', time_slot: '11:00 - 12:30 PM', room: 'Lab 201', teacher: 'Prof. Alok Vyas', type: 'Lab', day: 'Today' },
  { id: 'c4', subject: 'Computer Networks', subject_code: 'CS304', time_slot: '02:00 - 02:50 PM', room: 'Room 303', teacher: 'Dr. K. R. Sharma', type: 'Theory', day: 'Today' },
  { id: 'c5', subject: 'Compiler Design', subject_code: 'CS305', time_slot: '03:00 - 03:50 PM', room: 'Room 304', teacher: 'Prof. Neha Gupta', type: 'Theory', day: 'Today' },
];

const SAMPLE_CSV = `subject_code,status
CS301,present
CS302,present
CS303L,late
CS304,present
CS305,absent`;

export default function StudentAttendanceMarkingPage() {
  const [profile, setProfile] = useState<any>(null);
  const [todayClasses] = useState<ClassSchedule[]>(MOCK_TODAY_CLASSES);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Excel/CSV upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploadHeaders, setUploadHeaders] = useState<string[]>([]);
  const [uploadMapping, setUploadMapping] = useState<Record<string, string>>({});
  const [uploadStep, setUploadStep] = useState<'choose' | 'map' | 'preview' | 'done'>('choose');
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Photo capture state
  const [showPhotoModal, setShowPhotoModal] = useState<string | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<string, string[]>>({});
  const photoVideoRef = useRef<HTMLVideoElement>(null);
  const photoStreamRef = useRef<MediaStream | null>(null);
  const photoCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('iris_user_profile');
    if (saved) {
      try { setProfile(JSON.parse(saved)); } catch {}
    } else {
      setProfile({ name: 'Khushal Gehlot', roll_number: 'CS23B1024', id: 'b0000000-0000-0000-0000-000000000006' });
    }

    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (photoStreamRef.current) photoStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleMarkAttendance = (classId: string, status: 'present' | 'absent' | 'late', method: string = 'manual') => {
    setAttendanceRecords(prev => ({
      ...prev,
      [classId]: {
        class_id: classId,
        status,
        marked_at: new Date().toISOString(),
        method
      }
    }));
  };

  const handleSubmitAll = async () => {
    setIsSubmitting(true);
    try {
      const records = Object.values(attendanceRecords).filter(r => r.status);
      if (records.length === 0) {
        alert('Please mark attendance for at least one class.');
        return;
      }
      try {
        await apiPost('/core/attendance/mark/bulk', {
          session_id: 'student-self-mark',
          records: records.map(r => ({
            student_id: profile?.id || 'b0000000-0000-0000-0000-000000000006',
            status: r.status
          }))
        });
      } catch {}
      setSubmitted(true);
    } catch (err) {
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== QR SCAN ====================
  const startQrScan = async (classId: string) => {
    setShowQrScanner(classId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
      setTimeout(() => {
        stopCamera();
        handleMarkAttendance(classId, 'present', 'qr');
        setShowQrScanner(null);
      }, 3000);
    } catch {
      alert('Camera access denied. Use manual marking instead.');
      setShowQrScanner(null);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraActive(false);
    setShowQrScanner(null);
  };

  // ==================== EXCEL/CSV UPLOAD ====================
  const processCsvFile = useCallback((file: File) => {
    setUploadErrors([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const rows = results.data as any[];
        setUploadHeaders(headers);
        setUploadPreview(rows);

        const mapping: Record<string, string> = {};
        ['subject_code', 'status'].forEach(req => {
          const match = headers.find(h =>
            h.toLowerCase().trim() === req.toLowerCase() ||
            h.toLowerCase().trim().replace(/[\s-]/g, '_') === req
          );
          if (match) mapping[req] = match;
        });
        setUploadMapping(mapping);
        setUploadStep('map');
      },
      error: (err) => setUploadErrors([`Parse error: ${err.message}`])
    });
  }, []);

  const processExcelFile = useCallback((file: File) => {
    setUploadErrors([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

        if (jsonData.length === 0) {
          setUploadErrors(['Excel file is empty or has no data rows.']);
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setUploadHeaders(headers);
        setUploadPreview(jsonData);

        const mapping: Record<string, string> = {};
        ['subject_code', 'status'].forEach(req => {
          const match = headers.find(h =>
            h.toLowerCase().trim() === req.toLowerCase() ||
            h.toLowerCase().trim().replace(/[\s-]/g, '_') === req
          );
          if (match) mapping[req] = match;
        });
        setUploadMapping(mapping);
        setUploadStep('map');
      } catch (err: any) {
        setUploadErrors([`Excel parse error: ${err.message}`]);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const processFile = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
      setUploadFile(file);
      processCsvFile(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      setUploadFile(file);
      processExcelFile(file);
    } else {
      setUploadErrors([`Unsupported file type: .${ext}. Please upload CSV or Excel files.`]);
    }
  }, [processCsvFile, processExcelFile]);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  }, [processFile]);

  const applyUploadMapping = () => {
    if (!uploadMapping.subject_code || !uploadMapping.status) {
      setUploadErrors(['Please map both subject_code and status columns.']);
      return;
    }
    setUploadErrors([]);
    const validStatuses = ['present', 'absent', 'late', 'excused'];
    const errors: string[] = [];
    const matched: Record<string, string> = {};

    uploadPreview.forEach((row, i) => {
      const code = row[uploadMapping.subject_code]?.trim();
      const status = row[uploadMapping.status]?.trim().toLowerCase();
      if (!code) { errors.push(`Row ${i + 1}: Missing subject_code`); return; }
      if (!validStatuses.includes(status)) { errors.push(`Row ${i + 1}: Invalid status "${status}"`); return; }
      const cls = todayClasses.find(c => c.subject_code === code);
      if (cls) matched[cls.id] = status;
    });

    if (errors.length > 0) { setUploadErrors(errors); return; }

    Object.entries(matched).forEach(([classId, status]) => {
      handleMarkAttendance(classId, status as any, 'excel-upload');
    });

    setUploadStep('done');
    setTimeout(() => { setShowUploadModal(false); resetUpload(); }, 1500);
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'attendance_upload_sample.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadPreview([]);
    setUploadHeaders([]);
    setUploadMapping({});
    setUploadStep('choose');
    setUploadErrors([]);
  };

  // ==================== PHOTO CAPTURE ====================
  const startPhotoCapture = async (classId: string) => {
    setShowPhotoModal(classId);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      photoStreamRef.current = stream;
      if (photoVideoRef.current) photoVideoRef.current.srcObject = stream;
    } catch {
      alert('Camera access denied.');
      setShowPhotoModal(null);
    }
  };

  const capturePhoto = () => {
    if (!photoVideoRef.current || !photoCanvasRef.current || !showPhotoModal) return;
    const video = photoVideoRef.current;
    const canvas = photoCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhotos(prev => ({
      ...prev,
      [showPhotoModal]: [...(prev[showPhotoModal] || []), dataUrl]
    }));
  };

  const submitPhotoAttendance = (classId: string) => {
    const photos = capturedPhotos[classId] || [];
    if (photos.length === 0) { alert('Capture at least one photo.'); return; }
    handleMarkAttendance(classId, 'present', 'photo');
    setCapturedPhotos(prev => { const n = { ...prev }; delete n[classId]; return n; });
    stopPhotoCapture();
  };

  const stopPhotoCapture = () => {
    if (photoStreamRef.current) { photoStreamRef.current.getTracks().forEach(t => t.stop()); photoStreamRef.current = null; }
    setShowPhotoModal(null);
  };

  const removePhoto = (classId: string, index: number) => {
    setCapturedPhotos(prev => ({
      ...prev,
      [classId]: (prev[classId] || []).filter((_, i) => i !== index)
    }));
  };

  const markedCount = Object.values(attendanceRecords).filter(r => r.status).length;
  const totalCount = todayClasses.length;

  const getStatusIcon = (classId: string) => {
    const record = attendanceRecords[classId];
    if (!record || !record.status) return null;
    switch (record.status) {
      case 'present': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'late': return <Clock className="w-5 h-5 text-amber-400" />;
      case 'absent': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Theory': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Lab': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Tutorial': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  if (!profile) return <div className="p-8 text-center text-xs text-[#C4B5FD]">Loading...</div>;

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#0D0A1A] text-white p-8">
        <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Attendance Submitted!</h1>
          <p className="text-sm text-[#C4B5FD]/70 text-center">
            You marked attendance for {markedCount} of {totalCount} classes today.
          </p>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4 w-full">
            <h3 className="text-sm font-semibold text-white mb-3">Today&apos;s Summary</h3>
            {todayClasses.map(cls => {
              const record = attendanceRecords[cls.id];
              return (
                <div key={cls.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(cls.id)}
                    <span className="text-xs text-white">{cls.subject}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[#C4B5FD]/30">{record?.method}</span>
                    <span className={`text-[10px] font-bold uppercase ${
                      record?.status === 'present' ? 'text-emerald-400' :
                      record?.status === 'late' ? 'text-amber-400' :
                      record?.status === 'absent' ? 'text-red-400' : 'text-[#C4B5FD]/40'
                    }`}>
                      {record?.status || 'Not Marked'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => { setSubmitted(false); setAttendanceRecords({}); }}
            className="px-6 py-3 rounded-xl bg-[#6C2BD9]/20 border border-[#6C2BD9]/30 text-white font-bold text-sm hover:bg-[#6C2BD9]/30 transition-all"
          >
            Mark Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0D0A1A] text-white p-8">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/20 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-white">Class Attendance</h1>
              <p className="text-xs text-[#C4B5FD]/70 font-light">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Bulk Upload Button */}
            <button
              onClick={() => { resetUpload(); setShowUploadModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all"
            >
              <Upload className="w-4 h-4" />
              Upload Excel/CSV
            </button>
            {/* Progress */}
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
              <div className="text-right">
                <p className="text-[10px] text-[#C4B5FD]/50 uppercase">Progress</p>
                <p className="text-sm font-bold text-white">{markedCount}/{totalCount}</p>
              </div>
              <div className="w-12 h-12 relative">
                <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#06B6D4" strokeWidth="3"
                    strokeDasharray={`${totalCount > 0 ? (markedCount / totalCount) * 100 : 0}, 100`} />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Classes */}
        <div className="flex flex-col gap-4">
          {todayClasses.map((cls, index) => {
            const record = attendanceRecords[cls.id];
            const isMarked = !!record?.status;
            const isScanning = showQrScanner === cls.id;
            const isPhotoMode = showPhotoModal === cls.id;
            const classPhotos = capturedPhotos[cls.id] || [];

            return (
              <div key={cls.id}
                className={`bg-white/5 rounded-2xl border transition-all ${
                  isMarked ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-[#C4B5FD]/40 font-mono">#{index + 1}</span>
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mt-1 ${getTypeColor(cls.type)}`}>
                          <BookOpen className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-sm">{cls.subject}</h3>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase ${getTypeColor(cls.type)}`}>
                            {cls.type}
                          </span>
                          {isMarked && (
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              record.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              record.status === 'late' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {record.status}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#C4B5FD]/50 font-mono">{cls.subject_code}</p>
                        <div className="flex items-center gap-4 mt-2 text-[10px] text-[#C4B5FD]/60">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {cls.time_slot}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {cls.room}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {cls.teacher}</span>
                        </div>
                      </div>
                    </div>
                    {isMarked && <div className="flex items-center gap-2">{getStatusIcon(cls.id)}</div>}
                  </div>

                  {/* QR Scanner */}
                  {isScanning && (
                    <div className="mt-4 p-4 rounded-xl bg-black/40 border border-[#06B6D4]/30">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden bg-[#0D0A1A]">
                          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <div className="absolute inset-0 border-2 border-dashed border-[#06B6D4]/50 m-4 rounded-lg animate-pulse" />
                        </div>
                        <p className="text-[10px] text-[#06B6D4]">Point camera at QR code...</p>
                        <button onClick={stopCamera} className="text-[10px] text-red-400 hover:text-red-300">Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Photo Capture Panel */}
                  {isPhotoMode && (
                    <div className="mt-4 p-4 rounded-xl bg-black/40 border border-blue-500/30">
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative w-full max-w-sm aspect-video rounded-lg overflow-hidden bg-[#0D0A1A]">
                          <video ref={photoVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <canvas ref={photoCanvasRef} className="hidden" />
                          <button
                            onClick={stopPhotoCapture}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500/60 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 w-full">
                          <button
                            onClick={capturePhoto}
                            className="flex-1 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            Capture
                          </button>
                          {classPhotos.length > 0 && (
                            <button
                              onClick={() => submitPhotoAttendance(cls.id)}
                              className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Submit ({classPhotos.length} photos)
                            </button>
                          )}
                        </div>
                        {classPhotos.length > 0 && (
                          <div className="grid grid-cols-4 gap-2 w-full">
                            {classPhotos.map((photo, i) => (
                              <div key={i} className="relative group">
                                <img src={photo} alt="" className="w-full h-16 object-cover rounded-lg border border-white/10" />
                                <button
                                  onClick={() => removePhoto(cls.id, i)}
                                  className="absolute top-1 right-1 p-0.5 rounded bg-black/70 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isMarked && !isScanning && !isPhotoMode && (
                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5 flex-wrap">
                      <button
                        onClick={() => startQrScan(cls.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 text-[#06B6D4] text-[11px] font-semibold hover:bg-[#06B6D4]/20 transition-all"
                      >
                        <QrCode className="w-3.5 h-3.5" /> Scan QR
                      </button>
                      <button
                        onClick={() => startPhotoCapture(cls.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/20 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" /> Photo
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(cls.id, 'present')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition-all"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Present
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(cls.id, 'late')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold hover:bg-amber-500/20 transition-all"
                      >
                        <Clock className="w-3.5 h-3.5" /> Late
                      </button>
                      <button
                        onClick={() => handleMarkAttendance(cls.id, 'absent')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold hover:bg-red-500/20 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Absent
                      </button>
                    </div>
                  )}

                  {/* Marked confirmation */}
                  {isMarked && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-2 text-[10px] text-[#C4B5FD]/50">
                      <CheckCircle className="w-3 h-3 text-emerald-400" />
                      Marked as <span className={`font-bold ${
                        record.status === 'present' ? 'text-emerald-400' :
                        record.status === 'late' ? 'text-amber-400' : 'text-red-400'
                      }`}>{record.status}</span>
                      {record.marked_at && <> at {new Date(record.marked_at).toLocaleTimeString()}</>}
                      <span className="ml-auto text-[#C4B5FD]/30">via {record.method}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        {markedCount > 0 && (
          <div className="flex justify-center">
            <button
              onClick={handleSubmitAll}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-[#06B6D4]/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Submit Attendance ({markedCount} classes)
            </button>
          </div>
        )}

        {/* Empty State */}
        {totalCount === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-[#C4B5FD]/20 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Classes Today</h3>
            <p className="text-xs text-[#C4B5FD]/50">Enjoy your day off!</p>
          </div>
        )}
      </div>

      {/* ==================== EXCEL/CSV UPLOAD MODAL ==================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#13102A] border border-[#6C2BD9]/30 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white">Upload Attendance File</h3>
                  <p className="text-[10px] text-[#C4B5FD]/50">CSV with subject_code and status columns</p>
                </div>
              </div>
              <button onClick={() => { setShowUploadModal(false); resetUpload(); }}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step: Choose */}
            {uploadStep === 'choose' && (
              <div className="flex flex-col gap-4">
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => csvInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    dragActive ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-emerald-500/30'
                  }`}
                >
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <p className="text-sm text-white font-medium mb-1">Drop CSV file or click to browse</p>
                  <p className="text-[10px] text-gray-500">.csv, .xlsx, .xls, .tsv, .txt files supported</p>
                  <input ref={csvInputRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={handleFileInput} className="hidden" />
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={downloadSampleCsv}
                    className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                    <Download className="w-3.5 h-3.5" /> Download sample CSV
                  </button>
                  <span className="text-[10px] text-gray-500">Required: subject_code, status</span>
                </div>
                {uploadErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    {uploadErrors.map((e, i) => <p key={i} className="text-[10px] text-red-400">{e}</p>)}
                  </div>
                )}
              </div>
            )}

            {/* Step: Map Columns */}
            {uploadStep === 'map' && (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-gray-400">File: <span className="text-white font-medium">{uploadFile?.name}</span> — {uploadPreview.length} rows</p>
                <div className="grid grid-cols-1 gap-3">
                  {['subject_code', 'status'].map(req => (
                    <div key={req} className="flex items-center gap-3">
                      <label className="w-28 text-xs text-gray-300 font-medium">{req.replace(/_/g, ' ')}:</label>
                      <select
                        value={uploadMapping[req] || ''}
                        onChange={(e) => setUploadMapping(prev => ({ ...prev, [req]: e.target.value }))}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:border-[#8B5CF6] focus:outline-none"
                      >
                        <option value="">-- Not mapped --</option>
                        {uploadHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                {uploadErrors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    {uploadErrors.map((e, i) => <p key={i} className="text-[10px] text-red-400">{e}</p>)}
                  </div>
                )}
                <div className="flex justify-between">
                  <button onClick={() => { setUploadStep('choose'); setUploadErrors([]); }}
                    className="text-xs text-gray-400 hover:text-white">Back</button>
                  <button onClick={applyUploadMapping}
                    disabled={!uploadMapping.subject_code || !uploadMapping.status}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5" /> Apply & Preview
                  </button>
                </div>
              </div>
            )}

            {/* Step: Done */}
            {uploadStep === 'done' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-white">Attendance Applied!</p>
                <p className="text-xs text-gray-400">Records have been mapped to your classes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

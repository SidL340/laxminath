'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, ZoomIn, RotateCw, Image as ImageIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CertificatePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePhoto: (photoDataUrl: string) => void;
  currentPhotoUrl?: string;
}

export default function CertificatePhotoModal({
  isOpen,
  onClose,
  onSavePhoto,
  currentPhotoUrl,
}: CertificatePhotoModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(currentPhotoUrl || null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRawImageSrc(currentPhotoUrl || null);
      setZoom(1);
      setRotation(0);
      setActiveTab('upload');
    } else {
      stopCamera();
    }
  }, [isOpen, currentPhotoUrl]);

  // Start Camera
  const startCamera = async () => {
    try {
      setActiveTab('camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      toast.error('Camera access denied or unavailable. Please choose an image file instead.');
      setActiveTab('upload');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  // Capture Snapshot from Camera
  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setRawImageSrc(dataUrl);
      stopCamera();
      setActiveTab('upload');
      toast.success('Photo captured! You can now adjust & crop.');
    }
  };

  // Handle File Input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawImageSrc(event.target?.result as string);
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  };

  // Process & Crop Final Passport Photo (Portrait 35x45 ratio = 350x450 px)
  const handleApplyPhoto = () => {
    if (!rawImageSrc) {
      toast.error('Please upload or take a photo first');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const targetWidth = 350;
      const targetHeight = 450;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      // Fit image centered
      const aspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;
      let drawW = targetWidth;
      let drawH = targetHeight;

      if (aspect > targetAspect) {
        drawW = targetHeight * aspect;
        drawH = targetHeight;
      } else {
        drawW = targetWidth;
        drawH = targetWidth / aspect;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const finalDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onSavePhoto(finalDataUrl);
      toast.success('Passport photo attached to certificate!');
      onClose();
    };
    img.src = rawImageSrc;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#1e3a5f] text-white">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-amber-400" />
            <span className="font-bold text-sm">Student Photo Capture & Cropper (फोटो खिच्ने / अपलोड)</span>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex border-b border-gray-100 bg-gray-50 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('upload');
            }}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload' ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Upload size={14} />
            <span>Upload from Device / Gallery</span>
          </button>
          <button
            type="button"
            onClick={startCamera}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'camera' ? 'bg-white text-[#1e3a5f] border-b-2 border-[#1e3a5f]' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Camera size={14} />
            <span>Take Photo with Camera (क्यामेरा)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'camera' ? (
            <div className="space-y-3 text-center">
              <div className="relative mx-auto w-64 h-80 rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-dashed border-[#1e3a5f]">
                <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover" />
                {/* Guide overlay */}
                <div className="absolute inset-4 border border-dashed border-amber-400/70 rounded-lg pointer-events-none flex flex-col items-center justify-end pb-2">
                  <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded">Align Face Centered</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-md transition"
                >
                  <Camera size={16} />
                  <span>Snap Photo (फोटो लिनुहोस्)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {rawImageSrc ? (
                <div className="space-y-3">
                  {/* Interactive Preview Canvas Box */}
                  <div className="relative mx-auto w-56 h-72 rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-[#1e3a5f] flex items-center justify-center shadow-inner">
                    <img
                      src={rawImageSrc}
                      alt="Crop target"
                      className="max-w-full max-h-full object-contain transition-transform duration-100"
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] px-2 py-0.5 rounded font-mono">
                      Passport 35×45mm Fit
                    </div>
                  </div>

                  {/* Adjustments: Zoom & Rotate */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                        <ZoomIn size={13} className="text-purple-600" />
                        <span>Zoom / Scale: {zoom.toFixed(1)}x</span>
                      </label>
                      <input
                        type="range"
                        min="0.8"
                        max="2.5"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="w-36 accent-[#1e3a5f]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setRotation((prev) => (prev + 90) % 360)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 text-[11px] font-bold hover:bg-gray-50"
                      >
                        <RotateCw size={12} />
                        <span>Rotate 90°</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-gray-200 text-blue-700 text-[11px] font-bold hover:bg-blue-50"
                      >
                        <RefreshCw size={12} />
                        <span>Choose Another</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Empty Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 border-2 border-dashed border-gray-300 hover:border-[#1e3a5f] rounded-2xl bg-gray-50 hover:bg-blue-50/40 transition cursor-pointer text-center space-y-2"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Upload size={22} />
                  </div>
                  <div className="font-bold text-xs text-gray-800">
                    Click to browse or take photo from phone
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Supports JPG, PNG, WEBP from Gallery or Camera
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
          <div>
            {rawImageSrc && (
              <button
                type="button"
                onClick={() => {
                  setRawImageSrc(null);
                  onSavePhoto('');
                  onClose();
                  toast.success('Photo removed');
                }}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-bold"
              >
                <Trash2 size={13} />
                <span>Remove Photo</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyPhoto}
              disabled={!rawImageSrc}
              className={`inline-flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs ${
                rawImageSrc ? 'bg-[#1e3a5f] hover:bg-[#2a5280]' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <Check size={14} />
              <span>Apply to Certificate (फोटो राख्नुहोस्)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

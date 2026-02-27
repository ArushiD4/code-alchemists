import { useRef, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

type MciColor = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

export default function ParamedicPage() {
    const [isMciMode, setIsMciMode] = useState(false);

    // State for MCI Native Camera
    const [isUploading, setIsUploading] = useState(false);
    const [selectedColor, setSelectedColor] = useState<MciColor | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Normal Mode Form State
    const [vitals, setVitals] = useState({
        name: '',
        hr: '',
        bp: '',
        spo2: '',
        notes: ''
    });

    // ========== NATIVE CAMERA LOGIC ==========

    useEffect(() => {
        // Only request camera if a color is selected and we are in MCI mode
        if (isMciMode && selectedColor) {
            const startCamera = async () => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: 'environment' }
                    });
                    streamRef.current = stream;

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (error) {
                    console.error("Camera error:", error);
                    toast.error("Failed to access camera", {
                        style: { background: '#1e293b', color: '#f8fafc' }
                    });
                    setSelectedColor(null); // Return to buttons if camera fails
                }
            };
            startCamera();
        }

        // Cleanup function to stop camera when unmounting or returning to buttons
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isMciMode, selectedColor]);

    const handleMciClick = (color: MciColor) => {
        setSelectedColor(color);
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setSelectedColor(null);
    };

    const captureAndSubmit = async () => {
        if (!selectedColor || !videoRef.current) return;

        setIsUploading(true);
        const notificationId = toast.loading(`Processing ${selectedColor} triage...`, {
            style: { background: '#1e293b', color: '#f8fafc' }
        });

        try {
            // Draw video frame to hidden canvas for compression
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            let width = video.videoWidth;
            let height = video.videoHeight;
            const maxWidth = 600;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Canvas context not found');

            ctx.drawImage(video, 0, 0, width, height);
            const base64Image = canvas.toDataURL('image/webp', 0.8);

            // Shut off camera immediately after snapshot
            stopCamera();

            // Generate logical ID based on current time (HHMMSS)
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
            const mciId = `MCI-${selectedColor}-${timeStr}`;

            const patientData = {
                id: mciId,
                triage: selectedColor,
                photoBase64: base64Image,
                status: 'waiting',
                timestamp: serverTimestamp()
            };

            await addDoc(collection(db, 'patients'), patientData);
            toast.success(`Patient Logged: ${mciId}`, {
                id: notificationId,
                style: { background: '#1e293b', color: '#f8fafc' } // dark toast
            });

        } catch (error) {
            console.error('Error logging patient:', error);
            toast.error('Failed to log patient', { id: notificationId });
            stopCamera();
        } finally {
            setIsUploading(false);
        }
    };

    // ========== NORMAL MODE LOGIC ==========

    const validateNormalForm = (): boolean => {
        const hr = parseInt(vitals.hr, 10);
        const spo2 = parseInt(vitals.spo2, 10);

        if (!vitals.hr || isNaN(hr) || hr < 1 || hr > 300) {
            toast.error('Heart Rate is required and must be between 1 and 300');
            return false;
        }

        if (!vitals.spo2 || isNaN(spo2) || spo2 < 0 || spo2 > 100) {
            toast.error('SpO2 is required and must be between 0 and 100');
            return false;
        }

        if (!vitals.bp || isNaN(bp) || vitals.bp.trim().length === 0) {
            toast.error('Blood Pressure is required');
            return false;
        }

        return true;
    };

    const submitStandardReport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateNormalForm()) return;

        setIsUploading(true);
        const notificationId = toast.loading('Submitting report...');

        try {
            await addDoc(collection(db, 'patients'), {
                ...vitals,
                type: 'standard',
                status: 'waiting',
                timestamp: serverTimestamp()
            });

            toast.success('Report Submitted', { id: notificationId });
            setVitals({ name: '', hr: '', bp: '', spo2: '', notes: '' }); // Clear form
        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Failed to submit report', { id: notificationId });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`flex-1 flex flex-col w-full min-h-[100dvh] transition-colors duration-300 ${isMciMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>

            <div className="p-4 flex-1 flex flex-col w-full h-full max-w-lg mx-auto relative">
                {/* iOS Style Toggle Switch */}
                <div className="flex justify-center mb-6 pt-2">
                    <div
                        className={`relative flex items-center p-1 rounded-full cursor-pointer w-[280px] h-[52px] shadow-inner transition-colors duration-300 ${isMciMode ? 'bg-slate-900 border border-slate-800' : 'bg-slate-200 border border-slate-300'
                            }`}
                        onClick={() => {
                            if (isMciMode) stopCamera(); // Cleanup if switching away from MCI
                            setIsMciMode(!isMciMode);
                        }}
                    >
                        <div
                            className={`absolute left-1 w-[136px] h-[44px] rounded-full shadow-sm transition-transform duration-300 ease-out flex items-center justify-center ${isMciMode ? 'translate-x-[134px] bg-red-600 shadow-red-900/50' : 'translate-x-[0px] bg-white'
                                }`}
                        ></div>
                        <div className={`relative flex-1 text-center font-bold text-sm tracking-wide z-10 transition-colors duration-300 ${isMciMode ? 'text-slate-500' : 'text-slate-800'}`}>NORMAL</div>
                        <div className={`relative flex-1 text-center font-bold text-sm tracking-wide z-10 transition-colors duration-300 ${isMciMode ? 'text-white' : 'text-slate-400'}`}>MCI MODE</div>
                    </div>
                </div>

                {!selectedColor && (
                    <h1 className={`text-2xl font-extrabold mb-6 px-1 tracking-tight text-center ${isMciMode ? 'text-white' : 'text-slate-800'}`}>
                        {isMciMode ? 'Mass Casualty Triage' : 'Standard Patient Intake'}
                    </h1>
                )}

                {/* --- MCI MODE (DARK THEME) --- */}
                {isMciMode && (
                    <div className="flex-1 flex flex-col pt-2 w-full">

                        {/* 1. BUTTON SELECTION STATE */}
                        {!selectedColor && (
                            <div className="flex-1 flex flex-col gap-4 pb-8 w-full">
                                <button
                                    onClick={() => handleMciClick('RED')}
                                    className="flex-1 rounded-3xl bg-red-600 hover:bg-red-500 active:bg-red-700 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(220,38,38,0.2)] flex items-center justify-center font-black text-white text-4xl tracking-widest uppercase border border-red-500/50"
                                >
                                    RED
                                </button>

                                <button
                                    onClick={() => handleMciClick('YELLOW')}
                                    className="flex-1 rounded-3xl bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(234,179,8,0.15)] flex items-center justify-center font-black text-white text-4xl tracking-widest uppercase border border-yellow-500/50"
                                >
                                    YELLOW
                                </button>

                                <button
                                    onClick={() => handleMciClick('GREEN')}
                                    className="flex-1 rounded-3xl bg-green-500 hover:bg-green-400 active:bg-green-600 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(34,197,94,0.15)] flex items-center justify-center font-black text-white text-4xl tracking-widest uppercase border border-green-500/50"
                                >
                                    GREEN
                                </button>

                                <button
                                    onClick={() => handleMciClick('BLACK')}
                                    className="flex-1 rounded-3xl bg-[#111] hover:bg-gray-900 active:bg-black active:scale-[0.98] transition-all duration-200 shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-gray-800 flex items-center justify-center font-black text-slate-300 text-4xl tracking-widest uppercase"
                                >
                                    BLACK
                                </button>
                            </div>
                        )}

                        {/* 2. NATIVE CAMERA FEED STATE */}
                        {selectedColor && (
                            <div className="flex-1 flex flex-col gap-4 pb-4 w-full h-full relative">
                                <div className="absolute top-2 left-2 z-10 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
                                    style={{
                                        backgroundColor: selectedColor === 'BLACK' ? '#333' :
                                            selectedColor === 'RED' ? '#dc2626' :
                                                selectedColor === 'YELLOW' ? '#eab308' : '#22c55e',
                                        color: '#fff',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    {selectedColor} TRIAGE
                                </div>

                                {/* Video element for live feed */}
                                <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl border border-slate-800 flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex gap-3 h-20 shrink-0">
                                    <button
                                        onClick={stopCamera}
                                        disabled={isUploading}
                                        className="w-20 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 flex flex-col items-center justify-center font-bold text-slate-300 disabled:opacity-50"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                    <button
                                        onClick={captureAndSubmit}
                                        disabled={isUploading}
                                        className="flex-1 rounded-2xl bg-white hover:bg-slate-200 active:bg-slate-300 active:scale-[0.98] transition-all flex flex-col items-center justify-center font-black text-black text-2xl tracking-widest uppercase shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-50"
                                    >
                                        {isUploading ? 'SAVING...' : 'CAPTURE & SUBMIT'}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                )}

                {/* --- NORMAL MODE (LIGHT THEME) --- */}
                {!isMciMode && (
                    <form onSubmit={submitStandardReport} className="flex-1 flex flex-col gap-6 pb-8 overflow-y-auto">

                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <label className="block text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Patient Identity</label>
                            <input
                                type="text"
                                placeholder="Full Name (Optional)"
                                value={vitals.name}
                                onChange={(e) => setVitals({ ...vitals, name: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg"
                            />
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <label className="block text-xs font-bold tracking-widest text-slate-500 uppercase mb-4">Vital Signs</label>
                            <div className="grid grid-cols-2 gap-4">

                                {/* Heart Rate */}
                                <div>
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                        <span className="text-sm font-semibold text-slate-700">Heart Rate <span className="text-red-500">*</span></span>
                                        <span className="text-xs font-bold text-slate-400">BPM</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="e.g. 85"
                                        value={vitals.hr}
                                        onChange={(e) => setVitals({ ...vitals, hr: e.target.value })}
                                        min="1"
                                        max="300"
                                        required
                                        className="hide-spinners w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xl font-medium"
                                    />
                                </div>

                                {/* SpO2 */}
                                <div>
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                        <span className="text-sm font-semibold text-slate-700">SpO2 <span className="text-red-500">*</span></span>
                                        <span className="text-xs font-bold text-slate-400">%</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="e.g. 98"
                                        value={vitals.spo2}
                                        onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                                        min="0"
                                        max="100"
                                        required
                                        className="hide-spinners w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xl font-medium"
                                    />
                                </div>

                                {/* Blood Pressure */}
                                <div className="col-span-2 mt-2">
                                    <div className="flex justify-between items-center mb-1.5 px-1">
                                        <span className="text-sm font-semibold text-slate-700">Blood Pressure <span className="text-red-500">*</span></span>
                                        <span className="text-xs font-bold text-slate-400">mmHg</span>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="120/80"
                                        value={vitals.bp}
                                        onChange={(e) => setVitals({ ...vitals, bp: e.target.value })}
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-xl font-medium tracking-wide"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                            <label className="block text-xs font-bold tracking-widest text-slate-500 uppercase mb-3">Clinical Notes</label>
                            <textarea
                                placeholder="Observations, interventions, or context..."
                                rows={3}
                                value={vitals.notes}
                                onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-lg resize-none"
                            ></textarea>
                        </div>

                        <div className="flex-1 min-h-[20px]"></div>

                        <button
                            type="submit"
                            disabled={isUploading}
                            className="w-full mt-auto py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 flex flex-col items-center justify-center font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.2)] transition-all transform active:scale-[0.98] disabled:opacity-50 border border-blue-500"
                        >
                            <span className="text-xl tracking-wide">{isUploading ? 'VERIFYING...' : 'SUBMIT REPORT'}</span>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

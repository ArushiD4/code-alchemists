import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface Patient {
    id: string;
    type?: 'standard';
    triage?: 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
    acuity?: 'Critical' | 'Urgent' | 'Routine';
    photoBase64?: string;
    status: string;
    name?: string;
    hr?: string;
    bp?: string;
    spo2?: string;
    notes?: string;
    timestamp?: any;
    docId: string; // The Firestore document ID to allow easy updates
}

export default function DriverPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // Firestore Subscription
    useEffect(() => {
        const q = query(collection(db, 'patients'), where('status', '==', 'waiting'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: Patient[] = snapshot.docs.map(docSnap => ({
                ...(docSnap.data() as Omit<Patient, 'docId'>),
                docId: docSnap.id
            }));

            // SORTING LOGIC
            // Tier 1: RED or Critical
            // Tier 2: YELLOW or Urgent
            // Tier 3: GREEN or Routine
            // Tier 4: BLACK
            const getTier = (p: Patient) => {
                if (p.triage === 'RED' || p.acuity === 'Critical') return 1;
                if (p.triage === 'YELLOW' || p.acuity === 'Urgent') return 2;
                if (p.triage === 'GREEN' || p.acuity === 'Routine') return 3;
                if (p.triage === 'BLACK') return 4;
                return 5;
            };

            data.sort((a, b) => {
                const tierA = getTier(a);
                const tierB = getTier(b);

                if (tierA !== tierB) {
                    return tierA - tierB; // Ascending tier (1 is first)
                }

                // Same tier, sort chronologically
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeA - timeB;
            });

            setPatients(data);
        }, (error) => {
            console.error("Error fetching patients:", error);
            toast.error("Failed to sync dashboard");
        });

        return () => unsubscribe();
    }, []);

    const getBorderColor = (p: Patient) => {
        if (p.triage === 'RED' || p.acuity === 'Critical') return 'border-red-500';
        if (p.triage === 'YELLOW' || p.acuity === 'Urgent') return 'border-yellow-500';
        if (p.triage === 'GREEN' || p.acuity === 'Routine') return 'border-green-500';
        if (p.triage === 'BLACK') return 'border-gray-900';
        return 'border-slate-500';
    };

    const getBadgeColor = (p: Patient) => {
        if (p.triage === 'RED' || p.acuity === 'Critical') return 'bg-red-500 text-white';
        if (p.triage === 'YELLOW' || p.acuity === 'Urgent') return 'bg-yellow-500 text-white';
        if (p.triage === 'GREEN' || p.acuity === 'Routine') return 'bg-green-500 text-white';
        if (p.triage === 'BLACK') return 'bg-gray-900 text-slate-300';
        return 'bg-slate-500 text-white';
    };

    const handlePatientLoaded = async () => {
        if (!selectedPatient) return;
        const notificationId = toast.loading('Updating database...');
        try {
            const patientRef = doc(db, 'patients', selectedPatient.docId);
            await updateDoc(patientRef, { status: 'loaded' });
            toast.success('Patient Loaded successfully!', { id: notificationId });
            setSelectedPatient(null);
        } catch (error) {
            console.error("Error updating patient status:", error);
            toast.error("Failed to load patient", { id: notificationId });
        }
    };

    return (
        <div className="flex-1 flex flex-col w-full min-h-[100dvh] bg-slate-950 text-slate-50 relative">

            <div className="p-4 sm:p-6 pb-24">
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Driver Queue</h1>
                    <div className="bg-slate-900 border border-slate-800 rounded-full px-4 py-1 text-sm font-bold text-slate-300 flex items-center gap-2 shadow-inner">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        LIVE: {patients.length} Waiting
                    </div>
                </div>

                {patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-slate-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                        <p className="text-xl font-medium tracking-wide">Queue is empty</p>
                        <p className="text-sm">Standing by for dispatches.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {patients.map(p => (
                            <div
                                key={p.docId}
                                onClick={() => setSelectedPatient(p)}
                                className={`relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform border-4 ${getBorderColor(p)} bg-slate-900 group aspect-square flex flex-col`}
                            >
                                {/* MCI Render (Photo) */}
                                {p.photoBase64 ? (
                                    <>
                                        <img src={p.photoBase64} alt={p.id} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                                            <p className="font-extrabold text-white tracking-widest text-sm truncate">{p.id}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 opacity-80">MCI Protocol</p>
                                        </div>
                                    </>
                                ) : (
                                    /* Standard Render (Vitals) */
                                    <div className="flex-1 flex flex-col p-4">
                                        <div className="flex-1">
                                            <p className="font-extrabold text-white tracking-widest text-lg mb-4 truncate">{p.name || 'UNKNOWN'}</p>

                                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm mb-4">
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Heart Rate</p>
                                                    <p className="font-bold text-slate-200">{p.hr} <span className="text-[10px] text-slate-500 font-normal">BPM</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Blood Pressure</p>
                                                    <p className="font-bold text-slate-200">{p.bp}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`mt-auto w-full py-1.5 rounded text-center text-xs font-black tracking-widest uppercase ${getBadgeColor(p)}`}>
                                            {p.acuity}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* FULL SCREEN ACTION MODAL */}
            {selectedPatient && (
                <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col animation-fade-in pb-env safe-bottom overflow-y-auto">

                    <div className="flex items-center justify-between p-4 sticky top-0 bg-slate-950/90 z-10 border-b border-slate-800">
                        <h2 className="text-xl font-bold tracking-widest text-white uppercase">{selectedPatient.id || selectedPatient.name || 'Patient Details'}</h2>
                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 active:bg-slate-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 p-4 pb-32">

                        {/* Acuity Level / Triage Badge Header */}
                        <div className={`w-full py-4 text-center font-black text-2xl tracking-widest uppercase rounded-2xl mb-6 shadow-lg border-4 ${getBorderColor(selectedPatient)} ${getBadgeColor(selectedPatient)}`}>
                            {selectedPatient.triage || selectedPatient.acuity} Alert
                        </div>

                        {/* Dynamic Content */}
                        {selectedPatient.photoBase64 ? (
                            <div className="w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl mb-6 bg-black">
                                <img src={selectedPatient.photoBase64} alt="Patient" className="w-full h-auto object-contain max-h-[50vh]" />
                            </div>
                        ) : (
                            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-inner mb-6">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Vitals & Info</h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Heart Rate</p>
                                        <p className="text-2xl font-black text-slate-100">{selectedPatient.hr} <span className="text-sm text-slate-500 font-normal">BPM</span></p>
                                    </div>
                                    <div>
                                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">SpO2</p>
                                        <p className="text-2xl font-black text-slate-100">{selectedPatient.spo2} <span className="text-sm text-slate-500 font-normal">%</span></p>
                                    </div>
                                    <div className="col-span-2">
                                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-1">Blood Pressure</p>
                                        <p className="text-2xl font-black text-slate-100">{selectedPatient.bp} <span className="text-sm text-slate-500 font-normal">mmHg</span></p>
                                    </div>
                                </div>

                                {selectedPatient.notes && (
                                    <div className="mt-6 pt-4 border-t border-slate-800">
                                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-2">Clinical Notes</p>
                                        <p className="text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800/50">{selectedPatient.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                        <button
                            onClick={handlePatientLoaded}
                            className="w-full py-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 active:scale-[0.98] transition-all flex flex-col items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.3)] border border-blue-500"
                        >
                            <span className="text-2xl font-black text-white tracking-widest uppercase">Patient Found & Loaded</span>
                        </button>
                    </div>

                </div>
            )}

        </div>
    );
}

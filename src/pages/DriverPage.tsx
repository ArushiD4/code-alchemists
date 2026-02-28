import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// TYPES
// ============================================================
interface Patient {
    id: string;
    type?: 'standard';
    triage?: 'RED' | 'YELLOW' | 'GREEN';
    acuity?: 'Critical' | 'Urgent' | 'Routine';
    photoBase64?: string;
    status: string;
    name?: string;
    hr?: string;
    bp?: string;
    spo2?: string;
    notes?: string;
    timestamp?: any;
    docId: string;
    patientLat?: number;
    patientLng?: number;
}

interface LatLng { lat: number; lng: number; }

// ============================================================
// CONSTANTS (Kothrud, Pune Localization)
// ============================================================
const HOSPITALS = [
    { name: 'Deenanath Mangeshkar Hospital', lat: 18.5028, lng: 73.8365 },
    { name: 'Sahyadri Hospital Kothrud', lat: 18.5050, lng: 73.8024 },
    { name: 'Shashwat Hospital', lat: 18.4965, lng: 73.8202 }
];

// Demo patient pickup location (Kothrud Stand area)
const DEMO_PICKUP: LatLng = { lat: 18.5074, lng: 73.8077 };

// ============================================================
// HELPERS
// ============================================================
function haversineKm(a: LatLng, b: LatLng): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function closestHospital(to: LatLng) {
    return HOSPITALS.reduce((best, h) =>
        haversineKm({ lat: h.lat, lng: h.lng }, to) <
            haversineKm({ lat: best.lat, lng: best.lng }, to)
            ? h : best
    );
}

async function fetchOsrmRoute(from: LatLng, to: LatLng): Promise<any | null> {
    try {
        const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        const data = await res.json();
        return data.routes?.[0] ?? null;
    } catch (e) {
        console.error('OSRM error', e);
        return null;
    }
}

function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true })
    );
}

function MapRecenter({ center }: { center: LatLng }) {
    const mapRef = useMap();
    useEffect(() => { mapRef.setView([center.lat, center.lng]); }, [center, mapRef]);
    return null;
}

// ============================================================
// COLOUR HELPERS
// ============================================================
const getBorderColor = (p: Patient) => {
    if (p.triage === 'RED' || p.acuity === 'Critical') return 'border-red-500';
    if (p.triage === 'YELLOW' || p.acuity === 'Urgent') return 'border-yellow-500';
    if (p.triage === 'GREEN' || p.acuity === 'Routine') return 'border-green-500';
    return 'border-slate-500';
};

const getBadgeColor = (p: Patient) => {
    if (p.triage === 'RED' || p.acuity === 'Critical') return 'bg-red-500 text-white';
    if (p.triage === 'YELLOW' || p.acuity === 'Urgent') return 'bg-yellow-500 text-black';
    if (p.triage === 'GREEN' || p.acuity === 'Routine') return 'bg-green-500 text-black';
    return 'bg-slate-500 text-white';
};

// ============================================================
// COMPONENT
// ============================================================
export default function DriverPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [pin, setPin] = useState('');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    // -- Navigation (two-phase) --
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigationPhase, setNavigationPhase] = useState<1 | 2>(1);
    const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
    const [routeGeoJson, setRouteGeoJson] = useState<any>(null);

    // -- ETA State --
    const [dispatchETA, setDispatchETA] = useState<{ distance: string, time: string } | null>(null);
    const [isCalculatingETA, setIsCalculatingETA] = useState(false);

    const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Firestore subscription ────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, 'patients'), where('status', '==', 'waiting'));
        const unsub = onSnapshot(q, (snap) => {
            const data: Patient[] = snap.docs.map(d => ({
                ...(d.data() as Omit<Patient, 'docId'>),
                docId: d.id,
            }));
            const tier = (p: Patient) => {
                if (p.triage === 'RED' || p.acuity === 'Critical') return 1;
                if (p.triage === 'YELLOW' || p.acuity === 'Urgent') return 2;
                if (p.triage === 'GREEN' || p.acuity === 'Routine') return 3;
                return 5;
            };
            data.sort((a, b) =>
                tier(a) - tier(b) ||
                (a.timestamp?.seconds ?? 0) - (b.timestamp?.seconds ?? 0)
            );
            setPatients(data);
        }, (err) => {
            console.error(err);
            toast.error('Failed to sync dashboard');
        });
        return () => unsub();
    }, []);

    useEffect(() => () => { if (trackingRef.current) clearInterval(trackingRef.current); }, []);

    // ── Pre-calculate ETA when patient is selected ────────────
    useEffect(() => {
        if (!selectedPatient || isNavigating) return;

        let cancelled = false;
        setDispatchETA(null);
        setIsCalculatingETA(true);

        const calculateETA = async () => {
            try {
                const pos: LatLng | null = driverLocation || await getPosition().then(p => ({ lat: p.coords.latitude, lng: p.coords.longitude }));
                if (!pos) return;
                if (!driverLocation && !cancelled) setDriverLocation(pos);

                const patientPos: LatLng = {
                    lat: selectedPatient.patientLat ?? DEMO_PICKUP.lat,
                    lng: selectedPatient.patientLng ?? DEMO_PICKUP.lng,
                };

                const routeData = await fetchOsrmRoute(pos, patientPos);

                if (!cancelled && routeData) {
                    const distKm = (routeData.distance / 1000).toFixed(1);
                    const timeMin = Math.round(routeData.duration / 60);
                    setDispatchETA({ distance: distKm, time: `${timeMin}` });
                }
            } catch (e) {
                console.error("ETA Calculation Error", e);
            } finally {
                if (!cancelled) setIsCalculatingETA(false);
            }
        };

        calculateETA();
        return () => { cancelled = true; };
    }, [selectedPatient, isNavigating, driverLocation]);

    // ── Route fetching — reacts to isNavigating & navigationPhase ──
    useEffect(() => {
        if (!isNavigating || !selectedPatient) return;

        let cancelled = false;

        const patientPos: LatLng = {
            lat: selectedPatient.patientLat ?? DEMO_PICKUP.lat,
            lng: selectedPatient.patientLng ?? DEMO_PICKUP.lng,
        };

        setRouteGeoJson(null);

        if (navigationPhase === 1) {
            (async () => {
                try {
                    const pos = await getPosition();
                    const driver: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    if (cancelled) return;
                    setDriverLocation(driver);

                    const routeData = await fetchOsrmRoute(driver, patientPos);
                    if (!cancelled && routeData?.geometry) setRouteGeoJson(routeData.geometry);
                } catch {
                    if (!cancelled) toast.error('Could not get your location.');
                }
            })();

            trackingRef.current = setInterval(async () => {
                try {
                    const pos = await getPosition();
                    const driver: LatLng = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    setDriverLocation(driver);
                    await updateDoc(doc(db, 'patients', selectedPatient.docId), {
                        driverLat: driver.lat,
                        driverLng: driver.lng,
                    });
                } catch (e) { console.error('Tracking error', e); }
            }, 5000);

        } else {
            const hospital = closestHospital(patientPos);
            const hospitalPos: LatLng = { lat: hospital.lat, lng: hospital.lng };

            (async () => {
                const routeData = await fetchOsrmRoute(patientPos, hospitalPos);
                if (!cancelled && routeData?.geometry) setRouteGeoJson(routeData.geometry);
            })();
        }

        return () => {
            cancelled = true;
            if (trackingRef.current) { clearInterval(trackingRef.current); trackingRef.current = null; }
        };
    }, [isNavigating, navigationPhase, selectedPatient]);

    // ── Accept Dispatch (modal → Phase 1) ────────────────────
    const handleAcceptDispatch = useCallback(async () => {
        if (!selectedPatient) return;
        const tid = toast.loading('Accepting dispatch...');
        try {
            await updateDoc(doc(db, 'patients', selectedPatient.docId), { status: 'driver_en_route' });
            toast.success('En route to patient!', { id: tid });
            setNavigationPhase(1);
            setIsNavigating(true);
        } catch (e) {
            console.error(e);
            toast.error('Failed to accept dispatch', { id: tid });
        }
    }, [selectedPatient]);

    const handlePatientLoaded = useCallback(async () => {
        if (!selectedPatient) return;
        const tid = toast.loading('Updating status...');
        try {
            await updateDoc(doc(db, 'patients', selectedPatient.docId), { status: 'en_route_to_hospital' });
            setNavigationPhase(2);
            toast.success('Patient loaded. Rerouting to hospital...', { id: tid });
        } catch (e) {
            console.error(e);
            toast.error('Failed to update status', { id: tid });
        }
    }, [selectedPatient]);

    const handlePatientDelivered = useCallback(async () => {
        if (!selectedPatient) return;
        const tid = toast.loading('Finalising...');
        try {
            await updateDoc(doc(db, 'patients', selectedPatient.docId), { status: 'delivered' });
            toast.success('Transport Complete. Ready for next dispatch.', { id: tid });
            setNavigationPhase(1);
            setIsNavigating(false);
            setSelectedPatient(null);
            setRouteGeoJson(null);
            setDriverLocation(null);
            setDispatchETA(null);
        } catch (e) {
            console.error(e);
            toast.error('Failed to finalise', { id: tid });
        }
    }, [selectedPatient]);

    const patientPos: LatLng = {
        lat: selectedPatient?.patientLat ?? DEMO_PICKUP.lat,
        lng: selectedPatient?.patientLng ?? DEMO_PICKUP.lng,
    };
    const nearestHospital = closestHospital(patientPos);
    const hospitalPos: LatLng = { lat: nearestHospital.lat, lng: nearestHospital.lng };

    // ============================================================
    // PIN LOGIN SCREEN
    // ============================================================
    if (!isLoggedIn) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center w-full min-h-[100dvh] bg-slate-950 text-slate-50 px-6">
                <div className="w-full max-w-sm flex flex-col gap-6">
                    <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="11" x="5" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-white">Driver Portal</h1>
                        <p className="text-slate-400 text-sm mt-1">Enter your PIN to continue</p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            placeholder="PIN"
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-4 text-center text-2xl font-black tracking-[0.5em] text-slate-100 placeholder:text-slate-600 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <button
                            onClick={() => { if (pin === '1234') setIsLoggedIn(true); else { setPin(''); } }}
                            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black text-lg tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-500"
                        >
                            Unlock
                        </button>
                        {pin.length > 0 && pin !== '1234' && (
                            <p className="text-red-400 text-center text-sm font-semibold">Incorrect PIN. Try again.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ============================================================
    // MAP VIEW
    // ============================================================
    if (isNavigating) {
        const mapCenter: LatLng = navigationPhase === 1 ? (driverLocation ?? patientPos) : patientPos;

        return (
            <div className="flex-1 flex flex-col w-full h-[100dvh] bg-slate-900 relative">
                <div className="absolute top-0 left-0 w-full px-4 pt-4 pb-6 z-[2000] bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-none">
                    <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-0.5">
                        {navigationPhase === 1 ? 'Phase 1 · En Route to Patient' : `Phase 2 · En Route to ${nearestHospital.name}`}
                    </p>
                    <h2 className="text-white font-black tracking-wider text-xl drop-shadow-md">
                        {navigationPhase === 1
                            ? (selectedPatient?.name || selectedPatient?.id || 'Patient')
                            : nearestHospital.name}
                    </h2>
                </div>

                <div className="flex-1 w-full h-full z-[10]">
                    {navigationPhase === 1 && !driverLocation ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                            <span className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Acquiring GPS…</p>
                        </div>
                    ) : (
                        <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={14} style={{ height: '100dvh', width: '100%' }}>
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                            />

                            {driverLocation && navigationPhase === 1 && <MapRecenter center={driverLocation} />}

                            {routeGeoJson && (
                                <GeoJSON
                                    key={navigationPhase}
                                    data={routeGeoJson}
                                    style={{ color: navigationPhase === 1 ? '#3b82f6' : '#22c55e', weight: 6, opacity: 0.85 }}
                                />
                            )}

                            {navigationPhase === 1 ? (
                                <>
                                    {driverLocation && (
                                        <CircleMarker center={[driverLocation.lat, driverLocation.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}>
                                            <Tooltip permanent direction="top"><span className="bg-slate-900 text-blue-300 font-bold text-xs px-2 py-0.5 rounded">Ambulance</span></Tooltip>
                                        </CircleMarker>
                                    )}
                                    <CircleMarker center={[patientPos.lat, patientPos.lng]} radius={12} pathOptions={{ color: '#fff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }}>
                                        <Tooltip permanent direction="top"><span className="bg-slate-900 text-red-300 font-bold text-xs px-2 py-0.5 rounded">Patient</span></Tooltip>
                                    </CircleMarker>
                                </>
                            ) : (
                                <>
                                    <CircleMarker center={[patientPos.lat, patientPos.lng]} radius={10} pathOptions={{ color: '#fff', weight: 3, fillColor: '#3b82f6', fillOpacity: 1 }}>
                                        <Tooltip permanent direction="top"><span className="bg-slate-900 text-blue-300 font-bold text-xs px-2 py-0.5 rounded">Patient</span></Tooltip>
                                    </CircleMarker>
                                    <CircleMarker center={[hospitalPos.lat, hospitalPos.lng]} radius={12} pathOptions={{ color: '#fff', weight: 3, fillColor: '#ef4444', fillOpacity: 1 }}>
                                        <Tooltip permanent direction="top"><span className="bg-slate-900 text-green-300 font-bold text-xs px-2 py-0.5 rounded">Hospital</span></Tooltip>
                                    </CircleMarker>
                                </>
                            )}
                        </MapContainer>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 w-full px-5 pb-8 pt-14 z-[2000] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                    {navigationPhase === 1 ? (
                        <button
                            onClick={handlePatientLoaded}
                            className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-all font-black text-xl text-white tracking-widest uppercase shadow-[0_0_30px_rgba(37,99,235,0.35)] border border-blue-500"
                        >
                            Patient Found &amp; Loaded
                        </button>
                    ) : (
                        <button
                            onClick={handlePatientDelivered}
                            className="w-full py-5 rounded-2xl bg-green-500 hover:bg-green-400 active:bg-green-600 transition-all font-black text-xl text-slate-950 tracking-widest uppercase shadow-[0_0_30px_rgba(34,197,94,0.4)] border border-green-400"
                        >
                            Patient Delivered ✓
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // ============================================================
    // QUEUE VIEW
    // ============================================================
    return (
        <div className="flex-1 flex flex-col w-full min-h-[100dvh] bg-slate-950 text-slate-50 relative">
            <div className="p-4 sm:p-6 pb-24">
                <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-white">Driver Queue</h1>
                    <div className="bg-slate-900 border border-slate-800 rounded-full px-4 py-1 text-sm font-bold text-slate-300 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        LIVE: {patients.length} Waiting
                    </div>
                </div>

                {patients.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-slate-500">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
                        </svg>
                        <p className="text-xl font-medium tracking-wide">Queue is clear</p>
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
                                {p.photoBase64 ? (
                                    <>
                                        <img src={p.photoBase64} alt={p.id} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 pt-8">
                                            <p className="font-extrabold text-white tracking-widest text-sm truncate">{p.id}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300 opacity-80">MCI Protocol</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col p-4">
                                        <p className="font-extrabold text-white tracking-widest text-lg mb-3 truncate">{p.name || p.id}</p>
                                        {p.hr ? (
                                            <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-sm mb-3">
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">HR</p>
                                                    <p className="font-bold text-slate-200">{p.hr} <span className="text-[10px] text-slate-500">BPM</span></p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">BP</p>
                                                    <p className="font-bold text-slate-200">{p.bp}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center py-2 text-slate-500 mb-2 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                                                <p className="text-[11px] font-bold uppercase tracking-widest">Awaiting Dispatch</p>
                                                <p className="text-[9px] font-medium tracking-wide mt-0.5">Reported by Bystander</p>
                                            </div>
                                        )}
                                        <div className={`mt-auto w-full py-1.5 rounded text-center text-xs font-black tracking-widest uppercase ${getBadgeColor(p)}`}>{p.triage || p.acuity} Alert</div>

                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── DISPATCH PREVIEW MODAL ── */}
            {selectedPatient && !isNavigating && (
                <div className="fixed inset-0 z-[3000] bg-slate-950/95 backdrop-blur-md flex flex-col overflow-y-auto">
                    <div className="flex items-center justify-between p-4 sticky top-0 bg-slate-950/90 border-b border-slate-800">
                        <h2 className="text-xl font-bold tracking-widest text-white uppercase truncate pr-2">
                            {selectedPatient.id || selectedPatient.name || 'Patient Details'}
                        </h2>
                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="flex-none p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700 active:bg-slate-600"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    <div className="flex-1 p-4 pb-52">
                        <div className={`w-full py-3 text-center font-black text-2xl tracking-widest uppercase rounded-2xl mb-5 border-4 ${getBorderColor(selectedPatient)} ${getBadgeColor(selectedPatient)}`}>
                            {selectedPatient.triage || selectedPatient.acuity} Alert
                        </div>

                        {selectedPatient.photoBase64 ? (
                            <div className="w-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl mb-5 bg-black">
                                <img src={selectedPatient.photoBase64} alt="Patient" className="w-full h-auto object-contain max-h-[50vh]" />
                            </div>
                        ) : (
                            <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 mb-5">
                                {selectedPatient.hr ? (
                                    <>
                                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">Vitals</h3>
                                        <div className="grid grid-cols-2 gap-5">
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
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                        <p className="text-xs font-bold uppercase tracking-widest">No Vitals Available. Reported by a Bystander.</p>
                                    </div>
                                )}
                                {selectedPatient.notes && (
                                    <div className={`mt-4 pt-4 border-t border-slate-800 ${!selectedPatient.hr ? 'border-t-0 mt-0 pt-0' : ''}`}>
                                        <p className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-2">Notes</p>
                                        <p className="text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/50 text-sm">{selectedPatient.notes}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 mb-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Assigned Hospital</p>
                            <p className="text-lg font-black text-slate-100">{nearestHospital.name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Auto-selected · closest to patient</p>
                        </div>
                    </div>

                    <div className="fixed bottom-0 left-0 w-full p-5 pb-8 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent flex flex-col gap-3">
                        {/* ETA Banner */}
                        <div className="w-full">
                            {isCalculatingETA ? (
                                <div className="text-center py-2 text-sm font-bold text-slate-400 tracking-wider animate-pulse uppercase">
                                    Calculating route...
                                </div>
                            ) : dispatchETA ? (
                                <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-lg flex justify-around items-center">
                                    <p className="text-sm font-bold text-slate-300">
                                        📍 <span className="text-blue-400">{dispatchETA.distance} km</span>
                                    </p>
                                    <div className="h-4 w-px bg-slate-700"></div>
                                    <p className="text-sm font-bold text-slate-300">
                                        ⏱️ ETA <span className="text-blue-400">{dispatchETA.time} min</span>
                                    </p>
                                </div>
                            ) : null}
                        </div>

                        <button
                            onClick={handleAcceptDispatch}
                            disabled={isCalculatingETA || !dispatchETA}
                            className={`w-full py-5 rounded-2xl transition-all font-black text-xl text-white tracking-widest uppercase shadow-[0_0_30px_rgba(34,197,94,0.35)] ${isCalculatingETA || !dispatchETA ? 'bg-green-900 border-green-800 opacity-50 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 active:bg-green-700 border border-green-500'}`}
                        >
                            ✓ Accept Dispatch
                        </button>
                        <button
                            onClick={() => setSelectedPatient(null)}
                            className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-red-900/50 active:bg-red-950 transition-all font-black text-base text-slate-300 hover:text-red-200 tracking-widest uppercase border border-slate-700 hover:border-red-800/50"
                        >
                            ✕ Decline / Too Far
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
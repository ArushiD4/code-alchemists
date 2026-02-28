import { useNavigate } from 'react-router-dom';
import {
    Camera,
    Navigation,
    ArrowRight,
    Wifi,
    Lock,
    Zap,
    Clock,
    Users,
    Shield,
    Activity,
    MapPin,
    Ambulance,
    AlertTriangle,
} from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-[100dvh] bg-slate-950 text-slate-50 font-sans overflow-x-hidden">

            {/* ============================================================ */}
            {/* NAV BAR                                                       */}
            {/* ============================================================ */}
            <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center shadow-[0_0_14px_rgba(220,38,38,0.45)]">
                        <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-black text-lg tracking-tight text-slate-100">
                        Emergency<span className="text-red-500">&amp;</span>Response
                    </span>
                </div>
            </nav>

            {/* ============================================================ */}
            {/* 1. HERO SECTION                                               */}
            {/* ============================================================ */}
            <section className="relative px-5 pt-16 pb-20 flex flex-col items-center text-center overflow-hidden">
                {/* Ambient glow */}
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
                    <div className="w-[600px] h-[400px] bg-red-600/10 rounded-full blur-[120px] -mt-20" />
                </div>

                <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-400">
                    <Zap className="w-3 h-3" />
                    Emergency Response System
                </span>

                <h1 className="text-4xl sm:text-5xl font-black leading-tight tracking-tight text-slate-50 max-w-xl mb-5">
                    When Every Second Counts,{' '}
                    <span className="text-red-400">Help Arrives Faster.</span>
                </h1>

                <p className="text-slate-400 text-lg max-w-md mb-10 leading-relaxed">
                    Instant triage and smart dispatch to get the right help to the right people, immediately.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                    <button
                        onClick={() => navigate('/caller')}
                        className="w-full flex items-center justify-center gap-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-base tracking-widest uppercase py-4 px-6 rounded-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.45)] border border-red-500"
                    >
                        <AlertTriangle className="w-5 h-5" />
                        Report an Emergency
                    </button>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={() => navigate('/paramedic')}
                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-bold text-xs tracking-widest uppercase py-4 px-4 rounded-2xl transition-all border border-slate-700"
                        >
                            <Activity className="w-5 h-5 text-blue-400" />
                            Paramedic
                        </button>
                        <button
                            onClick={() => navigate('/driver')}
                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-bold text-xs tracking-widest uppercase py-4 px-4 rounded-2xl transition-all border border-slate-700"
                        >
                            <Navigation className="w-5 h-5 text-green-400" />
                            Driver
                        </button>
                    </div>
                </div>
            </section>

            {/* ============================================================ */}
            {/* 2. WHAT THE SYSTEM DOES – Visual Explainer Cards              */}
            {/* ============================================================ */}
            <section className="px-5 pb-20">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black tracking-tight text-slate-100 mb-2">How It Works</h2>
                    <p className="text-slate-500 text-sm font-medium">Three steps from crisis to care.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                    {[
                        {
                            icon: <AlertTriangle className="w-7 h-7 text-red-400" />,
                            accent: 'border-red-500/30 bg-red-500/5',
                            step: '01',
                            title: 'Report an Emergency',
                            desc: 'Answer a few simple questions. Our system instantly understands the urgency so help can be sent faster.',
                        },
                        {
                            icon: <Camera className="w-7 h-7 text-yellow-400" />,
                            accent: 'border-yellow-500/30 bg-yellow-500/5',
                            step: '02',
                            title: 'Emergency Response',
                            desc: 'First responders take a quick photo. Patients are visually prioritized in real-time.',
                        },
                        {
                            icon: <Navigation className="w-7 h-7 text-green-400" />,
                            accent: 'border-green-500/30 bg-green-500/5',
                            step: '03',
                            title: 'Smart Dispatch',
                            desc: 'Ambulance drivers automatically receive the highest-priority locations with instant navigation.',
                        },
                    ].map((card) => (
                        <div
                            key={card.step}
                            onClick={card.step === '01' ? () => navigate('/caller') : undefined}
                            className={`rounded-2xl border p-5 flex flex-col gap-4 ${card.accent} ${card.step === '01' ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform' : ''}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner">
                                    {card.icon}
                                </div>
                                <span className="text-4xl font-black text-slate-800">{card.step}</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-100 mb-1 text-base">{card.title}</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ============================================================ */}
            {/* 3. WHY THIS MATTERS – Impact Points                           */}
            {/* ============================================================ */}
            <section className="px-5 pb-20">
                <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-7 sm:p-10">
                    <h2 className="text-2xl font-black tracking-tight text-slate-100 mb-7">
                        Why This Matters
                    </h2>
                    <ul className="space-y-4">
                        {[
                            { icon: <Clock className="w-5 h-5 text-red-400 shrink-0" />, text: 'Reduces critical response time — every second of delay costs lives.' },
                            { icon: <Users className="w-5 h-5 text-yellow-400 shrink-0" />, text: 'Removes confusion in chaotic situations so responders can act without hesitation.' },
                            { icon: <Activity className="w-5 h-5 text-green-400 shrink-0" />, text: 'Helps responders focus on who needs help first using real-time priority queues.' },
                            { icon: <Shield className="w-5 h-5 text-blue-400 shrink-0" />, text: 'Built for mass casualty incidents and everyday emergencies alike.' },
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3.5">
                                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    {item.icon}
                                </div>
                                <p className="text-slate-300 text-sm leading-relaxed pt-1.5">{item.text}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* ============================================================ */}
            {/* 4. HOW IT WORKS – Flow Diagram                                */}
            {/* ============================================================ */}
            <section className="px-5 pb-20">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-black tracking-tight text-slate-100 mb-2">The Journey</h2>
                    <p className="text-slate-500 text-sm font-medium">From first contact to hospital arrival.</p>
                </div>

                {/* Horizontal scroll on mobile, wraps on desktop */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-4xl mx-auto">
                    {[
                        { icon: <AlertTriangle className="w-6 h-6" />, label: 'Emergency', color: 'text-red-400 bg-red-500/10 border-red-500/30' },
                        { icon: <Camera className="w-6 h-6" />, label: 'Smart Triage', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
                        { icon: <Users className="w-6 h-6" />, label: 'Priority Queue', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
                        { icon: <Ambulance className="w-6 h-6" />, label: 'Dispatch', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
                        { icon: <MapPin className="w-6 h-6" />, label: 'Hospital', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
                    ].map((step, i, arr) => (
                        <div key={i} className="flex sm:flex-col items-center gap-2 sm:gap-1">
                            <div className={`flex flex-col sm:flex-col items-center gap-2`}>
                                <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${step.color}`}>
                                    {step.icon}
                                </div>
                                <span className="text-xs font-bold text-slate-400 text-center tracking-wide">{step.label}</span>
                            </div>
                            {i < arr.length - 1 && (
                                <ArrowRight className="w-5 h-5 text-slate-700 shrink-0 sm:rotate-90 sm:my-1" />
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* ============================================================ */}
            {/* 5. TRUST & RELIABILITY BANNER                                 */}
            {/* ============================================================ */}
            <section className="px-5 pb-20">
                <div className="relative overflow-hidden max-w-3xl mx-auto rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-slate-900 to-slate-900 p-8 sm:p-12">
                    <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 bg-blue-600/10 rounded-full blur-[80px]" />
                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-100 mb-8">
                        Built for real-world emergencies.
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                        {[
                            { icon: <Wifi className="w-5 h-5 text-blue-400" />, title: 'Low Bandwidth Ready', desc: 'Works reliably even in areas with limited connectivity.' },
                            { icon: <Lock className="w-5 h-5 text-blue-400" />, title: 'PIN-Secured Access', desc: 'Role-based dispatch login. No accounts needed.' },
                            { icon: <Zap className="w-5 h-5 text-blue-400" />, title: 'Instant Access', desc: 'No complex setup. Launch it, log in, and go.' },
                        ].map((item, i) => (
                            <div key={i} className="flex flex-col gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                                    {item.icon}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-100 text-sm mb-1">{item.title}</p>
                                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>



            {/* FOOTER */}
            <footer className="border-t border-slate-800 px-5 py-6 text-center">
                <p className="text-slate-600 text-xs tracking-wide">
                    © 2026 Snap&amp;Sort Emergency Response System. All rights reserved.
                </p>
            </footer>

        </div>
    );
}

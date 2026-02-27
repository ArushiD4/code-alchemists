import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function DispatchLogin() {
    const [pin, setPin] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const navigate = useNavigate();
    const padRef = useRef<HTMLDivElement>(null);

    // Handle PIN entry
    useEffect(() => {
        if (pin.length === 4) {
            if (pin === '1111') {
                navigate('/paramedic');
            } else if (pin === '2222') {
                navigate('/driver');
            } else {
                // Invalid PIN
                setIsShaking(true);
                toast.error('Invalid Dispatch PIN');

                // Reset after animation
                setTimeout(() => {
                    setIsShaking(false);
                    setPin('');
                }, 500);
            }
        }
    }, [pin, navigate]);

    const handleKeyPress = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const scrollToPad = () => {
        padRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // The 10 digits + backspace
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

    return (
        <div className="w-full min-h-[100dvh] flex flex-col bg-slate-50 relative overflow-y-auto">

            {/* Hero Section (Light Theme) */}
            <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex items-center justify-center border border-slate-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                </div>

                <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Snap & Sort</h1>
                <p className="text-lg text-slate-500 max-w-sm mb-12 leading-relaxed">
                    Modernizing EMS handoffs with instant digital triage and intelligent routing.
                </p>

                <button
                    onClick={scrollToPad}
                    className="flex flex-col items-center text-slate-400 hover:text-blue-600 transition-colors animate-bounce mt-auto pb-12"
                >
                    <span className="text-sm font-semibold mb-2 uppercase tracking-widest text-slate-500">Dispatch Login</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                </button>
            </div>

            {/* Dispatch Login Terminal */}
            <div
                ref={padRef}
                className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 bg-white relative shadow-inner"
            >
                <div className="w-full max-w-sm mx-auto flex flex-col items-center bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-[0_20px_50px_rgba(8,_112,_184,_0.04)]">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-wide">Security Terminal</h2>
                        <p className="text-slate-500 text-sm mt-1">Enter your 4-digit ID</p>
                    </div>

                    {/* PIN Dots Display */}
                    <div className={`flex gap-4 mb-10 h-6 ${isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className={`w-4 h-4 rounded-full transition-all duration-300 ${index < pin.length
                                    ? 'bg-blue-600 scale-125 shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                                    : 'bg-slate-300'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Numeric Keypad */}
                    <div className="grid grid-cols-3 gap-6 w-full">
                        {keys.map((key, index) => {
                            if (key === '') return <div key={index} />; // Empty spacer

                            if (key === 'delete') {
                                return (
                                    <button
                                        key={index}
                                        onClick={handleDelete}
                                        className="flex items-center justify-center w-full aspect-square rounded-full text-slate-400 hover:bg-slate-200 active:bg-slate-300 active:scale-95 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><path d="m18 9-6 6" /><path d="m12 9 6 6" /></svg>
                                    </button>
                                );
                            }

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleKeyPress(key)}
                                    className="flex items-center justify-center w-full aspect-square rounded-full bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 text-3xl font-light text-slate-800 active:bg-slate-100 active:scale-95 transition-all"
                                >
                                    {key}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
}

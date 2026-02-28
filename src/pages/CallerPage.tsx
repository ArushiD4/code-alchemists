import { useState, useRef, useEffect } from 'react';
import { Bot, Phone, AlertTriangle } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

// ============================================================
// TRIAGE SYSTEM PROMPT — feed this to your LLM backend
// ============================================================
export const TRIAGE_SYSTEM_PROMPT = `You are an Emergency Medical Triage AI assisting a caller (family member, friend, or bystander) during a medical emergency. Your goal is to quickly and safely assess the patient's condition by asking SIMPLE, YES/NO or MULTIPLE-CHOICE questions that a non-medical person can understand.

Constraints:
Ask questions ONE BY ONE. Do not ask multiple questions at once.
Use very simple language. Do NOT use medical jargon.
Be calm, supportive, and urgent where needed.
Ask a MAXIMUM of 5 questions.
Base decisions on worst-case safety (if unsure, escalate priority).

TRIAGE CATEGORIES (INTERNAL LOGIC):
RED (Immediate – Priority 1): Life-threatening.
YELLOW (Delayed – Priority 2): Serious but stable.
GREEN (Minor – Priority 3): Minor injuries, alert and mobile.

QUESTION FLOW (MANDATORY):
1. "Is the patient awake and responding to you right now?" (NO → RED)
2. "Is the patient breathing normally?" (NO → RED)
3. "Is there heavy bleeding that will not stop even when you press on it?" (YES → RED)
4. "Does the patient have a serious injury like a broken bone, deep wound, or intense pain?" (YES → YELLOW)
5. "Can the patient stand or walk on their own?" (NO → YELLOW, YES → GREEN)

OUTPUT FORMAT (STRICT): Respond ONLY with this JSON after the final question:
{ "triage_category": "RED"|"YELLOW"|"GREEN", "priority_rank": 1|2|3, "short_reason": "...", "next_step": "Emergency logged. Ambulance dispatched based on priority." }`;

// ============================================================
// TYPES & CONSTANTS
// ============================================================
interface Message {
    role: 'ai' | 'user';
    text: string;
}

interface TriageResult {
    triage_category: 'RED' | 'YELLOW' | 'GREEN';
    priority_rank: 1 | 2 | 3;
    short_reason: string;
    next_step: string;
}

const QUESTIONS = [
    'Is the patient awake and responding to you right now?',
    'Is the patient breathing normally?',
    'Is there heavy bleeding that will not stop even when you press on it?',
    'Does the patient have a serious injury like a broken bone, deep wound, or intense pain?',
    'Can the patient stand or walk on their own?',
];

// Returns null if we should continue to next question, or a TriageResult to end.
function evaluateStep(step: number, answer: string): TriageResult | null {
    const yes = answer.toLowerCase().includes('yes');

    const endStates: Record<string, TriageResult> = {
        RED: { triage_category: 'RED', priority_rank: 1, short_reason: 'Life-threatening condition detected. Immediate response required.', next_step: 'Emergency logged. Ambulance dispatched based on priority.' },
        YELLOW: { triage_category: 'YELLOW', priority_rank: 2, short_reason: 'Serious condition but currently stable. Priority response dispatched.', next_step: 'Emergency logged. Ambulance dispatched based on priority.' },
        GREEN: { triage_category: 'GREEN', priority_rank: 3, short_reason: 'Minor condition. Patient is alert and mobile.', next_step: 'Emergency logged. Ambulance dispatched based on priority.' },
    };

    switch (step) {
        case 0: return yes ? null : endStates.RED;   // Not awake → RED
        case 1: return yes ? null : endStates.RED;   // Not breathing normally → RED
        case 2: return yes ? endStates.RED : null;   // Heavy bleeding → RED
        case 3: return yes ? endStates.YELLOW : null;    // Serious injury → YELLOW
        case 4: return yes ? endStates.GREEN : endStates.YELLOW; // Can't walk → YELLOW, else → GREEN
        default: return null;
    }
}

const TRIAGE_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    RED: { bg: 'bg-red-950', border: 'border-red-500', text: 'text-red-400', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.35)]' },
    YELLOW: { bg: 'bg-yellow-950', border: 'border-yellow-500', text: 'text-yellow-400', glow: 'shadow-[0_0_30px_rgba(234,179,8,0.35)]' },
    GREEN: { bg: 'bg-green-950', border: 'border-green-500', text: 'text-green-400', glow: 'shadow-[0_0_30px_rgba(34,197,94,0.35)]' },
};

// ============================================================
// COMPONENT
// ============================================================
export default function CallerPage() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', text: QUESTIONS[0] },
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || isTyping || triageResult) return;

        // 1. Append user's message immediately
        setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
        setIsTyping(true);

        // 2. Simulate AI "thinking" for 1 second
        setTimeout(async () => {
            const result = evaluateStep(currentStep, trimmed);

            if (result) {
                // End state reached — show result
                setTriageResult(result);
                setIsTyping(false);

                // Push triage result to Firestore
                const now = new Date();
                const hhmmss = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0') + now.getSeconds().toString().padStart(2, '0');
                const pId = `CAL-${hhmmss}`;
                try {
                    await addDoc(collection(db, 'patients'), {
                        id: pId,
                        triage: result.triage_category,
                        status: 'waiting',
                        patientLat: 18.5074,
                        patientLng: 73.8077,
                        timestamp: serverTimestamp(),
                    });
                } catch (err) {
                    console.error('Failed to push triage to Firestore:', err);
                }
            } else {
                // Advance to next question
                const nextStep = currentStep + 1;
                setCurrentStep(nextStep);
                setMessages(prev => [...prev, { role: 'ai', text: QUESTIONS[nextStep] }]);
                setIsTyping(false);
            }
        }, 1000);
    };

    const handleQuickReply = (val: string) => handleSendMessage(val);

    const isDisabled = isTyping || !!triageResult;

    // -------------------------------------------------------
    // RENDER
    // -------------------------------------------------------
    return (
        <div className="flex-1 flex flex-col w-full h-[100dvh] bg-slate-950 text-slate-50">

            {/* ── HEADER ── */}
            <div className="flex-none flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_14px_rgba(220,38,38,0.45)]">
                    <Phone className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="font-black text-base tracking-wide text-slate-100">Emergency Triage</h1>
                    <p className="text-xs text-slate-400 font-medium">Answer a few quick questions</p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs font-bold">
                    <span className="text-slate-500 font-normal">Question</span>
                    <span className={`text-slate-100 ${triageResult ? '' : 'text-blue-400'}`}>
                        {triageResult ? '—' : `${Math.min(currentStep + 1, 5)} / 5`}
                    </span>
                </div>
            </div>

            {/* ── MESSAGE HISTORY ── */}
            <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">
                {messages.map((msg, i) => {
                    if (typeof msg.text === 'string' && msg.text.includes('"triage_category"')) {
                        return null;
                    }

                    return (
                        <div
                            key={i}
                            className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {msg.role === 'ai' && (
                                <div className="flex-none w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-sm">
                                    <Bot className="w-4 h-4 text-blue-400" />
                                </div>
                            )}
                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md ${msg.role === 'ai'
                                ? 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
                                : 'bg-blue-600 text-white rounded-br-sm'}`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    );
                })}

                {/* Typing indicator */}
                {isTyping && (
                    <div className="flex items-end gap-2.5">
                        <div className="flex-none w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Inline triage result card */}
                {triageResult && (() => {
                    const c = TRIAGE_COLORS[triageResult.triage_category];
                    return (
                        <div className={`rounded-2xl border-2 p-5 flex flex-col gap-3 mt-2 ${c.bg} ${c.border} ${c.glow}`}>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className={`w-7 h-7 shrink-0 ${c.text}`} strokeWidth={2} />
                                <div>
                                    <p className={`text-xs font-black tracking-widest uppercase ${c.text}`}>
                                        Priority {triageResult.priority_rank} · Triage Result
                                    </p>
                                    <p className={`text-3xl font-black tracking-tight ${c.text}`}>
                                        {triageResult.triage_category}
                                    </p>
                                </div>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">{triageResult.short_reason}</p>
                            <div className="bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-700/50">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Next Step</p>
                                <p className="text-slate-200 text-sm font-semibold">{triageResult.next_step}</p>
                            </div>
                            {/* JSON payload preview */}
                            <pre className="text-[11px] text-slate-500 bg-slate-900 rounded-xl p-3 overflow-x-auto border border-slate-800 leading-relaxed">
                                {JSON.stringify({
                                    triage_category: triageResult.triage_category,
                                    priority_rank: triageResult.priority_rank,
                                    short_reason: triageResult.short_reason,
                                    next_step: triageResult.next_step,
                                }, null, 2)}
                            </pre>
                        </div>
                    );
                })()}

                <div ref={bottomRef} />
            </div>

            {/* ── QUICK REPLIES ── */}
            <div className="flex-none px-4 pt-2 pb-4 flex flex-col gap-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleQuickReply('Yes')}
                        disabled={isDisabled}
                        className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-widest uppercase transition-all border border-green-500 shadow-[0_0_16px_rgba(34,197,94,0.2)]"
                    >
                        Yes
                    </button>
                    <button
                        onClick={() => handleQuickReply('No')}
                        disabled={isDisabled}
                        className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm tracking-widest uppercase transition-all border border-red-500 shadow-[0_0_16px_rgba(220,38,38,0.2)]"
                    >
                        No
                    </button>
                </div>

                {triageResult && (
                    <button
                        onClick={() => window.location.reload()}
                        className="text-slate-500 text-xs hover:text-slate-300 underline underline-offset-4 transition-colors text-center"
                    >
                        Start a new report
                    </button>
                )}
            </div>
        </div>
    );
}

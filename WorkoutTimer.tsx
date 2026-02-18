import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, ArrowLeft, Clock } from 'lucide-react';

interface WorkoutTimerProps {
    onBack: () => void;
}

export const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ onBack }) => {
    const [timeLeft, setTimeLeft] = useState(0);
    const [duration, setDuration] = useState(60); // Default 60s
    const [isRunning, setIsRunning] = useState(false);
    const [customInput, setCustomInput] = useState('60');

    // Audio Ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Initialize audio
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.volume = 0.5;

        // Check localStorage for existing timer state
        const savedTarget = localStorage.getItem('gym_smart_timer_target');
        const savedDuration = localStorage.getItem('gym_smart_timer_duration');

        if (savedDuration) {
            const d = parseInt(savedDuration);
            setDuration(d);
            setCustomInput(d.toString());
        }

        if (savedTarget) {
            const targetTime = parseInt(savedTarget);
            const now = Date.now();

            if (targetTime > now) {
                // Timer is still running
                setTimeLeft(Math.ceil((targetTime - now) / 1000));
                setIsRunning(true);
            } else {
                // Timer finished while away
                setTimeLeft(0);
                setIsRunning(false);
                localStorage.removeItem('gym_smart_timer_target');
            }
        } else {
            // No running timer, set to duration
            if (savedDuration) {
                setTimeLeft(parseInt(savedDuration));
            } else {
                setTimeLeft(60);
            }
        }
    }, []);

    useEffect(() => {
        let interval: number;

        if (isRunning && timeLeft > 0) {
            interval = window.setInterval(() => {
                const savedTarget = localStorage.getItem('gym_smart_timer_target');
                if (savedTarget) {
                    const targetTime = parseInt(savedTarget);
                    const now = Date.now();
                    const remaining = Math.ceil((targetTime - now) / 1000);

                    if (remaining <= 0) {
                        setTimeLeft(0);
                        setIsRunning(false);
                        localStorage.removeItem('gym_smart_timer_target');
                        playAlarm();
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    } else {
                        setTimeLeft(remaining);
                    }
                } else {
                    // Fallback if localStorage cleared
                    setIsRunning(false);
                }
            }, 100);
        } else if (timeLeft === 0 && isRunning) {
            setIsRunning(false);
            localStorage.removeItem('gym_smart_timer_target');
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    const playAlarm = () => {
        if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed", e));
        }
    };

    const startTimer = () => {
        const targetTime = Date.now() + timeLeft * 1000;
        localStorage.setItem('gym_smart_timer_target', targetTime.toString());
        localStorage.setItem('gym_smart_timer_duration', duration.toString());
        setIsRunning(true);
    };

    const pauseTimer = () => {
        setIsRunning(false);
        localStorage.removeItem('gym_smart_timer_target');
        // timeleft stays as is
    };

    const resetTimer = () => {
        setIsRunning(false);
        localStorage.removeItem('gym_smart_timer_target');
        setTimeLeft(duration);
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomInput(e.target.value);
    };

    const setCustomDuration = () => {
        const val = parseInt(customInput);
        if (!isNaN(val) && val > 0) {
            setDuration(val);
            setTimeLeft(val);
            localStorage.setItem('gym_smart_timer_duration', val.toString());
            // Stop timer if running
            if (isRunning) {
                pauseTimer();
            }
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const presets = [30, 60, 90, 120, 180];

    return (
        <div className="flex flex-col h-full bg-zinc-950 animate-fade-in p-6">
            {/* Header */}
            <div className="flex items-center mb-8">
                <button
                    onClick={onBack}
                    className="bg-zinc-900 p-2 rounded-full text-white hover:bg-zinc-800 transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold ml-4 flex items-center">
                    <Clock className="mr-2 text-lime-400" /> Workout Timer
                </h1>
            </div>

            {/* Main Display */}
            <div className="flex-1 flex flex-col items-center justify-center">

                {/* Timer Circle/Display */}
                <div className="mb-12 relative w-64 h-64 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full border-8 ${isRunning ? 'border-lime-400 animate-pulse' : 'border-zinc-800'} opacity-30`}></div>
                    <div className="text-7xl font-mono font-bold text-white tracking-widest">
                        {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-6 mb-12">
                    {!isRunning ? (
                        <button
                            onClick={startTimer}
                            className="w-20 h-20 bg-lime-400 rounded-full flex items-center justify-center shadow-lg shadow-lime-400/20 hover:scale-105 transition-transform"
                        >
                            <Play size={32} className="text-black ml-1" fill="black" />
                        </button>
                    ) : (
                        <button
                            onClick={pauseTimer}
                            className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg shadow-yellow-400/20 hover:scale-105 transition-transform"
                        >
                            <Pause size={32} className="text-black" fill="black" />
                        </button>
                    )}

                    <button
                        onClick={resetTimer}
                        className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                    >
                        <RotateCcw size={24} />
                    </button>
                </div>

                {/* Settings */}
                <div className="w-full max-w-sm space-y-6">

                    {/* Presets */}
                    <div className="flex justify-between gap-2">
                        {presets.map(sec => (
                            <button
                                key={sec}
                                onClick={() => {
                                    setDuration(sec);
                                    setCustomInput(sec.toString());
                                    setTimeLeft(sec);
                                    localStorage.setItem('gym_smart_timer_duration', sec.toString());
                                    if (isRunning) pauseTimer();
                                }}
                                className={`py-2 px-3 rounded-xl text-sm font-bold transition-colors flex-1 ${duration === sec ? 'bg-zinc-800 text-lime-400 border border-lime-400/50' : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                                    }`}
                            >
                                {sec < 60 ? `${sec}s` : `${sec / 60}m`}
                            </button>
                        ))}
                    </div>

                    {/* Custom Input */}
                    <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4">
                        <span className="text-zinc-400 text-sm">Custom (sec):</span>
                        <input
                            type="number"
                            value={customInput}
                            onChange={handleDurationChange}
                            className="bg-transparent border-b border-zinc-700 text-white font-bold w-20 text-center focus:outline-none focus:border-lime-400"
                        />
                        <button
                            onClick={setCustomDuration}
                            className="ml-auto text-xs bg-zinc-800 px-3 py-1 rounded-lg hover:bg-zinc-700 text-white"
                        >
                            Set
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
};

"use client";

import { useState, useEffect } from "react";

const OnboardingOverlay = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem("scenehub_onboarding_seen");
        if (!hasSeen) {
            // Delay showing to let the scene load first
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem("scenehub_onboarding_seen", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[2px] animate-fade-in">
            <div className="glass max-w-sm w-full p-6 rounded-3xl shadow-2xl animate-scale-in relative overflow-hidden">
                {/* Background Decorative Gradient */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 blur-3xl rounded-full" />

                <div className="relative z-10 text-center space-y-4">
                    <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-500/20 rounded-2xl flex items-center justify-center text-2xl">
                        👋
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            Welcome to SceneHub
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Interactive 3D Model Viewer
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-4">
                        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="text-xl">🖱️</div>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Left Click</span>
                            <span className="text-[10px] text-slate-400">Rotate</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="text-xl">🖱️</div>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Right Click</span>
                            <span className="text-[10px] text-slate-400">Pan</span>
                        </div>
                        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                            <div className="text-xl">📜</div>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">Scroll</span>
                            <span className="text-[10px] text-slate-400">Zoom</span>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        className="w-full py-3 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-sm shadow-lg hover:shadow-xl active:scale-95 transition-all glow-hover"
                    >
                        Start Exploring
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingOverlay;

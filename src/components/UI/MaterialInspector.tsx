"use client";

import { useEffect, useRef, useState } from "react";
import { MaterialInfo } from "@/lib/materialUtils";
import { motion, AnimatePresence } from "framer-motion";
import { HexColorPicker } from "react-colorful";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface MaterialInspectorProps {
    materials: MaterialInfo[];
    onUpdate: (uuid: string, key: keyof MaterialInfo, value: any) => void;
    onExport: () => void;
    visible: boolean;
    onClose: () => void;
}

const PRESETS = [
    { name: "Plastic", metalness: 0, roughness: 0.5 },
    { name: "Metal", metalness: 1, roughness: 0.2 },
    { name: "Glass", metalness: 0.1, roughness: 0, opacity: 0.5, transparent: true },
    { name: "Matte", metalness: 0, roughness: 1 },
];

const MaterialInspector = ({
    materials,
    onUpdate,
    onExport,
    visible,
    onClose,
}: MaterialInspectorProps) => {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [originalCache, setOriginalCache] = useState<Record<string, MaterialInfo>>({});

    // Initialize selection and cache originals
    useEffect(() => {
        if (visible && materials.length > 0) {
            if (!selectedId) setSelectedId(materials[0].uuid);

            // Cache initial state for reset functionality
            setOriginalCache(prev => {
                const newCache = { ...prev };
                materials.forEach(m => {
                    if (!newCache[m.uuid]) newCache[m.uuid] = { ...m };
                });
                return newCache;
            });
        }
    }, [visible, materials, selectedId]);

    const currentMat = materials.find((m) => m.uuid === selectedId);

    const handleCopy = (type: "json" | "jsx") => {
        if (!currentMat) return;
        const { generateMaterialConfig, generateReactSnippet } = require("@/lib/materialUtils");
        const text = type === "json" ? generateMaterialConfig(currentMat) : generateReactSnippet(currentMat);
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const applyPreset = (preset: typeof PRESETS[0]) => {
        if (!currentMat) return;
        if (preset.metalness !== undefined) onUpdate(currentMat.uuid, "metalness", preset.metalness);
        if (preset.roughness !== undefined) onUpdate(currentMat.uuid, "roughness", preset.roughness);
        if (preset.opacity !== undefined) onUpdate(currentMat.uuid, "opacity", preset.opacity);
        if (preset.transparent !== undefined) onUpdate(currentMat.uuid, "transparent", preset.transparent);
    };

    const handleReset = () => {
        if (!currentMat || !originalCache[currentMat.uuid]) return;
        const original = originalCache[currentMat.uuid];
        Object.keys(original).forEach(key => {
            // @ts-ignore
            onUpdate(currentMat.uuid, key as keyof MaterialInfo, original[key]);
        });
    };

    return (
        <AnimatePresence>
            {visible && (
                <>
                    {/* Mobile Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        drag
                        dragMomentum={false}
                        dragListener={false} // Disable drag on content by default
                        dragControls={undefined}
                        className={cn(
                            "fixed z-40 flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl border border-slate-200 dark:border-slate-800",
                            // Mobile: Fixed Bottom Sheet
                            "bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh]",
                            // Desktop: Floating Panel
                            "md:top-24 md:right-6 md:w-80 md:rounded-3xl md:h-auto md:max-h-[80vh] md:bottom-auto md:left-auto"
                        )}
                    >
                        {/* Header - Draggable Area */}
                        <div
                            className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 shrink-0 cursor-grab active:cursor-grabbing touch-none"
                            onPointerDown={(e) => {
                                // Only enable drag on desktop
                                if (window.innerWidth >= 768) {
                                    // Using framer-motion drag controls would be ideal, but for now relying on parent 'drag'
                                    // The 'dragListener={false}' prop on parent means we need to manually start drag, 
                                    // OR we set dragListener={true} and stop propagation on content. 
                                    // Let's do the latter for simplicity in this replacement.
                                }
                            }}
                        >
                            <div className="flex items-center gap-2 pointer-events-none">
                                <div className="w-1 md:w-2 h-6 bg-blue-500 rounded-full" />
                                <h3 className="font-bold text-slate-800 dark:text-slate-100">Material Editor</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleReset}
                                    className="text-xs font-semibold text-slate-400 hover:text-blue-500 transition px-2"
                                >
                                    Reset
                                </button>
                                <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition">
                                    <svg className="w-5 h-5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="overflow-y-auto flex-1 p-4 space-y-6" onPointerDown={(e) => e.stopPropagation()}>

                            {/* Material Selector */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Selected Material</label>
                                <select
                                    value={selectedId || ""}
                                    onChange={(e) => setSelectedId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {materials.map((m) => (
                                        <option key={m.uuid} value={m.uuid}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            {currentMat ? (
                                <>
                                    {/* Presets */}
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                        {PRESETS.map(preset => (
                                            <button
                                                key={preset.name}
                                                onClick={() => applyPreset(preset)}
                                                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-500 transition whitespace-nowrap"
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Color Pickers */}
                                    <div className="space-y-4">
                                        <ColorInput
                                            label="Base Color"
                                            value={currentMat.color}
                                            onChange={(v) => onUpdate(currentMat.uuid, "color", v)}
                                        />
                                        <ColorInput
                                            label="Emissive"
                                            value={currentMat.emissive}
                                            onChange={(v) => onUpdate(currentMat.uuid, "emissive", v)}
                                        />
                                    </div>

                                    {/* Sliders */}
                                    <div className="space-y-4">
                                        <ControlSlider
                                            label="Metalness"
                                            value={currentMat.metalness}
                                            onChange={(v) => onUpdate(currentMat.uuid, "metalness", v)}
                                        />
                                        <ControlSlider
                                            label="Roughness"
                                            value={currentMat.roughness}
                                            onChange={(v) => onUpdate(currentMat.uuid, "roughness", v)}
                                        />
                                        <ControlSlider
                                            label="Normal Scale"
                                            value={currentMat.normalScale}
                                            max={3}
                                            onChange={(v) => onUpdate(currentMat.uuid, "normalScale", v)}
                                        />
                                        <ControlSlider
                                            label="Opacity"
                                            value={currentMat.opacity}
                                            onChange={(v) => onUpdate(currentMat.uuid, "opacity", v)}
                                        />
                                    </div>

                                    {/* Toggles */}
                                    <div className="flex gap-4 pt-2">
                                        <Toggle label="Wireframe" checked={currentMat.wireframe} onChange={(v) => onUpdate(currentMat.uuid, "wireframe", v)} />
                                        <Toggle label="Transparent" checked={currentMat.transparent} onChange={(v) => onUpdate(currentMat.uuid, "transparent", v)} />
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-slate-400 py-8">Select a material to edit</div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl space-y-2 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleCopy("json")}
                                    className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition active:scale-95"
                                >
                                    {copied === "json" ? "Copied JSON!" : "Copy JSON"}
                                </button>
                                <button
                                    onClick={() => handleCopy("jsx")}
                                    className="flex-1 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition active:scale-95"
                                >
                                    {copied === "jsx" ? "Copied JSX!" : "Copy JSX"}
                                </button>
                            </div>
                            <button
                                onClick={onExport}
                                className="w-full py-3 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 text-xs font-bold hover:bg-blue-500 transition active:scale-95 glow-hover"
                            >
                                Save Changes to GLB
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

const ColorInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Simple click outside handler
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (isOpen && popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                <span>{label}</span>
                <span className="font-mono text-slate-500">{value}</span>
            </div>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 px-3 hover:border-blue-500 transition"
                >
                    <div className="w-6 h-6 rounded-md shadow-sm border border-black/5" style={{ backgroundColor: value }} />
                    <span className="text-xs font-mono text-slate-600 dark:text-slate-400 flex-1 text-left">{value}</span>
                </button>

                {isOpen && (
                    <div ref={popoverRef} className="absolute top-12 left-0 z-50 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                        <HexColorPicker color={value} onChange={onChange} />
                    </div>
                )}
            </div>
        </div>
    )
}

const ControlSlider = ({ label, value, onChange, min = 0, max = 1, step = 0.01 }: { label: string, value: number, onChange: (v: number) => void, min?: number, max?: number, step?: number }) => (
    <div className="space-y-2">
        <div className="flex justify-between text-xs">
            <span className="font-bold text-slate-500">{label}</span>
            <span className="font-mono text-slate-400">{value.toFixed(2)}</span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white shadow-sm transition hover:bg-slate-300 dark:hover:bg-slate-600"
        />
    </div>
);

const Toggle = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2 cursor-pointer group select-none">
        <div className={cn(
            "w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200",
            checked ? "bg-blue-500 border-blue-500" : "bg-transparent border-slate-300 dark:border-slate-600 group-hover:border-blue-400"
        )}>
            {checked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <input type="checkbox" className="hidden" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition">{label}</span>
    </label>
)

export default MaterialInspector;

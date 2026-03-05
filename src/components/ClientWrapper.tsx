"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import CommunicationHub from "@/lib/communication";
import {
  DEFAULT_ALLOWED_ORIGINS,
  DEFAULT_MODEL,
  SAMPLE_MODELS,
  STORAGE_KEYS,
  URL_PARAMS,
} from "@/lib/constants";
import { preloadModelBuffers } from "@/lib/modelCache";
import {
  AnimationClipInfo,
  AnimationLoopMode,
  ModelDescriptor,
  ModelStats,
  QualityLevel,
  QualityMode,
  SampleModel,
  ThemeOption,
  ViewerMode,
} from "@/types";
import EmbeddedHeader from "./UI/EmbeddedHeader";
import ModelInfoCard from "./UI/ModelInfoCard";
import ModelGallery from "./UI/ModelGallery";
import OnboardingOverlay from "./UI/OnboardingOverlay";
import MaterialInspector from "./UI/MaterialInspector";
import { MaterialInfo } from "@/lib/materialUtils";
import Toolbar from "./UI/Toolbar";
import Controls from "./Viewer/Controls";
import Scene from "./Viewer/Scene";
import ViewerCanvas, { ViewerCanvasHandle } from "./Viewer/ViewerCanvas";

const requestIdle = (task: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(task, { timeout: 2000 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 800);
  return () => window.clearTimeout(id);
};

const normalizeTheme = (value?: string | null): ThemeOption | undefined => {
  if (value === "dark") return "dark";
  if (value === "light") return "light";
  return undefined;
};

const guessNameFromUrl = (url: string) => {
  try {
    const candidate = new URL(url).pathname.split("/").pop();
    return candidate || "外部模型";
  } catch {
    return "外部模型";
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const ClientWrapper = () => {
  const searchParams = useSearchParams();
  const urlParam = searchParams.get(URL_PARAMS.model);
  const [mode, setMode] = useState<ViewerMode>("standalone");
  const [theme, setTheme] = useState<ThemeOption>("light");
  const [modelOverride, setModelOverride] = useState<{
    model: ModelDescriptor;
    urlParamKey: string | null;
  } | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [qualityMode, setQualityMode] = useState<QualityMode>("auto");
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [animationClips, setAnimationClips] = useState<AnimationClipInfo[]>([]);
  const [activeAnimationIndex, setActiveAnimationIndex] = useState(0);
  const [animationLoop, setAnimationLoop] =
    useState<AnimationLoopMode>("repeat");
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const viewerRef = useRef<ViewerCanvasHandle | null>(null);
  const localUrlsRef = useRef<string[]>([]);
  const [materialInspectorOpen, setMaterialInspectorOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialInfo[]>([]);

  const allowedOriginsLabel = useMemo(
    () => DEFAULT_ALLOWED_ORIGINS.join(", ") || "*",
    [],
  );
  const hub = useMemo(
    () => new CommunicationHub(DEFAULT_ALLOWED_ORIGINS),
    [],
  );

  const [autoQuality, setAutoQuality] = useState<QualityLevel>("high");

  const resolvedQuality =
    qualityMode === "auto" ? autoQuality : qualityMode;

  const animationAvailable = animationClips.length > 0;

  const appendEvent = useCallback((message: string) => {
    setEvents((prev) => [message, ...prev].slice(0, 6));
  }, []);

  const releaseLocalUrls = useCallback(() => {
    if (typeof window === "undefined") return;
    localUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    localUrlsRef.current = [];
  }, []);
  const urlParamModel = useMemo<ModelDescriptor | null>(() => {
    if (!urlParam) return null;
    return {
      url: urlParam,
      name: guessNameFromUrl(urlParam),
    };
  }, [urlParam]);

  const [cachedModel, setCachedModel] = useState<ModelDescriptor | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEYS.lastModel);
    if (!cached) return;
    try {
      const parsed = JSON.parse(cached) as ModelDescriptor;
      // Safety: Never restore models that used blob URLs or local file maps
      if (parsed.url && !parsed.url.startsWith("blob:") && !parsed.fileMap) {
        setCachedModel(parsed);
      } else {
        localStorage.removeItem(STORAGE_KEYS.lastModel);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.lastModel);
    }
  }, []);

  const setModel = useCallback(
    (nextModel: ModelDescriptor | null) => {
      if (!nextModel) {
        setModelOverride(null);
        return;
      }
      setModelOverride({ model: nextModel, urlParamKey: urlParam });
    },
    [urlParam],
  );

  const model = useMemo<ModelDescriptor>(() => {
    if (urlParamModel) {
      if (modelOverride && modelOverride.urlParamKey === urlParam) {
        return modelOverride.model;
      }
      return urlParamModel;
    }
    return modelOverride?.model ?? cachedModel ?? DEFAULT_MODEL;
  }, [cachedModel, modelOverride, urlParam, urlParamModel]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoQuality("low");
      return;
    }
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    if (deviceMemory && deviceMemory <= 4) {
      setAutoQuality("low");
      return;
    }
    if (deviceMemory && deviceMemory <= 8) {
      setAutoQuality("medium");
      return;
    }
    const hardwareConcurrency = (
      navigator as Navigator & { hardwareConcurrency?: number }
    ).hardwareConcurrency;
    if (hardwareConcurrency && hardwareConcurrency <= 4) {
      setAutoQuality("medium");
      return;
    }
    setAutoQuality("high");
  }, []);

  useEffect(() => {
    const forcedEmbedded = searchParams.get(URL_PARAMS.embedded) === "true";
    const iframeDetected =
      typeof window !== "undefined" && window.self !== window.top;
    const nextMode =
      forcedEmbedded || iframeDetected ? "embedded" : "standalone";

    // 为了根据宿主环境同步模式，允许在 effect 中更新本地状态
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(nextMode);
    appendEvent(`模式检测：${nextMode === "embedded" ? "嵌入" : "独立"}`);
  }, [appendEvent, searchParams]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData || resolvedQuality === "low") return;

    const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
      .deviceMemory;
    const maxPrefetch = deviceMemory && deviceMemory < 4 ? 2 : 3;
    const candidates = [...SAMPLE_MODELS]
      .sort((a, b) => a.sizeBytes - b.sizeBytes)
      .slice(0, maxPrefetch)
      .map((item) => item.url);

    const cancel = requestIdle(() => {
      preloadModelBuffers(candidates);
    });

    return cancel;
  }, [resolvedQuality]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(STORAGE_KEYS.quality);
    if (!saved) return;
    const mode = saved as QualityMode;
    if (mode === "auto" || mode === "low" || mode === "medium" || mode === "high") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQualityMode(mode);
    }
  }, []);

  useEffect(() => {
    const paramTheme = normalizeTheme(searchParams.get(URL_PARAMS.theme));
    const cachedTheme = normalizeTheme(
      typeof window !== "undefined"
        ? localStorage.getItem(STORAGE_KEYS.theme)
        : undefined,
    );
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    const nextTheme =
      paramTheme || cachedTheme || (prefersDark ? "dark" : "light");
    // URL/系统偏好合并，需在 effect 内同步 theme
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(nextTheme);
  }, [searchParams]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
  }, [theme]);


  useEffect(() => {
    if (!model || typeof window === "undefined") return;
    if (model.url.startsWith("blob:") || model.fileMap) return;
    localStorage.setItem(STORAGE_KEYS.lastModel, JSON.stringify(model));
  }, [model]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnimationPlaying(false);
    setAnimationClips([]);
    setActiveAnimationIndex(0);
    setAnimationLoop("repeat");
    setAnimationSpeed(1);
  }, [model?.url]);

  useEffect(() => {
    return () => {
      releaseLocalUrls();
    };
  }, [releaseLocalUrls]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.quality, qualityMode);
  }, [qualityMode]);

  useEffect(() => {
    const unsubscribe = hub.listen((action, data) => {
      appendEvent(`收到父页面消息：${action}`);

      if (
        action === "load_model" &&
        isRecord(data) &&
        typeof data.url === "string"
      ) {
        releaseLocalUrls();
        setModelStats(null);
        setErrorMessage(null);
        setLoadingProgress(0);
        setModel({
          url: data.url,
          name:
            typeof data.name === "string"
              ? data.name
              : guessNameFromUrl(data.url),
        });
      }

      if (action === "set_theme" && isRecord(data)) {
        const nextTheme =
          typeof data.theme === "string" ? normalizeTheme(data.theme) : undefined;
        if (nextTheme) setTheme(nextTheme);
      }
    });

    return unsubscribe;
  }, [appendEvent, hub, releaseLocalUrls, setModel]);

  const handleToggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      hub.postMessage("set_theme", { theme: next });
      return next;
    });
  }, [hub]);

  const handleQualityChange = useCallback((mode: QualityMode) => {
    setQualityMode(mode);
  }, []);

  const handleToggleAnimation = useCallback(() => {
    setAnimationPlaying((prev) => !prev);
  }, []);

  const handleAnimationList = useCallback((clips: AnimationClipInfo[]) => {
    setAnimationClips(clips);
    setActiveAnimationIndex(0);
    setAnimationLoop("repeat");
    setAnimationSpeed(1);
    if (clips.length === 0) {
      setAnimationPlaying(false);
    }
  }, []);

  const handleAnimationSelect = useCallback((index: number) => {
    setActiveAnimationIndex(index);
  }, []);

  const handleAnimationLoopChange = useCallback((mode: AnimationLoopMode) => {
    setAnimationLoop(mode);
  }, []);

  const handleAnimationSpeedChange = useCallback((speed: number) => {
    setAnimationSpeed(speed);
  }, []);

  const handleLoadingState = useCallback(
    (state: { loading: boolean; progress: number }) => {
      setLoadingProgress(state.progress);
    },
    [],
  );

  const handleExported = useCallback(
    (format: "glb" | "gltf", size: number) => {
      appendEvent(
        `导出完成（${format}）：${Math.max(1, Math.round(size / 1024))}KB`,
      );
    },
    [appendEvent],
  );

  const handleLoadSample = useCallback(() => {
    // Don't revoke blob URLs immediately - let them be cleaned up naturally
    // or when a new local file is imported
    setModelStats(null);
    setErrorMessage(null);
    setLoadingProgress(0);
    setModel(DEFAULT_MODEL);
    appendEvent("加载示例模型指令已触发");
  }, [appendEvent, setModel]);

  const handleSelectSample = useCallback(
    (item: SampleModel) => {
      // Don't revoke blob URLs when switching to samples
      // Let them be cleaned up naturally to avoid race conditions
      setModel({ url: item.url, name: item.name });
      setModelStats(null);
      setErrorMessage(null);
      setLoadingProgress(0);
      appendEvent(`选择示例模型：${item.name}`);
    },
    [appendEvent, setModel],
  );

  const handleImportFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const fileArray = Array.from(files);
      const glbFile = fileArray.find((file) =>
        file.name.toLowerCase().endsWith(".glb"),
      );
      const gltfFile = fileArray.find((file) =>
        file.name.toLowerCase().endsWith(".gltf"),
      );
      const mainFile = glbFile || gltfFile;

      if (!mainFile) {
        setErrorMessage("请上传 .glb 或 .gltf 文件");
        appendEvent("导入失败：未检测到 glb/gltf 文件");
        return;
      }

      // Only revoke previous blob URLs if they exist, and with a generous delay
      // to ensure all textures have finished loading
      const previousUrls = localUrlsRef.current;
      if (previousUrls.length > 0) {
        setTimeout(() => {
          previousUrls.forEach(url => URL.revokeObjectURL(url));
          console.log(`[ClientWrapper] Revoked ${previousUrls.length} old blob URLs`);
        }, 5000); // 5 second delay to be extra safe
      }

      const fileMap: Record<string, string> = {};
      const localUrls: string[] = [];
      fileArray.forEach((file) => {
        const objectUrl = URL.createObjectURL(file);
        fileMap[file.name] = objectUrl;
        fileMap[file.name.toLowerCase()] = objectUrl;
        localUrls.push(objectUrl);
      });
      localUrlsRef.current = localUrls;

      setModelStats(null);
      setErrorMessage(null);
      setLoadingProgress(0);
      setModel({
        url: fileMap[mainFile.name] || fileMap[mainFile.name.toLowerCase()],
        name: mainFile.name,
        fileMap: gltfFile ? fileMap : undefined,
      });
      appendEvent(`导入本地模型：${mainFile.name}`);
    },
    [appendEvent, setModel],
  );

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    SAMPLE_MODELS.forEach((item) => {
      item.tags.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, []);

  const filteredSamples = useMemo(() => {
    if (activeTags.length === 0) return SAMPLE_MODELS;
    return SAMPLE_MODELS.filter((item) =>
      activeTags.every((tag) => item.tags.includes(tag)),
    );
  }, [activeTags]);

  const toggleTag = useCallback((tag: string) => {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  }, []);

  const clearTags = useCallback(() => {
    setActiveTags([]);
  }, []);

  const activeSample = useMemo(
    () => SAMPLE_MODELS.find((item) => item.url === model?.url) || null,
    [model?.url],
  );

  const handleExport = useCallback(
    async (format: "glb" | "gltf") => {
      appendEvent(`导出请求：${format}`);
      hub.postMessage("export_requested", { format });

      if (!viewerRef.current) {
        appendEvent("导出失败：模型尚未就绪");
        hub.postMessage("error", { message: "模型尚未就绪" });
        return;
      }

      try {
        const { blob, filename } = await viewerRef.current.exportModel(format);
        const sizeKB = Math.max(1, Math.round(blob.size / 1024));
        appendEvent(`导出完成：${filename}（${sizeKB}KB）`);
        hub.postMessage("export_complete", {
          format,
          filename,
          size: blob.size,
        });
      } catch (_error) {
        const message =
          _error instanceof Error ? _error.message : "导出失败，未知错误";
        appendEvent(`导出失败：${message}`);
        hub.postMessage("error", { message });
      }
    },
    [appendEvent, hub],
  );

  const handleModelLoaded = useCallback(
    (modelName: string) => {
      setErrorMessage(null);
      setLoadingProgress(100);
      appendEvent(`模型加载完成：${modelName}`);
      hub.postMessage("model_loaded", { modelName, status: "success" });
    },
    [appendEvent, hub],
  );

  const handleLoadError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      setModelStats(null);
      setAnimationClips([]);
      setAnimationPlaying(false);
      appendEvent(`模型加载错误：${message}`);
      hub.postMessage("error", { message });
    },
    [appendEvent, hub],
  );

  const handleStats = useCallback((stats: ModelStats) => {
    setModelStats(stats);
  }, []);

  const showChrome = mode === "standalone";
  const [showSidebar, setShowSidebar] = useState(false);

  // Toggle sidebar for gallery/info
  const toggleSidebar = useCallback(() => setShowSidebar(prev => !prev), []);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white dark:bg-black text-slate-900 dark:text-slate-100">

      {/* 1. Immersive 3D Scene Background */}
      <div className="absolute inset-0 z-0">
        <Scene>
          <ViewerCanvas
            ref={viewerRef}
            theme={theme}
            quality={resolvedQuality}
            model={model}
            playAnimations={animationPlaying}
            activeAnimationIndex={activeAnimationIndex}
            animationLoop={animationLoop}
            animationSpeed={animationSpeed}
            onLoaded={handleModelLoaded}
            onError={handleLoadError}
            onStats={handleStats}
            onAnimationList={handleAnimationList}
            onExported={handleExported}
            onLoadingState={handleLoadingState}
          />
        </Scene>
      </div>

      {/* 2. Floating UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6">

        {/* Top Bar: Brand & Stats */}
        <header className="pointer-events-auto flex items-start justify-between animate-slide-down">
          <div className={`glass rounded-full py-2 px-4 transition-all duration-300 ${showChrome ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h1 className="text-sm font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">SceneHub</h1>
              </div>
              {loadingProgress < 100 && (
                <>
                  <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{loadingProgress}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Sidebar Toggle & Quick Actions */}
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={toggleSidebar}
              className="glass h-10 w-10 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all duration-300 shadow-sm hover:shadow-md"
              title="Model Gallery & Info"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
            </button>
          </div>
        </header>

        {/* Center/Bottom: Controls Overlay */}
        <div className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2 animate-slide-up w-auto max-w-[90vw]">
          <div className="glass rounded-full p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 hover:shadow-3xl hover:bg-[var(--panel)]/90">
            <Toolbar
              mode={mode}
              theme={theme}
              qualityMode={qualityMode}
              resolvedQuality={resolvedQuality}
              modelName={model?.name}
              animationAvailable={animationAvailable}
              animationPlaying={animationPlaying}
              animationClips={animationClips}
              activeAnimationIndex={activeAnimationIndex}
              animationLoop={animationLoop}
              animationSpeed={animationSpeed}
              onLoadSample={() => {
                setMaterials([]);
                setMaterialInspectorOpen(false);
                setModel(null);
              }}
              onImportFiles={handleImportFiles}
              onExport={handleExport}
              onToggleTheme={handleToggleTheme}
              onQualityChange={handleQualityChange}
              onToggleAnimation={handleToggleAnimation}
              onAnimationSelect={handleAnimationSelect}
              onAnimationLoopChange={handleAnimationLoopChange}
              onAnimationSpeedChange={handleAnimationSpeedChange}
              onToggleMaterialInspector={() => {
                if (!materialInspectorOpen && viewerRef.current) {
                  setMaterials(viewerRef.current.getMaterials());
                }
                setMaterialInspectorOpen(prev => !prev);
              }}
            />
          </div>
        </div>
      </div>

      {/* Material Inspector */}
      <MaterialInspector
        visible={materialInspectorOpen}
        materials={materials}
        onClose={() => setMaterialInspectorOpen(false)}
        onUpdate={(uuid, key, value) => {
          viewerRef.current?.updateMaterial(uuid, key, value);
          setMaterials(prev => prev.map(m =>
            m.uuid === uuid ? { ...m, [key]: value } : m
          ));
        }}
        onExport={() => handleExport("glb")}
      />

      {/* 3. Slide-over Sidebar (Gallery & Info) */}
      <div className={`absolute top-0 right-0 h-full w-full sm:w-[360px] bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl z-20 transform transition-transform duration-300 ease-spring ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full border-l border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between p-4 border-b border-black/5 dark:border-white/5">
            <h2 className="font-semibold">Library & Inspector</h2>
            <button onClick={toggleSidebar} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Model Info Section */}
            <section>
              <ModelInfoCard
                sample={activeSample}
                model={model}
                stats={modelStats}
                errorMessage={errorMessage}
                variant="compact"
              />
            </section>

            <hr className="border-black/5 dark:border-white/5" />

            {/* Gallery Section */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-500">Sample Models</h3>
                <div className="flex gap-1">
                  <button
                    onClick={clearTags}
                    className={`text-[10px] px-2 py-1 rounded-full border transition ${activeTags.length === 0 ? 'bg-slate-800 text-white border-transparent' : 'bg-transparent border-slate-200 text-slate-500'}`}
                  >
                    All
                  </button>
                  {/* Only show first few tags to save space or implement specialized tag selector if needed */}
                </div>
              </div>
              <ModelGallery
                items={filteredSamples}
                activeUrl={model?.url}
                layout="grid"
                onSelect={(item) => {
                  handleSelectSample(item);
                  if (window.innerWidth < 1024) setShowSidebar(false); // Auto close on mobile
                }}
              />
            </section>

            {/* Events / Debug Log (keep it but folded or smaller) */}
            <section className="pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">System Events</h3>
              <div className="bg-slate-50 dark:bg-black/20 rounded-lg p-2 font-mono text-[10px] text-slate-500 max-h-24 overflow-y-auto">
                {events.length === 0 && <span className="opacity-50">No events logged</span>}
                {events.map((e, i) => (
                  <div key={i} className="mb-1 border-b border-black/5 last:border-0 pb-1 last:pb-0">{e}</div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
      {/* 4. Onboarding Overlay */}
      <OnboardingOverlay />
    </div>
  );
};

export default ClientWrapper;

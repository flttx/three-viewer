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
import StandaloneHeader from "./UI/StandaloneHeader";
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

  const cachedModel = useMemo<ModelDescriptor | null>(() => {
    if (typeof window === "undefined") return null;
    const cached = localStorage.getItem(STORAGE_KEYS.lastModel);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached) as ModelDescriptor;
      if (parsed.url && !parsed.url.startsWith("blob:")) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
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
    releaseLocalUrls();
    setModelStats(null);
    setErrorMessage(null);
    setLoadingProgress(0);
    setModel(DEFAULT_MODEL);
    appendEvent("加载示例模型指令已触发");
  }, [appendEvent, releaseLocalUrls, setModel]);

  const handleSelectSample = useCallback(
    (item: SampleModel) => {
      releaseLocalUrls();
      setModel({ url: item.url, name: item.name });
      setModelStats(null);
      setErrorMessage(null);
      setLoadingProgress(0);
      appendEvent(`选择示例模型：${item.name}`);
    },
    [appendEvent, releaseLocalUrls, setModel],
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

      releaseLocalUrls();

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
    [appendEvent, releaseLocalUrls, setModel],
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
  const modeLabel = mode === "embedded" ? "嵌入" : "独立";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {showChrome && (
        <StandaloneHeader theme={theme} onToggleTheme={handleToggleTheme} />
      )}
      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-6 pb-10 pt-6">
        <EmbeddedHeader mode={mode} />
        <div
          className={`grid gap-4 ${showChrome ? "lg:grid-cols-[320px_1fr]" : ""}`}
        >
          {showChrome && (
            <aside className="space-y-4 lg:sticky lg:top-6">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  运行与通信
                </h3>
                <div className="mt-3 grid gap-3 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      运行环境
                    </p>
                    <ul className="mt-2 space-y-1">
                      <li>模式：{modeLabel}</li>
                      <li>主题：{theme === "dark" ? "深色" : "浅色"}</li>
                      <li>allowedOrigins：{allowedOriginsLabel}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-400">
                      消息流
                    </p>
                    <ul className="mt-2 space-y-1">
                      <li>URL：model / theme / embedded</li>
                      <li>父页：load_model / set_theme / export_requested</li>
                      <li>回传：model_loaded / export_complete / error</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    示例模型
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {filteredSamples.length} 个
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={clearTags}
                    className={`rounded-full border px-2 py-0.5 font-medium transition ${
                      activeTags.length === 0
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-100"
                        : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                    }`}
                  >
                    全部
                  </button>
                  {availableTags.map((tag) => {
                    const isActive = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-2 py-0.5 font-medium transition ${
                          isActive
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-100"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <ModelGallery
                    items={filteredSamples}
                    activeUrl={model?.url}
                    layout="row"
                    onSelect={handleSelectSample}
                  />
                </div>
                <div className="mt-3">
                  <ModelInfoCard
                    sample={activeSample}
                    model={model}
                    stats={modelStats}
                    errorMessage={errorMessage}
                    variant="compact"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  最新事件
                </h3>
                <div className="mt-2 max-h-32 space-y-2 overflow-y-auto text-xs text-slate-600 dark:text-slate-200">
                  {events.length === 0 && <p>暂无事件</p>}
                  {events.map((item, index) => (
                    <p
                      key={`${item}-${index}`}
                      className="rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800/70"
                    >
                      {item}
                    </p>
                  ))}
                </div>
              </div>
            </aside>
          )}
          <section className="flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 lg:min-h-[calc(100vh-220px)]">
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
                onLoadSample={handleLoadSample}
                onImportFiles={handleImportFiles}
                onExport={handleExport}
              onToggleTheme={handleToggleTheme}
              onQualityChange={handleQualityChange}
              onToggleAnimation={handleToggleAnimation}
              onAnimationSelect={handleAnimationSelect}
              onAnimationLoopChange={handleAnimationLoopChange}
              onAnimationSpeedChange={handleAnimationSpeedChange}
            />
            {!showChrome && (
              <div className="border-b border-slate-200/80 bg-white/70 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  示例模型
                </div>
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={clearTags}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      activeTags.length === 0
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-100"
                        : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                    }`}
                  >
                    全部
                  </button>
                  {availableTags.map((tag) => {
                    const isActive = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                          isActive
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-100"
                            : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                <ModelGallery
                  items={filteredSamples}
                  activeUrl={model?.url}
                  layout="row"
                  onSelect={handleSelectSample}
                />
                <div className="mt-4">
                  <ModelInfoCard
                    sample={activeSample}
                    model={model}
                    stats={modelStats}
                    errorMessage={errorMessage}
                    variant="compact"
                  />
                </div>
              </div>
            )}
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
              <div className="px-6 py-4 text-sm text-slate-100 lg:absolute lg:bottom-4 lg:left-4 lg:w-[320px] lg:rounded-2xl lg:bg-slate-900/50 lg:p-4 lg:shadow-lg lg:backdrop-blur">
                <p className="font-semibold">
                  {model?.name || "示例模型"} 状态
                </p>
                <p className="mt-1 text-xs text-slate-200">
                  加载进度：{loadingProgress}%
                  {errorMessage && (
                    <span className="ml-2 text-rose-200">
                      错误：{errorMessage}
                    </span>
                  )}
                </p>
                <Controls />
              </div>
            </Scene>
          </section>
        </div>
        {showChrome && (
          <footer className="mt-6 text-xs text-slate-500 dark:text-slate-400">
            SceneHub 3D Viewer • 支持独立访问与 iframe 嵌入，已接入 Three.js 渲染、材质编辑与导入导出链路。
          </footer>
        )}
      </main>
    </div>
  );
};

export default ClientWrapper;

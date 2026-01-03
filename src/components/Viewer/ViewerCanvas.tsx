"use client";

import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter";
import {
  AnimationClip,
  AnimationMixer,
  Color,
  Cache,
  CompressedTexture,
  CubeCamera,
  CubeTexture,
  DataTexture,
  LightProbe,
  Box3,
  LOD,
  LoopOnce,
  LoopPingPong,
  LoopRepeat,
  LoadingManager,
  Mesh,
  Object3D,
  PMREMGenerator,
  PerspectiveCamera,
  Sphere,
  Texture,
  Vector3,
  WebGLCubeRenderTarget,
  WebGLRenderer,
} from "three";
import { LightProbeGenerator } from "three/examples/jsm/lights/LightProbeGenerator";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import {
  AnimationClipInfo,
  AnimationLoopMode,
  ModelDescriptor,
  ModelStats,
  QualityLevel,
  ThemeOption,
} from "@/types";

Cache.enabled = true;

export interface ViewerCanvasHandle {
  exportModel: (
    format: "glb" | "gltf",
  ) => Promise<{ blob: Blob; filename: string }>;
}

interface ViewerCanvasProps {
  theme: ThemeOption;
  quality: QualityLevel;
  model?: ModelDescriptor | null;
  playAnimations?: boolean;
  activeAnimationIndex?: number;
  animationLoop?: AnimationLoopMode;
  animationSpeed?: number;
  onLoaded?: (modelName: string) => void;
  onError?: (message: string) => void;
  onLoadingState?: (state: { loading: boolean; progress: number }) => void;
  onExported?: (format: "glb" | "gltf", size: number) => void;
  onStats?: (stats: ModelStats) => void;
  onAnimationList?: (clips: AnimationClipInfo[]) => void;
}

const downloadBlob = (blob: Blob, filename: string) => {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const PlaceholderModel = () => {
  return (
    <mesh castShadow receiveShadow>
      <torusKnotGeometry args={[0.6, 0.2, 128, 32]} />
      <meshStandardMaterial
        color="#a5b4fc"
        metalness={0.35}
        roughness={0.2}
        envMapIntensity={0.8}
      />
    </mesh>
  );
};

const EnvironmentLighting = ({ quality }: { quality: QualityLevel }) => {
  const { gl, scene } = useThree();

  useEffect(() => {
    let cancelled = false;
    const resolution = quality === "high" ? 128 : 96;
    const enableProbe = quality === "high";
    const environment = new RoomEnvironment();
    const cubeRenderTarget = new WebGLCubeRenderTarget(resolution);
    const cubeCamera = new CubeCamera(0.1, 10, cubeRenderTarget);
    cubeCamera.update(gl, environment);

    const pmremGenerator = new PMREMGenerator(gl);
    const envMap = pmremGenerator.fromCubemap(cubeRenderTarget.texture).texture;
    // eslint-disable-next-line react-hooks/immutability
    scene.environment = envMap;

    let lightProbe: LightProbe | null = null;
    const setupProbe = async () => {
      if (!enableProbe) return;
      try {
        const probe = await LightProbeGenerator.fromCubeRenderTarget(
          gl,
          cubeRenderTarget,
        );
        if (cancelled) return;
        probe.intensity = 1.1;
        scene.add(probe);
        lightProbe = probe;
      } catch {
        // 光照探针失败时不阻断主流程
      }
    };
    void setupProbe();

    return () => {
      cancelled = true;
      if (lightProbe) {
        scene.remove(lightProbe);
      }
      scene.environment = null;
      envMap.dispose();
      cubeRenderTarget.dispose();
      pmremGenerator.dispose();
      environment.dispose?.();
    };
  }, [gl, quality, scene]);

  return null;
};

const requestIdle = (task: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  const idleWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(task, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 600);
  return () => window.clearTimeout(id);
};

const AutoFrame = ({
  target,
  controlsRef,
}: {
  target: Object3D | null;
  controlsRef: RefObject<OrbitControlsImpl | null>;
}) => {
  const { camera } = useThree();

  useEffect(() => {
    if (!target) return;
    const box = new Box3().setFromObject(target);
    if (box.isEmpty()) return;
    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const perspective = camera as PerspectiveCamera;
    const fov = perspective.fov || 50;
    const distance = maxDim / (2 * Math.tan((fov * Math.PI) / 360));
    const offset = new Vector3(1, 1, 1)
      .normalize()
      .multiplyScalar(distance * 1.25);

    perspective.position.copy(center.clone().add(offset));
    // eslint-disable-next-line react-hooks/immutability
    perspective.near = Math.max(0.1, distance / 100);
    perspective.far = Math.max(1000, distance * 100);
    perspective.updateProjectionMatrix();

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.minDistance = Math.max(0.1, distance / 5);
      controlsRef.current.maxDistance = distance * 12;
      controlsRef.current.update();
    }
  }, [camera, controlsRef, target]);

  return null;
};

const LODUpdater = ({ lodRef }: { lodRef: RefObject<LOD | null> }) => {
  const { camera } = useThree();
  useFrame(() => {
    lodRef.current?.update(camera);
  });
  return null;
};

const ViewerCanvas = memo(
  forwardRef<ViewerCanvasHandle, ViewerCanvasProps>(
    (
      {
        theme,
        quality,
        model,
        playAnimations = false,
        activeAnimationIndex = 0,
        animationLoop = "repeat",
        animationSpeed = 1,
        onLoaded,
        onError,
        onLoadingState,
        onExported,
        onStats,
        onAnimationList,
      },
      ref,
    ) => {
      const [object, setObject] = useState<Object3D | null>(null);
      const [progress, setProgress] = useState(0);
      const [glReady, setGlReady] = useState(false);
      const [hasAnimations, setHasAnimations] = useState(false);
      const [animationClips, setAnimationClips] = useState<AnimationClip[]>([]);
      const [isVisible, setIsVisible] = useState(true);
      const onLoadingStateRef =
        useRef<ViewerCanvasProps["onLoadingState"]>(onLoadingState);
      const onStatsRef = useRef<ViewerCanvasProps["onStats"]>(onStats);
      const lastSceneRef = useRef<Object3D | null>(null);
      const lastRenderRef = useRef<Object3D | null>(null);
      const lastNameRef = useRef<string>("示例模型");
      const controlsRef = useRef<OrbitControlsImpl | null>(null);
      const lodRef = useRef<LOD | null>(null);
      const progressRef = useRef(0);
      const dracoRef = useRef<DRACOLoader | null>(null);
      const ktx2Ref = useRef<KTX2Loader | null>(null);
      const ktx2DisabledRef = useRef(false);
      const glRef = useRef<WebGLRenderer | null>(null);
      const lodCancelRef = useRef<(() => void) | null>(null);
      const loadIdRef = useRef(0);
      const statsWorkerRef = useRef<Worker | null>(null);
      const statsRequestIdRef = useRef(0);
      const lastUrlRef = useRef<string | null>(null);
      const lodAppliedRef = useRef<number>(0);

      const background = useMemo(
        () => (theme === "dark" ? new Color("#0b1221") : new Color("#e2e8f0")),
        [theme],
      );

      useEffect(() => {
        onLoadingStateRef.current = onLoadingState;
      }, [onLoadingState]);

      useEffect(() => {
        onStatsRef.current = onStats;
      }, [onStats]);

      useEffect(() => {
        lodRef.current = object instanceof LOD ? object : null;
      }, [object]);

      useEffect(() => {
        lastRenderRef.current = object;
      }, [object]);

      useEffect(() => {
        if (typeof document === "undefined") return;
        const updateVisibility = () => {
          setIsVisible(document.visibilityState === "visible");
        };
        updateVisibility();
        document.addEventListener("visibilitychange", updateVisibility);
        return () => {
          document.removeEventListener("visibilitychange", updateVisibility);
        };
      }, []);

      const frameLoop = useMemo(() => {
        if (!isVisible) return "never";
        if (playAnimations && hasAnimations) return "always";
        return "demand";
      }, [hasAnimations, isVisible, playAnimations]);

      const qualitySettings = useMemo(() => {
        if (quality === "low") {
          return {
            dpr: [1, 1] as [number, number],
            shadows: false,
            shadowMapSize: 512,
            textureMaxSize: 1024,
            anisotropy: 2,
            lodDistance: 2.2,
          };
        }
        if (quality === "medium") {
          return {
            dpr: [1, 1.5] as [number, number],
            shadows: true,
            shadowMapSize: 1024,
            textureMaxSize: 2048,
            anisotropy: 4,
            lodDistance: 2.8,
          };
        }
        return {
          dpr: [1, 2] as [number, number],
          shadows: true,
          shadowMapSize: 2048,
          textureMaxSize: 4096,
          anisotropy: 8,
          lodDistance: 3.2,
        };
      }, [quality]);

      const showEnvironment = quality !== "low";
      const showGrid = quality !== "low";
      const showAccentLight = quality === "high";
      const hasAnimation = animationClips.length > 0;
      const hasLod = object instanceof LOD;
      const enableDamping = quality !== "low";

      const getTextureSize = useCallback((texture: Texture) => {
        const image =
          (texture.image as { width?: number; height?: number } | null) ||
          (texture.source?.data as { width?: number; height?: number } | null) ||
          null;

        const width = image?.width;
        const height = image?.height;

        if (!width || !height) return null;
        return { width, height };
      }, []);

      const buildAnimationList = useCallback(
        (clips: AnimationClip[]) =>
          clips.map((clip, index) => ({
            index,
            name: clip.name || `动画 ${index + 1}`,
            duration: clip.duration,
          })),
        [],
      );

      const getDracoLoader = useCallback(() => {
        if (dracoRef.current) return dracoRef.current;
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco/");
        dracoLoader.setDecoderConfig({ type: "wasm" });
        dracoLoader.preload();
        dracoRef.current = dracoLoader;
        return dracoLoader;
      }, []);

      const getKTX2Loader = useCallback(() => {
        const renderer = glRef.current;
        if (!renderer) return null;
        if (ktx2DisabledRef.current) return null;
        if (ktx2Ref.current) return ktx2Ref.current;
        const ktx2Loader = new KTX2Loader();
        ktx2Loader.setTranscoderPath("/basis/");
        ktx2Loader.setWorkerLimit(1);
        ktx2Loader.detectSupport(renderer);
        ktx2Ref.current = ktx2Loader;
        return ktx2Loader;
      }, []);

      const createLoader = useCallback(
        (manager: LoadingManager) => {
          const loader = new GLTFLoader(manager);
          loader.setDRACOLoader(getDracoLoader());
          loader.setMeshoptDecoder(MeshoptDecoder);
          const ktx2Loader = getKTX2Loader();
          if (ktx2Loader) {
            loader.setKTX2Loader(ktx2Loader);
          }
          loader.setCrossOrigin("anonymous");
          return loader;
        },
        [getDracoLoader, getKTX2Loader],
      );

      const disposeObject = useCallback((target: Object3D | null) => {
        if (!target) return;
        const disposedTextures = new Set<string>();

        target.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry?.dispose();
            const material = child.material;
            const disposeMaterial = (item: unknown) => {
              if (!item) return;
              Object.values(item as Record<string, unknown>).forEach((value) => {
                const texture = value as Texture;
                if (texture?.isTexture && !disposedTextures.has(texture.uuid)) {
                  disposedTextures.add(texture.uuid);
                  texture.dispose();
                }
              });
              (item as { dispose?: () => void }).dispose?.();
            };

            if (Array.isArray(material)) {
              material.forEach(disposeMaterial);
            } else {
              disposeMaterial(material);
            }
          }
        });
      }, []);

      const getPrebuiltLodUrl = useCallback((sourceUrl: string) => {
        if (!sourceUrl || sourceUrl.startsWith("blob:")) return null;
        if (sourceUrl.includes("/models/ktx2/")) {
          return sourceUrl.replace("/models/ktx2/", "/models/lod/ktx2/");
        }
        if (sourceUrl.includes("/models/high/")) {
          return sourceUrl.replace("/models/high/", "/models/lod/high/");
        }
        if (sourceUrl.includes("/models/")) {
          return sourceUrl.replace("/models/", "/models/lod/raw/");
        }
        return null;
      }, []);

      const computeLodDistance = useCallback(
        (target: Object3D, distanceFactor: number) => {
          const box = new Box3().setFromObject(target);
          const sphere = new Sphere();
          box.getBoundingSphere(sphere);
          return Math.max(3, sphere.radius * distanceFactor);
        },
        [],
      );

      const loadPrebuiltLod = useCallback(
        (sourceUrl: string, baseScene: Object3D, distance: number, loadId: number) => {
          const lodUrl = getPrebuiltLodUrl(sourceUrl);
          if (!lodUrl) return;

          const manager = new LoadingManager();
          const loader = createLoader(manager);
          loader.load(
            lodUrl,
            (gltf: GLTF) => {
              if (loadId !== loadIdRef.current) {
                disposeObject(gltf.scene);
                return;
              }
              const lod = new LOD();
              lod.addLevel(baseScene, 0);
              lod.addLevel(gltf.scene, distance);
              setObject(lod);
            },
            undefined,
            () => {
              // 预生成 LOD 不存在时静默跳过
            },
          );
        },
        [createLoader, disposeObject, getPrebuiltLodUrl],
      );

      const statsHandlerRef = useRef<
        ((payload: { type?: string; requestId?: number; stats?: ModelStats }) => void) | null
      >(null);

      const handleStatsMessage = useCallback(
        (payload: { type?: string; requestId?: number; stats?: ModelStats }) => {
          if (payload.type !== "stats" || !payload.requestId || !payload.stats) {
            return;
          }
          if (payload.requestId !== loadIdRef.current) return;
          onStatsRef.current?.(payload.stats);

          const baseScene = lastSceneRef.current;
          const sourceUrl = lastUrlRef.current;
          const currentObject = lastRenderRef.current;
          if (!baseScene || !sourceUrl || currentObject instanceof LOD) {
            return;
          }

          const shouldLod =
            (payload.stats.triangleCount > 30000 &&
              payload.stats.boneCount === 0 &&
              payload.stats.animationCount === 0) ||
            (payload.stats.triangleCount > 90000 && quality !== "high");

          if (!shouldLod || lodAppliedRef.current === payload.requestId) return;
          lodAppliedRef.current = payload.requestId;

          const distance = computeLodDistance(
            baseScene,
            qualitySettings.lodDistance,
          );
          lodCancelRef.current?.();
          lodCancelRef.current = requestIdle(() => {
            if (payload.requestId !== loadIdRef.current) return;
            loadPrebuiltLod(sourceUrl, baseScene, distance, payload.requestId);
          });
        },
        [
          computeLodDistance,
          loadPrebuiltLod,
          quality,
          qualitySettings.lodDistance,
        ],
      );

      useEffect(() => {
        statsHandlerRef.current = handleStatsMessage;
      }, [handleStatsMessage]);

      useEffect(() => {
        if (typeof window === "undefined") return;
        const worker = new Worker(
          new URL("../../workers/modelStats.worker.ts", import.meta.url),
          { type: "module" },
        );
        worker.onmessage = (event) => {
          statsHandlerRef.current?.(event.data as {
            type?: string;
            requestId?: number;
            stats?: ModelStats;
          });
        };
        statsWorkerRef.current = worker;
        return () => {
          worker.terminate();
          statsWorkerRef.current = null;
        };
      }, []);

      const optimizeTextures = useCallback(
        (target: Object3D, maxSize: number, maxAnisotropy: number) => {
          const textureSet = new Map<string, Texture>();
          target.traverse((child) => {
            if (!(child instanceof Mesh)) return;
            const material = child.material;
            const collectTextures = (item: unknown) => {
              if (!item) return;
              Object.values(item as Record<string, unknown>).forEach((value) => {
                const texture = value as Texture;
                if (texture?.isTexture && texture.uuid) {
                  textureSet.set(texture.uuid, texture);
                }
              });
            };

            if (Array.isArray(material)) {
              material.forEach(collectTextures);
            } else {
              collectTextures(material);
            }
          });

          let changed = false;
          textureSet.forEach((texture) => {
            const size = getTextureSize(texture);
            if (!size) return;
            texture.anisotropy = Math.max(1, maxAnisotropy);

            if (
              texture instanceof CompressedTexture ||
              texture instanceof DataTexture ||
              texture instanceof CubeTexture
            ) {
              return;
            }

            const source = texture.image as CanvasImageSource | null;
            if (!source || Array.isArray(source)) return;
            const canDraw =
              (typeof HTMLImageElement !== "undefined" &&
                source instanceof HTMLImageElement) ||
              (typeof HTMLCanvasElement !== "undefined" &&
                source instanceof HTMLCanvasElement) ||
              (typeof ImageBitmap !== "undefined" &&
                source instanceof ImageBitmap) ||
              (typeof SVGImageElement !== "undefined" &&
                source instanceof SVGImageElement) ||
              (typeof HTMLVideoElement !== "undefined" &&
                source instanceof HTMLVideoElement) ||
              (typeof OffscreenCanvas !== "undefined" &&
                source instanceof OffscreenCanvas);
            if (!canDraw) return;

            const currentMax = Math.max(size.width, size.height);
            if (currentMax <= maxSize) return;
            const scale = maxSize / currentMax;
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(size.width * scale));
            canvas.height = Math.max(1, Math.round(size.height * scale));
            const context = canvas.getContext("2d");
            if (!context) return;
            context.drawImage(source, 0, 0, canvas.width, canvas.height);
            texture.image = canvas;
            texture.needsUpdate = true;
            changed = true;
          });

          return changed;
        },
        [getTextureSize],
      );

      const loadModel = useCallback(() => {
        const loadId = ++loadIdRef.current;
        lodCancelRef.current?.();
        lodCancelRef.current = null;
        lodAppliedRef.current = 0;
        lastUrlRef.current = null;
        if (statsRequestIdRef.current) {
          statsWorkerRef.current?.postMessage({
            type: "cancel",
            requestId: statsRequestIdRef.current,
          });
        }
        statsRequestIdRef.current = 0;

        let cancelled = false;

        const setProgressState = (value: number, loading: boolean) => {
          if (cancelled || loadId !== loadIdRef.current) return;
          const next = Math.max(0, Math.min(100, Math.round(value)));
          progressRef.current = next;
          setProgress(next);
          onLoadingStateRef.current?.({ loading, progress: next });
        };

        const advanceProgress = (value: number, loading = true) => {
          const next = Math.max(0, Math.min(100, Math.round(value)));
          if (next <= progressRef.current) return;
          setProgressState(next, loading);
        };

        if (!model?.url) {
          disposeObject(lastRenderRef.current ?? lastSceneRef.current);
          lastRenderRef.current = null;
          setObject(null);
          lastSceneRef.current = null;
          lastNameRef.current = "示例模型";
          setHasAnimations(false);
          setAnimationClips([]);
          onAnimationList?.([]);
          setProgressState(0, false);
          return;
        }

        if (!glReady || !glRef.current) return;

        disposeObject(lastRenderRef.current ?? lastSceneRef.current);
        lastRenderRef.current = null;
        setObject(null);
        lastSceneRef.current = null;
        lastNameRef.current = model.name || "外部模型";
        setHasAnimations(false);
        setAnimationClips([]);
        onAnimationList?.([]);
        setProgressState(0, true);

        const mapStageProgress = (raw: number) => {
          const clamped = Math.max(0, Math.min(100, raw));
          return Math.round(10 + (clamped / 100) * 75);
        };

        const originalUrl = model.url;
        const fallbackUrl = originalUrl.includes("/models/ktx2/")
          ? originalUrl.replace("/models/ktx2/", "/models/")
          : null;
        const localFileMap = model.fileMap;
        const resolveLocalUrl = (resourceUrl: string) => {
          if (!localFileMap) return resourceUrl;
          const stripped = resourceUrl.split(/[?#]/)[0] || resourceUrl;
          const decoded = decodeURIComponent(stripped);
          const basename = decoded.split("/").pop() || decoded;
          return (
            localFileMap[decoded] ||
            localFileMap[basename] ||
            localFileMap[basename.toLowerCase()] ||
            resourceUrl
          );
        };
        const shouldSkipKtx2 = (() => {
          if (!fallbackUrl) return false;
          if (ktx2DisabledRef.current) return true;
          if (typeof navigator === "undefined") return false;
          const connection = (
            navigator as Navigator & { connection?: { saveData?: boolean } }
          ).connection;
          if (connection?.saveData) return true;
          const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
            .deviceMemory;
          if (deviceMemory && deviceMemory <= 4) return true;
          if (quality === "low" && deviceMemory && deviceMemory <= 6) return true;
          return false;
        })();
        const initialUrl =
          shouldSkipKtx2 && fallbackUrl ? fallbackUrl : originalUrl;
        const allowFallback = Boolean(fallbackUrl) && initialUrl === originalUrl;

        const loadWithUrl = (url: string, allowFallback: boolean) => {
          const manager = new LoadingManager();
          let textureFailed = false;

          if (localFileMap) {
            manager.setURLModifier((resourceUrl) => resolveLocalUrl(resourceUrl));
          }

          manager.onProgress = (_url, itemsLoaded, itemsTotal) => {
            if (!itemsTotal) return;
            advanceProgress(mapStageProgress((itemsLoaded / itemsTotal) * 100));
          };

          manager.onError = (itemUrl) => {
            if (cancelled || loadId !== loadIdRef.current) return;
            if (allowFallback && fallbackUrl && itemUrl.startsWith("blob:")) {
              textureFailed = true;
            }
          };

          const loader = createLoader(manager);
          loader.load(
            url,
            (gltf: GLTF) => {
              if (cancelled || loadId !== loadIdRef.current) return;
              const clips = gltf.animations || [];
              const animations = clips.length;
              if (allowFallback && fallbackUrl && textureFailed) {
                disposeObject(gltf.scene);
                loadWithUrl(fallbackUrl, false);
                return;
              }
              advanceProgress(92);
              setHasAnimations(animations > 0);
              setAnimationClips(clips);
              onAnimationList?.(buildAnimationList(clips));
              lastSceneRef.current = gltf.scene;
              lastNameRef.current = model.name || "外部模型";
              lastUrlRef.current = url;

              setObject(gltf.scene);
              setProgressState(100, false);
              onLoaded?.(lastNameRef.current);

              if (statsWorkerRef.current) {
                statsRequestIdRef.current = loadId;
                statsWorkerRef.current.postMessage({
                  type: "analyze",
                  requestId: loadId,
                  url,
                  fileMap: model.fileMap,
                });
              }
            },
            (event: ProgressEvent<EventTarget>) => {
              if (cancelled || loadId !== loadIdRef.current) return;
              if (event.total > 0) {
                const percent = (event.loaded / event.total) * 100;
                advanceProgress(mapStageProgress(percent));
              }
            },
            (error: unknown) => {
              if (cancelled || loadId !== loadIdRef.current) return;
              const errorMessage =
                error instanceof Error
                  ? error.message
                  : typeof error === "string"
                    ? error
                    : (error as { message?: string } | null)?.message || "";
              const isMemoryError =
                error instanceof RangeError ||
                /Array buffer allocation failed/i.test(errorMessage) ||
                /RangeError/i.test(errorMessage);
              if (allowFallback && fallbackUrl && isMemoryError) {
                ktx2DisabledRef.current = true;
                ktx2Ref.current?.dispose();
                ktx2Ref.current = null;
                loadWithUrl(fallbackUrl, false);
                return;
              }
              if (allowFallback && fallbackUrl) {
                loadWithUrl(fallbackUrl, false);
                return;
              }
              setProgressState(0, false);
              setHasAnimations(false);
              setAnimationClips([]);
              onAnimationList?.([]);
              onError?.(errorMessage || "模型加载失败");
            },
          );
        };

        loadWithUrl(initialUrl, allowFallback);

        return () => {
          cancelled = true;
        };
      }, [
        buildAnimationList,
        createLoader,
        disposeObject,
        glReady,
        model,
        onAnimationList,
        onError,
        onLoaded,
        quality,
      ]);

      const TextureOptimizer = ({
        target,
        qualityLevel,
        textureMaxSize,
        anisotropyLevel,
      }: {
        target: Object3D | null;
        qualityLevel: QualityLevel;
        textureMaxSize: number;
        anisotropyLevel: number;
      }) => {
        const { gl, invalidate } = useThree();
        const optimizedRef = useRef<string | null>(null);

        useEffect(() => {
          if (!target || typeof document === "undefined") return;

          const deviceMemory = (navigator as Navigator & { deviceMemory?: number })
            .deviceMemory;
          const allowDownscale =
            qualityLevel !== "high" || (deviceMemory && deviceMemory < 8);
          const maxSize = allowDownscale
            ? textureMaxSize
            : gl.capabilities.maxTextureSize;
          const maxTextureSize = Math.min(
            maxSize,
            gl.capabilities.maxTextureSize,
          );
          const anisotropy = Math.min(
            anisotropyLevel,
            gl.capabilities.getMaxAnisotropy(),
          );
          const key = `${target.uuid}:${maxTextureSize}:${anisotropy}`;
          if (optimizedRef.current === key) return;
          optimizedRef.current = key;

          const cancel = requestIdle(() => {
            const changed = optimizeTextures(target, maxTextureSize, anisotropy);
            if (changed) {
              invalidate();
            }
          });

          return cancel;
        }, [anisotropyLevel, gl, invalidate, qualityLevel, target, textureMaxSize]);

        return null;
      };

      const AnimationPlayer = ({
        target,
        clips,
        playing,
        activeIndex,
        loopMode,
        speed,
      }: {
        target: Object3D | null;
        clips: AnimationClip[];
        playing: boolean;
        activeIndex: number;
        loopMode: AnimationLoopMode;
        speed: number;
      }) => {
        const mixerRef = useRef<AnimationMixer | null>(null);
        const actionRef = useRef<ReturnType<AnimationMixer["clipAction"]> | null>(
          null,
        );

        useEffect(() => {
          if (!target || clips.length === 0) {
            mixerRef.current?.stopAllAction();
            mixerRef.current = null;
            actionRef.current = null;
            return;
          }

          const clip = clips[activeIndex] ?? clips[0];
          if (!clip) return;

          const mixer = new AnimationMixer(target);
          const action = mixer.clipAction(clip);
          if (loopMode === "once") {
            action.setLoop(LoopOnce, 1);
            action.clampWhenFinished = true;
          } else if (loopMode === "pingpong") {
            action.setLoop(LoopPingPong, Infinity);
          } else {
            action.setLoop(LoopRepeat, Infinity);
          }
          action.play();
          mixerRef.current = mixer;
          actionRef.current = action;

          return () => {
            action.stop();
            mixer.stopAllAction();
            mixer.uncacheRoot(target);
            mixerRef.current = null;
            actionRef.current = null;
          };
        }, [activeIndex, clips, loopMode, target]);

        useEffect(() => {
          if (!actionRef.current) return;
          actionRef.current.timeScale = speed;
        }, [speed]);

        useEffect(() => {
          if (!actionRef.current) return;
          actionRef.current.paused = !playing;
        }, [playing]);

        useFrame((_, delta) => {
          if (!playing || !mixerRef.current) return;
          mixerRef.current.update(delta);
        });

        return null;
      };

      useEffect(() => {
        // 加载外部模型依赖副作用与网络请求，需要在 effect 中触发
        const disposer = loadModel();
        return () => {
          disposer?.();
          disposeObject(lastRenderRef.current ?? lastSceneRef.current);
          lastRenderRef.current = null;
          lastSceneRef.current = null;
        };
      }, [disposeObject, loadModel]);

      useEffect(() => {
        return () => {
          dracoRef.current?.dispose();
          dracoRef.current = null;
          ktx2Ref.current?.dispose();
          ktx2Ref.current = null;
        };
      }, []);

      useImperativeHandle(
        ref,
        () => ({
          async exportModel(format: "glb" | "gltf") {
            if (!lastSceneRef.current) {
              throw new Error("暂无可导出的模型");
            }

            const exporter = new GLTFExporter();
            const target = lastSceneRef.current;
            const fileName = `${lastNameRef.current || "scene"}.${format}`;

            return new Promise<{ blob: Blob; filename: string }>((resolve, reject) => {
              exporter.parse(
                target,
                (result: ArrayBuffer | Record<string, unknown>) => {
                  const blob =
                    format === "glb"
                      ? new Blob([result as ArrayBuffer], {
                        type: "model/gltf-binary",
                      })
                      : new Blob([JSON.stringify(result, null, 2)], {
                        type: "model/gltf+json",
                      });

                  onExported?.(format, blob.size);
                  downloadBlob(blob, fileName);
                  resolve({ blob, filename: fileName });
                },
                (error: unknown) => {
                  reject(error);
                },
                { binary: format === "glb" },
              );
            });
          },
        }),
        [onExported],
      );

      return (
        <div className="relative flex-1 min-h-0 w-full">
          <Canvas
            shadows={qualitySettings.shadows}
            camera={{ position: [3, 2, 3], fov: 50 }}
            dpr={qualitySettings.dpr}
            frameloop={frameLoop}
            gl={{
              antialias: true,
              powerPreference: "high-performance",
              alpha: false,
              stencil: false,
              preserveDrawingBuffer: false,
            }}
            onCreated={({ gl }) => {
              glRef.current = gl;
              setGlReady(true);
            }}
            className="h-full w-full"
          >
            <color attach="background" args={[background]} />
            {showEnvironment && <EnvironmentLighting quality={quality} />}
            {/* 3. Dynamic Background Grid with Fog support */}
            <Grid
              args={[10, 10]}
              cellSize={0.5}
              cellThickness={0.5}
              cellColor={theme === "dark" ? "#202020" : "#d4d4d8"}
              sectionSize={3}
              sectionThickness={1}
              sectionColor={theme === "dark" ? "#303030" : "#a1a1aa"}
              fadeDistance={40}
              fadeStrength={1.5}
              infiniteGrid
            />
            {showAccentLight && (
              <>
                <perspectiveCamera makeDefault position={[5, 1, 5]} fov={50} />
                {/* Main Key Light */}
                <directionalLight
                  castShadow
                  position={[5, 10, 5]}
                  intensity={1.5}
                  shadow-mapSize={[1024, 1024]}
                >
                  <orthographicCamera
                    attach="shadow-camera"
                    args={[-10, 10, 10, -10]}
                  />
                </directionalLight>
                {/* Fill Light */}
                <directionalLight position={[-5, 5, 5]} intensity={0.5} />
                {/* Back Light (Rim) */}
                <directionalLight position={[0, 5, -5]} intensity={0.5} />
              </>
            )}    <group position={[0, -0.25, 0]}>
              {object ? (
                <primitive object={object} />
              ) : (
                <PlaceholderModel />
              )}
            </group>
            {showGrid && (
              <Grid
                args={[12, 12]}
                infiniteGrid
                cellSize={0.5}
                cellThickness={0.65}
                sectionThickness={1.2}
                fadeDistance={20}
                fadeStrength={2}
                position={[0, -0.01, 0]}
              />
            )}
            <AutoFrame target={object} controlsRef={controlsRef} />
            {object && (
              <TextureOptimizer
                target={object}
                qualityLevel={quality}
                textureMaxSize={qualitySettings.textureMaxSize}
                anisotropyLevel={qualitySettings.anisotropy}
              />
            )}
            {hasAnimation && (
              <AnimationPlayer
                target={object}
                clips={animationClips}
                playing={playAnimations}
                activeIndex={activeAnimationIndex}
                loopMode={animationLoop}
                speed={animationSpeed}
              />
            )}
            {hasLod && <LODUpdater lodRef={lodRef} />}
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enableDamping={enableDamping}
              dampingFactor={0.08}
              target={[0, 0.5, 0]}
            />
          </Canvas>



          {progress > 0 && progress < 100 && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 w-72 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-medium text-slate-700 shadow-lg backdrop-blur dark:bg-slate-900/80 dark:text-slate-100">
              正在加载模型... {progress}%
              <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      );
    },
  ),
);

ViewerCanvas.displayName = "ViewerCanvas";

export default ViewerCanvas;

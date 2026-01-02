declare module "three/examples/jsm/loaders/GLTFLoader" {
  import { AnimationClip, LoadingManager, Object3D } from "three";

  export interface GLTF {
    scene: Object3D;
    animations: AnimationClip[];
  }

  export class GLTFLoader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: GLTF) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (error: unknown) => void,
    ): void;
    setDRACOLoader(loader: unknown): this;
    setKTX2Loader(loader: unknown): this;
    setMeshoptDecoder(decoder: unknown): this;
    setCrossOrigin(value: string): void;
  }
}

declare module "three/examples/jsm/loaders/DRACOLoader" {
  export class DRACOLoader {
    setDecoderPath(path: string): this;
    setDecoderConfig(config: { type: string }): this;
    preload(): void;
    dispose(): void;
  }
}

declare module "three/examples/jsm/loaders/KTX2Loader" {
  import { WebGLRenderer } from "three";

  export class KTX2Loader {
    setTranscoderPath(path: string): this;
    setWorkerLimit(workerLimit: number): this;
    detectSupport(renderer: WebGLRenderer): this;
    dispose(): void;
  }
}

declare module "three/examples/jsm/libs/meshopt_decoder.module" {
  const MeshoptDecoder: unknown;
  export { MeshoptDecoder };
}

declare module "three/examples/jsm/exporters/GLTFExporter" {
  import { Object3D } from "three";

  export class GLTFExporter {
    parse(
      input: Object3D,
      onCompleted: (result: ArrayBuffer | Record<string, unknown>) => void,
      onError?: (error: unknown) => void,
      options?: { binary?: boolean },
    ): void;
  }
}

declare module "three/examples/jsm/lights/LightProbeGenerator" {
  import { LightProbe, WebGLCubeRenderTarget, WebGLRenderer } from "three";

  export class LightProbeGenerator {
    static fromCubeRenderTarget(
      renderer: WebGLRenderer,
      cubeRenderTarget: WebGLCubeRenderTarget,
    ): LightProbe;
  }
}

declare module "three/examples/jsm/environments/RoomEnvironment" {
  import { Scene } from "three";

  export class RoomEnvironment extends Scene {
    dispose?: () => void;
  }
}

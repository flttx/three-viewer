import { MESSAGE_TYPE, VIEWER_SOURCE } from "@/lib/constants";

export type ViewerMode = "standalone" | "embedded";

export type ThemeOption = "light" | "dark";

export type QualityLevel = "low" | "medium" | "high";
export type QualityMode = "auto" | QualityLevel;
export type AnimationLoopMode = "repeat" | "once" | "pingpong";

export type MessageAction =
  | "load_model"
  | "set_theme"
  | "export_complete"
  | "model_loaded"
  | "export_requested"
  | "error";

export interface ViewerMessage<T = unknown> {
  type: typeof MESSAGE_TYPE;
  action: MessageAction;
  data?: T;
  source: typeof VIEWER_SOURCE;
}

export interface ModelDescriptor {
  url: string;
  name?: string;
  fileMap?: Record<string, string>;
}

export interface SampleModel {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  tags: string[];
  summary: string;
  sizeBytes: number;
  format: "glb" | "gltf";
}

export interface ModelStats {
  meshCount: number;
  triangleCount: number;
  materialCount: number;
  textureCount: number;
  boneCount: number;
  animationCount: number;
  boneDepth: number;
  texturePixels: number;
  maxTextureWidth: number;
  maxTextureHeight: number;
  textureMemoryBytes: number;
}

export interface AnimationClipInfo {
  index: number;
  name: string;
  duration: number;
}

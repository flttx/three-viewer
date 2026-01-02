import type { ModelDescriptor, SampleModel } from "@/types";

export const MESSAGE_TYPE = "SCENEHUB_EVENT";
export const VIEWER_SOURCE = "scenehub-3d-viewer";

export const STORAGE_KEYS = {
  theme: "scenehub-theme",
  lastModel: "scenehub-last-model",
  quality: "scenehub-quality",
};

export const URL_PARAMS = {
  model: "model",
  theme: "theme",
  embedded: "embedded",
};

export const DEFAULT_MODEL: ModelDescriptor = {
  url: "/models/ktx2/DamagedHelmet.glb",
  name: "DamagedHelmet",
};

export const SAMPLE_MODELS: SampleModel[] = [
  {
    id: "damaged-helmet",
    name: "DamagedHelmet",
    url: "/models/ktx2/DamagedHelmet.glb",
    thumbnail: "/models/thumbs/DamagedHelmet.png",
    tags: ["金属", "硬表面", "PBR", "头盔", "KTX2"],
    summary: "科幻金属头盔，带高光与磨损细节。",
    sizeBytes: 2311692,
    format: "glb",
  },
  {
    id: "avocado",
    name: "Avocado",
    url: "/models/ktx2/Avocado.glb",
    thumbnail: "/models/thumbs/Avocado.jpg",
    tags: ["有机", "食品", "软材质", "PBR", "KTX2"],
    summary: "柔和有机质感，适合材质与光照测试。",
    sizeBytes: 552396,
    format: "glb",
  },
  {
    id: "boombox",
    name: "BoomBox",
    url: "/models/ktx2/BoomBox.glb",
    thumbnail: "/models/thumbs/BoomBox.jpg",
    tags: ["工业", "硬表面", "复古", "金属", "KTX2"],
    summary: "复古音响设备，结构复杂度适中。",
    sizeBytes: 761524,
    format: "glb",
  },
  {
    id: "lantern",
    name: "Lantern",
    url: "/models/ktx2/Lantern.glb",
    thumbnail: "/models/thumbs/Lantern.jpg",
    tags: ["灯具", "硬表面", "金属", "道具", "KTX2"],
    summary: "金属灯具道具，适合观察高光与阴影。",
    sizeBytes: 1166692,
    format: "glb",
  },
  {
    id: "duck",
    name: "Duck",
    url: "/models/ktx2/Duck.glb",
    thumbnail: "/models/thumbs/Duck.png",
    tags: ["动物", "有机", "轻量", "经典", "KTX2"],
    summary: "低面数经典模型，加载速度快。",
    sizeBytes: 117704,
    format: "glb",
  },
  {
    id: "fox",
    name: "Fox",
    url: "/models/ktx2/Fox.glb",
    thumbnail: "/models/thumbs/Fox.jpg",
    tags: ["角色", "动物", "有机", "轻量", "KTX2"],
    summary: "轻量级角色模型，适合动画或姿态测试。",
    sizeBytes: 173304,
    format: "glb",
  },
  {
    id: "virtual-city",
    name: "VirtualCity",
    url: "/models/high/VirtualCity.glb",
    thumbnail: "/models/thumbs/VirtualCity.gif",
    tags: ["城市", "建筑", "场景", "高精度"],
    summary: "城市高楼场景，用于建筑尺度与环境光评估。",
    sizeBytes: 1444160,
    format: "glb",
  },
  {
    id: "car-concept",
    name: "CarConcept",
    url: "/models/high/CarConcept.glb",
    thumbnail: "/models/thumbs/CarConcept.jpg",
    tags: ["赛车", "车辆", "金属", "高精度"],
    summary: "高精度概念赛车，适合材质与反射细节观察。",
    sizeBytes: 10267996,
    format: "glb",
  },
];

export const DEFAULT_ALLOWED_ORIGINS = (process.env
  .NEXT_PUBLIC_ALLOWED_IFRAME_ORIGINS || "*")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

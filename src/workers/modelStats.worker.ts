/// <reference lib="webworker" />

type AnalyzeMessage = {
  type: "analyze";
  requestId: number;
  url: string;
  fileMap?: Record<string, string>;
};

type CancelMessage = {
  type: "cancel";
  requestId: number;
};

type WorkerMessage = AnalyzeMessage | CancelMessage;

type ModelStats = {
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
};

type GltfJson = {
  scene?: number;
  scenes?: Array<{ nodes?: number[] }>;
  nodes?: Array<{ mesh?: number; children?: number[] }>;
  meshes?: Array<{
    primitives?: Array<{
      attributes?: Record<string, number>;
      indices?: number;
      mode?: number;
    }>;
  }>;
  accessors?: Array<{ count?: number }>;
  materials?: Array<Record<string, unknown>>;
  textures?: Array<Record<string, unknown>>;
  images?: Array<{
    uri?: string;
    bufferView?: number;
    mimeType?: string;
  }>;
  buffers?: Array<{ uri?: string }>;
  bufferViews?: Array<{
    buffer: number;
    byteOffset?: number;
    byteLength: number;
  }>;
  skins?: Array<{ joints?: number[] }>;
  animations?: Array<unknown>;
};

const pendingControllers = new Map<number, AbortController>();

const KTX2_IDENTIFIER = new Uint8Array([
  0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const isKtx2 = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < KTX2_IDENTIFIER.length) return false;
  const bytes = new Uint8Array(buffer, 0, KTX2_IDENTIFIER.length);
  return KTX2_IDENTIFIER.every((value, index) => bytes[index] === value);
};

const isPng = (buffer: ArrayBuffer) => {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.byteLength < signature.length) return false;
  const bytes = new Uint8Array(buffer, 0, signature.length);
  return signature.every((value, index) => bytes[index] === value);
};

const isJpeg = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer, 0, 2);
  return bytes[0] === 0xff && bytes[1] === 0xd8;
};

const isWebp = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 12) return false;
  const view = new DataView(buffer);
  const riff = view.getUint32(0, false);
  const webp = view.getUint32(8, false);
  return riff === 0x52494646 && webp === 0x57454250; // "RIFF" / "WEBP"
};

const parsePngSize = (buffer: ArrayBuffer) => {
  if (!isPng(buffer)) return null;
  const view = new DataView(buffer);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (!width || !height) return null;
  return { width, height };
};

const parseJpegSize = (buffer: ArrayBuffer) => {
  if (!isJpeg(buffer)) return null;
  const view = new DataView(buffer);
  let offset = 2;
  while (offset + 9 < view.byteLength) {
    if (view.getUint8(offset) !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = view.getUint8(offset + 1);
    if (marker === 0xd9 || marker === 0xda) break;
    const length = view.getUint16(offset + 2, false);
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      const height = view.getUint16(offset + 5, false);
      const width = view.getUint16(offset + 7, false);
      if (!width || !height) return null;
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
};

const parseWebpSize = (buffer: ArrayBuffer) => {
  if (!isWebp(buffer)) return null;
  const view = new DataView(buffer);
  const chunkType = view.getUint32(12, false);
  if (chunkType === 0x56503858) {
    const width = 1 + (view.getUint32(24, true) & 0x00ffffff);
    const height = 1 + (view.getUint32(27, true) & 0x00ffffff);
    return { width, height };
  }
  if (chunkType === 0x56503820) {
    const width = view.getUint16(26, true) & 0x3fff;
    const height = view.getUint16(28, true) & 0x3fff;
    return { width, height };
  }
  if (chunkType === 0x5650384c) {
    const bits = view.getUint32(21, true);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { width, height };
  }
  return null;
};

const parseKtx2Size = (buffer: ArrayBuffer) => {
  if (!isKtx2(buffer)) return null;
  if (buffer.byteLength < 28) return null;
  const view = new DataView(buffer);
  const width = view.getUint32(20, true);
  const height = view.getUint32(24, true);
  if (!width || !height) return null;
  return { width, height };
};

const parseImageSize = (
  buffer: ArrayBuffer,
  mimeType?: string,
  uri?: string,
) => {
  const type = mimeType?.toLowerCase() || "";
  if (type.includes("ktx2") || uri?.toLowerCase().endsWith(".ktx2")) {
    return parseKtx2Size(buffer);
  }
  if (type.includes("png") || uri?.toLowerCase().endsWith(".png")) {
    return parsePngSize(buffer);
  }
  if (type.includes("jpeg") || type.includes("jpg") || uri?.toLowerCase().endsWith(".jpg") || uri?.toLowerCase().endsWith(".jpeg")) {
    return parseJpegSize(buffer);
  }
  if (type.includes("webp") || uri?.toLowerCase().endsWith(".webp")) {
    return parseWebpSize(buffer);
  }
  if (isPng(buffer)) return parsePngSize(buffer);
  if (isJpeg(buffer)) return parseJpegSize(buffer);
  if (isWebp(buffer)) return parseWebpSize(buffer);
  if (isKtx2(buffer)) return parseKtx2Size(buffer);
  return null;
};

const decodeDataUri = (uri: string) => {
  const match = uri.match(/^data:(.*?)(;base64)?,(.*)$/);
  if (!match) return null;
  const isBase64 = Boolean(match[2]);
  const data = match[3] || "";
  if (!isBase64) {
    const bytes = new TextEncoder().encode(decodeURIComponent(data));
    return bytes.buffer;
  }
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

const resolveUrl = (
  resourceUrl: string,
  baseUrl: string,
  fileMap?: Record<string, string>,
) => {
  const stripped = resourceUrl.split(/[?#]/)[0] || resourceUrl;
  const decoded = decodeURIComponent(stripped);
  const basename = decoded.split("/").pop() || decoded;

  if (fileMap) {
    return (
      fileMap[decoded] ||
      fileMap[basename] ||
      fileMap[basename.toLowerCase()] ||
      resourceUrl
    );
  }

  if (/^https?:\/\//i.test(resourceUrl) || resourceUrl.startsWith("blob:")) {
    return resourceUrl;
  }

  return new URL(resourceUrl, baseUrl).toString();
};

const fetchArrayBuffer = async (url: string, signal?: AbortSignal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`资源加载失败：${response.status}`);
  }
  return response.arrayBuffer();
};

const parseGlb = (buffer: ArrayBuffer) => {
  const view = new DataView(buffer);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) {
    return null;
  }
  let offset = 12;
  let json: GltfJson | null = null;
  let binChunk: ArrayBuffer | null = null;

  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkType === 0x4e4f534a) {
      const jsonText = new TextDecoder().decode(
        new Uint8Array(buffer, chunkStart, chunkLength),
      );
      json = JSON.parse(jsonText) as GltfJson;
    } else if (chunkType === 0x004e4942) {
      binChunk = buffer.slice(chunkStart, chunkEnd);
    }
    offset = chunkEnd;
  }

  return { json, binChunk };
};

const collectTextureIndices = (materials: Array<Record<string, unknown>>) => {
  const indices = new Set<number>();
  const visited = new Set<unknown>();

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (visited.has(value)) return;
    visited.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.index === "number") {
      indices.add(record.index);
    }
    Object.values(record).forEach(visit);
  };

  materials.forEach((material) => visit(material));
  return indices;
};

const getTriangleCount = (
  accessorCount: number,
  mode?: number,
) => {
  if (mode == null || mode === 4) {
    return Math.floor(accessorCount / 3);
  }
  if (mode === 5 || mode === 6) {
    return Math.max(0, accessorCount - 2);
  }
  return 0;
};

const getSceneNodeIndices = (json: GltfJson) => {
  if (typeof json.scene === "number") {
    const scene = json.scenes?.[json.scene];
    return scene?.nodes ?? [];
  }
  if (!json.scenes) return [];
  return json.scenes.flatMap((scene) => scene.nodes ?? []);
};

const buildParentMap = (nodes: GltfJson["nodes"]) => {
  const parents = new Array<number | null>(nodes?.length || 0).fill(null);
  if (!nodes) return parents;
  nodes.forEach((node, index) => {
    node.children?.forEach((child) => {
      parents[child] = index;
    });
  });
  return parents;
};

const computeBoneDepth = (
  jointIndices: Set<number>,
  parents: Array<number | null>,
) => {
  let maxDepth = 0;
  jointIndices.forEach((joint) => {
    let depth = 0;
    let current = parents[joint];
    while (current != null && jointIndices.has(current)) {
      depth += 1;
      current = parents[current];
    }
    if (depth > maxDepth) maxDepth = depth;
  });
  return maxDepth;
};

const estimateTextureBytes = (width: number, height: number) => {
  const baseBytes = width * height * 4;
  return Math.round(baseBytes * 1.333);
};

const analyzeModel = async (
  url: string,
  fileMap: Record<string, string> | undefined,
  signal?: AbortSignal,
): Promise<ModelStats> => {
  const baseUrl = url.split("?")[0].split("#")[0];
  const basePath = baseUrl.includes("/") ? `${baseUrl.substring(0, baseUrl.lastIndexOf("/") + 1)}` : baseUrl;

  const buffer = await fetchArrayBuffer(url, signal);
  let json: GltfJson | null = null;
  let binChunk: ArrayBuffer | null = null;

  const glb = parseGlb(buffer);
  if (glb?.json) {
    json = glb.json;
    binChunk = glb.binChunk;
  } else {
    const text = new TextDecoder().decode(new Uint8Array(buffer));
    json = JSON.parse(text) as GltfJson;
  }

  if (!json) {
    throw new Error("模型解析失败");
  }

  const nodes = json.nodes || [];
  const accessors = json.accessors || [];
  const meshes = json.meshes || [];
  const materials = json.materials || [];
  const textures = json.textures || [];
  const images = json.images || [];
  const animations = json.animations || [];
  const skins = json.skins || [];
  const bufferViews = json.bufferViews || [];
  const buffers = json.buffers || [];

  const sceneNodes = getSceneNodeIndices(json);
  const nodeQueue = [...sceneNodes];
  const meshRefCounts = new Map<number, number>();
  const visitedNodes = new Set<number>();

  while (nodeQueue.length > 0) {
    const nodeIndex = nodeQueue.shift();
    if (nodeIndex == null || visitedNodes.has(nodeIndex)) continue;
    visitedNodes.add(nodeIndex);
    const node = nodes[nodeIndex];
    if (!node) continue;
    if (typeof node.mesh === "number") {
      const count = meshRefCounts.get(node.mesh) || 0;
      meshRefCounts.set(node.mesh, count + 1);
    }
    node.children?.forEach((child) => nodeQueue.push(child));
  }

  const meshCount = Array.from(meshRefCounts.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const fallbackMeshCount = meshCount > 0 ? meshCount : meshes.length;

  const meshTriangleMap = new Map<number, number>();
  const meshIndices =
    meshRefCounts.size > 0
      ? Array.from(meshRefCounts.keys())
      : meshes.map((_mesh, index) => index);
  meshIndices.forEach((meshIndex) => {
    const mesh = meshes[meshIndex];
    if (!mesh?.primitives) return;
    let meshTriangles = 0;
    mesh.primitives.forEach((primitive) => {
      const indicesAccessor =
        typeof primitive.indices === "number"
          ? accessors[primitive.indices]
          : undefined;
      const positionAccessorIndex =
        primitive.attributes?.POSITION ?? primitive.attributes?.position;
      const positionAccessor =
        typeof positionAccessorIndex === "number"
          ? accessors[positionAccessorIndex]
          : undefined;
      const accessorCount =
        indicesAccessor?.count ?? positionAccessor?.count ?? 0;
      meshTriangles += getTriangleCount(accessorCount, primitive.mode);
    });
    meshTriangleMap.set(meshIndex, meshTriangles);
  });

  let triangleCount = 0;
  if (meshRefCounts.size > 0) {
    meshRefCounts.forEach((count, meshIndex) => {
      triangleCount += (meshTriangleMap.get(meshIndex) || 0) * count;
    });
  } else {
    meshes.forEach((mesh, meshIndex) => {
      triangleCount += meshTriangleMap.get(meshIndex) || 0;
    });
  }

  const textureIndices = collectTextureIndices(materials);
  const textureCount = textureIndices.size || textures.length;

  const imageIndexSet = new Set<number>();
  textureIndices.forEach((textureIndex) => {
    const texture = textures[textureIndex];
    if (!texture) return;
    const extensions = texture.extensions as Record<string, { source?: number }> | undefined;
    const basisuSource = extensions?.KHR_texture_basisu?.source;
    const sourceIndex =
      typeof basisuSource === "number"
        ? basisuSource
        : (texture.source as number | undefined);
    if (typeof sourceIndex === "number") {
      imageIndexSet.add(sourceIndex);
    }
  });

  if (imageIndexSet.size === 0 && images.length > 0) {
    images.forEach((_image, index) => imageIndexSet.add(index));
  }

  const bufferCache = new Map<number, ArrayBuffer>();

  const getBuffer = async (index: number) => {
    if (bufferCache.has(index)) return bufferCache.get(index) as ArrayBuffer;
    const bufferDef = buffers[index];
    if (!bufferDef) throw new Error("buffer 缺失");
    if (!bufferDef.uri && binChunk) {
      bufferCache.set(index, binChunk);
      return binChunk;
    }
    if (!bufferDef.uri) {
      throw new Error("buffer URI 缺失");
    }
    const resolved = resolveUrl(bufferDef.uri, basePath, fileMap);
    const data = resolved.startsWith("data:")
      ? (decodeDataUri(resolved) as ArrayBuffer)
      : await fetchArrayBuffer(resolved, signal);
    bufferCache.set(index, data);
    return data;
  };

  const getBufferView = async (index: number) => {
    const viewDef = bufferViews[index];
    if (!viewDef) throw new Error("bufferView 缺失");
    const bufferData = await getBuffer(viewDef.buffer);
    const offset = viewDef.byteOffset || 0;
    const length = viewDef.byteLength;
    return bufferData.slice(offset, offset + length);
  };

  let texturePixels = 0;
  let maxTextureWidth = 0;
  let maxTextureHeight = 0;
  let textureMemoryBytes = 0;

  for (const imageIndex of imageIndexSet) {
    const image = images[imageIndex];
    if (!image) continue;
    let data: ArrayBuffer | null = null;
    const uri = image.uri;
    if (uri) {
      const resolved = resolveUrl(uri, basePath, fileMap);
      data = resolved.startsWith("data:")
        ? (decodeDataUri(resolved) as ArrayBuffer)
        : await fetchArrayBuffer(resolved, signal);
    } else if (typeof image.bufferView === "number") {
      data = await getBufferView(image.bufferView);
    }
    if (!data) continue;
    const size = parseImageSize(data, image.mimeType, uri);
    if (!size) continue;
    texturePixels += size.width * size.height;
    textureMemoryBytes += estimateTextureBytes(size.width, size.height);
    if (size.width * size.height > maxTextureWidth * maxTextureHeight) {
      maxTextureWidth = size.width;
      maxTextureHeight = size.height;
    }
  }

  const jointIndices = new Set<number>();
  skins.forEach((skin) => {
    skin.joints?.forEach((joint) => jointIndices.add(joint));
  });
  const boneCount = jointIndices.size;
  const parents = buildParentMap(nodes);
  const boneDepth = computeBoneDepth(jointIndices, parents);

  return {
    meshCount: fallbackMeshCount,
    triangleCount: Math.round(triangleCount),
    materialCount: materials.length,
    textureCount,
    boneCount,
    animationCount: animations.length,
    boneDepth,
    texturePixels,
    maxTextureWidth,
    maxTextureHeight,
    textureMemoryBytes,
  };
};

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === "cancel") {
    const controller = pendingControllers.get(message.requestId);
    controller?.abort();
    pendingControllers.delete(message.requestId);
    return;
  }

  if (message.type === "analyze") {
    const controller = new AbortController();
    pendingControllers.set(message.requestId, controller);
    try {
      const stats = await analyzeModel(
        message.url,
        message.fileMap,
        controller.signal,
      );
      pendingControllers.delete(message.requestId);
      self.postMessage({
        type: "stats",
        requestId: message.requestId,
        stats,
      });
    } catch (error) {
      if (controller.signal.aborted) return;
      pendingControllers.delete(message.requestId);
      const messageText =
        error instanceof Error ? error.message : "统计失败";
      self.postMessage({
        type: "error",
        requestId: message.requestId,
        message: messageText,
      });
    }
  }
};

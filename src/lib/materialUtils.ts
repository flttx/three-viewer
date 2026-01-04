import { Mesh, MeshStandardMaterial, Object3D, Texture } from "three";

export interface MaterialInfo {
    uuid: string;
    name: string;
    type: string;
    color: string;
    emissive: string;
    metalness: number;
    roughness: number;
    normalScale: number;
    wireframe: boolean;
    transparent: boolean;
    opacity: number;
}

export const extractMaterials = (object: Object3D): MaterialInfo[] => {
    const materials: MaterialInfo[] = [];

    object.traverse((child: any) => {
        if ((child as Mesh).isMesh) {
            const mesh = child as Mesh;
            if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m: any) => {
                    if (!materials.some((mat) => mat.uuid === m.uuid)) {
                        materials.push({
                            uuid: m.uuid,
                            name: m.name,
                            type: m.type,
                            color: m.color?.getHexString?.() ?? "ffffff",
                            emissive: m.emissive?.getHexString?.() ?? "000000",
                            metalness: m.metalness ?? 0,
                            roughness: m.roughness ?? 1,
                            normalScale: m.normalScale?.x ?? 1,
                            opacity: m.opacity ?? 1,
                            transparent: m.transparent ?? false,
                            wireframe: m.wireframe ?? false,
                        });
                    }
                });
            }
        }
    });

    return materials;
};

export const updateMaterialProperty = (
    object: Object3D,
    uuid: string,
    key: string,
    value: any,
) => {
    object.traverse((child: any) => {
        if ((child as Mesh).isMesh) {
            const mesh = child as Mesh;
            if (mesh.material) {
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m: any) => {
                    if (m.uuid === uuid) {
                        if (key === "color" || key === "emissive") {
                            if (m[key]?.set) {
                                m[key].set(value);
                            }
                        } else if (key === "normalScale") {
                            if (m.normalScale?.set) {
                                m.normalScale.set(value, value);
                            }
                        } else {
                            m[key] = value;
                        }
                        m.needsUpdate = true;
                    }
                });
            }
        }
    });
};

export const generateMaterialConfig = (info: MaterialInfo) => {
    return JSON.stringify(
        {
            name: info.name,
            color: info.color,
            metalness: info.metalness,
            roughness: info.roughness,
            emissive: info.emissive,
            normalScale: info.normalScale,
            wireframe: info.wireframe,
            transparent: info.transparent,
            opacity: info.opacity,
        },
        null,
        2
    );
};

export const generateReactSnippet = (info: MaterialInfo) => {
    return `<meshStandardMaterial
  color="${info.color}"
  metalness={${info.metalness}}
  roughness={${info.roughness}}
  emissive="${info.emissive}"
  normalScale={[${info.normalScale}, ${info.normalScale}]}
  wireframe={${info.wireframe}}
  transparent={${info.transparent}}
  opacity={${info.opacity}}
/>`;
};

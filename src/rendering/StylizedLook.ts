import { Scene } from "@babylonjs/core/scene";
import { Camera } from "@babylonjs/core/Cameras/camera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { PBRMetallicRoughnessMaterial } from "@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial";
import { ColorCurves } from "@babylonjs/core/Materials/colorCurves";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";

/**
 * Public-domain textures from the Babylon.js Assets CDN
 * (see https://github.com/BabylonJS/Assets — CC BY 4.0).
 */
export const BABYLON_ASSETS_TEXTURES = "https://assets.babylonjs.com/textures/";

export function textureUrl(path: string): string {
    return `${BABYLON_ASSETS_TEXTURES}${path}`;
}

function setTextureTiling(tex: BaseTexture, uScale: number, vScale: number): void {
    const t = tex as Texture;
    t.uScale = uScale;
    t.vScale = vScale;
}

/**
 * Fantasy open-world look: cool mist, warm sun, light bloom, ACES tone map,
 * mild vignette and grain (Two Worlds HD / Skyrim-ish stylized realism).
 */
export function applyStylizedSceneAtmosphere(scene: Scene): void {
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogColor = new Color3(0.58, 0.64, 0.78);
    scene.fogDensity = 0.00135;
    scene.clearColor = scene.fogColor.toColor4(1);
}

/**
 * Attaches the default HDR pipeline to one camera. Call once per scene after the active camera exists.
 */
export function attachStylizedRenderingPipeline(scene: Scene, camera: Camera): DefaultRenderingPipeline {
    const pipeline = new DefaultRenderingPipeline("stylizedPipeline", true, scene, [camera]);

    pipeline.fxaaEnabled = true;
    pipeline.sharpenEnabled = true;
    pipeline.sharpen.edgeAmount = 0.12;
    pipeline.sharpen.colorAmount = 1;

    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.82;
    pipeline.bloomWeight = 0.22;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;

    pipeline.imageProcessingEnabled = true;
    const ipc = pipeline.imageProcessing.imageProcessingConfiguration;
    ipc.toneMappingEnabled = true;
    ipc.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
    ipc.exposure = 1.05;
    ipc.contrast = 1.08;

    ipc.vignetteEnabled = true;
    ipc.vignetteWeight = 0.45;
    ipc.vignetteColor = new Color4(0.12, 0.14, 0.22, 1);
    ipc.vignetteBlendMode = ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;

    const curves = new ColorCurves();
    curves.globalSaturation = 12;
    curves.globalDensity = 8;
    curves.globalHue = 195;
    curves.highlightsSaturation = -6;
    curves.shadowsSaturation = -4;
    ipc.colorCurves = curves;
    ipc.colorCurvesEnabled = true;

    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 9;

    return pipeline;
}

export interface TiledTerrainMaterialOptions {
    uScale?: number;
    vScale?: number;
    /** Multiplies albedo when textures load (tint). */
    baseTint?: Color3;
    envTexture?: BaseTexture | null;
    /**
     * Override albedo URL (full URL or path). Default: Babylon Assets valleygrass.
     * Used for bundled terrain art (e.g. hdevx/3D-Action-RPG-JavaScript grass.png).
     */
    albedoTextureUrl?: string;
}

/**
 * Rocky ground PBR using Babylon Assets rockyGround_* maps (good for paths and wild terrain).
 */
export function createRockyTerrainMaterial(
    name: string,
    scene: Scene,
    options: TiledTerrainMaterialOptions = {}
): PBRMetallicRoughnessMaterial {
    const { uScale = 12, vScale = 12, baseTint = new Color3(1, 1, 1), envTexture = null } = options;
    const mat = new PBRMetallicRoughnessMaterial(name, scene);
    mat.metallic = 1;
    mat.roughness = 1;
    mat.baseColor = baseTint.clone();

    const noMipmap = false;
    const invertY = true;
    mat.baseTexture = new Texture(textureUrl("rockyGround_basecolor.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.baseTexture, uScale, vScale);

    mat.metallicRoughnessTexture = new Texture(textureUrl("rockyGround_metalRough.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.metallicRoughnessTexture, uScale, vScale);

    mat.normalTexture = new Texture(textureUrl("rockyGround_normal.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.normalTexture, uScale, vScale);
    mat.invertNormalMapY = true;

    if (envTexture) {
        mat.environmentTexture = envTexture;
    }
    return mat;
}

/**
 * Grass-tinted ground using valleygrass albedo + rocky roughness/normal for breakup.
 */
export function createGrassTerrainMaterial(
    name: string,
    scene: Scene,
    options: TiledTerrainMaterialOptions = {}
): PBRMetallicRoughnessMaterial {
    const {
        uScale = 10,
        vScale = 10,
        baseTint = new Color3(0.92, 0.98, 0.88),
        envTexture = null,
        albedoTextureUrl,
    } = options;
    const mat = new PBRMetallicRoughnessMaterial(name, scene);
    mat.metallic = 1;
    mat.roughness = 1;
    mat.baseColor = baseTint.clone();

    const noMipmap = false;
    const invertY = true;
    const albedoSrc = albedoTextureUrl ?? textureUrl("valleygrass.png");
    mat.baseTexture = new Texture(albedoSrc, scene, noMipmap, invertY);
    setTextureTiling(mat.baseTexture, uScale, vScale);

    mat.metallicRoughnessTexture = new Texture(textureUrl("rockyGround_metalRough.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.metallicRoughnessTexture, uScale * 1.2, vScale * 1.2);

    mat.normalTexture = new Texture(textureUrl("grassn.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.normalTexture, uScale, vScale);
    mat.invertNormalMapY = true;

    if (envTexture) {
        mat.environmentTexture = envTexture;
    }
    return mat;
}

/**
 * Cobble / worn stone feel for hub plazas.
 */
export function createCobbleMaterial(
    name: string,
    scene: Scene,
    options: TiledTerrainMaterialOptions = {}
): PBRMetallicRoughnessMaterial {
    const { uScale = 14, vScale = 14, baseTint = new Color3(0.85, 0.82, 0.76), envTexture = null } = options;
    const mat = new PBRMetallicRoughnessMaterial(name, scene);
    mat.metallic = 0.02;
    mat.roughness = 0.92;
    mat.baseColor = baseTint.clone();

    const noMipmap = false;
    const invertY = true;
    mat.baseTexture = new Texture(textureUrl("bricktile.jpg"), scene, noMipmap, invertY);
    setTextureTiling(mat.baseTexture, uScale, vScale);

    mat.normalTexture = new Texture(textureUrl("rockyGround_normal.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.normalTexture, uScale, vScale);
    mat.invertNormalMapY = true;

    if (envTexture) {
        mat.environmentTexture = envTexture;
    }
    return mat;
}

/**
 * Shared environment lighting for tiled outdoor materials (matches reflection probe).
 */
export function bindOutdoorEnvironment(mat: PBRMetallicRoughnessMaterial, scene: Scene): void {
    if (scene.environmentTexture) {
        mat.environmentTexture = scene.environmentTexture;
    }
}

/** Fort / ruin stone — tiled rocky maps with a cool gray tint. */
export function createWeatheredStoneMaterial(
    name: string,
    scene: Scene,
    options: TiledTerrainMaterialOptions = {}
): PBRMetallicRoughnessMaterial {
    const { uScale = 3.5, vScale = 3.5, baseTint = new Color3(0.72, 0.7, 0.66), envTexture = null } = options;
    const mat = new PBRMetallicRoughnessMaterial(name, scene);
    mat.metallic = 1;
    mat.roughness = 1;
    mat.baseColor = baseTint.clone();

    const noMipmap = false;
    const invertY = true;
    mat.baseTexture = new Texture(textureUrl("rockyGround_basecolor.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.baseTexture, uScale, vScale);

    mat.metallicRoughnessTexture = new Texture(textureUrl("rockyGround_metalRough.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.metallicRoughnessTexture, uScale, vScale);

    mat.normalTexture = new Texture(textureUrl("rockyGround_normal.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.normalTexture, uScale, vScale);
    mat.invertNormalMapY = true;

    if (envTexture) {
        mat.environmentTexture = envTexture;
    }
    return mat;
}

/** Timber props (campfire logs, beams). */
export function createWoodPlankMaterial(
    name: string,
    scene: Scene,
    options: TiledTerrainMaterialOptions = {}
): PBRMetallicRoughnessMaterial {
    const { uScale = 2, vScale = 2, baseTint = new Color3(0.55, 0.42, 0.28), envTexture = null } = options;
    const mat = new PBRMetallicRoughnessMaterial(name, scene);
    mat.metallic = 0;
    mat.roughness = 0.94;
    mat.baseColor = baseTint.clone();

    const noMipmap = false;
    const invertY = true;
    mat.baseTexture = new Texture(textureUrl("woodAlbedo.png"), scene, noMipmap, invertY);
    setTextureTiling(mat.baseTexture, uScale, vScale);

    if (envTexture) {
        mat.environmentTexture = envTexture;
    }
    return mat;
}

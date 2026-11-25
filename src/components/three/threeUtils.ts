import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function applyStudioEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.Texture | null {
  try {
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();
    return envTex;
  } catch {
    return null;
  }
}

export function createRadialGlowTexture(
  innerColor = 'rgba(255, 255, 255, 1)',
  midColor = 'rgba(34, 211, 238, 0.55)',
  outerColor = 'rgba(139, 92, 246, 0)'
): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2
    );
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.32, midColor);
    grad.addColorStop(1, outerColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createHologramShaderMaterial(options?: {
  primaryColor?: number;
  accentColor?: number;
  opacity?: number;
}): THREE.ShaderMaterial {
  const primary = new THREE.Color(options?.primaryColor ?? 0x22d3ee);
  const accent = new THREE.Color(options?.accentColor ?? 0x8b5cf6);

  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScanY: { value: 0 },
      uPrimaryColor: { value: primary },
      uAccentColor: { value: accent },
      uOpacity: { value: options?.opacity ?? 0.88 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;

      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vec4 mvPosition = viewMatrix * worldPosition;
        vViewPos = -mvPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uScanY;
      uniform vec3 uPrimaryColor;
      uniform vec3 uAccentColor;
      uniform float uOpacity;

      varying vec3 vNormal;
      varying vec3 vViewPos;
      varying vec3 vWorldPos;

      void main() {
        vec3 viewDir = normalize(vViewPos);
        float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.15);

        // Fine holographic horizontal scanlines
        float scanLines = 0.72 + 0.28 * sin(vWorldPos.y * 42.0 - uTime * 3.8);

        // Volumetric vertical sweep beam
        float scanDist = abs(vWorldPos.y - uScanY);
        float scanBand = exp(-scanDist * scanDist * 14.0) * 1.35;

        vec3 baseGrad = mix(uAccentColor, uPrimaryColor, clamp((vWorldPos.y + 1.8) / 3.6, 0.0, 1.0));
        vec3 col = baseGrad * (0.28 + fresnel * 1.15) * scanLines + vec3(0.45, 0.96, 1.0) * scanBand;

        float alpha = clamp((0.12 + fresnel * 0.78 + scanBand * 0.65) * uOpacity, 0.05, 0.96);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => disposeMaterial(m));
    } else if (mat) {
      disposeMaterial(mat);
    }
  });
}

function disposeMaterial(mat: THREE.Material): void {
  const rec = mat as unknown as Record<string, unknown>;
  for (const val of Object.values(rec)) {
    if (val instanceof THREE.Texture) {
      val.dispose();
    }
  }
  mat.dispose();
}

export function scheduleSoftwareFrame(
  renderer: THREE.WebGLRenderer,
  cb: () => void
): number {
  try {
    const gl = renderer.getContext() as WebGL2RenderingContext;
    if (gl && typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          window.setTimeout(cb, 75);
        }
      };
      return window.setTimeout(poll, 5);
    }
  } catch {
    // Fallback timeout pacing if WebGL2 fenceSync is unavailable
  }
  return window.setTimeout(cb, 80);
}

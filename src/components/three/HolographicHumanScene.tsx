import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  applyStudioEnvironment,
  createHologramShaderMaterial,
  createRadialGlowTexture,
  detectSoftwareGl,
  disposeObject3D,
  scheduleSoftwareFrame,
} from './threeUtils';

export type HologramFocusMode = 'full' | 'cardiac' | 'neural';
export type HologramMorphMode = 'auto' | 'hologram' | 'particles' | 'wireframe';

interface HolographicHumanSceneProps {
  focusMode: HologramFocusMode;
  morphMode?: HologramMorphMode;
  onChangeFocusMode?: (mode: HologramFocusMode) => void;
}

export function HolographicHumanScene({
  focusMode,
  morphMode = 'auto',
}: HolographicHumanSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const focusModeRef = useRef<HologramFocusMode>(focusMode);
  const morphModeRef = useRef<HologramMorphMode>(morphMode);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    focusModeRef.current = focusMode;
  }, [focusMode]);

  useEffect(() => {
    morphModeRef.current = morphMode;
  }, [morphMode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    const isSoftwareGl = detectSoftwareGl();

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));

    const rect = container.getBoundingClientRect();
    const width = Math.max(260, rect.width || 480);
    const height = Math.max(320, rect.height || 480);
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030714, 0.055);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    camera.position.set(0, 0.25, 6.2);

    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x3b0764, 0.85));

    const keyLight = new THREE.DirectionalLight(0x67e8f9, 1.85);
    keyLight.position.set(3.5, 4.5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.25);
    rimLight.position.set(-4, 2.2, -3.5);
    scene.add(rimLight);

    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // 1. Solid Fresnel Hologram Layer
    const bodyHoloMat = createHologramShaderMaterial({
      primaryColor: 0x22d3ee,
      accentColor: 0x7c3aed,
      opacity: 0.88,
    });
    const innerCoreMat = createHologramShaderMaterial({
      primaryColor: 0x38bdf8,
      accentColor: 0xc084fc,
      opacity: 0.74,
    });

    // 2. Wireframe Reform Matrix Layer
    const wireLatticeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const wireAccentMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const humanGroup = new THREE.Group();
    humanGroup.position.y = -0.1;
    heroGroup.add(humanGroup);

    const solidMeshes: THREE.Mesh[] = [];
    const wireMeshes: THREE.Mesh[] = [];

    const addDualPart = (
      geo: THREE.BufferGeometry,
      pos: [number, number, number],
      rot: [number, number, number] = [0, 0, 0],
      solidMat: THREE.Material = bodyHoloMat,
      wireMat: THREE.Material = wireLatticeMat
    ) => {
      const solid = new THREE.Mesh(geo, solidMat);
      solid.position.set(...pos);
      solid.rotation.set(...rot);
      humanGroup.add(solid);
      solidMeshes.push(solid);

      const wire = new THREE.Mesh(geo, wireMat);
      wire.position.set(...pos);
      wire.rotation.set(...rot);
      humanGroup.add(wire);
      wireMeshes.push(wire);
    };

    // Head & Neural Core
    const headGeo = new THREE.SphereGeometry(0.32, 22, 22);
    headGeo.scale(0.88, 1.08, 0.94);
    addDualPart(headGeo, [0, 1.46, 0]);

    const brainCoreGeo = new THREE.IcosahedronGeometry(0.19, 2);
    const brainCoreMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x8b5cf6,
      emissiveIntensity: 1.4,
      roughness: 0.25,
      metalness: 0.3,
      wireframe: true,
    });
    const brainCore = new THREE.Mesh(brainCoreGeo, brainCoreMat);
    brainCore.position.set(0, 1.49, 0);
    humanGroup.add(brainCore);

    // Neck & Lathe Torso
    const neckGeo = new THREE.CylinderGeometry(0.11, 0.14, 0.22, 16);
    addDualPart(neckGeo, [0, 1.12, 0]);

    const torsoPoints = [
      new THREE.Vector2(0.01, -0.78),
      new THREE.Vector2(0.34, -0.72),
      new THREE.Vector2(0.37, -0.45),
      new THREE.Vector2(0.28, -0.1),
      new THREE.Vector2(0.36, 0.25),
      new THREE.Vector2(0.46, 0.56),
      new THREE.Vector2(0.38, 0.72),
      new THREE.Vector2(0.15, 0.78),
    ];
    const torsoGeo = new THREE.LatheGeometry(torsoPoints, 26);
    torsoGeo.scale(1.05, 1.0, 0.62);
    addDualPart(torsoGeo, [0, 0.24, 0], [0, 0, 0], bodyHoloMat, wireAccentMat);

    // Spinal Energy Column & Cardiac Core
    const spineGeo = new THREE.CylinderGeometry(0.035, 0.045, 1.42, 12);
    const spineMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85,
    });
    const spineMesh = new THREE.Mesh(spineGeo, spineMat);
    spineMesh.position.set(0, 0.35, -0.05);
    humanGroup.add(spineMesh);

    const heartCoreGeo = new THREE.OctahedronGeometry(0.13, 1);
    const heartCoreMat = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.8,
      roughness: 0.2,
      metalness: 0.4,
    });
    const heartCore = new THREE.Mesh(heartCoreGeo, heartCoreMat);
    heartCore.position.set(0.1, 0.46, 0.08);
    humanGroup.add(heartCore);

    // Arms & Legs
    const shoulderGeo = new THREE.SphereGeometry(0.12, 14, 14);
    const upperArmGeo = new THREE.CapsuleGeometry(0.09, 0.46, 6, 12);
    const forearmGeo = new THREE.CapsuleGeometry(0.072, 0.44, 6, 12);
    const thighGeo = new THREE.CapsuleGeometry(0.12, 0.58, 6, 14);
    const shinGeo = new THREE.CapsuleGeometry(0.085, 0.58, 6, 14);

    ([-1, 1] as const).forEach((side) => {
      addDualPart(shoulderGeo, [side * 0.52, 0.8, 0], [0, 0, 0], innerCoreMat, wireLatticeMat);
      addDualPart(upperArmGeo, [side * 0.62, 0.48, 0.02], [0, 0, side * 0.18]);
      addDualPart(forearmGeo, [side * 0.72, -0.04, 0.1], [-0.18, 0, side * 0.08]);

      addDualPart(thighGeo, [side * 0.21, -0.82, 0], [0, 0, side * -0.04]);
      addDualPart(shinGeo, [side * 0.23, -1.46, 0]);
    });

    // 3. Hologram Transformation Particle Cloud (sampled across the actual silhouette meshes)
    humanGroup.updateMatrixWorld(true);
    const sampledPositions: number[] = [];
    const vTmp = new THREE.Vector3();

    for (const mesh of solidMeshes) {
      const posAttr = mesh.geometry.attributes.position;
      if (!posAttr) continue;
      const stride = Math.max(1, Math.floor(posAttr.count / 115));
      for (let i = 0; i < posAttr.count; i += stride) {
        vTmp.fromBufferAttribute(posAttr, i).applyMatrix4(mesh.matrix);
        sampledPositions.push(vTmp.x, vTmp.y, vTmp.z);
      }
    }

    const morphCount = Math.max(1, sampledPositions.length / 3);
    const origPos = new Float32Array(sampledPositions);
    const burstPos = new Float32Array(morphCount * 3);
    const currPos = new Float32Array(morphCount * 3);
    const morphColors = new Float32Array(morphCount * 3);

    const cCyan = new THREE.Color(0x22d3ee);
    const cViolet = new THREE.Color(0xa78bfa);
    const cBlue = new THREE.Color(0x60a5fa);

    for (let i = 0; i < morphCount; i++) {
      const ox = origPos[i * 3];
      const oy = origPos[i * 3 + 1];
      const oz = origPos[i * 3 + 2];
      currPos[i * 3] = ox;
      currPos[i * 3 + 1] = oy;
      currPos[i * 3 + 2] = oz;

      // Swirling cylindrical dispersion target around silhouette
      const ang = Math.atan2(oz, ox) + oy * 1.45 + (i % 7) * 0.25;
      const radialBoost = 0.85 + ((i * 19) % 100) / 70;
      burstPos[i * 3] = Math.cos(ang) * (Math.hypot(ox, oz) + radialBoost);
      burstPos[i * 3 + 1] = oy + (((i * 13) % 100) / 100 - 0.5) * 0.65;
      burstPos[i * 3 + 2] = Math.sin(ang) * (Math.hypot(ox, oz) + radialBoost);

      const pick = i % 3 === 0 ? cCyan : i % 3 === 1 ? cViolet : cBlue;
      morphColors[i * 3] = pick.r;
      morphColors[i * 3 + 1] = pick.g;
      morphColors[i * 3 + 2] = pick.b;
    }

    const dissolveGeo = new THREE.BufferGeometry();
    const dissolvePosAttr = new THREE.BufferAttribute(currPos, 3);
    dissolveGeo.setAttribute('position', dissolvePosAttr);
    dissolveGeo.setAttribute('color', new THREE.BufferAttribute(morphColors, 3));

    const glowTex = createRadialGlowTexture();
    const dissolveMat = new THREE.PointsMaterial({
      size: 0.082,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dissolvePoints = new THREE.Points(dissolveGeo, dissolveMat);
    humanGroup.add(dissolvePoints);

    // 4. Orbital Diagnostic Rings & Pedestal
    const ringGroup = new THREE.Group();
    heroGroup.add(ringGroup);

    const ringConfigs = [
      { radius: 1.65, tube: 0.014, color: 0x22d3ee, tiltX: Math.PI / 2.25, tiltZ: 0.24 },
      { radius: 1.92, tube: 0.011, color: 0x8b5cf6, tiltX: Math.PI / 2.6, tiltZ: -0.38 },
      { radius: 2.18, tube: 0.009, color: 0x3b82f6, tiltX: Math.PI / 1.85, tiltZ: 0.14 },
    ];

    const orbitalRings: THREE.Mesh[] = [];
    ringConfigs.forEach((cfg) => {
      const rGeo = new THREE.TorusGeometry(cfg.radius, cfg.tube, 12, 96);
      const rMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.set(cfg.tiltX, 0, cfg.tiltZ);
      ringGroup.add(rMesh);
      orbitalRings.push(rMesh);
    });

    const pedestalRing = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.32, 64),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    pedestalRing.rotation.x = -Math.PI / 2;
    pedestalRing.position.y = -1.92;
    heroGroup.add(pedestalRing);

    // 5. Medical Scanner Disc + Laser Grid Crosshair
    const scannerGroup = new THREE.Group();
    heroGroup.add(scannerGroup);

    const scanRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.018, 12, 64),
      new THREE.MeshBasicMaterial({
        color: 0x67e8f9,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scanRing.rotation.x = Math.PI / 2;
    scannerGroup.add(scanRing);

    const scanPlane = new THREE.Mesh(
      new THREE.CircleGeometry(0.9, 48),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.14,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    scanPlane.rotation.x = Math.PI / 2;
    scannerGroup.add(scanPlane);

    const scanGrid = new THREE.GridHelper(1.75, 10, 0x67e8f9, 0x8b5cf6);
    const gridMats = Array.isArray(scanGrid.material)
      ? scanGrid.material
      : [scanGrid.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.28;
      m.blending = THREE.AdditiveBlending;
      m.depthWrite = false;
    });
    scannerGroup.add(scanGrid);

    if (!isSoftwareGl && typeof renderer.compile === 'function') {
      renderer.compile(scene, camera);
    }

    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      const bounds = container.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      pointer.x = ((e.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.y = ((e.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };
    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      const b = container.getBoundingClientRect();
      const w = Math.max(260, b.width);
      const h = Math.max(320, b.height);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize, { passive: true });

    let contextLost = false;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let smoothMorph = 0; // 0 = hologram, 0.5 = dissolved particles, 1.0 = wireframe

    const tick = () => {
      if (disposed) return;
      if (!contextLost) {
        const delta = Math.min(clock.getDelta(), 0.08);
        const elapsed = clock.getElapsedTime();

        const mode = focusModeRef.current;
        const targetCamY = mode === 'neural' ? 1.05 : mode === 'cardiac' ? 0.45 : 0.15;
        const targetCamZ = mode === 'neural' ? 4.35 : mode === 'cardiac' ? 4.7 : 6.2;

        camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamY, 4.5, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamZ, 4.5, delta);
        camera.lookAt(0, mode === 'neural' ? 1.15 : mode === 'cardiac' ? 0.35 : 0.05, 0);

        const targetRotY = (prefersReducedMotion ? 0 : elapsed * 0.3) + pointer.x * 0.44;
        const targetRotX = pointer.y * 0.18;
        heroGroup.rotation.y = THREE.MathUtils.damp(heroGroup.rotation.y, targetRotY, 5, delta);
        heroGroup.rotation.x = THREE.MathUtils.damp(heroGroup.rotation.x, targetRotX, 5, delta);

        // Compute Hologram Transformation state (0 = hologram -> 0.5 = dissolved particles -> 1 = wireframe)
        const mMode = morphModeRef.current;
        let targetMorph = 0;
        if (mMode === 'particles') {
          targetMorph = 0.5;
        } else if (mMode === 'wireframe') {
          targetMorph = 1.0;
        } else if (mMode === 'hologram' || prefersReducedMotion) {
          targetMorph = 0;
        } else {
          // Smooth periodic transformation cycle every ~11s
          targetMorph = 0.5 - 0.5 * Math.cos(elapsed * 0.52);
        }

        smoothMorph = THREE.MathUtils.damp(smoothMorph, targetMorph, 3.6, delta);

        // Solid hologram fades out smoothly as smoothMorph moves away from 0
        const solidFactor = Math.max(0.0, 1.0 - smoothMorph * 1.9);
        // Particle burst peaks cleanly at smoothMorph = 0.5
        const particleBurstAmount = Math.sin(smoothMorph * Math.PI);
        // Wireframe lattice intensifies toward smoothMorph = 1.0
        const wireframeFactor = Math.max(0.14, Math.min(0.88, (smoothMorph - 0.25) * 1.15));

        bodyHoloMat.uniforms.uOpacity.value = 0.88 * solidFactor;
        innerCoreMat.uniforms.uOpacity.value = 0.74 * solidFactor;
        wireLatticeMat.opacity = wireframeFactor;
        wireAccentMat.opacity = wireframeFactor * 1.08;
        dissolveMat.opacity = 0.16 + particleBurstAmount * 0.84;

        // In-place particle cloud morphing (zero GC allocations)
        const swirlAngle = particleBurstAmount * 0.55;
        const cosS = Math.cos(swirlAngle);
        const sinS = Math.sin(swirlAngle);
        for (let i = 0; i < morphCount; i++) {
          const i3 = i * 3;
          const ox = origPos[i3];
          const oy = origPos[i3 + 1];
          const oz = origPos[i3 + 2];
          const bx = burstPos[i3];
          const by = burstPos[i3 + 1];
          const bz = burstPos[i3 + 2];

          const lx = ox + (bx - ox) * particleBurstAmount;
          const ly = oy + (by - oy) * particleBurstAmount;
          const lz = oz + (bz - oz) * particleBurstAmount;

          currPos[i3] = lx * cosS - lz * sinS;
          currPos[i3 + 1] = ly;
          currPos[i3 + 2] = lx * sinS + lz * cosS;
        }
        dissolvePosAttr.needsUpdate = true;

        // Sweeping volumetric medical scanner
        const scanY = Math.sin(elapsed * 1.15) * 1.65;
        bodyHoloMat.uniforms.uTime.value = elapsed;
        bodyHoloMat.uniforms.uScanY.value = scanY;
        innerCoreMat.uniforms.uTime.value = elapsed;
        innerCoreMat.uniforms.uScanY.value = scanY;
        scannerGroup.position.y = scanY;
        const scanRadiusScale = Math.max(0.48, 1.0 - Math.abs(scanY) * 0.15);
        scannerGroup.scale.setScalar(scanRadiusScale);
        scanGrid.rotation.y = elapsed * 0.6;

        // Cardiac & neural core pulse
        const cardiacPulse = 1 + Math.sin(elapsed * 4.4) * 0.14;
        heartCore.scale.setScalar(mode === 'cardiac' ? cardiacPulse * 1.3 : cardiacPulse);
        heartCore.rotation.y = elapsed * 1.4;
        brainCore.rotation.y = -elapsed * 0.9;
        brainCore.scale.setScalar(mode === 'neural' ? 1.32 + Math.sin(elapsed * 3) * 0.08 : 1);

        // Orbital ring counter-rotations
        orbitalRings[0].rotation.z += delta * 0.55;
        orbitalRings[1].rotation.z -= delta * 0.42;
        orbitalRings[2].rotation.y += delta * 0.34;

        renderer.render(scene, camera);
      }

      if (prefersReducedMotion) return;
      if (isSoftwareGl) {
        frameId = scheduleSoftwareFrame(renderer, tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      container.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      disposeObject3D(scene);
      if (envTex) envTex.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglUnavailable) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center rounded-2xl bg-[#04091b] border border-cyan-500/30 p-6 text-center">
        <div className="h-36 w-36 rounded-full border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(34,211,238,0.4)] flex items-center justify-center">
          <div className="h-20 w-20 rounded-full border border-violet-400/70 bg-cyan-500/15" />
        </div>
        <div className="mt-4 font-display text-sm font-semibold text-cyan-200">
          Holographic Telemetry Chamber
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      aria-label="Interactive 3D holographic human morphing between solid hologram, particle cloud, and 3D wireframe"
      className="relative h-full w-full min-h-[340px] sm:min-h-[420px] cursor-grab active:cursor-grabbing"
    />
  );
}

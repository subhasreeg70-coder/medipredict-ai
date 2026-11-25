import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  applyStudioEnvironment,
  createRadialGlowTexture,
  detectSoftwareGl,
  disposeObject3D,
  scheduleSoftwareFrame,
} from './threeUtils';

interface DnaHelixCanvasProps {
  className?: string;
}

export function DnaHelixCanvas({ className = '' }: DnaHelixCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isSoftwareGl = detectSoftwareGl();
    let renderer: THREE.WebGLRenderer;

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
    const width = Math.max(240, rect.width || 420);
    const height = Math.max(240, rect.height || 290);
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030714, 0.06);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(0, 0.1, 5.4);

    // Three-point scientific lighting
    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x4c1d95, 0.8));
    const keyLight = new THREE.DirectionalLight(0x67e8f9, 1.9);
    keyLight.position.set(3.2, 4.0, 4.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.2);
    rimLight.position.set(-4.0, -2.5, -3.0);
    scene.add(rimLight);

    const dnaGroup = new THREE.Group();
    dnaGroup.rotation.z = 0.24;
    scene.add(dnaGroup);

    // Build two helical backbone curves
    const helixHeight = 4.2;
    const radius = 0.86;
    const turns = 2.15;
    const curveSamples = 96;

    const pointsA: THREE.Vector3[] = [];
    const pointsB: THREE.Vector3[] = [];

    for (let i = 0; i <= curveSamples; i++) {
      const t = i / curveSamples;
      const angle = t * Math.PI * 2 * turns;
      const y = (t - 0.5) * helixHeight;
      pointsA.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      pointsB.push(
        new THREE.Vector3(
          Math.cos(angle + Math.PI) * radius,
          y,
          Math.sin(angle + Math.PI) * radius
        )
      );
    }

    const curveA = new THREE.CatmullRomCurve3(pointsA);
    const curveB = new THREE.CatmullRomCurve3(pointsB);

    const strandGeoA = new THREE.TubeGeometry(curveA, 96, 0.052, 12, false);
    const strandMatA = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.45,
    });
    const strandMeshA = new THREE.Mesh(strandGeoA, strandMatA);
    dnaGroup.add(strandMeshA);

    const strandGeoB = new THREE.TubeGeometry(curveB, 96, 0.052, 12, false);
    const strandMatB = new THREE.MeshStandardMaterial({
      color: 0xa78bfa,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.45,
    });
    const strandMeshB = new THREE.Mesh(strandGeoB, strandMatB);
    dnaGroup.add(strandMeshB);

    // Base-pair rungs & glowing nucleotide spheres via InstancedMesh
    const rungCount = 22;
    const rungGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 8);
    const rungMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.35,
      transparent: true,
      opacity: 0.85,
    });
    const rungInstances = new THREE.InstancedMesh(rungGeo, rungMat, rungCount);
    dnaGroup.add(rungInstances);

    const nodeGeo = new THREE.SphereGeometry(0.075, 14, 14);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.1,
      roughness: 0.18,
      metalness: 0.4,
    });
    const nodeInstances = new THREE.InstancedMesh(nodeGeo, nodeMat, rungCount * 2);
    dnaGroup.add(nodeInstances);

    const dummy = new THREE.Object3D();
    const upAxis = new THREE.Vector3(0, 1, 0);
    const dirVec = new THREE.Vector3();
    const midVec = new THREE.Vector3();
    const cCyan = new THREE.Color(0x22d3ee);
    const cViolet = new THREE.Color(0xa78bfa);

    for (let i = 0; i < rungCount; i++) {
      const t = (i + 0.5) / rungCount;
      const pA = curveA.getPointAt(t);
      const pB = curveB.getPointAt(t);

      midVec.addVectors(pA, pB).multiplyScalar(0.5);
      dirVec.subVectors(pB, pA);
      const len = dirVec.length();
      dirVec.normalize();

      dummy.position.copy(midVec);
      dummy.quaternion.setFromUnitVectors(upAxis, dirVec);
      dummy.scale.set(1, len, 1);
      dummy.updateMatrix();
      rungInstances.setMatrixAt(i, dummy.matrix);
      rungInstances.setColorAt(i, i % 2 === 0 ? cCyan : cViolet);

      dummy.scale.setScalar(1);
      dummy.quaternion.identity();
      dummy.position.copy(pA);
      dummy.updateMatrix();
      nodeInstances.setMatrixAt(i * 2, dummy.matrix);
      nodeInstances.setColorAt(i * 2, cCyan);

      dummy.position.copy(pB);
      dummy.updateMatrix();
      nodeInstances.setMatrixAt(i * 2 + 1, dummy.matrix);
      nodeInstances.setColorAt(i * 2 + 1, cViolet);
    }
    rungInstances.instanceMatrix.needsUpdate = true;
    nodeInstances.instanceMatrix.needsUpdate = true;
    if (rungInstances.instanceColor) rungInstances.instanceColor.needsUpdate = true;
    if (nodeInstances.instanceColor) nodeInstances.instanceColor.needsUpdate = true;

    // Travelling glowing energy particles along both strands + ambient dust
    const travelCount = 44;
    const dustCount = 46;
    const totalParticles = travelCount + dustCount;
    const particlePositions = new Float32Array(totalParticles * 3);
    const particleColors = new Float32Array(totalParticles * 3);
    const travelPhase = new Float32Array(travelCount);
    const travelSpeed = new Float32Array(travelCount);

    for (let i = 0; i < travelCount; i++) {
      travelPhase[i] = i / travelCount;
      travelSpeed[i] = 0.085 + (i % 4) * 0.014;
      const col = i % 2 === 0 ? cCyan : cViolet;
      particleColors[i * 3] = col.r;
      particleColors[i * 3 + 1] = col.g;
      particleColors[i * 3 + 2] = col.b;
    }

    const cBlue = new THREE.Color(0x60a5fa);
    for (let i = travelCount; i < totalParticles; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 1.2 + Math.random() * 1.4;
      particlePositions[i * 3] = Math.cos(ang) * rad;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 4.4;
      particlePositions[i * 3 + 2] = Math.sin(ang) * rad;

      const pick = i % 3 === 0 ? cCyan : i % 3 === 1 ? cViolet : cBlue;
      particleColors[i * 3] = pick.r;
      particleColors[i * 3 + 1] = pick.g;
      particleColors[i * 3 + 2] = pick.b;
    }

    const particleGeo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(particlePositions, 3);
    particleGeo.setAttribute('position', posAttr);
    particleGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

    const glowTex = createRadialGlowTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.14,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    dnaGroup.add(particles);

    // Pre-allocated scratch point for zero GC allocation inside tick loop
    const scratchPt = new THREE.Vector3();

    const updateTravellingParticles = (elapsed: number) => {
      for (let i = 0; i < travelCount; i++) {
        const t = (travelPhase[i] + elapsed * travelSpeed[i]) % 1;
        const angle = t * Math.PI * 2 * turns + (i % 2 === 0 ? 0 : Math.PI);
        const y = (t - 0.5) * helixHeight;
        scratchPt.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        particlePositions[i * 3] = scratchPt.x;
        particlePositions[i * 3 + 1] = scratchPt.y;
        particlePositions[i * 3 + 2] = scratchPt.z;
      }
      posAttr.needsUpdate = true;
    };

    updateTravellingParticles(0);

    if (!isSoftwareGl && typeof renderer.compile === 'function') {
      renderer.compile(scene, camera);
    }

    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      const b = container.getBoundingClientRect();
      if (b.width <= 0 || b.height <= 0) return;
      pointer.x = ((e.clientX - b.left) / b.width - 0.5) * 2;
      pointer.y = ((e.clientY - b.top) / b.height - 0.5) * 2;
    };
    container.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      const b = container.getBoundingClientRect();
      const w = Math.max(240, b.width);
      const h = Math.max(240, b.height);
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

    const tick = () => {
      if (disposed) return;
      if (!contextLost) {
        const delta = Math.min(clock.getDelta(), 0.08);
        const elapsed = clock.getElapsedTime();

        const targetRotY = (prefersReducedMotion ? 0 : elapsed * 0.45) + pointer.x * 0.45;
        const targetRotX = pointer.y * 0.2;
        dnaGroup.rotation.y = THREE.MathUtils.damp(dnaGroup.rotation.y, targetRotY, 4.5, delta);
        dnaGroup.rotation.x = THREE.MathUtils.damp(dnaGroup.rotation.x, targetRotX, 4.5, delta);
        dnaGroup.position.y = prefersReducedMotion ? 0 : Math.sin(elapsed * 1.1) * 0.14;

        updateTravellingParticles(prefersReducedMotion ? 0 : elapsed);
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
      <div
        className={`relative flex items-center justify-center rounded-xl bg-[#040a1d] border border-cyan-500/30 p-6 text-center ${className}`}
      >
        <div className="text-xs font-medium text-cyan-300">
          3D Genomic Helix Simulation Ready
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      aria-label="Interactive 3D DNA double helix with travelling bio-luminescent particles"
      className={`relative w-full h-[270px] sm:h-[300px] cursor-grab active:cursor-grabbing ${className}`}
    />
  );
}

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

interface NeuralBrainCanvasProps {
  className?: string;
}

export function NeuralBrainCanvas({ className = '' }: NeuralBrainCanvasProps) {
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
    scene.fog = new THREE.FogExp2(0x030714, 0.055);
    const envTex = applyStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 40);
    camera.position.set(0, 0.12, 4.9);

    scene.add(new THREE.HemisphereLight(0x38bdf8, 0x3b0764, 0.85));
    const keyLight = new THREE.DirectionalLight(0x67e8f9, 1.8);
    keyLight.position.set(3, 4, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa855f7, 2.2);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // Translucent holographic left and right cortical shells
    const lobeGeo = new THREE.IcosahedronGeometry(1.02, 2);
    lobeGeo.scale(0.68, 0.86, 1.24);
    const shellHoloMat = createHologramShaderMaterial({
      primaryColor: 0x38bdf8,
      accentColor: 0x8b5cf6,
      opacity: 0.42,
    });
    const lobeWireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const leftLobe = new THREE.Mesh(lobeGeo, shellHoloMat);
    leftLobe.position.set(-0.56, 0.04, 0);
    leftLobe.rotation.z = 0.08;
    brainGroup.add(leftLobe);

    const leftWire = new THREE.Mesh(lobeGeo, lobeWireMat);
    leftWire.position.copy(leftLobe.position);
    leftWire.rotation.copy(leftLobe.rotation);
    brainGroup.add(leftWire);

    const rightLobe = new THREE.Mesh(lobeGeo, shellHoloMat);
    rightLobe.position.set(0.56, 0.04, 0);
    rightLobe.rotation.z = -0.08;
    brainGroup.add(rightLobe);

    const rightWire = new THREE.Mesh(lobeGeo, lobeWireMat);
    rightWire.position.copy(rightLobe.position);
    rightWire.rotation.copy(rightLobe.rotation);
    brainGroup.add(rightWire);

    // Generate deterministic cortical neural nodes inside both hemispheres
    const nodeCount = 74;
    const nodeCoords: THREE.Vector3[] = [];
    for (let i = 0; i < nodeCount; i++) {
      const hemi = i % 2 === 0 ? -1 : 1;
      // Golden angle spiral inside ellipsoid hemisphere
      const u = ((i * 0.6180339887) % 1) * 2 - 1;
      const theta = i * 2.3999632;
      const rScale = 0.45 + 0.5 * ((i % 7) / 6);
      const s = Math.sqrt(Math.max(0, 1 - u * u));

      const x = hemi * (0.24 + Math.abs(Math.cos(theta) * s) * 0.72 * rScale);
      const y = u * 0.76 * rScale + 0.04;
      const z = Math.sin(theta) * s * 1.12 * rScale;
      nodeCoords.push(new THREE.Vector3(x, y, z));
    }

    const nodeGeo = new THREE.SphereGeometry(0.048, 12, 12);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.35,
      roughness: 0.2,
      metalness: 0.4,
    });
    const nodeInstances = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    brainGroup.add(nodeInstances);

    const dummy = new THREE.Object3D();
    const cCyan = new THREE.Color(0x22d3ee);
    const cViolet = new THREE.Color(0xa78bfa);
    const cBlue = new THREE.Color(0x60a5fa);

    for (let i = 0; i < nodeCount; i++) {
      dummy.position.copy(nodeCoords[i]);
      const scale = i % 5 === 0 ? 1.35 : 0.92;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      nodeInstances.setMatrixAt(i, dummy.matrix);
      nodeInstances.setColorAt(i, i % 3 === 0 ? cCyan : i % 3 === 1 ? cViolet : cBlue);
    }
    nodeInstances.instanceMatrix.needsUpdate = true;
    if (nodeInstances.instanceColor) nodeInstances.instanceColor.needsUpdate = true;

    // Build synaptic connections between nearby cortical nodes
    const edgePairs: Array<[number, number]> = [];
    const maxEdgeDist = 0.76;
    for (let i = 0; i < nodeCount; i++) {
      let connections = 0;
      for (let j = i + 1; j < nodeCount; j++) {
        if (nodeCoords[i].distanceTo(nodeCoords[j]) < maxEdgeDist) {
          edgePairs.push([i, j]);
          connections++;
          if (connections >= 4) break;
        }
      }
    }

    const linePositions = new Float32Array(edgePairs.length * 6);
    const lineColors = new Float32Array(edgePairs.length * 6);
    for (let e = 0; e < edgePairs.length; e++) {
      const [aIdx, bIdx] = edgePairs[e];
      const a = nodeCoords[aIdx];
      const b = nodeCoords[bIdx];
      linePositions[e * 6] = a.x;
      linePositions[e * 6 + 1] = a.y;
      linePositions[e * 6 + 2] = a.z;
      linePositions[e * 6 + 3] = b.x;
      linePositions[e * 6 + 4] = b.y;
      linePositions[e * 6 + 5] = b.z;

      const col = e % 2 === 0 ? cCyan : cViolet;
      lineColors[e * 6] = col.r;
      lineColors[e * 6 + 1] = col.g;
      lineColors[e * 6 + 2] = col.b;
      lineColors[e * 6 + 3] = col.r;
      lineColors[e * 6 + 4] = col.g;
      lineColors[e * 6 + 5] = col.b;
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    edgeGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    const edgeMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const edgeSegments = new THREE.LineSegments(edgeGeo, edgeMat);
    brainGroup.add(edgeSegments);

    // Animated light packets travelling along synaptic edges
    const packetCount = Math.min(36, Math.max(12, edgePairs.length));
    const packetPositions = new Float32Array(packetCount * 3);
    const packetColors = new Float32Array(packetCount * 3);
    const packetEdgeIdx = new Int32Array(packetCount);
    const packetProgress = new Float32Array(packetCount);
    const packetSpeed = new Float32Array(packetCount);

    for (let p = 0; p < packetCount; p++) {
      packetEdgeIdx[p] = (p * 3) % edgePairs.length;
      packetProgress[p] = (p * 0.27) % 1;
      packetSpeed[p] = 0.45 + (p % 5) * 0.12;
      const col = p % 2 === 0 ? cCyan : cViolet;
      packetColors[p * 3] = col.r;
      packetColors[p * 3 + 1] = col.g;
      packetColors[p * 3 + 2] = col.b;
    }

    const packetGeo = new THREE.BufferGeometry();
    const packetAttr = new THREE.BufferAttribute(packetPositions, 3);
    packetGeo.setAttribute('position', packetAttr);
    packetGeo.setAttribute('color', new THREE.BufferAttribute(packetColors, 3));

    const glowTex = createRadialGlowTexture();
    const packetMat = new THREE.PointsMaterial({
      size: 0.16,
      map: glowTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const packets = new THREE.Points(packetGeo, packetMat);
    brainGroup.add(packets);

    // Pre-allocated scratch vector for zero GC inside render loop
    const scratchVec = new THREE.Vector3();

    const updateSynapticPackets = (elapsed: number) => {
      if (edgePairs.length === 0) return;
      for (let p = 0; p < packetCount; p++) {
        const edge = edgePairs[packetEdgeIdx[p]];
        const a = nodeCoords[edge[0]];
        const b = nodeCoords[edge[1]];
        const t = (packetProgress[p] + elapsed * packetSpeed[p]) % 1;
        scratchVec.lerpVectors(a, b, t);
        packetPositions[p * 3] = scratchVec.x;
        packetPositions[p * 3 + 1] = scratchVec.y;
        packetPositions[p * 3 + 2] = scratchVec.z;
      }
      packetAttr.needsUpdate = true;
    };

    updateSynapticPackets(0);

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

        const targetRotY = (prefersReducedMotion ? 0.35 : elapsed * 0.35) + pointer.x * 0.5;
        const targetRotX = 0.16 + pointer.y * 0.22;
        brainGroup.rotation.y = THREE.MathUtils.damp(brainGroup.rotation.y, targetRotY, 4.5, delta);
        brainGroup.rotation.x = THREE.MathUtils.damp(brainGroup.rotation.x, targetRotX, 4.5, delta);

        // Subtle neural pulse
        const pulse = prefersReducedMotion ? 1 : 1 + Math.sin(elapsed * 2.4) * 0.025;
        brainGroup.scale.setScalar(pulse);
        shellHoloMat.uniforms.uTime.value = elapsed;
        shellHoloMat.uniforms.uScanY.value = Math.sin(elapsed * 1.3) * 1.1;

        updateSynapticPackets(prefersReducedMotion ? 0 : elapsed);
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
        className={`relative flex items-center justify-center rounded-xl bg-[#040a1d] border border-violet-500/30 p-6 text-center ${className}`}
      >
        <div className="text-xs font-medium text-violet-300">
          3D Neural Network Topology Ready
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      aria-label="Interactive 3D AI neural network brain with glowing nodes and synaptic light pulses"
      className={`relative w-full h-[270px] sm:h-[300px] cursor-grab active:cursor-grabbing ${className}`}
    />
  );
}

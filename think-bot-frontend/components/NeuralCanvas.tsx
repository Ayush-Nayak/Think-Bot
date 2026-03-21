"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface NeuralCanvasProps {
  opacity?: number;
  className?: string;
}

const NODE_COUNT    = 55;
const MAX_DIST      = 120;
const BOUND_XY      = 300;
const BOUND_Z       = 160;
const MAX_LINE_PAIRS = (NODE_COUNT * (NODE_COUNT - 1)) / 2;
const RAIN_COUNT     = 200;

interface NodeData {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  phase: number;
}

export default function NeuralCanvas({ opacity = 1, className = "" }: NeuralCanvasProps) {
  const mountRef  = useRef<HTMLDivElement>(null);
  const mouseRef  = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const mount = mountRef.current!;
    if (!mount) return;

    /* ── Renderer ──────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setClearColor(0x06080f, 1);
    mount.appendChild(renderer.domElement);

    /* ── Scene / Camera ────────────────────────────── */
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x06080f, 0.0012);
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1400
    );
    camera.position.z = 400;

    /* ── Background Stars ──────────────────────────── */
    {
      const count = 900;
      const pos   = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 1600;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 1600;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 700 - 100;
        // Mix of violet and cyan tinted stars
        const tint = Math.random();
        colors[i * 3]     = tint < 0.5 ? 0.3 : 0.15;
        colors[i * 3 + 1] = tint < 0.5 ? 0.15 : 0.35;
        colors[i * 3 + 2] = tint < 0.5 ? 0.6 : 0.5;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        size: 1.0,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      });
      scene.add(new THREE.Points(geo, mat));
    }

    /* ── Data Rain Particles ──────────────────────── */
    const rainPosArr = new Float32Array(RAIN_COUNT * 3);
    const rainVelArr: number[] = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
      rainPosArr[i * 3]     = (Math.random() - 0.5) * 800;
      rainPosArr[i * 3 + 1] = (Math.random() - 0.5) * 800;
      rainPosArr[i * 3 + 2] = (Math.random() - 0.5) * 300 - 50;
      rainVelArr.push(0.3 + Math.random() * 0.7);
    }
    const rainGeo = new THREE.BufferGeometry();
    const rainPosAttr = new THREE.BufferAttribute(rainPosArr, 3);
    rainPosAttr.setUsage(THREE.DynamicDrawUsage);
    rainGeo.setAttribute("position", rainPosAttr);
    const rainMat = new THREE.PointsMaterial({
      color: 0x7c5cfc,
      size: 1.2,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rainMesh = new THREE.Points(rainGeo, rainMat);
    scene.add(rainMesh);

    /* ── Nodes ─────────────────────────────────────── */
    const nodes: NodeData[] = Array.from({ length: NODE_COUNT }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * BOUND_XY * 2,
        (Math.random() - 0.5) * BOUND_XY * 2,
        (Math.random() - 0.5) * BOUND_Z * 2
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 0.18,
        (Math.random() - 0.5) * 0.18,
        (Math.random() - 0.5) * 0.06
      ),
      phase: Math.random() * Math.PI * 2,
    }));

    // Instanced spheres for nodes
    const nodeGeo  = new THREE.SphereGeometry(2.0, 12, 12);
    const nodeMat  = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nodesMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, NODE_COUNT);
    nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(nodesMesh);

    // Glow halos
    const haloGeo = new THREE.SphereGeometry(5.5, 8, 8);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x7c5cfc,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halosMesh = new THREE.InstancedMesh(haloGeo, haloMat, NODE_COUNT);
    halosMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(halosMesh);

    /* ── Connection Lines ──────────────────────────── */
    const linePosArr   = new Float32Array(MAX_LINE_PAIRS * 2 * 3);
    const lineColorArr = new Float32Array(MAX_LINE_PAIRS * 2 * 3);
    const lineGeo      = new THREE.BufferGeometry();
    const linePosAttr  = new THREE.BufferAttribute(linePosArr,   3);
    const lineColAttr  = new THREE.BufferAttribute(lineColorArr, 3);
    linePosAttr.setUsage(THREE.DynamicDrawUsage);
    lineColAttr.setUsage(THREE.DynamicDrawUsage);
    lineGeo.setAttribute("position", linePosAttr);
    lineGeo.setAttribute("color",    lineColAttr);

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);

    /* ── Helpers ───────────────────────────────────── */
    const dummy  = new THREE.Object3D();
    let   raf    = 0;
    let   t      = 0;

    /* ── Mouse ─────────────────────────────────────── */
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x:  (e.clientX / window.innerWidth  - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMouse, { passive: true });

    /* ── Resize ─────────────────────────────────────── */
    const onResize = () => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    /* ── Animate ─────────────────────────────────────── */
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t  += 0.006;

      // Move nodes
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        n.pos.addScaledVector(n.vel, 1);
        if (Math.abs(n.pos.x) > BOUND_XY) n.vel.x *= -1;
        if (Math.abs(n.pos.y) > BOUND_XY) n.vel.y *= -1;
        if (Math.abs(n.pos.z) > BOUND_Z)  n.vel.z *= -1;

        const pulse = 0.7 + 0.4 * Math.sin(t * 1.5 + n.phase);
        dummy.position.copy(n.pos);
        dummy.scale.setScalar(pulse);
        dummy.updateMatrix();
        nodesMesh.setMatrixAt(i, dummy.matrix);

        dummy.scale.setScalar(pulse * (1.4 + 0.6 * Math.sin(t * 0.8 + n.phase)));
        dummy.updateMatrix();
        halosMesh.setMatrixAt(i, dummy.matrix);
      }
      nodesMesh.instanceMatrix.needsUpdate  = true;
      halosMesh.instanceMatrix.needsUpdate  = true;

      // Update data rain
      for (let i = 0; i < RAIN_COUNT; i++) {
        rainPosArr[i * 3 + 1] -= rainVelArr[i];
        if (rainPosArr[i * 3 + 1] < -400) {
          rainPosArr[i * 3 + 1] = 400;
          rainPosArr[i * 3]     = (Math.random() - 0.5) * 800;
        }
      }
      rainPosAttr.needsUpdate = true;

      // Update lines
      let lc = 0;
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const dist = nodes[i].pos.distanceTo(nodes[j].pos);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST);
            const b     = lc * 6;
            linePosArr[b]     = nodes[i].pos.x; linePosArr[b + 1] = nodes[i].pos.y; linePosArr[b + 2] = nodes[i].pos.z;
            linePosArr[b + 3] = nodes[j].pos.x; linePosArr[b + 4] = nodes[j].pos.y; linePosArr[b + 5] = nodes[j].pos.z;
            // Violet-to-cyan gradient on connections
            lineColorArr[b]     = alpha * 0.35; lineColorArr[b + 1] = alpha * 0.2;  lineColorArr[b + 2] = alpha * 0.85;
            lineColorArr[b + 3] = alpha * 0.15; lineColorArr[b + 4] = alpha * 0.55; lineColorArr[b + 5] = alpha * 0.7;
            lc++;
          }
        }
      }
      lineGeo.setDrawRange(0, lc * 2);
      linePosAttr.needsUpdate  = true;
      lineColAttr.needsUpdate  = true;

      // Camera parallax + slow drift
      const mx = mouseRef.current;
      camera.position.x += (mx.x * 20 - camera.position.x) * 0.02;
      camera.position.y += (mx.y * 12 - camera.position.y) * 0.02;
      camera.lookAt(scene.position);

      // Slow scene rotation
      scene.rotation.y = t * 0.035;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      nodeGeo.dispose(); nodeMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      rainGeo.dispose(); rainMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`fixed inset-0 w-full h-full ${className}`}
      style={{ opacity, transition: "opacity 0.8s ease" }}
      aria-hidden="true"
    />
  );
}

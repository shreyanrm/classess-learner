'use client';

/**
 * AnatomyCanvas — the HEAVY 3D half of AnatomyScene, isolated behind React.lazy so three +
 * @react-three/fiber never enter the bundle unless an anatomy card actually renders and WebGL is
 * present. Pure view: it draws the spec's primitive meshes, hand-rolls a pointer-drag rotation of
 * the whole group (no @react-three/drei — not installed), and reports mesh taps up to the parent,
 * which owns all selection / quiz / Wobo state. Default export because React.lazy needs one.
 */

import { Canvas, useFrame } from '@react-three/fiber';
import { useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import type { Group } from 'three';
import { Vector2 } from 'three';
import type { AnatomyPart } from './AnatomyScene';

type Rot = { x: number; y: number };
// structural ref type — avoids depending on React's deprecated MutableRefObject alias
type Box<T> = { current: T };

function Mesh({
  part,
  selected,
  hue,
  onSelect,
}: {
  part: AnatomyPart;
  selected: boolean;
  hue: string;
  onSelect: (id: string) => void;
}) {
  const scale: [number, number, number] =
    typeof part.scale === 'number' ? [part.scale, part.scale, part.scale] : part.scale;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: a three.js <mesh> is a WebGL object, not a DOM element — onClick is R3F's raycast pick, and the parent exposes tappable part chips for a11y
    <mesh
      position={part.position}
      rotation={part.rotation ?? [0, 0, 0]}
      scale={scale}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(part.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {part.shape === 'sphere' && <sphereGeometry args={[1, 32, 24]} />}
      {part.shape === 'cylinder' && <cylinderGeometry args={[1, 1, 2, 32]} />}
      {part.shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {part.shape === 'torus' && <torusGeometry args={[1, 0.35, 20, 48]} />}
      {part.shape === 'lathe' && (
        <latheGeometry
          args={[(part.profile ?? []).map((p) => new Vector2(p[0] ?? 0, p[1] ?? 0)), 32]}
        />
      )}
      <meshStandardMaterial
        color={part.color}
        roughness={0.55}
        metalness={0.05}
        emissive={hue}
        emissiveIntensity={selected ? 0.55 : 0}
      />
    </mesh>
  );
}

function Model({
  parts,
  selectedId,
  hue,
  onSelect,
  rot,
  dragging,
  reduced,
}: {
  parts: AnatomyPart[];
  selectedId: string | null;
  hue: string;
  onSelect: (id: string) => void;
  rot: Box<Rot>;
  dragging: Box<boolean>;
  reduced: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    // gentle idle spin — only when nothing is selected, nobody is dragging, and motion is allowed
    if (!reduced && !dragging.current && selectedId === null) {
      rot.current.y += Math.min(delta, 0.05) * 0.3;
    }
    // ease toward the target rotation the drag handlers write
    g.rotation.x += (rot.current.x - g.rotation.x) * 0.18;
    g.rotation.y += (rot.current.y - g.rotation.y) * 0.18;
  });
  return (
    <group ref={group}>
      {parts.map((p) => (
        <Mesh key={p.id} part={p} selected={p.id === selectedId} hue={hue} onSelect={onSelect} />
      ))}
    </group>
  );
}

export default function AnatomyCanvas({
  parts,
  selectedId,
  onSelect,
  hue,
  bg,
  dark,
}: {
  parts: AnatomyPart[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  hue: string;
  bg: string;
  dark: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const rot = useRef<Rot>({ x: 0.25, y: 0.5 });
  const dragging = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      style={{ width: '100%', height: '100%', touchAction: 'none', cursor: 'grab' }}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (!dragging.current || !last.current) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        rot.current.y += dx * 0.01;
        rot.current.x = Math.max(-1.2, Math.min(1.2, rot.current.x + dy * 0.01));
      }}
      onPointerUp={() => {
        dragging.current = false;
        last.current = null;
      }}
      onPointerLeave={() => {
        dragging.current = false;
        last.current = null;
      }}
    >
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 2]}>
        <color attach="background" args={[bg]} />
        <ambientLight intensity={dark ? 0.85 : 0.7} />
        <directionalLight position={[4, 6, 5]} intensity={dark ? 0.7 : 0.9} />
        <directionalLight position={[-4, -2, -3]} intensity={0.25} />
        <Model
          parts={parts}
          selectedId={selectedId}
          hue={hue}
          onSelect={onSelect}
          rot={rot}
          dragging={dragging}
          reduced={reduced}
        />
      </Canvas>
    </div>
  );
}

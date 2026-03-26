import { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, useTexture, Text } from '@react-three/drei';
import * as THREE from 'three';
import clsx from 'clsx';
import { X, Trash2 } from 'lucide-react';
import { DeviceIcon } from '../DeviceIcon';
import { deviceApi, deviceTypeApi } from '../../api';
import type { DeviceType } from '../../types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Unit {
  u: number;
  device_id: number | null;
  device_name: string | null;
  device_type?: string;
  role?: string;
  status?: string;
  u_height?: number;
  start_u?: number;
  color?: string;
  width_mm?: number;
  depth_mm?: number;
  is_full_depth?: boolean;
  face?: 'front' | 'rear';
  front_image?: string | null;
  rear_image?: string | null;
}

interface RackDetail {
  id: number;
  name: string;
  u_height: number;
  status: string;
  max_power_kw: number;
  max_weight_kg: number;
  serial_number?: string;
  asset_tag?: string;
  manufacturer?: string;
  model?: string;
  row_name?: string;
  room_name?: string;
  datacenter_name?: string;
  position_x?: number;
  position_y?: number;
}

interface Props {
  rack: RackDetail;
  units: Unit[];
  allRacks?: { id: number; name: string }[];
  onSelectRack?: (id: number) => void;
  onBackToFloorPlan?: () => void;
}

// ── Role colours ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  server:      '#1d4ed8',
  switch:      '#059669',
  router:      '#7c3aed',
  firewall:    '#dc2626',
  pdu:         '#d97706',
  ups:         '#0891b2',
  storage:     '#4338ca',
  patch_panel: '#475569',
  wire_manager:'#ea580c',
  other:       '#374151',
};

function unitColor(u: Unit) {
  if (u.color && u.color !== '#6b7280') return u.color;
  return ROLE_COLORS[u.role ?? ''] ?? '#374151';
}

// ── 3-D rack scene ────────────────────────────────────────────────────────────

const RACK_W = 0.6;
const RACK_D = 0.8;
const U_H    = 0.044; // 1U in metres (1.75 in ≈ 44mm)

function RackFrame({ totalU }: { totalU: number }) {
  const h = totalU * U_H;
  const thick = 0.02;
  const railW = 0.03; // wider rail strip that carries U markings

  // Four vertical posts (corner columns)
  const posts: [number, number, number][] = [
    [-RACK_W / 2 + thick / 2, h / 2,  RACK_D / 2 - thick / 2],
    [ RACK_W / 2 - thick / 2, h / 2,  RACK_D / 2 - thick / 2],
    [-RACK_W / 2 + thick / 2, h / 2, -RACK_D / 2 + thick / 2],
    [ RACK_W / 2 - thick / 2, h / 2, -RACK_D / 2 + thick / 2],
  ];

  // U markings: U1 at bottom, Umax at top — labels on OUTER edges of left/right rails
  const uMarkings: React.ReactNode[] = [];
  const frontZ  =  RACK_D / 2 - thick / 2;
  const backZ   = -RACK_D / 2 + thick / 2;
  const leftX   = -RACK_W / 2 + railW / 2;
  const rightX  =  RACK_W / 2 - railW / 2;
  // Label positions: well outside the rack frame so they're clearly readable
  const labelOffsetX = 0.055;   // how far outside the rail outer edge
  const labelLeftX  = -RACK_W / 2 - labelOffsetX;
  const labelRightX =  RACK_W / 2 + labelOffsetX;
  const labelFrontZ =  frontZ + 0.015;
  const labelBackZ  =  backZ  - 0.015;

  // Guide-line geometry: spans from label position to the rail tick (X axis)
  const lineLen  = labelOffsetX + railW / 2;           // 0.055 + 0.015 = 0.07
  const lineCtrL = (labelLeftX  + leftX)  / 2;         // midpoint left side
  const lineCtrR = (labelRightX + rightX) / 2;         // midpoint right side

  for (let u = 1; u <= totalU; u++) {
    const yTop  = (totalU - u + 1) * U_H;
    const yMid  = yTop - U_H / 2;
    const label = String(totalU - u + 1).padStart(2, '0');  // U1 at bottom

    // ── Tick marks — front rail ──
    uMarkings.push(
      <mesh key={`fltick-${u}`} position={[leftX,  yTop, frontZ]}>
        <boxGeometry args={[railW, 0.0035, 0.007]} />
        <meshStandardMaterial color="#111827" />
      </mesh>,
      <mesh key={`frtick-${u}`} position={[rightX, yTop, frontZ]}>
        <boxGeometry args={[railW, 0.0035, 0.007]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    );

    // ── Tick marks — rear rail ──
    uMarkings.push(
      <mesh key={`bltick-${u}`} position={[leftX,  yTop, backZ]}>
        <boxGeometry args={[railW, 0.0035, 0.007]} />
        <meshStandardMaterial color="#111827" />
      </mesh>,
      <mesh key={`brtick-${u}`} position={[rightX, yTop, backZ]}>
        <boxGeometry args={[railW, 0.0035, 0.007]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    );

    // ── Guide lines — front face: at yTop, aligned with tick mark ──
    uMarkings.push(
      <mesh key={`flline-${u}`} position={[lineCtrL, yTop, labelFrontZ]}>
        <boxGeometry args={[lineLen, 0.0010, 0.0010]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>,
      <mesh key={`frline-${u}`} position={[lineCtrR, yTop, labelFrontZ]}>
        <boxGeometry args={[lineLen, 0.0010, 0.0010]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    );

    // ── Guide lines — back face ──
    uMarkings.push(
      <mesh key={`blline-${u}`} position={[lineCtrL, yTop, labelBackZ]}>
        <boxGeometry args={[lineLen, 0.0010, 0.0010]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>,
      <mesh key={`brline-${u}`} position={[lineCtrR, yTop, labelBackZ]}>
        <boxGeometry args={[lineLen, 0.0010, 0.0010]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
    );

    // ── Labels — FRONT face: anchored at yTop (same as tick + line) ──
    uMarkings.push(
      <Text key={`fllabel-${u}`}
        position={[labelLeftX,  yTop, labelFrontZ]}
        fontSize={0.030} color="#000000" anchorX="right" anchorY="top"
        fontWeight="bold" outlineWidth={0.003} outlineColor="#ffffff">
        {label}
      </Text>,
      <Text key={`frlabel-${u}`}
        position={[labelRightX, yTop, labelFrontZ]}
        fontSize={0.030} color="#000000" anchorX="left" anchorY="top"
        fontWeight="bold" outlineWidth={0.003} outlineColor="#ffffff">
        {label}
      </Text>
    );

    // ── Labels — BACK face ──
    uMarkings.push(
      <Text key={`bllabel-${u}`}
        position={[labelLeftX,  yTop, labelBackZ]}
        fontSize={0.030} color="#000000" anchorX="left" anchorY="top"
        fontWeight="bold" outlineWidth={0.003} outlineColor="#ffffff"
        rotation={[0, Math.PI, 0]}>
        {label}
      </Text>,
      <Text key={`brlabel-${u}`}
        position={[labelRightX, yTop, labelBackZ]}
        fontSize={0.030} color="#000000" anchorX="right" anchorY="top"
        fontWeight="bold" outlineWidth={0.003} outlineColor="#ffffff"
        rotation={[0, Math.PI, 0]}>
        {label}
      </Text>
    );
  }

  return (
    <group>
      {posts.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[thick, h, thick]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Left front rail strip */}
      <mesh position={[-RACK_W / 2 + railW / 2, h / 2, frontZ]}>
        <boxGeometry args={[railW, h, 0.004]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Right front rail strip */}
      <mesh position={[RACK_W / 2 - railW / 2, h / 2, frontZ]}>
        <boxGeometry args={[railW, h, 0.004]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Left rear rail strip */}
      <mesh position={[-RACK_W / 2 + railW / 2, h / 2, backZ]}>
        <boxGeometry args={[railW, h, 0.004]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Right rear rail strip */}
      <mesh position={[RACK_W / 2 - railW / 2, h / 2, backZ]}>
        <boxGeometry args={[railW, h, 0.004]} />
        <meshStandardMaterial color="#d1d5db" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Floor plate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[RACK_W, thick, RACK_D]} />
        <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Top plate */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[RACK_W, thick, RACK_D]} />
        <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.5} />
      </mesh>
      {uMarkings}
    </group>
  );
}

// Merge a face-filtered unit list, skipping continuation rows of multi-U devices
function mergeByFace(units: Unit[], face: 'front' | 'rear'): Unit[] {
  const filtered = units.filter(u => !u.device_id || u.face === face);
  const merged: Unit[] = [];
  const skipUntil: Record<number, boolean> = {};
  for (const u of filtered) {
    if (skipUntil[u.u]) continue;
    merged.push(u);
    if (u.device_id && (u.u_height ?? 1) > 1) {
      for (let i = u.u + 1; i < u.u + (u.u_height ?? 1); i++) skipUntil[i] = true;
    }
  }
  return merged;
}

// material indices: 0=+X 1=-X 2=+Y 3=-Y 4=+Z(front-face) 5=-Z(back-face)
// mountFace='front' → device faceplate faces rack front (material-4 gets front_image)
// mountFace='rear'  → device faceplate faces rack back  (material-5 gets front_image)
type SlabProps = { position: [number,number,number]; args: [number,number,number]; col: string; mountFace: 'front' | 'rear'; selected?: boolean; onClick?: () => void };

function SlabFrontOnly({ position, args, col, mountFace, frontUrl, selected, onClick }: SlabProps & { frontUrl: string }) {
  const tex = useTexture(frontUrl);
  const m4 = mountFace === 'front' ? tex : null;
  const m5 = mountFace === 'rear'  ? tex : null;
  return (
    <mesh position={position} onClick={e => { e.stopPropagation(); onClick?.(); }}>
      <boxGeometry args={args} />
      <meshStandardMaterial attach="material-0" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-1" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-2" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-3" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-4" map={m4 ?? undefined} color={m4 ? undefined : col} roughness={0.3} metalness={0.1} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-5" map={m5 ?? undefined} color={m5 ? undefined : col} roughness={0.3} metalness={0.1} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
    </mesh>
  );
}

function SlabRearOnly({ position, args, col, mountFace, rearUrl, selected, onClick }: SlabProps & { rearUrl: string }) {
  const tex = useTexture(rearUrl);
  const m4 = mountFace === 'rear'  ? tex : null;
  const m5 = mountFace === 'front' ? tex : null;
  return (
    <mesh position={position} onClick={e => { e.stopPropagation(); onClick?.(); }}>
      <boxGeometry args={args} />
      <meshStandardMaterial attach="material-0" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-1" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-2" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-3" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-4" map={m4 ?? undefined} color={m4 ? undefined : col} roughness={0.3} metalness={0.1} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-5" map={m5 ?? undefined} color={m5 ? undefined : col} roughness={0.3} metalness={0.1} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
    </mesh>
  );
}

function SlabBothFaces({ position, args, col, mountFace, frontUrl, rearUrl, selected, onClick }: SlabProps & { frontUrl: string; rearUrl: string }) {
  const frontTex = useTexture(frontUrl);
  const rearTex  = useTexture(rearUrl);
  // front-mounted: faceplate (+front_image) at material-4, back (+rear_image) at material-5
  // rear-mounted:  faceplate (+front_image) at material-5, back (+rear_image) at material-4
  const mat4 = mountFace === 'front' ? frontTex : rearTex;
  const mat5 = mountFace === 'front' ? rearTex  : frontTex;
  return (
    <mesh position={position} onClick={e => { e.stopPropagation(); onClick?.(); }}>
      <boxGeometry args={args} />
      <meshStandardMaterial attach="material-0" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-1" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-2" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-3" color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-4" map={mat4} roughness={0.3} metalness={0.1} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      <meshStandardMaterial attach="material-5" map={mat5} roughness={0.3} metalness={0.1} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
    </mesh>
  );
}

function DeviceSlabs({ units, totalU, onDeviceClick, selectedDeviceId }: { units: Unit[]; totalU: number; onDeviceClick?: (u: Unit) => void; selectedDeviceId?: number | null }) {
  const STD_WIDTH_MM = 482.6;
  const MAX_DEPTH_MM = 1200;
  const FRONT_Z =  RACK_D / 2 - 0.01;  // front face of rack
  const BACK_Z  = -RACK_D / 2 + 0.01;  // back face of rack

  const frontUnits = mergeByFace(units, 'front');
  const rearUnits  = mergeByFace(units, 'rear');

  const slabProps = (u: Unit, side: 'front' | 'rear') => {
    if (!u.device_id) return null;
    const uh    = u.u_height ?? 1;
    const slabH = uh * U_H - 0.003;
    const yFromBottom = (totalU - u.u - uh + 1) * U_H + slabH / 2 + U_H * 0.05;
    const col   = unitColor(u);
    const wRatio = Math.min((u.width_mm ?? STD_WIDTH_MM) / STD_WIDTH_MM, 1);
    const slabW  = (RACK_W - 0.06) * wRatio;

    const rawD = ((u.depth_mm ?? 600) / MAX_DEPTH_MM) * RACK_D;
    const slabD = Math.max(Math.min(rawD, RACK_D - 0.02), 0.03);

    const slabZCenter = side === 'front'
      ? FRONT_Z - slabD / 2
      : BACK_Z  + slabD / 2;

    return { col, slabW, slabH, slabD, yFromBottom, slabZCenter };
  };

  const renderSlab = (u: Unit, side: 'front' | 'rear') => {
    const p = slabProps(u, side);
    if (!p) return null;
    const { col, slabW, slabH, slabD, yFromBottom, slabZCenter } = p;
    const frontImg = u.front_image ?? null;
    const rearImg  = u.rear_image  ?? null;
    const pos: [number,number,number] = [0, yFromBottom, slabZCenter];
    const args: [number,number,number] = [slabW, slabH, slabD];
    const selected = selectedDeviceId != null && u.device_id === selectedDeviceId;
    const handleClick = () => onDeviceClick?.(u);

    if (frontImg && rearImg)
      return <SlabBothFaces key={`${side}-${u.u}`} position={pos} args={args} col={col} mountFace={side} frontUrl={frontImg} rearUrl={rearImg} selected={selected} onClick={handleClick} />;
    if (frontImg)
      return <SlabFrontOnly key={`${side}-${u.u}`} position={pos} args={args} col={col} mountFace={side} frontUrl={frontImg} selected={selected} onClick={handleClick} />;
    if (rearImg)
      return <SlabRearOnly  key={`${side}-${u.u}`} position={pos} args={args} col={col} mountFace={side} rearUrl={rearImg} selected={selected} onClick={handleClick} />;

    return (
      <mesh key={`${side}-${u.u}`} position={pos} onClick={e => { e.stopPropagation(); handleClick(); }}>
        <boxGeometry args={args} />
        <meshStandardMaterial color={col} roughness={0.4} metalness={0.3} emissive={selected ? '#ffffff' : '#000000'} emissiveIntensity={selected ? 0.15 : 0} />
      </mesh>
    );
  };

  return (
    <group>
      {frontUnits.map(u => renderSlab(u, 'front'))}
      {rearUnits.map(u  => renderSlab(u, 'rear'))}
    </group>
  );
}

// Automatically positions the camera so the full rack (+ labels) fits the canvas
function ZoomFit({ totalU, face }: { totalU: number; face: 'front' | 'back' | '3d' | 'side' }) {
  const { camera, size } = useThree();
  const h = totalU * U_H;

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const fovRad  = (camera.fov * Math.PI) / 180;
    const aspect  = size.width / size.height;

    // Scene bounding extents (rack + ruler labels on each side)
    const labelSpan = 0.055 + 0.075;          // labelOffsetX + ~2-digit text width
    const halfW = RACK_W / 2 + labelSpan;     // total half-width including labels
    const halfH = h / 2;

    // Distance required to fit height and width, add 12% padding
    const distH = (halfH * 1.12) / Math.tan(fovRad / 2);
    const distW = (halfW * 1.12) / (Math.tan(fovRad / 2) * aspect);
    const dist  = Math.max(distH, distW);

    const cy = h / 2;   // look at vertical center of rack
    if      (face === 'front') camera.position.set(0,              cy,  dist);
    else if (face === 'back')  camera.position.set(0,              cy, -dist);
    else if (face === 'side')  camera.position.set(dist,           cy,  0);
    else                       camera.position.set(dist * 0.75,    cy,  dist);  // isometric

    camera.lookAt(0, cy, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, h, face]);

  return null;
}

function RackScene3D({ units, totalU, face, onDeviceClick, selectedDeviceId }: {
  units: Unit[]; totalU: number; face: 'front' | 'back' | '3d' | 'side';
  onDeviceClick?: (u: Unit) => void;
  selectedDeviceId?: number | null;
}) {
  const h = totalU * U_H;

  return (
    <Canvas style={{ background: '#f8fafc' }}>
      {/* Camera starts far away; ZoomFit immediately repositions to fit the scene */}
      <PerspectiveCamera makeDefault fov={45} position={[0, h * 0.5, 99]} />
      <ZoomFit totalU={totalU} face={face} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 8, 4]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 4, -4]} intensity={0.4} />
      <Suspense fallback={null}>
        <group>
          <RackFrame totalU={totalU} />
          <DeviceSlabs units={units} totalU={totalU} onDeviceClick={onDeviceClick} selectedDeviceId={selectedDeviceId} />
        </group>
      </Suspense>
      {(face === '3d' || face === 'side') && <OrbitControls target={[0, h * 0.5, 0]} enablePan={false} />}
    </Canvas>
  );
}

// ── 2-D front / back elevation ────────────────────────────────────────────────

function Elevation2D({ units, totalU, face, onSlotClick, onDeviceClick, selectedU }: {
  units: Unit[]; totalU: number; face: 'front' | 'back';
  onSlotClick?: (u: number) => void;
  onDeviceClick?: (u: Unit) => void;
  selectedU?: number | null;
}) {
  const ROW_H = 22;
  // For front view show 'front' (or unset) devices; for back view show 'rear' devices
  const deviceFace = face === 'front' ? 'front' : 'rear';
  const merged = mergeByFace(units, deviceFace);

  return (
    <div className="flex flex-col w-full max-w-[340px] mx-auto select-none">
      {/* Face label bar */}
      <div className="flex items-center justify-between bg-[#1e293b] text-white text-xs px-3 py-1 rounded-t font-semibold">
        <span>{face === 'front' ? 'Front' : 'Back'}</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <div className="w-3 h-3 rounded-full bg-red-500" />
        </div>
      </div>

      {/* U rows */}
      <div className="border border-gray-400 rounded-b overflow-hidden">
        {merged.map(u => {
          const uLabel = String(totalU - u.u + 1).padStart(2, '0');
          const uh     = u.u_height ?? 1;
          const h      = uh * ROW_H;
          const occupied = !!u.device_id;
          const col    = unitColor(u);

          return (
            <div key={u.u}
              className="flex items-stretch border-b border-gray-200 last:border-b-0"
              style={{ height: h, minHeight: ROW_H }}
            >
              {/* Left U# */}
              <div className="w-9 flex items-center justify-center text-[10px] text-gray-400 bg-gray-100 border-r border-gray-300 flex-shrink-0 font-mono">
                {uLabel}
              </div>
              {/* Device */}
              <div
                className={clsx(
                  'flex-1 flex items-center px-2 gap-1.5 transition-colors',
                  occupied ? 'cursor-pointer hover:brightness-95' : 'group',
                  !occupied && onSlotClick && 'cursor-pointer hover:bg-blue-50',
                  occupied && selectedU === u.u && 'ring-2 ring-inset ring-blue-400'
                )}
                style={occupied
                  ? { backgroundColor: selectedU === u.u ? col + '44' : col + '22', borderLeft: `3px solid ${col}` }
                  : { backgroundColor: '#f9fafb' }}
                onClick={() => occupied ? onDeviceClick?.(u) : onSlotClick?.(u.u)}
              >
                {occupied ? (
                  <>
                    <span className="flex-shrink-0" style={{ color: col }}>
                      <DeviceIcon role={u.role ?? 'other'} size={12} />
                    </span>
                    {(deviceFace === 'front' ? u.front_image : u.rear_image) && (
                      <img
                        src={deviceFace === 'front' ? u.front_image! : u.rear_image!}
                        alt=""
                        className="h-4 w-8 object-contain flex-shrink-0 rounded-sm bg-white"
                      />
                    )}
                    <span className="text-[11px] font-medium text-gray-700 truncate">{u.device_name}</span>
                    {uh > 1 && <span className="text-[10px] text-gray-400 ml-auto">{uh}U</span>}
                  </>
                ) : (
                  <span className="text-[10px] text-gray-300 italic group-hover:text-blue-400 group-hover:not-italic">
                    {onSlotClick ? '+ add device' : '— empty —'}
                  </span>
                )}
              </div>
              {/* Right U# */}
              <div className="w-9 flex items-center justify-center text-[10px] text-gray-400 bg-gray-100 border-l border-gray-300 flex-shrink-0 font-mono">
                {uLabel}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Gauge bar ─────────────────────────────────────────────────────────────────

function GaugeBar({
  title, actual, committed, realtime, limit, threshold, manufacturerMax, unit = 'kW',
}: {
  title: string;
  actual: number; committed: number; realtime: number;
  limit: number; threshold: number; manufacturerMax: number;
  unit?: string;
}) {
  const max = manufacturerMax || limit || 1;
  const pctActual    = Math.min((actual / max) * 100, 100);
  const pctCommitted = Math.min((committed / max) * 100, 100);
  const pctLimit     = Math.min((limit / max) * 100, 100);
  const pctThreshold = Math.min((threshold / max) * 100, 100);

  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-gray-700 mb-2">{title}</div>
      {/* Bar */}
      <div className="relative h-8 bg-gray-200 rounded overflow-visible border border-gray-300">
        {/* Committed (green background) */}
        <div className="absolute left-0 top-0 h-full bg-green-400 rounded-l"
          style={{ width: `${pctCommitted}%` }} />
        {/* Actual (darker green) */}
        <div className="absolute left-0 top-0 h-full bg-green-600 rounded-l"
          style={{ width: `${pctActual}%` }} />
        {/* Threshold line */}
        {threshold > 0 && (
          <div className="absolute top-0 h-full w-0.5 bg-yellow-500"
            style={{ left: `${pctThreshold}%` }} />
        )}
        {/* Limit line */}
        {limit > 0 && (
          <div className="absolute top-0 h-full w-0.5 bg-red-500"
            style={{ left: `${pctLimit}%` }} />
        )}
        {/* Manufacturer max label */}
        <div className="absolute right-1 top-0 h-full flex items-center">
          <span className="text-[9px] text-gray-500 font-medium">
            Mfr: {manufacturerMax}{unit}
          </span>
        </div>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 mt-1 text-[9px] text-gray-500">
        <span><span className="inline-block w-2 h-2 bg-green-600 mr-0.5 rounded-sm" />Actual {actual.toFixed(2)}{unit}</span>
        <span><span className="inline-block w-2 h-2 bg-green-400 mr-0.5 rounded-sm" />Committed {committed.toFixed(2)}{unit}</span>
        <span><span className="inline-block w-2 h-2 bg-gray-300 mr-0.5 rounded-sm" />RT {realtime.toFixed(2)}{unit}</span>
        <span className="text-yellow-600">| Threshold {threshold}{unit}</span>
        <span className="text-red-600">| Limit {limit}{unit}</span>
      </div>
    </div>
  );
}

// ── Add Device to Rack Modal ──────────────────────────────────────────────────

function AddDeviceToRackModal({
  rackId,
  initialU,
  rackHeight,
  onClose,
}: {
  rackId: number;
  initialU: number | null;
  rackHeight: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { data: dtData } = useQuery({
    queryKey: ['device-types'],
    queryFn: () => deviceTypeApi.listAll(),
  });
  const deviceTypes: DeviceType[] = (dtData as DeviceType[]) || [];

  const [form, setForm] = useState({
    name: '',
    device_type: '',
    rack: rackId,
    position_u: initialU ?? 1,
    face: 'front' as 'front' | 'rear',
    status: 'active' as string,
    serial_number: '',
    hostname: '',
  });

  const selectedDt = deviceTypes.find(dt => String(dt.id) === String(form.device_type)) ?? null;

  const mutation = useMutation({
    mutationFn: () => deviceApi.create({ ...form, device_type: Number(form.device_type), rack: rackId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack-elevation', rackId] });
      qc.invalidateQueries({ queryKey: ['devices'] });
      onClose();
    },
  });

  const f = (k: string, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-sm font-bold text-gray-800">Add Device to Rack</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Device Type *</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.device_type}
              onChange={e => f('device_type', e.target.value)}
            >
              <option value="">— select device type —</option>
              {deviceTypes.map(dt => (
                <option key={dt.id} value={dt.id}>
                  {dt.manufacturer_name ? `${dt.manufacturer_name} ` : ''}{dt.model} ({dt.u_height}U)
                </option>
              ))}
            </select>
          </div>

          {/* Dimensions preview — updates live when device type changes */}
          {selectedDt && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Height', value: `${selectedDt.u_height}U`, sub: `${(selectedDt.u_height * 44.45).toFixed(0)} mm` },
                { label: 'Width',  value: `${selectedDt.width_mm} mm`, sub: `${(selectedDt.width_mm / 25.4).toFixed(1)}"` },
                { label: 'Depth',  value: `${selectedDt.depth_mm} mm`, sub: selectedDt.is_full_depth ? 'Full depth' : 'Half depth' },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                  <div className="text-[9px] text-blue-400 uppercase font-semibold mb-0.5">{label}</div>
                  <div className="text-[11px] font-bold text-[#1e293b]">{value}</div>
                  <div className="text-[9px] text-gray-400">{sub}</div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Name *</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. web-srv-01"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hostname</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.hostname}
                onChange={e => f('hostname', e.target.value)}
                placeholder="optional"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Position U</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.position_u}
                onChange={e => f('position_u', Number(e.target.value))}
                min={1}
                max={rackHeight}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Face</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.face}
                onChange={e => f('face', e.target.value)}
              >
                <option value="front">Front</option>
                <option value="rear">Rear</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Status</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
                value={form.status}
                onChange={e => f('status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="planned">Planned</option>
                <option value="staged">Staged</option>
                <option value="failed">Failed</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Serial Number</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-800 bg-white"
              value={form.serial_number}
              onChange={e => f('serial_number', e.target.value)}
              placeholder="optional"
            />
          </div>
          {mutation.isError && (
            <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              Failed to add device. Check that the U slot isn't occupied.
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 border border-gray-300 rounded py-1.5 text-sm hover:bg-gray-50">Cancel</button>
          <button
            className="flex-1 bg-[#1e293b] text-white rounded py-1.5 text-sm hover:bg-[#334155] disabled:opacity-50"
            disabled={!form.name || !form.device_type || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Adding…' : 'Add Device'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RackRowView({ rack, units, allRacks = [], onSelectRack, onBackToFloorPlan }: Props) {
  const [face,          setFace]          = useState<'front' | 'back' | '3d' | 'side'>('front');
  const [leftTab,       setLeftTab]       = useState<'navigator' | 'assets' | 'options'>('navigator');
  const [rightTab,      setRightTab]      = useState<'details' | 'overlays'>('details');
  const [gaugeTab,      setGaugeTab]      = useState<'heat' | 'weight'>('heat');
  const [addDeviceU,    setAddDeviceU]    = useState<number | null>(null);
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [selectedUnit,  setSelectedUnit]  = useState<Unit | null>(null);
  const [devFrontFile,  setDevFrontFile]  = useState<File | null>(null);
  const [devRearFile,   setDevRearFile]   = useState<File | null>(null);
  const [devFrontPrev,  setDevFrontPrev]  = useState<string | null>(null);
  const [devRearPrev,   setDevRearPrev]   = useState<string | null>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [editForm, setEditForm] = useState<Record<string, string>>({});

  // Fetch full device data when a unit is selected
  const { data: fullDevice } = useQuery({
    queryKey: ['device', selectedUnit?.device_id],
    queryFn: () => deviceApi.get(selectedUnit!.device_id!),
    enabled: !!selectedUnit?.device_id,
  });

  // Sync edit form when full device data loads
  useEffect(() => {
    if (fullDevice) {
      const d = fullDevice as Record<string, unknown>;
      setEditForm({
        name:               String(d.name ?? ''),
        status:             String(d.status ?? 'active'),
        face:               String(d.face ?? 'front'),
        position_u:         String(d.position_u ?? ''),
        serial_number:      String(d.serial_number ?? ''),
        asset_tag:          String(d.asset_tag ?? ''),
        hostname:           String(d.hostname ?? ''),
        ip_address:         String(d.ip_address ?? ''),
        management_ip:      String(d.management_ip ?? ''),
        os:                 String(d.os ?? ''),
        cpu_cores:          String(d.cpu_cores ?? ''),
        ram_gb:             String(d.ram_gb ?? ''),
        storage_tb:         String(d.storage_tb ?? ''),
        comments:           String(d.comments ?? ''),
      });
    }
  }, [fullDevice]);

  // Reset image state whenever selected device changes
  const selectUnit = (u: Unit | null) => {
    setSelectedUnit(u);
    setDevFrontFile(null); setDevRearFile(null);
    setDevFrontPrev(u?.front_image ?? null);
    setDevRearPrev(u?.rear_image ?? null);
    setEditForm({});
  };

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, string> }) =>
      deviceApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack-elevation', rack.id] });
      qc.invalidateQueries({ queryKey: ['device', selectedUnit?.device_id] });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: ({ deviceId, frontFile, rearFile }: { deviceId: number; frontFile: File | null; rearFile: File | null }) => {
      const fd = new FormData();
      if (frontFile) fd.append('front_image', frontFile);
      if (rearFile)  fd.append('rear_image',  rearFile);
      return deviceApi.updateForm(deviceId, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack-elevation', rack.id] });
      setDevFrontFile(null);
      setDevRearFile(null);
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => deviceApi.delete(deviceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rack-elevation', rack.id] });
      selectUnit(null);
    },
  });

  const openAddDevice = (u: number | null = null) => {
    setAddDeviceU(u);
    setShowAddModal(true);
  };

  // Compute used U / actual power from units
  // Sum u_height of each device (only count the starting row, not continuation rows)
  const usedU   = units.filter(u => u.device_id && u.start_u === u.u).reduce((sum, u) => sum + (u.u_height ?? 1), 0);
  const utilPct = Math.round((usedU / rack.u_height) * 100);

  // Simulated metrics (backend doesn't have real-time yet)
  const heatActual       = rack.max_power_kw * 0.083; // ~8.3% typical
  const heatCommitted    = rack.max_power_kw * 0.083;
  const heatRealtime     = 0;
  const heatLimit        = rack.max_power_kw;
  const heatThreshold    = rack.max_power_kw * 0.875;
  const heatMfrMax       = rack.max_power_kw * 1.375;

  const weightActual     = rack.max_weight_kg * 0.2;
  const weightCommitted  = rack.max_weight_kg * 0.2;
  const weightRealtime   = 0;
  const weightLimit      = rack.max_weight_kg;
  const weightThreshold  = rack.max_weight_kg * 0.875;
  const weightMfrMax     = rack.max_weight_kg;

  // Column letters helper
  const colToLetter = (n: number) => n < 26 ? String.fromCharCode(65 + n) : '?';
  const gridPos = rack.position_x !== undefined && rack.position_y !== undefined
    ? `[${colToLetter(Math.round(rack.position_x))},${Math.round(rack.position_y) + 1}]`
    : '—';

  return (
    <div className="flex flex-col h-full bg-white">
      {showAddModal && (
        <AddDeviceToRackModal
          rackId={rack.id}
          initialU={addDeviceU}
          rackHeight={rack.u_height}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {/* ── Top toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#f0f2f5] border-b border-gray-300 flex-shrink-0">
        {/* Face toggle */}
        <div className="flex items-center border border-gray-300 rounded overflow-hidden bg-white">
          {(['front', '3d', 'side', 'back'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFace(f)}
              className={clsx(
                'px-3 py-1 text-xs capitalize transition-colors border-r border-gray-300 last:border-r-0',
                face === f ? 'bg-[#1e293b] text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {f === '3d' ? '3D' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <span className="text-sm font-semibold text-gray-700 ml-2">{rack.name}</span>
        <span className="text-xs text-gray-500">{rack.u_height}U</span>
        {rack.room_name && (
          <span className="text-xs text-gray-400">— {rack.room_name}</span>
        )}

        {onBackToFloorPlan && (
          <button
            onClick={onBackToFloorPlan}
            className="ml-auto text-xs px-3 py-1 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-600"
          >
            ← Floor Plan
          </button>
        )}
      </div>

      {/* ── Main 3-panel body ── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left panel: Navigator / Assets / Options ── */}
        <div className="w-56 flex-shrink-0 border-r border-gray-300 flex flex-col bg-[#f8fafc]">
          {/* Tab bar */}
          <div className="flex border-b border-gray-300">
            {(['navigator', 'assets', 'options'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={clsx(
                  'flex-1 py-2 text-[10px] capitalize font-medium transition-colors',
                  leftTab === tab
                    ? 'bg-white text-[#1e293b] border-b-2 border-[#1e293b]'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {leftTab === 'navigator' && (
              <>
                <div className="flex gap-1 mb-2">
                  <input
                    className="flex-1 text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                    placeholder="Search"
                  />
                </div>
                {allRacks.map(r => (
                  <button
                    key={r.id}
                    onClick={() => onSelectRack?.(r.id)}
                    className={clsx(
                      'w-full text-left px-2 py-1.5 rounded text-xs flex items-center gap-1.5 mb-0.5 transition-colors',
                      r.id === rack.id
                        ? 'bg-[#1e293b] text-white'
                        : 'hover:bg-gray-200 text-gray-700'
                    )}
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="currentColor">
                      <rect x="2" y="1" width="12" height="14" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                      <line x1="4" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1"/>
                      <line x1="4" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1"/>
                      <line x1="4" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1"/>
                    </svg>
                    {r.name}
                  </button>
                ))}
              </>
            )}
            {leftTab === 'assets' && (
              <div className="text-xs text-gray-500 italic mt-4 text-center">No unplaced assets</div>
            )}
            {leftTab === 'options' && (
              <div className="space-y-2 mt-2">
                <div className="text-[10px] text-gray-500 uppercase font-semibold">Display</div>
                {['Show U numbers', 'Show device labels', 'Highlight empty slots'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Bottom action buttons */}
          <div className="p-2 border-t border-gray-300 space-y-1">
            <button
              onClick={() => openAddDevice(null)}
              className="w-full text-xs py-1.5 px-2 border border-[#1e293b] rounded bg-[#1e293b] hover:bg-[#334155] text-white flex items-center gap-1.5">
              <span>＋</span> Add Device
            </button>
            <button
              onClick={onBackToFloorPlan}
              className="w-full text-xs py-1.5 px-2 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-700">
              Back to Floor Plan
            </button>
          </div>
        </div>

        {/* ── Center: Rack visualization ── */}
        <div className="flex-1 flex items-center justify-center bg-[#f0f4f8] overflow-hidden">
          {(face === 'front' || face === 'back') ? (
            <div className="h-full overflow-y-auto py-4 px-4">
              <Elevation2D
                units={units} totalU={rack.u_height} face={face}
                onSlotClick={u => openAddDevice(u)}
                onDeviceClick={u => { selectUnit(u); setRightTab('details'); }}
                selectedU={selectedUnit?.u ?? null}
              />
            </div>
          ) : (
            <div className="w-full h-full" style={{ minHeight: 400 }}>
              <RackScene3D
                units={units}
                totalU={rack.u_height}
                face={face as 'front' | 'back' | '3d' | 'side'}
                onDeviceClick={u => { selectUnit(u); setRightTab('details'); }}
                selectedDeviceId={selectedUnit?.device_id ?? null}
              />
            </div>
          )}
        </div>

        {/* ── Right panel: Details / Overlays + Gauges ── */}
        <div className="w-72 flex-shrink-0 border-l border-gray-300 flex flex-col bg-white overflow-y-auto">
          {/* Tab bar */}
          <div className="flex border-b border-gray-300 flex-shrink-0">
            {(['details', 'overlays'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className={clsx(
                  'flex-1 py-2 text-[10px] capitalize font-medium transition-colors',
                  rightTab === tab
                    ? 'bg-white text-[#1e293b] border-b-2 border-[#1e293b]'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {rightTab === 'details' && (
            <div className="p-3 space-y-4 text-xs">
              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['Create Template', () => navigate('/assets')],
                  ['View Cabinet',    () => navigate('/racks')],
                  ['Cabinet Planner', () => navigate('/racks')],
                  ['Floor Plan',      onBackToFloorPlan],
                  ['View Connections',() => navigate('/cables')],
                ] as [string, () => void][]).map(([btn, action]) => (
                  <button key={btn} onClick={action}
                    className="py-1.5 px-2 border border-gray-300 rounded bg-white hover:bg-gray-100 text-gray-700 text-[10px] text-center">
                    {btn}
                  </button>
                ))}
              </div>

              {/* ── Device details (when a unit is selected) ── */}
              {selectedUnit ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1e293b]">Device</span>
                    <button onClick={() => selectUnit(null)} className="text-gray-400 hover:text-gray-600 text-[10px]">✕ clear</button>
                  </div>

                  {/* Device type badge */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="text-[10px] text-blue-500 font-medium">{selectedUnit.device_type}</div>
                    <div className="text-[10px] text-gray-500 capitalize">{selectedUnit.role} · {selectedUnit.is_full_depth ? 'Full depth' : 'Half depth'}</div>
                  </div>

                  {/* Dimensions (read-only) */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'H', value: `${selectedUnit.u_height ?? 1}U` },
                      { label: 'W', value: `${selectedUnit.width_mm ?? 482}mm` },
                      { label: 'D', value: `${selectedUnit.depth_mm ?? 700}mm` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 border border-gray-200 rounded p-1.5 text-center">
                        <div className="text-[9px] text-gray-400 uppercase">{label}</div>
                        <div className="text-[10px] font-bold text-[#1e293b]">{value}</div>
                      </div>
                    ))}
                  </div>
                  <hr className="border-gray-200" />

                  {/* ── Editable fields ── */}
                  {!fullDevice ? (
                    <div className="text-[10px] text-gray-400 text-center py-2">Loading…</div>
                  ) : (() => {
                    const ef = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));
                    const inp = 'w-full border border-gray-300 rounded px-2 py-1 text-[11px] text-gray-800 bg-white focus:outline-none focus:border-blue-400';
                    const sel = inp;
                    return (
                      <div className="space-y-2">
                        <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Identity</div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">Name *</label>
                          <input className={inp} value={editForm.name ?? ''} onChange={e => ef('name', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">Status</label>
                            <select className={sel} value={editForm.status ?? 'active'} onChange={e => ef('status', e.target.value)}>
                              {['active','planned','staged','failed','offline','decommissioning'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">Face</label>
                            <select className={sel} value={editForm.face ?? 'front'} onChange={e => ef('face', e.target.value)}>
                              <option value="front">Front</option>
                              <option value="rear">Rear</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">Position U</label>
                            <input type="number" min={1} max={rack.u_height} className={inp} value={editForm.position_u ?? ''} onChange={e => ef('position_u', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">Asset Tag</label>
                            <input className={inp} value={editForm.asset_tag ?? ''} onChange={e => ef('asset_tag', e.target.value)} placeholder="optional" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">Serial Number</label>
                          <input className={inp} value={editForm.serial_number ?? ''} onChange={e => ef('serial_number', e.target.value)} placeholder="optional" />
                        </div>

                        <hr className="border-gray-100" />
                        <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Network</div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">Hostname</label>
                          <input className={inp} value={editForm.hostname ?? ''} onChange={e => ef('hostname', e.target.value)} placeholder="optional" />
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">IP Address</label>
                            <input className={inp} value={editForm.ip_address ?? ''} onChange={e => ef('ip_address', e.target.value)} placeholder="0.0.0.0" />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">Mgmt IP</label>
                            <input className={inp} value={editForm.management_ip ?? ''} onChange={e => ef('management_ip', e.target.value)} placeholder="0.0.0.0" />
                          </div>
                        </div>

                        <hr className="border-gray-100" />
                        <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Hardware</div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">OS</label>
                          <input className={inp} value={editForm.os ?? ''} onChange={e => ef('os', e.target.value)} placeholder="e.g. Ubuntu 22.04" />
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">CPU Cores</label>
                            <input type="number" min={0} className={inp} value={editForm.cpu_cores ?? ''} onChange={e => ef('cpu_cores', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">RAM (GB)</label>
                            <input type="number" min={0} className={inp} value={editForm.ram_gb ?? ''} onChange={e => ef('ram_gb', e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-[9px] text-gray-500 mb-0.5">Storage (TB)</label>
                            <input type="number" min={0} step={0.1} className={inp} value={editForm.storage_tb ?? ''} onChange={e => ef('storage_tb', e.target.value)} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] text-gray-500 mb-0.5">Comments</label>
                          <textarea rows={2} className={`${inp} resize-none`} value={editForm.comments ?? ''} onChange={e => ef('comments', e.target.value)} />
                        </div>

                        {updateDeviceMutation.isError && (
                          <div className="text-[10px] text-red-600 bg-red-50 rounded px-2 py-1">Failed to save.</div>
                        )}
                        <button
                          className="w-full py-1.5 text-xs bg-[#1e293b] text-white rounded hover:bg-[#334155] disabled:opacity-50"
                          disabled={!editForm.name || updateDeviceMutation.isPending}
                          onClick={() => {
                            if (selectedUnit?.device_id) {
                              const payload: Record<string, string | number | null> = { ...editForm };
                              ['position_u','cpu_cores','ram_gb','storage_tb'].forEach(k => {
                                payload[k] = editForm[k] ? Number(editForm[k]) : null;
                              });
                              ['ip_address','management_ip','asset_tag'].forEach(k => {
                                if (!editForm[k]) payload[k] = null;
                              });
                              updateDeviceMutation.mutate({ id: selectedUnit.device_id, data: payload as Record<string, string> });
                            }
                          }}
                        >
                          {updateDeviceMutation.isPending ? 'Saving…' : 'Save Changes'}
                        </button>
                      </div>
                    );
                  })()}
                  <hr className="border-gray-200" />

                  {/* ── Per-device front / rear photos ── */}
                  <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Device Photos</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['front', 'rear'] as const).map(side => {
                      const preview = side === 'front' ? devFrontPrev : devRearPrev;
                      const setFile = side === 'front' ? setDevFrontFile : setDevRearFile;
                      const setPrev = side === 'front' ? setDevFrontPrev : setDevRearPrev;
                      return (
                        <div key={side}>
                          <div className="text-[9px] text-gray-500 mb-1 capitalize">{side}</div>
                          <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
                            style={{ height: 64 }}>
                            {preview ? (
                              <img src={preview} alt={side} className="max-h-full max-w-full object-contain p-1 rounded" />
                            ) : (
                              <span className="text-[9px] text-gray-400">Upload</span>
                            )}
                            <input type="file" accept="image/*" className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0] ?? null;
                                setFile(file);
                                if (file) setPrev(URL.createObjectURL(file));
                              }} />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {(devFrontFile || devRearFile) && (
                    <button
                      className="w-full py-1.5 text-xs bg-[#1e293b] text-white rounded hover:bg-[#334155] disabled:opacity-50"
                      disabled={uploadImageMutation.isPending}
                      onClick={() => {
                        if (selectedUnit?.device_id)
                          uploadImageMutation.mutate({ deviceId: selectedUnit.device_id, frontFile: devFrontFile, rearFile: devRearFile });
                      }}
                    >
                      {uploadImageMutation.isPending ? 'Saving…' : 'Save Photos'}
                    </button>
                  )}
                  {uploadImageMutation.isError && (
                    <div className="text-[10px] text-red-600 bg-red-50 rounded px-2 py-1">Failed to save photos.</div>
                  )}
                  <hr className="border-gray-200" />

                  <button
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-500 border border-red-300 rounded hover:bg-red-50 disabled:opacity-50 transition-colors"
                    disabled={deleteDeviceMutation.isPending}
                    onClick={() => {
                      if (selectedUnit.device_id && confirm(`Remove "${selectedUnit.device_name}" from rack?`)) {
                        deleteDeviceMutation.mutate(selectedUnit.device_id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                    {deleteDeviceMutation.isPending ? 'Removing…' : 'Remove from Rack'}
                  </button>
                  <hr className="border-gray-200" />
                  <div className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Rack</div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Category</span>
                    <span className="ml-auto text-gray-700">Cabinet</span>
                  </div>
                  <hr className="border-gray-200" />
                </>
              )}

              {/* Rack details table */}
              <table className="w-full text-[11px]">
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Name', rack.name],
                    ['Number', rack.asset_tag ?? rack.id],
                    ['Record Status', 'Active'],
                    ['Operational Status', rack.status === 'active' ? 'Operational' : rack.status],
                    ['Location', rack.room_name ?? '—'],
                    ['Position on Grid', gridPos],
                    ['U Height', `${rack.u_height}U`],
                    ['Utilization', `${utilPct}% (${usedU}/${rack.u_height}U)`],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td className="py-1.5 pr-2 text-gray-500 font-medium w-1/2">{k}</td>
                      <td className="py-1.5 text-gray-800">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Heat / Weight Gauge tabs */}
              <div className="mt-2">
                <div className="flex border-b border-gray-200">
                  {(['heat', 'weight'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setGaugeTab(tab)}
                      className={clsx(
                        'pb-1 px-1 text-[10px] mr-3 transition-colors',
                        gaugeTab === tab
                          ? 'font-semibold text-[#1e293b] border-b-2 border-[#1e293b]'
                          : 'text-gray-400 hover:text-gray-600'
                      )}
                    >
                      {tab === 'heat' ? 'Heat Gauge' : 'Weight Gauge'}
                    </button>
                  ))}
                </div>
                {gaugeTab === 'heat' ? (
                  <GaugeBar
                    title=""
                    actual={heatActual}
                    committed={heatCommitted}
                    realtime={heatRealtime}
                    limit={heatLimit}
                    threshold={heatThreshold}
                    manufacturerMax={heatMfrMax}
                    unit=" kW"
                  />
                ) : (
                  <GaugeBar
                    title=""
                    actual={weightActual}
                    committed={weightCommitted}
                    realtime={weightRealtime}
                    limit={weightLimit}
                    threshold={weightThreshold}
                    manufacturerMax={weightMfrMax}
                    unit=" kg"
                  />
                )}
              </div>
            </div>
          )}

          {rightTab === 'overlays' && (
            <div className="p-3 space-y-3 text-xs">
              {['Power Draw', 'Temperature', 'Connectivity', 'Airflow'].map(o => (
                <label key={o} className="flex items-center gap-2 text-gray-700 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  {o}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom status bar ── */}
      <div className="flex items-center px-4 py-1.5 bg-[#f0f2f5] border-t border-gray-300 text-[10px] text-gray-500 flex-shrink-0 gap-4">
        <button
          onClick={onBackToFloorPlan}
          className="text-[10px] text-blue-600 hover:underline"
        >
          View Asset Summary
        </button>
        <span className="ml-auto">Rack: {rack.name} | {rack.u_height}U | {utilPct}% used</span>
      </div>
    </div>
  );
}

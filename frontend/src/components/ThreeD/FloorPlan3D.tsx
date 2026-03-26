import { useRef, useState, Suspense } from 'react';
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Plane, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import type { FloorPlanRoom, FloorPlanRack, FloorPlanDevice } from '../../types';

interface Props {
  rooms: FloorPlanRoom[];
  onRackClick?: (rackId: number) => void;
}

// ── Color helpers ─────────────────────────────────────────────────────────────

function getUtilizationColor(pct: number): string {
  if (pct >= 90) return '#ef4444';
  if (pct >= 70) return '#f59e0b';
  if (pct >= 50) return '#10b981';
  return '#3b82f6';
}

const ROLE_COLORS: Record<string, string> = {
  server:      '#1d4ed8',
  switch:      '#059669',
  router:      '#7c3aed',
  firewall:    '#dc2626',
  pdu:         '#d97706',
  ups:         '#0891b2',
  storage:     '#4338ca',
  patch_panel: '#475569',
  kvm:         '#6d28d9',
  other:       '#374151',
};

function deviceColor(d: FloorPlanDevice): string {
  return d.color && d.color !== '#6b7280' ? d.color : (ROLE_COLORS[d.role] ?? '#374151');
}

// ── Device slabs inside a rack ────────────────────────────────────────────────

function DeviceSlabs({
  devices, rackH, rackW, rackD, totalU,
}: {
  devices: FloorPlanDevice[];
  rackH: number; rackW: number; rackD: number; totalU: number;
}) {
  const uH = rackH / totalU;          // height of 1 U in world units
  const gap = 0.002;                  // tiny gap between devices

  return (
    <>
      {devices.map((d) => {
        const slabH = d.u_height * uH - gap;
        // position_u is 1-indexed from bottom; convert to world Y inside rack
        const yBot = ((d.position_u - 1) / totalU) * rackH;
        const yCen = yBot + slabH / 2 + gap / 2;
        const col = deviceColor(d);

        return (
          <group key={d.id} position={[0, yCen, 0]}>
            {/* Main device body */}
            <mesh>
              <boxGeometry args={[rackW * 0.92, slabH, rackD * 0.88]} />
              <meshStandardMaterial
                color={col}
                roughness={0.35}
                metalness={0.55}
                emissive={col}
                emissiveIntensity={0.08}
              />
            </mesh>
            {/* Front face accent strip */}
            <mesh position={[0, 0, rackD * 0.44]}>
              <boxGeometry args={[rackW * 0.88, slabH * 0.6, 0.005]} />
              <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.4} />
            </mesh>
            {/* Status LED dot */}
            <mesh position={[rackW * 0.38, 0, rackD * 0.45]}>
              <sphereGeometry args={[0.008, 6, 6]} />
              <meshStandardMaterial
                color={d.status === 'active' ? '#22c55e' : d.status === 'offline' ? '#6b7280' : '#f59e0b'}
                emissive={d.status === 'active' ? '#22c55e' : '#6b7280'}
                emissiveIntensity={1.5}
              />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

// ── Single Rack ───────────────────────────────────────────────────────────────

function Rack3D({
  rack, x, z, onClick,
}: {
  rack: FloorPlanRack;
  x: number; z: number;
  onClick?: (id: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const rackH = (rack.u_height / 42) * 2.2;
  const rackW = rack.width;
  const rackD = rack.depth;

  const hasDevices = rack.devices && rack.devices.length > 0;
  const frameColor = hovered ? '#94a3b8' : '#334155';
  const utilColor  = getUtilizationColor(rack.utilization_percent);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.scale.y = THREE.MathUtils.lerp(
        groupRef.current.scale.y, hovered ? 1.04 : 1, 0.12,
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(rack.id); }}
      onPointerEnter={(e) => { e.stopPropagation(); setHovered(true);  document.body.style.cursor = 'pointer'; }}
      onPointerLeave={() => {                       setHovered(false); document.body.style.cursor = 'default'; }}
    >
      {/* ── Rack frame (outer shell — semi-transparent so devices show) ── */}
      <mesh position={[0, rackH / 2, 0]} castShadow>
        <boxGeometry args={[rackW, rackH, rackD]} />
        <meshStandardMaterial
          color="#0f172a"
          transparent
          opacity={hasDevices ? 0.18 : 0.75}
          roughness={0.4}
          metalness={0.7}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* ── Devices inside the rack ── */}
      {hasDevices && (
        <group position={[0, 0, 0]}>
          <DeviceSlabs
            devices={rack.devices!}
            rackH={rackH}
            rackW={rackW}
            rackD={rackD}
            totalU={rack.u_height}
          />
        </group>
      )}

      {/* ── Wireframe border ── */}
      <mesh position={[0, rackH / 2, 0]}>
        <boxGeometry args={[rackW + 0.005, rackH + 0.005, rackD + 0.005]} />
        <meshBasicMaterial color={frameColor} wireframe transparent opacity={hovered ? 0.7 : 0.35} />
      </mesh>

      {/* ── Rack rails (left & right vertical bars) ── */}
      {[-rackW * 0.44, rackW * 0.44].map((rx, i) => (
        <mesh key={i} position={[rx, rackH / 2, 0]}>
          <boxGeometry args={[0.02, rackH, rackD * 0.06]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {/* ── LED utilisation strip at top ── */}
      <mesh position={[0, rackH + 0.012, 0]}>
        <boxGeometry args={[rackW * 0.8, 0.022, rackD * 0.1]} />
        <meshStandardMaterial color={utilColor} emissive={utilColor} emissiveIntensity={1.4} />
      </mesh>

      {/* ── Rack name ── */}
      <Text
        position={[0, rackH + 0.18, 0]}
        fontSize={0.09}
        color="#e2e8f0"
        anchorX="center"
        anchorY="bottom"
        outlineColor="#000000"
        outlineWidth={0.012}
      >
        {rack.name}
      </Text>

      {/* ── Utilisation % ── */}
      <Text
        position={[0, rackH + 0.06, 0]}
        fontSize={0.075}
        color={utilColor}
        anchorX="center"
        anchorY="bottom"
      >
        {rack.utilization_percent}%
      </Text>
    </group>
  );
}

// ── Room ─────────────────────────────────────────────────────────────────────

const ROOM_TYPE_COLORS: Record<string, string> = {
  idf: '#0891b2',   mdf: '#7c3aed',
  network: '#059669', server: '#1d4ed8',
  storage: '#d97706', colocation: '#db2777',
  mixed: '#374151',
};

function Room3D({ room, onRackClick }: { room: FloorPlanRoom; onRackClick?: (id: number) => void }) {
  const accent = ROOM_TYPE_COLORS[room.room_type ?? 'server'] ?? '#1d4ed8';

  return (
    <group>
      {/* Floor */}
      <Plane
        args={[room.width, room.height]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[room.width / 2, -0.01, room.height / 2]}
        receiveShadow
      >
        <meshStandardMaterial color="#0c1420" roughness={0.9} />
      </Plane>

      {/* Raised-floor tile grid */}
      <Grid
        position={[room.width / 2, 0, room.height / 2]}
        args={[room.width, room.height]}
        cellSize={0.6}
        cellThickness={0.4}
        cellColor="#1e3a5f"
        sectionSize={3}
        sectionThickness={1}
        sectionColor={accent}
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Perimeter walls */}
      {[
        { pos: [room.width / 2, 1.2, 0]           as [number,number,number], size: [room.width, 2.4, 0.07] as [number,number,number] },
        { pos: [room.width / 2, 1.2, room.height] as [number,number,number], size: [room.width, 2.4, 0.07] as [number,number,number] },
        { pos: [0,           1.2, room.height / 2] as [number,number,number], size: [0.07, 2.4, room.height] as [number,number,number] },
        { pos: [room.width,  1.2, room.height / 2] as [number,number,number], size: [0.07, 2.4, room.height] as [number,number,number] },
      ].map((w, i) => (
        <mesh key={i} position={w.pos}>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.3} />
        </mesh>
      ))}

      {/* Room label */}
      <Text
        position={[room.width / 2, 0.05, -0.9]}
        fontSize={0.38}
        color={accent}
        anchorX="center"
        anchorY="bottom"
        outlineColor="#020617"
        outlineWidth={0.025}
      >
        {room.name}{room.room_type === 'idf' ? ' [IDF]' : room.room_type === 'mdf' ? ' [MDF]' : ''}
      </Text>

      {/* Racks */}
      {room.rows.map((row) =>
        row.racks.map((rack) => (
          <Rack3D
            key={rack.id}
            rack={rack}
            x={rack.position_x + rack.width / 2}
            z={rack.position_y + rack.depth / 2}
            onClick={onRackClick}
          />
        ))
      )}

      {/* CRAC/cooling units (only for non-IDF rooms) */}
      {room.room_type !== 'idf' && room.room_type !== 'mdf' && [1, 2, 3].map((i) => (
        <group key={i} position={[i * room.width / 4, 0, room.height - 0.3]}>
          <mesh position={[0, 0.9, 0]}>
            <boxGeometry args={[1.1, 1.8, 0.4]} />
            <meshStandardMaterial color="#0369a1" transparent opacity={0.8} roughness={0.2}
              emissive="#0ea5e9" emissiveIntensity={0.12} />
          </mesh>
          <mesh position={[0, 0.9, -0.22]}>
            <boxGeometry args={[0.9, 1.4, 0.02]} />
            <meshBasicMaterial color="#0c4a6e" wireframe />
          </mesh>
          <Text position={[0, 1.95, 0]} fontSize={0.1} color="#7dd3fc" anchorX="center">
            CRAC-{i.toString().padStart(2, '0')}
          </Text>
        </group>
      ))}
    </group>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FloorPlan3D({ rooms, onRackClick }: Props) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 420 }}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#020617', width: '100%', height: '100%' }}
      >
        <PerspectiveCamera makeDefault position={[15, 14, 24]} fov={48} />

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[12, 22, 12]} intensity={1.3} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-far={70} shadow-camera-left={-35}
          shadow-camera-right={35} shadow-camera-top={35} shadow-camera-bottom={-35}
        />
        <pointLight position={[5,  8, 5]}  intensity={0.5} color="#3b82f6" />
        <pointLight position={[25, 8, 15]} intensity={0.4} color="#8b5cf6" />
        <pointLight position={[15, 8, 25]} intensity={0.3} color="#06b6d4" />

        <Suspense fallback={null}>
          {rooms.map((room) => (
            <Room3D key={room.id} room={room} onRackClick={onRackClick} />
          ))}
        </Suspense>

        <OrbitControls
          enablePan enableZoom enableRotate
          minDistance={3} maxDistance={70}
          maxPolarAngle={Math.PI / 2 - 0.04}
        />
        <fog attach="fog" args={['#020617', 45, 100]} />
      </Canvas>

      {/* Controls overlay */}
      <div style={{
        position:'absolute', top:12, left:12,
        background:'rgba(15,23,42,0.88)', border:'1px solid #334155',
        borderRadius:8, padding:'10px 14px', fontSize:11, color:'#94a3b8',
        backdropFilter:'blur(4px)', lineHeight:1.7,
      }}>
        <div style={{ fontWeight:700, color:'#cbd5e1', marginBottom:3 }}>3D Controls</div>
        <div>Left drag — Rotate</div>
        <div>Right drag — Pan</div>
        <div>Scroll — Zoom</div>
        <div>Click rack — Details</div>
      </div>

      {/* Legend */}
      <div style={{
        position:'absolute', bottom:12, left:12,
        background:'rgba(15,23,42,0.92)', border:'1px solid #334155',
        borderRadius:8, padding:'10px 14px', fontSize:11,
        backdropFilter:'blur(4px)',
      }}>
        <div style={{ color:'#94a3b8', fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          Device Roles
        </div>
        {[
          { color:'#1d4ed8', label:'Server' },
          { color:'#059669', label:'Switch' },
          { color:'#7c3aed', label:'Router' },
          { color:'#dc2626', label:'Firewall' },
          { color:'#d97706', label:'PDU / UPS' },
          { color:'#4338ca', label:'Storage' },
        ].map((l) => (
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
            <div style={{ width:10, height:10, borderRadius:2, backgroundColor:l.color }} />
            <span style={{ color:'#94a3b8' }}>{l.label}</span>
          </div>
        ))}
        <div style={{ borderTop:'1px solid #334155', marginTop:6, paddingTop:6, color:'#64748b', fontSize:10 }}>
          LED strip = rack utilization
        </div>
      </div>
    </div>
  );
}

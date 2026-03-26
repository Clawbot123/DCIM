import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle, Arrow } from 'react-konva';
import type { DoorDef, FloorPlanRoom } from '../../types';
import Konva from 'konva';

// ── Unit system ───────────────────────────────────────────────────────────────
export const F        = 15;          // pixels per foot
export const FT_PER_M = 3.28084;     // 1 metre = 3.28084 feet
const HDR             = 26;          // header band px
const PAD_FT          = 5;           // padding feet around room
const RACK_W_FT       = 3;           // default rack footprint width (ft)
const RACK_D_FT       = 2;           // default rack footprint depth (ft)
const CABLE_DROP_FT   = 2;           // vertical drop each end
const CABLE_SLACK     = 1.15;        // 15% slack

export interface DrawnCable {
  id: string;
  sourceId: number;
  targetId: number;
  lengthFt: number;
}

export function calcCableLengthFt(ax: number, ay: number, bx: number, by: number): number {
  const dx_ft = Math.abs(ax - bx) * FT_PER_M;
  const dy_ft = Math.abs(ay - by) * FT_PER_M;
  return (dx_ft + dy_ft + CABLE_DROP_FT * 2) * CABLE_SLACK;
}

function snap(ft: number, grid = 0.5): number {
  return Math.round(ft / grid) * grid;
}

function colLabel(col: number): string {
  if (col < 26) return String.fromCharCode(65 + col);
  return String.fromCharCode(64 + Math.floor(col / 26)) + String.fromCharCode(65 + (col % 26));
}

function utilColor(pct: number) {
  if (pct >= 90) return '#ef4444';
  if (pct >= 70) return '#f59e0b';
  if (pct >= 50) return '#10b981';
  return '#3b82f6';
}

const ROLE_ICONS: Record<string, string> = {
  server: '▤', switch: '⊞', router: '⊙', firewall: '⛊',
  pdu: '⚡', ups: '🔋', storage: '⊟', patch_panel: '▦', other: '□',
};

interface Props {
  room: FloorPlanRoom;
  selectedRackId?: number | null;
  onRackSelect?: (rackId: number | null) => void;
  onGridCellHover?: (cell: string | null) => void;
  editMode?: boolean;
  activeTool?: 'select' | 'place_rack' | 'door';
  onRackMove?: (rackId: number, x: number, y: number) => void;
  onRackPlace?: (x: number, y: number) => void;
  onAddDoor?: (door: DoorDef) => void;
  // Cable draw
  cableMode?: boolean;
  cableSource?: number | null;
  drawnCables?: DrawnCable[];
  onRackCableClick?: (rackId: number) => void;
}

export function FloorPlan2D({
  room, selectedRackId, onRackSelect, onGridCellHover,
  editMode = false, activeTool = 'select', onRackMove, onRackPlace, onAddDoor,
  cableMode = false, cableSource = null, drawnCables = [], onRackCableClick,
}: Props) {
  const stageRef     = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize,  setStageSize]  = useState({ width: 900, height: 700 });
  const [zoom,       setZoom]       = useState(1);
  const [pos,        setPos]        = useState({ x: 20, y: 20 });
  const [ghostPos,   setGhostPos]   = useState<{ fx: number; fy: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) =>
      setStageSize({ width: e.contentRect.width, height: e.contentRect.height })
    );
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const BY = 1.12;
    const stage = stageRef.current!;
    const old   = stage.scaleX();
    const ptr   = stage.getPointerPosition()!;
    const orig  = { x: (ptr.x - stage.x()) / old, y: (ptr.y - stage.y()) / old };
    const next  = Math.min(Math.max(e.evt.deltaY < 0 ? old * BY : old / BY, 0.2), 5);
    setZoom(next);
    setPos({ x: ptr.x - orig.x * next, y: ptr.y - orig.y * next });
  }, []);

  // Room in feet
  const rw_ft = room.width  * FT_PER_M;
  const rh_ft = room.height * FT_PER_M;
  const totalW = (rw_ft + PAD_FT * 2) * F;
  const totalH = (rh_ft + PAD_FT * 2) * F;
  const roomX  = PAD_FT * F;
  const roomY  = PAD_FT * F;
  const colCount = Math.ceil(rw_ft + PAD_FT * 2);
  const rowCount = Math.ceil(rh_ft + PAD_FT * 2);

  const allRacks = room.rows.flatMap(r => r.racks);

  // Rack centre in canvas pixels (given rack object with metres positions)
  const rackCentre = useCallback((rack: typeof allRacks[0]) => ({
    cx: roomX + rack.position_x * FT_PER_M * F + (rack.width  * FT_PER_M * F) / 2,
    cy: roomY + rack.position_y * FT_PER_M * F + (rack.depth  * FT_PER_M * F) / 2,
  }), [roomX, roomY]);

  const ptrToRoomFeet = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const ptr = stage.getPointerPosition();
    if (!ptr) return null;
    const cx = (ptr.x - stage.x()) / stage.scaleX();
    const cy = (ptr.y - stage.y()) / stage.scaleY();
    return { fx: (cx - roomX) / F, fy: (cy - roomY) / F };
  }, [roomX]);

  const handleStageMouseMove = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const ptr = stage.getPointerPosition();
    if (!ptr) return;
    const cx = (ptr.x - stage.x()) / stage.scaleX();
    const cy = (ptr.y - stage.y()) / stage.scaleY();
    const fx = (cx - roomX) / F;
    const fy = (cy - roomY) / F;
    if (fx >= 0 && fx < rw_ft && fy >= 0 && fy < rh_ft) {
      onGridCellHover?.(`[${colLabel(Math.floor(fx))},${Math.floor(fy) + 1}]  ${fx.toFixed(1)}ft × ${fy.toFixed(1)}ft`);
      if (editMode && activeTool === 'place_rack') {
        setGhostPos({ fx: snap(fx), fy: snap(fy) });
      } else {
        setGhostPos(null);
      }
    } else {
      onGridCellHover?.(null);
      setGhostPos(null);
    }
  }, [roomX, rw_ft, rh_ft, onGridCellHover, editMode, activeTool]);

  const cursorStyle =
    cableMode ? 'crosshair' :
    editMode && activeTool === 'place_rack' ? 'crosshair' :
    editMode && activeTool === 'door' ? 'cell' : 'default';

  // ── Determine cable colour based on length ──
  function cableColor(lengthFt: number) {
    if (lengthFt < 10) return '#10b981';   // green — short
    if (lengthFt < 25) return '#f59e0b';   // amber — medium
    return '#ef4444';                       // red — long
  }

  return (
    <div className="relative w-full h-full bg-[#e8ecf0]" ref={containerRef} style={{ cursor: cursorStyle }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={pos.x}
        y={pos.y}
        draggable={!cableMode && (!editMode || activeTool === 'select')}
        onWheel={handleWheel}
        onDragEnd={e => setPos({ x: e.target.x(), y: e.target.y() })}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={() => { onGridCellHover?.(null); setGhostPos(null); }}
        onClick={() => {
          if (editMode && activeTool === 'place_rack') {
            const c = ptrToRoomFeet();
            if (!c) return;
            if (c.fx >= 0 && c.fx < rw_ft && c.fy >= 0 && c.fy < rh_ft) {
              onRackPlace?.(snap(c.fx) / FT_PER_M, snap(c.fy) / FT_PER_M);
            }
          }
        }}
      >
        <Layer>
          {/* ── Canvas background ── */}
          <Rect x={0} y={0} width={totalW} height={totalH} fill="#e8edf3" />

          {/* ── Column headers top ── */}
          {Array.from({ length: colCount }, (_, i) => (
            <Group key={`ch-${i}`}>
              <Rect x={i * F} y={0} width={F} height={HDR} fill="#d8dfe8" stroke="#b8c0cc" strokeWidth={0.5} />
              <Text x={i * F} y={0} width={F} height={HDR}
                text={colLabel(i)} fontSize={8} fill="#4a5568"
                align="center" verticalAlign="middle" fontStyle="bold" />
            </Group>
          ))}

          {/* ── Column headers bottom ── */}
          {Array.from({ length: colCount }, (_, i) => (
            <Group key={`cbh-${i}`}>
              <Rect x={i * F} y={totalH - HDR} width={F} height={HDR} fill="#d8dfe8" stroke="#b8c0cc" strokeWidth={0.5} />
              <Text x={i * F} y={totalH - HDR} width={F} height={HDR}
                text={colLabel(i)} fontSize={8} fill="#4a5568"
                align="center" verticalAlign="middle" fontStyle="bold" />
            </Group>
          ))}

          {/* ── Row headers left ── */}
          {Array.from({ length: rowCount }, (_, i) => (
            <Group key={`rh-${i}`}>
              <Rect x={0} y={i * F} width={HDR} height={F} fill="#d8dfe8" stroke="#b8c0cc" strokeWidth={0.5} />
              <Text x={0} y={i * F} width={HDR} height={F}
                text={String(i + 1)} fontSize={7} fill="#4a5568"
                align="center" verticalAlign="middle" />
            </Group>
          ))}

          {/* ── Row headers right ── */}
          {Array.from({ length: rowCount }, (_, i) => (
            <Group key={`rrh-${i}`}>
              <Rect x={totalW - HDR} y={i * F} width={HDR} height={F} fill="#d8dfe8" stroke="#b8c0cc" strokeWidth={0.5} />
              <Text x={totalW - HDR} y={i * F} width={HDR} height={F}
                text={String(i + 1)} fontSize={7} fill="#4a5568"
                align="center" verticalAlign="middle" />
            </Group>
          ))}

          {/* ── White area under header bands ── */}
          <Rect x={HDR} y={HDR} width={totalW - HDR * 2} height={totalH - HDR * 2} fill="#dce1e9" />

          {/* ── Grid lines (1 per foot) ── */}
          {Array.from({ length: colCount + 1 }, (_, i) => (
            <Rect key={`vl-${i}`} x={i * F} y={HDR} width={0.5} height={totalH - HDR * 2} fill="#b8c2cc" />
          ))}
          {Array.from({ length: rowCount + 1 }, (_, i) => (
            <Rect key={`hl-${i}`} x={HDR} y={i * F} width={totalW - HDR * 2} height={0.5} fill="#b8c2cc" />
          ))}

          {/* ── Room floor — raised tile pattern ── */}
          {Array.from({ length: Math.ceil(rw_ft) }, (_, col) =>
            Array.from({ length: Math.ceil(rh_ft) }, (_, row) => {
              const isEven = (col + row) % 2 === 0;
              return (
                <Rect
                  key={`tile-${col}-${row}`}
                  x={roomX + col * F}
                  y={roomY + row * F}
                  width={F}
                  height={F}
                  fill={isEven ? '#f4f6f9' : '#eaecf2'}
                  stroke="#c8cdd8"
                  strokeWidth={0.8}
                  listening={false}
                />
              );
            })
          )}

          {/* ── Tile highlight lines (top-left inner bevel — simulates 3D raised tile) ── */}
          {Array.from({ length: Math.ceil(rw_ft) }, (_, col) =>
            Array.from({ length: Math.ceil(rh_ft) }, (_, row) => (
              <Group key={`bevel-${col}-${row}`} listening={false}>
                {/* top edge highlight */}
                <Rect x={roomX + col * F + 1} y={roomY + row * F + 1} width={F - 3} height={1} fill="#ffffff" opacity={0.6} />
                {/* left edge highlight */}
                <Rect x={roomX + col * F + 1} y={roomY + row * F + 1} width={1} height={F - 3} fill="#ffffff" opacity={0.6} />
                {/* bottom edge shadow */}
                <Rect x={roomX + col * F + 1} y={roomY + row * F + F - 2} width={F - 2} height={1} fill="#a0a8b8" opacity={0.3} />
                {/* right edge shadow */}
                <Rect x={roomX + col * F + F - 2} y={roomY + row * F + 1} width={1} height={F - 2} fill="#a0a8b8" opacity={0.3} />
              </Group>
            ))
          )}

          {/* ── Hot/Cold aisle bands ── */}
          {room.rows.map((row, idx) => {
            if (row.racks.length === 0) return null;
            const rxMin = Math.min(...row.racks.map(r => r.position_x));
            const rxMax = Math.max(...row.racks.map(r => r.position_x + r.width));
            const ryMin = Math.min(...row.racks.map(r => r.position_y));
            const ryMax = Math.max(...row.racks.map(r => r.position_y + r.depth));
            return (
              <Rect key={`aisle-${row.id}`}
                x={roomX + rxMin * FT_PER_M * F - 3}
                y={roomY + ryMin * FT_PER_M * F - 3}
                width={(rxMax - rxMin) * FT_PER_M * F + 6}
                height={(ryMax - ryMin) * FT_PER_M * F + 6}
                fill={idx % 2 === 0 ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)'}
                stroke={idx % 2 === 0 ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)'}
                strokeWidth={1}
                dash={[6, 4]}
                cornerRadius={3}
              />
            );
          })}

          {/* ── Room boundary ── */}
          <Rect
            x={roomX} y={roomY}
            width={rw_ft * F} height={rh_ft * F}
            fill="transparent"
            stroke="#1a1a2e"
            strokeWidth={2.5}
          />

          {/* ── Doors ── */}
          {room.doors?.map((door, i) => {
            let x = 0, y = 0, w = 0, h = 0;
            const gapW   = door.width * FT_PER_M * F;
            const pos_ft = door.position * FT_PER_M;
            if (door.wall === 'top')    { x = roomX + pos_ft * F; y = roomY - 2; w = gapW; h = 6; }
            if (door.wall === 'bottom') { x = roomX + pos_ft * F; y = roomY + rh_ft * F - 3; w = gapW; h = 6; }
            if (door.wall === 'left')   { x = roomX - 2; y = roomY + pos_ft * F; w = 6; h = gapW; }
            if (door.wall === 'right')  { x = roomX + rw_ft * F - 3; y = roomY + pos_ft * F; w = 6; h = gapW; }
            return <Rect key={`door-${i}`} x={x} y={y} width={w} height={h} fill="#e8edf3" listening={false} />;
          })}

          {/* ── Wall click targets for door tool ── */}
          {editMode && activeTool === 'door' && (
            <>
              <Rect x={roomX} y={roomY - 6} width={rw_ft * F} height={12} fill="rgba(59,130,246,0.1)"
                onClick={() => { const c = ptrToRoomFeet(); if (c) onAddDoor?.({ wall: 'top', position: Math.max(0, c.fx) / FT_PER_M, width: 1 }); }} />
              <Rect x={roomX} y={roomY + rh_ft * F - 6} width={rw_ft * F} height={12} fill="rgba(59,130,246,0.1)"
                onClick={() => { const c = ptrToRoomFeet(); if (c) onAddDoor?.({ wall: 'bottom', position: Math.max(0, c.fx) / FT_PER_M, width: 1 }); }} />
              <Rect x={roomX - 6} y={roomY} width={12} height={rh_ft * F} fill="rgba(59,130,246,0.1)"
                onClick={() => { const c = ptrToRoomFeet(); if (c) onAddDoor?.({ wall: 'left', position: Math.max(0, c.fy) / FT_PER_M, width: 1 }); }} />
              <Rect x={roomX + rw_ft * F - 6} y={roomY} width={12} height={rh_ft * F} fill="rgba(59,130,246,0.1)"
                onClick={() => { const c = ptrToRoomFeet(); if (c) onAddDoor?.({ wall: 'right', position: Math.max(0, c.fy) / FT_PER_M, width: 1 }); }} />
            </>
          )}

          {/* ── Room label ── */}
          <Text x={roomX + 5} y={roomY + 4} text={room.name} fontSize={10} fill="#334155" fontStyle="bold" />

          {/* ── DRAWN CABLES ── */}
          {drawnCables.map(cable => {
            const srcRack = allRacks.find(r => r.id === cable.sourceId);
            const dstRack = allRacks.find(r => r.id === cable.targetId);
            if (!srcRack || !dstRack) return null;
            const src = rackCentre(srcRack);
            const dst = rackCentre(dstRack);
            const color = cableColor(cable.lengthFt);
            // L-shaped path: horizontal first, then vertical
            const cornerX = dst.cx;
            const cornerY = src.cy;
            const midX = (src.cx + dst.cx) / 2;
            const midY = src.cy;
            return (
              <Group key={cable.id} listening={false}>
                {/* Cable path (L-shaped) */}
                <Line
                  points={[src.cx, src.cy, cornerX, cornerY, dst.cx, dst.cy]}
                  stroke={color}
                  strokeWidth={2.5}
                  dash={[6, 3]}
                  lineCap="round"
                  lineJoin="round"
                />
                {/* Arrow head at destination */}
                <Arrow
                  points={[cornerX, cornerY, dst.cx, dst.cy]}
                  stroke={color}
                  fill={color}
                  strokeWidth={2}
                  pointerLength={6}
                  pointerWidth={5}
                />
                {/* Label background */}
                <Rect
                  x={midX - 22} y={midY - 10}
                  width={44} height={14}
                  fill={color}
                  cornerRadius={4}
                  shadowColor="rgba(0,0,0,0.3)"
                  shadowBlur={3}
                  shadowOffsetY={1}
                />
                {/* Label text */}
                <Text
                  x={midX - 22} y={midY - 9}
                  width={44} height={13}
                  text={`${cable.lengthFt.toFixed(1)} ft`}
                  fontSize={7}
                  fill="#ffffff"
                  fontStyle="bold"
                  align="center"
                  verticalAlign="middle"
                />
              </Group>
            );
          })}

          {/* ── RACKS ── */}
          {allRacks.map(rack => {
            const rx    = roomX + rack.position_x * FT_PER_M * F;
            const ry    = roomY + rack.position_y * FT_PER_M * F;
            const rackW = rack.width * FT_PER_M * F;
            const rackD = rack.depth * FT_PER_M * F;
            const sel   = rack.id === selectedRackId;
            const isSrc = rack.id === cableSource;
            const color = sel ? '#22c55e' : utilColor(rack.utilization_percent ?? 0);
            const roleIcon = rack.devices?.[0]?.role ? (ROLE_ICONS[rack.devices[0].role] ?? '') : '';

            return (
              <Group key={rack.id} x={rx} y={ry}
                draggable={editMode && activeTool === 'select' && !cableMode}
                onDragEnd={editMode && !cableMode ? (e) => {
                  const nx = e.target.x();
                  const ny = e.target.y();
                  const sfx = snap((nx - roomX) / F);
                  const sfy = snap((ny - roomY) / F);
                  const cfx = Math.max(0, Math.min(rw_ft - RACK_W_FT, sfx));
                  const cfy = Math.max(0, Math.min(rh_ft - RACK_D_FT, sfy));
                  onRackMove?.(rack.id, cfx / FT_PER_M, cfy / FT_PER_M);
                  e.target.x(roomX + cfx * F);
                  e.target.y(roomY + cfy * F);
                } : undefined}
                onClick={() => {
                  if (cableMode) {
                    onRackCableClick?.(rack.id);
                  } else if (activeTool === 'select' || !editMode) {
                    onRackSelect?.(rack.id === selectedRackId ? null : rack.id);
                  }
                }}
                onMouseEnter={e => {
                  const cursor = cableMode ? 'crosshair' : (editMode && activeTool === 'select' ? 'grab' : 'pointer');
                  e.target.getStage()!.container().style.cursor = cursor;
                }}
                onMouseLeave={e => { e.target.getStage()!.container().style.cursor = cursorStyle; }}
              >
                {/* Rack body */}
                <Rect
                  x={1} y={1}
                  width={rackW - 2} height={rackD - 2}
                  fill={color + (sel ? 'ff' : 'cc')}
                  stroke={isSrc ? '#f59e0b' : sel ? '#16a34a' : (editMode ? '#2563eb' : '#374151')}
                  strokeWidth={isSrc ? 3 : sel ? 2 : 1}
                  strokeScaleEnabled={false}
                  dash={editMode && !sel && !isSrc ? [4, 3] : undefined}
                  cornerRadius={2}
                  shadowColor={isSrc ? '#f59e0b' : sel ? '#22c55e' : 'transparent'}
                  shadowBlur={isSrc ? 12 : sel ? 8 : 0}
                />
                {/* Cable source ring */}
                {isSrc && (
                  <Circle
                    x={rackW / 2} y={rackD / 2}
                    radius={Math.max(rackW, rackD) / 2 + 4}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dash={[4, 3]}
                  />
                )}
                {roleIcon && rackW >= 18 && (
                  <Text x={1} y={2} width={rackW - 2} text={roleIcon} fontSize={7} fill="rgba(255,255,255,0.9)" align="center" />
                )}
                <Text
                  x={1} y={roleIcon && rackW >= 18 ? 9 : 1}
                  width={rackW - 2}
                  height={rackD - (roleIcon && rackW >= 18 ? 9 : 2)}
                  text={rack.name}
                  fontSize={Math.max(6, Math.min(8, rackW / 4))}
                  fill="#fff"
                  align="center"
                  verticalAlign="middle"
                  fontStyle="bold"
                  wrap="none"
                />
              </Group>
            );
          })}

          {/* ── Ghost rack (place_rack tool) ── */}
          {editMode && activeTool === 'place_rack' && ghostPos && (
            <Rect
              x={roomX + ghostPos.fx * F}
              y={roomY + ghostPos.fy * F}
              width={RACK_W_FT * F}
              height={RACK_D_FT * F}
              fill="rgba(59,130,246,0.2)"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dash={[4, 3]}
              cornerRadius={2}
              listening={false}
            />
          )}
        </Layer>
      </Stage>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1">
        {[
          { label: '+', action: () => setZoom(z => Math.min(z * 1.2, 5)) },
          { label: '−', action: () => setZoom(z => Math.max(z / 1.2, 0.2)) },
          { label: '⊡', action: () => { setZoom(1); setPos({ x: 20, y: 20 }); } },
        ].map(b => (
          <button key={b.label} onClick={b.action}
            className="w-7 h-7 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 flex items-center justify-center text-sm font-bold shadow">
            {b.label}
          </button>
        ))}
      </div>

      {/* Zoom % */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-300 rounded px-2 py-0.5 text-xs text-gray-600 shadow">
        {Math.round(zoom * 100)}%
      </div>

      {/* Scale badge */}
      <div className="absolute top-2 left-2 bg-white/90 border border-gray-300 rounded px-2 py-0.5 text-[10px] text-gray-600 shadow">
        1 tile = 1 ft &nbsp;|&nbsp; Rack: 3ft × 2ft
      </div>

      {/* Cable mode hint */}
      {cableMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="bg-teal-600/90 text-white text-[10px] px-3 py-1.5 rounded shadow font-medium">
            {cableSource == null
              ? '🔌 Click a rack to start drawing cable'
              : '🔌 Click another rack to complete the cable'}
          </div>
          {/* Cable legend */}
          <div className="bg-white/90 border border-gray-200 rounded px-2 py-1 text-[9px] text-gray-600 shadow flex gap-2">
            <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-0.5"/>{'<'}10ft</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-0.5"/>10–25ft</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-0.5"/>{'>'}25ft</span>
          </div>
        </div>
      )}

      {editMode && !cableMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white text-[10px] px-3 py-1 rounded shadow">
          {activeTool === 'select' ? 'Edit Mode: drag racks to reposition' :
           activeTool === 'place_rack' ? 'Click to place new rack (3ft × 2ft)' :
           'Click on a wall to add a door'}
        </div>
      )}
    </div>
  );
}

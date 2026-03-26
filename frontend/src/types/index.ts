// ========== Auth ==========
export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'engineer' | 'viewer' | 'operator';
  phone?: string;
  department?: string;
  avatar?: string;
  is_active: boolean;
  date_joined: string;
  last_login?: string;
}

// ========== Locations ==========
export interface DataCenter {
  id: number;
  name: string;
  code: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  total_power_kw: number;
  total_cooling_tons: number;
  pue: number;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  rooms_count?: number;
  total_racks?: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: number;
  datacenter: number;
  datacenter_name?: string;
  name: string;
  room_type: string;
  width: number;
  height: number;
  floor_number: number;
  raised_floor: boolean;
  max_power_kw: number;
  max_cooling_tons: number;
  total_racks?: number;
  notes?: string;
}

export interface Row {
  id: number;
  room: number;
  name: string;
  orientation: 'horizontal' | 'vertical';
  position_x: number;
  position_y: number;
  rack_count?: number;
  racks?: Rack[];
}

export interface Rack {
  id: number;
  row: number;
  row_name?: string;
  room_name?: string;
  datacenter_name?: string;
  datacenter_id?: number;
  room_id?: number;
  name: string;
  status: 'active' | 'planned' | 'reserved' | 'decommissioned';
  u_height: number;
  width: number;
  depth: number;
  max_weight_kg: number;
  max_power_kw: number;
  position_x: number;
  position_y: number;
  serial_number?: string;
  asset_tag?: string;
  manufacturer?: string;
  model?: string;
  used_u?: number;
  free_u?: number;
  utilization_percent?: number;
  notes?: string;
  created_at?: string;
}

// ========== Assets ==========
export interface Manufacturer {
  id: number;
  name: string;
  website?: string;
  support_phone?: string;
  support_email?: string;
  device_type_count?: number;
}

export interface DeviceType {
  id: number;
  manufacturer: number;
  manufacturer_name?: string;
  model: string;
  device_role: string;
  u_height: number;
  is_full_depth: boolean;
  width_mm: number;
  depth_mm: number;
  power_draw_w: number;
  max_power_draw_w: number;
  weight_kg: number;
  color: string;
  front_image?: string | null;
  rear_image?: string | null;
  airflow: string;
  device_count?: number;
}

export interface Device {
  id: number;
  name: string;
  device_type: number;
  device_type_name?: string;
  manufacturer_name?: string;
  device_role?: string;
  u_height?: number;
  rack?: number | null;
  rack_name?: string;
  room_name?: string;
  datacenter_name?: string;
  position_u?: number | null;
  face: 'front' | 'rear';
  status: 'active' | 'planned' | 'staged' | 'failed' | 'decommissioning' | 'offline';
  serial_number?: string;
  asset_tag?: string;
  hostname?: string;
  ip_address?: string;
  management_ip?: string;
  os?: string;
  cpu_cores?: number;
  ram_gb?: number;
  storage_tb?: number;
  location_display?: string;
  tags?: string[];
  created_at?: string;
}

// ========== Power ==========
export interface PowerPanel {
  id: number;
  datacenter: number;
  datacenter_name?: string;
  name: string;
  location?: string;
  incoming_power_kw: number;
  feeds_count?: number;
}

export interface PowerFeed {
  id: number;
  power_panel: number;
  panel_name?: string;
  rack?: number | null;
  rack_name?: string;
  name: string;
  status: string;
  supply: string;
  phase: string;
  voltage: number;
  amperage: number;
  capacity_kw?: number;
  is_redundant: boolean;
}

// ========== Cooling ==========
export interface CoolingUnit {
  id: number;
  room: number;
  room_name?: string;
  datacenter_name?: string;
  name: string;
  unit_type: string;
  status: string;
  cooling_capacity_kw: number;
  power_draw_kw: number;
  position_x: number;
  position_y: number;
  current_temp_c?: number;
}

export interface TemperatureSensor {
  id: number;
  name: string;
  rack?: number | null;
  rack_name?: string;
  room?: number | null;
  room_name?: string;
  location_type: string;
  current_temp_c: number;
  threshold_high_c: number;
  threshold_critical_c: number;
  threshold_low_c: number;
  status?: 'ok' | 'warning' | 'critical' | 'low';
  last_updated: string;
}

// ========== Monitoring ==========
export interface Alert {
  id: number;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  title: string;
  message: string;
  device?: number | null;
  device_name?: string;
  rack?: number | null;
  rack_name?: string;
  room?: number | null;
  room_name?: string;
  acknowledged_by?: number | null;
  acknowledged_by_name?: string;
  acknowledged_at?: string;
  resolved_at?: string;
  created_at: string;
}

export interface MetricData {
  id: number;
  device: number;
  device_name?: string;
  metric_name: string;
  value: number;
  timestamp: string;
}

// ========== Reports ==========
export interface DashboardStats {
  total_datacenters: number;
  total_rooms: number;
  total_racks: number;
  total_devices: number;
  active_devices: number;
  active_alerts: number;
  critical_alerts: number;
  avg_rack_utilization: number;
  devices_by_role: Array<{ device_type__device_role: string; count: number }>;
  devices_by_status: Array<{ status: string; count: number }>;
  top_racks_by_utilization: Array<{
    id: number;
    name: string;
    location: string;
    utilization: number;
    used_u: number;
    total_u: number;
  }>;
}

// ========== API ==========
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ========== Floor Plan ==========
export interface DoorDef {
  wall: 'top' | 'bottom' | 'left' | 'right';
  position: number; // metres from start of wall
  width: number;    // metres
}


export interface FloorPlanDevice {
  id: number;
  name: string;
  position_u: number;
  u_height: number;
  role: string;
  color: string;
  status: string;
}

export interface FloorPlanRack {
  id: number;
  name: string;
  status: string;
  position_x: number;
  position_y: number;
  u_height: number;
  utilization_percent: number;
  max_power_kw: number;
  width: number;
  depth: number;
  devices?: FloorPlanDevice[];
}

export interface FloorPlanRoom {
  id: number;
  name: string;
  room_type?: string;
  width: number;
  height: number;
  doors?: DoorDef[];
  rows: Array<{
    id: number;
    name: string;
    position_x: number;
    position_y: number;
    orientation: string;
    racks: FloorPlanRack[];
  }>;
}

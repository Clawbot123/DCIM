import apiClient from './client';
import type { PaginatedResponse } from '../types';

// Generic CRUD factory
function createCRUD<T>(endpoint: string) {
  return {
    list: (params?: Record<string, unknown>) =>
      apiClient.get<PaginatedResponse<T>>(endpoint, { params }).then(r => r.data),
    listAll: (params?: Record<string, unknown>): Promise<T[]> =>
      apiClient.get<PaginatedResponse<T> | T[]>(endpoint, { params: { ...params, page_size: 1000 } }).then(r =>
        Array.isArray(r.data) ? r.data : (r.data as PaginatedResponse<T>).results
      ),
    get: (id: number) =>
      apiClient.get<T>(`${endpoint}${id}/`).then(r => r.data),
    create: (data: Partial<T>) =>
      apiClient.post<T>(endpoint, data).then(r => r.data),
    update: (id: number, data: Partial<T>) =>
      apiClient.patch<T>(`${endpoint}${id}/`, data).then(r => r.data),
    delete: (id: number) =>
      apiClient.delete(`${endpoint}${id}/`),
  };
}

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post('/auth/token/', { username, password }).then(r => r.data),
  me: () => apiClient.get('/users/me/').then(r => r.data),
};

// Locations
export const dataCenterApi = {
  ...createCRUD('/datacenters/'),
  stats: (id: number) => apiClient.get(`/datacenters/${id}/stats/`).then(r => r.data),
  floorPlan: (id: number, includeDevices = false) =>
    apiClient.get(`/datacenters/${id}/floor_plan/`, {
      params: includeDevices ? { include_devices: 'true' } : {},
    }).then(r => r.data),
};
export const roomApi = createCRUD('/rooms/');
export const rowApi = createCRUD('/rows/');
export const rackApi = {
  ...createCRUD('/racks/'),
  elevation: (id: number) => apiClient.get(`/racks/${id}/elevation/`).then(r => r.data),
};

// Assets
export const manufacturerApi = createCRUD('/manufacturers/');
export const deviceTypeApi = {
  ...createCRUD('/device-types/'),
  createForm: (fd: FormData) =>
    apiClient.post('/device-types/', fd, { headers: { 'Content-Type': undefined } }).then(r => r.data),
  updateForm: (id: number, fd: FormData) =>
    apiClient.patch(`/device-types/${id}/`, fd, { headers: { 'Content-Type': undefined } }).then(r => r.data),
};
export const deviceApi = {
  ...createCRUD('/devices/'),
  summary: () => apiClient.get('/devices/summary/').then(r => r.data),
  updateForm: (id: number, fd: FormData) =>
    apiClient.patch(`/devices/${id}/`, fd, { headers: { 'Content-Type': undefined } }).then(r => r.data),
};
export const interfaceApi = createCRUD('/interfaces/');

// Power
export const powerPanelApi = createCRUD('/power-panels/');
export const powerFeedApi = createCRUD('/power-feeds/');
export const pduApi = {
  ...createCRUD('/pdus/'),
  powerMap: (id: number) => apiClient.get(`/pdus/${id}/power_map/`).then(r => r.data),
};
export const powerOutletApi = createCRUD('/power-outlets/');

// Cooling
export const coolingUnitApi = createCRUD('/cooling-units/');
export const tempSensorApi = createCRUD('/temp-sensors/');

// Cables
export const cableApi = createCRUD('/cables/');
export const patchPanelApi = createCRUD('/patch-panels/');

// Monitoring
export const alertApi = {
  ...createCRUD('/alerts/'),
  summary: () => apiClient.get('/alerts/summary/').then(r => r.data),
  acknowledge: (id: number) => apiClient.post(`/alerts/${id}/acknowledge/`).then(r => r.data),
  resolve: (id: number) => apiClient.post(`/alerts/${id}/resolve/`).then(r => r.data),
};
export const metricApi = {
  ...createCRUD('/metrics/'),
  latest: (params?: Record<string, unknown>) => apiClient.get('/metrics/latest/', { params }).then(r => r.data),
};

// Reports
export const reportsApi = {
  dashboard: () => apiClient.get('/reports/dashboard/').then(r => r.data),
  capacity: (params?: Record<string, unknown>) => apiClient.get('/reports/capacity/', { params }).then(r => r.data),
  power: (params?: Record<string, unknown>) => apiClient.get('/reports/power/', { params }).then(r => r.data),
  temperature: () => apiClient.get('/reports/temperature/').then(r => r.data),
};

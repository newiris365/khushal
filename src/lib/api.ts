/**
 * Centralized API client for IRIS 365 Frontend
 * Handles JWT injection, base URL, and auto-redirect on auth failures.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface ApiResponse<T = any> {
  success: boolean;
  error?: string;
  [key: string]: any;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('iris_jwt_token') : null;
  const deviceId = typeof window !== 'undefined' ? localStorage.getItem('iris_client_device_id') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (deviceId) {
    headers['X-Client-Device-ID'] = deviceId;
  }
  return headers;
}

function handleAuthError(status: number): void {
  if ((status === 401 || status === 403) && typeof window !== 'undefined') {
    localStorage.removeItem('iris_jwt_token');
    localStorage.removeItem('iris_user_profile');
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }
}

export async function apiGet<T = any>(endpoint: string, params?: Record<string, string>, cacheSeconds = 0): Promise<ApiResponse<T>> {
  try {
    const url = new URL(`${API_BASE}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    }

    const headers = getAuthHeaders();
    if (cacheSeconds > 0) {
      headers['Cache-Control'] = `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 5}`;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      handleAuthError(response.status);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`apiGet failed for ${endpoint}:`, err);
    return { success: false, error: 'Connection failed. Please check if backend is running.' };
  }
}

export async function apiPost<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      handleAuthError(response.status);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`apiPost failed for ${endpoint}:`, err);
    return { success: false, error: 'Connection failed. Please check if backend is running.' };
  }
}

export async function apiPut<T = any>(endpoint: string, body: any): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      handleAuthError(response.status);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`apiPut failed for ${endpoint}:`, err);
    return { success: false, error: 'Connection failed. Please check if backend is running.' };
  }
}

export async function apiDelete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      handleAuthError(response.status);
    }

    return await response.json();
  } catch (err: any) {
    console.error(`apiDelete failed for ${endpoint}:`, err);
    return { success: false, error: 'Connection failed. Please check if backend is running.' };
  }
}

/**
 * Fetch a binary blob (e.g. PDF report download)
 */
export async function apiFetchBlob(endpoint: string, body?: any): Promise<Blob> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: body ? 'POST' : 'GET',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      handleAuthError(response.status);
      throw new Error('Failed to download file');
    }

    return await response.blob();
  } catch (err: any) {
    console.error(`apiFetchBlob failed for ${endpoint}:`, err);
    throw new Error('Connection failed. Please check if backend is running.');
  }
}

// =========================================================================
// Permissions API
// =========================================================================
export interface FeatureToggle {
  feature_key: string;
  enabled: boolean;
}

export interface ModulePermission {
  role: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
}

export async function getFeatureToggles(institutionId: string): Promise<ApiResponse<{ features: FeatureToggle[] }>> {
  return settingsApi('get_features', { institution_id: institutionId });
}

export async function setFeatureToggles(institutionId: string, features: FeatureToggle[]): Promise<ApiResponse> {
  return settingsApi('save_features', { institution_id: institutionId }, { features });
}

export async function getRolePermissions(institutionId: string): Promise<ApiResponse<{ permissions: ModulePermission[]; all_roles: string[]; all_modules: string[] }>> {
  return settingsApi('get_permissions', { institution_id: institutionId });
}

export async function setRolePermissions(institutionId: string, permissions: ModulePermission[]): Promise<ApiResponse> {
  return settingsApi('save_permissions', { institution_id: institutionId }, { permissions });
}

export async function getMyPermissions(): Promise<ApiResponse<{ features: FeatureToggle[]; permissions: ModulePermission[] }>> {
  return settingsApi('my_permissions');
}

export async function seedPermissions(institutionId: string): Promise<ApiResponse> {
  return settingsApi('seed', { institution_id: institutionId }, {});
}

// Netlify Function helper for settings operations
async function settingsApi(action: string, queryParams?: Record<string, string>, body?: any): Promise<ApiResponse> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('iris_jwt_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const urlParams = new URLSearchParams({ action });
    if (queryParams) {
      Object.entries(queryParams).forEach(([k, v]) => {
        if (v) urlParams.set(k, v);
      });
    }

    const response = await fetch(`/api/settings?${urlParams.toString()}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return await response.json();
  } catch (err: any) {
    console.error(`settingsApi failed for ${action}:`, err);
    return { success: false, error: 'Connection failed. Please check if backend is running.' };
  }
}

// =========================================================================
// Attendance Methods & Devices API
// =========================================================================
export interface AttendanceMethod {
  id: string;
  method_key: string;
  is_enabled: boolean;
  config: Record<string, any>;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceDevice {
  id: string;
  device_name: string;
  device_type: string;
  device_serial: string;
  api_key: string;
  department_id?: string;
  is_active: boolean;
  last_heartbeat?: string;
  firmware_version?: string;
  created_at: string;
}

export async function getAttendanceMethods(): Promise<ApiResponse<{ methods: AttendanceMethod[] }>> {
  return apiGet('/core/attendance/methods');
}

export async function updateAttendanceMethod(methodKey: string, isEnabled: boolean, config?: Record<string, any>): Promise<ApiResponse> {
  return apiPut('/core/attendance/method', { method_key: methodKey, is_enabled: isEnabled, config });
}

export async function batchUpdateAttendanceMethods(methods: { method_key: string; is_enabled: boolean; config?: Record<string, any> }[]): Promise<ApiResponse> {
  return apiPost('/core/attendance/methods/batch', { methods });
}

export async function getAttendanceDevices(): Promise<ApiResponse<{ devices: AttendanceDevice[] }>> {
  return apiGet('/core/attendance/devices');
}

export async function registerAttendanceDevice(device: { device_name: string; device_type: string; device_serial: string; department_id?: string }): Promise<ApiResponse<{ device: AttendanceDevice }>> {
  return apiPost('/core/attendance/device', device);
}

export async function updateAttendanceDevice(id: string, updates: Partial<AttendanceDevice>): Promise<ApiResponse> {
  return apiPut(`/core/attendance/device/${id}`, updates);
}

export async function getDeviceLogs(deviceId?: string): Promise<ApiResponse<{ logs: any[] }>> {
  return apiGet('/core/attendance/device-logs', deviceId ? { device_id: deviceId } : undefined);
}

// =========================================================================
// DATA IMPORT API
// =========================================================================

export async function importAttendanceRecords(records: { student_roll: string; subject: string; date: string; status: string; method?: string; time_slot?: string }[]): Promise<ApiResponse<{ imported: number; errors: number; error_details: { row: number; error: string }[] }>> {
  return apiPost('/core/import/attendance', { records });
}

export async function importStudentProfiles(records: { name: string; email: string; roll_number: string; department_id?: string; semester?: number; batch_year?: string; dob?: string; gender?: string; phone?: string; guardian_name?: string; guardian_phone?: string; fingerprint_id?: string }[]): Promise<ApiResponse<{ imported: number; errors: number; error_details: { row: number; error: string }[]; imported_students: any[] }>> {
  return apiPost('/core/import/students', { records });
}


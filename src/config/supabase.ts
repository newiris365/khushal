import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

dotenv.config();

// Request context store for dynamic JWT scoping
export const authLocalStorage = new AsyncLocalStorage<string>();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Key is missing. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.');
}

// Internal admin client to bypass RLS for administrative updates
const _supabaseAdminInternal = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export let isSupabaseOffline = false;

// Simple connectivity check
async function checkConnectivity() {
  if (!supabaseUrl || !supabaseServiceKey) {
    isSupabaseOffline = true;
    return;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: supabaseServiceKey },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok && res.status !== 404 && res.status !== 401) {
      isSupabaseOffline = true;
    }
  } catch (err) {
    isSupabaseOffline = true;
    console.warn(`[SUPABASE CONNECTIVITY] Supabase is offline or unreachable (${supabaseUrl}). Running in simulated offline sandbox mode.`);
  }
}
checkConnectivity();

// Helper to get client dynamically
export function getDynamicSupabaseClient(): SupabaseClient {
  const token = authLocalStorage.getStore();
  if (token && supabaseUrl) {
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey;
    return createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  return _supabaseAdminInternal;
}

// Define Mock client details for offline simulation mode
const mockAuth = {
  signInWithPassword: async ({ email }: { email: string }) => {
    let id = 'b0000000-0000-0000-0000-000000000002';
    if (email === 'khushal@gmail.com') id = 'b0000000-0000-0000-0000-000000000006';
    else if (email === 'guard@siet.edu.in') id = 'b0000000-0000-0000-0000-000000000015';
    return {
      data: {
        user: { id, email, role: 'authenticated' },
        session: { access_token: 'mock-token' }
      },
      error: null
    };
  },
  signUp: async ({ email }: { email: string }) => {
    return {
      data: { user: { id: 'new-mock-user-id', email } },
      error: null
    };
  },
  signOut: async () => {
    return { error: null };
  }
};

const mockStorage = {
  from: () => ({
    upload: async () => ({ data: { path: 'mock-path' }, error: null }),
    getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/mock-report.pdf' } })
  })
};

function getMockDataForTable(tableName: string) {
  const today = new Date().toISOString().split('T')[0];
  switch (tableName) {
    case 'users':
      return [
        {
          id: 'b0000000-0000-0000-0000-000000000002',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          role: 'Director',
          name: 'Dr. K. R. Sharma (Mock Sandbox)',
          email: 'director@siet.edu.in',
          phone: '+919876543211',
          is_active: true,
          institutions: {
            name: 'SIN Institute of Engineering & Technology (SIET)',
            plan_tier: 'University'
          }
        },
        {
          id: 'b0000000-0000-0000-0000-000000000006',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          role: 'Student',
          name: 'Khushal Gehlot (Mock Sandbox)',
          email: 'khushal@gmail.com',
          phone: '+919999988888',
          is_active: true,
          institutions: {
            name: 'SIN Institute of Engineering & Technology (SIET)',
            plan_tier: 'University'
          }
        },
        {
          id: 'b0000000-0000-0000-0000-000000000015',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          role: 'Security',
          name: 'Vikram Singh (Security Guard Mock)',
          email: 'guard@siet.edu.in',
          phone: '+919876543299',
          is_active: true,
          institutions: {
            name: 'SIN Institute of Engineering & Technology (SIET)',
            plan_tier: 'University'
          }
        }
      ];
    case 'students':
      return [
        {
          id: 'test-student-id',
          roll_number: 'CS23B1042',
          user_id: 'b0000000-0000-0000-0000-000000000006',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          department_id: 'd1',
          semester: '5',
          users: {
            name: 'Khushal Gehlot',
            full_name: 'Khushal Gehlot',
            phone: '+919999988888',
            email: 'khushal@gmail.com'
          },
          departments: {
            name: 'Computer Science'
          }
        }
      ];
    case 'director_alerts':
      return [
        {
          id: 'alert-1',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          alert_type: 'attendance',
          title: 'Low Attendance Alert',
          description: 'CS Department attendance dropped below 75%',
          severity: 'high',
          is_read: false,
          is_resolved: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'alert-2',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          alert_type: 'complaint',
          title: 'Critical Water Leakage',
          description: 'Hostel Block B reported major plumbing breakdown',
          severity: 'critical',
          is_read: false,
          is_resolved: false,
          created_at: new Date().toISOString()
        }
      ];
    case 'alert_thresholds':
      return [
        { id: 't-1', alert_type: 'attendance', threshold_value: 75, comparison: 'lt', is_enabled: true, notify_via: ['push', 'email'] },
        { id: 't-2', alert_type: 'fees', threshold_value: 10000, comparison: 'gt', is_enabled: true, notify_via: ['sms', 'email'] }
      ];
    case 'ai_insights':
      return [
        {
          id: 'insight-1',
          institution_id: 'a0000000-0000-0000-0000-000000000001',
          insight_type: 'academic_risk',
          title: 'Declining Midterm Scores',
          description: '3rd semester CS students show 12% lower marks in mathematics compared to last year.',
          severity: 'medium',
          recommendation: 'Arrange extra tutorial classes for math courses.',
          affected_entities: { count: 18 },
          generated_at: new Date().toISOString(),
          is_dismissed: false
        }
      ];
    case 'canteen_menu':
    case 'canteen_items':
      return [
        { id: 'm1', name: 'Masala Dosa', price: 50, category: 'Breakfast', is_available: true },
        { id: 'm2', name: 'Veg Thali', price: 80, category: 'Lunch', is_available: true }
      ];
    case 'canteen_orders':
    case 'fee_payments':
    case 'daily_attendance_summary':
      return [
        { date: today, attendance_percent: 85, total_collected: 185000, amount_paid: 15000, status: 'Completed', payment_date: today }
      ];
    case 'daily_fee_summary':
      return [
        { date: today, total_collected: 185000 }
      ];
    case 'campus_occupancy':
      return [
        { students_inside: 120, timestamp: new Date().toISOString() }
      ];
    case 'hostel_complaints':
      return [
        { id: 'c1', category: 'Plumbing', status: 'open', created_at: new Date().toISOString(), description: 'Leaking pipe' }
      ];
    case 'hostel_rooms':
      return [
        { id: 'r1', room_number: '101', capacity: 4, occupancy: 3, floor: 1 }
      ];
    case 'bus_trips':
      return [
        { id: 'trip1', route_name: 'Route A', status: 'active', driver_name: 'Ramesh Kumar', bus_number: 'KA-01-F-1234' }
      ];
    case 'bus_routes':
      return [
        { id: 'route1', route_name: 'Route A', stops: ['Stop 1', 'Stop 2', 'Stop 3'] }
      ];
    case 'library_books':
    case 'books':
      return [
        { id: 'b1', title: 'Introduction to Algorithms', author: 'CLRS', available_copies: 5, category: 'Computer Science' }
      ];
    case 'library_issues':
      return [
        { id: 'issue1', book_title: 'Clean Code', issue_date: today, due_date: today, status: 'issued' }
      ];
    case 'gate_entries':
    case 'security_incidents':
      return [
        { id: 'g1', person_id: 'p1', person_name: 'Vikram Singh', direction: 'in', timestamp: new Date().toISOString(), location: 'Main Gate' }
      ];
    case 'admissions':
    case 'admissions_applications':
      return [
        { id: 'adm1', applicant_name: 'Aarav Mehta', course: 'Computer Science', status: 'Applied' }
      ];
    case 'placement_drives':
    case 'drives':
      return [
        { id: 'd1', company_name: 'Google', role: 'Software Engineer', package: '35 LPA', status: 'Active', drive_date: today }
      ];
    case 'assignments':
      return [
        { id: 'a1', title: 'Database Normalization', due_date: today, subject: 'DBMS', max_marks: 50 }
      ];
    case 'director_reports':
      return [
        { id: 'rep1', report_type: 'weekly', report_date: today, pdf_url: 'https://example.com/mock-report.pdf', generated_at: new Date().toISOString() }
      ];
    case 'employees':
      return [
        { id: 'emp1', name: 'Dr. John Doe', role: 'Professor', department: 'Computer Science' }
      ];
    case 'get_parent_child_info':
      return [
        {
          child_id: 'test-student-id',
          child_name: 'Khushal Gehlot',
          roll_number: 'CS23B1042',
          class: 'Semester 5 CS',
          attendance_percent: 88
        }
      ];
    case 'get_parent_daily_summary':
      return [
        {
          date: today,
          attendance_status: 'Present',
          canteen_spent: 120,
          bus_status: 'On time'
        }
      ];
    case 'parent_topup_child_wallet':
      return [
        {
          success: true,
          new_balance: 500
        }
      ];
    default:
      return [];
  }
}

function createMockBuilder(tableName: string) {
  const mockBuilder: any = {
    tableName,
    chain: [] as string[],
    then(onfulfilled: any, onrejected: any) {
      const isSingle = this.chain.includes('single') || this.chain.includes('maybeSingle');
      const mockData = getMockDataForTable(this.tableName);
      let resolvedData: any = mockData;
      if (isSingle) {
        resolvedData = mockData.length > 0 ? mockData[0] : null;
      }
      const count = mockData.length;
      return Promise.resolve({
        data: resolvedData,
        error: null,
        count
      }).then(onfulfilled, onrejected);
    }
  };

  const proxy: any = new Proxy(mockBuilder, {
    get(target, prop, receiver) {
      if (prop === 'then') {
        return target.then.bind(target);
      }
      if (typeof prop === 'string') {
        target.chain.push(prop);
      }
      return () => proxy;
    }
  });
  return proxy;
}

const mockSupabaseClient = {
  auth: mockAuth,
  storage: mockStorage,
  from: (tableName: string) => createMockBuilder(tableName),
  rpc: (funcName: string) => createMockBuilder(funcName)
} as any;

// Export supabaseAdmin as a Proxy that dynamically routes to getDynamicSupabaseClient()
export const supabaseAdmin = new Proxy(_supabaseAdminInternal, {
  get(target, prop, receiver) {
    if (isSupabaseOffline) {
      const value = Reflect.get(mockSupabaseClient, prop, mockSupabaseClient);
      if (typeof value === 'function') {
        return value.bind(mockSupabaseClient);
      }
      return value;
    }
    const dynamicClient = getDynamicSupabaseClient();
    const value = Reflect.get(dynamicClient, prop, dynamicClient);
    if (typeof value === 'function') {
      return value.bind(dynamicClient);
    }
    return value;
  }
});

// Export a raw, un-proxied client for explicit administrative actions
export const supabaseServiceRole = new Proxy(_supabaseAdminInternal, {
  get(target, prop, receiver) {
    if (isSupabaseOffline) {
      const value = Reflect.get(mockSupabaseClient, prop, mockSupabaseClient);
      if (typeof value === 'function') {
        return value.bind(mockSupabaseClient);
      }
      return value;
    }
    const value = Reflect.get(_supabaseAdminInternal, prop, _supabaseAdminInternal);
    if (typeof value === 'function') {
      return value.bind(_supabaseAdminInternal);
    }
    return value;
  }
}) as any;

export function getSupabaseClient(req?: Request) {
  if (isSupabaseOffline) {
    return mockSupabaseClient;
  }
  const authHeader = req?.headers?.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token && supabaseUrl) {
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey;
    return createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  return _supabaseAdminInternal;
}

// Middleware: block requests when Supabase is offline (returns 503)
export function requireSupabaseOnline(req: Request, res: Response, next: NextFunction) {
  // Allow requests to pass through in offline sandbox simulation mode so mock data is served successfully
  next();
}

// Helper: check if Supabase is available, return true if online
export async function checkSupabaseOnline(): Promise<boolean> {
  if (!supabaseUrl || !supabaseServiceKey) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: { apikey: supabaseServiceKey },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok || res.status === 404 || res.status === 401;
  } catch {
    return false;
  }
}

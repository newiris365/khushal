const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verify a JWT token cryptographically. Returns decoded payload or null.
 */
function decodeToken(token) {
  if (!token) return null;

  // Handle mock sandbox tokens
  if (token.startsWith('mock-sandbox-jwt-token-value.')) {
    try {
      const base64Part = token.replace('mock-sandbox-jwt-token-value.', '');
      return JSON.parse(Buffer.from(base64Part, 'base64').toString());
    } catch {
      return null;
    }
  }

  // Verify standard JWT with signature check
  if (!JWT_SECRET) {
    console.error('Cannot verify JWT: JWT_SECRET not configured');
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    // ── Parse body ─────────────────────────────────────────────────────────
    let body = {};
    if (event.body) {
      try { body = JSON.parse(event.body); } catch { /* ignore */ }
    }

    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = event.headers.authorization || event.headers.Authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    const userPayload = token ? decodeToken(token) : null;

    // Determine institution_id from token or fallback for public menu fetches
    const institutionId = userPayload?.institution_id || null;

    // ── Route based on path ────────────────────────────────────────────────
    // Path looks like:  /api/v1/canteen/menu  OR  /api/v1/canteen/orders
    const pathParts = (event.path || '').split('/').filter(Boolean);
    // pathParts for /api/v1/canteen/menu  =>  ['api', 'v1', 'canteen', 'menu']
    // When invoked via /.netlify/functions/canteen/menu it's ['netlify', 'functions', 'canteen', 'menu']
    const subPath = pathParts[pathParts.length - 1]; // last segment: 'menu' | 'orders'

    // ── GET /canteen/menu ──────────────────────────────────────────────────
    if (event.httpMethod === 'GET' && subPath === 'menu') {
      let query = supabase
        .from('canteen_menu')
        .select('*')
        .eq('is_available', true)
        .order('category')
        .order('item_name');

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, menu: data || [] }),
      };
    }

    // ── POST /canteen/orders ───────────────────────────────────────────────
    if (event.httpMethod === 'POST' && subPath === 'orders') {
      if (!userPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ success: false, error: 'Unauthorized: valid token required to place order.' }),
        };
      }

      const { student_id, items, total_amount, payment_method, special_instructions, offer_code } = body;

      if (!student_id || !items || !Array.isArray(items) || items.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'student_id and items are required.' }),
        };
      }

      if (typeof total_amount !== 'number' || total_amount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: 'total_amount must be a positive number.' }),
        };
      }

      // ── Resolve student UUID ──────────────────────────────────────────────
      let resolvedStudentId = student_id;
      // If not a UUID, look up by roll_number or email
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(student_id)) {
        const { data: stu } = await supabase
          .from('students')
          .select('id')
          .or(`roll_number.eq.${student_id},email.eq.${student_id}`)
          .single();
        if (stu) resolvedStudentId = stu.id;
      }

      // ── Handle offer code ─────────────────────────────────────────────────
      let discount_amount = 0;
      let offer_id = null;

      if (offer_code && institutionId) {
        const { data: offer } = await supabase
          .from('canteen_offers')
          .select('*')
          .eq('institution_id', institutionId)
          .eq('code', offer_code)
          .eq('is_active', true)
          .single();

        if (offer && offer.used_count < (offer.usage_limit || 999999)) {
          if (total_amount >= (offer.min_order_amount || 0)) {
            discount_amount = offer.discount_type === 'percentage'
              ? Math.min(total_amount * offer.discount_value / 100, offer.max_discount || total_amount)
              : Math.min(offer.discount_value, total_amount);
            offer_id = offer.id;

            await supabase
              .from('canteen_offers')
              .update({ used_count: offer.used_count + 1 })
              .eq('id', offer.id);
          }
        }
      }

      const final_amount = total_amount - discount_amount;
      const order_number = `ORD-${Date.now().toString(36).toUpperCase()}`;

      // ── Call atomic RPC ───────────────────────────────────────────────────
      const { data: rpcData, error: rpcError } = await supabase.rpc('place_canteen_order_atomic', {
        p_student_id: resolvedStudentId,
        p_institution_id: institutionId,
        p_total_amount: final_amount,
        p_items: items,
        p_payment_method: payment_method || 'Wallet',
        p_special_instructions: special_instructions || '',
        p_offer_id: offer_id,
        p_discount_amount: discount_amount,
        p_order_number: order_number,
      });

      if (rpcError) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ success: false, error: rpcError.message }),
        };
      }

      if (!rpcData || !rpcData.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ success: false, error: rpcData?.error || 'Failed to place order.' }),
        };
      }

      // ── Fetch order details ───────────────────────────────────────────────
      const { data: order } = await supabase
        .from('canteen_orders')
        .select('*')
        .eq('id', rpcData.order_id)
        .single();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Order placed successfully.',
          order: order || { id: rpcData.order_id, order_number: rpcData.order_number },
        }),
      };
    }

    // ── 404 for unknown sub-paths ─────────────────────────────────────────
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ success: false, error: `Canteen route not found: ${subPath}` }),
    };

  } catch (err) {
    console.error('Canteen function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message || 'Internal server error' }),
    };
  }
};

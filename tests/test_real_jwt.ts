import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'iris365-superSecure-jwt-K3y!2026@SIET-campus-prod-xK9mT4wQ';

function getFingerprintHash(userAgent: string, ip: string, deviceId: string): string {
  let ipSegment = ip;
  if (ip.includes(':')) {
    ipSegment = ip.split(':').slice(0, 4).join(':');
  } else if (ip.includes('.')) {
    ipSegment = ip.split('.').slice(0, 3).join('.');
  }
  
  const raw = `${userAgent}-${ipSegment}-${deviceId}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

async function testAuthFlow() {
  console.log('--- Testing dev server auth flow with real signed JWT ---');

  try {
    const userAgent = 'node-fetch';
    const ip = '127.0.0.1';
    const loginDeviceId = 'dev_real_device_id';

    // Generate real fingerprint
    const fingerprint = getFingerprintHash(userAgent, ip, loginDeviceId);

    const tokenClaims = {
      id: 'b0000000-0000-0000-0000-000000000002', // Admin user
      institution_id: 'a0000000-0000-0000-0000-000000000001',
      role: 'Admin',
      email: 'director@siet.edu.in',
      fingerprint: fingerprint
    };

    // Sign the token using JWT_SECRET
    const realToken = jwt.sign(tokenClaims, JWT_SECRET, { expiresIn: '24h' });
    console.log('Signed real JWT token:', realToken);

    // 1. Query Express backend (port 4000) /me endpoint WITH correct headers
    console.log('\nQuerying Express /me with matching device ID...');
    const res1 = await fetch('http://localhost:4000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${realToken}`,
        'User-Agent': userAgent,
        'X-Client-Device-ID': loginDeviceId
      }
    });
    console.log('Response 1 Status:', res1.status);
    console.log('Response 1 Body:', await res1.json());

    // 2. Query Express backend (port 4000) /me endpoint WITH mismatched device ID (or missing header)
    console.log('\nQuerying Express /me with MISSING device ID (should bypass 403 in dev)...');
    const res2 = await fetch('http://localhost:4000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${realToken}`,
        'User-Agent': userAgent
        // X-Client-Device-ID is missing
      }
    });
    console.log('Response 2 Status (mismatched/missing device ID):', res2.status);
    console.log('Response 2 Body:', await res2.json());

  } catch (err) {
    console.error('Test execution failed:', err);
  }
}

testAuthFlow();

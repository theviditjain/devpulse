import { NextResponse } from 'next/server';

// Intentionally slow endpoint — DevPulse should flag this as CRITICAL
// This simulates a slow DB query or heavy computation
export async function GET() {
  // Simulate 3 second database query
  await new Promise(resolve => setTimeout(resolve, 3000));

  return NextResponse.json({
    users: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
    })),
    _debug: 'This endpoint is intentionally slow for DevPulse demo',
  });
}

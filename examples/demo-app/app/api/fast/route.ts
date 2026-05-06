import { NextResponse } from 'next/server';

// Optimized endpoint — DevPulse should show this as GOOD
// Simulates a cached or lightweight response
export async function GET() {
  // Fast response — cached data
  await new Promise(resolve => setTimeout(resolve, 50));

  return NextResponse.json({
    users: [{ id: 1, name: 'Cached User', email: 'cached@example.com' }],
    _debug: 'This endpoint is fast — cached response',
  });
}

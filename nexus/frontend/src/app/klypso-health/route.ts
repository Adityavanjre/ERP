import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'klypso-frontend', 
    timestamp: new Date().toISOString(),
    check: 'klypso-health-verified'
  }, { status: 200 });
}

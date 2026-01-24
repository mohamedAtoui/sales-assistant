import { NextResponse } from 'next/server';

export async function GET() {
  const authPassword = process.env.AUTH_PASSWORD;

  return NextResponse.json({
    hasAuthPassword: !!authPassword,
    authPasswordLength: authPassword?.length ?? 0,
    authPasswordFirst3: authPassword?.slice(0, 3) ?? 'N/A',
    authPasswordLast3: authPassword?.slice(-3) ?? 'N/A',
    nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
  });
}

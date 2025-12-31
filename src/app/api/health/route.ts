import { NextResponse } from 'next/server'

// Health check endpoint for Docker and deployment
export async function GET() {
  // Return plain text "healthy" for simple health checks
  return new NextResponse('healthy', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
  })
}

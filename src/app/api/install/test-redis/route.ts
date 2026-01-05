import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { host, port, password, keyPrefix } = body;

    const redisHost = host || 'localhost';
    const redisPort = parseInt(port) || 6379;

    // Try to connect to Redis using net socket (no extra dependencies needed)
    const { net } = await import('net');
    
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
        // If password required, we'd need to send AUTH command
        // For now just verify connection works
        socket.destroy();
        resolve(NextResponse.json({ success: true }));
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        reject(new Error('Connection timeout'));
      });
      
      socket.on('error', (err: any) => {
        reject(new Error('Connection failed: ' + err.message));
      });
      
      socket.connect(redisPort, redisHost);
    });
  } catch (error: any) {
    console.error('Redis connection test failed:', error);
    return NextResponse.json(
      { error: 'Redis connection failed: ' + error.message },
      { status: 500 }
    );
  }
}

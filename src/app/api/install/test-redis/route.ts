import { NextRequest, NextResponse } from 'next/server';
import net from 'net';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { host, port, password, keyPrefix } = body;

    const redisHost = host || 'localhost';
    const redisPort = parseInt(port) || 6379;

    return new Promise<Response>((resolve, reject) => {
      const socket = new net.Socket();
      
      socket.setTimeout(5000);
      
      socket.on('connect', () => {
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

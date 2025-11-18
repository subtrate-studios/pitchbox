import { NextRequest, NextResponse } from 'next/server';

// Extended timeout for long-running analysis (10 minutes)
export const maxDuration = 600; // seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required field
    if (!body.githubUrl) {
      return NextResponse.json(
        { error: 'GitHub URL is required' },
        { status: 400 }
      );
    }

    // Get the server URL from environment or use default
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

    // Forward the request to the backend server with extended timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes

    try {
      const response = await fetch(`${serverUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || 'Analysis failed' },
          { status: response.status }
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout - analysis took too long' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

// Health check endpoint - does not expose sensitive information
export const GET = () => {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};

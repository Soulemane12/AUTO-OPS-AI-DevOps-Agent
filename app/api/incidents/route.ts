import { NextResponse } from "next/server";
import { listIncidents } from "../../../lib/tigris";

export async function GET() {
  try {
    const incidents = await listIncidents();

    return NextResponse.json({
      incidents,
      count: incidents.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { completeIncidentManually } from "@/lib/agent";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    if (!incidentId) {
      return NextResponse.json(
        { error: "Incident ID is required" },
        { status: 400 }
      );
    }

    const incident = await completeIncidentManually(incidentId);

    return NextResponse.json({
      incident,
      message: "Incident manually completed",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error manually completing incident:", error);
    const message = error?.message ?? "Failed to complete incident";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}

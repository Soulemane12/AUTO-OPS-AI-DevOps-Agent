import { NextRequest, NextResponse } from "next/server";
import { createIncidentAndStartWorkflow } from "@/lib/agent";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.filename || !body.error_type || !body.message) {
      return NextResponse.json(
        { error: "Missing required fields: filename, error_type, message" },
        { status: 400 }
      );
    }

    console.log("Received error report:", {
      filename: body.filename,
      error_type: body.error_type,
      message: body.message,
    });

    const incidentId = await createIncidentAndStartWorkflow(body);

    return NextResponse.json({
      incidentId,
      message: "Error received and processing started"
    });
  } catch (error) {
    console.error("Error processing incident:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
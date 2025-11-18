import { NextRequest, NextResponse } from "next/server";
import { getIncident } from "../../../../lib/tigris";

export async function GET(
  request: NextRequest,
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

    const incident = await getIncident(incidentId);

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Generate timeline based on incident status and data
    const timeline = generateIncidentTimeline(incident);

    return NextResponse.json({
      incident,
      timeline,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

function generateIncidentTimeline(incident: any) {
  const timeline = [];

  // Map status to timeline steps
  const statusSteps = [
    { status: "received", step: "Error received and incident created", emoji: "📥" },
    { status: "logged", step: "Logged to Galileo observability", emoji: "📝" },
    { status: "planned", step: "Claude analyzed error and created fix plan", emoji: "🤖" },
    { status: "patch_proposed", step: "AUTO-OPS patch generated", emoji: "🔧" },
    { status: "sandbox_started", step: "Daytona workspace created", emoji: "🚀" },
    { status: "testing_patch", step: "Testing patch in isolated environment", emoji: "🧪" },
    { status: "tested_ok", step: "Patch tested successfully", emoji: "✅" },
    { status: "tests_passed", step: "All tests passed", emoji: "🎯" },
    { status: "awaiting_approval", step: "Waiting for manual approval", emoji: "⏸️" },
    { status: "pr_created", step: "GitHub PR created for CodeRabbit review", emoji: "📝" },
    { status: "completed", step: "Voice summary generated - workflow complete", emoji: "🎤" }
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.status === incident.status);

  for (let i = 0; i < statusSteps.length; i++) {
    const stepInfo = statusSteps[i];
    let stepStatus: "completed" | "running" | "pending";

    if (i < currentStatusIndex) {
      stepStatus = "completed";
    } else if (i === currentStatusIndex) {
      stepStatus = incident.status === "failed" ? "failed" : "running";
    } else {
      stepStatus = "pending";
    }

    timeline.push({
      step: `${stepInfo.emoji} ${stepInfo.step}`,
      status: stepStatus,
      timestamp: stepStatus === "completed" ? incident.updated_at : undefined
    });
  }

  return timeline;
}

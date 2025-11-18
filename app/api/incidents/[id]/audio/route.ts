import { NextRequest, NextResponse } from "next/server";
import { getIncident } from "../../../../../lib/tigris";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: incidentId } = await params;

    // Get incident from Tigris storage
    const incident = await getIncident(incidentId);

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    if (!incident.audio_url) {
      return NextResponse.json(
        { error: "Voice summary not available for this incident" },
        { status: 404 }
      );
    }

    // If it's a data URL, check if it's real or mock
    if (incident.audio_url.startsWith('data:audio/')) {
      // Check if this is a mock audio URL
      if (incident.audio_url.includes('mock-audio')) {
        const mockAudioMessage = `🎭 Demo Voice Summary: AUTO-OPS successfully fixed a Python KeyError in ${incident.filename}. The automated fix passed tests in a Daytona isolated environment and a GitHub pull request has been opened for review.`;
        return NextResponse.json({
          message: mockAudioMessage,
          incident_id: incidentId,
          audio_url: incident.audio_url,
          mock: true,
          summary_text: `AUTO-OPS successfully fixed a Python ${incident.error_type} error in ${incident.filename}. The automated fix passed tests in a Daytona isolated environment and a GitHub pull request has been opened for review. The incident workflow is now complete.`
        });
      }

      // Real audio data
      const audioData = incident.audio_url.split(',')[1];
      const audioBuffer = Buffer.from(audioData, 'base64');

      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // If it's a regular URL, redirect to it
    if (incident.audio_url.startsWith('http')) {
      return NextResponse.redirect(incident.audio_url);
    }

    // For mock URLs, return a simple audio response
    const mockAudioMessage = `Voice summary for incident ${incidentId} would play here`;
    return NextResponse.json({
      message: mockAudioMessage,
      incident_id: incidentId,
      audio_url: incident.audio_url,
      mock: true
    });

  } catch (error) {
    console.error("Error retrieving audio for incident:", error);
    return NextResponse.json(
      { error: "Failed to retrieve voice summary" },
      { status: 500 }
    );
  }
}
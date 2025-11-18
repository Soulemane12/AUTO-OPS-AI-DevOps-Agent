import axios from "axios";
import type { Incident } from "./agent";

const GALILEO_API_URL = "https://api.galileo.ai/v1/logs";
const GALILEO_API_KEY = process.env.GALILEO_API_KEY;

export async function logToGalileo(incident: Incident): Promise<void> {
  if (!GALILEO_API_KEY) {
    console.warn("Galileo API key not found, skipping Galileo logging");
    return;
  }

  try {
    const payload = {
      timestamp: incident.created_at,
      level: "error",
      message: `Auto-ops incident: ${incident.error_type} in ${incident.filename}`,
      metadata: {
        incident_id: incident.id,
        filename: incident.filename,
        line: incident.line,
        error_type: incident.error_type,
        error_message: incident.message,
        status: incident.status,
        traceback: incident.traceback,
        code_snippet: incident.code.substring(0, 500), // First 500 chars
      },
      tags: ["python", "runtime_error", "auto-ops", incident.error_type.toLowerCase()],
    };

    const response = await axios.post(GALILEO_API_URL, payload, {
      headers: {
        "Authorization": `Bearer ${GALILEO_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    console.log(`Incident ${incident.id} logged to Galileo:`, response.status);
  } catch (error) {
    console.error(`Error logging to Galileo:`, error);
    // Don't throw - we don't want Galileo logging failures to block the workflow
  }
}

// Enhanced function as requested in Step 6
export async function logToGalileoWithPayload(incidentId: string, payload: any): Promise<void> {
  if (!GALILEO_API_KEY) {
    console.warn("Galileo API key not found, skipping Galileo logging");
    return;
  }

  try {
    const logPayload = {
      timestamp: new Date().toISOString(),
      level: "error",
      message: `Auto-ops incident: ${payload.error_type} in ${payload.filename}`,
      metadata: {
        incident_id: incidentId,
        filename: payload.filename,
        error_type: payload.error_type,
        error_message: payload.message,
        traceback: payload.traceback,
        code_snippet: payload.code?.substring(0, 500),
      },
      tags: ["python", "runtime_error", "auto-ops", payload.error_type?.toLowerCase()],
    };

    const response = await axios.post(GALILEO_API_URL, logPayload, {
      headers: {
        "Authorization": `Bearer ${GALILEO_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    console.log(`✅ Incident ${incidentId} logged to Galileo log stream:`, response.status);
  } catch (error) {
    console.error(`Error logging to Galileo:`, error);
    // Don't throw - we don't want Galileo logging failures to block the workflow
  }
}
import { v4 as uuidv4 } from "uuid";
import { saveTrigrisIncident, updateIncidentStatus, getIncident } from "./tigris";
import { logToGalileo } from "./galileo";
import { startDaytonaWorkspace, testPatchInDaytona } from "./daytona";
import { askClaudeForPlan, getAutoOpsPatch } from "./claude";
import { createPullRequestForIncident } from "./github";
import { generateVoiceSummary } from "./elevenlabs";

// Enhanced functions as requested in Step 6
export async function saveIncidentToTigris(incidentId: string, payload: any): Promise<void> {
  // Use existing saveTrigrisIncident function with enhanced payload structure
  await saveTrigrisIncident(payload);
  console.log(`✅ Incident ${incidentId} saved to Tigris collection`);
}

export interface ErrorReport {
  filename: string;
  error_type: string;
  message: string;
  traceback: string;
  code: string;
}

export interface Incident {
  id: string;
  filename: string;
  line?: number;
  error_type: string;
  message: string;
  traceback: string;
  code: string;
  status: "received" | "logged" | "planned" | "patch_proposed" | "sandbox_started" | "testing_patch" | "tested_ok" | "test_failed" | "tests_passed" | "awaiting_approval" | "pr_created" | "completed" | "failed";
  plan?: string;
  patch?: string;
  tests_passed?: boolean;
  test_output?: string;
  workspace_url?: string;
  pr_url?: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}

export async function createIncidentAndStartWorkflow(errorReport: ErrorReport): Promise<string> {
  const incidentId = uuidv4();

  // Extract line number from traceback if possible
  const lineMatch = errorReport.traceback.match(/line (\d+)/);
  const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

  const incident: Incident = {
    id: incidentId,
    filename: errorReport.filename,
    line,
    error_type: errorReport.error_type,
    message: errorReport.message,
    traceback: errorReport.traceback,
    code: errorReport.code,
    status: "received",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    // Step 1: Save incident to Tigris using new function
    await saveIncidentToTigris(incidentId, incident);

    // Step 2: Log to Galileo with proper tags
    await logToGalileo(incident);
    await updateIncidentStatus(incidentId, "logged");
    console.log(`✅ Incident ${incidentId} logged to Galileo`);

    // Step 3: Run the agent workflow
    await runAgentWorkflow(incidentId, errorReport);

    return incidentId;
  } catch (error) {
    console.error(`❌ Error processing incident ${incidentId}:`, error);
    await updateIncidentStatus(incidentId, "failed");
    throw error;
  }
}

// New agent workflow runner as requested in Step 6
export async function runAgentWorkflow(incidentId: string, payload: any): Promise<void> {
  try {
    console.log(`🤖 Starting AUTO-OPS agent workflow for incident ${incidentId}`);

    // Create incident object for Claude
    const incident: Incident = {
      id: incidentId,
      filename: payload.filename,
      error_type: payload.error_type,
      message: payload.message,
      traceback: payload.traceback,
      code: payload.code,
      status: "planned",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Step 1: Ask Claude for plan
    const plan = await askClaudeForPlan(incident);
    incident.plan = plan;
    await saveTrigrisIncident(incident);
    await updateIncidentStatus(incidentId, "planned");
    console.log(`✅ Incident ${incidentId} plan received from Claude`);

    // Step 2: Get AUTO-OPS safe patch as unified diff
    console.log(`🔧 Getting AUTO-OPS safe patch for incident ${incidentId}`);
    const patch = await getAutoOpsPatch(incident);
    incident.patch = patch;
    incident.status = "patch_proposed";

    // Step 3: Store the patch in Tigris and update status
    await saveTrigrisIncident(incident);
    await updateIncidentStatus(incidentId, "patch_proposed");
    console.log(`✅ Incident ${incidentId} AUTO-OPS patch proposed and stored`);

    // Step 4: Start Daytona workspace (async)
    startWorkspaceAndContinue(incidentId, incident);

  } catch (error) {
    console.error(`❌ Error in AUTO-OPS agent workflow for ${incidentId}:`, error);
    await updateIncidentStatus(incidentId, "failed");
    throw error;
  }
}

async function startWorkspaceAndContinue(incidentId: string, incident: Incident) {
  try {
    // Step 4: Start Daytona sandbox
    const workspaceUrl = await startDaytonaWorkspace(incident);
    incident.workspace_url = workspaceUrl;
    await updateIncidentStatus(incidentId, "sandbox_started");
    console.log(`✅ Incident ${incidentId} Daytona workspace started: ${workspaceUrl}`);

    // Step 5: Test the patch in isolated environment
    await testPatchInDaytonaWorkspace(incidentId, incident);

  } catch (error) {
    console.error(`❌ Error in workspace workflow for ${incidentId}:`, error);
    await updateIncidentStatus(incidentId, "failed");
  }
}

// New function for Step 8: Test patch in Daytona workspace
async function testPatchInDaytonaWorkspace(incidentId: string, incident: Incident): Promise<void> {
  try {
    console.log(`🧪 Testing patch for incident ${incidentId} in Daytona workspace`);

    // Update status to indicate testing is in progress
    await updateIncidentStatus(incidentId, "testing_patch");

    // Test the patch in isolated environment
    const testResult = await testPatchInDaytona(incident);

    // Update incident with test results
    incident.tests_passed = testResult.success;
    incident.test_output = testResult.output;

    if (testResult.success) {
      incident.status = "tested_ok";
      await saveTrigrisIncident(incident);
      await updateIncidentStatus(incidentId, "tested_ok");
      console.log(`✅ Incident ${incidentId} patch tested successfully in Daytona`);
      console.log(`Test output: ${testResult.output}`);

      // Move to next step - tests passed
      await updateIncidentStatus(incidentId, "tests_passed");
      console.log(`✅ Incident ${incidentId} all tests passed - awaiting manual approval`);

      // Pause workflow until manual approval
      incident.status = "awaiting_approval";
      await saveTrigrisIncident(incident);
      await updateIncidentStatus(incidentId, "awaiting_approval");
      console.log(`⏸️  Incident ${incidentId} is waiting for manual approval before completion`);

    } else {
      incident.status = "test_failed";
      await saveTrigrisIncident(incident);
      await updateIncidentStatus(incidentId, "test_failed");
      console.log(`❌ Incident ${incidentId} patch failed testing in Daytona`);
      console.log(`Test output: ${testResult.output}`);

      // TODO: Optionally loop back and ask Claude to retry (stretch goal)
    }

  } catch (error) {
    console.error(`❌ Error testing patch for ${incidentId}:`, error);
    await updateIncidentStatus(incidentId, "test_failed");
  }
}

// Step 9: Create GitHub PR and trigger CodeRabbit review
async function createGitHubPRForIncident(incidentId: string, incident: Incident): Promise<void> {
  try {
    console.log(`📝 Creating GitHub PR for incident ${incidentId} - CodeRabbit will auto-review`);

    // Create the pull request
    const prUrl = await createPullRequestForIncident(incident);

    // Update incident with PR details
    incident.pr_url = prUrl;
    incident.status = "pr_created";
    await saveTrigrisIncident(incident);
    await updateIncidentStatus(incidentId, "pr_created");

    console.log(`✅ Incident ${incidentId} GitHub PR created: ${prUrl}`);
    console.log(`🤖 CodeRabbit will automatically review the PR (app installed on repo)`);

  } catch (error) {
    console.error(`❌ Error creating GitHub PR for ${incidentId}:`, error);
    // Don't fail the whole workflow - PR creation is optional
    console.log(`⚠️  Continuing workflow without PR creation`);
  }
}

// Step 10: Generate voice summary for incident
async function generateVoiceSummaryForIncident(incidentId: string, incident: Incident): Promise<void> {
  try {
    console.log(`🎤 Generating voice summary for incident ${incidentId}`);

    // Generate voice summary using ElevenLabs
    const audioUrl = await generateVoiceSummary(incident);

    // Update incident with audio URL
    incident.audio_url = audioUrl;
    await saveTrigrisIncident(incident);

    console.log(`✅ Incident ${incidentId} voice summary generated and stored`);

  } catch (error) {
    console.error(`❌ Error generating voice summary for ${incidentId}:`, error);
    // Don't fail the whole workflow - voice summary is optional
    console.log(`⚠️  Continuing workflow without voice summary`);
  }
}

export async function completeIncidentManually(incidentId: string): Promise<Incident> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    throw new Error(`Incident ${incidentId} not found`);
  }

  if (incident.status !== "awaiting_approval" && incident.status !== "tests_passed") {
    throw new Error(`Incident ${incidentId} is not ready for completion`);
  }

  console.log(`▶️  Manually completing incident ${incidentId}`);

  await createGitHubPRForIncident(incidentId, incident);
  await generateVoiceSummaryForIncident(incidentId, incident);

  incident.status = "completed";
  await saveTrigrisIncident(incident);
  await updateIncidentStatus(incidentId, "completed");
  console.log(`🏁 Incident ${incidentId} marked as completed after manual approval`);

  return incident;
}

import axios from "axios";
import type { Incident } from "./agent";

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";
const ELEVENLABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;
const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Rachel voice

export async function generateVoiceSummary(incident: Incident): Promise<string> {
  if (!ELEVENLABS_API_KEY) {
    console.warn("ElevenLabs API key not found, simulating voice generation");
    return simulateVoiceGeneration(incident);
  }

  try {
    const summaryText = constructSummaryText(incident);
    console.log(`🎤 Generating voice summary for incident ${incident.id}`);

    const payload = {
      text: summaryText,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }
    };

    const response = await axios.post(
      `${ELEVENLABS_API_URL}/text-to-speech/${VOICE_ID}`,
      payload,
      {
        headers: {
          "Accept": "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );

    // Convert audio to base64 for storage
    const audioBuffer = Buffer.from(response.data);
    const audioBase64 = audioBuffer.toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log(`✅ Voice summary generated for incident ${incident.id}`);
    return audioUrl;

  } catch (error) {
    console.error(`Error generating voice summary:`, error);
    // Return simulated audio for   
    return simulateVoiceGeneration(incident);
  }
}

function constructSummaryText(incident: Incident): string {
  const errorType = incident.error_type;
  const filename = incident.filename;
  const testResult = incident.tests_passed ? "passed tests" : "failed tests";
  const prStatus = incident.pr_url ? "a GitHub pull request has been opened for review" : "incident processing completed";

  return `AUTO-OPS successfully fixed a Python ${errorType} error in ${filename}. The automated fix ${testResult} in a Daytona isolated environment and ${prStatus}. The incident workflow is now complete.`;
}

function simulateVoiceGeneration(incident: Incident): string {
  console.log(`🎭 Simulating voice generation for incident ${incident.id}`);

  // Return a mock data URL for    purposes
  const simulatedAudioUrl = `data:audio/mpeg;base64,mock-audio-${incident.id.slice(0, 8)}`;

  console.log(`Summary text: "${constructSummaryText(incident)}"`);
  console.log(`Mock audio URL: ${simulatedAudioUrl}`);

  return simulatedAudioUrl;
}
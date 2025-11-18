import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import type { Incident } from "./agent";
import { ensureBucketExists } from "./create-bucket";

const s3Client = new S3Client({
  endpoint: process.env.TIGRIS_STORAGE_ENDPOINT || "https://t3.storage.dev",
  region: process.env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: process.env.TIGRIS_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = "auto-ops-incidents";

export async function saveTrigrisIncident(incident: Incident): Promise<void> {
  try {
    // Ensure bucket exists
    await ensureBucketExists();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `incidents/${incident.id}.json`,
      Body: JSON.stringify(incident, null, 2),
      ContentType: "application/json",
    });

    await s3Client.send(command);
    console.log(`Incident ${incident.id} saved to Tigris`);
  } catch (error) {
    console.error(`Error saving incident to Tigris:`, error);
    throw error;
  }
}

export async function getIncident(incidentId: string): Promise<Incident | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `incidents/${incidentId}.json`,
    });

    const response = await s3Client.send(command);
    if (response.Body) {
      const bodyText = await response.Body.transformToString();
      return JSON.parse(bodyText) as Incident;
    }
    return null;
  } catch (error) {
    console.error(`Error getting incident from Tigris:`, error);
    return null;
  }
}

export async function updateIncidentStatus(
  incidentId: string,
  status: Incident["status"]
): Promise<void> {
  try {
    // Get existing incident
    const incident = await getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Update status and timestamp
    incident.status = status;
    incident.updated_at = new Date().toISOString();

    // Save back to Tigris
    await saveTrigrisIncident(incident);
    console.log(`Incident ${incidentId} status updated to: ${status}`);
  } catch (error) {
    console.error(`Error updating incident status:`, error);
    throw error;
  }
}

export async function listIncidents(): Promise<Incident[]> {
  try {
    await ensureBucketExists();

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: "incidents/",
    });

    const response = await s3Client.send(command);
    const incidents: Incident[] = [];

    if (response.Contents) {
      // Get all incident files
      for (const obj of response.Contents) {
        if (obj.Key && obj.Key.endsWith('.json')) {
          const incidentId = obj.Key.replace('incidents/', '').replace('.json', '');
          const incident = await getIncident(incidentId);
          if (incident) {
            incidents.push(incident);
          }
        }
      }
    }

    // Sort by creation date (newest first)
    incidents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return incidents;
  } catch (error) {
    console.error('Error listing incidents:', error);
    // Return empty array on error to avoid breaking the UI
    return [];
  }
}
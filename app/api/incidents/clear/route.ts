import { NextResponse } from "next/server";
import { S3Client, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.TIGRIS_STORAGE_ENDPOINT || "https://t3.storage.dev",
  region: process.env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: process.env.TIGRIS_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = "auto-ops-incidents";

export async function DELETE() {
  try {
    console.log("🗑️ Clearing all incidents from storage...");

    // List all incident files
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: "incidents/",
    });

    const listResponse = await s3Client.send(listCommand);
    let deletedCount = 0;

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      // Delete each incident file
      for (const obj of listResponse.Contents) {
        if (obj.Key) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: obj.Key,
          });

          await s3Client.send(deleteCommand);
          deletedCount++;
          console.log(`Deleted: ${obj.Key}`);
        }
      }
    }

    console.log(`✅ Cleared ${deletedCount} incidents from storage`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${deletedCount} incidents from storage`,
      deleted_count: deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error clearing incidents:", error);
    return NextResponse.json(
      {
        error: "Failed to clear incidents",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
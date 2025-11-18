import { S3Client, CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  endpoint: process.env.TIGRIS_STORAGE_ENDPOINT || "https://t3.storage.dev",
  region: process.env.AWS_REGION || "auto",
  credentials: {
    accessKeyId: process.env.TIGRIS_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.TIGRIS_STORAGE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = "auto-ops-incidents";

export async function ensureBucketExists(): Promise<void> {
  try {
    // Check if bucket exists
    const headCommand = new HeadBucketCommand({ Bucket: BUCKET_NAME });
    await s3Client.send(headCommand);
    console.log(`Bucket ${BUCKET_NAME} already exists`);
  } catch (error) {
    if ((error as any)?.name === "NotFound" || (error as any)?.Code === "NoSuchBucket") {
      try {
        // Create bucket if it doesn't exist
        const createCommand = new CreateBucketCommand({ Bucket: BUCKET_NAME });
        await s3Client.send(createCommand);
        console.log(`Bucket ${BUCKET_NAME} created successfully`);
      } catch (createError) {
        console.error(`Error creating bucket ${BUCKET_NAME}:`, createError);
        throw createError;
      }
    } else {
      console.error(`Error checking bucket ${BUCKET_NAME}:`, error);
      throw error;
    }
  }
}
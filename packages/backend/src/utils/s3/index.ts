import { S3Client } from "@aws-sdk/client-s3";

export const createS3Client = (config: {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}) => {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export type S3 = S3Client;

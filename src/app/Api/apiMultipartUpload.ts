import { getClientSideCookie } from '@/app/Api';

export const LARGE_FILE_UPLOAD_THRESHOLD = 60 * 1024 * 1024;

const PART_SIZE = 20 * 1024 * 1024;

export interface MultipartUploadResult {
  key: string;
  url: string;
  extension: string;
  size: number;
}

const authHeaders = (): Record<string, string> => {
  const token = getClientSideCookie('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getFileExtension = (fileName?: string): string => {
  if (!fileName || !fileName.includes('.')) return '';
  return `.${fileName.split('.').pop()}`;
};

const abortMultipartUpload = (key: string, uploadId: string) => {
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/file/multipart/abort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ Key: key, UploadId: uploadId }),
  }).catch(() => {});
};

/**
 * Uploads a file directly to S3 in chunks via presigned part URLs, bypassing
 * the Cloudflare-tunneled backend entirely for the large binary transfer
 * (Cloudflare caps proxied request bodies at 100MB).
 */
export const uploadFileMultipart = async (file: File): Promise<MultipartUploadResult> => {
  const base = process.env.NEXT_PUBLIC_API_URL;

  const initResponse = await fetch(`${base}/api/file/multipart/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ FileName: file.name, ContentType: file.type || 'application/octet-stream' }),
  });
  if (!initResponse.ok) {
    throw new Error(`Init multipart upload failed with status ${initResponse.status}`);
  }
  const { UploadId: uploadId, Key: key } = await initResponse.json();

  const totalParts = Math.ceil(file.size / PART_SIZE);
  const parts: { PartNumber: number; ETag: string }[] = [];

  try {
    for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      const start = (partNumber - 1) * PART_SIZE;
      const end = Math.min(start + PART_SIZE, file.size);
      const chunk = file.slice(start, end);

      const urlResponse = await fetch(
        `${base}/api/file/multipart/part-url?key=${encodeURIComponent(key)}&uploadId=${encodeURIComponent(uploadId)}&partNumber=${partNumber}`,
        { headers: authHeaders() },
      );
      if (!urlResponse.ok) {
        throw new Error(`Get presigned part URL failed with status ${urlResponse.status}`);
      }
      const { Url: partUrl } = await urlResponse.json();

      const putResponse = await fetch(partUrl, { method: 'PUT', body: chunk });
      if (!putResponse.ok) {
        throw new Error(`Upload part ${partNumber} failed with status ${putResponse.status}`);
      }
      const eTag = putResponse.headers.get('ETag') || putResponse.headers.get('etag');
      if (!eTag) {
        throw new Error(`Missing ETag header for part ${partNumber} (check S3 bucket CORS ExposeHeaders includes ETag)`);
      }

      parts.push({ PartNumber: partNumber, ETag: eTag });
    }
  } catch (err) {
    abortMultipartUpload(key, uploadId);
    throw err;
  }

  const completeResponse = await fetch(`${base}/api/file/multipart/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ Key: key, UploadId: uploadId, Parts: parts }),
  });
  if (!completeResponse.ok) {
    throw new Error(`Complete multipart upload failed with status ${completeResponse.status}`);
  }
  const completeData = await completeResponse.json();

  return {
    key,
    url: completeData.Location,
    extension: getFileExtension(file.name),
    size: file.size,
  };
};

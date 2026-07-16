export const N8N_UPLOAD_SIZE_THRESHOLD = 60 * 1024 * 1024;

export interface N8nUploadResult {
  key: string;
  url: string;
  extension: string;
  size: number;
}

const getFileExtension = (fileName?: string): string => {
  if (!fileName || !fileName.includes('.')) return '';
  return `.${fileName.split('.').pop()}`;
};

export const uploadToN8nWebhook = async (file: File): Promise<N8nUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(process.env.NEXT_PUBLIC_N8N_QUICK_UPLOAD as string, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`N8N upload webhook failed with status ${response.status}`);
  }

  const result = await response.json();
  return {
    key: result.Key,
    url: result.Location,
    extension: getFileExtension(file.name),
    size: file.size,
  };
};

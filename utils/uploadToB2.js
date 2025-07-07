import b2 from '../Config/b2Config.js';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

// Optional: helper to timeout after x ms
export const uploadWithTimeout = (uploadPromise, timeout = 15000) => {
  return Promise.race([
    uploadPromise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Upload timed out (499)")), timeout)
    )
  ]);
};

export const uploadToB2 = async (fileBuffer, originalName, folder = '') => {
  try {
    // Step 1: Authorize
    await b2.authorize();

    // Step 2: Get bucket
    const bucketName = 'smartlifeacademy-audiobooks';
    const { data: bucket } = await b2.getBucket({ bucketName });

    if (!bucket.bucketId) throw new Error('Bucket ID not found');

    // Step 3: Get upload URL
    const { data: uploadUrl } = await b2.getUploadUrl({
      bucketId: bucket.bucketId,
    });

    // Step 4: Generate safe filename
    const uniqueId = uuidv4();
    const rawFileName = `${uniqueId}_${originalName}`;
    const encodedFileName = encodeURIComponent(rawFileName);
    const finalFileName = folder ? `${folder}/${encodedFileName}` : encodedFileName;
    const contentType = mime.lookup(originalName) || 'application/octet-stream';

    // Step 5: Upload file (wrap with timeout)
    await uploadWithTimeout(
      b2.uploadFile({
        uploadUrl: uploadUrl.uploadUrl,
        uploadAuthToken: uploadUrl.authorizationToken,
        fileName: finalFileName,
        data: fileBuffer,
        contentType,
      }),
      15000 // 15 seconds timeout
    );

    // Step 6: Return public URL
    return `https://f005.backblazeb2.com/file/${bucketName}/${finalFileName}`;
  } catch (error) {
    console.error("❌ Upload to B2 failed:", error?.response?.data || error.message);
    throw new Error("Upload to Backblaze B2 failed");
  }
};

import b2 from '../Config/b2Config.js';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

export const uploadToB2 = async (fileBuffer, originalName, folder = '') => {
  try {
    await b2.authorize();

    const bucketName = 'smartlifeacademy-audiobooks';

    // 🔄 Correct way to get bucketId
    const { data: buckets } = await b2.listBuckets();
    const bucket = buckets.buckets.find(b => b.bucketName === bucketName);

    if (!bucket) {
      throw new Error(`Bucket '${bucketName}' not found`);
    }

    const { data: uploadUrl } = await b2.getUploadUrl({ bucketId: bucket.bucketId });

    const uniqueId = uuidv4();
    const extension = mime.extension(mime.lookup(originalName) || 'application/octet-stream');
    const rawFileName = `${uniqueId}_${originalName}`;
    const encodedFileName = encodeURIComponent(rawFileName);
    const finalFileName = folder ? `${folder}/${encodedFileName}` : encodedFileName;

    await b2.uploadFile({
      uploadUrl: uploadUrl.uploadUrl,
      uploadAuthToken: uploadUrl.authorizationToken,
      fileName: finalFileName,
      data: fileBuffer,
      mime: mime.lookup(originalName) || 'application/octet-stream',
    });

    const publicUrl = `https://f005.backblazeb2.com/file/${bucketName}/${finalFileName}`;
    return publicUrl;

  } catch (error) {
    console.error("❌ uploadToB2 error:", error?.response?.data || error.message);
    throw new Error("Upload to Backblaze B2 failed");
  }
};

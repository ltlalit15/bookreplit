// src/utils/uploadToB2.js
import b2 from '../Config/b2Config.js'; // ✅ Required
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

export const uploadToB2 = async (fileBuffer, originalName, folder = '') => {
  try {
    // ✅ Authorize with B2
    await b2.authorize();

    // ✅ Find bucket
    const bucketName = 'smartlifeacademy-audiobooks';
    const { data: buckets } = await b2.listBuckets();
    const bucket = buckets.buckets.find(b => b.bucketName === bucketName);

    if (!bucket) {
      throw new Error(`Bucket '${bucketName}' not found`);
    }

    // ✅ Prepare file details
    const uniqueFileName = `${uuidv4()}_${originalName}`;
    const fileName = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    const contentType = mime.lookup(originalName) || 'application/octet-stream';

    // ✅ Get upload URL & auth token
    const { data: uploadData } = await b2.getUploadUrl({ bucketId: bucket.bucketId });

    // ✅ Upload file
    await b2.uploadFile({
      uploadUrl: uploadData.uploadUrl,
      uploadAuthToken: uploadData.authorizationToken,
      fileName,
      data: fileBuffer,
      contentType,
    });

    // ✅ Return public URL
    return `https://f000.backblazeb2.com/file/${bucketName}/${fileName}`;
  } catch (error) {
    console.error("❌ uploadToB2 error:", error?.response?.data || error.message);
    throw new Error("File upload to Backblaze B2 failed");
  }
};




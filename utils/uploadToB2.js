import b2 from '../Config/b2Config.js';
import { v4 as uuidv4 } from 'uuid';
import mime from 'mime-types';

export const uploadToB2 = async (fileBuffer, originalName, folder = '') => {
  try {
    console.log("📡 Authorizing B2...");
    await b2.authorize();

    const bucketName = 'smartlifeacademy-audiobooks';
    const { data: buckets } = await b2.listBuckets();
    const bucket = buckets.buckets.find(b => b.bucketName === bucketName);

    if (!bucket) throw new Error(`Bucket '${bucketName}' not found`);

    const encodedName = encodeURIComponent(originalName.trim());
    const uniqueFileName = `${uuidv4()}_${encodedName}`;
    const fileName = folder ? `${folder}/${uniqueFileName}` : uniqueFileName;
    const contentType = mime.lookup(originalName) || 'application/octet-stream';

    console.log("🚀 Getting upload URL...");
    const { data: uploadData } = await b2.getUploadUrl({ bucketId: bucket.bucketId });

    console.log(`⬆️ Uploading to: ${fileName}`);
    await b2.uploadFile({
      uploadUrl: uploadData.uploadUrl,
      uploadAuthToken: uploadData.authorizationToken,
      fileName,
      data: fileBuffer,
      contentType,
    });

    // ✅ Return final readable public URL
    const safeFileName = encodeURIComponent(uniqueFileName);
    const safeFolder = folder ? folder.replace(/\/+$/, '') : ''; // remove trailing slash
    const finalPath = safeFolder ? `${safeFolder}/${safeFileName}` : safeFileName;

    const fileUrl = `https://f005.backblazeb2.com/file/${bucketName}/${finalPath}`;
    console.log("✅ Uploaded file URL:", fileUrl);

    return fileUrl;
  } catch (error) {
    console.error("❌ uploadToB2 error:", error?.response?.data || error.message);
    throw new Error("File upload to Backblaze B2 failed");
  }
};

// // 📁 File: Utils/googleDriveUploader.js

// import { google } from 'googleapis';
// import stream from 'stream';
// // import driveAuth from './Config/driveAuth.json';

// import driveAuth from './Config/driveAuth.json' assert { type: 'json' };


// const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// // 🔐 Authenticate with Google Drive using service account
// const auth = new google.auth.JWT(
//   driveAuth.client_email,
//   null,
//   driveAuth.private_key,
//   SCOPES
// );

// // 📦 Google Drive client instance
// const drive = google.drive({ version: 'v3', auth });

// // 📤 Upload function
// export const googleDriveUploader = async (fileBuffer, fileName, mimeType, folderId) => {
//   const bufferStream = new stream.PassThrough();
//   bufferStream.end(fileBuffer);

//   try {
//     const { data } = await drive.files.create({
//       requestBody: {
//         name: fileName,
//         parents: [folderId], // ✅ Target Google Drive folder
//       },
//       media: {
//         mimeType,
//         body: bufferStream,
//       },
//       fields: 'id, webViewLink, webContentLink', // Return useful info
//     });

//     return {
//       success: true,
//       fileId: data.id,
//       webViewLink: data.webViewLink,
//       webContentLink: data.webContentLink,
//     };
//   } catch (err) {
//     console.error('Drive upload failed:', err.message);
//     return { success: false, error: err.message };
//   }
// };


// googleDriveUploader.js
import { google } from 'googleapis';
import stream from 'stream';
import fs from 'fs/promises';

const driveAuth = JSON.parse(
  await fs.readFile(new URL('./Config/driveAuth.json', import.meta.url), 'utf-8')
);

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const auth = new google.auth.JWT(
  driveAuth.client_email,
  null,
  driveAuth.private_key,
  SCOPES
);

const drive = google.drive({ version: 'v3', auth });

export const googleDriveUploader = async (fileBuffer, fileName, mimeType, folderId) => {
  const bufferStream = new stream.PassThrough();
  bufferStream.end(fileBuffer);

  try {
    const { data } = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: bufferStream,
      },
      fields: 'id, webViewLink, webContentLink',
    });

    return {
      success: true,
      fileId: data.id,
      webViewLink: data.webViewLink,
      webContentLink: data.webContentLink,
    };
  } catch (err) {
    console.error('Drive upload failed:', err.message);
    return { success: false, error: err.message };
  }
};

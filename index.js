import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import routes from "./app.js";
import multer from "multer";
import cookieParser from "cookie-parser";
import './cron/dailyEmailSender.js';


dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cookieParser());

// ✅ Fix `__dirname` for ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Set absolute path for uploads folder
// const uploadDir = path.join("./uploads"); // veni
// ✅ Use existing "uploads" folder (no new folder creation)    


// ✅ Define `uploadDir` correctly
const uploadDir = path.join(__dirname, "uploads");

// ✅ Ensure "uploads" folder exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true }); // ✅ Create if not exists
    console.log("✅ Uploads folder created!");
} else {
    console.log("✅ Uploads folder exists!");
}


// ✅ Serve static files from "uploads" folder
app.use("/uploads", express.static(uploadDir));

// ✅ Multer Configuration for Multiple File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // ✅ Use the existing "uploads" folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // ✅ Unique filename
    }
});

const upload = multer({ storage: storage });

// ✅ Proper CORS Configuration
app.use(
    cors({
        origin: "*", // Sabhi origins allowed hain
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // ✅ Specific HTTP methods allow kar rahe hain
        allowedHeaders: ["Content-Type", "Authorization"], // ✅ Required headers allow karein
        credentials: true, // ✅ Agar cookies allow karni hain
    })
);

app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

app.use(routes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

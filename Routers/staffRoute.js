import express from "express";
import {
    staffLogin,
 
    getstaff,
    getallstaffs,
    deletestaff,
    updatestaff,
} from "../Controllers/staffCtrl.js";

const router = express.Router();
// router.post("/logins",staffLogin)
// router.post("/staff", createstaff);
router.get("/staffs", getallstaffs);
router.get("/staff/:id", getstaff);
router.put("/staff/:id", updatestaff);
router.delete("/staff/:id", deletestaff);

export default router;
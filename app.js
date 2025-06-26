import { Router } from "express";
import UserRoutes from "./Routers/AuthRoute.js";
import stafRoutes from "./Routers/staffRoute.js";



const router = Router();

router.use("/api/v1", UserRoutes);
router.use("/api/v1", stafRoutes);


export default router;

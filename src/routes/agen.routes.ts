import express from "express";
import AgentController from "../controllers/agent.controller";

const router = express.Router();

router.post("/onboard", AgentController.onboardAgent);
router.put("/toggle/:id", AgentController.toogleAgentState);

export default router;

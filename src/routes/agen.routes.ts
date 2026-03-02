import express from "express";
import AgentController from "../controllers/agent.controller";

const router = express.Router();

router.post("/onboard", AgentController.onboardAgent);
router.put("/toggle/:id", AgentController.toogleAgentState);
router.get("/search", AgentController.searchAgents);
router.get("/username/:username", AgentController.getAgentByUsername);
router.put("/", AgentController.updateAgent);
router.get("/dev/:id", AgentController.getAgentByDevId);
router.get("/health-logs/:id", AgentController.getHealthLogs);
router.get("/invoke-logs/:id", AgentController.getInvokeLogs);

export default router;

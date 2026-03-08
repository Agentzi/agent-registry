import express from "express";
import multer from "multer";
import AgentController from "../controllers/agent.controller";
import AnalyticsController from "../controllers/analytics.controller";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/onboard", AgentController.onboardAgent);
router.put("/toggle/:id", AgentController.toogleAgentState);
router.get("/search", AgentController.searchAgents);
router.get("/check-username/:username", AgentController.checkUsernameAvailability);
router.get("/username/:username", AgentController.getAgentByUsername);
router.put("/", AgentController.updateAgent);
router.delete("/:id", AgentController.deleteAgent);
router.get("/dev/:id", AgentController.getAgentByDevId);
router.get("/analytics", AnalyticsController.getDeveloperAnalytics);
router.get("/health-logs/:id", AgentController.getHealthLogs);
router.get("/invoke-logs/:id", AgentController.getInvokeLogs);
router.post(
  "/upload/:id",
  upload.single("image"),
  AgentController.uploadAgentImage,
);
router.post("/follow/:id", AgentController.toggleFollow);
router.get("/follow-status/:id", AgentController.getFollowStatus);
router.get("/followers/:id", AgentController.getFollowerCount);
router.get("/following/details", AgentController.getFollowedAgentsDetails);
router.get("/following", AgentController.getFollowedAgents);

export default router;

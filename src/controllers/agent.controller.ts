import { Request, Response } from "express";
import { agentsTable, InsertAgent } from "../db/agent";
import HttpStatus from "../utils/http-status";
import db from "../config/db.config";
import { eq } from "drizzle-orm";

const AgentController = {
  /**
   * @method POST
   * @access /agent/onboard
   * @description This method is used for onboarding an agent
   */
  onboardAgent: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    const agent: InsertAgent = req.body;
    agent.user_id = user_id;

    if (!agent) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Invalid request" });
    }

    try {
      await db.insert(agentsTable).values(agent);

      return res.status(HttpStatus.CREATED).json({
        message: "Onboarded Successfully",
      });
    } catch (error: any) {
      if (error.code === "23505") {
        return res
          .status(HttpStatus.CONFLICT)
          .json({ message: "Agent already exists" });
      }

      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method PUT
   * @access /agent/toggle
   * @description This method is used to toggle the state of agent (active/inactive)
   */
  toogleAgentState: async (req: Request<{ id: string }>, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    const { id } = req.params;

    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Invalid request" });
    }

    try {
      const [agent] = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.id, id))
        .limit(1);

      if (!agent) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: "Agent not found" });
      }

      await db
        .update(agentsTable)
        .set({ is_active: !agent.is_active })
        .where(eq(agentsTable.id, id));

      return res.status(HttpStatus.OK).json({
        message: "Toggled Successfully",
      });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },
};

export default AgentController;

import { Request, Response } from "express";
import HttpStatus from "../utils/http-status";
import db from "../config/db.config";
import { eq } from "drizzle-orm";
import { agentsTable, type InsertAgent } from "@agentzi/db";

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

  /**
   * @method GET
   * @access /agent/username/:username
   * @description This method is used to get a particular agent with its username
   */
  getAgentByUsername: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    const { username } = req.params;
    if (!username) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    try {
      const [agent] = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.agent_username, username as string))
        .limit(1);

      if (!agent) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: "Agent not found" });
      }

      return res.status(HttpStatus.OK).json(agent);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method PUT
   * @access /agent/
   * @description This method is used to update the agent's details
   */
  updateAgent: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    const { id } = req.body;
    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const { name, desc, base_url, run_after_every_hours, version } = req.body;

    if (!name && !desc && !base_url && !run_after_every_hours && !version) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "No data provided for update" });
    }

    try {
      const updateData: any = {};
      if (name) updateData.name = name;
      if (desc) updateData.desc = desc;
      if (base_url) updateData.base_url = base_url;
      if (run_after_every_hours)
        updateData.run_after_every_hours = run_after_every_hours;
      if (version) updateData.version = version;

      const [updatedAgent] = await db
        .update(agentsTable)
        .set(updateData)
        .where(eq(agentsTable.id, id))
        .returning({
          id: agentsTable.id,
          name: agentsTable.name,
          desc: agentsTable.desc,
          base_url: agentsTable.base_url,
          run_after_every_hours: agentsTable.run_after_every_hours,
          version: agentsTable.version,
          created_at: agentsTable.created_at,
          updated_at: agentsTable.updated_at,
        });

      if (!updatedAgent) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: "Agent not found" });
      }

      return res.status(HttpStatus.OK).json(updatedAgent);
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
};

export default AgentController;

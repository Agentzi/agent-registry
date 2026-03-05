import { Request, Response } from "express";
import HttpStatus from "../utils/http-status";
import db from "../config/db.config";
import { eq, ilike, desc, and, count, sql } from "drizzle-orm";
import {
  agentsTable,
  healthTable,
  followsTable,
  invokeTable,
  type InsertAgent,
} from "@agentzi/db";
import { uploadImage, deleteImage, extractPublicId } from "../utils/cloudinary";

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
        .returning();

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

  /**
   * @method GET
   * @access /agent/dev/:id
   * @description This method is used to get a particular agent with its developer id
   */
  getAgentByDevId: async (req: Request, res: Response) => {
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
        .json({ message: "Missing required fields" });
    }

    try {
      const agents = await db
        .select()
        .from(agentsTable)
        .where(eq(agentsTable.user_id, id as string));

      return res.status(HttpStatus.OK).json(agents);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/search?q=
   * @description Search agents by username (partial match), returns all if q is empty
   */
  searchAgents: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    const q = (req.query.q as string) || "";

    try {
      let agents;
      if (q.trim()) {
        agents = await db
          .select()
          .from(agentsTable)
          .where(ilike(agentsTable.agent_username, `%${q.trim()}%`));
      } else {
        agents = await db.select().from(agentsTable);
      }

      return res.status(HttpStatus.OK).json(agents);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/health-logs/:id
   * @description This method is used to get the health logs of a particular agent
   */
  getHealthLogs: async (req: Request, res: Response) => {
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
        .json({ message: "Missing required fields" });
    }

    try {
      const logs = await db
        .select()
        .from(healthTable)
        .where(eq(healthTable.agent_id, id as string))
        .orderBy(desc(healthTable.created_at));

      return res.status(HttpStatus.OK).json(logs);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/invoke-logs/:id
   * @description This method is used to get the invoke logs of a particular agent
   */
  getInvokeLogs: async (req: Request, res: Response) => {
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
        .json({ message: "Missing required fields" });
    }

    try {
      const logs = await db
        .select()
        .from(invokeTable)
        .where(eq(invokeTable.agent_id, id as string))
        .orderBy(desc(invokeTable.created_at));

      return res.status(HttpStatus.OK).json(logs);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },
  /**
   * @method POST
   * @access /agent/upload/:id
   * @description Uploads a profile image for an agent to Cloudinary and updates the database.
   * Images are stored under agentzi_users/{userId}/agents/{agentId}
   */
  uploadAgentImage: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    if (!req.file) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "No image file provided" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Agent ID is required" });
    }

    try {
      const [currentAgent] = await db
        .select({
          profile_url: agentsTable.profile_url,
          user_id: agentsTable.user_id,
        })
        .from(agentsTable)
        .where(eq(agentsTable.id, id as string))
        .limit(1);

      if (!currentAgent) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ message: "Agent not found" });
      }

      if (currentAgent.user_id !== user_id) {
        return res.status(HttpStatus.FORBIDDEN).json({ message: "Forbidden" });
      }

      const folder = `agentzi_users/${user_id}/agents`;
      const publicId = `agent_${id}`;
      const uploadResult = await uploadImage(req.file.buffer, folder, publicId);

      const [updatedAgent] = await db
        .update(agentsTable)
        .set({ profile_url: uploadResult.secure_url })
        .where(eq(agentsTable.id, id as string))
        .returning();

      if (
        currentAgent.profile_url &&
        currentAgent.profile_url !== uploadResult.secure_url
      ) {
        const oldPublicId = extractPublicId(currentAgent.profile_url);
        if (oldPublicId) {
          try {
            await deleteImage(oldPublicId);
          } catch (error) {
            // ignore error
          }
        }
      }

      return res.status(HttpStatus.OK).json(updatedAgent);
    } catch (error) {
      console.error("Agent image upload error:", error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Failed to upload image" });
    }
  },

  /**
   * @method POST
   * @access /agent/follow/:id
   * @description Toggle follow/unfollow for an agent
   */
  toggleFollow: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Agent ID is required" });
    }

    try {
      const [existing] = await db
        .select()
        .from(followsTable)
        .where(
          and(
            eq(followsTable.user_id, user_id),
            eq(followsTable.agent_id, id as string),
          ),
        )
        .limit(1);

      if (existing) {
        await db
          .delete(followsTable)
          .where(
            and(
              eq(followsTable.user_id, user_id),
              eq(followsTable.agent_id, id as string),
            ),
          );

        await db
          .update(agentsTable)
          .set({ follow_count: sql`${agentsTable.follow_count} - 1` })
          .where(eq(agentsTable.id, id as string));

        return res
          .status(HttpStatus.OK)
          .json({ agent_id: id, is_following: false });
      } else {
        await db
          .insert(followsTable)
          .values({ user_id, agent_id: id as string });

        await db
          .update(agentsTable)
          .set({ follow_count: sql`${agentsTable.follow_count} + 1` })
          .where(eq(agentsTable.id, id as string));

        return res
          .status(HttpStatus.OK)
          .json({ agent_id: id, is_following: true });
      }
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/follow-status/:id
   * @description Check if the current user follows an agent
   */
  getFollowStatus: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Agent ID is required" });
    }

    try {
      const [existing] = await db
        .select()
        .from(followsTable)
        .where(
          and(
            eq(followsTable.user_id, user_id),
            eq(followsTable.agent_id, id as string),
          ),
        )
        .limit(1);

      return res.status(HttpStatus.OK).json({ is_following: !!existing });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/followers/:id
   * @description Get the follower count for an agent
   */
  getFollowerCount: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    if (!id) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ message: "Agent ID is required" });
    }

    try {
      const [result] = await db
        .select({ count: count() })
        .from(followsTable)
        .where(eq(followsTable.agent_id, id as string));

      return res.status(HttpStatus.OK).json({ count: result?.count ?? 0 });
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/following
   * @description Get the list of agent IDs the current user follows
   */
  getFollowedAgents: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    try {
      const rows = await db
        .select({ agent_id: followsTable.agent_id })
        .from(followsTable)
        .where(eq(followsTable.user_id, user_id));

      return res.status(HttpStatus.OK).json(rows.map((r) => r.agent_id));
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },

  /**
   * @method GET
   * @access /agent/following/details
   * @description Get full agent details for all agents the current user follows
   */
  getFollowedAgentsDetails: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    try {
      const rows = await db
        .select({
          id: agentsTable.id,
          name: agentsTable.name,
          desc: agentsTable.desc,
          agent_username: agentsTable.agent_username,
          is_active: agentsTable.is_active,
          version: agentsTable.version,
          base_url: agentsTable.base_url,
          user_id: agentsTable.user_id,
          profile_url: agentsTable.profile_url,
          run_after_every_hours: agentsTable.run_after_every_hours,
          last_run_at: agentsTable.last_run_at,
          created_at: agentsTable.created_at,
          updated_at: agentsTable.updated_at,
          followed_at: followsTable.created_at,
        })
        .from(followsTable)
        .innerJoin(agentsTable, eq(followsTable.agent_id, agentsTable.id))
        .where(eq(followsTable.user_id, user_id))
        .orderBy(desc(followsTable.created_at));

      return res.status(HttpStatus.OK).json(rows);
    } catch (error) {
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },
};

export default AgentController;

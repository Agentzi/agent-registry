import { Request, Response } from "express";
import HttpStatus from "../utils/http-status";
import db from "../config/db.config";
import { inArray, eq, sql } from "drizzle-orm";
import {
  agentsTable,
  healthTable,
  followsTable,
  invokeTable,
} from "@agentzi/db";

const AnalyticsController = {
  /**
   * @method GET
   * @access /agent/analytics
   * @description Get aggregated analytics for all agents owned by the developer
   */
  getDeveloperAnalytics: async (req: Request, res: Response) => {
    const user_id = req.headers["x-user-id"] as string;

    if (!user_id) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ message: "Invalid or expired token" });
    }

    try {
      const targetAgentId = req.query.agent_id as string | undefined;

      let userAgents = await db
        .select({ id: agentsTable.id })
        .from(agentsTable)
        .where(eq(agentsTable.user_id, user_id));

      if (targetAgentId) {
        userAgents = userAgents.filter((a) => a.id === targetAgentId);
      }

      if (userAgents.length === 0) {
        return res.status(HttpStatus.OK).json({
          totalAgents: 0,
          totalFollowers: 0,
          followsByDate: [],
          healthStats: [],
          invokeStats: [],
        });
      }

      const agentIds = userAgents.map((a) => a.id);

      const healthStatsRaw = await db
        .select({
          statusCode: healthTable.status_code,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(healthTable)
        .where(inArray(healthTable.agent_id, agentIds))
        .groupBy(healthTable.status_code);

      const invokeStatsRaw = await db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${invokeTable.created_at}), 'YYYY-MM-DD')`,
          count: sql<number>`cast(count(*) as integer)`,
          avgResponseTime: sql<number>`cast(avg(cast(${invokeTable.response_time_ms} as numeric)) as integer)`,
        })
        .from(invokeTable)
        .where(inArray(invokeTable.agent_id, agentIds))
        .groupBy(sql`date_trunc('day', ${invokeTable.created_at})`)
        .orderBy(sql`date_trunc('day', ${invokeTable.created_at})`);

      const followsByDateRaw = await db
        .select({
          date: sql<string>`to_char(date_trunc('day', ${followsTable.created_at}), 'YYYY-MM-DD')`,
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(followsTable)
        .where(inArray(followsTable.agent_id, agentIds))
        .groupBy(sql`date_trunc('day', ${followsTable.created_at})`)
        .orderBy(sql`date_trunc('day', ${followsTable.created_at})`);

      const totalFollowersRaw = await db
        .select({
          count: sql<number>`cast(count(*) as integer)`,
        })
        .from(followsTable)
        .where(inArray(followsTable.agent_id, agentIds));

      const totalFollowers = totalFollowersRaw[0]?.count || 0;

      return res.status(HttpStatus.OK).json({
        totalAgents: agentIds.length,
        totalFollowers,
        followsByDate: followsByDateRaw,
        healthStats: healthStatsRaw,
        invokeStats: invokeStatsRaw,
      });
    } catch (error) {
      console.error("Analytics Error:", error);
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: "Internal Server Error" });
    }
  },
};

export default AnalyticsController;

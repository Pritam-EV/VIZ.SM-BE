import { Router } from 'express';
import type { Request, Response } from 'express';
import { User } from '../../../Shared/Data/MongoDB/Models/User.js';
import Support from '../../../Shared/Data/MongoDB/Models/Support.js';
import authenticateUser from "../Middlewares/UserAuthentication.js";

const router = Router();

// Extend Express Request to include what auth middleware adds
interface AuthenticatedRequest extends Request {
  userId?: string;   // set by authenticateUser
  user?: any;        // if you also attach a full user object
}

// POST /api/support/raiseTicket
router.post(
  '/raiseTicket',
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("📩 /api/support/raiseTicket body:", req.body);
      console.log("👤 Auth user on request:", req.user);

      const { issueType, description, attachmentName } = req.body;
      const userId = req.userId;

      if (!issueType || !description) {
        return res.status(400).json({
          success: false,
          error: 'Issue type and description are required',
        });
      }

      if (description.length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Description must be at least 10 characters',
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated (userId missing on request)',
        });
      }

      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const ticketNumber = `TKT${timestamp}${random}`;

      const supportTicket = new Support({
        userId,
        ticketNumber,
        issueType,
        description,
        attachmentName: attachmentName || null,
        status: 'Open',
        priority: 'Medium',
        timeline: [
          {
            timestamp: new Date(),
            status: 'Ticket Created',
            description: 'Your support ticket has been created',
          },
        ],
      });

      await supportTicket.save();

      return res.status(201).json({
        success: true,
        ticketNumber,
        ticketId: supportTicket._id,
        message: 'Support ticket created successfully',
        data: {
          ticketNumber,
          status: supportTicket.status,
          createdAt: supportTicket.createdAt,
        },
      });
    } catch (err) {
      console.error("❌ Error in /api/support/raiseTicket:", err);
      return res.status(500).json({
        success: false,
        error: 'Failed to raise support ticket',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);

// GET /api/support/getTickets
router.get(
  '/getTickets',
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated (userId missing on request)',
        });
      }

      const tickets = await Support.find({ userId }).sort({ createdAt: -1 }).exec();

      return res.status(200).json({
        success: true,
        tickets,
        count: tickets.length,
      });
    } catch (err) {
      console.error("❌ Error in /api/support/getTickets:", err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch tickets',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);

// GET /api/support/getTicket/:ticketNumber
router.get(
  '/getTicket/:ticketNumber',
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketNumber } = req.params;
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated (userId missing on request)',
        });
      }

      const ticket = await Support.findOne({ ticketNumber, userId });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      }

      return res.status(200).json({
        success: true,
        ticket,
      });
    } catch (err) {
      console.error("❌ Error in /api/support/getTicket:", err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch ticket',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);

// PATCH /api/support/updateStatus/:ticketNumber (admin only)
router.patch(
  '/updateStatus/:ticketNumber',
  authenticateUser,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ticketNumber } = req.params;
      const { status, adminNotes } = req.body;

      const ticket = await Support.findOne({ ticketNumber });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
        });
      }

      ticket.timeline.push({
        timestamp: new Date(),
        status: status || 'In Progress',
        description: adminNotes || `Status updated to ${status}`,
      });

      ticket.status = status || ticket.status;
      if (status === 'Resolved') {
        ticket.resolvedAt = new Date();
      }

      await ticket.save();

      return res.status(200).json({
        success: true,
        message: 'Ticket updated successfully',
        ticket,
      });
    } catch (err) {
      console.error("❌ Error in /api/support/updateStatus:", err);
      return res.status(500).json({
        success: false,
        error: 'Failed to update ticket',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
);

export default router;

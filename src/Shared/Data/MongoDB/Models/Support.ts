import mongoose, { Schema, Document } from 'mongoose';

interface SupportTimeline {
  timestamp: Date;
  status: 'Ticket Created' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;
  adminNotes?: string;
}

export interface ISupport extends Document {
  _id: string;
  userId: string;
  ticketNumber: string;
  issueType: string;
  description: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: 'Open' | 'Pending' | 'In Progress' | 'Resolved' | 'Closed';
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  timeline: SupportTimeline[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const SupportSchema = new Schema<ISupport>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    issueType: {
      type: String,
      required: true,
      enum: [
        'Device not working',
        'POOL positive but device OFF',
        'Refunds related',
        'Withdraw WALLET',
        'Account related',
        'Raise consumption dispute',
        'Other',
      ],
    },
    description: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 5000,
    },
    attachmentUrl: {
      type: String,
      default: null,
    },
    attachmentName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['Open', 'Pending', 'In Progress', 'Resolved', 'Closed'],
      default: 'Open',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    timeline: [
      {
        timestamp: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: [
            'Ticket Created',
            'Assigned',
            'In Progress',
            'Resolved',
            'Closed',
          ],
        },
        description: {
          type: String,
          required: true,
        },
        adminNotes: {
          type: String,
          default: null,
        },
      },
    ],
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

SupportSchema.index({ userId: 1, createdAt: -1 });
SupportSchema.index({ status: 1 });
SupportSchema.index({ ticketNumber: 1 });

export default mongoose.model<ISupport>('Support', SupportSchema);

import { z } from "zod";

/**
 * Validation schema for creating a message
 */
export const createMessageSchema = z.object({
  clientId: z.string().uuid("Invalid client ID format"),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
  sentAt: z.string().datetime("Invalid timestamp format"),
  sequence: z.number().int().min(1, "Sequence must be >= 1"),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

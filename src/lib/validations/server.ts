// Server validation schemas - shared between frontend and backend
// Ensures consistent validation rules across the application

import { z } from "zod";

/**
 * Create Server validation schema
 * - Name: 3-100 characters, trimmed
 * - isRestricted: Optional boolean (defaults to false)
 */
export const createServerSchema = z.object({
  name: z
    .string()
    .min(3, "Server name must be at least 3 characters")
    .max(100, "Server name must be 100 characters or less")
    .trim(),
  isRestricted: z.boolean().optional().default(false),
});

/**
 * Update Server validation schema
 * - Name: Optional, 3-100 characters if provided
 * - isRestricted: Optional boolean
 * - At least one field must be provided
 */
export const updateServerSchema = z
  .object({
    name: z
      .string()
      .min(3, "Server name must be at least 3 characters")
      .max(100, "Server name must be 100 characters or less")
      .trim()
      .optional(),
    isRestricted: z.boolean().optional(),
  })
  .refine((data) => data.name !== undefined || data.isRestricted !== undefined, {
    message: "At least one field must be provided",
  });

// Type inference for TypeScript
export type CreateServerInput = z.infer<typeof createServerSchema>;
export type UpdateServerInput = z.infer<typeof updateServerSchema>;

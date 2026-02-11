import { z } from "zod";

/**
 * Update Member Role validation schema
 * - Role: Must be MODERATOR or GUEST (OWNER is immutable)
 */
export const updateMemberRoleSchema = z.object({
  role: z.enum(["MODERATOR", "GUEST"], {
    errorMap: () => ({ message: "Role must be MODERATOR or GUEST" }),
  }),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

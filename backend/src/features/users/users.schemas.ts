import { Role } from "@prisma/client";
import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .trim()
    .optional(),
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be less than 50 characters")
    .trim()
    .optional(),
  image: z
    .string()
    .url("Profile picture must be a valid URL")
    .optional()
    .nullable(),
});

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;

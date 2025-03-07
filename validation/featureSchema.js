import { z } from "zod";

export const featureSchema = z.object({
  name: z.string()
    .min(1, "Feature name is required")
    .max(100, "Feature name must be 100 characters or less")
    .trim()
}); 
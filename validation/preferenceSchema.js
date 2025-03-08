import { z } from "zod";

export const preferenceSchema = z.object({
  key: z.string().min(1, "Preference key is required"),
  value: z.any()
});

export const preferenceKeySchema = z.object({
  key: z.string().min(1, "Preference key is required")
}); 
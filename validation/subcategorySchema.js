import { z } from "zod";

export const subcategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.number().int().positive("Category ID must be a positive integer")
}); 
import { z } from "zod";

// ── Auth schemas ──────────────────────────────────────────────────

export const RegisterSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),

  email: z
    .string({ required_error: "Email is required" })
    .email("Invalid email format")
    .toLowerCase(),

  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  role: z.enum(["user", "admin"]).default("user"),
});

export const LoginSchema = z.object({
  email:    z.string({ required_error: "Email is required" }).email().toLowerCase(),
  password: z.string({ required_error: "Password is required" }).min(1),
});

// ── Task schemas ──────────────────────────────────────────────────

export const CreateTaskSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .min(1, "Title cannot be empty")
    .max(255, "Title must be under 255 characters")
    .trim(),

  description: z
    .string()
    .max(5000, "Description must be under 5000 characters")
    .optional()
    .nullable(),

  status: z
    .enum(["todo", "in_progress", "done"], {
      errorMap: () => ({ message: "Status must be: todo, in_progress, or done" }),
    })
    .default("todo"),

  priority: z
    .enum(["low", "medium", "high"], {
      errorMap: () => ({ message: "Priority must be: low, medium, or high" }),
    })
    .default("medium"),

  due_date: z
    .string()
    .datetime({ message: "due_date must be a valid ISO 8601 datetime", offset: true })
    .optional()
    .nullable(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

// ── Exported types ────────────────────────────────────────────────

export type RegisterInput  = z.infer<typeof RegisterSchema>;
export type LoginInput     = z.infer<typeof LoginSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

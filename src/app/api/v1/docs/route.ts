/**
 * GET /api/v1/docs
 *
 * Serves the full OpenAPI 3.0 specification as JSON.
 * Consumed by the Swagger UI page at /api-docs.
 */
import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Primetrade Task Manager API",
    version: "1.0.0",
    description:
      "Scalable REST API with JWT authentication and role-based access control (user / admin).\n\n" +
      "**How to authenticate:** Call `/api/v1/auth/login`, copy the `token` from the response, " +
      "click **Authorize** above, and paste it as `Bearer <token>`.",
    contact: { name: "Primetrade.ai", email: "hello@primetrade.ai" },
  },
  servers: [
    { url: "/api/v1", description: "Version 1 (current)" },
  ],
  tags: [
    { name: "Auth",  description: "Registration and login — no token required" },
    { name: "Users", description: "Authenticated user profile" },
    { name: "Tasks", description: "Task CRUD — each user sees only their own tasks" },
    { name: "Admin", description: "Admin-only endpoints — requires role: admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the JWT token received from /auth/login",
      },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id:         { type: "integer", example: 1 },
          name:       { type: "string",  example: "Alice Smith" },
          email:      { type: "string",  format: "email", example: "alice@example.com" },
          role:       { type: "string",  enum: ["user", "admin"] },
          created_at: { type: "string",  format: "date-time" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id:          { type: "integer", example: 42 },
          user_id:     { type: "integer", example: 1 },
          title:       { type: "string",  example: "Implement auth module" },
          description: { type: "string",  nullable: true },
          status:      { type: "string",  enum: ["todo", "in_progress", "done"] },
          priority:    { type: "string",  enum: ["low", "medium", "high"] },
          due_date:    { type: "string",  format: "date-time", nullable: true },
          created_at:  { type: "string",  format: "date-time" },
          updated_at:  { type: "string",  format: "date-time" },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data:    { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          errors:  { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name:     { type: "string", minLength: 2, example: "Alice Smith" },
                  email:    { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", minLength: 8, example: "Secret123" },
                  role:     { type: "string", enum: ["user", "admin"], default: "user" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "User registered. Returns user object + JWT token." },
          "400": { description: "Validation error" },
          "409": { description: "Email already registered" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive a JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email:    { type: "string", format: "email", example: "alice@example.com" },
                  password: { type: "string", example: "Secret123" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Login successful. Returns user object + JWT token." },
          "401": { description: "Invalid email or password" },
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Users"],
        summary: "Get current authenticated user's profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "User profile object" },
          "401": { description: "Missing or invalid token" },
        },
      },
    },
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks for the authenticated user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: "query", name: "status", required: false,
            schema: { type: "string", enum: ["todo", "in_progress", "done"] },
            description: "Filter by task status",
          },
          {
            in: "query", name: "priority", required: false,
            schema: { type: "string", enum: ["low", "medium", "high"] },
            description: "Filter by priority",
          },
        ],
        responses: {
          "200": { description: "Array of task objects" },
          "401": { description: "Unauthorized" },
        },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a new task",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title:       { type: "string", example: "Design database schema" },
                  description: { type: "string", example: "ERD + MySQL DDL for users and tasks" },
                  status:      { type: "string", enum: ["todo", "in_progress", "done"], default: "todo" },
                  priority:    { type: "string", enum: ["low", "medium", "high"], default: "medium" },
                  due_date:    { type: "string", format: "date-time", example: "2026-04-30T18:00:00Z" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Task created. Returns the new task object." },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get a single task by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Task object" },
          "403": { description: "Task belongs to another user" },
          "404": { description: "Task not found" },
        },
      },
      put: {
        tags: ["Tasks"],
        summary: "Update a task (partial update — all fields optional)",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title:       { type: "string" },
                  description: { type: "string" },
                  status:      { type: "string", enum: ["todo", "in_progress", "done"] },
                  priority:    { type: "string", enum: ["low", "medium", "high"] },
                  due_date:    { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Updated task object" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" },
        },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Delete a task",
        security: [{ bearerAuth: [] }],
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: {
          "200": { description: "Task deleted successfully" },
          "403": { description: "Forbidden" },
          "404": { description: "Not found" },
        },
      },
    },
    "/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "List all registered users — ADMIN ONLY",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Array of all user objects" },
          "403": { description: "Requires admin role" },
        },
      },
    },
    "/admin/tasks": {
      get: {
        tags: ["Admin"],
        summary: "List all tasks across all users — ADMIN ONLY",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": { description: "Array of all tasks with user_name and user_email joined" },
          "403": { description: "Requires admin role" },
        },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

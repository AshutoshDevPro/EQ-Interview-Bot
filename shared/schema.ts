import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  firstName: true,
  lastName: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const interviewRecords = pgTable("interview_records", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  emotionLabel: text("emotion_label").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInterviewRecordSchema = createInsertSchema(interviewRecords).pick({
  userId: true,
  emotionLabel: true,
  confidenceScore: true,
  detectedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type InsertInterviewRecord = z.infer<typeof insertInterviewRecordSchema>;
export type InterviewRecord = typeof interviewRecords.$inferSelect;

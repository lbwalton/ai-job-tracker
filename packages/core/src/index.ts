import { z } from "zod";

// ---------------------------------------------------------------------------
// Job statuses
// ---------------------------------------------------------------------------

export const JOB_STATUSES = [
  "Saved",
  "Applied",
  "Assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

/** Statuses that mean the application is no longer in play. */
export const TERMINAL_STATUSES: JobStatus[] = ["Rejected", "Withdrawn"];

/**
 * Rank used to prevent automatic downgrades (e.g. a late confirmation email
 * must not move an application back from Interview to Applied).
 */
export const STATUS_RANK: Record<JobStatus, number> = {
  Saved: 0,
  Applied: 1,
  Assessment: 2,
  Interview: 3,
  Offer: 4,
  Rejected: 5,
  Withdrawn: 5,
};

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export const jobSchema = z.object({
  id: z.number(),
  company: z.string(),
  jobTitle: z.string(),
  location: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  salaryRange: z.string().nullable(),
  jobType: z.string().nullable(),
  experience: z.string().nullable(),
  skills: z.string().nullable(),
  emailDomain: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  dateAdded: z.string(),
  dateApplied: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Job = z.infer<typeof jobSchema>;

export const newJobSchema = jobSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial()
  .extend({
    company: z.string().min(1),
    jobTitle: z.string().min(1),
  });

export type NewJob = z.infer<typeof newJobSchema>;

// ---------------------------------------------------------------------------
// AI job parsing (structured output schema sent to Claude)
// ---------------------------------------------------------------------------

export const parsedJobSchema = z.object({
  company: z.string(),
  jobTitle: z.string(),
  location: z.string().nullable(),
  salaryRange: z.string().nullable(),
  jobType: z.string().nullable(),
  experience: z.string().nullable(),
  skills: z.string().nullable(),
  emailDomain: z.string().nullable(),
  description: z.string().nullable(),
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;

/** JSON Schema mirror of parsedJobSchema, for the Claude structured-output API. */
export const PARSED_JOB_JSON_SCHEMA = {
  type: "object",
  properties: {
    company: { type: "string", description: "Company name" },
    jobTitle: { type: "string", description: "Job title / position" },
    location: {
      type: ["string", "null"],
      description: "Location, including Remote/Hybrid if stated",
    },
    salaryRange: {
      type: ["string", "null"],
      description: "Salary or compensation range if stated",
    },
    jobType: {
      type: ["string", "null"],
      description: "Full-time, part-time, contract, internship, etc.",
    },
    experience: {
      type: ["string", "null"],
      description: "Experience level or years required",
    },
    skills: {
      type: ["string", "null"],
      description: "Comma-separated key skills and technologies",
    },
    emailDomain: {
      type: ["string", "null"],
      description:
        "Company email domain guessed from the posting (e.g. acme.com), null if unknown",
    },
    description: {
      type: ["string", "null"],
      description: "2-3 sentence summary of the role",
    },
  },
  required: [
    "company",
    "jobTitle",
    "location",
    "salaryRange",
    "jobType",
    "experience",
    "skills",
    "emailDomain",
    "description",
  ],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Email classification
// ---------------------------------------------------------------------------

export const EMAIL_CATEGORIES = [
  "application_confirmation",
  "assessment_invite",
  "interview_invite",
  "offer",
  "rejection",
  "recruiter_outreach",
  "other_job_related",
  "not_job_related",
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

/** Which status a confidently-classified email suggests for the linked job. */
export const CATEGORY_TO_STATUS: Partial<Record<EmailCategory, JobStatus>> = {
  application_confirmation: "Applied",
  assessment_invite: "Assessment",
  interview_invite: "Interview",
  offer: "Offer",
  rejection: "Rejected",
};

export const classifiedEmailSchema = z.object({
  category: z.enum(EMAIL_CATEGORIES),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
});

export type ClassifiedEmail = z.infer<typeof classifiedEmailSchema>;

export const CLASSIFIED_EMAIL_JSON_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: [...EMAIL_CATEGORIES],
      description: "The kind of hiring email this is",
    },
    company: {
      type: ["string", "null"],
      description: "The hiring company this email is about, null if unclear",
    },
    jobTitle: {
      type: ["string", "null"],
      description: "The role this email is about, null if unclear",
    },
    confidence: {
      type: "number",
      description: "Confidence in the category, 0 to 1",
    },
    summary: {
      type: "string",
      description: "One sentence summary of the email",
    },
  },
  required: ["category", "company", "jobTitle", "confidence", "summary"],
  additionalProperties: false,
} as const;

// ---------------------------------------------------------------------------
// Autofill profile
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  github: z.string().default(""),
  portfolio: z.string().default(""),
  currentCompany: z.string().default(""),
  currentTitle: z.string().default(""),
  yearsOfExperience: z.string().default(""),
  workAuthorization: z.string().default(""),
  requiresSponsorship: z.string().default(""),
  desiredSalary: z.string().default(""),
  noticePeriod: z.string().default(""),
  coverLetterTemplate: z.string().default(""),
  /** Free-form Q&A pairs for recurring application questions. */
  customAnswers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
});

export type Profile = z.infer<typeof profileSchema>;

export const EMPTY_PROFILE: Profile = profileSchema.parse({});

// ---------------------------------------------------------------------------
// Email record (as stored / returned by the web API)
// ---------------------------------------------------------------------------

export interface EmailRecord {
  id: number;
  gmailId: string;
  threadId: string | null;
  jobId: number | null;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  category: EmailCategory;
  confidence: number;
  summary: string;
  suggestedStatus: JobStatus | null;
  statusApplied: number; // 0/1 — whether the suggestion auto-updated the job
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Extension <-> web API payloads
// ---------------------------------------------------------------------------

/** What the content script extracts from a job page before AI cleanup. */
export interface CapturedPage {
  url: string;
  title: string;
  /** Raw JSON-LD JobPosting object when the site provides one. */
  jsonLd: Record<string, unknown> | null;
  /** Visible page text, trimmed. Used for AI parsing when JSON-LD is absent. */
  pageText: string;
}

// ---------------------------------------------------------------------------
// Legacy (v1 single-file app) import format
// ---------------------------------------------------------------------------

export const legacyJobSchema = z
  .object({
    id: z.union([z.number(), z.string()]).optional(),
    company: z.string().optional(),
    jobTitle: z.string().optional(),
    location: z.string().nullable().optional(),
    sourceUrl: z.string().nullable().optional(),
    salaryRange: z.string().nullable().optional(),
    jobType: z.string().nullable().optional(),
    experience: z.string().nullable().optional(),
    skills: z.string().nullable().optional(),
    emailDomain: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    dateAdded: z.string().optional(),
    status: z.string().optional(),
  })
  .passthrough();

export const legacyBackupSchema = z.object({
  jobs: z.array(legacyJobSchema),
  version: z.string().optional(),
  exportDate: z.string().optional(),
});

export type LegacyBackup = z.infer<typeof legacyBackupSchema>;

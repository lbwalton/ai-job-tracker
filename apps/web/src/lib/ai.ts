import Anthropic from "@anthropic-ai/sdk";
import {
  CLASSIFIED_EMAIL_JSON_SCHEMA,
  PARSED_JOB_JSON_SCHEMA,
  classifiedEmailSchema,
  parsedJobSchema,
  type ClassifiedEmail,
  type ParsedJob,
  type Profile,
} from "@jobtrackr/core";

// Haiku keeps parsing/classification at fractions of a cent per call; override
// with ANTHROPIC_MODEL if you want a stronger model.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

export function aiAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  return new Anthropic();
}

async function structuredRequest(
  system: string,
  user: string,
  schema: object,
  maxTokens = 1500,
): Promise<unknown> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
    // Structured outputs: constrains the response to valid JSON per schema.
    ...({
      output_config: { format: { type: "json_schema", schema } },
    } as Record<string, unknown>),
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new Error("AI returned no text content");
  }
  return JSON.parse(text.text);
}

export async function parseJobPosting(content: string): Promise<ParsedJob> {
  const raw = await structuredRequest(
    [
      "You extract structured data from job postings and free-form descriptions of job applications.",
      "Extract only what is stated or can be confidently inferred; use null for unknown fields.",
      "For emailDomain, infer the company's likely email domain from its website or name (e.g. 'acme.com'); null if you cannot infer it confidently.",
    ].join(" "),
    `Extract the job application details from the following content:\n\n${content.slice(0, 24000)}`,
    PARSED_JOB_JSON_SCHEMA,
  );
  return parsedJobSchema.parse(raw);
}

export async function draftAnswer(input: {
  question: string;
  profile: Profile;
  job?: {
    company: string;
    jobTitle: string;
    description: string | null;
    skills: string | null;
  } | null;
}): Promise<string> {
  const { question, profile, job } = input;
  const facts = [
    profile.currentTitle && profile.currentCompany
      ? `Current role: ${profile.currentTitle} at ${profile.currentCompany}`
      : "",
    profile.yearsOfExperience ? `Years of experience: ${profile.yearsOfExperience}` : "",
    profile.location ? `Location: ${profile.location}` : "",
    profile.background ? `Background:\n${profile.background.slice(0, 8000)}` : "",
    profile.coverLetterTemplate
      ? `Cover letter template (voice/tone reference):\n${profile.coverLetterTemplate.slice(0, 2000)}`
      : "",
    profile.customAnswers.length
      ? `Existing stock answers:\n${profile.customAnswers
          .filter((qa) => qa.question && qa.answer)
          .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 700,
    system: [
      "You draft job-application answers in the applicant's first-person voice.",
      "Use ONLY the facts provided — never invent numbers, employers, dates, or achievements.",
      "If a fact the answer needs is missing, write a [bracketed placeholder] the applicant fills in.",
      "Confident and specific, not sycophantic. No em-dashes. 80-160 words unless the question clearly wants a one-liner.",
      "Return only the answer text — no preamble, no quotes.",
    ].join(" "),
    messages: [
      {
        role: "user",
        content: [
          `Application question: ${question}`,
          job
            ? `The application is for: ${job.jobTitle} at ${job.company}.` +
              (job.description ? `\nAbout the role: ${job.description.slice(0, 2000)}` : "") +
              (job.skills ? `\nSkills they want: ${job.skills}` : "")
            : "No specific company context — write a reusable stock answer.",
          `Applicant facts:\n${facts || "(profile is empty — use placeholders)"}`,
        ].join("\n\n"),
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("AI returned no text content");
  // House style: no em-dashes in drafted answers.
  return text.text.trim().replace(/\s*—\s*/g, ", ");
}

export async function classifyEmail(input: {
  from: string;
  subject: string;
  body: string;
  trackedCompanies: string[];
}): Promise<ClassifiedEmail> {
  const raw = await structuredRequest(
    [
      "You classify emails for a job-application tracker.",
      "Decide whether the email relates to the user's job search and, if so, what kind of hiring email it is.",
      "application_confirmation = 'we received your application'. assessment_invite = coding test / take-home. interview_invite = scheduling or confirming interviews. offer = a job offer. rejection = the candidacy is over. recruiter_outreach = a recruiter contacting the user about a new role. other_job_related = job-related but none of the above (newsletters, job alerts, status unchanged). not_job_related = everything else.",
      "Marketing blasts from job boards (Indeed/LinkedIn digests) are other_job_related with low confidence, never rejections or confirmations.",
    ].join(" "),
    [
      `The user is tracking applications at these companies: ${input.trackedCompanies.slice(0, 100).join(", ") || "(none yet)"}.`,
      `From: ${input.from}`,
      `Subject: ${input.subject}`,
      `Body:\n${input.body.slice(0, 6000)}`,
    ].join("\n\n"),
    CLASSIFIED_EMAIL_JSON_SCHEMA,
    800,
  );
  return classifiedEmailSchema.parse(raw);
}

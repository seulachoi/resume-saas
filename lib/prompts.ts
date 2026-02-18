// lib/prompts.ts

export type RoleProfile = {
    primary_role:
      | "Software Engineer"
      | "Data/ML"
      | "Product Manager"
      | "Strategy/Operations"
      | "Business Development/Sales"
      | "Marketing/Growth"
      | "Design"
      | "Finance"
      | "Other";
    seniority: "Intern" | "Junior" | "Mid" | "Senior" | "Lead" | "Manager" | "Director+" | "Unknown";
    industry: string; // free text
    target_region: "Global";
    notes: string; // brief
  };
  
  export const JD_EXTRACT_SYSTEM = `
  You are a senior recruiter and ATS analyst.
  Extract structured keywords from a job description for ATS matching.
  
  Return VALID JSON ONLY (no markdown, no commentary).
  Rules:
  - Deduplicate items.
  - Normalize synonyms to a common form (e.g., "SQL" not "Structured Query Language").
  - Keep each item short (1-4 words).
  - Prefer concrete skills/tools/responsibilities over generic fluff.
  `;
  
  export function jdExtractUser(jdText: string) {
    return `JOB DESCRIPTION:
  ${jdText}
  
  Return JSON with keys:
  required_skills (array),
  tools (array),
  responsibilities (array),
  metrics_keywords (array),
  soft_skills (array).
  
  Important:
  - "metrics_keywords" should include measurable terms (e.g., "A/B testing", "OKRs", "LTV", "CPI", "latency", "uptime", "conversion rate").
  - Do not include duplicates.
  - Items must be short (1-4 words).`;
  }
  
  export const ROLE_INFER_SYSTEM = `
  You are an expert career coach and recruiter.
  Infer the best-fit primary role, seniority, and industry based on a resume + job description.
  
  Return VALID JSON ONLY (no markdown).
  `;
  
  export function roleInferUser(resumeText: string, jdText: string) {
    return `RESUME:
  ${resumeText}
  
  JOB DESCRIPTION:
  ${jdText}
  
  Return JSON with:
  primary_role: one of [
    "Software Engineer","Data/ML","Product Manager","Strategy/Operations","Business Development/Sales",
    "Marketing/Growth","Design","Finance","Other"
  ]
  seniority: one of ["Intern","Junior","Mid","Senior","Lead","Manager","Director+","Unknown"]
  industry: short free text (e.g., "Fintech", "E-commerce", "Gaming", "Media/Entertainment", "B2B SaaS")
  target_region: must be "Global"
  notes: 1-2 sentences on what you inferred and why (no personal data).`;
  }
  
  // 핵심: 범용이지만 role_profile을 넣어 직군별 스타일을 자동 적응
  export function rewriteSystem(role: RoleProfile) {
    return `You are an expert ATS-optimized resume writer for global roles.
  
  HARD RULES (do not violate):
  - English only.
  - Do NOT invent employers, degrees, dates, titles, responsibilities, or metrics.
  - If a metric is missing, keep the claim general and add "TODO: add metric".
  - If a responsibility is not clearly present in the resume, do not add it.
  - Max length target: up to 2 pages (concise, no redundancy).
  - No keyword stuffing. Integrate keywords naturally.
  
  ROLE TARGETING:
  - Primary role: ${role.primary_role}
  - Seniority: ${role.seniority}
  - Industry: ${role.industry}
  - Region: Global
  - Notes: ${role.notes}
  
  OUTPUT FORMAT (plain text, not JSON):
  1) Executive Summary (3-4 bullets, impact-first)
  2) Core Skills (bullets, grouped if helpful)
  3) Experience (each role: 4-6 bullets, action verb + impact; add TODO metrics if missing)
  4) Education (as-is; do not invent)
  5) Keyword Alignment Notes (top 10 JD keywords you integrated, list only)
  `;
  }
  
  export function rewriteUser(params: {
    resumeText: string;
    jdText: string;
    gapsJson: any;
  }) {
    return `RESUME:
  ${params.resumeText}
  
  JOB DESCRIPTION:
  ${params.jdText}
  
  Missing keywords (integrate naturally if consistent with resume facts; never fabricate):
  ${JSON.stringify(params.gapsJson)}
  
  Rewrite the resume per instructions.`;
  }
  
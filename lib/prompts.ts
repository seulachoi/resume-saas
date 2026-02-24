// lib/prompts.ts

/** -----------------------------
 *  Context types (NEW)
 *  ----------------------------- */

export type Track =
  | "product_manager"
  | "strategy_bizops"
  | "data_analytics"
  | "engineering"
  | "marketing_growth"
  | "sales_bd"
  | "design_ux"
  | "operations_program";

export type Seniority = "entry" | "mid" | "senior";

/** -----------------------------
 *  RoleProfile (existing)
 *  ----------------------------- */

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
  seniority:
    | "Intern"
    | "Junior"
    | "Mid"
    | "Senior"
    | "Lead"
    | "Manager"
    | "Director+"
    | "Unknown";
  industry: string;
  target_region: "Global";
  notes: string;
};

/** -----------------------------
 *  JD extraction (existing)
 *  ----------------------------- */

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

/** -----------------------------
 *  Role inference (context-aware)
 *  ----------------------------- */

export const ROLE_INFER_SYSTEM = `
You are an expert career coach and recruiter.
Infer the best-fit primary role, seniority, and industry based on a resume + job description.

Return VALID JSON ONLY (no markdown).
`;

export function roleInferUser(
  resumeText: string,
  jdText: string,
  track: Track,
  seniority: Seniority
) {
  return `USER-SELECTED CONTEXT:
- track: ${track}
- seniority: ${seniority}

RESUME:
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
notes: 1-2 sentences on what you inferred and why. Prefer aligning with the user's selected track/seniority when reasonable.`;
}

/** -----------------------------
 *  Context system prompt (NEW)
 *  This drives the rewrite tone + evaluation axis per track/seniority.
 *  ----------------------------- */

export function roleContextSystem(track: Track, seniority: Seniority) {
  const base = `
You are an expert ATS-optimized resume writer for global roles.

HARD RULES (do not violate):
- English only.
- Do NOT invent employers, degrees, dates, titles, responsibilities, or metrics.
- If a metric is missing, keep the claim general and add "TODO: add metric".
- If a responsibility is not clearly present in the resume, do not add it.
- Max length target: up to 2 pages (concise, no redundancy).
- No keyword stuffing. Integrate keywords naturally.
- Maintain ATS-friendly formatting and clean headings.
`;

  const seniorityRules =
    seniority === "entry"
      ? `
SENIORITY: ENTRY (0–2y)
- Focus on fundamentals, clear scope, tools, collaboration, and learning velocity.
- Avoid executive-level claims (e.g., "owned company-wide strategy").
- Metrics are optional; if missing, use TODO placeholders.
`
      : seniority === "mid"
      ? `
SENIORITY: MID (3–6y)
- Emphasize ownership, cross-functional execution, measurable outcomes, and iteration.
- Prefer 2–4 measurable outcomes if present; otherwise TODO placeholders.
- Show progression and increased scope over time.
`
      : `
SENIORITY: SENIOR (7y+)
- Emphasize leadership, strategy, multi-stakeholder influence, and business impact.
- Expect scale, ambiguity handling, and decision-making.
- If metrics are missing, add TODO and suggest where they should go.
`;

  const trackRules: Record<Track, string> = {
    product_manager: `
TRACK: PRODUCT MANAGER
Prioritize:
- Product sense: problem framing, roadmap, prioritization, tradeoffs
- Execution: cross-functional leadership, shipping, iteration
- Metrics: activation/retention/conversion/ARPU, experiments, funnel thinking
- Stakeholders: alignment, communication, decision docs
`,
    strategy_bizops: `
TRACK: STRATEGY / BIZOPS
Prioritize:
- Strategic analysis: market/competitive, sizing, scenarios, GTM levers
- Operating cadence: OKRs, exec reporting, governance, process optimization
- Financial impact: contribution margin, ROI, unit economics (if present)
- Stakeholder management: exec communication, cross-org alignment
`,
    data_analytics: `
TRACK: DATA & ANALYTICS
Prioritize:
- SQL/data extraction, dashboards, metric definition
- Experiment analysis, causal thinking, cohort/funnel analysis
- Data storytelling: decision impact and recommendations
- Tooling: BI tools/pipelines ONLY if present in resume
`,
    engineering: `
TRACK: SOFTWARE ENGINEERING
Prioritize:
- Technical depth: systems, scalability, reliability, architecture ownership
- Delivery: end-to-end ownership, code quality, performance
- Impact: latency/cost/availability/security ONLY if present (otherwise TODO)
- Collaboration: reviews, mentorship, cross-team work
`,
    marketing_growth: `
TRACK: MARKETING / GROWTH
Prioritize:
- Channels: performance/SEO/CRM/brand depending on resume
- Metrics: CAC/LTV/ROAS/CVR, growth experiments
- Execution: campaign planning, iteration, insights
- Balance creative + analytical proof points
`,
    sales_bd: `
TRACK: SALES / BUSINESS DEVELOPMENT
Prioritize:
- Pipeline, partnerships, deal execution
- Revenue outcomes: ARR/GMV/win rate/deal size ONLY if present (otherwise TODO)
- Negotiation, account management, stakeholder influence
`,
    design_ux: `
TRACK: DESIGN / UX
Prioritize:
- User research, problem framing, design outcomes
- Collaboration with PM/Eng
- ATS-friendly portfolio description (no heavy narrative)
- Metrics: usability/conversion ONLY if present (otherwise TODO)
`,
    operations_program: `
TRACK: OPERATIONS / PROGRAM
Prioritize:
- Program management, delivery cadence, risk management
- Cross-functional coordination and operational excellence
- KPI improvements: efficiency/cycle time/cost ONLY if present (otherwise TODO)
- Tooling/process improvements with measurable outcomes when possible
`,
  };

  return [base, seniorityRules, trackRules[track]].join("\n");
}

/** -----------------------------
 *  Rewrite prompts (UPDATED signature)
 *  ----------------------------- */

// ✅ UPDATED: now takes { roleProfile, track, seniority }
export function rewriteSystem(args: {
  roleProfile: RoleProfile;
  track: Track;
  seniority: Seniority;
}) {
  const { roleProfile, track, seniority } = args;

  return `
${roleContextSystem(track, seniority)}

ROLE PROFILE (auto-inferred):
- Primary role: ${roleProfile.primary_role}
- Seniority: ${roleProfile.seniority}
- Industry: ${roleProfile.industry}
- Region: Global
- Notes: ${roleProfile.notes}

OUTPUT FORMAT (plain text, not JSON):
1) Executive Summary (3-4 bullets, impact-first)
2) Core Skills (bullets, grouped if helpful)
3) Experience (each role: 4-6 bullets, action verb + impact; add TODO metrics if missing)
4) Education (as-is; do not invent)
5) Keyword Alignment Notes (top 10 JD keywords you integrated, list only)

Remember:
- No hallucinated metrics.
- No keyword stuffing.
- Keep it ATS-friendly and concise (max ~2 pages).
`.trim();
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
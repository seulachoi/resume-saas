export type SeoLandingPage = {
  slug: string;
  navLabel: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  lead: string;
  keywordExamples: string[];
};

export const seoLandingPages: SeoLandingPage[] = [
  {
    slug: "product-manager-ats-resume",
    navLabel: "Product Manager ATS Resume",
    seoTitle: "Product Manager ATS Resume Checker | ResumeUp",
    seoDescription:
      "Improve your product manager resume for ATS screening. Find missing PM keywords, impact metrics, and role-fit gaps.",
    h1: "Product Manager ATS Resume Checker",
    lead:
      "Product manager resumes are often rejected because they sound generic. ATS screening favors role-specific terms, measurable outcomes, and evidence of cross-functional execution.",
    keywordExamples: [
      "Roadmap prioritization",
      "Cross-functional leadership",
      "Experimentation / A/B testing",
      "Revenue or retention impact",
      "Stakeholder alignment",
    ],
  },
  {
    slug: "data-analyst-ats-resume",
    navLabel: "Data Analyst ATS Resume",
    seoTitle: "Data Analyst ATS Resume Checker | ResumeUp",
    seoDescription:
      "Check your data analyst resume for ATS fit. Find missing SQL, dashboard, experimentation, and business impact keywords.",
    h1: "Data Analyst ATS Resume Checker",
    lead:
      "Data analyst resumes pass ATS faster when they show tools, analysis methods, and business outcomes. Missing these signals lowers visibility even for qualified candidates.",
    keywordExamples: [
      "SQL and dashboarding",
      "A/B testing",
      "Data visualization",
      "KPI reporting",
      "Business impact metrics",
    ],
  },
  {
    slug: "software-engineer-ats-resume",
    navLabel: "Software Engineer ATS Resume",
    seoTitle: "Software Engineer ATS Resume Checker | ResumeUp",
    seoDescription:
      "Optimize your software engineer resume for ATS screening. Identify missing technical keywords, scope, and measurable impact.",
    h1: "Software Engineer ATS Resume Checker",
    lead:
      "Engineering resumes underperform in ATS when they list tasks without technical depth, scale, or measurable outcomes. ResumeUp helps you close those gaps quickly.",
    keywordExamples: [
      "System design and architecture",
      "Cloud infrastructure",
      "Performance optimization",
      "Code quality and testing",
      "Scale and reliability metrics",
    ],
  },
  {
    slug: "marketing-ats-resume",
    navLabel: "Marketing ATS Resume",
    seoTitle: "Marketing ATS Resume Checker | ResumeUp",
    seoDescription:
      "Run a marketing resume ATS check. Find missing growth, campaign, and channel performance keywords for better screening results.",
    h1: "Marketing ATS Resume Checker",
    lead:
      "Marketing resumes need clear channel context, experimentation language, and conversion impact. ATS and recruiters both reward these signals.",
    keywordExamples: [
      "Growth and acquisition",
      "Campaign optimization",
      "Performance marketing",
      "Conversion rate improvement",
      "Attribution and funnel analysis",
    ],
  },
  {
    slug: "sales-resume-ats",
    navLabel: "Sales Resume ATS",
    seoTitle: "Sales Resume ATS Checker | ResumeUp",
    seoDescription:
      "Improve your sales resume for ATS with role-specific keywords, quota metrics, pipeline impact, and stakeholder language.",
    h1: "Sales Resume ATS Checker",
    lead:
      "Sales resumes are strongest when they pair role keywords with hard numbers: quota attainment, pipeline growth, and deal outcomes.",
    keywordExamples: [
      "Quota attainment",
      "Pipeline generation",
      "Deal velocity",
      "Revenue growth",
      "Enterprise stakeholder management",
    ],
  },
  {
    slug: "consulting-resume-ats",
    navLabel: "Consulting Resume ATS",
    seoTitle: "Consulting Resume ATS Checker | ResumeUp",
    seoDescription:
      "Check your consulting resume for ATS alignment. Find missing strategy, analysis, and impact language recruiters expect.",
    h1: "Consulting Resume ATS Checker",
    lead:
      "Consulting resumes often fail ATS when they miss structured problem-solving and measurable client outcomes. ResumeUp highlights those gaps.",
    keywordExamples: [
      "Structured problem solving",
      "Executive communication",
      "Data-driven recommendations",
      "Client impact metrics",
      "Cross-functional delivery",
    ],
  },
  {
    slug: "ats-resume-templates",
    navLabel: "ATS Resume Templates Guide",
    seoTitle: "ATS Resume Templates Guide | ResumeUp",
    seoDescription:
      "Learn what makes an ATS-friendly resume template and check your resume for keyword and structure gaps before applying.",
    h1: "ATS Resume Templates Guide",
    lead:
      "ATS-friendly templates should be clean and scannable, but formatting alone is not enough. Keyword alignment and impact language still drive outcomes.",
    keywordExamples: [
      "Scannable section structure",
      "Role-specific keywords",
      "Clear bullet formatting",
      "Impact-driven phrasing",
      "Readable chronology",
    ],
  },
  {
    slug: "resume-optimizer",
    navLabel: "Resume Optimizer",
    seoTitle: "Resume Optimizer | Improve ATS Score with ResumeUp",
    seoDescription:
      "Use ResumeUp as a resume optimizer to detect keyword gaps, weak bullets, and missing impact metrics before you apply.",
    h1: "Resume Optimizer for ATS Screening",
    lead:
      "Resume optimization works best when you start from score signals: keyword fit, impact clarity, and role context. ResumeUp gives you that preview first.",
    keywordExamples: [
      "Keyword alignment",
      "Impact and metrics",
      "Role context matching",
      "Bullet clarity",
      "Scannable structure",
    ],
  },
];


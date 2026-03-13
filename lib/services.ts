import {
  Experimental_Agent as Agent,
  stepCountIs,
  tool,
  generateObject,
  generateText,
} from "ai";
import { groq } from "@ai-sdk/groq";
import {
  FormSchema,
  QualificationSchema,
  qualificationSchema,
} from "@/lib/types";
import { z } from "zod";
import { exa } from "@/lib/exa";

/**
 * Qualify the lead
 */
export async function qualify(
  lead: FormSchema,
  research: string,
): Promise<QualificationSchema> {
  const { object } = await generateObject({
    model: groq("llama-3.1-8b-instant"),
    schema: qualificationSchema,
    prompt:
      `Qualify the lead and score them from 1-10 based on conversion likelihood. ` +
      `LEAD DATA: ${JSON.stringify(lead)} ` +
      `RESEARCH: ${research}\n\n` +
      `Score guidelines: 9-10 = strong fit, decision-maker, clear need; ` +
      `7-8 = good fit, some buying signals; 5-6 = possible fit, needs nurturing; ` +
      `1-4 = weak fit or unlikely to convert.`,
  });

  return object;
}

/**
 * Write an email
 */
export async function writeEmail(
  research: string,
  qualification: QualificationSchema,
) {
  const { text } = await generateText({
    // model: "openai/gpt-5",
    model: groq("llama-3.1-8b-instant"),
    prompt: `Write an email for a ${
      qualification.category
    } lead based on the following information: ${JSON.stringify(research)}`,
  });

  return text;
}

/**
 * Generate a personalized outreach or follow-up message for the lead.
 * followUpNumber: 1 = initial, 2 = day 2, 3 = day 5 final
 */
export async function generateOutreachMessage(
  research: string,
  qualification: QualificationSchema,
  lead: { name: string; company: string; email: string },
  followUpNumber: number = 1,
): Promise<string> {
  const context =
    followUpNumber === 1
      ? "This is the initial outreach message."
      : followUpNumber === 2
        ? "This is the first follow-up (Day 2). Reference the previous outreach briefly."
        : "This is the final follow-up attempt (Day 5). Create polite urgency.";

  const { text } = await generateText({
    // model: "openai/gpt-5",
    model: groq("llama-3.1-8b-instant"),
    prompt:
      `Write a short, personalized outreach message for a ${qualification.category} lead.\n\n` +
      `Lead: ${JSON.stringify({ name: lead.name, company: lead.company, email: lead.email })}\n` +
      `Research: ${research.slice(0, 500)}\n` +
      `Follow-up context: ${context}\n\n` +
      `Requirements: under 150 words, conversational, reference something specific from research, clear CTA.`,
  });

  return text;
}

/**
 * Send an email
 */
export async function sendEmail(email: string) {
  /**
   * send email using provider like sendgrid, mailgun, resend etc.
   */
}

/**
 * ------------------------------------------------------------
 * Agent & Tools
 * ------------------------------------------------------------
 */

/**
 * Fetch tool
 */
export const fetchUrl = tool({
  description: "Return visible text from a public URL as Markdown.",
  inputSchema: z.object({
    url: z.string().describe("Absolute URL, including http:// or https://"),
  }),
  execute: async ({ url }) => {
    const result = await exa.getContents(url, {
      text: true,
    });
    return result;
  },
});

/**
 * CRM Search tool
 */
export const crmSearch = tool({
  description:
    "Search existing Vercel CRM for opportunities by company name or domain",
  inputSchema: z.object({
    name: z
      .string()
      .describe('The name of the company to search for (e.g. "Vercel")'),
  }),
  execute: async ({ name }) => {
    // fetch from CRM like Salesforce, Hubspot, or Snowflake, etc.
    return [];
  },
});

/**
 * Tech-stack analysis tool
 */
export const techStackAnalysis = tool({
  description: "Return tech stack analysis for a domain.",
  inputSchema: z.object({
    domain: z.string().describe('Domain, e.g. "vercel.com"'),
  }),
  execute: async ({ domain }) => {
    // fetch the tech stack for the domain
    return [];
  },
});

/**
 * Search tool
 */
const search = tool({
  description: "Search the web for information",
  inputSchema: z.object({
    keywords: z
      .string()
      .describe(
        'The entity to search for (e.g. "Apple") — do not include any Vercel specific keywords',
      ),
    resultCategory: z
      .enum([
        "company",
        "research paper",
        "news",
        "pdf",
        "github",
        "tweet",
        "personal site",
        "people",
        "financial report",
      ])
      .describe("The category of the result you are looking for"),
  }),
  execute: async ({ keywords, resultCategory }) => {
    /**
     * Deep research using exa.ai
     * Return the results in markdown format
     */
    const result = await exa.searchAndContents(keywords, {
      numResults: 2,
      type: "keyword",
      category: resultCategory as any,
      summary: true,
    });
    return result;
  },
});

/**
 * Query the knowledge base
 */
const queryKnowledgeBase = tool({
  description: "Query the knowledge base for the given query.",
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }: { query: string }) => {
    /**
     * Query the knowledge base for the given query
     * - ex: pull from turbopuffer, pinecone, postgres, snowflake, etc.
     * Return the context from the knowledge base
     */
    return "Context from knowledge base for the given query";
  },
});

/**
 * Research agent
 *
 * This agent is used to research the lead and return a comprehensive report
 */
export const researchAgent = new Agent({
  // model: "openai/gpt-5",
  model: groq("llama-3.1-8b-instant"),
  instructions: `
  You are a researcher to find information about a lead. You are given a lead and you need to find information about the lead.
  
  You can use the tools provided to you to find information about the lead: 
  - search: Searches the web for information
  - queryKnowledgeBase: Queries the knowledge base for the given query
  - fetchUrl: Fetches the contents of a public URL
  - crmSearch: Searches the CRM for the given company name
  - techStackAnalysis: Analyzes the tech stack of the given domain
  
  Synthesize the information you find into a comprehensive report.
  `,
  tools: {
    search,
    queryKnowledgeBase,
    fetchUrl,
    crmSearch,
    techStackAnalysis,
    // add other tools here
  },
  stopWhen: [stepCountIs(20)], // stop after max 20 steps
});

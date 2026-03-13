import { qualify, researchAgent, writeEmail } from "@/lib/services";
import { FormSchema, LeadRecord, QualificationSchema } from "@/lib/types";
import { saveLead } from "@/lib/pipeline";
import { sendLeadNotification } from "@/lib/telegram";

/**
 * Agent 2 – Research Agent
 */
export const stepResearch = async (data: FormSchema) => {
  "use step";

  const { text: research } = await researchAgent.generate({
    prompt: `Research the lead: ${JSON.stringify(data)}`,
  });

  return research;
};

/**
 * Agent 3 – Lead Scoring Agent (qualify + score 1-10)
 */
export const stepQualify = async (data: FormSchema, research: string) => {
  "use step";

  const qualification = await qualify(data, research);
  return qualification;
};

/**
 * Agent 6 – Pipeline Monitoring Agent (initial save)
 */
export const stepSavePipeline = async (
  leadId: string,
  data: FormSchema,
  research: string,
  qualification: QualificationSchema,
) => {
  "use step";

  const lead: LeadRecord = {
    lead_id: leadId,
    name: data.name,
    email: data.email,
    company: data.company ?? "",
    message: data.message,
    score: qualification.score,
    status: "pending",
    qualification,
    research,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    follow_ups_sent: 0,
  };

  saveLead(lead);
  return lead;
};

/**
 * Agent 4 – Telegram Decision Agent
 */
export const stepSendTelegramNotification = async (lead: LeadRecord) => {
  "use step";

  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    console.warn(
      "⚠️  TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set, skipping Telegram notification",
    );
    return;
  }

  await sendLeadNotification(lead);
};

// kept for backwards-compatibility if referenced elsewhere
export const stepWriteEmail = async (
  research: string,
  qualification: QualificationSchema,
) => {
  "use step";
  return await writeEmail(research, qualification);
};

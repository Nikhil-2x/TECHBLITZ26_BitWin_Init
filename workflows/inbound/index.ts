import { FormSchema } from '@/lib/types';
import {
  stepQualify,
  stepResearch,
  stepSavePipeline,
  stepSendTelegramNotification
} from './steps';

/**
 * Inbound lead workflow:
 *   Agent 1  – Lead Capture  (triggered via /api/submit)
 *   Agent 2  – Research Agent
 *   Agent 3  – Lead Scoring Agent
 *   Agent 6  – Pipeline save (pending)
 *   Agent 4  – Telegram Decision Agent (approve/reject from phone)
 *   Agent 5  – Outreach Agent (runs inside lib/telegram.ts on approval)
 */
export const workflowInbound = async (data: FormSchema, leadId: string) => {
  'use workflow';

  const research = await stepResearch(data);
  const qualification = await stepQualify(data, research);
  const lead = await stepSavePipeline(leadId, data, research, qualification);
  await stepSendTelegramNotification(lead);
};

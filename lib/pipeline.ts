import fs from "fs";
import path from "path";
import type { LeadRecord } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PIPELINE_FILE = path.join(DATA_DIR, "pipeline.json");

function ensureDataFile(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(PIPELINE_FILE)) {
    fs.writeFileSync(PIPELINE_FILE, JSON.stringify([], null, 2));
  }
}

export function getAllLeads(): LeadRecord[] {
  ensureDataFile();
  try {
    const content = fs.readFileSync(PIPELINE_FILE, "utf-8");
    return JSON.parse(content) as LeadRecord[];
  } catch {
    return [];
  }
}

export function getLead(leadId: string): LeadRecord | null {
  return getAllLeads().find((l) => l.lead_id === leadId) ?? null;
}

export function saveLead(lead: LeadRecord): void {
  ensureDataFile();
  const leads = getAllLeads();
  const index = leads.findIndex((l) => l.lead_id === lead.lead_id);
  if (index >= 0) {
    leads[index] = lead;
  } else {
    leads.push(lead);
  }
  fs.writeFileSync(PIPELINE_FILE, JSON.stringify(leads, null, 2));
}

export function updateLead(
  leadId: string,
  updates: Partial<LeadRecord>,
): LeadRecord | null {
  const leads = getAllLeads();
  const index = leads.findIndex((l) => l.lead_id === leadId);
  if (index < 0) return null;
  leads[index] = {
    ...leads[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(PIPELINE_FILE, JSON.stringify(leads, null, 2));
  return leads[index];
}

export function getPipelineSummary() {
  const leads = getAllLeads();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayLeads = leads.filter((l) => new Date(l.created_at) >= today);
  const approved = leads.filter(
    (l) => l.status === "approved" || l.status === "contacted",
  );
  const rejected = leads.filter((l) => l.status === "rejected");
  const pending = leads.filter((l) => l.status === "pending");

  return {
    total: leads.length,
    today: todayLeads.length,
    approved: approved.length,
    rejected: rejected.length,
    pending: pending.length,
    contacted: leads.filter((l) => l.status === "contacted").length,
  };
}

export function getDueFollowUps(): LeadRecord[] {
  const now = new Date();
  return getAllLeads().filter((l) => {
    if (l.status !== "contacted") return false;
    if (l.follow_up_day2_at && l.follow_ups_sent < 2) {
      return new Date(l.follow_up_day2_at) <= now;
    }
    if (l.follow_up_day5_at && l.follow_ups_sent < 3) {
      return new Date(l.follow_up_day5_at) <= now;
    }
    return false;
  });
}

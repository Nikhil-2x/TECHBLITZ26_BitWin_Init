import { z } from 'zod';

/**
 * Lead schema
 */

export const formSchema = z.object({
  email: z.email('Please enter a valid email address.'),
  name: z
    .string()
    .min(2, 'Name is required')
    .max(50, 'Name must be at most 50 characters.'),
  phone: z
    .string()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Please enter a valid phone number.')
    .min(10, 'Phone number must be at least 10 digits.')
    .optional()
    .or(z.literal('')),
  company: z.string().optional().or(z.literal('')),
  message: z
    .string()
    .min(10, 'Message is required')
    .max(500, 'Message must be less than 500 characters.')
});

export type FormSchema = z.infer<typeof formSchema>;

/**
 * Qualification schema
 */

export const qualificationCategorySchema = z.enum([
  'QUALIFIED',
  'UNQUALIFIED',
  'SUPPORT',
  'FOLLOW_UP'
]);

export const qualificationSchema = z.object({
  category: qualificationCategorySchema,
  reason: z.string(),
  score: z
    .number()
    .min(1)
    .max(10)
    .describe('Lead score from 1 (low potential) to 10 (high conversion likelihood)')
});

export type QualificationSchema = z.infer<typeof qualificationSchema>;

export type LeadStatus = 'pending' | 'approved' | 'rejected' | 'contacted';

export interface LeadRecord {
  lead_id: string;
  name: string;
  email: string;
  company: string;
  message: string;
  score: number;
  status: LeadStatus;
  qualification: QualificationSchema;
  research: string;
  outreach_email?: string;
  outreach_message?: string;
  created_at: string;
  updated_at: string;
  follow_ups_sent: number;
  follow_up_day2_at?: string;
  follow_up_day5_at?: string;
}

# TECHBLITZ26 - BitWin Init Lead Management System

A sophisticated AI-powered lead generation and management platform built for BitWin Init, a tech consulting company. This system automates lead qualification, research, approval workflows, and personalized email outreach.

## 🚀 Features

### Core Functionality
- **AI-Powered Lead Qualification**: Automatically scores and categorizes leads based on conversion likelihood
- **Intelligent Research**: Uses web research and AI to gather comprehensive lead intelligence
- **Telegram Integration**: Real-time notifications and approval workflows via Telegram bot
- **Email Automation**: Personalized email campaigns with confirmation workflows
- **Pipeline Management**: Complete lead lifecycle tracking and analytics

### Lead Processing Flow
1. **Form Submission** → Lead captured via web form
2. **AI Research** → Company research and intelligence gathering
3. **Qualification** → Scoring and categorization (QUALIFIED/FOLLOW_UP/REJECTED)
4. **Approval Workflow** → Telegram notifications with research, score, and approve/reject buttons
5. **Email Outreach** → Personalized emails sent to leads with confirmation
6. **Follow-ups** → Automated Day 2 and Day 5 follow-up emails

### Advanced Features
- **Bot Protection**: Integrated bot detection to prevent spam
- **Workflow Engine**: Customizable AI workflows for research and processing
- **Real-time Notifications**: Instant Telegram alerts for new leads
- **Email Templates**: AI-generated personalized email content
- **Pipeline Analytics**: Comprehensive lead tracking and reporting

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form management
- **Zod** - Schema validation

### Backend & AI
- **Next.js API Routes** - Server-side API endpoints
- **Groq AI** - Fast LLM inference for research and content generation
- **Workflow Engine** - Custom AI workflow orchestration
- **Exa.ai** - Web research and content extraction

### Integrations
- **Telegram Bot API** - Real-time notifications and workflows
- **Resend** - Email delivery service
- **BotID** - Bot detection and protection

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Tailwind CSS** - Styling
- **Next.js Dev Server** - Development environment

## 📋 Prerequisites

- Node.js 18+
- npm or pnpm
- Telegram Bot Token (from @BotFather)
- Resend API Key
- Groq API Key
- Exa.ai API Key

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TECHBLITZ26_BitWin_Init
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   Copy `.env` and configure the following:

   ```env
   # AI & Research
   GROQ_API_KEY=your_groq_api_key
   EXA_API_KEY=your_exa_api_key
   AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key

   # Telegram Integration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   TELEGRAM_CHAT_ID=your_telegram_chat_id

   # Email Service
   RESEND_API_KEY=your_resend_api_key
   FROM_EMAIL=onboarding@resend.dev

   # Bot Protection
   BOTID_SECRET_KEY=your_botid_secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📖 Usage

### For Leads
1. Visit the website and fill out the contact form
2. Provide business email, name, company, and message
3. Form submission triggers AI research and qualification

### For Sales Team
1. Receive Telegram notifications for new leads
2. Review lead details, score, and research summary
3. Approve or reject leads via inline buttons
4. Confirm email sending before outreach
5. Monitor pipeline via Telegram commands

### Telegram Commands
- `/pipeline` - View complete pipeline summary
- `/leads` - List recent leads
- `/approve <lead_id>` - Manually approve a lead
- `/reject <lead_id>` - Manually reject a lead

## 🏗️ Architecture

### Directory Structure
```
TECHBLITZ26_BitWin_Init/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints
│   │   ├── submit/        # Form submission handler
│   │   ├── followup/      # Automated follow-ups
│   │   └── telegram/      # Telegram webhook
│   ├── components/        # React components
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable UI components
├── lib/                   # Business logic
│   ├── services.ts        # AI services & email
│   ├── telegram.ts        # Telegram bot logic
│   ├── pipeline.ts        # Lead management
│   └── types.ts           # TypeScript definitions
├── workflows/             # AI workflow definitions
├── data/                  # Static data files
└── public/                # Static assets
```

### API Endpoints

#### POST `/api/submit`
Handles form submissions, triggers AI research, and sends Telegram notifications.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "company": "Acme Inc",
  "message": "Interested in tech consulting services",
  "phone": "+1234567890"
}
```

#### POST `/api/followup`
Sends automated follow-up emails to leads (Day 2 and Day 5).

#### POST `/api/telegram`
Telegram webhook endpoint for bot interactions.

### Data Flow

1. **Form Submission** → `submit/route.ts`
2. **AI Research** → Synchronous research using Exa.ai and Groq
3. **Qualification** → AI scoring and categorization
4. **Pipeline Save** → Lead saved with research and score
5. **Telegram Notification** → Admin receives detailed notification with research and score
6. **Approval/Rejection** → Admin reviews and decides via Telegram buttons
7. **Email Generation** → AI creates personalized content
8. **Confirmation** → Admin reviews email draft and confirms sending
9. **Email Delivery** → Resend sends to lead
10. **Follow-ups** → Automated email sequences

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq AI API key for LLM inference | Yes |
| `EXA_API_KEY` | Exa.ai API key for web research | Yes |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather | Yes |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | Yes |
| `RESEND_API_KEY` | Resend API key for email delivery | Yes |
| `FROM_EMAIL` | Sender email address | Yes |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key | Optional |

### Telegram Bot Setup

1. Message @BotFather on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token
4. Message your bot once to initialize chat
5. Get chat ID by visiting: `https://api.telegram.org/bot<TOKEN>/getUpdates`

## 📊 Pipeline Management

### Lead Statuses
- **pending** - Awaiting approval
- **approved** - Approved for outreach
- **contacted** - Initial email sent
- **rejected** - Lead rejected

### Qualification Categories
- **QUALIFIED** - High-priority leads (9-10 score)
- **FOLLOW_UP** - Medium-priority leads (7-8 score)
- **REJECTED** - Low-priority leads (1-6 score)

### Follow-up Schedule
- **Day 0** - Initial outreach (after approval)
- **Day 2** - First follow-up
- **Day 5** - Final follow-up attempt

## 🤖 AI Workflows

The system uses custom AI workflows for:
- **Lead Research** - Company analysis and intelligence gathering
- **Content Generation** - Personalized email and message creation
- **Qualification** - Lead scoring and categorization
- **Outreach** - Follow-up message optimization

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Setup
Ensure all required environment variables are set in your deployment platform.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow existing code style and patterns
- Add proper error handling
- Test API endpoints thoroughly
- Update documentation for new features

## 📝 License

This project is proprietary software for BitWin Init.

## 🆘 Support

For support or questions:
- Create an issue in the repository
- Contact the development team
- Check the Telegram bot logs for debugging

## 🔄 Recent Updates

- ✅ AI-powered lead qualification and research
- ✅ Telegram integration with approval workflows
- ✅ Email automation with Resend
- ✅ Personalized content generation
- ✅ Automated follow-up sequences
- ✅ Bot protection integration
- ✅ Comprehensive pipeline management

---

**Built with ❤️ for BitWin Init - Empowering businesses through technology consulting**
# OP SkillSim - OPNZ Plumbing Training Platform

**Project Type**: Educational VR Web Application
**Client**: Open Polytechnic New Zealand Te Pukenga
**Technology**: Next.js + PureWeb + UE5 + LTI 1.0
**Status**: ~92% Complete | Production Ready for Core Features

---

## Project Overview

OP SkillSim delivers browser-based VR plumbing training without requiring local UE5 installation. Students learn real-world NZS3500-compliant procedures through interactive tasks, assessments, and standards-compliant workflows.

### Key Features

- **Browser-based VR**: High-performance UE5 streaming via PureWeb
- **Standards Integration**: NZS3500 New Zealand plumbing compliance
- **Educational Assessment**: Interactive Q1-Q6 knowledge validation
- **LMS Integration**: Secure LTI 1.0 launch from iQualify
- **Teacher Dashboard**: Questionnaire and fitting management

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.x |
| **State Management** | Redux Toolkit |
| **Styling** | Tailwind CSS (CSS Variables) |
| **Database** | Supabase (PostgreSQL) |
| **Streaming** | PureWeb Platform SDK |
| **Authentication** | JWT + LTI 1.0 |
| **Charts** | Recharts (Doughnut, Bar) |
| **Email** | Nodemailer |
| **Deployment** | Vercel |

---

## Project Progress

### Completed Features

| System | Status | Description |
|--------|--------|-------------|
| Authentication | 100% | LTI 1.0, JWT tokens, role-based access |
| Teacher Dashboard | 98% | Questionnaires, fittings, students, results, analytics |
| Admin Analytics | 100% | Training analytics with Recharts visualization |
| User Management | 100% | Outsider registration, approval workflow, email notifications |
| PureWeb Streaming | 100% | Full streaming with warm pool optimization |
| Training System UI | 95% | Controls, sidebar, progress tracking, state persistence |
| Message Passing | 95% | Bidirectional React-UE5 communication |
| Database/APIs | 98% | Complete CRUD operations, phase index tracking |
| Theme System | 100% | Dark/Light mode with CSS variables |
| Production Infrastructure | 90% | Vercel deployment, error handling |

### 8-Phase Training System

Phase data is stored in the `training_phases` database table with index-based tracking:

| Index | Phase Key | Name | UE5 Status | Web Integration |
|-------|-----------|------|------------|-----------------|
| 0 | XRayPhase | X-Ray Assessment | Complete | Complete |
| 1 | DiggingPhase | Excavation | Complete | Complete |
| 2 | MeasuringPhase | Measurement Tool | Complete | Complete |
| 3 | FittingSelectionPhase | Fitting Selection | Complete | 90% |
| 4 | PipeConnectionPhase | Pipe Connection | Complete | Complete |
| 5 | GlueApplicationPhase | Glue Application | Complete | Complete |
| 6 | PressureTesterPhase | Pressure Testing | Complete | Complete |
| 7 | TrainingSummary | Training Summary | Complete | Complete |

> **Note**: Training progress is tracked by phase index (0-7) stored as string in database. Phase names are fetched from `training_phases` table for display.

---

## Project Structure

```
app/
├── admin/                  # Teacher Dashboard
│   ├── components/         # Dashboard UI components
│   │   └── ui/             # Reusable UI (Card, DataTable, Charts)
│   │       ├── SessionsChart.tsx      # Sessions by role bar chart
│   │       ├── TrainingAnalytics.tsx  # Training status doughnut + phase bar
│   │       └── ConfirmDialog.tsx      # Confirmation modal
│   ├── hooks/              # Admin hooks (useAdminQueries, useCurrentUser)
│   ├── context/            # Admin context provider
│   ├── fittings/           # Fitting options management
│   ├── questionnaires/     # Q1-Q6 question editing
│   ├── results/            # Quiz results viewer
│   ├── sessions/           # Training sessions viewer
│   ├── students/           # Student management
│   ├── users/              # User management (approval workflow)
│   └── settings/           # Admin settings
├── api/                    # Next.js API Routes
│   ├── admin/              # Admin API endpoints
│   │   ├── sessions-chart/ # Sessions by role chart data
│   │   ├── training-analytics/ # Training status & phase analytics
│   │   ├── users/          # User management with approval
│   │   ├── results/        # Quiz results
│   │   └── sessions/       # Training sessions
│   ├── auth/               # Authentication (login, session, LTI)
│   ├── lti/                # LTI 1.0 launch endpoint
│   ├── quiz/               # Quiz response handling
│   ├── stream/             # PureWeb streaming APIs
│   └── training/           # Training session APIs
├── components/             # React Components
│   ├── ControlPanel/       # Training control UI
│   ├── Sidebar/            # Collapsible navigation
│   ├── errors/             # Error boundaries
│   ├── layout/             # Layout components
│   └── shared/             # Reusable UI components
├── config/                 # Configuration
│   ├── tasks.config.ts     # Training task definitions
│   └── index.ts            # App configuration
├── features/               # Feature Modules
│   ├── feedback/           # Modals (success, error, session)
│   ├── messaging/          # UE5 message handling
│   ├── onboarding/         # Loading/starter screens
│   ├── questions/          # Quiz modal system
│   ├── streaming/          # Stream management
│   └── training/           # Training flow logic
├── lib/                    # Utilities
│   ├── supabase/           # Database clients (admin, client)
│   ├── sessions/           # Session management (SessionManager)
│   ├── email.ts            # Email templates (approval, notification)
│   ├── warmPool.ts         # Stream optimization
│   ├── logger.ts           # Logging system
│   └── messageTypes.ts     # Message definitions
├── services/               # Service Layer
│   ├── session.service.ts  # Session management
│   ├── stream.service.ts   # Stream API calls
│   └── fitting.service.ts  # Fitting operations
├── store/                  # Redux Store
│   └── slices/             # State slices
└── types/                  # TypeScript Definitions
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account (for database)
- PureWeb account (for streaming)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# PureWeb Configuration
NEXT_PUBLIC_PUREWEB_PROJECT_ID=your_project_id
NEXT_PUBLIC_PUREWEB_MODEL_ID=your_model_id
PUREWEB_PROJECT_CLIENT_ID=your_client_id
PUREWEB_PROJECT_CLIENT_SECRET=your_client_secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Authentication
JWT_SECRET=your_jwt_secret
LTI_KEY=your_lti_key
LTI_SECRET=your_lti_secret

# Warm Pool (Optional)
WARM_POOL_ADMIN_SECRET=your_admin_secret
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Production

```bash
npm run start
```

---

## Core Systems

### Authentication Flow

```
iQualify LMS → LTI Launch → OAuth Validation → JWT Token → Session Creation
                                                    ↓
                                         Role-based Access Control
                                                    ↓
                              Student → Training Interface
                              Teacher → Dashboard Access
```

### Message Passing Protocol

Bidirectional JSON communication between React and UE5:

| Direction | Message Types |
|-----------|---------------|
| UE5 → Web | Quiz triggers, progress updates, tool states, training complete |
| Web → UE5 | Quiz responses, tool selections, training controls |

### Admin Dashboard

| Page | Features |
|------|----------|
| Dashboard | Stats overview, training analytics charts, sessions chart |
| Students | Progress tracking, search, filters, pagination |
| Sessions | Training sessions viewer with phase tracking |
| Users | User management with approval workflow, email notifications |
| Questionnaires | Q1-Q6 question editing with NZS3500 references |
| Fittings | Correct/distractor fitting management |
| Results | Quiz results with detailed breakdown |

### Data Visualization (Recharts)

| Chart | Type | Data Source |
|-------|------|-------------|
| Sessions Overview | Stacked Bar | `user_sessions` table (by role) |
| Training Status | Doughnut | `training_sessions` (completed vs active) |
| Active by Phase | Horizontal Bar | `training_sessions` + `training_phases` |

---

## API Endpoints

### Authentication
- `POST /api/lti/launch` - LTI 1.0 launch from iQualify
- `POST /api/auth/login` - Direct login
- `GET /api/auth/session` - Get current session
- `POST /api/auth/logout` - End session

### Training
- `POST /api/training/session` - Create training session
- `PUT /api/training/progress` - Update progress
- `PUT /api/training/phase` - Update phase
- `POST /api/training/complete` - Complete training

### Quiz
- `POST /api/quiz/response` - Submit quiz answer
- `GET /api/questions` - Get questions

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET/POST /api/admin/students` - Student management
- `GET/POST/PUT/DELETE /api/admin/users` - User management with approval
- `GET/PUT /api/admin/questions` - Question management
- `GET /api/admin/fittings` - Fitting options
- `GET /api/admin/results` - Quiz results
- `GET /api/admin/sessions` - Training sessions with pagination
- `GET /api/admin/sessions-chart` - Sessions by role chart data (weekly/monthly/yearly)
- `GET /api/admin/training-analytics` - Training status and phase distribution

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

---

## Deployment

### Vercel Deployment

1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy (automatic on push to main)

### Important Notes

- Set all `NEXT_PUBLIC_*` variables for client-side access
- Redeploy after adding new environment variables
- Configure allowed domains for LTI in production

---

## Database Schema

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles and approval status |
| `user_sessions` | Active sessions with role tracking |
| `training_sessions` | Training progress with phase index |
| `training_phases` | Phase definitions (key, name, order) |
| `quiz_responses` | Quiz answers per session |
| `questions` | Q1-Q6 question definitions |
| `fitting_options` | Correct/distractor fittings |

### Training Phases Table Structure

```sql
CREATE TABLE training_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_key TEXT UNIQUE NOT NULL,    -- "0", "1", "2"... (index)
  phase_name TEXT NOT NULL,          -- Human-readable name
  phase_order INTEGER NOT NULL,      -- Display order
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Theme System

The application supports dark/light themes using CSS variables defined in `globals.css`:

```css
/* Theme Variables */
--color-bg-primary, --color-bg-secondary, --color-bg-elevated
--color-text-primary, --color-text-secondary, --color-text-muted
--color-border, --color-accent
--color-success, --color-error, --color-info
```

Theme classes are used throughout components:
- `theme-bg-primary`, `theme-bg-secondary`, `theme-bg-elevated`
- `theme-text-primary`, `theme-text-secondary`, `theme-text-muted`
- `theme-border`, `theme-text-success`, `theme-text-error`

---

## Email Notifications

Email templates are defined in `app/lib/email.ts`:

| Template | Trigger |
|----------|---------|
| Approval Request | New outsider registration |
| Account Approved | Admin approves user |
| Account Rejected | Admin rejects user |

---

## Remaining Work

### High Priority
- [ ] End-to-end testing of Phase D fitting selection
- [ ] Production LTI integration testing with iQualify
- [ ] Complete message integration testing with UE5

### Medium Priority
- [ ] Results CSV export functionality
- [ ] Question preview modal in dashboard
- [ ] Mobile/tablet optimization testing

### Completed (Recent)
- [x] Training analytics dashboard with Recharts
- [x] Sessions chart (weekly/monthly/yearly views)
- [x] Phase index storage instead of phase names
- [x] training_phases table integration
- [x] Theme support for all chart components
- [x] User approval workflow with email notifications
- [x] State persistence for session resume

### Future Enhancements
- [ ] Certificate generation
- [ ] Multi-course support
- [ ] Advanced reporting exports

---

## License

Private - All rights reserved
Open Polytechnic New Zealand Te Pukenga

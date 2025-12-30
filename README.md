# OP SkillSim - OPNZ Plumbing Training Platform

**Project Type**: Educational VR Web Application
**Client**: Open Polytechnic New Zealand Te Pukenga
**Technology**: Next.js + PureWeb + UE5 + LTI 1.0
**Status**: ~87% Complete | Production Ready for Core Features

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
| **Styling** | Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Streaming** | PureWeb Platform SDK |
| **Authentication** | JWT + LTI 1.0 |
| **Deployment** | Vercel |

---

## Project Progress

### Completed Features

| System | Status | Description |
|--------|--------|-------------|
| Authentication | 100% | LTI 1.0, JWT tokens, role-based access |
| Teacher Dashboard | 95% | Questionnaires, fittings, students, results |
| PureWeb Streaming | 100% | Full streaming with warm pool optimization |
| Training System UI | 90% | Controls, sidebar, progress tracking |
| Message Passing | 90% | Bidirectional React-UE5 communication |
| Database/APIs | 95% | Complete CRUD operations |
| Production Infrastructure | 85% | Vercel deployment, error handling |

### 8-Phase Training System

| Phase | Name | UE5 Status | Web Integration |
|-------|------|------------|-----------------|
| A | X-Ray Assessment | Complete | Complete |
| B | Excavation | Complete | Complete |
| C | Measurement Tool | Complete | Complete |
| D | Fitting Selection | Complete | 70% - Needs Testing |
| E | Pipe Connection | Complete | Complete |
| F | Glue Application | Complete | Complete |
| G | Pressure Testing | Complete | Complete |
| H | Training Summary | Complete | Complete |

---

## Project Structure

```
app/
├── admin/                  # Teacher Dashboard
│   ├── components/         # Dashboard UI components
│   ├── context/            # Admin context provider
│   ├── fittings/           # Fitting options management
│   ├── questionnaires/     # Q1-Q6 question editing
│   ├── results/            # Quiz results viewer
│   ├── students/           # Student management
│   ├── users/              # User management
│   └── settings/           # Admin settings
├── api/                    # Next.js API Routes
│   ├── admin/              # Admin API endpoints
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
│   ├── supabase.ts         # Database client
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

### Teacher Dashboard

| Page | Features |
|------|----------|
| Dashboard | Stats overview, recent activity, top performers |
| Students | Progress tracking, search, filters, pagination |
| Users | Teacher/admin management with role permissions |
| Questionnaires | Q1-Q6 question editing with NZS3500 references |
| Fittings | Correct/distractor fitting management |
| Results | Quiz results with detailed breakdown |

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
- `GET/POST/PUT/DELETE /api/admin/users` - User management
- `GET/PUT /api/admin/questions` - Question management
- `GET /api/admin/fittings` - Fitting options
- `GET /api/admin/results` - Quiz results

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

## Remaining Work

### High Priority
- [ ] End-to-end testing of Phase D fitting selection
- [ ] Production LTI integration testing with iQualify
- [ ] Complete message integration testing with UE5

### Medium Priority
- [ ] Results CSV export functionality
- [ ] Question preview modal in dashboard
- [ ] Mobile/tablet optimization testing

### Future Enhancements
- [ ] Advanced analytics dashboard
- [ ] Email integration for results
- [ ] Certificate generation
- [ ] Multi-course support

---

## License

Private - All rights reserved
Open Polytechnic New Zealand Te Pukenga

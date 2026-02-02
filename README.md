# OP SkillSim - OPNZ Plumbing Training Platform

**Project Type**: Educational VR Web Application
**Client**: Open Polytechnic New Zealand Te Pukenga
**Technology**: Next.js 15 + PureWeb + Unreal Engine 5 + LTI 1.0
**Status**: Production Ready

---

## Project Overview

OP SkillSim delivers browser-based VR plumbing training without requiring local UE5 installation. Students learn real-world NZS3500-compliant procedures through interactive tasks, assessments, and standards-compliant workflows. The application streams a real-time 3D environment from a UE5 application via PureWeb SDK.

### Key Features

- **Browser-based VR**: High-performance UE5 streaming via PureWeb SDK (WebRTC)
- **Standards Integration**: NZS3500 New Zealand plumbing compliance
- **Educational Assessment**: Interactive Q1-Q6 knowledge validation with hints
- **LMS Integration**: Secure LTI 1.0 launch from iQualify with OAuth 1.0a
- **Session Resume**: Resume training from saved phase using email lookup
- **Teacher Dashboard**: Questionnaire, fitting management, analytics, and user approval
- **Cinematic Mode**: 3D model exploration with explosion/layer controls
- **Real-time Communication**: Bidirectional React-UE5 message protocol
- **Walkthrough System**: Guided tutorials for cinematic and training modes
- **PDF Export**: Training results export with detailed quiz performance
- **Warm Pool**: Pre-warmed environments for faster stream connections

---

## Tech Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js | 15.x (App Router) |
| **Language** | TypeScript | 5.x |
| **Runtime** | React | 19.x |
| **State Management** | Redux Toolkit + React Context | 2.x |
| **Styling** | Tailwind CSS | 4.x |
| **Database** | Supabase (PostgreSQL) | - |
| **Streaming** | PureWeb Platform SDK | 5.0.5 |
| **Authentication** | JWT (RS256) + LTI 1.0 OAuth | jose 6.x |
| **Data Fetching** | TanStack React Query | 5.x |
| **Charts** | Recharts | 3.x |
| **Icons** | Lucide React | 0.561.x |
| **Email** | Resend | 6.x |
| **PDF Export** | jsPDF + jspdf-autotable | 4.x / 5.x |
| **Testing** | Vitest + Happy DOM | 4.x / 20.x |
| **Deployment** | Vercel | - |

---

## Project Structure

```
app/
├── admin/                          # Teacher/Admin Dashboard
│   ├── components/                 # Dashboard UI components
│   │   ├── charts/                 # SessionsChart, PhaseDistributionChart
│   │   ├── layout/                 # DashboardLayout, Sidebar, Navbar
│   │   ├── modals/                 # Dialog components
│   │   ├── notifications/          # Notification UI
│   │   └── ui/                     # StatCard, DataTable, Badge, Pagination
│   ├── context/                    # AdminContext (isLti state)
│   ├── hooks/                      # useAdminQueries, useCurrentUser, useExport
│   ├── services/                   # notification.service.ts
│   ├── fittings/                   # Pipe fittings management
│   ├── questionnaires/             # Q1-Q6 question management
│   ├── results/                    # Training results viewer
│   ├── sessions/                   # Session management
│   ├── users/                      # User management with approval workflow
│   ├── settings/                   # Admin settings page
│   └── profile/                    # Admin profile management
│
├── api/                            # Next.js API Routes (42+ routes)
│   ├── auth/                       # Authentication (login, register, session, logout)
│   ├── lti/                        # LTI 1.0 launch endpoint
│   ├── training/                   # Training session management
│   │   ├── session/                # CRUD training sessions
│   │   ├── sessions/               # List/search sessions
│   │   ├── progress/               # Update training progress
│   │   ├── complete/               # Complete training session
│   │   ├── state/                  # Save/restore training state
│   │   ├── export/                 # Export training data for PDF
│   │   └── phase/                  # Phase completion
│   ├── stream/                     # PureWeb streaming
│   │   ├── credentials/            # Stream credentials
│   │   ├── create/                 # Create stream session
│   │   ├── agent-token/            # Agent authentication
│   │   ├── warm-init/              # Initialize warm pool
│   │   └── warm-claim/             # Claim pre-warmed environment
│   ├── admin/                      # Admin endpoints
│   │   ├── dashboard/              # Dashboard statistics
│   │   ├── sessions/               # All training sessions
│   │   ├── users/                  # User management
│   │   ├── notifications/          # Notification management
│   │   ├── questions/              # Question CRUD
│   │   ├── fittings/               # Fitting options CRUD
│   │   └── results/                # Quiz results analytics
│   ├── quiz/                       # Quiz response submission
│   ├── questions/                  # Fetch Q1-Q6 questions
│   ├── fittings/                   # Pipe fitting options
│   └── walkthrough/                # Tutorial/walkthrough steps
│
├── components/                     # Shared React Components
│   ├── ControlPanel/               # Training control UI
│   │   ├── index.tsx               # Main toolbar orchestrator
│   │   ├── ToolBar.tsx             # Bottom toolbar with tool buttons
│   │   ├── UnifiedSidebar.tsx      # Left sidebar (materials, controls)
│   │   ├── TrainingTab.tsx         # Training progress display
│   │   ├── TaskTools.tsx           # Task-specific tool options
│   │   ├── ToolsTab.tsx            # Tool selection grid
│   │   ├── LayersTab.tsx           # Layer visibility controls
│   │   ├── CinematicTab.tsx        # Cinematic mode controls
│   │   └── CameraTab.tsx           # Camera position controls
│   ├── StreamingApp.tsx            # Main streaming app orchestrator
│   ├── ModalContainer.tsx          # Centralized modal rendering
│   ├── ResultExportPDF.tsx         # PDF result export
│   └── errors/                     # Error boundaries
│
├── features/                       # Feature Modules (Domain-driven)
│   ├── camera/                     # Camera control hooks
│   ├── cinematic/                  # Cinematic mode & 3D exploration
│   ├── explosion/                  # Building explosion/assembly visualization
│   ├── feedback/                   # Training feedback modals
│   ├── idle/                       # Idle detection & warnings
│   ├── layers/                     # Layer visibility controls
│   ├── messaging/                  # PureWeb message protocol
│   ├── onboarding/                 # User onboarding flow
│   ├── questions/                  # Quiz/Question handling
│   ├── streaming/                  # PureWeb SDK integration
│   ├── training/                   # Training progress & state
│   └── walkthrough/                # Tutorial walkthrough UI
│
├── hooks/                          # Global React Hooks
│   ├── useStreamConnection.ts      # PureWeb connection lifecycle
│   ├── useTrainingMessagesComposite.ts # Composite message handler
│   ├── useModalManager.ts          # Modal state management
│   ├── useScreenFlow.ts            # Screen/page navigation
│   ├── useSessionSelection.ts      # Previous session selection
│   ├── useTrainingPersistence.ts   # Save/restore training state
│   └── useStreamHealthMonitor.ts   # Connection health checks
│
├── lib/                            # Utility & Library Code
│   ├── supabase/                   # Supabase clients (admin, client, server)
│   ├── sessions/                   # SessionManager (JWT sessions)
│   ├── events/                     # Event bus (typed emitter)
│   ├── auth.ts                     # JWT signing/verification (RS256)
│   ├── lti.ts                      # LTI 1.0 OAuth signature validation
│   ├── logger.ts                   # Pino logger with structured logging
│   ├── messageTypes.ts             # Message protocol constants
│   └── warmPool.ts                 # PureWeb warm pool management
│
├── services/                       # Business Logic Services
│   ├── training.service.ts         # Training progress calculations
│   ├── training-session.service.ts # Session database operations
│   ├── quiz.service.ts             # Quiz response handling
│   ├── stream.service.ts           # PureWeb streaming operations
│   └── fitting.service.ts          # Pipe fitting operations
│
├── store/                          # Redux Store
│   ├── slices/                     # Redux slices (training, ui, connection)
│   ├── StoreProvider.tsx           # Store initialization
│   └── selectors.ts                # Memoized selectors
│
├── types/                          # TypeScript Types
│   ├── session.types.ts            # User/session types
│   ├── training.types.ts           # Training domain types
│   ├── training-session.types.ts   # Database schema types
│   ├── messages.types.ts           # Message protocol types
│   ├── quiz.types.ts               # Quiz/question types
│   ├── fitting.types.ts            # Pipe fitting types
│   └── walkthrough.types.ts        # Tutorial types
│
├── config/                         # Centralized Configuration
│   ├── tasks.config.ts             # Training tasks (6 phases)
│   ├── questions.config.ts         # Q1-Q6 question configuration
│   └── camera.config.ts            # Camera presets & defaults
│
├── training-results/               # Training results page (public)
├── session-complete/               # Session completion page
└── login/                          # Login page
```

---

## Training System

### 6-Phase Training Tasks

| Index | Tool | Task Name | Description |
|-------|------|-----------|-------------|
| 0 | XRay | Pipe Location Scanning | Locate underground pipes before excavation |
| 1 | Shovel | Excavation | Dig trench to proper depth (450mm) and width (400mm) |
| 2 | Measuring | Pipe Measuring | Measure and verify pipe slope (1:60) |
| 3 | PipeConnection | Pipe Connection | Select and connect correct fittings |
| 4 | Glue | Glue Application | Apply PVC cement properly |
| 5 | PressureTester | Pressure Testing | Conduct air/water pressure test at 20 PSI |

### Quiz Questions (Q1-Q6)

| ID | Topic | Phase |
|----|-------|-------|
| Q1 | XRay before excavation | After XRay |
| Q2 | Trench depth for toilet waste | After Excavation |
| Q3 | Trench width for 100mm pipe | After Excavation |
| Q4 | Pipe slope ratio (1:60) | After Measuring |
| Q5 | Maximum residential pressure | Before Pressure Test |
| Q6 | Test PSI per NZS3500 (20 PSI) | After Pressure Test |

### Training Data Flow

```
User completes phase → onTaskCompleted callback
    ↓
trainingSessionService.completePhase() → POST /api/training/phase
    ↓
Database: training_sessions.phases_completed incremented
    ↓
Training completes → useTrainingPersistence saves final data
    ↓
Quiz results saved to quiz_responses table
    ↓
/api/training/export returns data for PDF
```

---

## Message Protocol

Bidirectional JSON communication between React and Unreal Engine 5.

### Web → UE5 Commands

| Command | Format | Description |
|---------|--------|-------------|
| `training_control` | `start\|pause\|reset\|test` | Control training flow |
| `start_from_task` | `0-6` | Resume from specific phase |
| `tool_select` | `XRay\|Shovel\|Measuring\|PipeConnection\|Glue\|PressureTester` | Select tool |
| `task_start` | `ToolName` or `ToolName:PipeType` | Start task |
| `pipe_select` | `y-junction\|elbow\|100mm\|150mm` | Select fitting |
| `test_plug_select` | `AirPlug\|WaterPlug\|AccessCap` | Select test plug |
| `pressure_test_start` | `air_test\|water_test\|player_closed_q6` | Start pressure test |
| `question_answer` | `Q1:tryCount:true/false` | Submit answer |
| `question_hint` | `Q1` | Request hint |
| `camera_control` | `Front\|Back\|Left\|Right\|Top\|orbit_start\|reset` | Camera control |
| `explosion_control` | `explode\|assemble\|0-100` | Model explosion |
| `waypoint_control` | `list\|activate:0\|deactivate` | Waypoint navigation |
| `layer_control` | `list\|toggle:0\|show:Name\|hide:Name` | Layer visibility |

### UE5 → Web Messages

| Message | Format | Description |
|---------|--------|-------------|
| `training_progress` | `progress:taskName:phase:currentTask:totalTasks:isActive` | Progress update |
| `tool_change` | `toolName` | Tool changed |
| `task_completed` | `taskId` | Task finished |
| `question_request` | `Q1-Q6` | Show question modal |
| `pressure_test_result` | `passed:pressure:testType` | Test results |
| `waypoint_list` | JSON array | Available waypoints |
| `layer_list` | JSON array | Layer visibility |
| `explosion_update` | `value:isAnimating` | Explosion state |
| `camera_update` | `mode:perspective:distance:transitioning` | Camera state |

---

## Authentication Flow

### LTI 1.0 Launch Flow (iQualify)

```
iQualify LMS → POST /api/lti/launch (OAuth 1.0a signature)
    ↓
Server validates signature using LTI_SHARED_SECRET
    ↓
Extract user info: user_id, roles, email, name, context_id
    ↓
SessionManager.createSession() creates/updates LTI user
    ↓
Generate JWT token (RS256) with role
    ↓
Set HTTP-only cookie with token
    ↓
Redirect:
  - Students → / (training page)
  - Teachers/Admins → /admin (dashboard)
```

### Session Resume Feature

Students can resume training from their saved phase:

1. On LTI launch, system checks for active sessions by email
2. If sessions exist, shows `SessionSelectionScreen` with options:
   - Resume existing session (skips cinematic, starts at saved phase)
   - Start new session (shows cinematic mode first)
3. On resume, `start_from_task:<phaseIndex>` command sent to UE5
4. Quiz answers restored from database to in-memory state

### Role-Based Access Control

| Role | Access |
|------|--------|
| **Student** | Training interface, quiz, results |
| **Teacher** | Dashboard, questionnaire editing, fitting management |
| **Admin** | Full access including user management |

---

## Admin Dashboard

| Page | Features |
|------|----------|
| **Dashboard** | Stats overview, training analytics charts, sessions chart |
| **Students** | Progress tracking, search, filters, pagination |
| **Sessions** | Training sessions viewer with phase tracking |
| **Users** | User management with approval workflow, email notifications |
| **Questionnaires** | Q1-Q6 question editing with NZS3500 references |
| **Fittings** | Correct/distractor fitting management |
| **Results** | Quiz results with detailed breakdown and PDF export |
| **Notifications** | Admin notifications for user approvals |

---

## Database Schema (Supabase)

### Core Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User accounts with roles and approval status |
| `teacher_profiles` | Teacher permissions and settings |
| `training_sessions` | Training progress with phase tracking |
| `quiz_responses` | Quiz answers with question_data JSONB |
| `questionnaires` | Q1-Q6 question definitions |
| `fitting_options` | Pipe fitting options |
| `admin_notifications` | Admin notification system |
| `walkthrough_steps` | Cinematic walkthrough steps |
| `training_walkthrough_steps` | Training mode walkthrough steps |

### Training Sessions Schema

```sql
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  email TEXT,
  student JSONB,                    -- {user_id, email, full_name, institution}
  course_id TEXT,
  course_name TEXT,
  current_training_phase TEXT,      -- Phase index as string ("0"-"6")
  overall_progress INTEGER DEFAULT 0,
  phases_completed INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- seconds
  status TEXT DEFAULT 'active',     -- 'active' | 'completed'
  persisted_state JSONB,            -- Training state for resume
  final_results JSONB,              -- Final results with quiz performance
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Quiz Responses Schema

```sql
CREATE TABLE quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id),
  question_data JSONB,              -- {"Q1": {answer, correct, attempts, time}}
  total_questions INTEGER,
  correct_count INTEGER,
  score_percentage NUMERIC,
  answered_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (v20 recommended)
- npm or yarn
- Supabase account
- PureWeb account and credentials
- LTI consumer credentials (for LMS integration)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd op-skillsim

# Install dependencies
npm install
```

### Generate JWT Keys

```bash
# Generate private key
openssl genrsa -out keys/jwt_private.pem 2048

# Generate public key
openssl rsa -in keys/jwt_private.pem -pubout -out keys/jwt_public.pub
```

### Environment Variables

Create `.env.local`:

```env
# PureWeb Configuration
NEXT_PUBLIC_PUREWEB_PROJECT_ID=your_project_id
NEXT_PUBLIC_PUREWEB_MODEL_ID=your_model_id
NEXT_PUBLIC_PUREWEB_CLIENT_ID=your_client_id
NEXT_PUBLIC_PUREWEB_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_PUREWEB_ACCESS_TOKEN=your_access_token
NEXT_PUBLIC_PUREWEB_API_KEY=your_api_key

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_PRIVATE_KEY_PATH=keys/jwt_private.pem
JWT_PUBLIC_KEY_PATH=keys/jwt_public.pub

# LTI Configuration
NEXT_PUBLIC_LTI_CONSUMER_KEY=op-skillsim-polytechnic-nz
NEXT_PUBLIC_LTI_SHARED_SECRET=your_lti_secret

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Origin Whitelist (CORS)
ORIGIN_WHITELIST=http://localhost:3000,https://your-domain.com
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build & Production

```bash
# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
npm run test:run      # CI mode
npm run test:coverage # Coverage report
```

---

## Deployment (Vercel)

1. Connect repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy (automatic on push to main)

### Important Notes

- Set all `NEXT_PUBLIC_*` variables for client-side access
- Redeploy after adding new environment variables
- Configure allowed domains for LTI in production
- Ensure PureWeb model is active and accessible
- Generate and upload JWT keys to Vercel

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests in watch mode |
| `npm run test:run` | Run tests once (CI) |
| `npm run test:coverage` | Generate coverage report |

---

## License

Private - All rights reserved
Open Polytechnic New Zealand Te Pukenga

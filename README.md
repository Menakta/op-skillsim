# OP SkillSim - OPNZ Plumbing Training Platform

**Project Type**: Educational VR Web Application
**Client**: Open Polytechnic New Zealand Te Pukenga
**Technology**: Next.js 14 + PureWeb + Unreal Engine 5 + LTI 1.0
**Status**: Production Ready

---

## Project Overview

OP SkillSim delivers browser-based VR plumbing training without requiring local UE5 installation. Students learn real-world NZS3500-compliant procedures through interactive tasks, assessments, and standards-compliant workflows.

### Key Features

- **Browser-based VR**: High-performance UE5 streaming via PureWeb SDK
- **Standards Integration**: NZS3500 New Zealand plumbing compliance
- **Educational Assessment**: Interactive Q1-Q6 knowledge validation
- **LMS Integration**: Secure LTI 1.0 launch from iQualify
- **Session Resume**: Resume training from saved phase using email lookup
- **Teacher Dashboard**: Questionnaire, fitting management, and analytics
- **Cinematic Mode**: 3D model exploration with explosion/layer controls
- **Real-time Communication**: Bidirectional React-UE5 message protocol

---

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.x |
| **State Management** | Redux Toolkit + React Context |
| **Styling** | Tailwind CSS (CSS Variables) |
| **Database** | Supabase (PostgreSQL) |
| **Streaming** | PureWeb Platform SDK |
| **Authentication** | JWT + LTI 1.0 OAuth |
| **Charts** | Recharts (Doughnut, Bar) |
| **Email** | Nodemailer |
| **Deployment** | Vercel |

---

## Project Structure

```
app/
├── admin/                      # Teacher Dashboard
│   ├── components/             # Dashboard UI components
│   │   ├── layout/             # DashboardLayout, Sidebar
│   │   └── ui/                 # Card, DataTable, Charts, ConfirmDialog
│   ├── hooks/                  # useAdminQueries, useCurrentUser
│   ├── context/                # Admin context provider
│   ├── fittings/               # Fitting options management
│   ├── questionnaires/         # Q1-Q6 question editing
│   ├── results/                # Quiz results viewer
│   ├── sessions/               # Training sessions viewer
│   ├── students/               # Student management
│   ├── users/                  # User management (approval workflow)
│   └── settings/               # Admin settings
│
├── api/                        # Next.js API Routes
│   ├── admin/                  # Admin endpoints
│   │   ├── dashboard/          # Stats overview
│   │   ├── sessions-chart/     # Sessions analytics
│   │   ├── training-analytics/ # Training status & phase data
│   │   ├── users/              # User management with approval
│   │   ├── results/            # Quiz results
│   │   └── sessions/           # Training sessions
│   ├── auth/                   # Authentication
│   │   ├── login/              # Teacher/admin login
│   │   ├── register/           # New user registration
│   │   ├── confirm-email/      # Email confirmation
│   │   ├── session/            # Session management
│   │   └── logout/             # Logout
│   ├── lti/                    # LTI 1.0 integration
│   │   └── launch/             # LTI launch endpoint
│   ├── fittings/               # Pipe fitting options
│   ├── questions/              # Question management
│   ├── quiz/                   # Quiz responses
│   ├── stream/                 # PureWeb streaming
│   │   ├── credentials/        # Stream credentials
│   │   ├── create/             # Create session
│   │   ├── agent-token/        # Agent authentication
│   │   ├── warm-init/          # Warm pool initialization
│   │   └── warm-claim/         # Claim warm session
│   └── training/               # Training management
│       ├── session/            # Start/get session
│       ├── sessions/           # List sessions + resume
│       ├── complete/           # Complete training
│       ├── progress/           # Update progress
│       ├── state/              # Save/restore state
│       └── phase/              # Phase information
│
├── components/                 # React Components
│   ├── ControlPanel/           # Training control UI
│   │   ├── index.tsx           # Main toolbar
│   │   ├── TaskTools.tsx       # Pipe/test selection panels
│   │   ├── ToolsTab.tsx        # Tool selection grid
│   │   ├── CameraTab.tsx       # Camera controls
│   │   ├── LayersTab.tsx       # Layer visibility
│   │   └── CinematicTab.tsx    # Cinematic mode controls
│   ├── StreamingApp.tsx        # Main application shell
│   ├── MessageLog.tsx          # Debug message viewer
│   ├── ThemeToggle.tsx         # Dark/light mode toggle
│   ├── Sidebar/                # Collapsible navigation
│   ├── errors/                 # Error boundaries
│   ├── layout/                 # StatusBar, layouts
│   └── shared/                 # BaseModal, Button, reusable UI
│
├── config/                     # Configuration
│   ├── tasks.config.ts         # Training task definitions
│   ├── questions.config.ts     # Question definitions
│   ├── camera.config.ts        # Camera perspectives
│   └── index.ts                # App configuration exports
│
├── context/                    # React Contexts
│   └── ThemeContext.tsx        # Theme provider
│
├── features/                   # Feature Modules
│   ├── camera/                 # Camera control hooks
│   ├── cinematic/              # Cinematic mode components
│   │   ├── CinematicTimer.tsx
│   │   ├── CinematicMobileControls.tsx
│   │   ├── ExplosionControls.tsx
│   │   ├── WaypointControls.tsx
│   │   ├── CameraControls.tsx
│   │   └── LayerControls.tsx
│   ├── explosion/              # Explosion control hooks
│   ├── feedback/               # Modal components
│   │   ├── ErrorModal.tsx
│   │   ├── SuccessModal.tsx
│   │   ├── SessionModal.tsx
│   │   ├── TrainingCompleteModal.tsx
│   │   └── SessionExpiryModal.tsx
│   ├── idle/                   # Idle detection
│   │   ├── useIdleDetection.ts
│   │   └── IdleWarningModal.tsx
│   ├── layers/                 # Layer control hooks
│   ├── messaging/              # UE5 message handling
│   │   ├── useMessageBus.ts
│   │   └── MessagingContext.tsx
│   ├── onboarding/             # Onboarding screens
│   │   ├── LoadingScreen.tsx
│   │   ├── StarterScreen.tsx
│   │   ├── NavigationWalkthrough.tsx
│   │   ├── SessionSelectionScreen.tsx
│   │   └── ResumeConfirmationModal.tsx
│   ├── questions/              # Quiz system
│   │   ├── QuestionModal.tsx
│   │   ├── useQuestionFlow.ts
│   │   └── QuestionsContext.tsx
│   ├── streaming/              # Stream management
│   └── training/               # Training flow
│       ├── useTrainingState.ts
│       ├── useToolSelection.ts
│       ├── useFittingOptions.ts
│       └── useStatePersistence.ts
│
├── hooks/                      # Global Hooks
│   ├── index.ts
│   ├── useSession.tsx          # Session provider
│   └── useTrainingMessagesComposite.ts
│
├── lib/                        # Utilities
│   ├── supabase/               # Database clients
│   │   ├── admin.ts            # Admin client
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   ├── sessions/               # Session management
│   │   └── SessionManager.ts
│   ├── events/                 # Event bus
│   ├── performance/            # VirtualList, throttling
│   ├── email.ts                # Email templates
│   ├── warmPool.ts             # Stream optimization
│   ├── logger.ts               # Logging system
│   ├── lti.ts                  # LTI utilities
│   └── messageTypes.ts         # Message protocol definitions
│
├── services/                   # Service Layer
│   ├── training.service.ts     # Task management
│   ├── training-session.service.ts # Session persistence
│   ├── fitting.service.ts      # Fitting options (cached)
│   ├── session.service.ts      # Auth session
│   ├── stream.service.ts       # PureWeb streaming
│   └── quiz.service.ts         # Quiz responses
│
├── store/                      # Redux Store
│   ├── StoreProvider.tsx
│   ├── hooks.ts
│   ├── selectors.ts
│   └── slices/
│       ├── trainingSlice.ts
│       ├── connectionSlice.ts
│       └── uiSlice.ts
│
└── types/                      # TypeScript Definitions
    ├── training.types.ts
    ├── training-session.types.ts
    ├── fitting.types.ts
    ├── quiz.types.ts
    ├── messages.types.ts
    └── ui.types.ts
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

| ID | Topic | Correct Answer |
|----|-------|----------------|
| Q1 | XRay before excavation | Always scan before digging |
| Q2 | Trench depth for toilet waste | 450mm minimum |
| Q3 | Trench width for 100mm pipe | 400mm minimum |
| Q4 | Pipe slope ratio | 1:60 (1.67%) |
| Q5 | Maximum residential pressure | 500 kPa |
| Q6 | Test PSI per NZS3500 | 20 PSI |

---

## Message Protocol

Bidirectional JSON communication between React and Unreal Engine 5.

### Web → UE5 Commands

| Command | Format | Description |
|---------|--------|-------------|
| `training_control` | `start\|pause\|reset\|test` | Control training flow |
| `start_from_task` | `0-6` | Resume from specific phase |
| `tool_select` | `XRay\|Shovel\|Measuring\|PipeConnection\|Glue\|PressureTester\|Cutting` | Select tool |
| `task_start` | `ToolName` or `ToolName:PipeType` | Start task |
| `pipe_select` | `y-junction\|elbow\|100mm\|150mm` | Select fitting |
| `test_plug_select` | `AirPlug\|WaterPlug\|AccessCap` | Select test plug |
| `pressure_test_start` | `air_test\|water_test\|player_closed_q6` | Start pressure test |
| `question_answer` | `Q1:tryCount:true/false` | Submit answer |
| `question_hint` | `Q1` | Request hint |
| `question_close` | `Q1` | Close question |
| `camera_control` | `Front\|Back\|Left\|Right\|Top\|IsometricNE\|orbit_start\|reset` | Camera control |
| `explosion_control` | `explode\|assemble\|0-100` | Model explosion |
| `waypoint_control` | `list\|activate:0\|deactivate` | Waypoint navigation |
| `layer_control` | `list\|toggle:0\|show:Name\|hide:Name` | Layer visibility |
| `hierarchical_control` | `list\|show_all\|hide_all\|toggle_main:Name` | Hierarchical groups |
| `application_control` | `quit` | Exit application |

### UE5 → Web Messages

| Message | Format | Description |
|---------|--------|-------------|
| `training_progress` | `progress:taskName:phase:currentTask:totalTasks:isActive` | Progress update |
| `tool_change` | `toolName` | Tool changed |
| `task_completed` | `taskId` | Task finished |
| `task_start` | `toolName` | Task started |
| `question_request` | `Q1-Q6` | Show question modal |
| `pressure_test_result` | `passed:pressure:testType` | Test results |
| `waypoint_list` | JSON array | Available waypoints |
| `waypoint_update` | `index:name:isActive:progress` | Waypoint state |
| `layer_list` | JSON array | Layer visibility |
| `hierarchical_list` | JSON array | Hierarchical groups |
| `explosion_update` | `value:isAnimating` | Explosion state |
| `camera_update` | `mode:perspective:distance:transitioning` | Camera state |
| `error` | `code:details` | Error from UE5 |

---

## Authentication Flow

```
iQualify LMS → LTI Launch → OAuth Validation → JWT Token → Session Creation
                                                    ↓
                                         Role-based Access Control
                                                    ↓
                              Student → Training Interface
                              Teacher → Dashboard Access
                              Admin   → Full Management
```

### Session Resume Feature

Students can resume training from their saved phase:

1. On LTI launch, system checks for active sessions by email
2. If sessions exist, shows `SessionSelectionScreen` with options:
   - Resume existing session (skips cinematic, starts at saved phase)
   - Start new session (shows cinematic mode first)
3. On resume, `start_from_task:<phaseIndex>` command sent to UE5

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
| **Results** | Quiz results with detailed breakdown |

### Analytics Charts (Recharts)

| Chart | Type | Data Source |
|-------|------|-------------|
| Sessions Overview | Stacked Bar | `user_sessions` (by role, weekly/monthly/yearly) |
| Training Status | Doughnut | `training_sessions` (completed vs active) |
| Active by Phase | Horizontal Bar | `training_sessions` + `training_phases` |

---

## Cinematic Mode

Interactive 3D model exploration before training begins.

### Controls (Desktop - Dropdown Accordion)

- **Building Explosion**: Slider 0-100%, Explode/Assemble buttons
- **Waypoints**: Navigate to predefined camera positions
- **Layers**: Toggle visibility of building components

### Camera Perspectives

Front, Back, Left, Right, Top, Bottom, IsometricNE, IsometricSE, IsometricSW, IsometricNW

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen |
| `R` | Reset camera |
| `O` | Toggle auto-orbit |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase account
- PureWeb account

### Installation

```bash
npm install
```

### Environment Variables

Create `.env.local`:

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

# Email (Nodemailer)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# Warm Pool (Optional)
WARM_POOL_ADMIN_SECRET=your_admin_secret
```

### Development

```bash
npm run dev
```

### Build & Production

```bash
npm run build
npm run start
```

---

## Database Schema

### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with roles and approval status |
| `user_sessions` | Active sessions with role tracking |
| `training_sessions` | Training progress with phase index and course info |
| `training_phases` | Phase definitions (key, name, order) |
| `quiz_responses` | Quiz answers per session |
| `questions` | Q1-Q6 question definitions |
| `fitting_options` | Correct/distractor fittings from Supabase |

### Training Sessions Schema

```sql
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  student JSONB,                    -- {user_id, email, full_name, institution}
  course_id TEXT,
  course_name TEXT,
  current_training_phase TEXT,      -- Phase index as string ("0"-"6")
  overall_progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  phases_completed INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Theme System

CSS variables defined in `globals.css`:

```css
/* Theme Variables */
--color-bg-primary, --color-bg-secondary, --color-bg-elevated
--color-text-primary, --color-text-secondary, --color-text-muted
--color-border, --color-accent (#39BEAE)
--color-success (#44CF8A), --color-error, --color-info
```

Theme utility classes:
- `theme-bg-primary`, `theme-bg-secondary`, `theme-bg-elevated`
- `theme-text-primary`, `theme-text-secondary`, `theme-text-muted`
- `theme-border`, `theme-text-success`, `theme-text-error`

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
- Ensure PureWeb model is active and accessible

---

## License

Private - All rights reserved
Open Polytechnic New Zealand Te Pukenga

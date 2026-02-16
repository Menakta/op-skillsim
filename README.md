# OP-Skillsim Application Context

## Overview
**OP-Skillsim** is a Next.js 15 web application for Open Polytechnic New Zealand (Te Pukenga) that provides an interactive plumbing training simulator. It streams a real-time 3D environment from an Unreal Engine 5 (UE5) application via PureWeb SDK for immersive skill-based training.

---

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **State Management**: Redux Toolkit + React Context
- **Styling**: Tailwind CSS + CSS Modules
- **Data Fetching**: TanStack Query (React Query)
- **Fonts**: Geist Sans & Geist Mono

### Backend/Services
- **Streaming**: PureWeb Platform SDK (WebRTC streaming from UE5)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT (RS256) + LTI 1.3 integration
- **Logging**: Pino logger

### Key Dependencies
- `@pureweb/platform-sdk` & `@pureweb/platform-sdk-react`: Real-time 3D streaming
- `@supabase/supabase-js`: Database operations
- `jose` & `jsonwebtoken`: JWT handling
- `jspdf` & `jspdf-autotable`: PDF export for training results
- `recharts`: Admin dashboard charts
- `lucide-react`: Icons

---

## Project Structure

```
/app
├── /admin                  # Teacher/Admin dashboard
│   ├── /components         # Dashboard UI components
│   │   ├── /charts        # SessionsChart, PhaseDistributionChart, etc.
│   │   ├── /layout        # DashboardLayout, Sidebar, Navbar
│   │   └── /ui            # StatCard, Card, Badge, Pagination, etc.
│   ├── /context           # AdminContext (isLti state)
│   ├── /hooks             # useSessions, useQuestions, useFittings, useResults
│   ├── /questionnaires    # Questionnaire management page
│   ├── /results           # Training results page
│   ├── /sessions          # Session management page
│   ├── /fittings          # Pipe fittings management page
│   ├── layout.tsx         # Admin layout with AdminProvider
│   └── page.tsx           # Main dashboard page
│
├── /api                    # API Routes
│   ├── /auth
│   │   ├── /login         # POST: Email/password login
│   │   ├── /logout        # POST: Clear session
│   │   ├── /register      # POST: Outsider registration
│   │   ├── /session       # GET: Validate session
│   │   └── /simple-login  # POST: Non-LTI authentication
│   ├── /lti
│   │   └── /launch        # POST: LTI 1.3 launch handler
│   ├── /training
│   │   ├── /session       # GET/POST/PATCH: Training session CRUD
│   │   ├── /sessions      # GET/POST: Multiple sessions management
│   │   ├── /progress      # PATCH: Update training progress
│   │   ├── /complete      # POST: Complete training session
│   │   ├── /state         # GET/PATCH: Save/restore training state
│   │   └── /export        # GET: Export training data for PDF
│   ├── /quiz
│   │   └── /response      # POST: Submit quiz answers
│   ├── /questions         # GET: Fetch question data
│   ├── /fittings          # GET/POST/PATCH/DELETE: Pipe fittings CRUD
│   ├── /stream
│   │   ├── /credentials   # GET: PureWeb stream credentials
│   │   ├── /agent-token   # POST: Create PureWeb agent token
│   │   └── /warm-claim    # POST: Claim pre-warmed environment
│   └── /admin
│       ├── /dashboard     # GET: Dashboard statistics
│       ├── /sessions      # GET: All training sessions
│       └── /results       # GET: Training results
│
├── /components             # Shared UI Components
│   ├── StreamingApp.tsx   # Main streaming application (orchestrates everything)
│   ├── /ControlPanel      # Tool selection UI
│   │   ├── ToolBar.tsx    # Bottom toolbar with tool buttons
│   │   ├── UnifiedSidebar # Left sidebar (materials, controls)
│   │   ├── TrainingTab    # Training progress display
│   │   └── TaskTools      # Task-specific tool options
│   ├── /shared            # Reusable UI components
│   │   ├── BaseModal      # Modal wrapper
│   │   ├── Button         # Styled button
│   │   └── ModalMessage   # Modal content
│   ├── MessageLog.tsx     # Debug message display
│   ├── ModalContainer.tsx # Centralized modal rendering
│   ├── ThemeToggle.tsx    # Dark/light theme switch
│   └── ResultExportPDF.tsx# PDF generation for results
│
├── /features              # Feature Modules (Domain-driven)
│   ├── /camera            # Camera control hooks
│   ├── /explosion         # Building explosion/assembly
│   ├── /feedback          # Training feedback modals
│   │   └── TrainingCompleteModal.tsx
│   ├── /idle              # Idle detection & warning
│   │   └── IdleWarningModal.tsx
│   ├── /layers            # Layer visibility control
│   ├── /messaging         # WebRTC message bus
│   │   └── useMessageBus.ts
│   ├── /questions         # Quiz question handling
│   │   ├── QuestionModal.tsx
│   │   └── useQuestionFlow.ts
│   ├── /training          # Core training logic
│   │   ├── useTrainingState.ts
│   │   └── useToolSelection.ts
│   └── index.ts           # Feature exports
│
├── /hooks                  # Application Hooks
│   ├── useStreamConnection.ts    # PureWeb SDK connection
│   ├── useModalManager.ts        # Centralized modal state
│   ├── useTrainingMessagesComposite.ts  # Combines all feature hooks
│   ├── useSessionInfo.ts         # Session/auth state
│   ├── useSessionSelection.ts    # Resume/new session flow
│   ├── useTrainingPersistence.ts # Auto-save progress
│   └── useScreenFlow.ts          # Screen state machine
│
├── /services              # API Service Layer
│   ├── training-session.service.ts  # Training session operations
│   ├── quiz.service.ts              # Quiz submission
│   ├── stream.service.ts            # Stream credentials
│   ├── session.service.ts           # Auth session
│   ├── training.service.ts          # Training logic
│   └── fitting.service.ts           # Pipe fittings data
│
├── /store                 # Redux Store
│   ├── index.ts           # Store configuration
│   ├── /slices
│   │   ├── trainingSlice.ts   # Training state
│   │   ├── uiSlice.ts         # UI state
│   │   └── connectionSlice.ts # Connection state
│   ├── hooks.ts           # Typed Redux hooks
│   └── useReduxSync.ts    # Sync hooks to Redux
│
├── /config                # Configuration
│   ├── app.config.ts      # App settings, retry config
│   ├── tasks.config.ts    # Training task definitions
│   ├── questions.config.ts# Question database (Q1-Q6)
│   └── camera.config.ts   # Camera perspectives
│
├── /types                 # TypeScript Types
│   ├── session.types.ts   # User/session types
│   ├── training.types.ts  # Training state types
│   ├── training-session.types.ts  # DB session types
│   ├── quiz.types.ts      # Quiz data types
│   ├── messages.types.ts  # WebRTC message types
│   ├── ui.types.ts        # UI component types
│   └── fitting.types.ts   # Pipe fitting types
│
├── /lib                   # Utilities
│   ├── supabase/          # Supabase client
│   ├── database.ts        # Database helpers
│   ├── messageTypes.ts    # Message constants
│   ├── logger.ts          # Pino logger
│   ├── errorUtils.ts      # Error handling
│   ├── clearSessionData.ts# Session cleanup
│   └── sessionCompleteRedirect.ts  # Redirect helpers
│
├── /context               # React Context
│   └── ThemeContext.tsx   # Dark/light theme
│
├── /providers             # Provider Components
│   └── QueryProvider.tsx  # TanStack Query
│
├── layout.tsx             # Root layout
├── page.tsx               # Home page (StreamingApp)
├── globals.css            # Global styles
│
├── /login                 # Login page
├── /register              # Registration page
├── /pending-approval      # Pending approval page
├── /session-complete      # Session end page
└── /training-results      # Results display page

/middleware.ts             # Route protection (RBAC)
/auth.ts                   # JWT signing/verification
```

---

## Core Features

### 1. Training Simulation
- **6-Phase Training**: XRay Scanning → Excavation → Measuring → Pipe Connection → Glue Application → Pressure Testing
- **Real-time 3D Streaming**: UE5 environment streamed via PureWeb WebRTC
- **Interactive Tools**: Tool selection, pipe selection, pressure testing
- **Progress Tracking**: Real-time progress saved to Supabase

### 2. Quiz System
- **6 Questions (Q1-Q6)**: Related to plumbing knowledge
- **Categories**: Scanning, excavation, measurement, connection, testing
- **Multiple Attempts**: Retry on wrong answers
- **Results Tracking**: Answers, time, attempts saved per question

### 3. Session Management
- **Resume/New Session**: Students can resume previous sessions or start fresh
- **State Persistence**: Full training state saved (tool, camera, explosion, progress)
- **Cinematic Mode**: Initial exploration mode with timer before training
- **Idle Detection**: Auto-logout after 5 minutes of inactivity

### 4. Authentication
- **LTI 1.3**: Integration with LMS (Canvas, Moodle, etc.)
- **Simple Login**: Email/password for non-LTI users
- **Outsider Registration**: Public registration with admin approval workflow
- **Role-Based Access**: Student, Teacher, Admin roles

### 5. Admin Dashboard
- **Overview Stats**: Total sessions, questions, results
- **Charts**: Session status, phase distribution, score distribution
- **Student Management**: View student progress, top performers
- **Content Management**: Questionnaires, fittings (pipe options)

---

## Data Flow

### Training Session Flow
```
1. User logs in (LTI or email/password)
2. Session created in Supabase (training_sessions table)
3. PureWeb stream connects to UE5 instance
4. User completes training phases with quiz questions
5. Progress auto-saved every 5 seconds or on phase change
6. On completion, quiz results submitted and session marked complete
7. Results page displays summary with PDF export option
```

### Message Flow (Web ↔ UE5)
```
Web → UE5:
- tool_change: Switch active tool
- pipe_selection: Select pipe type
- training_control: start/pause/resume/reset
- camera_control: Set perspective/orbit
- explosion_control: Explode/assemble building

UE5 → Web:
- training_progress: Progress updates
- task_completed: Phase completion
- question_request: Trigger quiz question
- tool_change_ack: Tool change confirmation
- waypoint_list: Available camera waypoints
```

---

## Database Schema (Supabase)

### Key Tables
- `user_profiles`: User registration data, approval status
- `sessions`: Login sessions (JWT tracking)
- `training_sessions`: Training progress, state, results
- `quiz_responses`: Individual quiz answers
- `fitting_options`: Pipe types and categories
- `questions`: Quiz question definitions

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# JWT
JWT_SECRET=
JWT_PRIVATE_KEY_PATH=
JWT_PUBLIC_KEY_PATH=

# PureWeb
NEXT_PUBLIC_PUREWEB_PROJECT_ID=
NEXT_PUBLIC_PUREWEB_MODEL_ID=
PUREWEB_PROJECT_CLIENT_ID=
PUREWEB_PROJECT_CLIENT_SECRET=

# LTI
LTI_CLIENT_ID=
LTI_PLATFORM_URL=
LTI_DEPLOYMENT_ID=
```

---

## Key Hooks & Their Responsibilities

| Hook | Purpose |
|------|---------|
| `useStreamConnection` | PureWeb SDK lifecycle, reconnection |
| `useTrainingMessagesComposite` | Combines all feature hooks for training |
| `useTrainingState` | Training progress, phase tracking |
| `useToolSelection` | Tool and pipe selection logic |
| `useQuestionFlow` | Quiz question handling |
| `useCameraControl` | Camera perspective and orbit |
| `useExplosionControl` | Building explosion animation |
| `useLayerControl` | Layer visibility, waypoints |
| `useModalManager` | Centralized modal state |
| `useSessionInfo` | Auth session, expiry tracking |
| `useSessionSelection` | Resume/new session flow |
| `useTrainingPersistence` | Auto-save, quiz submission |
| `useIdleDetection` | Inactivity timeout |

---

## Training Task Sequence

| # | Tool | Task Name | Description |
|---|------|-----------|-------------|
| 1 | XRay | Pipe Location Scanning | Use X-Ray scanner to locate pipes |
| 2 | Shovel | Excavation | Excavate trench for installation |
| 3 | Measuring | Pipe Measuring | Measure pipe dimensions |
| 4 | PipeConnection | Pipe Connection | Connect pipes correctly |
| 5 | Glue | Glue Application | Apply glue to secure connections |
| 6 | PressureTester | Pressure Testing | Test system for leaks |

---

## Quiz Questions

| ID | Category | Topic |
|----|----------|-------|
| Q1 | Scanning | Pre-excavation safety |
| Q2 | Excavation | Minimum excavation depth |
| Q3 | Excavation | Standard trench width |
| Q4 | Measurement | Correct drainage slope |
| Q5 | Testing | Maximum residential pressure |
| Q6 | Testing | PSI level for air pressure test |

---

## Admin Routes & Permissions

| Route | Required Role | Description |
|-------|---------------|-------------|
| `/admin` | teacher, admin | Dashboard overview |
| `/admin/sessions` | teacher, admin | Session management |
| `/admin/questionnaires` | teacher, admin | Quiz management |
| `/admin/results` | teacher, admin | Training results |
| `/admin/fittings` | teacher, admin | Pipe fittings |
| `/api/admin/*` | teacher, admin | Admin API endpoints |

---

## Session Lifecycle

```
1. CREATED → Session started
2. ACTIVE → Training in progress
3. PAUSED → User paused training
4. COMPLETED → All phases finished
5. ABANDONED → Session expired/quit
```

---

## Error Handling

- **Stream Errors**: Auto-retry with exponential backoff (max 3 retries)
- **Session Expiry**: Warning modal before timeout, redirect to login
- **Idle Timeout**: 5-minute warning, then auto-logout
- **API Errors**: Graceful degradation with error messages

---

## PDF Export

Training results can be exported as PDF including:
- Student information
- Session details (phases, time spent)
- Quiz results (answers, correctness, time, attempts)
- Overall grade and score

---

## Theme Support

- **Dark Mode**: Default, optimized for streaming
- **Light Mode**: Alternative theme
- Persisted via ThemeContext and localStorage

---

## Performance Optimizations

- **Dynamic Imports**: Heavy components loaded on demand
- **Pre-warming**: PureWeb connection pre-authenticated on mount
- **Memoization**: `useMemo` and `useCallback` throughout
- **Redux Toolkit**: Efficient state updates
- **React Query**: Caching and background refetching

---

## Security Measures

- **JWT RS256**: Asymmetric key signing
- **RBAC Middleware**: Route-level access control
- **Outsider Approval**: Manual admin approval for public registrations
- **Session Tokens**: HTTP-only cookies
- **Origin Validation**: API requests verified

---

*Last Updated: 2026-02-01*

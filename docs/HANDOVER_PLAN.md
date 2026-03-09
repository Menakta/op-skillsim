# OP-Skillsim Service Handover Plan

## Overview

This document outlines the complete transfer of the OP-Skillsim plumbing training simulator from Prographers to Open Polytechnic. The handover includes all cloud services, credentials, and deployment configurations.

---

## 1. Services Inventory

| Service | Purpose | Current Owner | Transfer Required |
|---------|---------|---------------|-------------------|
| **Vercel** | Web app hosting & deployment | Prographers | Yes |
| **Supabase** | PostgreSQL database & auth | Prographers | Yes |
| **Interlucent** | UE5 pixel streaming | Prographers | Yes |
| **PureWeb** | Legacy pixel streaming (backup) | Prographers | Yes |
| **Resend** | Transactional emails | Prographers | Yes |
| **GitHub** | Source code repository | Prographers | Yes |
| **Domain/DNS** | op-skillsim.vercel.app | Vercel (auto) | Included with Vercel |

---

## 2. Vercel Deployment

### Current Setup
- **Project URL**: https://op-skillsim.vercel.app
- **Framework**: Next.js 16.0.7
- **Build Command**: `next build --webpack`
- **Node Version**: 20.x

### Transfer Options

#### Option A: Transfer Project Ownership (Recommended)
1. Open Polytechnic creates a Vercel account (if not existing)
2. Prographers invites OP admin to the Vercel team
3. Transfer project ownership via Vercel dashboard
4. Update billing to OP's payment method

#### Option B: Fresh Deployment
1. Open Polytechnic creates new Vercel project
2. Connect to transferred GitHub repository
3. Configure all environment variables (see Section 7)
4. Deploy and verify functionality

### Post-Transfer Tasks
- [ ] Update production domain (if using custom domain)
- [ ] Configure team access permissions
- [ ] Set up deployment notifications

---

## 3. Supabase Database

### Current Setup
- **Project URL**: https://efyvpbxrbtchwzczswtb.supabase.co
- **Region**: (Check Supabase dashboard)
- **Plan**: Free/Pro tier

### Database Tables
| Table | Purpose | Records |
|-------|---------|---------|
| `user_profiles` | User registration (LTI/outsider) | - |
| `sessions` | Login sessions (JWT tracking) | - |
| `training_sessions` | Training progress & state | - |
| `quiz_responses` | Quiz answers (JSONB) | - |
| `fitting_options` | Pipe/fitting types | - |
| `questions` | Quiz question definitions | - |
| `teacher_profiles` | Teacher/admin users | - |

### Transfer Steps

#### Step 1: Export Data
```bash
# Export schema and data from current Supabase project
supabase db dump --data-only > data_backup.sql
supabase db dump --schema-only > schema_backup.sql
```

#### Step 2: Create New Supabase Project
1. Open Polytechnic creates account at https://supabase.com
2. Create new project in preferred region (recommend: Sydney for NZ)
3. Note new credentials:
   - Project URL
   - Anon Key (public)
   - Service Role Key (secret)

#### Step 3: Import Data
```bash
# Apply migrations
supabase db push

# Import data
psql -h <new-host> -U postgres -d postgres < data_backup.sql
```

#### Step 4: Apply Migrations
The following migrations must be applied:
- `20260109_outsider_registration.sql`
- `20260119_user_deletion_cleanup.sql`
- `20260203_add_phone_to_profiles.sql`

### Credentials to Transfer
| Variable | Location | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel env | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Vercel env | Public (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env | **SECRET** - server only |

---

## 4. Interlucent Pixel Streaming

### Current Setup
- **Provider**: Interlucent (primary streaming provider)
- **App ID**: Kxn50A
- **App Version**: OqU
- **API Endpoint**: api.interlucent.ai

### Transfer Steps
1. Contact Interlucent support to transfer account ownership
2. Or: Create new Interlucent account under OP's name
3. Upload UE5 application to new account
4. Generate new API credentials

### Credentials to Transfer
| Variable | Location | Notes |
|----------|----------|-------|
| `INTERLUCENT_SECRET_KEY` | Vercel env | **SECRET** |
| `NEXT_PUBLIC_INTERLUCENT_APP_ID` | Vercel env | Public |
| `NEXT_PUBLIC_INTERLUCENT_APP_VERSION` | Vercel env | Public |
| `NEXT_PUBLIC_INTERLUCENT_API_ENDPOINT` | Vercel env | Public |
| `NEXT_PUBLIC_STREAMING_PROVIDER` | Vercel env | Set to `interlucent` |

---

## 5. PureWeb (Legacy/Backup)

### Current Setup
- **Project ID**: 94adc3ba-7020-49f0-9a7c-bb8f1531536a
- **Model ID**: 26c1dfea-9845-46bb-861d-fb90a22b28df
- **Status**: Available as fallback (set `NEXT_PUBLIC_STREAMING_PROVIDER=pureweb`)

### Transfer Steps
1. Contact PureWeb support to transfer project ownership
2. Or: Create new PureWeb account under OP's name
3. Migrate UE5 model to new account
4. Generate new API credentials

### Credentials to Transfer
| Variable | Location | Notes |
|----------|----------|-------|
| `PUREWEB_PROJECT_CLIENT_ID` | Vercel env | **SECRET** |
| `PUREWEB_PROJECT_CLIENT_SECRET` | Vercel env | **SECRET** |
| `NEXT_PUBLIC_PUREWEB_PROJECT_ID` | Vercel env | Public |
| `NEXT_PUBLIC_PUREWEB_MODEL_ID` | Vercel env | Public |

---

## 6. Resend Email Service

### Current Setup
- **From Address**: OP Skillsim <noreply@menakta.com>
- **Admin Email**: Sebastian.Ryan@openpolytechnic.ac.nz
- **Purpose**: Registration emails, approval notifications

### Transfer Steps
1. Open Polytechnic creates Resend account at https://resend.com
2. Verify OP's domain for sending emails (e.g., `noreply@openpolytechnic.ac.nz`)
3. Generate new API key
4. Update environment variables

### Credentials to Transfer
| Variable | Location | Notes |
|----------|----------|-------|
| `RESEND_API_KEY` | Vercel env | **SECRET** |
| `EMAIL_FROM` | Vercel env | Update to OP domain |
| `ADMIN_EMAIL` | Vercel env | OP admin email |
| `NEXT_PUBLIC_APP_URL` | Vercel env | Production URL |

---

## 7. Complete Environment Variables

### Production Environment (.env.production)

```bash
# =============================================================================
# Supabase (Database & Auth)
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=<new-supabase-url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<new-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<new-service-role-key>

# =============================================================================
# Streaming Provider (choose one)
# =============================================================================
NEXT_PUBLIC_STREAMING_PROVIDER=interlucent

# Interlucent Configuration
INTERLUCENT_SECRET_KEY=<new-interlucent-secret>
NEXT_PUBLIC_INTERLUCENT_APP_ID=<new-app-id>
NEXT_PUBLIC_INTERLUCENT_APP_VERSION=<new-app-version>
NEXT_PUBLIC_INTERLUCENT_API_ENDPOINT=api.interlucent.ai
INTERLUCENT_USE_MOCK=false

# PureWeb Configuration (if using PureWeb instead)
# NEXT_PUBLIC_STREAMING_PROVIDER=pureweb
# PUREWEB_PROJECT_CLIENT_ID=<new-client-id>
# PUREWEB_PROJECT_CLIENT_SECRET=<new-client-secret>
# NEXT_PUBLIC_PUREWEB_PROJECT_ID=<new-project-id>
# NEXT_PUBLIC_PUREWEB_MODEL_ID=<new-model-id>

# =============================================================================
# JWT Authentication
# =============================================================================
JWT_PRIVATE_KEY_PATH=keys/jwt_private.pem
JWT_PUBLIC_KEY_PATH=keys/jwt_public.pub
JWT_SECRET=<generate-new-256-bit-secret>

# =============================================================================
# LTI Integration (iQualify, Canvas, Moodle)
# =============================================================================
LTI_CONSUMER_KEY=op-skillsim-polytechnic-nz
LTI_SHARED_SECRET=<generate-new-secret>
NEXT_PUBLIC_LTI_CONSUMER_KEY=op-skillsim-polytechnic-nz
NEXT_PUBLIC_LTI_SHARED_SECRET=<same-as-above>

# =============================================================================
# Email Service (Resend)
# =============================================================================
RESEND_API_KEY=<new-resend-api-key>
EMAIL_FROM=OP Skillsim <noreply@openpolytechnic.ac.nz>
ADMIN_EMAIL=<op-admin-email>
NEXT_PUBLIC_APP_URL=https://<production-domain>

# =============================================================================
# Security
# =============================================================================
ORIGIN_WHITELIST=https://<production-domain>,https://prographers.iqualify.com/,https://<lms-domains>
```

---

## 8. GitHub Repository

### Transfer Steps
1. Transfer repository ownership to OP's GitHub organization
2. Or: Fork repository to OP's organization
3. Update Vercel to connect to new repository
4. Configure branch protection rules

### Repository Contents
```
op-skillsim/
├── app/                    # Next.js application code
├── keys/                   # JWT key files (regenerate for production)
├── supabase/migrations/    # Database migrations
├── docs/                   # Documentation
├── public/                 # Static assets
└── package.json            # Dependencies
```

---

## 9. JWT Keys

### Security Recommendation
Generate **new** JWT keys for production. Do not reuse development keys.

### Generate New Keys
```bash
# Generate RSA key pair
openssl genrsa -out keys/jwt_private.pem 2048
openssl rsa -in keys/jwt_private.pem -pubout -out keys/jwt_public.pub
```

### Key Storage
- Store private key securely (Vercel environment variables or secrets manager)
- Never commit private keys to Git

---

## 10. LTI Integration (iQualify)

### Current Setup
- **Consumer Key**: op-skillsim-polytechnic-nz
- **Launch URL**: https://op-skillsim.vercel.app/api/lti/launch

### Transfer Steps
1. Generate new LTI shared secret
2. Update Vercel environment variables
3. Update iQualify LTI configuration with:
   - New launch URL (if domain changes)
   - New consumer key/secret pair

### iQualify Configuration
```
Tool Name: OP Skillsim Plumbing Simulator
Launch URL: https://<production-domain>/api/lti/launch
Consumer Key: op-skillsim-polytechnic-nz
Shared Secret: <new-secret>
```

---

## 11. Transfer Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Day 1** | Create OP accounts (Vercel, Supabase, Resend), export database, transfer GitHub repo | 1 day |
| **Day 2** | Deploy to Vercel, configure environment variables, import database, set up streaming | 1 day |
| **Day 3** | Testing, LTI integration with iQualify, verification, go-live | 1 day |

**Estimated Total: 2-3 business days**

### Day 1 Checklist
- [ ] OP creates Vercel account
- [ ] OP creates Supabase project
- [ ] OP creates Resend account
- [ ] Export current Supabase data
- [ ] Transfer/fork GitHub repository
- [ ] Generate new JWT keys
- [ ] Generate new LTI shared secret

### Day 2 Checklist
- [ ] Connect Vercel to GitHub repo
- [ ] Configure all environment variables in Vercel
- [ ] Import database schema and data to new Supabase
- [ ] Transfer/configure Interlucent streaming credentials
- [ ] Initial deployment and smoke test

### Day 3 Checklist
- [ ] Full end-to-end testing (all 6 training phases)
- [ ] Test quiz submission and PDF export
- [ ] Configure LTI in iQualify
- [ ] Test LTI launch flow
- [ ] Final verification and go-live

---

## 12. Post-Transfer Checklist

### Immediate
- [ ] All environment variables configured in Vercel
- [ ] Database connection verified
- [ ] Pixel streaming working (Interlucent)
- [ ] Email sending verified (Resend)
- [ ] LTI launch from iQualify working

### First Week
- [ ] Create admin accounts for OP staff
- [ ] Test full training workflow (all 6 phases)
- [ ] Verify quiz submission and results
- [ ] Test PDF export functionality
- [ ] Monitor error logs in Vercel

### Ongoing
- [ ] Set up monitoring/alerting
- [ ] Document internal support procedures
- [ ] Train OP staff on admin dashboard

---

## 13. Support Contacts

### Prographers (Handover Support)
- **Contact**: [Your contact information]
- **Support Period**: 30 days post-transfer

### Vendor Support
- **Interlucent**: support@interlucent.ai
- **PureWeb**: support@pureweb.io
- **Supabase**: https://supabase.com/support
- **Vercel**: https://vercel.com/support
- **Resend**: https://resend.com/support

---

## 14. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Full backup before migration, test restore |
| Streaming service downtime | High | Maintain PureWeb as fallback |
| LTI integration failure | Medium | Test in staging before production |
| Email delivery issues | Low | Verify domain, test with multiple providers |

---

## Appendix A: Current Credentials Summary

> **Note**: Replace all credentials with new ones generated under OP's accounts.

| Service | Credential Type | Current Value (redacted) | Action |
|---------|----------------|--------------------------|--------|
| Supabase | URL | efyvpbxrbtchwzczswtb.supabase.co | Replace |
| Supabase | Anon Key | sb_publishable_*** | Replace |
| Supabase | Service Key | sb_secret_*** | Replace |
| Interlucent | Secret Key | sk-il-proj-*** | Replace |
| Interlucent | App ID | Kxn50A | May change |
| PureWeb | Client ID | 06d0e8a1*** | Replace |
| PureWeb | Client Secret | 2a79ac94*** | Replace |
| Resend | API Key | re_UBEdknFC_*** | Replace |
| JWT | Secret | 7f8c2e9a*** | Regenerate |
| LTI | Shared Secret | 7f82b3c4*** | Regenerate |

---

## Appendix B: Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL (Next.js App)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Pages     │  │  API Routes │  │  Server Components      │  │
│  │  (React)    │  │  /api/*     │  │  (Auth, DB queries)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└──────────┬──────────────┬──────────────────┬────────────────────┘
           │              │                  │
           ▼              ▼                  ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────────────┐
│   INTERLUCENT    │ │   SUPABASE   │ │        RESEND            │
│  (UE5 Streaming) │ │  (Database)  │ │    (Email Service)       │
│                  │ │              │ │                          │
│  WebRTC ◄────────┤ │  PostgreSQL  │ │  Transactional emails    │
│  Pixel Stream    │ │  Auth        │ │  Registration notices    │
└──────────────────┘ └──────────────┘ └──────────────────────────┘
           │
           ▼
┌──────────────────┐
│   UNREAL ENGINE  │
│   (3D Training)  │
│                  │
│  Hosted by       │
│  Interlucent     │
└──────────────────┘
```

---

*Document Version: 1.0*
*Last Updated: 2026-03-09*
*Prepared by: Prographers Development Team*

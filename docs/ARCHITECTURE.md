# MailForge AI - Architecture Documentation 🏗️

This document describes the technical architecture and design decisions of MailForge AI.

---

## System Overview

MailForge AI follows a classic client-server architecture with a React frontend and Node.js backend.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client Layer                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    React Frontend (Vite)                                ││
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐               ││
│  │  │   Login   │ │ Dashboard │ │  Campaign │ │ Settings  │               ││
│  │  │   Page    │ │   Page    │ │  Wizard   │ │   Page    │               ││
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘               ││
│  │                         │                                               ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                    Shared Components                             │   ││
│  │  │  FileUpload │ RecipientTable │ EmailEditor │ CertificateEditor  │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────│────────────────────────────────────┘
                                         │ HTTP/REST
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Server Layer                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    Node.js + Express Backend                            ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                         API Routes                               │   ││
│  │  │  /auth  │  /upload  │  /campaign  │  /email  │  /certificate    │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  │                                │                                        ││
│  │  ┌─────────────────────────────────────────────────────────────────┐   ││
│  │  │                         Services                                 │   ││
│  │  │  AuthService │ FileParser │ EmailSender │ PDFGenerator          │   ││
│  │  └─────────────────────────────────────────────────────────────────┘   ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────│
                          │                    │                               │
              ┌───────────┴───────────┐       ▼                               │
              ▼                       ▼   ┌────────────┐                       │
         ┌─────────┐           ┌──────────┐│  Gmail     │                       │
         │  JSON   │           │ Google   ││  SMTP      │                       │
         │  Files  │           │ AI API   │└────────────┘                       │
         └─────────┘           └──────────┘                                    │
```

---

## Frontend Architecture

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Library |
| Vite | 5.x | Build Tool & Dev Server |
| TailwindCSS | 3.x | Utility-first CSS |
| Framer Motion | 10.x | Animations |
| React Router | 6.x | Client-side Routing |
| React Quill | 2.x | Rich Text Editor |
| Konva/React-Konva | 18.x | Canvas-based Certificate Editor |
| Axios | 1.x | HTTP Client |

### Directory Structure

```
frontend/
├── src/
│   ├── App.jsx                 # Root component with routing
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles & Tailwind
│   │
│   ├── context/
│   │   └── AuthContext.jsx    # Global auth state
│   │
│   ├── pages/
│   │   ├── Login.jsx          # Authentication page
│   │   ├── Dashboard.jsx      # Campaign list & overview
│   │   ├── NewCampaign.jsx    # Campaign creation wizard
│   │   ├── CampaignDetails.jsx # Individual campaign view
│   │   └── Settings.jsx       # SMTP configuration
│   │
│   ├── components/
│   │   ├── Navbar.jsx         # Navigation header
│   │   └── campaign/
│   │       ├── FileUpload.jsx       # Drag-drop file upload
│   │       ├── RecipientTable.jsx   # Editable recipient list
│   │       ├── EmailEditor.jsx      # Rich text + HTML editor
│   │       ├── CertificateEditor.jsx     # Certificate config
│   │       ├── CertificateEditorCanva.jsx # Konva-based editor
│   │       └── ReviewSend.jsx       # Final review & send
│   │
│   └── utils/
│       └── api.js             # Axios instance & interceptors
│
├── public/                    # Static assets
├── index.html                 # HTML template
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind configuration
└── package.json              # Dependencies
```

### State Management

The application uses React Context for global state:

```javascript
// AuthContext provides:
{
  user: { id, email },
  token: "jwt_token",
  isAuthenticated: boolean,
  login: (email, password) => Promise,
  logout: () => void,
  smtpConfigured: boolean
}
```

Local component state handles:
- Form inputs
- UI state (loading, errors)
- Campaign wizard step data

### Routing Structure

```javascript
/                  → Redirect to /dashboard or /login
/login             → Login page
/dashboard         → Campaign list
/campaign/new      → New campaign wizard
/campaign/:id      → Campaign details
/settings          → SMTP settings
```

### Component Hierarchy

```
App
├── AuthProvider (Context)
│   ├── Login
│   └── ProtectedRoutes
│       ├── Navbar
│       ├── Dashboard
│       │   └── CampaignCard[]
│       ├── NewCampaign
│       │   ├── FileUpload
│       │   ├── RecipientTable
│       │   ├── EmailEditor
│       │   ├── CertificateEditor
│       │   └── ReviewSend
│       ├── CampaignDetails
│       │   ├── StatsCards
│       │   └── RecipientStatusTable
│       └── Settings
│           └── SMTPForm
```

---

## Backend Architecture

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime |
| Express | 4.x | Web Framework |
| Nodemailer | 7.x | Email Sending |
| PDFKit | 0.13.x | PDF Generation |
| PapaParse | 5.x | CSV Parsing |
| read-excel-file | 5.x | Excel Parsing |
| jsonwebtoken | 9.x | JWT Authentication |
| bcryptjs | 2.x | Password Hashing |
| crypto-js | 4.x | AES Encryption |

### Directory Structure

```
backend/
├── server.js                  # Application entry point
│
├── routes/
│   ├── auth.js               # Authentication & SMTP config
│   ├── upload.js             # File upload & parsing
│   ├── campaign.js           # Campaign CRUD
│   ├── email.js              # Bulk email sending
│   └── certificate.js        # PDF certificate generation
│
├── middleware/
│   └── auth.js               # JWT verification middleware
│
├── utils/
│   ├── database.js           # JSON file operations
│   └── helpers.js            # Encryption, validation
│
├── data/                     # JSON database files
│   ├── users.json
│   ├── campaigns.json
│   └── smtp.json
│
├── uploads/                  # Temporary file uploads
├── certificates/             # Generated PDF files
│
├── .env                      # Environment variables
└── package.json
```

### Request Flow

```
1. Client Request
       │
       ▼
2. Express Middleware
   ├── CORS
   ├── JSON Body Parser
   └── JWT Auth (if protected route)
       │
       ▼
3. Route Handler
   ├── Validate input
   ├── Process business logic
   └── Return response
       │
       ▼
4. Response to Client
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Login Flow                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client                        Server                           │
│    │                              │                             │
│    │  POST /auth/login            │                             │
│    │  {email, password}           │                             │
│    │─────────────────────────────>│                             │
│    │                              │                             │
│    │                     ┌────────┴────────┐                    │
│    │                     │ Find/Create User│                    │
│    │                     │ Hash Password   │                    │
│    │                     │ Generate JWT    │                    │
│    │                     └────────┬────────┘                    │
│    │                              │                             │
│    │  {token, user}               │                             │
│    │<─────────────────────────────│                             │
│    │                              │                             │
│    │                              │                             │
│    ├──────────────────────────────┼──────────────────────────── │
│    │  Subsequent Requests         │                             │
│    │  Authorization: Bearer <jwt> │                             │
│    │─────────────────────────────>│                             │
│    │                              │                             │
│    │                     ┌────────┴────────┐                    │
│    │                     │ Verify JWT      │                    │
│    │                     │ Attach user     │                    │
│    │                     └────────┬────────┘                    │
│    │                              │                             │
└────┴──────────────────────────────┴─────────────────────────────┘
```

### Email Sending Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Bulk Email Sending                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  POST /email/send                                                    │
│         │                                                            │
│         ▼                                                            │
│  ┌──────────────────┐                                                │
│  │ Load Campaign    │                                                │
│  │ Get SMTP Config  │                                                │
│  │ Decrypt Password │                                                │
│  └────────┬─────────┘                                                │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              For Each Recipient                               │   │
│  │  ┌─────────────────────────────────────────────────────────┐ │   │
│  │  │ 1. Replace variables ({{name}}, {{email}})              │ │   │
│  │  │ 2. Generate certificate PDF (if enabled)                │ │   │
│  │  │ 3. Send via Nodemailer (Gmail SMTP)                     │ │   │
│  │  │ 4. Update recipient status                               │ │   │
│  │  │ 5. Wait 1 second (rate limiting)                        │ │   │
│  │  └─────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────┘   │
│           │                                                          │
│           ▼                                                          │
│  ┌──────────────────┐                                                │
│  │ Update Campaign  │                                                │
│  │ Status: Complete │                                                │
│  └──────────────────┘                                                │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### User

```json
{
  "id": "user_1705123456789",
  "email": "admin@example.com",
  "password": "$2a$10$...",  // bcrypt hashed
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

### SMTP Configuration

```json
{
  "userId": "user_1705123456789",
  "email": "sender@gmail.com",
  "password": "U2FsdGVkX1...",  // AES-256 encrypted
  "updatedAt": "2026-01-15T10:00:00.000Z"
}
```

### Campaign

```json
{
  "id": "campaign_1705123456789",
  "userId": "user_1705123456789",
  "name": "January Newsletter",
  "subject": "Hello {{name}}!",
  "body": "<p>Dear {{name}},</p>...",
  "recipients": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "status": "sent",
      "sentAt": "2026-01-15T10:30:00.000Z",
      "error": null
    }
  ],
  "attachCertificate": true,
  "certificateConfig": {
    "eventName": "Annual Summit",
    "achievementText": "Participation",
    "fontSize": 48,
    "fontColor": "#000000",
    "templateImage": "base64..."
  },
  "status": "completed",
  "stats": {
    "total": 150,
    "sent": 148,
    "failed": 2
  },
  "createdAt": "2026-01-15T10:00:00.000Z",
  "startedAt": "2026-01-15T10:15:00.000Z",
  "completedAt": "2026-01-15T10:45:00.000Z"
}
```

---

## Security Architecture

### Encryption Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    Security Measures                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Transport Security                                           │
│     └── HTTPS (production)                                       │
│                                                                  │
│  2. Authentication                                               │
│     ├── JWT tokens (7-day expiry)                                │
│     └── Password hashing (bcrypt, 10 rounds)                     │
│                                                                  │
│  3. Data Encryption                                              │
│     └── SMTP passwords: AES-256 encryption                       │
│                                                                  │
│  4. Input Validation                                             │
│     ├── Email format validation                                  │
│     ├── File type verification                                   │
│     └── Size limits                                              │
│                                                                  │
│  5. Rate Limiting                                                │
│     └── Email sending: 1 per second                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Encryption Implementation

```javascript
// Password hashing (bcrypt)
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);

// SMTP password encryption (AES-256)
const encrypted = CryptoJS.AES.encrypt(
  password, 
  process.env.ENCRYPTION_KEY
).toString();

const decrypted = CryptoJS.AES.decrypt(
  encrypted, 
  process.env.ENCRYPTION_KEY
).toString(CryptoJS.enc.Utf8);
```

---

## External Integrations

### Gmail SMTP

```javascript
// Nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpEmail,
    pass: decryptedAppPassword
  }
});
```

**Requirements:**
- Gmail account with 2FA enabled
- App Password (16 characters)

**Limits:**
- Free Gmail: 500 emails/day
- Google Workspace: 2,000 emails/day

### Google AI (Gemini)

Used for intelligent column detection:

```javascript
// AI Detection request
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent`,
  {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Analyze these headers and identify Name/Email columns: ${headers}`
        }]
      }]
    })
  }
);
```

**Fallback:** Rule-based detection using header name matching.

---

## Performance Considerations

### Rate Limiting

Email sending is rate-limited to prevent Gmail blocking:

```javascript
for (const recipient of recipients) {
  await sendEmail(recipient);
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
}
```

### File Size Limits

| File Type | Limit |
|-----------|-------|
| Uploaded Excel/CSV | 10 MB |
| Certificate PDF | ~50 KB each |
| Request body | 50 MB |

### Memory Management

- Uploaded files are processed and deleted
- Certificates are stored temporarily (can be cleaned up)
- JSON database is loaded on-demand

---

## Future Architecture (v2.0)

### Planned Improvements

1. **Database Migration**
   - PostgreSQL or MongoDB
   - Better scalability and querying

2. **Background Jobs**
   - Bull/Redis for email queue
   - Retry failed emails automatically

3. **Caching**
   - Redis for session caching
   - Template caching

4. **Horizontal Scaling**
   - Multiple backend instances
   - Load balancer support

5. **Microservices (v3.0)**
   - Separate email service
   - Certificate service
   - Auth service

---

## Development Guidelines

### Adding a New Route

1. Create route file in `backend/routes/`
2. Import and register in `server.js`
3. Add authentication middleware if needed
4. Document in API.md

### Adding a New Component

1. Create in `frontend/src/components/`
2. Use Tailwind for styling
3. Add Framer Motion for animations
4. Export from component directory

### Testing Checklist

- [ ] API endpoints respond correctly
- [ ] Authentication works
- [ ] File upload handles edge cases
- [ ] Email sending succeeds
- [ ] Certificate generation is accurate
- [ ] UI is responsive
- [ ] Error states are handled

---

**Last Updated:** January 2026

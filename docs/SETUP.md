# MailForge AI - Complete Setup & Documentation Guide 📚

Welcome to the comprehensive documentation for **MailForge AI** - a smart bulk email and certificate generation system with AI-powered column detection.

---

## 📖 Table of Contents

1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Installation Guide](#installation-guide)
4. [Configuration](#configuration)
5. [Running the Application](#running-the-application)
6. [API Documentation](#api-documentation)
7. [User Guide](#user-guide)
8. [Troubleshooting](#troubleshooting)
9. [Deployment](#deployment)
10. [FAQ](#faq)

---

## 🎯 Overview

MailForge AI is a full-stack application designed to simplify bulk email campaigns with personalized certificate generation. It features:

- **AI-Powered Detection**: Automatically detects Name & Email columns from Excel/CSV files
- **Rich Email Editor**: WYSIWYG editor with dynamic variable support
- **Certificate Generator**: Create and attach PDF certificates automatically
- **Campaign Management**: Track, monitor, and export campaign results
- **Secure Architecture**: AES-256 encryption for credentials, JWT authentication

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MailForge AI                              │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)          │  Backend (Node.js)      │
│  ├── React 18                     │  ├── Express.js         │
│  ├── TailwindCSS                  │  ├── Nodemailer         │
│  ├── Framer Motion                │  ├── PDFKit             │
│  ├── React Quill                  │  ├── JSON Database      │
│  └── React Router                 │  └── JWT Auth           │
├─────────────────────────────────────────────────────────────┤
│                    External Services                         │
│  ├── Gmail SMTP (Email sending)                             │
│  └── Google AI Studio (Column detection)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10+, macOS 10.15+, Linux (Ubuntu 18.04+) |
| **Node.js** | v18.0.0 or higher |
| **npm** | v8.0.0 or higher |
| **RAM** | 4 GB minimum |
| **Disk Space** | 500 MB for application |
| **Browser** | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ |

### Required Accounts

| Service | Purpose | Required |
|---------|---------|----------|
| **Gmail Account** | Sending emails via SMTP | ✅ Yes |

---

## 📥 Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bulk-email.git
cd bulk-email
```

### Step 2: Install Backend Dependencies

Open first terminal:
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

Open second terminal:
```bash
cd frontend
npm install
```

---

## ⚙️ Configuration

### Backend Configuration

Create the environment file:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Security Keys (REQUIRED - Change these!)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

#### Environment Variables Explained

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PORT` | Backend server port | No (default: 5000) | `5000` |
| `NODE_ENV` | Environment mode | No | `development` or `production` |
| `JWT_SECRET` | Secret for JWT tokens | ✅ Yes | Random 32+ character string |
| `ENCRYPTION_KEY` | Key for AES encryption | ✅ Yes | Exactly 32 characters |

#### Generating Secure Keys

**PowerShell (Windows):**
```powershell
# Generate JWT Secret
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# Generate Encryption Key (exactly 32 chars)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**Bash (macOS/Linux):**
```bash
# Generate JWT Secret
openssl rand -base64 32

# Generate Encryption Key
openssl rand -hex 16
```

### Frontend Configuration

Create the environment file:

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` |

---

## 🚀 Running the Application

### Development Mode

**Option 1: Run Both Servers (Recommended)**

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```
Output: `🚀 MailForge AI Backend running on port 5000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```
Output shows Vite dev server URL (usually http://localhost:5173 or http://localhost:3000)

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build
```

**Start Production Backend:**
```bash
cd backend
npm start
```

### Verify Installation

1. **Backend Health Check:**
   ```
   GET http://localhost:5000/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "message": "MailForge AI Backend is running"
   }
   ```

2. **Frontend:** Open browser to http://localhost:3000 or http://localhost:5173

---

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Login or create a new user (first login auto-creates admin).

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "admin@example.com"
  }
}
```

#### POST `/api/auth/smtp`
Configure SMTP settings.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "smtpEmail": "your.email@gmail.com",
  "smtpPassword": "your_app_password"
}
```

#### GET `/api/auth/smtp`
Get current SMTP configuration.

---

### Upload Endpoints

#### POST `/api/upload/file`
Upload Excel or CSV file for parsing.

**Headers:** `Authorization: Bearer <token>`
**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Excel (.xlsx, .xls) or CSV (.csv) file

**Response:**
```json
{
  "success": true,
  "data": {
    "rows": [...],
    "headers": ["Name", "Email", "Department"],
    "detection": {
      "nameColumn": "Name",
      "emailColumn": "Email",
      "confidence": 0.95
    }
  }
}
```

---

### Campaign Endpoints

#### POST `/api/campaign`
Create a new campaign.

#### GET `/api/campaign`
List all campaigns.

#### GET `/api/campaign/:id`
Get campaign details.

#### PUT `/api/campaign/:id`
Update campaign.

#### DELETE `/api/campaign/:id`
Delete campaign.

---

### Email Endpoints

#### POST `/api/email/send`
Send bulk emails for a campaign.

**Request:**
```json
{
  "campaignId": "campaign_123",
  "subject": "Your Certificate for {{name}}",
  "body": "<p>Dear {{name}},</p><p>Find attached your certificate.</p>",
  "recipients": [
    {"name": "John Doe", "email": "john@example.com"},
    {"name": "Jane Smith", "email": "jane@example.com"}
  ],
  "attachCertificate": true,
  "certificateConfig": {
    "eventName": "Annual Summit 2026",
    "fontSize": 48,
    "fontColor": "#000000"
  }
}
```

---

### Certificate Endpoints

#### POST `/api/certificate/preview`
Generate certificate preview.

#### POST `/api/certificate/generate`
Generate PDF certificate.

---

## 👤 User Guide

### First-Time Setup

1. **Access the Application**
   - Open http://localhost:3000 in your browser

2. **Create Admin Account**
   - Enter any email and password
   - First login automatically creates the admin user

3. **Configure Gmail SMTP**
   - Navigate to **Settings**
   - Enter your Gmail email address
   - Create a Gmail App Password:
     1. Go to [Google Account Security](https://myaccount.google.com/security)
     2. Enable 2-Step Verification
     3. Go to App Passwords
     4. Select "Mail" and "Other (Custom name)"
     5. Copy the 16-character password
   - Enter the App Password (not your Gmail password!)
   - Click Save

### Creating a Campaign

#### Step 1: Upload Recipients

1. Go to **Dashboard** → **New Campaign**
2. Drag and drop or click to upload your Excel/CSV file
3. The AI will automatically detect Name and Email columns
4. Review the detection results and confidence scores

#### Step 2: Review Recipients

1. View the parsed recipient list
2. Edit individual entries if needed
3. Add new recipients manually
4. Remove duplicates or invalid emails
5. Validate all email addresses

#### Step 3: Compose Email

1. Enter the email subject (supports variables)
2. Use the rich text editor or switch to HTML mode
3. Insert dynamic variables:
   - `{{name}}` - Recipient's name
   - `{{email}}` - Recipient's email
   - `{{event}}` - Event name (if configured)
   - `{{date}}` - Current date
4. Preview with actual recipient data

#### Step 4: Configure Certificate (Optional)

1. Toggle certificate generation ON
2. Choose or upload a certificate template
3. Customize:
   - Achievement text
   - Name font size and color
   - Name position on certificate
   - Event name
4. Preview certificate with sample data

#### Step 5: Review and Send

1. Name your campaign
2. Review all settings
3. Click **Send Campaign**
4. Monitor real-time progress
5. View success/failure statistics
6. Export results as CSV

---

## 🔧 Troubleshooting

### Common Issues

#### Gmail Authentication Fails

**Error:** "Invalid login" or "Authentication failed"

**Solutions:**
1. ✅ Ensure you're using an **App Password**, not your Gmail password
2. ✅ Verify 2-Step Verification is enabled
3. ✅ Try regenerating the App Password
4. ✅ Check if "Less secure app access" needs to be enabled

#### Email Sending Rate Limited

**Error:** "Too many requests" or emails stop sending

**Solutions:**
1. ✅ Gmail limit: ~500 emails/day for regular accounts
2. ✅ The app automatically rate-limits to 1 email/second
3. ✅ Wait 24 hours if you hit the daily limit
4. ✅ Consider Google Workspace for higher limits

#### File Upload Fails

**Error:** "Invalid file" or "Parsing failed"

**Solutions:**
1. ✅ Maximum file size: 10MB
2. ✅ Supported formats: .xlsx, .xls, .csv
3. ✅ Ensure first row contains column headers
4. ✅ Check for corrupted file data

#### AI Column Detection Low Confidence

**Issue:** Columns not detected correctly

**Solutions:**
1. ✅ Use clear column headers ("Name", "Email", "Full Name")
2. ✅ Ensure sample data is present and valid
3. ✅ Manually select columns if detection fails
4. ✅ Configure Google AI API key for better detection

#### Certificate Not Generating

**Solutions:**
1. ✅ Check that PDFKit is installed: `npm install pdfkit`
2. ✅ Verify `certificates/` directory exists and is writable
3. ✅ Check backend console for errors
4. ✅ Ensure certificate template is properly configured

### Debug Mode

Enable detailed logging:

```bash
# Backend
NODE_ENV=development npm run dev
```

Check browser console (F12) and backend terminal for error messages.

---

## 🌐 Deployment

### Docker Deployment (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    volumes:
      - ./backend/data:/app/data
      - ./backend/certificates:/app/certificates

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
```

### Manual Deployment

1. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Serve with Nginx or serve static files from backend**

3. **Start Backend in Production:**
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

### Environment Variables for Production

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=<strong-production-secret>
ENCRYPTION_KEY=<32-character-production-key>
```

---

## ❓ FAQ

### General

**Q: Is MailForge AI free to use?**
A: Yes, it's open source under the MIT License.

**Q: Can I use this for commercial purposes?**
A: Yes, the MIT License allows commercial use.

**Q: How many emails can I send?**
A: Limited by your Gmail account (500/day for free Gmail, 2000/day for Workspace).

### Technical

**Q: Can I use a different email provider?**
A: Currently optimized for Gmail, but Nodemailer supports other SMTP servers. Modify `backend/routes/email.js` for other providers.

**Q: Where is data stored?**
A: In JSON files under `backend/data/`. For production, consider migrating to a proper database.

**Q: Is my SMTP password safe?**
A: Yes, it's encrypted with AES-256 before storage.

### Features

**Q: Can I schedule campaigns?**
A: Not in v1.0. Scheduled sending is planned for v2.0.

**Q: Does it support HTML email templates?**
A: Yes, the editor supports both rich text and raw HTML.

**Q: Can I use custom fonts in certificates?**
A: The current version uses standard PDF fonts. Custom font support is planned.

---

## 📞 Support

- **Documentation:** This file and README.md
- **Issues:** Open a GitHub issue
- **Contributing:** See CONTRIBUTING.md

---

**Built with ❤️ by the MailForge AI Team**

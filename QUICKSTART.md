# 🚀 Quick Start Guide

## Prerequisites Checklist
- ✅ Node.js 18+ installed
- ✅ Gmail account with 2-Step Verification enabled
- ✅ Google AI Studio account

## Setup (5 minutes)

### Step 1: Install Dependencies
Open two terminals:

**Terminal 1:**
```powershell
cd backend
npm install
```

**Terminal 2:**
```powershell
cd frontend
npm install
```

### Step 2: Configure Backend
In Terminal 1:
```powershell
# Inside backend folder
# Create .env file
cp .env.example .env
```

Edit `.env` file:
```env
PORT=5000
JWT_SECRET=change_this_to_a_long_random_string_min_32_chars
ENCRYPTION_KEY=exactly_32_character_string_for_aes_256_encryption_key
NODE_ENV=development
```

### Step 3: Start Application

**Terminal 1 (Backend):**
```powershell
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
npm run dev
```

This starts both:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## First Use

### 1. Create Admin Account
- Open http://localhost:3000
- Enter any email/password (first login creates admin)
- You'll be logged in automatically

### 2. Configure Gmail SMTP
- Click **Settings** in navbar
- Enter your Gmail address
- Get App Password:
  - Go to https://myaccount.google.com/security
  - Enable "2-Step Verification" if not already
  - Search for "App passwords"
  - Select "Mail" → "Other" → Name it "MailForge AI"
  - Copy the 16-character password
- Paste App Password and save

### 3. Create Your First Campaign
- Click **New Campaign**
- Upload Excel/CSV with names and emails
- AI will detect columns automatically
- Review/edit recipients
- Write email template with variables
- (Optional) Enable certificates
- Send!

## Test Data

Create a test CSV file (`test-recipients.csv`):
```csv
Name,Email,Event
John Doe,john@example.com,Web Development Workshop
Jane Smith,jane@example.com,Web Development Workshop
Alex Johnson,alex@example.com,Web Development Workshop
```

## Troubleshooting

### "SMTP not configured"
- Go to Settings and add Gmail credentials

### "Failed to parse file"
- Ensure file has headers in first row
- Supported formats: .xlsx, .xls, .csv

### Gmail sending fails
- Verify using App Password (not regular password)
- Check Gmail sending limits (500 emails/day)
- Wait 24 hours if limit exceeded

### AI detection shows low confidence
- Check column names are descriptive
- Manually override if needed in recipient table

## Development Commands

```powershell
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm run dev

# Start only frontend (port 3000)
cd frontend
npm run dev

# Start only backend (port 5000)
cd backend
npm run dev

# Build frontend for production
cd frontend
npm run build
```

## Production Deployment

### Environment Variables
Update `.env` for production:
- Use strong JWT_SECRET (64+ characters)
- Use strong ENCRYPTION_KEY (exactly 32 characters)
- Set NODE_ENV=production

### Build Frontend
```powershell
cd frontend
npm run build
```

### Deploy Backend
- Deploy `backend/` folder to your server
- Ensure Node.js 18+ is installed
- Run `npm start` or use PM2

## Support

Check the main README.md for detailed documentation.

---

**Need help?** Review the console logs:
- Frontend: Press F12 in browser
- Backend: Check terminal output

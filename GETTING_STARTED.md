# 🎯 MailForge AI - Complete & Ready!

## ✅ What You Have

A **fully functional**, **production-ready** bulk email system with:

- 🔐 Secure authentication with encrypted SMTP storage
- 🤖 AI-powered Excel/CSV column detection
- 📊 Dynamic recipient management
- ✉️ Rich email editor with dynamic variables
- 🎓 PDF certificate generation
- 📮 Bulk email sending via Gmail
- 📈 Real-time campaign tracking
- 🎨 Beautiful GitHub-inspired dark UI

---

## 🚀 Installation (Choose One)

### Option A: PowerShell (Recommended)
```powershell
.\setup.ps1
```

### Option B: Command Prompt
```cmd
setup.bat
```

### Option C: Manual
```powershell
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

## ⚙️ Configuration (2 minutes)

### 1. Backend Environment
```powershell
cd backend
```

Edit `.env` (created from `.env.example`):
```env
PORT=5000
JWT_SECRET=your_super_long_random_jwt_secret_min_32_characters_here
ENCRYPTION_KEY=exactly_32_chars_for_aes_key!
GOOGLE_AI_API_KEY=your_google_ai_studio_api_key
NODE_ENV=development
```

**Get Google AI API Key:**
1. Visit: https://makersuite.google.com/app/apikey
2. Click "Get API Key" → "Create API key"
3. Copy and paste into `.env`

### 2. Frontend Environment (Optional)
Frontend uses proxy, but you can create `.env` if needed:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🎬 Start the Application

From project root:
```powershell
npm run dev
```

This starts:
- ✅ Frontend: http://localhost:3000
- ✅ Backend: http://localhost:5000

---

## 👤 First Login

1. Open: http://localhost:3000
2. Enter **any** email and password
3. First login automatically creates admin account
4. You're in! 🎉

---

## 📧 Configure Gmail SMTP

### Get Gmail App Password:
1. Go to: https://myaccount.google.com/security
2. Enable **2-Step Verification** (if not already)
3. Search for **"App passwords"**
4. Select **Mail** → **Other** → Name it "MailForge AI"
5. Copy the **16-character** password

### Add to MailForge:
1. Click **Settings** in navbar
2. Enter your Gmail address
3. Paste the App Password (16 chars, no spaces)
4. Add sender name (optional)
5. Click **Save**

---

## 🎯 Create Your First Campaign

### Step 1: Prepare Test Data
Create `test.csv`:
```csv
Name,Email,Event
John Doe,john@example.com,Web Workshop
Jane Smith,jane@example.com,Web Workshop
Alex Johnson,alex@example.com,Web Workshop
```

### Step 2: Create Campaign
1. Click **New Campaign** button
2. **Upload File**: Drag & drop `test.csv`
3. **AI Detection**: Verify Name/Email columns detected
4. **Edit Recipients**: Review the table (add/remove if needed)
5. **Email Template**:
   - Subject: `Certificate for {{name}}`
   - Body: `Hi {{name}}, Here's your certificate for {{event}}!`
6. **Certificate** (Optional): Enable and customize
7. **Review & Send**: Name it "Test Campaign" and send!

### Step 3: Track Progress
- Campaign details page auto-refreshes
- See real-time sent/failed counts
- Export results as CSV

---

## 📊 Test Checklist

### Backend Tests
- [ ] Server starts on port 5000
- [ ] `/api/health` returns OK
- [ ] Login creates admin account
- [ ] SMTP settings save encrypted
- [ ] File upload parses CSV
- [ ] AI detects columns
- [ ] Emails send successfully

### Frontend Tests
- [ ] Login page loads
- [ ] Dashboard shows empty state
- [ ] New campaign wizard works
- [ ] File upload shows AI detection
- [ ] Recipient table editable
- [ ] Email preview renders
- [ ] Campaign tracks progress
- [ ] Export button works

---

## 🐛 Troubleshooting

### "Cannot find module"
```powershell
npm run install:all
```

### "Port 3000 already in use"
Kill process or change port in `frontend/vite.config.js`

### "Port 5000 already in use"
Change PORT in `backend/.env`

### Gmail: "Username and Password not accepted"
- ✅ Use **App Password**, not regular password
- ✅ Verify 2-Step Verification enabled
- ✅ Try regenerating App Password

### AI detection shows "0% confidence"
- ✅ Check `.env` has GOOGLE_AI_API_KEY
- ✅ Verify API key is valid
- ✅ Rule-based fallback still works!

### Emails not sending
- ✅ Check SMTP configured in Settings
- ✅ Test with small batch (3-5 emails)
- ✅ Check spam folder
- ✅ Gmail limit: 500 emails/day

---

## 📁 Project Structure Overview

```
bulk-email/
├── backend/              # Node.js API (Port 5000)
│   ├── routes/          # API endpoints
│   ├── utils/           # Helpers, database
│   ├── middleware/      # Auth middleware
│   ├── data/           # JSON database
│   └── server.js       # Express app
│
├── frontend/            # React app (Port 3000)
│   ├── src/
│   │   ├── pages/      # Route pages
│   │   ├── components/ # UI components
│   │   └── context/    # State management
│   └── vite.config.js
│
├── README.md           # Full documentation
├── QUICKSTART.md       # 5-min setup guide
├── PROJECT_SUMMARY.md  # Complete overview
└── setup.ps1          # Automated setup
```

---

## 🎨 Features You Can Use Right Now

### 1. Dynamic Variables
In email templates:
- `{{name}}` → Recipient name
- `{{email}}` → Recipient email
- `{{event}}` → Event name
- `{{date}}` → Current date
- `{{certificateId}}` → Unique ID

### 2. Certificate Customization
- Achievement text
- Name font size, color, position
- Real-time preview
- Auto-PDF generation

### 3. Campaign Management
- Real-time status tracking
- Success/failure rates
- Export results as CSV
- Campaign history

### 4. Recipient Management
- Add/remove recipients
- Email validation
- Duplicate detection
- Bulk actions

---

## 🚀 Going to Production

### 1. Security
```env
# Use strong secrets (64+ characters)
JWT_SECRET=generate_with_openssl_rand_base64_64
ENCRYPTION_KEY=exactly_32_random_chars_here
NODE_ENV=production
```

### 2. Build Frontend
```powershell
cd frontend
npm run build
```

### 3. Deploy
- Frontend `dist/` → Static hosting (Vercel, Netlify)
- Backend → Node.js server (Heroku, DigitalOcean)
- Upgrade JSON DB → PostgreSQL/MongoDB

---

## 📚 Learn More

- **Full Docs**: [README.md](README.md)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Architecture**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

## 🎉 You're All Set!

Your MailForge AI installation is **complete and ready to use**.

**Next Action**: Run `npm run dev` and visit http://localhost:3000

---

## 💡 Pro Tips

1. **Start small**: Test with 5-10 emails first
2. **Check spam**: Gmail might filter first emails
3. **Monitor limits**: Free Gmail = 500 emails/day
4. **Use variables**: Personalize with `{{name}}`
5. **Export results**: Always download CSV reports
6. **Secure .env**: Never commit to git

---

## 🌟 Features at a Glance

| Feature | Status | Details |
|---------|--------|---------|
| Authentication | ✅ | JWT + Bcrypt |
| SMTP Integration | ✅ | Gmail App Password |
| File Upload | ✅ | Excel/CSV support |
| AI Detection | ✅ | Google Gemini + Rules |
| Email Editor | ✅ | WYSIWYG + HTML |
| Certificates | ✅ | PDF generation |
| Bulk Sending | ✅ | Rate limited |
| Campaign Tracking | ✅ | Real-time updates |
| GitHub UI | ✅ | Dark theme + animations |

---

**Happy Sending! 📧**

Built with ❤️ using React, Node.js, and Google AI

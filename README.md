# MailForge AI 🚀

**Smart Bulk Email & Certificate System with AI-Powered Column Detection**

A full-stack application for sending personalized bulk emails with automatic certificate generation. Features AI-powered Excel/CSV column detection, drag-and-drop file upload, dynamic variables, and real-time campaign tracking.

---

## ✨ Features

### Core Functionality
- 🔐 **Secure Authentication** - JWT-based login with AES-256 encrypted SMTP credentials
- 📊 **Smart File Upload** - AI detects Name & Email columns from any Excel/CSV format
- ✏️ **Dynamic Recipient Table** - Edit, add, remove recipients with email validation
- 📧 **Rich Email Editor** - WYSIWYG + HTML mode with dynamic variables ({{name}}, {{email}}, etc.)
- 🎓 **Certificate Generator** - Auto-generate PDF certificates with custom templates
- 📮 **Bulk Email Sending** - Send via Gmail with rate limiting and retry logic
- 📈 **Campaign Tracking** - Real-time status, success rates, and export results

### Technical Highlights
- **AI Column Detection** - Google AI Studio (Gemini) + rule-based fallback
- **Rate Limiting** - Prevents Gmail blocking (1 email/second)
- **Encryption** - AES-256 for SMTP passwords
- **Real-time Updates** - Auto-refresh campaign status
- **GitHub-Inspired UI** - Dark theme, Space Mono font, smooth animations

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite** - Fast, modern build tool
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Quill** - Rich text email editor
- **Lucide Icons** - Beautiful icon set

### Backend
- **Node.js** + **Express** - RESTful API
- **Nodemailer** - Gmail SMTP integration
- **PDFKit** - Certificate generation
- **XLSX & PapaParse** - Excel/CSV parsing
- **Google AI (Gemini)** - Column detection
- **Crypto-JS** - AES encryption
- **JSON Database** - File-based storage (MVP)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Gmail account with App Password

### Installation

1. **Clone the repository**
```powershell
git clone <repository-url>
```

2. **Backend Setup (Terminal 1)**
Open a terminal and run:
```powershell
cd backend
npm install
# Create .env file
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Frontend Setup (Terminal 2)**
Open a second terminal and run:
```powershell
cd frontend
npm install
npm run dev
```

4. **Configuration (.env)**
Edit `backend/.env`:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_32chars_min
ENCRYPTION_KEY=your_32_character_key_for_aes_encryption
```

5. **Start the Application**
With both terminals running `npm run dev`:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## 📖 Usage Guide

### 1. First Login
- Visit http://localhost:3000
- Enter any email/password to create admin account
- First login auto-creates admin user

### 2. Configure SMTP
- Go to **Settings**
- Add Gmail email
- Get Gmail App Password:
  1. Go to Google Account → Security
  2. Enable 2-Step Verification
  3. Create App Password (Select "Mail" → "Other")
  4. Copy 16-character password
- Save settings

### 3. Create Campaign

#### Step 1: Upload File
- Drag & drop or select Excel/CSV
- AI detects Name & Email columns
- Shows confidence scores

#### Step 2: Edit Recipients
- Review detected recipients
- Add/remove rows manually
- Validate emails
- Remove duplicates

#### Step 3: Email Template
- Write subject with variables: `Certificate for {{name}}`
- Use rich text or HTML editor
- Insert dynamic variables:
  - `{{name}}` - Recipient name
  - `{{email}}` - Recipient email
  - `{{event}}` - Event name
  - `{{date}}` - Date
- Preview with real recipient data

#### Step 4: Certificate (Optional)
- Enable certificate generation
- Customize achievement text
- Adjust name font size, position, color
- Preview in real-time

#### Step 5: Review & Send
- Name your campaign
- Review all settings
- Click **Send Campaign**
- Track progress in real-time

### 4. Monitor Campaign
- View real-time sending status
- See success/failure rates
- Export results as CSV
- Check individual email statuses

---

## 📁 Project Structure

```
bulk-email/
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Login, SMTP config
│   │   ├── upload.js        # File parsing, AI detection
│   │   ├── campaign.js      # Campaign CRUD
│   │   ├── email.js         # Bulk sending
│   │   └── certificate.js   # PDF generation
│   ├── utils/
│   │   ├── database.js      # JSON file operations
│   │   └── helpers.js       # Encryption, validation
│   ├── middleware/
│   │   └── auth.js          # JWT verification
│   ├── data/                # JSON database
│   ├── uploads/             # Temporary file storage
│   ├── certificates/        # Generated PDFs
│   └── server.js            # Express app
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── NewCampaign.jsx
│   │   │   ├── CampaignDetails.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── campaign/
│   │   │       ├── FileUpload.jsx
│   │   │       ├── RecipientTable.jsx
│   │   │       ├── EmailEditor.jsx
│   │   │       ├── CertificateEditor.jsx
│   │   │       └── ReviewSend.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── package.json
```

---

## 🎨 Design System

### Colors
- **Primary**: `#58a6ff` (GitHub Blue)
- **Success**: `#3fb950` (GitHub Green)
- **Error**: `#f85149` (GitHub Red)
- **Warning**: `#d29922` (GitHub Orange)
- **Background**: `#0d1117` (GitHub Dark)

### Typography
- **Display**: Space Mono (monospace)
- **Body**: JetBrains Mono (monospace)

### Animations
- Fade in on page load
- Slide up for cards
- Hover scale for buttons
- Smooth color transitions

---

## 🔒 Security

### Implemented
✅ AES-256 encryption for SMTP passwords
✅ JWT tokens with 7-day expiry
✅ Password hashing with bcrypt
✅ Email validation
✅ CORS protection
✅ Environment variables for secrets

### Best Practices
⚠️ Never commit `.env` file
⚠️ Use strong JWT secret (32+ characters)
⚠️ Use Gmail App Password (not account password)
⚠️ Change default secrets in production

---

## 🚧 Future Enhancements

### v2.0 Planned Features
- [ ] WhatsApp integration
- [ ] QR codes on certificates
- [ ] Public certificate verification
- [ ] Google Sheets direct import
- [ ] Drag-drop email builder
- [ ] Team accounts (multi-user)
- [ ] PostgreSQL/MongoDB support
- [ ] Advanced scheduling
- [ ] A/B testing templates
- [ ] Analytics dashboard

---

## 🐛 Troubleshooting

### Gmail Sending Fails
- Verify App Password (not account password)
- Check 2-Step Verification is enabled
- Try regenerating App Password
- Check Gmail sending limits (500/day)

### AI Detection Low Confidence
- Check column headers have clear names
- Ensure sample data is valid
- Fallback to manual column selection

### File Upload Fails
- Max file size: 10MB
- Supported: .xlsx, .xls, .csv
- Ensure file has headers in first row

---

## 📝 License

This project is licensed under the [MIT License](LICENSE) - feel free to use for personal or commercial projects.

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:
- Code of conduct
- Development setup
- Pull request process
- Coding standards

---

## 📚 Documentation

For detailed documentation, see the [`docs/`](docs/) folder:
- [**Setup Guide**](docs/SETUP.md) - Complete installation and configuration
- [**API Reference**](docs/API.md) - Full API documentation
- [**Architecture**](docs/ARCHITECTURE.md) - Technical design and structure

---

## 🙏 Credits

- **Google AI Studio** - Gemini API for column detection
- **GitHub** - Design inspiration
- **Nodemailer** - Email sending
- **PDFKit** - Certificate generation

---

## 📬 Support

For issues or questions:
- Check troubleshooting guide above
- Review console logs (F12 in browser)
- Check backend terminal output

---

**Built with ❤️ for making bulk email campaigns effortless**

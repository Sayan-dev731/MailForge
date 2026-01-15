<div align="center">

# 🚀 MailForge AI

**Smart Bulk Email & Certificate System with AI-Powered Column Detection**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18.0-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.0-blue.svg)](https://reactjs.org/)
[![Status](https://img.shields.io/badge/Status-Production-success.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-contributing">Contributing</a>
</p>

</div>

---

<p align="center">
  <b>MailForge AI</b> is a powerful full-stack application for sending personalized bulk emails with automatic certificate generation. <br/>
  It leverages <b>Google AI</b> for intelligent column detection and offers a seamless, drag-and-drop experience.
</p>

---

## ✨ Features

### 🏢 Core Functionality
- 🔐 **Secure Authentication** - JWT-based login with AES-256 encrypted SMTP credentials
- 📊 **Smart File Upload** - AI detects **Name** & **Email** columns automatically from any Excel/CSV
- ✏️ **Dynamic Recipients** - Edit, add, remove, and validate recipients in real-time
- 📧 **Rich Email Editor** - WYSIWYG + HTML mode with dynamic variables support (e.g., `{{name}}`, `{{event}}`)
- 🎓 **Certificate Generator** - Auto-attach personalized PDF certificates
- 📮 **Bulk Sending Engine** - Optimized for Gmail with intelligent rate limiting (1 email/sec)
- 📈 **Campaign Analytics** - Real-time tracking of sent, failed, and pending emails

### 🛡️ Technical Highlights
- **AI-Powered**: Uses Google Gemini for smart column mapping (with rule-based fallback)
- **Zero-Block Sending**: Intelligent queue management to prevent SMTP blocks
- **Military-Grade Encryption**: AES-256 encryption for all sensitive credentials
- **Reactive UI**: Auto-refreshing status updates and smooth Framer Motion animations
- **Dark Mode**: Beautiful, GitHub-inspired dark theme with **Space Mono** typography

---

## 🛠️ Tech Stack

<div align="center">

| **Frontend** | **Backend** |
|:------------:|:-----------:|
| ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) | ![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white) |
| ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white) | ![Nodemailer](https://img.shields.io/badge/Nodemailer-000000?style=for-the-badge&logo=gmail&logoColor=white) |
| ![Framer](https://img.shields.io/badge/Framer-0055FF?style=for-the-badge&logo=framer&logoColor=white) | ![PDFKit](https://img.shields.io/badge/PDFKit-EC1C24?style=for-the-badge&logo=adobeacrobatreader&logoColor=white) |

</div>

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** installed
- **Gmail Account** with an [App Password](https://myaccount.google.com/apppasswords)

### 📥 Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/bulk-email.git
cd bulk-email
```

#### 2. Backend Setup (Terminal 1)
```bash
# Open a new terminal for Backend
cd backend
npm install

# Configure Environment
cp .env.example .env
# Edit .env and set your secrets

# Start Backend
npm run dev
```

#### 3. Frontend Setup (Terminal 2)
```bash
# Open a new terminal for Frontend
cd frontend
npm install

# Start Frontend
npm run dev
```

### ⚙️ Configuration
Create a `.env` file in the `backend` folder:

```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_32chars_min
ENCRYPTION_KEY=your_32_character_key_for_aes_encryption
```

### 🏃‍♂️ Access the App
With both terminals running, visit:
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 📖 Usage Guide

### 1️⃣ First Login
- Navigate to **[http://localhost:3000](http://localhost:3000)**
- Enter **ANY** email and password.
- The **first user** is automatically created as the **Admin**.

### 2️⃣ Configure SMTP
- Go to the **Settings** tab.
- Enter your **Gmail Address**.
- Enter your **App Password** (Not your login password!).
  > 💡 _To get an App Password: Go to Google Account > Security > 2-Step Verification > App Passwords._

### 3️⃣ Create a Campaign
1. **Upload**: Drag & drop your Excel/CSV file.
2. **Review**: The AI will auto-detect Name/Email columns. Verify and edit if needed.
3. **Compose**: Write your email using `{{name}}` variables.
4. **Certificate**: (Optional) Toggle "Attach Certificate" and customize the template.
5. **Send**: Click "Send Campaign" and watch the progress in real-time! 🚀

---

## 📂 Project Structure

```bash
bulk-email/
├── 📂 backend/         # Node.js + Express API
│   ├── 📂 routes/      # Auth, Upload, Campaign endpoints
│   ├── 📂 utils/       # DB helpers, Encryption
│   ├── 📂 data/        # JSON Database (users.json, campaigns.json)
│   └── 📂 uploads/     # Temp file storage
│
├── 📂 frontend/        # React + Vite App
│   ├── 📂 src/
│   │   ├── 📂 components/ # UI Components (Editors, Tables)
│   │   ├── 📂 pages/      # Dashboard, Settings
│   │   └── 📂 context/    # Auth State Management
│   └── 📄 main.jsx      # Entry Point
│
├── 📂 docs/            # Detailed Documentation
└── 📄 README.md        # You are here!
```

---

## 🔒 Security Measures

- **Zero-Knowledge Storage**: SMTP passwords are encrypted using **AES-256-CBC** before saving.
- **Secure Sessions**: Authentication via **JWT** (JSON Web Tokens) with auto-expiry.
- **Data Safety**: Inputs are sanitized to prevent injection attacks.
- **Rate Control**: Built-in throttles to respect Gmail's sending limits.

---

## 📚 Documentation

For more detailed information, check out the [`docs/`](docs/) folder:

- **[📖 Setup Guide](docs/SETUP.md)**: Detailed installation and troubleshooting.
- **[📡 API Reference](docs/API.md)**: Endpoints, request bodies, and examples.
- **[🏗️ Architecture](docs/ARCHITECTURE.md)**: System design and data flow.

---

## 🤝 Contributing

We love contributions! Please read our [**Contributing Guide**](CONTRIBUTING.md) to get started.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<div align="center">

**Built with ❤️ for hassle-free bulk emailing.**

[Report Bug](https://github.com/YOUR_USERNAME/bulk-email/issues) • [Request Feature](https://github.com/YOUR_USERNAME/bulk-email/issues)

</div>

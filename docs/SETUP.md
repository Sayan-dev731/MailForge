<div align="center">

# 📚 MailForge AI - Setup Guide

**Comprehensive guide to installing, configuring, and running MailForge AI.**

</div>

---

## 📖 Table of Contents

1. [System Requirements](#-system-requirements)
2. [Installation Guide](#-installation-guide)
3. [Configuration](#-configuration)
4. [Running the Application](#-running-the-application)
5. [Troubleshooting](#-troubleshooting)

---

## 💻 System Requirements

### Minimum Specifications

| Component | Requirement |
|-----------|-------------|
| **OS** | Windows 10+, macOS 10.15+, Ubuntu 18.04+ |
| **Node.js** | v18.0.0 or higher |
| **npm** | v8.0.0 or higher |
| **RAM** | 4 GB minimum |

### Required Accounts

| Service | Purpose | Required |
|---------|---------|----------|
| **Gmail** | Sending emails via SMTP | ✅ Yes |
| **Google Account** | For App Password generation | ✅ Yes |

---

## 📥 Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/bulk-email.git
cd bulk-email
```

### Step 2: Install Backend Dependencies

Open your **first** terminal window:
```bash
cd backend
npm install
```

### Step 3: Install Frontend Dependencies

Open your **second** terminal window:
```bash
cd ../frontend
npm install
```

---

## ⚙️ Configuration

### Backend Configuration

1. **Create the environment file:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Edit `.env` with your secrets:**

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Security Keys (REQUIRED - Change these!)
   JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
   ENCRYPTION_KEY=your_32_character_encryption_key_here
   ```

   > **Note:** `ENCRYPTION_KEY` must be exactly **32 characters** long.

#### 🔐 Generating Secure Keys

**PowerShell (Windows):**
```powershell
# Generate Encryption Key (32 chars)
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**Bash (macOS/Linux):**
```bash
# Generate Encryption Key
openssl rand -hex 16
```

### Frontend Configuration

1. **Create the environment file:**
   ```bash
   cd frontend
   cp .env.example .env
   ```

2. **Edit `.env`:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

---

## 🚀 Running the Application

For the best development experience, run the backend and frontend in separate terminals.

### Terminal 1: Backend
```bash
cd backend
npm run dev
```
✅ **Success:** You should see `🚀 MailForge AI Backend running on port 5000`

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
✅ **Success:** You should see `Local: http://localhost:5173` (or port 3000)

---

## 🔧 Troubleshooting

### Common Issues

#### 🔴 "Gmail Authentication connection failed"
- **Cause:** You are using your login password instead of an App Password.
- **Fix:** Generate a specific App Password in your Google Account security settings.

#### 🔴 "Invalid encryption key length"
- **Cause:** The `ENCRYPTION_KEY` in `.env` is not 32 bytes.
- **Fix:** Ensure your key is exactly 32 characters long.

#### 🔴 "Port already in use"
- **Cause:** Another process is using port 5000 or 3000.
- **Fix:** Kill the process or change the `PORT` in `.env`.

#### 🔴 "File upload failed"
- **Cause:** File is too large or wrong format.
- **Fix:** Ensure file is under 10MB and is a valid .csv or .xlsx.

---

<div align="center">

**[⬅️ Back to README](../README.md)**

</div>

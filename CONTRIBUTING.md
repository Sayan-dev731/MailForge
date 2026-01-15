<div align="center">

# 🤝 Contributing to MailForge AI

**Thank you for your interest in contributing!** <br/>
It's people like you who make this project better for everyone.

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)]()
[![Code of Conduct](https://img.shields.io/badge/Code%20of%20Conduct-v2.1-blue.svg)](#-code-of-conduct)

</div>

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Setup](#-development-setup)
- [Pull Request Process](#-pull-request-process)
- [Style Guidelines](#-style-guidelines)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

**✅ Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**❌ Unacceptable behaviors include:**
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- A code editor (we recommend [VS Code](https://code.visualstudio.com/))

### Fork and Clone

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bulk-email.git
   cd bulk-email
   ```
3. **Add the upstream remote:**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/bulk-email.git
   ```

---

## 🛠️ Development Setup

### 1. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```
Edit `.env` with your secure keys:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_key_32chars_min
ENCRYPTION_KEY=your_32_character_key_for_aes_encryption
NODE_ENV=development
```

**Frontend (.env):**
```bash
cd frontend
cp .env.example .env
```
_(Default values usually work for local dev)_

### 2. Start Development Servers

You need **two terminal windows** running simultaneously.

#### Terminal 1 (Backend)
```bash
cd backend
npm install
npm run dev
```

#### Terminal 2 (Frontend)
```bash
cd frontend
npm install
npm run dev
```

The app will be available at:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔄 Pull Request Process

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clear, readable code.
   - Follow existing patterns.
   - Update documentation if needed.

3. **Test Your Changes**
   - Ensure the app runs without errors in the console.
   - Check that the build works:
     ```bash
     cd frontend && npm run build
     ```

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 📝 Style Guidelines

### JavaScript/React
- Use **ES6+** syntax.
- Use **async/await** over Promises.
- Use **Functional Components** with Hooks.
- Keep components small and focused.

### Commits
We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting, missing semi-colons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature

**Example:**
```bash
feat(email): add support for dark mode HTML editor
```

---

<div align="center">

**Questions?** <br/>
Check existing issues or open a new one with the `question` label.

**Thank you for contributing! 🚀**

</div>

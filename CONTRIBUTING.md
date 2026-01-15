# Contributing to MailForge AI 🤝

First off, thank you for considering contributing to MailForge AI! It's people like you that make this project better for everyone.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Commit Messages](#commit-messages)
- [Issue Guidelines](#issue-guidelines)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to fostering an open and welcoming environment. We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** 8+ (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- A code editor (we recommend [VS Code](https://code.visualstudio.com/))

### Fork and Clone

1. **Fork the repository** on GitHub
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

### 1. Install Dependencies

```bash
# Install all dependencies for both frontend and backend
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:
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

The default values in `frontend/.env.example` should work for local development.

### 3. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 💡 How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**
- A clear and descriptive title
- Steps to reproduce the behavior
- Expected behavior vs. actual behavior
- Screenshots if applicable
- Your environment (OS, Node.js version, browser)
- Relevant error messages from browser console or terminal

### ✨ Suggesting Features

We love feature suggestions! Please:
- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Include mockups or examples if possible

### 💻 Code Contributions

**Great areas for contribution:**
- Bug fixes
- Documentation improvements
- New features from the roadmap
- Performance optimizations
- Test coverage improvements
- UI/UX enhancements

---

## 🔄 Pull Request Process

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clear, readable code
- Follow the existing code style
- Add comments where necessary
- Update documentation if needed

### 3. Test Your Changes

```bash
# Run the development servers and test manually
cd backend && npm run dev
cd frontend && npm run dev

# Ensure the build works
cd frontend && npm run build
```

### 4. Commit Your Changes

```bash
git add .
git commit -m "feat: add amazing new feature"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub with:
- A clear title and description
- Reference to any related issues
- Screenshots for UI changes
- Description of testing done

---

## 📝 Style Guidelines

### JavaScript/React Code Style

- Use **ES6+** syntax
- Use **async/await** over Promises where possible
- Use **functional components** with hooks in React
- Keep components small and focused
- Use **meaningful variable and function names**

### File Organization

```
frontend/src/
├── components/   # Reusable UI components
├── pages/        # Page-level components
├── context/      # React context providers
├── utils/        # Utility functions
└── hooks/        # Custom React hooks
```

```
backend/
├── routes/       # API route handlers
├── middleware/   # Express middleware
├── utils/        # Utility functions
└── data/         # JSON database files
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EmailEditor.jsx` |
| Files | kebab-case or camelCase | `auth.js` |
| Functions | camelCase | `handleSubmit()` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| CSS Classes | kebab-case | `email-editor` |

### Tailwind CSS

- Use Tailwind utility classes
- Group related classes together
- Use responsive prefixes (`sm:`, `md:`, `lg:`)
- Leverage the custom colors defined in `tailwind.config.js`

---

## 💬 Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat(email): add HTML editor toggle
fix(auth): resolve JWT token expiration issue
docs: update installation instructions
style(ui): improve button hover states
refactor(api): simplify campaign route handlers
```

---

## 🎫 Issue Guidelines

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11]
- Node.js: [e.g., 18.17.0]
- Browser: [e.g., Chrome 120]
```

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Additional context**
Any other context or screenshots.
```

---

## 📁 Project Structure Overview

```
bulk-email/
├── backend/                 # Node.js Express API
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── utils/              # Helpers and database
│   ├── data/               # JSON database
│   ├── uploads/            # Temporary file storage
│   └── certificates/       # Generated PDFs
│
├── frontend/               # React + Vite app
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context
│   │   └── utils/         # API utilities
│   └── public/            # Static assets
│
├── README.md              # Project documentation
├── CONTRIBUTING.md        # This file
└── LICENSE               # MIT License
```

---

## 🙏 Recognition

Contributors will be recognized in:
- The project README
- Release notes for their contributions
- GitHub contributors page

---

## ❓ Questions?

If you have questions about contributing:
- Check existing issues and discussions
- Open a new issue with the `question` label
- Review the README for project details

---

**Thank you for contributing to MailForge AI! 🚀**

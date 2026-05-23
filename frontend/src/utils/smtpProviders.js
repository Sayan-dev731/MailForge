// SMTP provider presets and setup guides.
// Adding a new provider? Append it here — the Settings UI is fully data-driven.

export const SMTP_PROVIDERS = [
    {
        id: "gmail",
        name: "Gmail / Google Workspace",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        usernameIsEmail: true,
        passwordLabel: "App Password",
        passwordHint: "16-character app password (not your Google password)",
        docsUrl: "https://support.google.com/accounts/answer/185833",
        steps: [
            "Open your Google Account → Security.",
            "Enable 2-Step Verification if it is not already on.",
            "Open https://myaccount.google.com/apppasswords",
            'Create a new app password (App: "Mail", Device: "Other → MailForge").',
            "Copy the generated 16-character password and paste it below.",
        ],
    },
    {
        id: "outlook",
        name: "Outlook / Microsoft 365",
        host: "smtp.office365.com",
        port: 587,
        secure: false, // STARTTLS
        usernameIsEmail: true,
        passwordLabel: "App Password",
        passwordHint:
            "Microsoft account app password (required when 2FA is enabled)",
        docsUrl:
            "https://support.microsoft.com/account-billing/5896ed9b-4263-e681-128a-a6f2979a7944",
        steps: [
            "Sign in to https://account.microsoft.com/security",
            "Turn on Two-step verification (required for app passwords).",
            'Go to "Advanced security options" → "App passwords" → Create new.',
            "Copy the password it generates and paste it below.",
            "Note: Office 365 business tenants may need an admin to enable SMTP AUTH on your mailbox.",
        ],
    },
    {
        id: "zoho",
        name: "Zoho Mail",
        host: "smtp.zoho.com",
        port: 465,
        secure: true,
        usernameIsEmail: true,
        passwordLabel: "App Password",
        passwordHint: "Zoho app-specific password",
        docsUrl:
            "https://www.zoho.com/mail/help/zoho-account/generate-app-specific-password.html",
        steps: [
            "Sign in to https://accounts.zoho.com/",
            "Go to Security → App Passwords.",
            'Click "Generate New Password", name it "MailForge".',
            "Copy the generated password and paste it below.",
            "If your Zoho account is hosted in EU/IN/AU, use smtp.zoho.eu / smtp.zoho.in / smtp.zoho.com.au instead.",
        ],
    },
    {
        id: "yahoo",
        name: "Yahoo Mail",
        host: "smtp.mail.yahoo.com",
        port: 465,
        secure: true,
        usernameIsEmail: true,
        passwordLabel: "App Password",
        passwordHint: "Yahoo app password (not your account password)",
        docsUrl: "https://help.yahoo.com/kb/SLN15241.html",
        steps: [
            "Sign in to https://login.yahoo.com/account/security",
            "Turn on Two-step verification.",
            'Open "Generate app password", name it "MailForge".',
            "Copy the password and paste it below.",
        ],
    },
    {
        id: "icloud",
        name: "iCloud Mail",
        host: "smtp.mail.me.com",
        port: 587,
        secure: false,
        usernameIsEmail: true,
        passwordLabel: "App-Specific Password",
        passwordHint: "Apple ID app-specific password",
        docsUrl: "https://support.apple.com/102654",
        steps: [
            "Sign in to https://appleid.apple.com/",
            'Under "Sign-In and Security", choose "App-Specific Passwords".',
            'Click "Generate Password" and name it "MailForge".',
            "Copy the password and paste it below.",
            "Use your full iCloud email address as the username.",
        ],
    },
    {
        id: "sendgrid",
        name: "SendGrid",
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        usernameIsEmail: false,
        defaultUsername: "apikey",
        passwordLabel: "API Key",
        passwordHint: "Your SendGrid API key (starts with SG.)",
        docsUrl:
            "https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api",
        steps: [
            "Sign in to https://app.sendgrid.com/",
            "Go to Settings → API Keys → Create API Key (Full Access or Mail Send).",
            "Copy the key (you will only see it once) and paste it below.",
            'The SMTP username must be the literal text "apikey".',
            "Make sure your sender email is verified under Sender Authentication.",
        ],
    },
    {
        id: "mailgun",
        name: "Mailgun",
        host: "smtp.mailgun.org",
        port: 587,
        secure: false,
        usernameIsEmail: false,
        passwordLabel: "SMTP Password",
        passwordHint: "SMTP credentials password from your Mailgun domain",
        docsUrl:
            "https://documentation.mailgun.com/docs/mailgun/user-manual/sending-messages/#smtp-relay",
        steps: [
            "Sign in to https://app.mailgun.com/",
            "Open Sending → Domains → your domain → SMTP credentials.",
            "Use the postmaster@yourdomain.com login (or create a new SMTP user).",
            "Reset the password if you do not have it and copy the new one.",
            "Use the EU host smtp.eu.mailgun.org instead if your domain is in the EU region.",
        ],
    },
    {
        id: "brevo",
        name: "Brevo (Sendinblue)",
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        usernameIsEmail: false,
        passwordLabel: "SMTP Key",
        passwordHint: "SMTP key generated in Brevo",
        docsUrl: "https://help.brevo.com/hc/en-us/articles/7924908994450",
        steps: [
            "Sign in to https://app.brevo.com/",
            "Open SMTP & API → SMTP tab.",
            "Copy the SMTP login (your Brevo account email or assigned login).",
            "Generate a new SMTP key and copy it as the password.",
        ],
    },
    {
        id: "ses",
        name: "Amazon SES",
        host: "email-smtp.us-east-1.amazonaws.com",
        port: 587,
        secure: false,
        usernameIsEmail: false,
        passwordLabel: "SMTP Password",
        passwordHint: "SES SMTP password derived from your IAM credentials",
        docsUrl:
            "https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html",
        steps: [
            "Open the Amazon SES console → SMTP settings.",
            "Note the SMTP endpoint for your region (e.g. email-smtp.eu-west-1.amazonaws.com) and update the Host field.",
            'Click "Create SMTP credentials" — this creates an IAM user.',
            "Copy the SMTP username and password (shown only once).",
            "Verify your sender email/domain in SES before sending.",
        ],
    },
    {
        id: "custom",
        name: "Custom SMTP server",
        host: "",
        port: 587,
        secure: false,
        usernameIsEmail: true,
        passwordLabel: "SMTP Password",
        passwordHint: "Password for your SMTP user",
        docsUrl: null,
        steps: [
            "Enter the SMTP host, port, and credentials provided by your email host.",
            'Use port 465 with "Secure (SSL/TLS)" enabled for implicit TLS.',
            'Use port 587 with "Secure" off for STARTTLS (the most common option).',
            "Use port 25 only on internal/relay servers that do not require TLS.",
            "Make sure outbound traffic on the chosen port is allowed by your firewall.",
        ],
    },
];

export function getProvider(id) {
    return (
        SMTP_PROVIDERS.find((p) => p.id === id) ||
        SMTP_PROVIDERS[SMTP_PROVIDERS.length - 1]
    );
}

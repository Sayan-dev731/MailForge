import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Mail,
    Lock,
    Save,
    CheckCircle,
    AlertCircle,
    Server,
    Shield,
    User,
    Plug,
    ExternalLink,
    Loader2,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import toast from "react-hot-toast";
import { SMTP_PROVIDERS, getProvider } from "../utils/smtpProviders";

const DEFAULT_FORM = {
    provider: "gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    email: "",
    username: "",
    password: "",
    senderName: "",
};

export default function Settings() {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [hasExisting, setHasExisting] = useState(false);

    const provider = useMemo(() => getProvider(form.provider), [form.provider]);

    useEffect(() => {
        fetchSMTPSettings();
    }, []);

    const fetchSMTPSettings = async () => {
        try {
            const response = await api.get("/auth/smtp");
            if (response.data.success && response.data.smtp) {
                const s = response.data.smtp;
                setForm({
                    provider: s.provider || "custom",
                    host: s.host || "",
                    port: s.port || 465,
                    secure: s.secure !== undefined ? s.secure : true,
                    email: s.email || "",
                    username: s.username || s.email || "",
                    password: "",
                    senderName: s.senderName || "",
                });
                setHasExisting(s.hasPassword);
            }
        } catch (error) {
            console.error("Fetch SMTP error:", error);
        } finally {
            setLoading(false);
        }
    };

    const applyProvider = (id) => {
        const p = getProvider(id);
        setForm((prev) => ({
            ...prev,
            provider: p.id,
            host: p.host || prev.host,
            port: p.port,
            secure: p.secure,
            username: p.usernameIsEmail
                ? prev.email || prev.username
                : (p.defaultUsername ?? prev.username),
        }));
    };

    const updateField = (patch) => setForm((prev) => ({ ...prev, ...patch }));

    const handleEmailChange = (email) => {
        updateField({
            email,
            username: provider.usernameIsEmail ? email : form.username,
        });
    };

    const handlePortChange = (raw) => {
        const port = parseInt(raw, 10) || 0;
        // Auto-toggle secure flag to the sensible default for the port
        updateField({
            port,
            secure: port === 465,
        });
    };

    const buildPayload = () => ({
        provider: form.provider,
        host: form.host.trim(),
        port: Number(form.port),
        secure: !!form.secure,
        email: form.email.trim(),
        username: (form.username || form.email).trim(),
        password: form.password,
        senderName: form.senderName.trim(),
    });

    const handleTest = async () => {
        if (!form.host || !form.port || !form.email) {
            toast.error("Host, port, and email are required to test");
            return;
        }
        if (!form.password && !hasExisting) {
            toast.error("Enter the password to test the connection");
            return;
        }
        setTesting(true);
        try {
            // If password is empty but a saved one exists, send an empty payload
            // and let the backend fall back to the stored credentials.
            const payload = form.password ? buildPayload() : {};
            const response = await api.post("/email/test-connection", payload);
            if (response.data.success) {
                toast.success(response.data.message || "SMTP connection OK");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Connection failed");
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!form.email || !form.host || !form.port) {
            toast.error("Email, host, and port are required");
            return;
        }
        if (!form.password && !hasExisting) {
            toast.error("Password / app password is required");
            return;
        }

        setSaving(true);
        try {
            const response = await api.post("/auth/smtp", buildPayload());
            if (response.data.success) {
                toast.success("SMTP settings saved successfully!");
                setHasExisting(true);
                setForm((prev) => ({ ...prev, password: "" }));
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to save settings",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-github-darker">
            <Navbar />

            <div className="max-w-4xl mx-auto px-6 py-8">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                        Settings
                    </h1>
                    <p className="text-gray-400">
                        Configure any SMTP provider — Gmail, Outlook, Zoho,
                        Yahoo, SendGrid, Mailgun, Brevo, Amazon SES, or a custom
                        server.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="card"
                >
                    <div className="flex items-center space-x-3 mb-6">
                        <div className="w-12 h-12 bg-github-blue/20 rounded-lg flex items-center justify-center">
                            <Mail className="w-6 h-6 text-github-blue" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                SMTP Configuration
                            </h2>
                            <p className="text-sm text-gray-400">
                                Credentials are encrypted with AES-256 and used
                                only to send your campaigns.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue mx-auto"></div>
                            <p className="text-gray-400 mt-4">
                                Loading settings...
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Provider picker */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Provider{" "}
                                    <span className="text-github-red">*</span>
                                </label>
                                <select
                                    value={form.provider}
                                    onChange={(e) =>
                                        applyProvider(e.target.value)
                                    }
                                    className="input-field"
                                >
                                    {SMTP_PROVIDERS.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Picking a provider auto-fills the host,
                                    port, and security mode below.
                                </p>
                            </div>

                            {/* Host + Port */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        SMTP Host{" "}
                                        <span className="text-github-red">
                                            *
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Server className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={form.host}
                                            onChange={(e) =>
                                                updateField({
                                                    host: e.target.value,
                                                })
                                            }
                                            className="input-field pl-12"
                                            placeholder="smtp.example.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Port{" "}
                                        <span className="text-github-red">
                                            *
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="65535"
                                        value={form.port}
                                        onChange={(e) =>
                                            handlePortChange(e.target.value)
                                        }
                                        className="input-field"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Secure toggle */}
                            <div className="flex items-start space-x-3 p-3 rounded-lg border border-github-border bg-github-dark/40">
                                <Shield className="w-5 h-5 text-github-blue mt-0.5" />
                                <div className="flex-1">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.secure}
                                            onChange={(e) =>
                                                updateField({
                                                    secure: e.target.checked,
                                                })
                                            }
                                            className="mr-3 w-4 h-4"
                                        />
                                        <span className="text-sm text-white font-medium">
                                            Use implicit TLS (SSL)
                                        </span>
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Enable for port 465. Leave off for port
                                        587 / 25 (STARTTLS).
                                    </p>
                                </div>
                            </div>

                            {/* Email + Username */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        From Email{" "}
                                        <span className="text-github-red">
                                            *
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="email"
                                            value={form.email}
                                            onChange={(e) =>
                                                handleEmailChange(
                                                    e.target.value,
                                                )
                                            }
                                            className="input-field pl-12"
                                            placeholder="you@example.com"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        SMTP Username
                                        {!provider.usernameIsEmail && (
                                            <span className="text-github-red">
                                                {" "}
                                                *
                                            </span>
                                        )}
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                        <input
                                            type="text"
                                            value={form.username}
                                            onChange={(e) =>
                                                updateField({
                                                    username: e.target.value,
                                                })
                                            }
                                            className="input-field pl-12"
                                            placeholder={
                                                provider.usernameIsEmail
                                                    ? "Defaults to your email"
                                                    : provider.defaultUsername ||
                                                      "SMTP login"
                                            }
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {provider.usernameIsEmail
                                            ? "Most providers use your email as the SMTP login."
                                            : "This provider uses a separate SMTP username."}
                                    </p>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    {provider.passwordLabel}
                                    {!hasExisting && (
                                        <span className="text-github-red">
                                            {" "}
                                            *
                                        </span>
                                    )}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={(e) =>
                                            updateField({
                                                password: e.target.value,
                                            })
                                        }
                                        className="input-field pl-12"
                                        placeholder={
                                            hasExisting
                                                ? "••••••••••••••••"
                                                : provider.passwordHint
                                        }
                                        required={!hasExisting}
                                        autoComplete="new-password"
                                    />
                                </div>
                                {hasExisting && (
                                    <p className="text-xs text-github-green mt-2 flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Existing password saved — leave blank to
                                        keep it.
                                    </p>
                                )}
                            </div>

                            {/* Sender name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Sender Name (optional)
                                </label>
                                <input
                                    type="text"
                                    value={form.senderName}
                                    onChange={(e) =>
                                        updateField({
                                            senderName: e.target.value,
                                        })
                                    }
                                    className="input-field"
                                    placeholder="Your Name or Organization"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Shown as the "From" name in recipients'
                                    inboxes.
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={handleTest}
                                    disabled={testing}
                                    className="btn-secondary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {testing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Testing…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Plug className="w-5 h-5" />
                                            <span>Test Connection</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Saving…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span>Save SMTP Settings</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Provider-specific guide */}
                    <div className="mt-8 p-4 bg-github-blue/10 border border-github-blue/30 rounded-lg">
                        <h3 className="font-bold text-github-blue mb-3 flex items-center justify-between">
                            <span className="flex items-center">
                                <AlertCircle className="w-5 h-5 mr-2" />
                                How to configure {provider.name}
                            </span>
                            {provider.docsUrl && (
                                <a
                                    href={provider.docsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs flex items-center text-github-blue hover:underline"
                                >
                                    Official docs{" "}
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                            )}
                        </h3>
                        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                            {provider.steps.map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                        </ol>
                        <p className="text-xs text-gray-400 mt-3">
                            🔐 Your password is encrypted with AES-256 and never
                            stored in plain text. Use the{" "}
                            <strong>Test Connection</strong> button to confirm
                            the credentials before saving.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

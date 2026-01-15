import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, Save, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Settings() {
    const [smtp, setSmtp] = useState({
        email: '',
        password: '',
        senderName: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasExisting, setHasExisting] = useState(false);

    useEffect(() => {
        fetchSMTPSettings();
    }, []);

    const fetchSMTPSettings = async () => {
        try {
            const response = await api.get('/auth/smtp');
            if (response.data.success && response.data.smtp) {
                setSmtp({
                    email: response.data.smtp.email || '',
                    password: '', // Never show existing password
                    senderName: response.data.smtp.senderName || '',
                });
                setHasExisting(response.data.smtp.hasPassword);
            }
        } catch (error) {
            console.error('Fetch SMTP error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!smtp.email || !smtp.password) {
            toast.error('Email and App Password are required');
            return;
        }

        setSaving(true);

        try {
            const response = await api.post('/auth/smtp', smtp);
            if (response.data.success) {
                toast.success('SMTP settings saved successfully!');
                setHasExisting(true);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save settings');
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
                    <h1 className="text-3xl font-display font-bold text-white mb-2">Settings</h1>
                    <p className="text-gray-400">Configure your SMTP credentials for sending emails</p>
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
                            <h2 className="text-xl font-bold text-white">Gmail SMTP Configuration</h2>
                            <p className="text-sm text-gray-400">Configure your Gmail for sending emails (separate from app login)</p>
                        </div>
                    </div>

                    {/* Clarification Note */}
                    <div className="mb-6 p-3 bg-github-green/10 border border-github-green/30 rounded-lg">
                        <p className="text-sm text-github-green">
                            💡 <strong>Note:</strong> These credentials are for sending emails only and are different from your app login.
                            Use your Gmail address and a 16-character App Password from Google.
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue mx-auto"></div>
                            <p className="text-gray-400 mt-4">Loading settings...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6">
                            {/* Gmail Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Gmail Email Address <span className="text-github-red">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        value={smtp.email}
                                        onChange={(e) => setSmtp({ ...smtp, email: e.target.value })}
                                        className="input-field pl-12"
                                        placeholder="your-email@gmail.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* App Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    App Password <span className="text-github-red">*</span>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={smtp.password}
                                        onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
                                        className="input-field pl-12"
                                        placeholder={hasExisting ? '••••••••••••••••' : '16-character app password'}
                                        required={!hasExisting}
                                    />
                                </div>
                                {hasExisting && (
                                    <p className="text-xs text-github-green mt-2 flex items-center">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Existing password saved (leave blank to keep current)
                                    </p>
                                )}
                            </div>

                            {/* Sender Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Sender Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={smtp.senderName}
                                    onChange={(e) => setSmtp({ ...smtp, senderName: e.target.value })}
                                    className="input-field"
                                    placeholder="Your Name or Organization"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    This name will appear as the sender in recipient's inbox
                                </p>
                            </div>

                            {/* Save Button */}
                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        <span>Save SMTP Settings</span>
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Instructions */}
                    <div className="mt-8 p-4 bg-github-blue/10 border border-github-blue/30 rounded-lg">
                        <h3 className="font-bold text-github-blue mb-2 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2" />
                            How to get Gmail App Password
                        </h3>
                        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                            <li>Go to your Google Account settings</li>
                            <li>Navigate to Security → 2-Step Verification (enable if not already)</li>
                            <li>Scroll to "App passwords" and click it</li>
                            <li>Select "Mail" and "Other" (name it "MailForge AI")</li>
                            <li>Copy the 16-character password and paste it above</li>
                        </ol>
                        <p className="text-xs text-gray-400 mt-3">
                            🔐 Your password is encrypted with AES-256 and never stored in plain text
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

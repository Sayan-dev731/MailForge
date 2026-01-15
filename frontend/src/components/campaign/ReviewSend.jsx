import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Send, CheckCircle, AlertCircle, Users, Mail, Award, TestTube, Eye, Loader } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function ReviewSend({ data, onBack, canGoBack }) {
    const navigate = useNavigate();
    const [campaignName, setCampaignName] = useState('');
    const [sending, setSending] = useState(false);
    const [smtpConfigured, setSmtpConfigured] = useState(false);
    const [checkingSMTP, setCheckingSMTP] = useState(true);
    const [testEmail, setTestEmail] = useState('');
    const [sendingTest, setSendingTest] = useState(false);
    const [certPreview, setCertPreview] = useState(null);
    const [generatingCert, setGeneratingCert] = useState(false);

    // Check SMTP configuration on mount
    useEffect(() => {
        const checkSMTP = async () => {
            try {
                const response = await api.get('/email/smtp-status');
                setSmtpConfigured(response.data.configured);
            } catch (error) {
                console.error('Failed to check SMTP status:', error);
                setSmtpConfigured(false);
            } finally {
                setCheckingSMTP(false);
            }
        };
        checkSMTP();
    }, []);

    const handleTestEmail = async () => {
        if (!testEmail || !testEmail.includes('@')) {
            toast.error('Please enter a valid test email address');
            return;
        }

        if (!smtpConfigured) {
            toast.error('Please configure SMTP settings first');
            navigate('/settings');
            return;
        }

        setSendingTest(true);
        try {
            const response = await api.post('/email/test', {
                to: testEmail,
                subject: data.emailTemplate?.subject || 'Test Email',
                body: data.emailTemplate?.body || '<p>This is a test email.</p>',
            });

            if (response.data.success) {
                toast.success('✅ Test email sent! Check your inbox.');
            }
        } catch (error) {
            console.error('Test email error:', error);
            toast.error(error.response?.data?.message || 'Failed to send test email');
        } finally {
            setSendingTest(false);
        }
    };

    const handleGenerateCertPreview = async () => {
        if (!data.certificateTemplate) {
            toast.error('No certificate template configured');
            return;
        }

        setGeneratingCert(true);
        try {
            // Use first recipient as sample data
            const sampleRecipient = data.recipients?.[0] || {
                name: 'John Doe',
                email: 'john@example.com',
                date: new Date().toLocaleDateString(),
            };

            // Replace variables in text
            const replaceVariables = (text) => {
                let result = text;
                Object.entries(sampleRecipient).forEach(([key, value]) => {
                    result = result.replace(new RegExp(`{{${key}}}`, 'gi'), value);
                });
                result = result.replace(/{{date}}/gi, new Date().toLocaleDateString());
                return result;
            };

            const template = data.certificateTemplate;
            const canvasWidth = template.width || template.canvasSize?.width || 800;
            const canvasHeight = template.height || template.canvasSize?.height || 600;

            // Frontend-based generation using Konva
            const Konva = await import('konva');
            const tempContainer = document.createElement('div');
            document.body.appendChild(tempContainer);

            const stage = new Konva.default.Stage({
                container: tempContainer,
                width: canvasWidth,
                height: canvasHeight,
            });

            const layer = new Konva.default.Layer();
            stage.add(layer);

            // Load background image
            if (template.backgroundImage) {
                await new Promise((resolve, reject) => {
                    const img = new window.Image();
                    img.onload = () => {
                        const bgImage = new Konva.default.Image({
                            image: img,
                            width: canvasWidth,
                            height: canvasHeight,
                        });
                        layer.add(bgImage);
                        resolve();
                    };
                    img.onerror = reject;
                    img.src = template.backgroundImage;
                });
            }

            // Add text elements with variables replaced
            if (template.elements) {
                for (const el of template.elements) {
                    if (el.type === 'text') {
                        const text = new Konva.default.Text({
                            x: el.x,
                            y: el.y,
                            text: replaceVariables(el.text),
                            fontSize: el.fontSize || 24,
                            fontFamily: el.fontFamily || 'Arial',
                            fill: el.fill || '#000000',
                            width: el.width,
                            align: el.align || 'left',
                        });
                        layer.add(text);
                    }
                }
            }

            layer.draw();

            // Export as HIGH QUALITY image (2x pixel ratio)
            const dataUrl = stage.toDataURL({ pixelRatio: 2 });
            setCertPreview(dataUrl);

            // Cleanup
            stage.destroy();
            document.body.removeChild(tempContainer);

            toast.success('Certificate preview generated!');
        } catch (error) {
            console.error('Certificate preview error:', error);
            toast.error(error.response?.data?.message || 'Failed to generate certificate preview');
        } finally {
            setGeneratingCert(false);
        }
    };

    const handleSend = async () => {
        if (!campaignName.trim()) {
            toast.error('Please enter a campaign name');
            return;
        }

        if (!smtpConfigured) {
            toast.error('Please configure SMTP settings first');
            navigate('/settings');
            return;
        }

        // Validate data
        if (!data.recipients || data.recipients.length === 0) {
            toast.error('No recipients found');
            return;
        }

        if (!data.emailTemplate || !data.emailTemplate.subject || !data.emailTemplate.body) {
            toast.error('Email template is incomplete');
            return;
        }

        console.log('Sending campaign with data:', {
            name: campaignName,
            recipientCount: data.recipients.length,
            emailField: data.emailField,
            hasEmailTemplate: !!data.emailTemplate,
            hasCertificate: !!data.certificateTemplate,
        });

        setSending(true);

        try {
            // Create campaign
            const campaignResponse = await api.post('/campaign/create', {
                name: campaignName,
                recipients: data.recipients,
                emailTemplate: data.emailTemplate,
                certificateTemplate: data.certificateTemplate,
                emailField: data.emailField || 'email',
            });

            console.log('Campaign created:', campaignResponse.data);

            if (!campaignResponse.data.success) {
                throw new Error(campaignResponse.data.message || 'Failed to create campaign');
            }

            const campaignId = campaignResponse.data.campaign.id;
            toast.success('Campaign created successfully!');

            // Start sending emails
            console.log('Starting email send for campaign:', campaignId);
            const sendResponse = await api.post(`/email/send-bulk/${campaignId}`);
            console.log('Send response:', sendResponse.data);

            if (sendResponse.data.success) {
                toast.success('🚀 Email sending started!');
                // Redirect immediately to see live progress
                setTimeout(() => {
                    navigate(`/campaign/${campaignId}`);
                }, 500);
            } else {
                throw new Error(sendResponse.data.message || 'Failed to start sending');
            }
        } catch (error) {
            console.error('Send error:', error);
            const errorMsg = error.response?.data?.message || error.message || 'Failed to send campaign';
            toast.error(errorMsg);
            setSending(false);
        }
    };

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Review & Send Campaign</h2>
                <p className="text-gray-400">Review your campaign details before sending</p>
            </div>

            {/* Campaign Name */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    Campaign Name <span className="text-github-red">*</span>
                </label>
                <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="input-field"
                    placeholder="e.g., MLSA Workshop Certificates - January 2026"
                />
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-github-hover border border-github-border rounded-lg p-6"
                >
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-github-blue/20 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-github-blue" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{data.recipients?.length || 0}</p>
                            <p className="text-sm text-gray-400">Recipients</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {data.recipients?.filter(r => {
                            const emailField = data.emailField || 'email';
                            return r[emailField] && r[emailField].includes('@');
                        }).length || 0} valid recipients
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-github-hover border border-github-border rounded-lg p-6"
                >
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-github-green/20 rounded-lg flex items-center justify-center">
                            <Mail className="w-5 h-5 text-github-green" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                <CheckCircle className="w-6 h-6 inline" />
                            </p>
                            <p className="text-sm text-gray-400">Email Template</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                        {data.emailTemplate?.subject || 'No subject'}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-github-hover border border-github-border rounded-lg p-6"
                >
                    <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-github-purple/20 rounded-lg flex items-center justify-center">
                            <Award className="w-5 h-5 text-github-purple" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {data.certificateTemplate ? (
                                    <CheckCircle className="w-6 h-6 inline text-github-green" />
                                ) : (
                                    '—'
                                )}
                            </p>
                            <p className="text-sm text-gray-400">Certificates</p>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500">
                        {data.certificateTemplate ? 'Enabled' : 'Not included'}
                    </p>
                </motion.div>
            </div>

            {/* Email Preview */}
            <div className="mb-8 p-6 bg-github-hover border border-github-border rounded-lg">
                <h3 className="font-bold text-white mb-4">Email Preview</h3>
                <div className="bg-github-dark p-4 rounded border border-github-border">
                    <p className="text-sm text-gray-400 mb-2">
                        <strong>Subject:</strong> {data.emailTemplate?.subject || 'No subject'}
                    </p>
                    <div className="mt-4">
                        {/* Using iframe for style isolation */}
                        <iframe
                            title="Email Preview"
                            srcDoc={data.emailTemplate?.body || '<p style="color: #666;">No content</p>'}
                            className="w-full bg-white rounded"
                            style={{ height: '160px', border: 'none' }}
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>
            </div>

            {/* Certificate Preview Section - Only shown if certificate is enabled */}
            {data.certificateTemplate && (
                <div className="mb-8 p-6 bg-github-hover border border-github-border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white flex items-center space-x-2">
                            <Award className="w-5 h-5 text-github-purple" />
                            <span>Certificate Preview</span>
                        </h3>
                        <button
                            onClick={handleGenerateCertPreview}
                            disabled={generatingCert}
                            className="btn-secondary flex items-center space-x-2"
                        >
                            {generatingCert ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span>Generating...</span>
                                </>
                            ) : (
                                <>
                                    <Eye className="w-4 h-4" />
                                    <span>Generate Preview</span>
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 mb-4">
                        Preview how the certificate will look using data from the first recipient.
                    </p>
                    {certPreview ? (
                        <div className="bg-gray-800 p-4 rounded border border-github-border flex items-center justify-center">
                            <img
                                src={certPreview}
                                alt="Certificate Preview"
                                className="max-w-full h-auto shadow-lg rounded"
                                style={{
                                    maxHeight: (data.certificateTemplate?.width || 800) > (data.certificateTemplate?.height || 600)
                                        ? '55vh'
                                        : '75vh',
                                }}
                            />
                        </div>
                    ) : (
                        <div className="bg-github-dark p-8 rounded border border-github-border text-center text-gray-500">
                            Click "Generate Preview" to see how your certificate will look
                        </div>
                    )}
                </div>
            )}

            {/* Test Email Section */}
            <div className="mb-8 p-6 bg-github-hover border border-github-border rounded-lg">
                <h3 className="font-bold text-white mb-4 flex items-center space-x-2">
                    <TestTube className="w-5 h-5 text-github-blue" />
                    <span>Test Your Configuration</span>
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                    Send a test email to verify your SMTP settings before sending to all recipients.
                    Using email field: <strong className="text-white">{data.emailField || 'email'}</strong>
                </p>
                <div className="flex items-center space-x-3">
                    <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="input-field flex-1"
                        placeholder="Enter your email for test"
                    />
                    <button
                        onClick={handleTestEmail}
                        disabled={sendingTest || !smtpConfigured}
                        className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                    >
                        {sendingTest ? (
                            <>
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <Mail className="w-4 h-4" />
                                <span>Send Test</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            <div className="mb-8 p-4 bg-github-orange/10 border border-github-orange/30 rounded-lg flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-github-orange mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                    <p className="text-github-orange font-medium">Before you send:</p>
                    <ul className="text-sm text-gray-400 mt-2 space-y-1 list-disc list-inside">
                        <li>Make sure your SMTP settings are configured in Settings</li>
                        <li>Double-check recipient emails are correct</li>
                        <li>Review your email content for variables and formatting</li>
                        <li>Sending will start immediately and cannot be cancelled</li>
                    </ul>

                    {/* SMTP Status */}
                    <div className="mt-3 pt-3 border-t border-github-orange/20">
                        {checkingSMTP ? (
                            <p className="text-sm text-gray-400">Checking SMTP configuration...</p>
                        ) : smtpConfigured ? (
                            <p className="text-sm text-github-green flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>SMTP is configured and ready</span>
                            </p>
                        ) : (
                            <p className="text-sm text-github-red flex items-center space-x-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>⚠️ SMTP not configured - <a href="/settings" className="underline">Configure now</a></span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                {canGoBack && (
                    <button onClick={onBack} className="btn-secondary" disabled={sending}>
                        ← Back
                    </button>
                )}
                <button
                    onClick={handleSend}
                    disabled={sending || !campaignName.trim()}
                    className="btn-primary ml-auto flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {sending ? (
                        <>
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Sending...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-5 h-5" />
                            <span>Send Campaign</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Code, Eye, Sparkles, Mail } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';

export default function EmailEditor({ data, onNext, onBack, canGoBack }) {
    const [subject, setSubject] = useState(data.emailTemplate?.subject || '');
    const [body, setBody] = useState(data.emailTemplate?.body || '');
    const [mode, setMode] = useState('rich'); // 'rich', 'html', or 'preview'
    const [showVariables, setShowVariables] = useState(false);

    // Get available variables from the field selector
    const variables = useMemo(() => {
        if (data.availableVariables && data.availableVariables.length > 0) {
            return data.availableVariables;
        }
        // Fallback to default variables
        return [
            { key: '{{name}}', label: 'Recipient Name', sample: 'John Doe' },
            { key: '{{email}}', label: 'Recipient Email', sample: 'john@example.com' },
        ];
    }, [data.availableVariables]);

    const insertVariable = (variable) => {
        const varKey = variable.key;
        if (mode === 'rich') {
            // Insert at cursor position in Quill
            setBody(prevBody => prevBody + ' ' + varKey + ' ');
        } else {
            setBody(prevBody => prevBody + varKey);
        }
        toast.success(`Inserted ${varKey}`);
    };

    const quillModules = useMemo(() => ({
        toolbar: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
            [{ color: [] }, { background: [] }],
            [{ align: [] }],
            ['link', 'image'],
            ['clean'],
        ],
    }), []);

    const quillFormats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'bullet', 'indent',
        'link', 'image',
        'color', 'background',
        'align'
    ];

    const handleNext = () => {
        if (!subject.trim()) {
            toast.error('Subject is required');
            return;
        }
        if (!body.trim() || body === '<p><br></p>') {
            toast.error('Email body is required');
            return;
        }
        onNext({
            emailTemplate: {
                subject,
                body,
            },
        });
    };

    // Generate preview with variable replacement
    const getPreviewContent = () => {
        const sampleRecipient = data.recipients?.[0] || {};
        let previewSubject = subject;
        let previewBody = body;

        // Replace all variables with sample data
        variables.forEach(variable => {
            const varName = variable.key.replace(/{{|}}/g, '');
            const value = sampleRecipient[varName] || variable.sample || varName;
            const regex = new RegExp(variable.key.replace(/[{}]/g, '\\$&'), 'g');
            previewSubject = previewSubject.replace(regex, value);
            previewBody = previewBody.replace(regex, value);
        });

        return { previewSubject, previewBody, sampleRecipient };
    };

    const { previewSubject, previewBody, sampleRecipient } = getPreviewContent();

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Email Template</h2>
                <p className="text-gray-400">Create your email template with dynamic variables</p>
            </div>

            {/* Variables Helper */}
            <div className="mb-6 p-4 bg-github-hover border border-github-border rounded-lg">
                <button
                    onClick={() => setShowVariables(!showVariables)}
                    className="flex items-center space-x-2 text-github-blue hover:text-blue-400 font-medium"
                >
                    <Sparkles className="w-5 h-5" />
                    <span>Dynamic Variables ({variables.length})</span>
                </button>
                {showVariables && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"
                    >
                        {variables.map((variable) => (
                            <button
                                key={variable.key}
                                onClick={() => insertVariable(variable)}
                                className="px-3 py-2 bg-github-dark border border-github-border rounded text-sm text-gray-300 hover:bg-github-hover hover:border-github-blue transition-all text-left"
                            >
                                <code className="text-github-blue block mb-1">{variable.key}</code>
                                <p className="text-xs text-gray-500 truncate">{variable.label}</p>
                                {variable.sample && (
                                    <p className="text-xs text-gray-600 truncate mt-1">e.g., {variable.sample}</p>
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Subject Input */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line</label>
                <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="input-field"
                    placeholder="e.g., Hello {{name}}, your certificate is ready!"
                />
            </div>

            {/* Editor Mode Toggle */}
            <div className="flex items-center space-x-2 mb-4">
                <button
                    onClick={() => setMode('rich')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'rich'
                        ? 'bg-github-blue text-white'
                        : 'bg-github-hover text-gray-400 hover:text-white'
                        }`}
                >
                    <Eye className="w-4 h-4 inline mr-2" />
                    Rich Text
                </button>
                <button
                    onClick={() => setMode('html')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'html'
                        ? 'bg-github-blue text-white'
                        : 'bg-github-hover text-gray-400 hover:text-white'
                        }`}
                >
                    <Code className="w-4 h-4 inline mr-2" />
                    HTML
                </button>
                <button
                    onClick={() => setMode('preview')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${mode === 'preview'
                        ? 'bg-github-blue text-white'
                        : 'bg-github-hover text-gray-400 hover:text-white'
                        }`}
                >
                    <Mail className="w-4 h-4 inline mr-2" />
                    Preview
                </button>
            </div>

            {/* Email Body Editor */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                    {mode === 'preview' ? 'Email Preview' : 'Email Body'}
                </label>

                {mode === 'rich' && (
                    <div className="bg-white rounded-lg overflow-hidden email-editor">
                        <ReactQuill
                            theme="snow"
                            value={body}
                            onChange={setBody}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Write your email message here... Use variables like {{name}}"
                            className="min-h-[300px]"
                        />
                    </div>
                )}

                {mode === 'html' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* HTML Code Editor */}
                        <div>
                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                                <Code className="w-3 h-3 mr-1" />
                                HTML Code
                            </div>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="input-field font-mono text-sm w-full"
                                rows="15"
                                placeholder="<html>&#10;<body>&#10;  <h1>Hello {{name}}!</h1>&#10;  <p>Your email content here...</p>&#10;</body>&#10;</html>"
                            />
                        </div>
                        {/* Live HTML Preview - Using iframe for style isolation */}
                        <div>
                            <div className="text-xs text-gray-500 mb-2 flex items-center">
                                <Eye className="w-3 h-3 mr-1" />
                                Live Preview (Isolated)
                            </div>
                            <iframe
                                title="Email Preview"
                                srcDoc={body || '<p style="color: #999; font-family: sans-serif;">Start typing HTML to see live preview...</p>'}
                                className="w-full bg-white rounded-lg border border-github-border"
                                style={{ minHeight: '360px', height: '360px' }}
                                sandbox="allow-same-origin"
                            />
                        </div>
                    </div>
                )}

                {mode === 'preview' && (
                    <div className="bg-white rounded-lg p-6 border border-github-border">
                        {/* Email Header */}
                        <div className="border-b border-gray-200 pb-4 mb-4">
                            <div className="text-sm text-gray-600 mb-2">
                                <strong>From:</strong> Your Email
                            </div>
                            <div className="text-sm text-gray-600 mb-2">
                                <strong>To:</strong> {sampleRecipient.email || variables.find(v => v.key === '{{email}}')?.sample || 'recipient@example.com'}
                            </div>
                            <div className="text-lg font-semibold text-gray-900">
                                {previewSubject || '(No subject)'}
                            </div>
                        </div>

                        {/* Email Body - Using iframe for style isolation */}
                        <iframe
                            title="Email Body Preview"
                            srcDoc={previewBody || '<p style="color: #999; font-family: sans-serif;">(Empty email body)</p>'}
                            className="w-full border-0"
                            style={{ minHeight: '300px', height: '300px' }}
                            sandbox="allow-same-origin"
                        />
                    </div>
                )}
            </div>

            {/* Quick Preview Card (shown in edit modes) */}
            {mode !== 'preview' && (
                <div className="mb-6 p-4 bg-github-hover border border-github-border rounded-lg">
                    <h3 className="font-bold text-white mb-3 flex items-center">
                        <Eye className="w-5 h-5 mr-2 text-github-blue" />
                        Quick Preview
                    </h3>
                    <div className="bg-github-dark p-4 rounded border border-github-border">
                        <p className="text-sm text-gray-400 mb-2">
                            <strong>Subject:</strong> {previewSubject || '(No subject)'}
                        </p>
                        <div className="border-t border-github-border pt-3 mt-3">
                            {/* Using iframe for style isolation */}
                            <iframe
                                title="Quick Preview"
                                srcDoc={previewBody || '<p style="color: #666;">(Empty body)</p>'}
                                className="w-full bg-white rounded"
                                style={{ height: '200px', border: 'none' }}
                                sandbox="allow-same-origin"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Preview shows first recipient: {sampleRecipient.email || 'No recipients yet'}
                    </p>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
                {canGoBack && (
                    <button onClick={onBack} className="btn-secondary">
                        ← Back
                    </button>
                )}
                <button onClick={handleNext} className="btn-primary ml-auto">
                    Next: Certificate (Optional) →
                </button>
            </div>
        </div>
    );
}

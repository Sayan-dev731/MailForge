import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Plus, Trash2, Edit2, AlertCircle, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FieldSelector({ data, onNext, onBack, canGoBack }) {
    const [selectedFields, setSelectedFields] = useState({});
    const [fieldVariables, setFieldVariables] = useState({});
    const [emailField, setEmailField] = useState(null);
    const [editingVariable, setEditingVariable] = useState(null);
    const [customVariableName, setCustomVariableName] = useState('');

    const { headers = [], columnSamples = {}, rows = [] } = data.uploadedData || {};

    useEffect(() => {
        // Auto-detect email field
        const emailPattern = /email|e-?mail|mail/i;
        const detectedEmail = headers.find(h => emailPattern.test(h));
        if (detectedEmail) {
            setEmailField(detectedEmail);
            setSelectedFields({ [detectedEmail]: true });
            setFieldVariables({ [detectedEmail]: 'email' });
        }
    }, [headers]);

    const handleFieldToggle = (field) => {
        const newSelected = { ...selectedFields };
        if (newSelected[field]) {
            delete newSelected[field];
            // Remove variable mapping
            const newVariables = { ...fieldVariables };
            delete newVariables[field];
            setFieldVariables(newVariables);
            if (emailField === field) {
                setEmailField(null);
            }
        } else {
            newSelected[field] = true;
            // Auto-generate variable name
            const varName = field.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            setFieldVariables({ ...fieldVariables, [field]: varName });
        }
        setSelectedFields(newSelected);
    };

    const handleSetEmailField = (field) => {
        if (emailField === field) {
            setEmailField(null);
        } else {
            setEmailField(field);
            // Make sure it's selected
            setSelectedFields({ ...selectedFields, [field]: true });
            if (!fieldVariables[field]) {
                setFieldVariables({ ...fieldVariables, [field]: 'email' });
            }
        }
    };

    const handleVariableEdit = (field) => {
        setEditingVariable(field);
        setCustomVariableName(fieldVariables[field] || '');
    };

    const handleVariableSave = () => {
        if (!customVariableName.trim()) {
            toast.error('Variable name cannot be empty');
            return;
        }

        // Validate variable name
        const validName = /^[a-z][a-z0-9_]*$/i.test(customVariableName);
        if (!validName) {
            toast.error('Variable name must start with a letter and contain only letters, numbers, and underscores');
            return;
        }

        // Check for duplicates
        const isDuplicate = Object.entries(fieldVariables).some(
            ([field, varName]) => field !== editingVariable && varName === customVariableName
        );
        if (isDuplicate) {
            toast.error('This variable name is already in use');
            return;
        }

        setFieldVariables({ ...fieldVariables, [editingVariable]: customVariableName });
        setEditingVariable(null);
        setCustomVariableName('');
        toast.success('Variable name updated');
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleNext = () => {
        if (Object.keys(selectedFields).length === 0) {
            toast.error('Please select at least one field');
            return;
        }

        if (!emailField) {
            toast.error('Please select an email field');
            return;
        }

        // Validate email field has valid emails
        const emailColumn = rows.map(row => row[emailField]);
        const validEmails = emailColumn.filter(email => validateEmail(email));
        if (validEmails.length === 0) {
            toast.error('The selected email field does not contain valid email addresses');
            return;
        }

        // Build recipients with selected fields only (using variable names)
        const recipients = rows.map(row => {
            const recipient = {};
            Object.keys(selectedFields).forEach(field => {
                const varName = fieldVariables[field];
                recipient[varName] = row[field];
            });
            return recipient;
        }).filter(r => r[fieldVariables[emailField]] && validateEmail(r[fieldVariables[emailField]]));

        // Build available variables for email template
        const availableVariables = Object.entries(fieldVariables).map(([field, varName]) => ({
            key: `{{${varName}}}`,
            label: field,
            sample: columnSamples[field]?.[0] || ''
        }));

        onNext({
            selectedFields: Object.keys(selectedFields),
            fieldVariables,
            emailField: fieldVariables[emailField], // Pass the variable name of email field
            recipients,
            availableVariables,
        });
    };

    const getFieldPreview = (field) => {
        const samples = columnSamples[field] || [];
        return samples.slice(0, 3).join(', ') || 'No data';
    };

    const isEmailLikeField = (field) => {
        const samples = columnSamples[field] || [];
        return samples.some(sample => validateEmail(sample));
    };

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Select Fields & Create Variables</h2>
                <p className="text-gray-400">Choose which fields to keep and create dynamic variables for your email template</p>
            </div>

            {/* Summary */}
            <div className="mb-6 p-4 bg-github-hover border border-github-border rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-github-blue">{headers.length}</p>
                        <p className="text-sm text-gray-400">Total Fields</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-github-green">{Object.keys(selectedFields).length}</p>
                        <p className="text-sm text-gray-400">Selected Fields</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white">{rows.length}</p>
                        <p className="text-sm text-gray-400">Total Rows</p>
                    </div>
                </div>
            </div>

            {/* Email Field Selection Warning */}
            {!emailField && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start space-x-3"
                >
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                    <div>
                        <p className="text-yellow-500 font-medium">Email field required</p>
                        <p className="text-yellow-500/80 text-sm">Click the email icon next to a field to mark it as the email field</p>
                    </div>
                </motion.div>
            )}

            {/* Fields List */}
            <div className="space-y-3 mb-6 max-h-[500px] overflow-y-auto">
                {headers.map((field, index) => {
                    const isSelected = selectedFields[field];
                    const isEmail = emailField === field;
                    const isEmailLike = isEmailLikeField(field);
                    const variableName = fieldVariables[field];
                    const isEditing = editingVariable === field;

                    return (
                        <motion.div
                            key={field}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`p-4 border rounded-lg transition-all ${isSelected
                                ? 'bg-github-blue/10 border-github-blue'
                                : 'bg-github-hover border-github-border hover:border-github-blue/50'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                    {/* Checkbox */}
                                    <button
                                        onClick={() => handleFieldToggle(field)}
                                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all mt-1 ${isSelected
                                            ? 'bg-github-blue border-github-blue'
                                            : 'border-github-border hover:border-github-blue'
                                            }`}
                                    >
                                        {isSelected && <Check className="w-4 h-4 text-white" />}
                                    </button>

                                    {/* Field Info */}
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h3 className="text-white font-medium">{field}</h3>
                                            {isEmailLike && (
                                                <span className="px-2 py-0.5 bg-github-blue/20 text-github-blue text-xs rounded">
                                                    Email-like
                                                </span>
                                            )}
                                            {isEmail && (
                                                <span className="px-2 py-0.5 bg-github-green/20 text-github-green text-xs rounded flex items-center space-x-1">
                                                    <Mail className="w-3 h-3" />
                                                    <span>Email Field</span>
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 mb-2">
                                            Preview: {getFieldPreview(field)}
                                        </p>

                                        {/* Variable Name */}
                                        {isSelected && (
                                            <div className="flex items-center space-x-2">
                                                {isEditing ? (
                                                    <>
                                                        <input
                                                            type="text"
                                                            value={customVariableName}
                                                            onChange={(e) => setCustomVariableName(e.target.value)}
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') handleVariableSave();
                                                            }}
                                                            className="input-field text-sm py-1 px-2"
                                                            placeholder="variable_name"
                                                            autoFocus
                                                        />
                                                        <button
                                                            onClick={handleVariableSave}
                                                            className="p-1 bg-github-green text-white rounded hover:bg-green-600"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingVariable(null);
                                                                setCustomVariableName('');
                                                            }}
                                                            className="p-1 bg-github-hover text-gray-400 rounded hover:text-white"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <code className="px-2 py-1 bg-github-dark text-github-blue text-sm rounded">
                                                            {`{{${variableName}}}`}
                                                        </code>
                                                        <button
                                                            onClick={() => handleVariableEdit(field)}
                                                            className="p-1 text-gray-400 hover:text-white transition-colors"
                                                            title="Edit variable name"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Email Field Selector */}
                                {isSelected && (
                                    <button
                                        onClick={() => handleSetEmailField(field)}
                                        className={`p-2 rounded-lg transition-all ${isEmail
                                            ? 'bg-github-green text-white'
                                            : 'bg-github-hover text-gray-400 hover:text-white hover:bg-github-blue/20'
                                            }`}
                                        title={isEmail ? 'Email field' : 'Set as email field'}
                                    >
                                        <Mail className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Variable Preview */}
            {Object.keys(selectedFields).length > 0 && (
                <div className="mb-6 p-4 bg-github-hover border border-github-border rounded-lg">
                    <h3 className="text-white font-medium mb-3">Available Variables for Email Template</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(fieldVariables).map(([field, varName]) => (
                            <div key={field} className="px-3 py-2 bg-github-dark border border-github-border rounded">
                                <code className="text-github-blue text-sm">{`{{${varName}}}`}</code>
                                <p className="text-xs text-gray-500 mt-1">{field}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between">
                {canGoBack && (
                    <button onClick={onBack} className="btn-secondary">
                        ← Back
                    </button>
                )}
                <button
                    onClick={handleNext}
                    disabled={Object.keys(selectedFields).length === 0 || !emailField}
                    className="btn-primary ml-auto"
                >
                    Continue to Recipients →
                </button>
            </div>
        </div>
    );
}

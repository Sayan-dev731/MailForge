import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecipientTable({ data, onNext, onBack, canGoBack }) {
    const [recipients, setRecipients] = useState(data.recipients || []);
    const [selectedRows, setSelectedRows] = useState([]);
    const [errors, setErrors] = useState({});

    // Get all field names from the first recipient (all recipients have same fields)
    const fieldNames = recipients.length > 0 ? Object.keys(recipients[0]) : [];
    // Find which field is marked as email
    const emailField = data.emailField || 'email';

    useEffect(() => {
        validateAllRecipients();
    }, [recipients]);

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const validateAllRecipients = () => {
        const newErrors = {};
        recipients.forEach((recipient, index) => {
            // Check if email field exists and is valid
            if (!recipient[emailField] || !validateEmail(recipient[emailField])) {
                newErrors[index] = { ...newErrors[index], [emailField]: 'Invalid email' };
            }
            // Check all other fields are not empty
            fieldNames.forEach(field => {
                if (field !== emailField && (!recipient[field] || !String(recipient[field]).trim())) {
                    newErrors[index] = { ...newErrors[index], [field]: 'Required' };
                }
            });
        });
        setErrors(newErrors);
    };

    const handleAddRecipient = () => {
        const newRecipient = {};
        fieldNames.forEach(field => {
            newRecipient[field] = '';
        });
        setRecipients([...recipients, newRecipient]);
    };

    const handleRemoveRecipient = (index) => {
        setRecipients(recipients.filter((_, i) => i !== index));
        setSelectedRows(selectedRows.filter(i => i !== index));
    };

    const handleUpdateRecipient = (index, field, value) => {
        const updated = [...recipients];
        updated[index] = { ...updated[index], [field]: value };
        setRecipients(updated);
    };

    const handleRemoveSelected = () => {
        setRecipients(recipients.filter((_, index) => !selectedRows.includes(index)));
        setSelectedRows([]);
        toast.success(`Removed ${selectedRows.length} recipients`);
    };

    const handleDeduplicateEmails = () => {
        const seen = new Set();
        const unique = recipients.filter(recipient => {
            const duplicate = seen.has(recipient[emailField]);
            seen.add(recipient[emailField]);
            return !duplicate;
        });
        const removed = recipients.length - unique.length;
        setRecipients(unique);
        if (removed > 0) {
            toast.success(`Removed ${removed} duplicate emails`);
        } else {
            toast.info('No duplicate emails found');
        }
    };

    const handleNext = () => {
        if (recipients.length === 0) {
            toast.error('Add at least one recipient');
            return;
        }
        if (Object.keys(errors).length > 0) {
            toast.error('Fix all errors before continuing');
            return;
        }
        onNext({ recipients });
    };

    const toggleSelectRow = (index) => {
        if (selectedRows.includes(index)) {
            setSelectedRows(selectedRows.filter(i => i !== index));
        } else {
            setSelectedRows([...selectedRows, index]);
        }
    };

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Edit Recipients</h2>
                <p className="text-gray-400">Review and edit the recipient list. Add, remove, or modify entries.</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleAddRecipient}
                        className="btn-primary flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Recipient</span>
                    </button>
                    <button
                        onClick={handleDeduplicateEmails}
                        className="btn-secondary"
                    >
                        Remove Duplicates
                    </button>
                </div>
                {selectedRows.length > 0 && (
                    <button
                        onClick={handleRemoveSelected}
                        className="btn-secondary text-github-red hover:bg-github-red/10 flex items-center space-x-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove {selectedRows.length} Selected</span>
                    </button>
                )}
            </div>

            {/* Recipients Table */}
            <div className="overflow-x-auto border border-github-border rounded-lg mb-6">
                <table className="w-full">
                    <thead className="bg-github-hover">
                        <tr>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedRows.length === recipients.length && recipients.length > 0}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedRows(recipients.map((_, i) => i));
                                        } else {
                                            setSelectedRows([]);
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-github-border"
                                />
                            </th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">#</th>
                            {fieldNames.map(field => (
                                <th key={field} className="text-left py-3 px-4 text-gray-400 font-medium">
                                    {field.charAt(0).toUpperCase() + field.slice(1)}
                                    {field === emailField && <span className="text-github-blue ml-1">*</span>}
                                </th>
                            ))}
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                            <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recipients.map((recipient, index) => {
                            const hasError = errors[index];
                            return (
                                <motion.tr
                                    key={index}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`table-row ${hasError ? 'bg-github-red/5' : ''}`}
                                >
                                    <td className="py-3 px-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.includes(index)}
                                            onChange={() => toggleSelectRow(index)}
                                            className="w-4 h-4 rounded border-github-border"
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-gray-400">{index + 1}</td>
                                    {fieldNames.map(field => (
                                        <td key={field} className="py-3 px-4">
                                            <input
                                                type={field === emailField ? 'email' : 'text'}
                                                value={recipient[field] || ''}
                                                onChange={(e) => handleUpdateRecipient(index, field, e.target.value)}
                                                className={`bg-github-hover border ${errors[index]?.[field] ? 'border-github-red' : 'border-github-border'
                                                    } text-gray-100 px-3 py-1.5 rounded w-full focus:outline-none focus:ring-1 focus:ring-github-blue`}
                                                placeholder={`Enter ${field}`}
                                            />
                                        </td>
                                    ))}
                                    <td className="py-3 px-4">
                                        {hasError ? (
                                            <span className="flex items-center text-github-red text-sm">
                                                <X className="w-4 h-4 mr-1" />
                                                Invalid
                                            </span>
                                        ) : (
                                            <span className="flex items-center text-github-green text-sm">
                                                <Check className="w-4 h-4 mr-1" />
                                                Valid
                                            </span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => handleRemoveRecipient(index)}
                                            className="text-github-red hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </motion.tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {Object.keys(errors).length > 0 && (
                <div className="mb-6 p-4 bg-github-red/10 border border-github-red/30 rounded-lg flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-github-red mt-0.5" />
                    <div>
                        <p className="text-github-red font-medium">Please fix the errors before continuing</p>
                        <p className="text-gray-400 text-sm mt-1">
                            {Object.keys(errors).length} recipient(s) have validation errors
                        </p>
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
                    className="btn-primary ml-auto"
                    disabled={recipients.length === 0 || Object.keys(errors).length > 0}
                >
                    Next: Email Template →
                </button>
            </div>
        </div>
    );
}

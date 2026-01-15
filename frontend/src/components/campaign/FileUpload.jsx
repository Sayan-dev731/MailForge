import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function FileUpload({ data, onNext }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [uploadedData, setUploadedData] = useState(null);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = async (selectedFile) => {
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'text/csv',
        ];

        if (!validTypes.includes(selectedFile.type)) {
            toast.error('Invalid file type. Please upload Excel or CSV file.');
            return;
        }

        setFile(selectedFile);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            const response = await api.post('/upload/parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                setUploadedData(response.data.data);
                toast.success('File parsed successfully!');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to parse file');
            setFile(null);
        } finally {
            setUploading(false);
        }
    };

    const handleContinue = () => {
        onNext({ uploadedData });
    };

    return (
        <div className="card">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Upload Recipient List</h2>
                <p className="text-gray-400">Upload an Excel or CSV file with recipient information</p>
            </div>

            <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${dragActive
                    ? 'border-github-blue bg-github-blue/10'
                    : 'border-github-border hover:border-github-blue/50'
                    }`}
            >
                {!file ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-github-hover rounded-full flex items-center justify-center">
                                <Upload className="w-10 h-10 text-github-blue" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Drop your file here</h3>
                            <p className="text-gray-400 mb-4">or click to browse</p>
                            <input
                                type="file"
                                id="file-upload"
                                className="hidden"
                                accept=".xlsx,.xls,.csv"
                                onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                            />
                            <label htmlFor="file-upload">
                                <motion.span
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="btn-primary inline-block cursor-pointer"
                                >
                                    Select File
                                </motion.span>
                            </label>
                        </div>
                        <p className="text-sm text-gray-500">Supported: .xlsx, .xls, .csv (Max 10MB)</p>
                    </motion.div>
                ) : uploading ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <Loader className="w-16 h-16 text-github-blue mx-auto animate-spin" />
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Processing File...</h3>
                            <p className="text-gray-400">Parsing your data...</p>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <div className="flex justify-center">
                            <div className="w-20 h-20 bg-github-green/20 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-github-green" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">File Processed Successfully!</h3>
                            <div className="flex items-center justify-center space-x-2 text-sm text-gray-400 mb-4">
                                <FileSpreadsheet className="w-4 h-4" />
                                <span>{file.name}</span>
                            </div>
                        </div>

                        {uploadedData && (
                            <div className="bg-github-hover border border-github-border rounded-lg p-6 text-left max-w-md mx-auto">
                                <h4 className="font-bold text-white mb-4 flex items-center">
                                    <AlertCircle className="w-5 h-5 mr-2 text-github-blue" />
                                    File Summary
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Total Rows:</span>
                                        <span className="text-white font-medium">{uploadedData.totalRows}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Total Fields:</span>
                                        <span className="text-white font-medium">{uploadedData.headers?.length || 0}</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm mb-2">Fields Detected:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {uploadedData.headers?.slice(0, 5).map(header => (
                                                <span key={header} className="px-2 py-1 bg-github-dark text-github-blue text-xs rounded">
                                                    {header}
                                                </span>
                                            ))}
                                            {uploadedData.headers?.length > 5 && (
                                                <span className="px-2 py-1 bg-github-dark text-gray-400 text-xs rounded">
                                                    +{uploadedData.headers.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-center space-x-3">
                            <button
                                onClick={() => {
                                    setFile(null);
                                    setUploadedData(null);
                                }}
                                className="btn-secondary"
                            >
                                Upload Different File
                            </button>
                            <button
                                onClick={handleContinue}
                                className="btn-primary"
                            >
                                Continue to Field Selection →
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

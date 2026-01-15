import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Upload, Table, Mail, Award, Send, Filter } from 'lucide-react';
import Navbar from '../components/Navbar';
import FileUpload from '../components/campaign/FileUpload';
import FieldSelector from '../components/campaign/FieldSelector';
import RecipientTable from '../components/campaign/RecipientTable';
import EmailEditor from '../components/campaign/EmailEditor';
import CertificateEditor from '../components/campaign/CertificateEditorSimple';
import ReviewSend from '../components/campaign/ReviewSend';
import toast from 'react-hot-toast';

export default function NewCampaign() {
    const navigate = useNavigate();
    const location = useLocation();
    const editCampaign = location.state?.editCampaign;

    const [currentStep, setCurrentStep] = useState(editCampaign ? 3 : 1); // Skip to recipients if editing
    const [campaignData, setCampaignData] = useState({
        name: editCampaign?.name || '',
        uploadedData: editCampaign ? {
            headers: Object.keys(editCampaign.recipients?.[0] || {}),
            rows: editCampaign.recipients || [],
            totalRows: editCampaign.recipients?.length || 0,
            columnSamples: {}
        } : null,
        selectedFields: editCampaign ? Object.keys(editCampaign.recipients?.[0] || {}) : [],
        fieldVariables: editCampaign?.fieldVariables || {},
        emailField: editCampaign?.emailField || 'email',
        recipients: editCampaign?.recipients || [],
        availableVariables: editCampaign?.availableVariables || [],
        emailTemplate: {
            subject: editCampaign?.emailTemplate?.subject || '',
            body: editCampaign?.emailTemplate?.body || '',
        },
        certificateTemplate: editCampaign?.certificateTemplate || null,
    });

    useEffect(() => {
        if (editCampaign) {
            toast.success('Editing campaign: ' + editCampaign.name);
        }
    }, [editCampaign]);

    const steps = [
        { number: 1, title: 'Upload File', icon: Upload, component: FileUpload },
        { number: 2, title: 'Select Fields', icon: Filter, component: FieldSelector },
        { number: 3, title: 'Edit Recipients', icon: Table, component: RecipientTable },
        { number: 4, title: 'Email Template', icon: Mail, component: EmailEditor },
        { number: 5, title: 'Certificate', icon: Award, component: CertificateEditor },
        { number: 6, title: 'Review & Send', icon: Send, component: ReviewSend },
    ];

    const CurrentStepComponent = steps[currentStep - 1].component;

    const handleNext = (data) => {
        setCampaignData({ ...campaignData, ...data });
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        if (currentStep === 5) { // Certificate step
            setCurrentStep(currentStep + 1);
        }
    };

    return (
        <div className="min-h-screen bg-github-darker">
            <Navbar />

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </button>
                    <h1 className="text-3xl font-display font-bold text-white mb-2">
                        {editCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                    </h1>
                    <p className="text-gray-400">
                        {editCampaign
                            ? 'Update your campaign details and resend'
                            : 'Follow the steps to create and send your campaign'}
                    </p>
                </motion.div>

                {/* Progress Steps */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="card mb-8"
                >
                    <div className="flex items-center justify-between overflow-x-auto">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.number;
                            const isCompleted = currentStep > step.number;

                            return (
                                <div key={step.number} className="flex items-center flex-1 min-w-[120px]">
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                                                ? 'bg-github-blue text-white shadow-lg shadow-github-blue/50'
                                                : isCompleted
                                                    ? 'bg-github-green text-white'
                                                    : 'bg-github-hover text-gray-400'
                                                }`}
                                        >
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <p
                                            className={`mt-2 text-sm font-medium text-center ${isActive ? 'text-white' : isCompleted ? 'text-github-green' : 'text-gray-500'
                                                }`}
                                        >
                                            {step.title}
                                        </p>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div
                                            className={`flex-1 h-1 mx-4 transition-all duration-300 ${isCompleted ? 'bg-github-green' : 'bg-github-border'
                                                }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Step Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <CurrentStepComponent
                            data={campaignData}
                            onNext={handleNext}
                            onBack={handleBack}
                            onSkip={handleSkip}
                            canGoBack={currentStep > 1}
                            canSkip={currentStep === 5}
                        />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

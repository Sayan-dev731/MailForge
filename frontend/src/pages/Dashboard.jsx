import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Mail, CheckCircle, XCircle, Clock, TrendingUp, Eye, Edit, Trash2, StopCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Dashboard() {
    const navigate = useNavigate();
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
    });

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await api.get('/campaign/list');
            if (response.data.success) {
                setCampaigns(response.data.campaigns);
                calculateStats(response.data.campaigns);
            }
        } catch (error) {
            toast.error('Failed to fetch campaigns');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (campaigns) => {
        const total = campaigns.reduce((sum, c) => sum + (c.stats?.total || 0), 0);
        const sent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
        const failed = campaigns.reduce((sum, c) => sum + (c.stats?.failed || 0), 0);
        const pending = campaigns.reduce((sum, c) => sum + (c.stats?.pending || 0), 0);
        setStats({ total, sent, failed, pending });
    };

    const handleDelete = async (campaignId, campaignName) => {
        if (!window.confirm(`Are you sure you want to delete "${campaignName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await api.delete(`/campaign/${campaignId}`);
            if (response.data.success) {
                toast.success('Campaign deleted successfully');
                setCampaigns(campaigns.filter(c => c.id !== campaignId));
                calculateStats(campaigns.filter(c => c.id !== campaignId));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete campaign');
        }
    };

    const handleStop = async (campaignId) => {
        if (!window.confirm('Are you sure you want to stop this campaign? Emails already sent cannot be recalled.')) {
            return;
        }

        try {
            const response = await api.post(`/campaign/${campaignId}/stop`);
            if (response.data.success) {
                toast.success('Campaign stopped');
                // Update the campaign status in local state
                setCampaigns(campaigns.map(c =>
                    c.id === campaignId ? { ...c, status: 'stopped' } : c
                ));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to stop campaign');
        }
    };

    const statCards = [
        { label: 'Total Emails', value: stats.total, icon: Mail, color: 'text-github-blue', bg: 'bg-github-blue/10' },
        { label: 'Sent', value: stats.sent, icon: CheckCircle, color: 'text-github-green', bg: 'bg-github-green/10' },
        { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-github-red', bg: 'bg-github-red/10' },
        { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-github-orange', bg: 'bg-github-orange/10' },
    ];

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'text-github-green bg-github-green/10 border-github-green/30';
            case 'sending':
                return 'text-github-orange bg-github-orange/10 border-github-orange/30';
            case 'failed':
                return 'text-github-red bg-github-red/10 border-github-red/30';
            case 'stopped':
                return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
            default:
                return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
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
                    className="flex items-center justify-between mb-8"
                >
                    <div>
                        <h1 className="text-3xl font-display font-bold text-white mb-2">Dashboard</h1>
                        <p className="text-gray-400">Manage your email campaigns and track performance</p>
                    </div>
                    <Link to="/campaign/new">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="btn-primary flex items-center space-x-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span>New Campaign</span>
                        </motion.button>
                    </Link>
                </motion.div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statCards.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="card hover:scale-105 transition-transform duration-300"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                                </div>
                                <div className={`w-12 h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Campaigns List */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="card"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Recent Campaigns</h2>
                        <TrendingUp className="w-5 h-5 text-github-blue" />
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue mx-auto"></div>
                            <p className="text-gray-400 mt-4">Loading campaigns...</p>
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="text-center py-12">
                            <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400 text-lg mb-2">No campaigns yet</p>
                            <p className="text-gray-500 text-sm mb-6">Create your first campaign to get started</p>
                            <Link to="/campaign/new">
                                <button className="btn-primary">Create Campaign</button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-github-border">
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Campaign Name</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Total</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Sent</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Failed</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Created</th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaigns.map((campaign) => (
                                        <tr key={campaign.id} className="table-row">
                                            <td className="py-4 px-4">
                                                <p className="text-white font-medium">{campaign.name}</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(campaign.status)}`}>
                                                    {campaign.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-gray-300">{campaign.stats?.total || 0}</td>
                                            <td className="py-4 px-4 text-github-green">{campaign.stats?.sent || 0}</td>
                                            <td className="py-4 px-4 text-github-red">{campaign.stats?.failed || 0}</td>
                                            <td className="py-4 px-4 text-gray-400">
                                                {new Date(campaign.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center space-x-3">
                                                    <Link to={`/campaign/${campaign.id}`}>
                                                        <button className="text-github-blue hover:text-blue-400 text-sm font-medium flex items-center space-x-1">
                                                            <Eye className="w-4 h-4" />
                                                            <span>View</span>
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => navigate('/campaign/new', { state: { editCampaign: campaign } })}
                                                        className="text-github-green hover:text-green-400 text-sm font-medium flex items-center space-x-1"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                        <span>Edit</span>
                                                    </button>
                                                    {campaign.status === 'sending' && (
                                                        <button
                                                            onClick={() => handleStop(campaign.id)}
                                                            className="text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center space-x-1"
                                                        >
                                                            <StopCircle className="w-4 h-4" />
                                                            <span>Stop</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(campaign.id, campaign.name)}
                                                        className="text-github-red hover:text-red-400 text-sm font-medium flex items-center space-x-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

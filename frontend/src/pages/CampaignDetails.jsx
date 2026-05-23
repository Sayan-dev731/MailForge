import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    Mail,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    RefreshCw,
    Users,
    Send,
    Edit,
    RotateCcw,
    Trash2,
    StopCircle,
    Terminal,
    Radio,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../utils/api";
import toast from "react-hot-toast";
import { format } from "date-fns";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Merge a tail of recent results from an SSE 'progress' event into the existing
// results array without duplicating entries already present.
function mergeResults(prev = [], recent = []) {
    if (!recent || recent.length === 0) return prev || [];
    if (!prev || prev.length === 0) return recent.slice();
    const seen = new Set(prev.map((r) => `${r.email}::${r.status}`));
    const additions = recent.filter(
        (r) => !seen.has(`${r.email}::${r.status}`),
    );
    return additions.length ? [...prev, ...additions] : prev;
}

export default function CampaignDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [campaign, setCampaign] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [liveLogs, setLiveLogs] = useState([]);
    const [sseConnected, setSseConnected] = useState(false);
    const intervalRef = useRef(null);
    const pollCountRef = useRef(0);
    const isFetchingRef = useRef(false);
    const esRef = useRef(null);
    const logsEndRef = useRef(null);

    useEffect(() => {
        const loadCampaign = async () => {
            await fetchCampaign();
            // Also check live status immediately (in case campaign is sending)
            fetchStatus();
        };
        loadCampaign();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [id]);

    useEffect(() => {
        // Start polling when campaign is sending — but ONLY as a fallback
        // when the SSE stream isn't connected. SSE delivers updates instantly.
        if (campaign?.status === "sending" && !sseConnected) {
            pollCountRef.current = 0;
            // Fetch immediately first
            fetchStatus();
            // Then poll every 2 seconds for real-time updates (rate limited)
            if (!intervalRef.current) {
                intervalRef.current = setInterval(() => {
                    // Stop polling after 5 minutes (150 polls) to prevent endless requests
                    if (pollCountRef.current >= 150) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                        toast.error(
                            "Polling timeout. Please refresh manually.",
                        );
                        return;
                    }
                    fetchStatus();
                    pollCountRef.current++;
                }, 2000);
            }
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                pollCountRef.current = 0;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [campaign?.status, sseConnected]);

    // Real-time SSE stream: live logs + progress updates with no page refresh.
    useEffect(() => {
        if (!id) return;
        // Only stream while sending; for terminal states, polling/static fetch is enough.
        if (campaign?.status && campaign.status !== "sending") {
            if (esRef.current) {
                esRef.current.close();
                esRef.current = null;
                setSseConnected(false);
            }
            return;
        }

        const token = localStorage.getItem("token");
        if (!token) return;

        const url = `${API_BASE}/email/stream/${id}?token=${encodeURIComponent(token)}`;
        const es = new EventSource(url);
        esRef.current = es;

        const appendLog = (entry) => {
            if (!entry) return;
            setLiveLogs((prev) => {
                const next = [...prev, entry];
                // Keep last 500 entries client-side
                return next.length > 500 ? next.slice(next.length - 500) : next;
            });
        };

        es.addEventListener("snapshot", (e) => {
            try {
                const data = JSON.parse(e.data);
                if (Array.isArray(data.logs)) setLiveLogs(data.logs);
                setCampaign((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: data.status || prev.status,
                              stats: data.stats || prev.stats,
                              results: data.results || prev.results,
                          }
                        : prev,
                );
            } catch {
                /* ignore malformed frame */
            }
        });

        es.addEventListener("log", (e) => {
            try {
                const data = JSON.parse(e.data);
                appendLog(data.entry);
            } catch {
                /* ignore */
            }
        });

        es.addEventListener("progress", (e) => {
            try {
                const data = JSON.parse(e.data);
                setCampaign((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: data.status || prev.status,
                              stats: data.stats || prev.stats,
                              // Merge "recent" results into the tail (avoid duplicates by email+status)
                              results: mergeResults(prev.results, data.recent),
                          }
                        : prev,
                );
            } catch {
                /* ignore */
            }
        });

        es.addEventListener("done", (e) => {
            try {
                const data = JSON.parse(e.data);
                setCampaign((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: data.status || "completed",
                              stats: data.stats || prev.stats,
                          }
                        : prev,
                );
            } catch {
                /* ignore */
            }
            es.close();
            esRef.current = null;
            setSseConnected(false);
            // Refresh full campaign record from DB so results array is complete.
            fetchCampaign();
        });

        es.onopen = () => setSseConnected(true);
        es.onerror = () => {
            // EventSource will auto-reconnect; if it's hard-closed, fall back to polling.
            if (es.readyState === EventSource.CLOSED) {
                setSseConnected(false);
                esRef.current = null;
            }
        };

        return () => {
            es.close();
            esRef.current = null;
            setSseConnected(false);
        };
    }, [id, campaign?.status]);

    // Auto-scroll log panel to bottom on new entries.
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [liveLogs.length]);

    const fetchCampaign = async () => {
        try {
            const response = await api.get(`/campaign/${id}`);
            if (response.data.success) {
                setCampaign(response.data.campaign);
            }
        } catch (error) {
            toast.error("Campaign not found");
            navigate("/");
        } finally {
            setLoading(false);
        }
    };

    const fetchStatus = async () => {
        // Prevent concurrent requests
        if (isFetchingRef.current) return;

        isFetchingRef.current = true;
        try {
            const response = await api.get(`/email/status/${id}`);
            if (response.data.success) {
                setCampaign((prev) => ({
                    ...prev,
                    status: response.data.status,
                    stats: response.data.stats,
                    results: response.data.results,
                }));

                // Stop polling if campaign is completed or failed
                if (
                    response.data.status === "completed" ||
                    response.data.status === "failed"
                ) {
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                }
            }
        } catch (error) {
            console.error("Failed to fetch status:", error);
            // Stop polling on repeated errors
            if (pollCountRef.current > 10) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        } finally {
            isFetchingRef.current = false;
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchStatus();
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleResend = async () => {
        if (
            !window.confirm(
                "Are you sure you want to resend this campaign? This will send emails to ALL recipients again.",
            )
        ) {
            return;
        }

        setIsSending(true);
        try {
            const response = await api.post(`/email/send-bulk/${id}`);
            if (response.data.success) {
                toast.success("🚀 Campaign resending started!");
                setCampaign((prev) => ({ ...prev, status: "sending" }));
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to resend campaign",
            );
        } finally {
            setIsSending(false);
        }
    };

    const handleResendFailed = async () => {
        setIsSending(true);
        try {
            const response = await api.post(`/email/resend-failed/${id}`);
            if (response.data.success) {
                toast.success("🚀 Resending to failed recipients...");
                setCampaign((prev) => ({ ...prev, status: "sending" }));
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to resend");
        } finally {
            setIsSending(false);
        }
    };

    const handleEditCampaign = () => {
        navigate("/campaign/new", { state: { editCampaign: campaign } });
    };

    const handleDelete = async () => {
        if (
            !window.confirm(
                `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`,
            )
        ) {
            return;
        }

        try {
            const response = await api.delete(`/campaign/${id}`);
            if (response.data.success) {
                toast.success("Campaign deleted successfully");
                navigate("/");
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to delete campaign",
            );
        }
    };

    const handleStop = async () => {
        if (
            !window.confirm(
                "Are you sure you want to stop this campaign? Emails already sent cannot be recalled.",
            )
        ) {
            return;
        }

        try {
            const response = await api.post(`/campaign/${id}/stop`);
            if (response.data.success) {
                toast.success("Campaign stopped");
                setCampaign((prev) => ({ ...prev, status: "stopped" }));
                // Stop polling
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Failed to stop campaign",
            );
        }
    };

    const exportResults = () => {
        if (!campaign?.results) return;

        const csv = [
            ["Email", "Status", "Error"].join(","),
            ...campaign.results.map((r) =>
                [r.email, r.status, r.error || ""].join(","),
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `campaign-${campaign.name}-results.csv`;
        a.click();
        toast.success("Results exported!");
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "completed":
                return "text-github-green bg-github-green/10 border-github-green/30";
            case "sending":
                return "text-github-orange bg-github-orange/10 border-github-orange/30";
            case "failed":
                return "text-github-red bg-github-red/10 border-github-red/30";
            case "stopped":
                return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
            default:
                return "text-gray-400 bg-gray-400/10 border-gray-400/30";
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-github-darker">
                <Navbar />
                <div className="max-w-7xl mx-auto px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-github-blue mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading campaign...</p>
                </div>
            </div>
        );
    }

    if (!campaign) {
        return null;
    }

    const stats = campaign.stats || {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
    };
    const successRate =
        stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0;
    const progress =
        stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0;

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
                    <Link
                        to="/"
                        className="flex items-center space-x-2 text-gray-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Dashboard</span>
                    </Link>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-display font-bold text-white mb-2">
                                {campaign.name}
                            </h1>
                            <p className="text-gray-400">
                                Created on{" "}
                                {format(new Date(campaign.createdAt), "PPP")}
                            </p>
                        </div>
                        <div className="flex items-center flex-wrap gap-3">
                            <button
                                onClick={handleRefresh}
                                className="btn-secondary flex items-center space-x-2"
                                disabled={refreshing}
                            >
                                <RefreshCw
                                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                                />
                                <span>Refresh</span>
                            </button>
                            <button
                                onClick={exportResults}
                                className="btn-secondary flex items-center space-x-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Export</span>
                            </button>
                            <button
                                onClick={handleEditCampaign}
                                className="btn-secondary flex items-center space-x-2"
                            >
                                <Edit className="w-4 h-4" />
                                <span>Edit</span>
                            </button>
                            {campaign.status === "completed" &&
                                stats.failed > 0 && (
                                    <button
                                        onClick={handleResendFailed}
                                        disabled={isSending}
                                        className="btn-secondary flex items-center space-x-2 text-github-orange hover:bg-github-orange/10"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        <span>Resend Failed</span>
                                    </button>
                                )}
                            {campaign.status === "sending" && (
                                <button
                                    onClick={handleStop}
                                    className="btn-secondary flex items-center space-x-2 text-yellow-400 hover:bg-yellow-400/10"
                                >
                                    <StopCircle className="w-4 h-4" />
                                    <span>Stop</span>
                                </button>
                            )}
                            {campaign.status !== "sending" && (
                                <button
                                    onClick={handleResend}
                                    disabled={isSending}
                                    className="btn-primary flex items-center space-x-2"
                                >
                                    {isSending ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    <span>
                                        {isSending
                                            ? "Starting..."
                                            : "Resend All"}
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={handleDelete}
                                className="btn-secondary flex items-center space-x-2 text-github-red hover:bg-github-red/10"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Live Sending Progress */}
                {campaign.status === "sending" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card mb-8 border-2 border-github-orange/50"
                    >
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="relative">
                                <div className="w-12 h-12 bg-github-orange/20 rounded-full flex items-center justify-center">
                                    <Mail className="w-6 h-6 text-github-orange" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-github-orange rounded-full animate-ping"></div>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    📤 Sending Emails...
                                </h2>
                                <p className="text-gray-400">
                                    {stats.sent + stats.failed} of {stats.total}{" "}
                                    processed • {stats.pending} remaining
                                </p>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="relative">
                            <div className="w-full h-4 bg-github-hover rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-github-orange to-github-yellow"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </div>
                            <div className="flex justify-between mt-2 text-sm">
                                <span className="text-github-green">
                                    ✓ {stats.sent} sent
                                </span>
                                <span className="text-gray-400">
                                    {Math.round(progress)}% complete
                                </span>
                                <span className="text-github-red">
                                    ✗ {stats.failed} failed
                                </span>
                            </div>
                        </div>

                        {/* Live Updates */}
                        {campaign.results && campaign.results.length > 0 && (
                            <div className="mt-4 max-h-32 overflow-y-auto">
                                <AnimatePresence>
                                    {campaign.results
                                        .slice(-5)
                                        .reverse()
                                        .map((result, idx) => (
                                            <motion.div
                                                key={`${result.email}-${idx}`}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className={`flex items-center space-x-2 text-sm py-1 ${
                                                    result.status === "sent"
                                                        ? "text-github-green"
                                                        : "text-github-red"
                                                }`}
                                            >
                                                {result.status === "sent" ? (
                                                    <CheckCircle className="w-4 h-4" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                                <span>{result.email}</span>
                                                {result.error && (
                                                    <span className="text-gray-500">
                                                        - {result.error}
                                                    </span>
                                                )}
                                            </motion.div>
                                        ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Live Terminal — real-time backend log stream via SSE */}
                        <div className="mt-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2 text-sm font-medium text-gray-300">
                                    <Terminal className="w-4 h-4 text-github-orange" />
                                    <span>Live Console</span>
                                </div>
                                <div className="flex items-center space-x-2 text-xs">
                                    <Radio
                                        className={`w-3 h-3 ${sseConnected ? "text-github-green animate-pulse" : "text-gray-500"}`}
                                    />
                                    <span
                                        className={
                                            sseConnected
                                                ? "text-github-green"
                                                : "text-gray-500"
                                        }
                                    >
                                        {sseConnected
                                            ? "Streaming live"
                                            : "Polling fallback"}
                                    </span>
                                </div>
                            </div>
                            <div className="font-mono text-xs bg-black/80 text-green-300 rounded-lg p-3 max-h-72 overflow-y-auto border border-github-border">
                                {liveLogs.length === 0 ? (
                                    <div className="text-gray-500">
                                        Waiting for log output…
                                    </div>
                                ) : (
                                    liveLogs.map((entry, idx) => {
                                        const color =
                                            entry.level === "error"
                                                ? "text-red-400"
                                                : entry.level === "warn"
                                                  ? "text-yellow-300"
                                                  : entry.level === "success"
                                                    ? "text-green-400"
                                                    : "text-gray-300";
                                        const ts = entry.ts
                                            ? new Date(
                                                  entry.ts,
                                              ).toLocaleTimeString()
                                            : "";
                                        return (
                                            <div
                                                key={idx}
                                                className={`whitespace-pre-wrap break-words ${color}`}
                                            >
                                                <span className="text-gray-600">
                                                    [{ts}]
                                                </span>{" "}
                                                {entry.message}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={logsEndRef} />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Status Card */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="card mb-8"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">
                            Campaign Status
                        </h2>
                        <span
                            className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                                campaign.status,
                            )}`}
                        >
                            {campaign.status === "sending" && (
                                <span className="inline-block w-2 h-2 bg-github-orange rounded-full mr-2 animate-pulse"></span>
                            )}
                            {campaign.status?.toUpperCase()}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-github-blue/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Users className="w-8 h-8 text-github-blue" />
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">
                                {stats.total}
                            </p>
                            <p className="text-sm text-gray-400">
                                Total Recipients
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-github-green/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <CheckCircle className="w-8 h-8 text-github-green" />
                            </div>
                            <p className="text-3xl font-bold text-github-green mb-1">
                                {stats.sent}
                            </p>
                            <p className="text-sm text-gray-400">
                                Sent Successfully
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-github-red/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <XCircle className="w-8 h-8 text-github-red" />
                            </div>
                            <p className="text-3xl font-bold text-github-red mb-1">
                                {stats.failed}
                            </p>
                            <p className="text-sm text-gray-400">Failed</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-github-orange/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Clock className="w-8 h-8 text-github-orange" />
                            </div>
                            <p className="text-3xl font-bold text-github-orange mb-1">
                                {stats.pending}
                            </p>
                            <p className="text-sm text-gray-400">Pending</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-8">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-400">Progress</p>
                            <p className="text-sm font-medium text-white">
                                {successRate}% Success Rate
                            </p>
                        </div>
                        <div className="w-full h-3 bg-github-hover rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-github-green to-github-blue transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Email Template Preview */}
                {campaign.emailTemplate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15 }}
                        className="card mb-8"
                    >
                        <h2 className="text-xl font-bold text-white mb-4">
                            Email Template
                        </h2>
                        <div className="bg-github-hover border border-github-border rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-1">
                                Subject:
                            </p>
                            <p className="text-white font-medium mb-4">
                                {campaign.emailTemplate.subject}
                            </p>
                            <p className="text-sm text-gray-400 mb-1">
                                Body Preview:
                            </p>
                            <div
                                className="text-gray-300 text-sm bg-white/5 p-4 rounded max-h-40 overflow-y-auto"
                                dangerouslySetInnerHTML={{
                                    __html:
                                        campaign.emailTemplate.body?.substring(
                                            0,
                                            500,
                                        ) + "...",
                                }}
                            />
                        </div>
                    </motion.div>
                )}

                {/* Results Table */}
                {campaign.results && campaign.results.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="card"
                    >
                        <h2 className="text-xl font-bold text-white mb-6">
                            Detailed Results
                        </h2>
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full">
                                <thead className="sticky top-0 bg-github-dark">
                                    <tr className="border-b border-github-border">
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            #
                                        </th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Email
                                        </th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Status
                                        </th>
                                        <th className="text-left py-3 px-4 text-gray-400 font-medium">
                                            Error
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {campaign.results.map((result, index) => (
                                        <tr key={index} className="table-row">
                                            <td className="py-3 px-4 text-gray-400">
                                                {index + 1}
                                            </td>
                                            <td className="py-3 px-4 text-white">
                                                {result.email}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                                                        result.status === "sent"
                                                            ? "bg-github-green/20 text-github-green"
                                                            : "bg-github-red/20 text-github-red"
                                                    }`}
                                                >
                                                    {result.status ===
                                                    "sent" ? (
                                                        <CheckCircle className="w-3 h-3" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3" />
                                                    )}
                                                    <span>{result.status}</span>
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-400 text-sm">
                                                {result.error || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}

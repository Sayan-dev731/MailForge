import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Plus, Settings as SettingsIcon, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    const navItems = [
        { path: '/', icon: Home, label: 'Dashboard' },
        { path: '/campaign/new', icon: Plus, label: 'New Campaign' },
        { path: '/settings', icon: SettingsIcon, label: 'Settings' },
    ];

    return (
        <nav className="bg-github-dark border-b border-github-border sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-3 group">
                        <motion.div
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            className="w-10 h-10 bg-gradient-to-br from-github-blue to-github-purple rounded-lg flex items-center justify-center"
                        >
                            <Sparkles className="w-6 h-6 text-white" />
                        </motion.div>
                        <span className="text-xl font-display font-bold text-white group-hover:text-github-blue transition-colors">
                            MailForge AI
                        </span>
                    </Link>

                    {/* Nav Items */}
                    <div className="flex items-center space-x-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive
                                            ? 'bg-github-hover text-github-blue border border-github-blue/30'
                                            : 'text-gray-300 hover:bg-github-hover hover:text-white'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden md:inline">{item.label}</span>
                                </Link>
                            );
                        })}

                        {/* User Menu */}
                        <div className="ml-4 pl-4 border-l border-github-border flex items-center space-x-3">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-white">{user?.email}</p>
                                <p className="text-xs text-gray-400">Admin</p>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 hover:bg-github-hover rounded-lg text-gray-400 hover:text-github-red transition-all"
                                title="Logout"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

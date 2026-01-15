import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NewCampaign from './pages/NewCampaign';
import CampaignDetails from './pages/CampaignDetails';
import Settings from './pages/Settings';

function PrivateRoute({ children }) {
    const { user, loading } = useAuth();

    // Show loading spinner while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-github-darker flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading...</p>
                </div>
            </div>
        );
    }

    return user ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-github-darker flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-github-blue mx-auto"></div>
            </div>
        );
    }

    return user ? <Navigate to="/" /> : children;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen bg-github-darker">
                    <Routes>
                        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
                        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
                        <Route
                            path="/"
                            element={
                                <PrivateRoute>
                                    <Dashboard />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/campaign/new"
                            element={
                                <PrivateRoute>
                                    <NewCampaign />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/campaign/:id"
                            element={
                                <PrivateRoute>
                                    <CampaignDetails />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/settings"
                            element={
                                <PrivateRoute>
                                    <Settings />
                                </PrivateRoute>
                            }
                        />
                    </Routes>
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: '#161b22',
                                color: '#e6edf3',
                                border: '1px solid #30363d',
                            },
                        }}
                    />
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;

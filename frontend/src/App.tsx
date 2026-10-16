import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireRole } from './lib/auth';
import { AppShell } from './components/AppShell';
import { Login } from './pages/Login';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentHistory } from './pages/student/History';
import { StudentMessages } from './pages/student/Messages';
import { StudentSettings } from './pages/student/Settings';
import { SupervisorDashboard } from './pages/supervisor/Dashboard';
import { SupervisorStudents } from './pages/supervisor/Students';
import { SupervisorMessages } from './pages/supervisor/Messages';
import { SupervisorHistory } from './pages/supervisor/History';

const App: React.FC = () => (
    <BrowserRouter>
        <AuthProvider>
            <Routes>
                <Route path="/" element={<Login />} />

                <Route
                    path="/student"
                    element={
                        <RequireRole role="student">
                            <AppShell role="student" />
                        </RequireRole>
                    }
                >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="history" element={<StudentHistory />} />
                    <Route path="messages" element={<StudentMessages />} />
                    <Route path="settings" element={<StudentSettings />} />
                </Route>

                <Route
                    path="/supervisor"
                    element={
                        <RequireRole role="supervisor">
                            <AppShell role="supervisor" />
                        </RequireRole>
                    }
                >
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<SupervisorDashboard />} />
                    <Route path="students" element={<SupervisorStudents />} />
                    <Route path="messages" element={<SupervisorMessages />} />
                    <Route path="broadcast" element={<Navigate to="/supervisor/messages" replace />} />
                    <Route path="history" element={<SupervisorHistory />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </AuthProvider>
    </BrowserRouter>
);

export default App;

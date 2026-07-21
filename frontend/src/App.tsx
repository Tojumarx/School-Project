import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { StudentLayout } from './components/StudentLayout';
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentHistory } from './pages/student/History';
import { StudentMessages } from './pages/student/Messages';
import { StudentSettings } from './pages/student/Settings';
import { SupervisorLayout } from './components/SupervisorLayout';
import { SupervisorDashboard } from './pages/supervisor/Dashboard';
import { SupervisorStudents } from './pages/supervisor/Students';
import { SupervisorBroadcast } from './pages/supervisor/Broadcast';
import { SupervisorHistory } from './pages/supervisor/History';
import './App.css';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public Access */}
                <Route path="/" element={<Login />} />
                
                {/* Student Workspace Portal */}
                <Route path="/student" element={<StudentLayout />}>
                    <Route index element={<Navigate to="/student/dashboard" replace />} />
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="history" element={<StudentHistory />} />
                    <Route path="messages" element={<StudentMessages />} />
                    <Route path="settings" element={<StudentSettings />} />
                </Route>
                
                {/* Supervisor Workspace Portal */}
                <Route path="/supervisor" element={<SupervisorLayout />}>
                    <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
                    <Route path="dashboard" element={<SupervisorDashboard />} />
                    <Route path="students" element={<SupervisorStudents />} />
                    <Route path="broadcast" element={<SupervisorBroadcast />} />
                    <Route path="history" element={<SupervisorHistory />} />
                </Route>
                
                {/* Catch-all fallback redirect to login */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;

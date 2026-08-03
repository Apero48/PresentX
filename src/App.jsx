import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employees = lazy(() => import('./pages/Employees'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Reports = lazy(() => import('./pages/Reports'));
const History = lazy(() => import('./pages/History'));
const MyHistory = lazy(() => import('./pages/MyHistory'));
const EmployeeDetails = lazy(() => import('./pages/EmployeeDetails'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Navigate to="/Dashboard" replace />} />
            <Route path="/Dashboard" element={<Layout currentPageName="Dashboard"><Dashboard /></Layout>} />
            <Route path="/Employees" element={<Layout currentPageName="Employees"><Employees /></Layout>} />
            <Route path="/Scanner" element={<Layout currentPageName="Scanner"><Scanner /></Layout>} />
            <Route path="/Reports" element={<Layout currentPageName="Reports"><Reports /></Layout>} />
            <Route path="/History" element={<Layout currentPageName="History"><History /></Layout>} />
            <Route path="/MyHistory" element={<Layout currentPageName="MyHistory"><MyHistory /></Layout>} />
            <Route path="/EmployeeDetails" element={<Layout currentPageName="EmployeeDetails"><EmployeeDetails /></Layout>} />
            <Route path="/Profile" element={<Layout currentPageName="Profile"><Profile /></Layout>} />
        </Routes>
    )
}

export default App

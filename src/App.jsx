import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Scanner from './pages/Scanner'
import Reports from './pages/Reports'
import History from './pages/History'
import MyHistory from './pages/MyHistory'
import EmployeeDetails from './pages/EmployeeDetails'
import Profile from './pages/Profile'

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

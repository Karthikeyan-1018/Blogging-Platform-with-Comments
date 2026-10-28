import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/dashboards/AdminDashboard';
import ModeratorDashboard from '../components/dashboards/ModeratorDashboard';
import BloggerDashboard from '../components/dashboards/BloggerDashboard';
import ReaderDashboard from '../components/dashboards/ReaderDashboard';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toUpperCase();

  if (role === 'ADMIN') return <AdminDashboard user={user} />;
  if (role === 'MODERATOR') return <ModeratorDashboard user={user} />;
  if (role === 'PREMIUM_BLOGGER') return <BloggerDashboard user={user} premium />;
  if (role === 'BLOGGER') return <BloggerDashboard user={user} />;
  return <ReaderDashboard user={user} />;
};

export default Dashboard;
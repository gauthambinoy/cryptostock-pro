import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './utils/store';
import { ThemeProvider } from './components/ThemeProvider';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Markets from './pages/Markets';
import Gainers from './pages/Gainers';
import Alerts from './pages/Alerts';
import Watchlist from './pages/Watchlist';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Goals from './pages/Goals';
import Dividends from './pages/Dividends';
import News from './pages/News';
import Prediction from './pages/Prediction';
import Converter from './pages/Converter';
import Losers from './pages/Losers';
import Leaderboard from './pages/Leaderboard';
import Compare from './pages/Compare';
import SharePortfolio from './pages/SharePortfolio';
import FearGreed from './pages/FearGreed';

// Components
import Layout from './components/Layout';
import GlobalSearch from './components/GlobalSearch';
import OnboardingTour from './components/OnboardingTour';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { token, user, fetchUser } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <>
                <Layout />
                <GlobalSearch />
                <OnboardingTour />
              </>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="portfolio" element={<Portfolio />} />
            <Route path="markets" element={<Markets />} />
            <Route path="gainers" element={<Gainers />} />
            <Route path="losers" element={<Losers />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="watchlist" element={<Watchlist />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="goals" element={<Goals />} />
            <Route path="dividends" element={<Dividends />} />
            <Route path="news" element={<News />} />
            <Route path="prediction" element={<Prediction />} />
            <Route path="converter" element={<Converter />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="compare" element={<Compare />} />
            <Route path="share" element={<SharePortfolio />} />
            <Route path="fear-greed" element={<FearGreed />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

import React, { useEffect, ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './utils/store';
import { ThemeProvider } from './components/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';

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
import TopPicks from './pages/TopPicks';
import DeepAnalysis from './pages/DeepAnalysis';
import ProfitCalculator from './pages/ProfitCalculator';
import MarketPulse from './pages/MarketPulse';
import RiskAnalysis from './pages/RiskAnalysis';
import Screener from './pages/Screener';
import DCA from './pages/DCA';
import TaxReport from './pages/TaxReport';
import Rebalance from './pages/Rebalance';

// Components
import Layout from './components/Layout';
import GlobalSearch from './components/GlobalSearch';
import OnboardingTour from './components/OnboardingTour';

// Protected Route Component
interface RouteProps {
  children: ReactNode;
}

const ProtectedRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute: React.FC<RouteProps> = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <>
                    <Layout />
                    <GlobalSearch />
                    <OnboardingTour />
                  </>
                </ProtectedRoute>
              }
            >
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
              <Route path="risk" element={<RiskAnalysis />} />
              <Route path="screener" element={<Screener />} />
              <Route path="dca" element={<DCA />} />
              <Route path="tax-report" element={<TaxReport />} />
              <Route path="rebalance" element={<Rebalance />} />
              <Route path="top-picks" element={<TopPicks />} />
              <Route path="invest/analyze/:symbol" element={<DeepAnalysis />} />
              <Route path="invest/analyze" element={<DeepAnalysis />} />
              <Route path="profit-calc" element={<ProfitCalculator />} />
              <Route path="market-pulse" element={<MarketPulse />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

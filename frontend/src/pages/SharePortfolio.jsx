import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Share2, Copy, Link, ExternalLink, Check, TrendingUp, TrendingDown, Briefcase, Lock, Eye } from 'lucide-react';
import { usePortfolioStore } from '../utils/store';
import api from '../utils/api';

// Public view component for shared portfolio links
const SharedPortfolioView = ({ shareData }) => {
  const totalValue = shareData.total_value || 0;
  const totalGainLoss = shareData.total_gain_loss || 0;
  const gainLossPercent = shareData.gain_loss_percent || 0;
  const isPositive = totalGainLoss >= 0;

  return (
    <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-success-500 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">CryptoStock Pro</h1>
          <p className="text-gray-400">Shared Portfolio</p>
        </div>

        {/* Portfolio Card */}
        <div className="glass-card p-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{shareData.portfolio_name || 'Portfolio'}</h2>
              <p className="text-sm text-gray-400">
                Shared on {new Date(shareData.shared_at || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-white">
                ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-400 mb-1">Total Gain/Loss</p>
              <div className="flex items-center gap-2">
                {isPositive ? (
                  <TrendingUp className="w-5 h-5 text-success-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger-400" />
                )}
                <p className={`text-2xl font-bold ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
                  {isPositive ? '+' : ''}{gainLossPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Top Holdings */}
          {shareData.holdings && shareData.holdings.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Top Holdings</h3>
              <div className="space-y-3">
                {shareData.holdings.slice(0, 5).map((holding, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary-400">
                          {(holding.symbol || '??').slice(0, 4)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{holding.symbol}</p>
                        <p className="text-xs text-gray-400">{holding.quantity} shares</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">
                        ${(holding.current_value || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p className={`text-xs ${(holding.gain_loss || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                        {(holding.gain_loss || 0) >= 0 ? '+' : ''}{(holding.gain_loss_percent || 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-6 animate-fade-in">
          <p className="text-gray-400 text-sm mb-3">Want to track your own portfolio?</p>
          <a href="/register" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
            Get Started Free
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
};

// Main SharePortfolio page (for authenticated users)
const SharePortfolio = () => {
  const { shareId } = useParams();
  const { currentPortfolio, holdings, fetchPortfolios, fetchHoldings } = usePortfolioStore();
  const [shareLink, setShareLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [sharedData, setSharedData] = useState(null);
  const [isLoadingShare, setIsLoadingShare] = useState(false);

  // If we have a shareId in the URL, load the public shared portfolio
  useEffect(() => {
    if (shareId) {
      setIsLoadingShare(true);
      api.get(`/api/share/${shareId}`)
        .then(res => setSharedData(res.data))
        .catch(() => setError('This shared portfolio link is invalid or has expired.'))
        .finally(() => setIsLoadingShare(false));
    }
  }, [shareId]);

  useEffect(() => {
    if (!shareId) {
      fetchPortfolios();
    }
  }, [shareId, fetchPortfolios]);

  useEffect(() => {
    if (currentPortfolio && !shareId) {
      fetchHoldings(currentPortfolio.id);
    }
  }, [currentPortfolio, shareId, fetchHoldings]);

  const handleGenerateLink = async () => {
    if (!currentPortfolio) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await api.post(`/api/share/${currentPortfolio.id}`);
      const link = `${window.location.origin}/share/${response.data.share_id}`;
      setShareLink(link);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = shareLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show public view if viewing a share link
  if (shareId) {
    if (isLoadingShare) {
      return (
        <div className="min-h-screen bg-dark-400 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    if (error) {
      return (
        <div className="min-h-screen bg-dark-400 flex items-center justify-center">
          <div className="glass-card p-8 text-center max-w-md">
            <Lock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Portfolio Not Found</h2>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      );
    }
    if (sharedData) {
      return <SharedPortfolioView shareData={sharedData} />;
    }
    return null;
  }

  // Authenticated user: share portfolio page
  const totalValue = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  const totalGainLoss = holdings.reduce((sum, h) => sum + (h.gain_loss || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Share2 className="w-7 h-7 text-primary-400" />
            Share Portfolio
          </h1>
          <p className="text-gray-400 mt-1">Generate a shareable link to show your portfolio performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Link Section */}
        <div className="glass-card p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-2">Generate Share Link</h2>
            <p className="text-sm text-gray-400">
              Create a public link that shows a snapshot of your portfolio. Others can view your
              holdings and performance without needing an account.
            </p>
          </div>

          {currentPortfolio && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-primary-400" />
                <div>
                  <p className="font-medium text-white">{currentPortfolio.name}</p>
                  <p className="text-xs text-gray-400">{holdings.length} holdings</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateLink}
            disabled={isGenerating || !currentPortfolio}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Link className="w-5 h-5" />
                Generate Share Link
              </>
            )}
          </button>

          {error && (
            <div className="bg-danger-500/10 border border-danger-500/20 rounded-xl p-4 text-danger-400 text-sm">
              {error}
            </div>
          )}

          {shareLink && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm text-gray-400">Your share link is ready:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-dark-200 rounded-xl px-4 py-3 text-sm text-gray-300 truncate border border-white/10">
                  {shareLink}
                </div>
                <button
                  onClick={handleCopy}
                  className={`p-3 rounded-xl transition-all ${
                    copied
                      ? 'bg-success-500/20 text-success-400'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
              <a
                href={shareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2"
              >
                <ExternalLink className="w-4 h-4" />
                Preview Share Link
              </a>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">Preview</h2>
          </div>
          <p className="text-sm text-gray-400 mb-6">This is how your shared portfolio will appear to others.</p>

          {/* Mini preview card */}
          <div className="bg-dark-200 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="font-medium text-white">{currentPortfolio?.name || 'My Portfolio'}</p>
                <p className="text-xs text-gray-400">Portfolio Snapshot</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-400">Total Value</p>
                <p className="text-lg font-bold text-white">
                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-400">Gain/Loss</p>
                <p className={`text-lg font-bold ${totalGainLoss >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                  {totalGainLoss >= 0 ? '+' : ''}${Math.abs(totalGainLoss).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Holdings preview */}
            <div className="space-y-2">
              {holdings.slice(0, 3).map((holding, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary-400 bg-primary-500/20 px-2 py-1 rounded">
                      {(holding.symbol || '??').slice(0, 5)}
                    </span>
                    <span className="text-sm text-white">{holding.quantity} units</span>
                  </div>
                  <span className={`text-sm font-medium ${(holding.gain_loss || 0) >= 0 ? 'text-success-400' : 'text-danger-400'}`}>
                    {(holding.gain_loss || 0) >= 0 ? '+' : ''}{(holding.gain_loss_percent || 0).toFixed(1)}%
                  </span>
                </div>
              ))}
              {holdings.length > 3 && (
                <p className="text-xs text-gray-500 text-center py-1">
                  +{holdings.length - 3} more holdings
                </p>
              )}
              {holdings.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No holdings to preview. Add some investments to your portfolio first.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharePortfolio;

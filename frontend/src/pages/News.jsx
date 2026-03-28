import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { usePortfolioStore } from '../utils/store';
import { timeAgo } from '../utils/helpers';
import { Newspaper, ExternalLink, Search } from 'lucide-react';

const News = () => {
  const { holdings } = usePortfolioStore();
  const [articles, setArticles] = useState([]);
  const [holdingsArticles, setHoldingsArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAllNews();
  }, []);

  useEffect(() => {
    if (activeTab === 'holdings' && holdingsArticles.length === 0) {
      fetchHoldingsNews();
    }
  }, [activeTab, holdings]);

  const fetchAllNews = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/news');
      setArticles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHoldingsNews = async () => {
    if (!holdings || holdings.length === 0) return;
    setIsLoading(true);
    try {
      const symbols = holdings.map((h) => h.symbol);
      const uniqueSymbols = [...new Set(symbols)];
      const requests = uniqueSymbols.map((symbol) =>
        api.get(`/news?symbol=${symbol}`).catch(() => ({ data: [] }))
      );
      const responses = await Promise.all(requests);
      const allArticles = responses.flatMap((res) => res.data || []);
      const seen = new Set();
      const deduped = allArticles.filter((a) => {
        const key = a.title || a.url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setHoldingsArticles(deduped);
    } catch (error) {
      console.error('Failed to fetch holdings news:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentArticles = activeTab === 'all' ? articles : holdingsArticles;

  const filteredArticles = searchQuery
    ? currentArticles.filter(
        (a) =>
          a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.source?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : currentArticles;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-500">
            <Newspaper className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Financial News</h1>
            <p className="text-gray-400">Stay updated with the latest market news</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'all'
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Newspaper className="w-5 h-5" />
          All News
        </button>
        <button
          onClick={() => setActiveTab('holdings')}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'holdings'
              ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
              : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
          }`}
        >
          <Search className="w-5 h-5" />
          My Holdings
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter news by keyword or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field w-full pl-12"
          />
        </div>
      </div>

      {/* News Grid */}
      {isLoading ? (
        <div className="glass-card p-12 text-center">
          <Newspaper className="w-8 h-8 text-gray-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-400">Loading news...</p>
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Newspaper className="w-8 h-8 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">
            {activeTab === 'holdings' && (!holdings || holdings.length === 0)
              ? 'Add holdings to your portfolio to see relevant news'
              : 'No news articles found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredArticles.map((article, index) => (
            <div
              key={article.url || index}
              className="glass-card overflow-hidden hover:border-primary-500/30 transition-all group"
            >
              {/* Image */}
              {article.image || article.urlToImage ? (
                <div className="h-48 overflow-hidden">
                  <img
                    src={article.image || article.urlToImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden h-48 bg-gradient-to-br from-primary-500/20 to-indigo-500/20 flex items-center justify-center">
                    <Newspaper className="w-12 h-12 text-primary-400/50" />
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-primary-500/20 to-indigo-500/20 flex items-center justify-center">
                  <Newspaper className="w-12 h-12 text-primary-400/50" />
                </div>
              )}

              {/* Content */}
              <div className="p-5 space-y-3">
                <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary-400 transition-colors">
                  {article.title}
                </h3>

                {article.description && (
                  <p className="text-gray-400 text-sm line-clamp-2">
                    {article.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {article.source && (
                      <span className="px-2 py-1 rounded-lg bg-white/5 text-gray-400">
                        {typeof article.source === 'object'
                          ? article.source.name
                          : article.source}
                      </span>
                    )}
                    {(article.publishedAt || article.published_at || article.date) && (
                      <span>
                        {timeAgo(
                          article.publishedAt || article.published_at || article.date
                        )}
                      </span>
                    )}
                  </div>

                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      Read More
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default News;

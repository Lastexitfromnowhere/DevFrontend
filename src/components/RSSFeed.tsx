"use client";
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { NewspaperIcon, ExternalLink, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { config } from "@/config/env";
interface DiscordAttachment {
  url: string;
  name: string;
  contentType?: string;
}
interface DiscordNewsItem {
  id: string;
  content: string;
  author: string;
  timestamp: number;
  date: string;
  attachments: DiscordAttachment[];
}
interface DiscordNewsResponse {
  success: boolean;
  messages: DiscordNewsItem[];
}
export default function RSSFeed() {
  const [news, setNews] = useState<DiscordNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  useEffect(() => {
    const fetchDiscordNews = async () => {
      try {
        setIsLoading(true);
        console.log('🔍 Fetching Discord news...');
        const response = await fetch(`${config.API_BASE_URL}/discord/news`);
        if (!response.ok) throw new Error("Failed to fetch Discord news");
        const data: DiscordNewsResponse = await response.json();
        console.log('📝 Discord API Response:', data);
        console.log('📊 Messages count:', data.messages?.length);
        console.log('🆔 First message ID type:', typeof data.messages?.[0]?.id);
        console.log('🆔 First message ID value:', data.messages?.[0]?.id);
        if (data.success && Array.isArray(data.messages)) {
          setNews(data.messages);
          setError(null);
          console.log('✅ News state updated with', data.messages.length, 'messages');
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
        console.error('❌ Error fetching Discord news:', err);
        setError(err.message || "Failed to load news");
        setNews([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiscordNews();
    const interval = setInterval(fetchDiscordNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (news.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 6000); 
    return () => clearInterval(interval);
  }, [news.length, isPaused]);
  const getMessageTitle = (content: string) =>
    !content ? "News Update" : content.split("\n")[0].slice(0, 50);
  const getMessagePreview = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim());
    return lines.slice(0, 3).join('\n');
  };
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };
  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + news.length) % news.length);
  };
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };
  if (isLoading) {
    return (
      <div className="relative rounded-2xl overflow-hidden h-32 flex items-center justify-center">
        <div className="text-gray-400">Chargement des actualités...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="relative rounded-2xl overflow-hidden h-32 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }
  if (news.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden h-32 flex items-center justify-center">
        <div className="text-gray-400">Aucune actualité disponible.</div>
      </div>
    );
  }
  const currentNews = news[currentIndex];
  return (
    <div 
      className="relative rounded-2xl overflow-hidden h-40"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {}
      <div
        className="absolute inset-0 w-full h-full z-0"
        style={{
          backgroundImage: "url('/fox2.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.85,
          filter: 'blur(0.5px)'
        }}
      />
      {}
      <div className="relative bg-black/20 backdrop-blur-none bg-opacity-30 border border-white/20 shadow-xl rounded-2xl p-6 h-full flex flex-col">
        {}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-blue-300 flex items-center gap-2">
            <span className="inline-block align-middle">
              <svg width="20" height="20" fill="currentColor" className="text-indigo-400">
                <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.0371c-1.4712.2492-3.251.8227-4.8852 1.5152a.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276c-.598.3428-1.2205.6447-1.8733.8923a.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6601a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1826 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
              </svg>
            </span>
            Discord News
          </h3>
          {}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{currentIndex + 1}/{news.length}</span>
            <div className="flex gap-1">
              {news.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-blue-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        {}
        <div className="flex-1 flex items-start gap-3 min-h-0">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-blue-200 mb-2 text-sm truncate">
              {getMessageTitle(currentNews.content)}
            </div>
            <div className="text-xs text-gray-300 leading-relaxed line-clamp-3 whitespace-pre-line">
              {getMessagePreview(currentNews.content)}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              {formatDate(currentNews.date)} • {currentNews.author}
            </div>
          </div>
          {}
          <div className="flex flex-col gap-1 opacity-60 hover:opacity-100 transition-opacity">
            <button
              onClick={goToPrevious}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Actualité précédente"
            >
              <ChevronUp size={16} className="text-gray-400" />
            </button>
            <button
              onClick={goToNext}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Actualité suivante"
            >
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
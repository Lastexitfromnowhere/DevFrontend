"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { NewspaperIcon, ExternalLink, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { config } from "@/config/env";

// Types
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

  useEffect(() => {
    const fetchDiscordNews = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${config.API_BASE_URL}/discord/news`);
        if (!response.ok) throw new Error("Failed to fetch Discord news");
        const data: DiscordNewsResponse = await response.json();
        if (data.success && Array.isArray(data.messages)) {
          setNews(data.messages);
          setError(null);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: any) {
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

  // Helpers
  const getMessageTitle = (content: string) =>
    !content ? "News Update" : content.split("\n")[0].slice(0, 60);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Expansion/collapse state
  const [expanded, setExpanded] = useState(false);
  // Affiche les 3 premiers posts si non expandé, sinon tout
  const visibleNews = expanded ? news : news.slice(0, 3);

  return (
    <div className="bg-black/50 rounded-xl p-8 min-h-[160px] flex flex-col justify-center">
      <h3 className="text-lg font-bold mb-4 text-blue-300 flex items-center gap-2">
        <span className="inline-block align-middle">
          <svg width="20" height="20" fill="currentColor" className="text-indigo-400"><path d="M17.707 4.293a1 1 0 0 0-1.414 0l-1.086 1.086A8.004 8.004 0 0 0 10 4c-1.229 0-2.415.246-3.5.707L5.414 4.293a1 1 0 1 0-1.414 1.414l1.086 1.086A8.004 8.004 0 0 0 4 10c0 1.229.246 2.415.707 3.5l-1.086 1.086a1 1 0 0 0 1.414 1.414l1.086-1.086A8.004 8.004 0 0 0 10 16c1.229 0 2.415-.246 3.5-.707l1.086 1.086a1 1 0 0 0 1.414-1.414l-1.086-1.086A8.004 8.004 0 0 0 16 10c0-1.229-.246-2.415-.707-3.5l1.086-1.086a1 1 0 0 0 0-1.414z"/></svg>
        </span>
        Latest Discord News
      </h3>
      {isLoading ? (
        <div className="text-gray-400">Loading...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <>
          <div className="space-y-6 animate-fade-in-down flex-1">
            {visibleNews.map((item: DiscordNewsItem, idx: number) => (
              <div
                key={item.id || idx}
                className="group bg-black/70 rounded-xl shadow-lg p-4 flex items-start gap-3 hover:bg-blue-900/30 transition-colors duration-200"
              >
                <span className="mt-1 text-indigo-400">
                  {/* Discord icon */}
                  <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.0371c-1.4712.2492-3.251.8227-4.8852 1.5152a.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276c-.598.3428-1.2205.6447-1.8733.8923a.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6601a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1826 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-blue-200 mb-1 truncate">
                    {getMessageTitle(item.content)}
                  </div>
                  <div className="text-sm text-gray-300 line-clamp-3 whitespace-pre-line group-hover:line-clamp-none">
                    {item.content}
                  </div>
                  {item.attachments && item.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.attachments.map((att, attIdx) => (
                        <a
                          key={attIdx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-300 underline hover:text-blue-200"
                        >
                          Attachment {attIdx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-400">
                    {formatDate(item.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {news.length > 3 && (
            <div className="flex justify-center mt-4">
              <button
                className="px-4 py-1 rounded bg-blue-800/80 hover:bg-blue-700 text-blue-100 text-sm font-medium transition-colors"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? 'Voir moins' : 'Voir plus'}
              </button>
            </div>
          )}
        </>
      )}
      {news.length === 0 && (
        <>
          <div className="text-gray-400">No news available.</div>
          <div className="flex justify-center">
            <button
              className="mt-2 px-4 py-1 rounded bg-blue-500/30 text-blue-200 hover:bg-blue-500/50 text-xs font-medium transition"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? "Voir moins" : `Voir plus (${news.length - 2})`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
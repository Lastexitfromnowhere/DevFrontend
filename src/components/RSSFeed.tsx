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

  return (
    <Card className="backdrop-blur-md bg-black/40 border border-gray-700/50 p-6 rounded-lg shadow-lg transition-all duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-full bg-blue-500/20 backdrop-blur-sm">
            <NewspaperIcon className="text-blue-400" size={20} />
          </div>
          <h2 className="text-xl font-semibold text-white">Discord News</h2>
        </div>
        {isLoading && <Spinner size="sm" />}
      </div>

      {error && (
        <div className="text-center p-3 mb-4 bg-red-500/20 backdrop-blur-sm rounded-lg border border-red-700/30">
          <div className="flex items-center justify-center space-x-2">
            <AlertCircle className="text-red-400" size={16} />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {news.map((item) => (
          <div
            key={item.id}
            className="p-4 backdrop-blur-sm bg-black/30 border border-gray-700/30 rounded-lg transition-all duration-300 hover:bg-black/40"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-medium text-white">{getMessageTitle(item.content)}</h3>
              <span className="text-xs text-gray-400">{formatDate(item.date)}</span>
            </div>
            <p className="text-sm text-gray-300 mt-2 whitespace-pre-line">{item.content}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-xs text-blue-400">By {item.author}</span>
              {item.attachments && item.attachments.length > 0 && (
                <div className="flex space-x-2">
                  {item.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-400 hover:text-blue-300 text-xs"
                    >
                      {attachment.contentType?.includes("image")
                        ? "View image"
                        : "Download attachment"}
                      <ExternalLink className="ml-1 w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {news.length === 0 && !isLoading && !error && (
          <div className="text-center py-6 text-gray-400">
            No updates available at the moment
          </div>
        )}
      </div>
    </Card>
  );
}
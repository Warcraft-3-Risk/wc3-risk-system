'use client';

import { useLiveLobbies } from '@/core/utils/useLiveLobbies';
import { Users, Globe, User } from 'lucide-react';
import { useState, useRef } from 'react';

export default function LiveLobbiesIndicator() {
  const { lobbies, loading, error } = useLiveLobbies();
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 300);
  };

  if (loading || error) {
    return null; // Don't show anything while loading or on error
  }

  const totalPlayers = lobbies.reduce(
    (sum, lobby) => sum + lobby.slotsTaken,
    0
  );
  const totalLobbies = lobbies.length;

  if (totalLobbies === 0) {
    return null; // Don't show if no lobbies
  }

  const getServerLabel = (server: string) => {
    const serverMap: Record<string, string> = {
      usw: 'US West',
      use: 'US East',
      eu: 'Europe',
      asia: 'Asia',
    };
    return serverMap[server.toLowerCase()] || server.toUpperCase();
  };

  const formatTimeSince = (timestamp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#0C2A46] text-[#efe5c7] border border-[#efe5c7]/20 hover:bg-[#123456] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium hidden sm:inline">
            {totalLobbies} {totalLobbies === 1 ? 'Lobby' : 'Lobbies'}
          </span>
          <span className="text-sm font-medium text-green-400">
            {totalPlayers} {totalPlayers === 1 ? 'Player' : 'Players'}
          </span>
        </div>
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
      </div>

      {/* Tooltip/Dropdown */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-[#0C2A46] border-2 border-[#efe5c7]/30 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="bg-[#1b3449] px-4 py-3 border-b border-[#efe5c7]/20">
            <h3 className="text-[#efe5c7] font-semibold text-sm">
              Active Risk Europe Lobbies
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="px-4 py-3 border-b border-[#efe5c7]/10 hover:bg-[#123456] transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-[#efe5c7] font-medium text-sm flex-1 pr-2">
                    {lobby.name}
                  </h4>
                  <div className="flex items-center gap-1 text-green-400 text-sm font-semibold">
                    <Users className="w-3.5 h-3.5" />
                    {lobby.slotsTaken}/{lobby.slotsTotal}
                  </div>
                </div>
                
                <div className="space-y-1 text-xs text-[#efe5c7]/70">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3 h-3" />
                    <span className="truncate">{lobby.host}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3 h-3" />
                    <span>{getServerLabel(lobby.server)}</span>
                    <span className="text-[#efe5c7]/50">•</span>
                    <span>{formatTimeSince(lobby.created)}</span>
                  </div>
                  <div className="text-[#efe5c7]/50 truncate">
                    {lobby.map}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-[#1b3449] px-4 py-2 text-center">
            <p className="text-xs text-[#efe5c7]/60">
              Updates every 30 seconds
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

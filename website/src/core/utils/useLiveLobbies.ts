'use client';

import { useEffect, useState } from 'react';

interface GameLobby {
  name: string;
  server: string;
  map: string;
  host: string;
  slotsTaken: number;
  slotsTotal: number;
  checksum: number;
  created: number;
  lastUpdated: number;
  id: string;
}

interface ApiResponse {
  status: string;
  code: number;
  queryTime: number;
  body: GameLobby[];
}

const CACHE_KEY = 'wc3_risk_lobbies_cache';
const CACHE_TTL = 30000;

let activeFetch: Promise<GameLobby[]> | null = null;

async function doFetchLobbies(): Promise<GameLobby[]> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore JSON errors
  }

  if (activeFetch) return activeFetch;

  activeFetch = (async () => {
    try {
      const response = await fetch('https://api.wc3stats.com/gamelist');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data: ApiResponse = await response.json();
      let riskLobbies: GameLobby[] = [];
      
      if (data.status === 'OK' && data.body) {
        riskLobbies = data.body.filter(
          (lobby) =>
            lobby.map.toLowerCase().includes('risk') &&
            lobby.map.toLowerCase().includes('europe')
        );
      }
      
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data: riskLobbies })
      );
      
      return riskLobbies;
    } finally {
      activeFetch = null;
    }
  })();

  return activeFetch;
}

export function useLiveLobbies() {
  const [lobbies, setLobbies] = useState<GameLobby[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const tick = async () => {
      try {
        const data = await doFetchLobbies();
        if (isMounted) {
          setLobbies(data);
          setError(null);
          setLoading(false);
          // Only start the next interval after this fetch finishes
          timeoutId = setTimeout(tick, CACHE_TTL);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching lobbies:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
          timeoutId = setTimeout(tick, CACHE_TTL);
        }
      }
    };

    tick();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === CACHE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (isMounted) {
            setLobbies(parsed.data);
            setLoading(false);
            setError(null);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return { lobbies, loading, error };
}

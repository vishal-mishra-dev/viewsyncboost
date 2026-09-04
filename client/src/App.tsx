import React, { useState, useEffect, useRef, useCallback } from 'react';
import YouTubePlayer from './YouTubePlayer';
import './App.css';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }

  namespace YT {
    interface PlayerState {
      UNSTARTED: number;
      ENDED: number;
      PLAYING: number;
      PAUSED: number;
      BUFFERING: number;
      CUED: number;
    }
  }
}

interface VideoData {
  id: string;
  videoId: string;
  url: string;
  title: string;
  startTime: number;
  windowId?: string;
}

const App: React.FC = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [isSyncMode, setIsSyncMode] = useState(false);
  const [playersReady, setPlayersReady] = useState(0);
  const [playingVideos, setPlayingVideos] = useState<Set<string>>(new Set());
  const [readyPlayers, setReadyPlayers] = useState<Set<string>>(new Set());
  const [isYouTubeApiReady, setIsYouTubeApiReady] = useState(false);
  const [screenCount, setScreenCount] = useState(10);
  const playersRef = useRef<{ [key: string]: any }>({});

  // Initialize YouTube API
  useEffect(() => {
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API is ready!');
      setIsYouTubeApiReady(true);
    };

    const loadYouTubeAPI = () => {
      // Check if already loaded
      if (window.YT && window.YT.Player && window.YT.PlayerState) {
        console.log('YouTube API already loaded');
        setIsYouTubeApiReady(true);
        return;
      }

      // Check if script is already in DOM
      const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
      if (existingScript) {
        console.log('YouTube API script already exists');
        return;
      }

      console.log('Loading YouTube API...');
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        console.log('Failed to load YouTube API');
      };
      script.onload = () => {
        console.log('YouTube API script loaded successfully');
      };
      document.head.appendChild(script);
    };

    loadYouTubeAPI();
  }, []);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url.trim());
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const videoId = parsedUrl.hostname === 'youtu.be'
        ? pathParts[0]
        : parsedUrl.searchParams.get('v') ||
          (pathParts[0] === 'shorts' || pathParts[0] === 'embed' || pathParts[0] === 'v'
            ? pathParts[1]
            : undefined);

      return videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null;
    } catch {
      return null;
    }
  };

  // Get player state name for logging
  const getPlayerStateName = (state: number): string => {
    switch (state) {
      case -1: return 'UNSTARTED';
      case window.YT.PlayerState.UNSTARTED: return 'UNSTARTED';
      case window.YT.PlayerState.ENDED: return 'ENDED';
      case window.YT.PlayerState.PLAYING: return 'PLAYING';
      case window.YT.PlayerState.PAUSED: return 'PAUSED';
      case window.YT.PlayerState.BUFFERING: return 'BUFFERING';
      case window.YT.PlayerState.CUED: return 'CUED';
      default: return `UNKNOWN(${state})`;
    }
  };

  // Add new video
  const addVideo = () => {
    if (!newVideoUrl.trim()) return;
    
    const videoId = extractVideoId(newVideoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    const newVideo: VideoData = {
      id: `${videoId}-${Date.now()}`,
      videoId,
      url: newVideoUrl,
      title: `Video ${videos.length + 1}`,
      startTime: 0
    };

    setVideos(prev => [...prev, newVideo]);
    setNewVideoUrl('');
    generateShareUrl([...videos, newVideo]);
  };

  // Open synchronized window
  const openSyncWindow = (video: VideoData) => {
    const windowId = `sync-${video.id}-${Date.now()}`;
    const syncUrl = `${window.location.origin}${window.location.pathname}?video0=${encodeURIComponent(video.url)}&start0=${video.startTime}&sync=true`;
    
    const newWindow = window.open(
      syncUrl,
      windowId,
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );
    
    if (newWindow) {
      // Update video with window ID
      setVideos(prev => prev.map(v => 
        v.id === video.id ? { ...v, windowId } : v
      ));
    }
  };

  // Open all videos in separate synchronized windows
  const openAllSyncWindows = () => {
    videos.forEach(video => {
      openSyncWindow(video);
    });
  };

  const openVideoInScreens = (video: VideoData, count: number) => {
    const syncUrl = `${window.location.origin}${window.location.pathname}?video0=${encodeURIComponent(video.url)}&start0=${video.startTime}&sync=true`;
    let openedCount = 0;

    for (let index = 0; index < count; index += 1) {
      const newWindow = window.open(
        syncUrl,
        `sync-${video.id}-${index}-${Date.now()}`,
        'width=800,height=600,scrollbars=yes,resizable=yes'
      );

      if (newWindow) {
        openedCount += 1;
      }
    }

    if (openedCount < count) {
      alert(`Opened ${openedCount} of ${count} screens. Your browser blocked the remaining pop-ups.`);
    }
  };

  // Remove video
  const removeVideo = (videoId: string) => {
    setVideos(prev => {
      const updated = prev.filter(v => v.id !== videoId);
      generateShareUrl(updated);
      return updated;
    });
    
    if (playersRef.current[videoId]) {
      playersRef.current[videoId].destroy();
      delete playersRef.current[videoId];
    }
  };

  // Generate shareable URL
  const generateShareUrl = (videoList: VideoData[]) => {
    const params = new URLSearchParams();
    videoList.forEach((video, index) => {
      params.append(`video${index}`, video.url);
      params.append(`start${index}`, video.startTime.toString());
    });
    setShareUrl(`${window.location.origin}${window.location.pathname}?${params.toString()}`);
  };

  // Load videos from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const loadedVideos: VideoData[] = [];
    
    // Check if this is sync mode
    const syncMode = urlParams.get('sync') === 'true';
    setIsSyncMode(syncMode);
    
    let index = 0;
    while (urlParams.has(`video${index}`)) {
      const url = urlParams.get(`video${index}`) || '';
      const startTime = parseInt(urlParams.get(`start${index}`) || '0');
      const videoId = extractVideoId(url);
      
      if (videoId) {
        loadedVideos.push({
          id: `${videoId}-${index}`,
          videoId,
          url,
          title: `Video ${index + 1}`,
          startTime
        });
      }
      index++;
    }
    
    if (loadedVideos.length > 0) {
      setVideos(loadedVideos);
    }
  }, []);

  // Synchronized play
  const playAll = () => {
    console.log('=== PLAY ALL CLICKED ===');
    console.log('YouTube API ready:', !!(window.YT && window.YT.Player));
    console.log('Players available:', Object.keys(playersRef.current));
    console.log('Videos count:', videos.length);

    // Log each player's state
    Object.entries(playersRef.current).forEach(([videoId, player]) => {
      if (player && typeof player.getPlayerState === 'function') {
        try {
          const state = player.getPlayerState();
          console.log(`Video ${videoId} state:`, getPlayerStateName(state));
        } catch (error) {
          console.log(`Error getting state for video ${videoId}:`, error);
        }
      }
    });
    
    if (!window.YT || !window.YT.Player) {
      console.log('YouTube API not ready');
      alert('YouTube API is not ready yet. Please wait a moment and try again.');
      return;
    }
    
    if (videos.length === 0) {
      console.log('No videos to play');
      alert('No videos loaded. Please add some videos first.');
      return;
    }
    
    console.log(`Checking ready players: ${readyPlayers.size}/${videos.length}`);
    console.log('Ready player IDs:', Array.from(readyPlayers));
    
    if (readyPlayers.size === 0) {
      console.log('No players ready - checking if we can use fallback');
      // Check if we have any players in the ref, even if not marked as ready
      const availablePlayers = Object.keys(playersRef.current).length;
      if (availablePlayers > 0) {
        console.log(`Found ${availablePlayers} players in ref, using them`);
        // Use available players even if not marked as ready
        const readyPlayersArray = Object.entries(playersRef.current).filter(([videoId, player]) => player != null);
        console.log(`Using ${readyPlayersArray.length} available players`);
      } else {
        console.log('No players available at all');
        alert('Videos are still loading. Please wait for the videos to load completely.');
        return;
      }
    } else {
      // Convert ready players set to array for processing
      const readyPlayersArray = Array.from(readyPlayers).map(videoId => [videoId, playersRef.current[videoId]]).filter(([videoId, player]) => player != null);
      console.log(`Ready players: ${readyPlayersArray.length}/${videos.length}`);
    }

    // Get the final array of players to use
    let readyPlayersArray = readyPlayers.size > 0 
      ? Array.from(readyPlayers).map(videoId => [videoId, playersRef.current[videoId]]).filter(([videoId, player]) => player != null)
      : Object.entries(playersRef.current).filter(([videoId, player]) => player != null);

    // If we still don't have enough players, try to use any available players
    if (readyPlayersArray.length === 0) {
      console.log('No ready players found, trying all available players');
      readyPlayersArray = Object.entries(playersRef.current).filter(([videoId, player]) => {
        if (!player) return false;
        // Check if player has basic functionality
        try {
          return typeof player.playVideo === 'function';
        } catch (error) {
          return false;
        }
      });
    }

    console.log(`Final players to use: ${readyPlayersArray.length}/${videos.length}`);
    
    if (readyPlayersArray.length === 0) {
      console.log('No functional players found');
      alert('No functional video players found. Please refresh the page and try again.');
      return;
    }
    
    setIsPlaying(true);
    // Broadcast play event to other windows
    broadcastSyncEvent('play', {});

    // Try to play with a small delay to ensure players are ready
    setTimeout(() => {
      let playedCount = 0;
      // Only use players that are actually ready
      const playerEntries = readyPlayersArray;
      
      // Play videos one by one with a small delay between each
      playerEntries.forEach(([videoId, player], index) => {
        setTimeout(() => {
          if (player && typeof player.playVideo === 'function') {
            try {
              // Check if player is actually ready
              const playerState = player.getPlayerState ? player.getPlayerState() : -1;
              console.log(`Player state for ${videoId}:`, getPlayerStateName(playerState));

              if (playerState === -1 || playerState === window.YT.PlayerState.UNSTARTED || playerState === window.YT.PlayerState.PAUSED || playerState === window.YT.PlayerState.CUED) {
                console.log(`Playing video ${videoId} (${index + 1}/${playerEntries.length})`);
                setPlayingVideos(prev => new Set([...prev, videoId]));
                player.playVideo();
                playedCount++;
              } else if (playerState === window.YT.PlayerState.PLAYING) {
                console.log(`Video ${videoId} is already playing`);
                setPlayingVideos(prev => new Set([...prev, videoId]));
                playedCount++;
              } else if (playerState === window.YT.PlayerState.BUFFERING) {
                console.log(`Video ${videoId} is buffering, waiting...`);
                // Wait a bit more and try again
                setTimeout(() => {
                  try {
                    if (player && typeof player.playVideo === 'function') {
                      console.log(`Retry playing video ${videoId}`);
                      player.playVideo();
                      setPlayingVideos(prev => new Set([...prev, videoId]));
                    }
                  } catch (error) {
                    console.log(`Retry error for video ${videoId}:`, error);
                  }
                }, 500);
              } else {
                console.log(`Player not ready for video ${videoId}, state: ${getPlayerStateName(playerState)}`);
              }
            } catch (error) {
              console.log(`Error playing video ${videoId}:`, error);
            }
          } else {
            console.log(`Player not ready for video ${videoId}:`, {
              player: !!player,
              playVideo: player ? typeof player.playVideo : 'undefined',
              playerState: player ? player.getPlayerState : 'undefined'
            });
          }
        }, index * 200); // 200ms delay between each video for more reliability
      });
      
      // Check results after all videos have been attempted
      setTimeout(() => {
        console.log(`Successfully triggered play on ${playedCount} videos`);
        if (playedCount === 0) {
          // Try again after a longer delay
          setTimeout(() => {
            let retryCount = 0;
            playerEntries.forEach(([videoId, player], index) => {
              setTimeout(() => {
                if (player && player.playVideo) {
                  try {
                    console.log(`Retry playing video ${videoId} (${index + 1}/${playerEntries.length})`);
                    player.playVideo();
                    retryCount++;
                  } catch (error) {
                    console.log(`Retry error playing video ${videoId}:`, error);
                  }
                }
              }, index * 200); // 200ms delay for retry
            });
            
            setTimeout(() => {
              if (retryCount === 0) {
                alert('Videos are still loading. Please wait a moment and try again.');
              } else {
                console.log(`Retry successful: ${retryCount} videos playing`);
              }
            }, playerEntries.length * 200 + 1000);
          }, 2000);
        }
      }, playerEntries.length * 100 + 1000);
    }, 500);
  };

  // Synchronized pause
  const pauseAll = () => {
    if (!window.YT || !window.YT.Player) {
      console.log('YouTube API not ready');
      return;
    }
    setIsPlaying(false);
    // Broadcast pause event to other windows
    broadcastSyncEvent('pause', {});
    Object.values(playersRef.current).forEach(player => {
      if (player && player.pauseVideo) {
        try {
          player.pauseVideo();
        } catch (error) {
          console.log('Error pausing video:', error);
        }
      }
    });
  };

  // Synchronized seek
  const seekAll = (time: number) => {
    if (!window.YT || !window.YT.Player) {
      console.log('YouTube API not ready');
      return;
    }
    setCurrentTime(time);
    // Broadcast seek event to other windows
    broadcastSyncEvent('seek', { time });
    Object.values(playersRef.current).forEach(player => {
      if (player && player.seekTo) {
        try {
          player.seekTo(time, true);
        } catch (error) {
          console.log('Error seeking video:', error);
        }
      }
    });
  };

  // Sync all videos to start
  const syncToStart = () => {
    seekAll(0);
    setVideos(prev => prev.map(v => ({ ...v, startTime: 0 })));
  };

  // Sync all videos to current time
  const syncToCurrentTime = () => {
    const time = currentTime;
    setVideos(prev => prev.map(v => ({ ...v, startTime: time })));
    seekAll(time);
  };

  // YouTube player ready callback
  const onPlayerReady = useCallback((videoId: string, event: any) => {
    console.log(`Player ready for video ${videoId}`);
    playersRef.current[videoId] = event.target;
    
    // Add to ready players set
    setReadyPlayers(prev => {
      const newSet = new Set([...prev, videoId]);
      console.log(`Ready players updated: ${newSet.size}/${videos.length}`);
      return newSet;
    });

    const video = videos.find(v => v.id === videoId);
    if (video && video.startTime > 0) {
      event.target.seekTo(video.startTime, true);
    }

    // Update players ready count
    const totalPlayers = Object.keys(playersRef.current).length;
    setPlayersReady(totalPlayers);
    console.log(`Players ready: ${totalPlayers}/${videos.length}`);
  }, [videos]);

  // Broadcast sync events to other windows
  const broadcastSyncEvent = useCallback((eventType: string, data: any) => {
    try {
      const event = {
        type: eventType,
        data: data,
        timestamp: Date.now(),
        windowId: window.name || 'main'
      };
      
      // Use BroadcastChannel if available
      if (window.BroadcastChannel) {
        const channel = new BroadcastChannel('viewsync');
        channel.postMessage(event);
        channel.close();
      }
      
      // Fallback to localStorage
      localStorage.setItem('viewsync_event', JSON.stringify(event));
    } catch (error) {
      console.log('Error broadcasting sync event:', error);
    }
  }, []);

  // Listen for sync events from other windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'viewsync_event' && e.newValue) {
        try {
          const event = JSON.parse(e.newValue);
          if (event.windowId !== (window.name || 'main')) {
            handleSyncEvent(event);
          }
        } catch (error) {
          console.log('Error handling sync event:', error);
        }
      }
    };

    const handleBroadcastMessage = (event: MessageEvent) => {
      if (event.data && event.data.type && event.data.windowId !== (window.name || 'main')) {
        handleSyncEvent(event.data);
      }
    };

    // Listen for BroadcastChannel messages
    if (window.BroadcastChannel) {
      const channel = new BroadcastChannel('viewsync');
      channel.addEventListener('message', handleBroadcastMessage);
      
      return () => {
        channel.close();
      };
    } else {
      // Fallback to localStorage
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, []);

  // Handle sync events from other windows
  const handleSyncEvent = (event: any) => {
    try {
      switch (event.type) {
        case 'play':
          setIsPlaying(true);
          Object.values(playersRef.current).forEach(player => {
            if (player && player.playVideo) {
              player.playVideo();
            }
          });
          break;
        case 'pause':
          setIsPlaying(false);
          Object.values(playersRef.current).forEach(player => {
            if (player && player.pauseVideo) {
              player.pauseVideo();
            }
          });
          break;
        case 'seek':
          setCurrentTime(event.data.time);
          Object.values(playersRef.current).forEach(player => {
            if (player && player.seekTo) {
              player.seekTo(event.data.time, true);
            }
          });
          break;
      }
    } catch (error) {
      console.log('Error handling sync event:', error);
    }
  };

  // YouTube player state change callback
  const onPlayerStateChange = useCallback((videoId: string, event: any) => {
    try {
      // Only the first video (master) should control other windows
      const isFirstVideo = videos.length > 0 && videos[0].id === videoId;
      
      if (event.data === window.YT.PlayerState.PLAYING) {
        if (isFirstVideo) {
          setIsPlaying(true);
          Object.entries(playersRef.current).forEach(([playerId, player]) => {
            if (playerId !== videoId && player && player.playVideo) {
              player.playVideo();
            }
          });
          broadcastSyncEvent('play', { videoId });
        }
      } else if (event.data === window.YT.PlayerState.PAUSED) {
        if (isFirstVideo) {
          setIsPlaying(false);
          Object.entries(playersRef.current).forEach(([playerId, player]) => {
            if (playerId !== videoId && player && player.pauseVideo) {
              player.pauseVideo();
            }
          });
          broadcastSyncEvent('pause', { videoId });
        }
      } else if (event.data === window.YT.PlayerState.ENDED && loopEnabled) {
        // If video ends and loop is enabled, restart it
        const player = playersRef.current[videoId];
        if (player) {
          player.seekTo(0);
          player.playVideo();
        }
      }
    } catch (error) {
      console.log('Error in onPlayerStateChange:', error);
    }
  }, [broadcastSyncEvent, loopEnabled, videos]);

  // Copy share URL to clipboard
  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Share URL copied to clipboard!');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>ViewSyncBoost</h1>
        <p>Synchronized multi-video viewer</p>
      </header>

      <div className="controls">
        <div className="video-input">
          <input
            type="text"
            placeholder="Enter YouTube URL..."
            value={newVideoUrl}
            onChange={(e) => setNewVideoUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addVideo()}
          />
          <button onClick={addVideo}>Add Video</button>
        </div>

        {videos.length > 0 && (
          <div className="sync-controls">
            {!isSyncMode ? (
              <>
                <div className="players-status">
                  Players Ready: {readyPlayers.size}/{videos.length} | Available: {Object.keys(playersRef.current).length}/{videos.length}
                </div>
                <button
                  onClick={isPlaying ? pauseAll : playAll}
                  disabled={!isYouTubeApiReady || Object.keys(playersRef.current).length === 0}
                >
                  {isPlaying ? '⏸ Pause All' : '▶ Play All'}
                </button>
                <button onClick={syncToStart}>⏮ Sync to Start</button>
                <button onClick={syncToCurrentTime}>⏱ Sync to Current Time</button>
                <button 
                  onClick={() => setLoopEnabled(!loopEnabled)}
                  style={{
                    background: loopEnabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  🔁 Loop {loopEnabled ? 'ON' : 'OFF'}
                </button>
                <button onClick={openAllSyncWindows} style={{background: '#FF9800'}}>
                  🪟 Open All in Sync Windows
                </button>
                {videos.length === 1 && (
                  <>
                    <select
                      value={screenCount}
                      onChange={(event) => setScreenCount(Number(event.target.value))}
                      aria-label="Number of screens"
                    >
                      {[10, 15, 20, 25].map((count) => (
                        <option key={count} value={count}>{count} screens</option>
                      ))}
                    </select>
                    <button
                      onClick={() => openVideoInScreens(videos[0], screenCount)}
                      style={{background: '#E91E63'}}
                    >
                      🪟 Open Video in Screens
                    </button>
                  </>
                )}
                <div style={{background: '#2196F3', padding: '10px', borderRadius: '6px', marginTop: '10px'}}>
                  💡 <strong>Master Control:</strong> The first video (👑 MASTER) controls all other windows. 
                  Play/pause the master video to sync all windows!
                </div>
              </>
            ) : (
              <>
                <button onClick={isPlaying ? pauseAll : playAll}>
                  {isPlaying ? '⏸ Pause All' : '▶ Play All'}
                </button>
                <button onClick={syncToStart}>⏮ Sync to Start</button>
                <button onClick={syncToCurrentTime}>⏱ Sync to Current Time</button>
                <button 
                  onClick={() => setLoopEnabled(!loopEnabled)}
                  style={{
                    background: loopEnabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'
                  }}
                >
                  🔁 Loop {loopEnabled ? 'ON' : 'OFF'}
                </button>
                <div style={{background: '#4CAF50', padding: '10px', borderRadius: '6px'}}>
                  🔄 Sync Mode - This window is synchronized with others
                </div>
              </>
            )}
            <div className="time-display">
              Time: {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>
        )}

        {shareUrl && (
          <div className="share-section">
            <button onClick={copyShareUrl}>Copy Share URL</button>
            <input type="text" value={shareUrl} readOnly />
          </div>
        )}
      </div>

      <div className={`video-grid grid-${Math.min(videos.length, 4)}`}>
        {videos.map((video) => (
          <div key={video.id} className="video-container">
            <div className="video-header">
              <h3>
                {video.title}
                {videos.length > 0 && videos[0].id === video.id && (
                  <span style={{
                    background: '#4CAF50',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    marginLeft: '8px',
                    fontWeight: 'bold'
                  }}>
                    👑 MASTER
                  </span>
                )}
                {playingVideos.has(video.id) && (
                  <span style={{
                    background: '#FF5722',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    marginLeft: '8px',
                    fontWeight: 'bold',
                    animation: 'pulse 1s infinite'
                  }}>
                    ▶ PLAYING
                  </span>
                )}
              </h3>
              <div style={{display: 'flex', gap: '5px'}}>
                {!isSyncMode && (
                  <button 
                    onClick={() => openSyncWindow(video)}
                    style={{
                      background: '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '5px 10px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🪟
                  </button>
                )}
                <button 
                  className="remove-btn"
                  onClick={() => removeVideo(video.id)}
                >
                  ×
                </button>
              </div>
            </div>
            <div className="video-wrapper">
              <YouTubePlayer
                playerId={video.id}
                videoId={video.videoId}
                apiReady={isYouTubeApiReady}
                onPlayerReady={onPlayerReady}
                onPlayerStateChange={onPlayerStateChange}
                startTime={video.startTime}
              />
            </div>
            <div className="video-info">
              <small>Start: {video.startTime}s</small>
            </div>
          </div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="empty-state">
          <h2>Add YouTube videos to get started</h2>
          <p>Enter YouTube URLs above to create a synchronized multi-video experience</p>
        </div>
      )}

      {/* Bottom Control Bar */}
      {videos.length > 0 && (
        <div className="bottom-control-bar">
          <div className="control-group">
            <button 
              className="control-btn"
              onClick={() => setLoopEnabled(!loopEnabled)}
              style={{
                background: loopEnabled ? '#4CAF50' : 'rgba(255, 255, 255, 0.2)'
              }}
            >
              🔁
            </button>
            <span className="control-label">Loop</span>
          </div>

          <div className="control-group">
            <button 
              className="control-btn"
              onClick={syncToStart}
            >
              ⏮
            </button>
            <span className="control-label">Reset</span>
          </div>

          <div className="control-group">
            <button 
              className="control-btn play-pause-btn"
              onClick={isPlaying ? pauseAll : playAll}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <span className="control-label">{isPlaying ? 'Pause' : 'Play'}</span>
          </div>

          <div className="control-group">
            <button 
              className="control-btn"
              onClick={() => {
                if (window.confirm('Open all videos in separate synchronized windows?')) {
                  openAllSyncWindows();
                }
              }}
            >
              🔄
            </button>
            <span className="control-label">Sync</span>
          </div>

          <div className="control-group">
            <button 
              className="control-btn"
              onClick={syncToCurrentTime}
            >
              ⏱
            </button>
            <span className="control-label">Sync Time</span>
          </div>

          <div className="time-display-bottom">
            <span className="time-text">
              {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}
            </span>
            <div style={{fontSize: '10px', marginTop: '2px', opacity: 0.7}}>
              {playersReady}/{videos.length} ready
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
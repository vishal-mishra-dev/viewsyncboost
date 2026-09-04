import React, { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  playerId: string;
  videoId: string;
  apiReady: boolean;
  onPlayerReady: (videoId: string, event: any) => void;
  onPlayerStateChange: (videoId: string, event: any) => void;
  startTime?: number;
}

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

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  playerId,
  videoId,
  apiReady,
  onPlayerReady,
  onPlayerStateChange,
  startTime = 0
}) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPlayerReadyRef = useRef<boolean>(false);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onPlayerStateChangeRef = useRef(onPlayerStateChange);
  const [playerApiReady, setPlayerApiReady] = useState(Boolean(window.YT && window.YT.Player));

  onPlayerReadyRef.current = onPlayerReady;
  onPlayerStateChangeRef.current = onPlayerStateChange;

  useEffect(() => {
    let initTimeout: NodeJS.Timeout;

    const initializePlayer = () => {
      if (!window.YT || !window.YT.Player) {
        console.log('YouTube API not ready yet for video:', videoId);
        return;
      }

      setPlayerApiReady(true);

      // Don't destroy if player is already ready and video ID hasn't changed
      if (playerRef.current && isPlayerReadyRef.current) {
        console.log('Player already ready for video:', videoId);
        return;
      }

      if (playerRef.current) {
        console.log('Destroying existing player for video:', videoId);
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.log('Error destroying player:', error);
        }
        isPlayerReadyRef.current = false;
      }

      // Ensure container exists
      if (!containerRef.current) {
        console.log('Container not ready for video:', videoId);
        return;
      }

      try {
        console.log('Creating YouTube player for video:', videoId);

        // Add a small delay to prevent rapid-fire player creation
        if (initTimeout) {
          clearTimeout(initTimeout);
        }

        initTimeout = setTimeout(() => {
          if (!containerRef.current) return;

          playerRef.current = new window.YT.Player(containerRef.current, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            playerVars: {
              autoplay: 0,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              showinfo: 0,
              fs: 1,
              cc_load_policy: 0,
              iv_load_policy: 3,
              autohide: 0,
              vq: 'small',
              enablejsapi: 1,
              origin: window.location.origin
            },
          events: {
            onReady: (event: any) => {
              try {
                console.log('YouTube player ready for video:', videoId);
                isPlayerReadyRef.current = true;
                onPlayerReadyRef.current(playerId, event);
                if (startTime > 0) {
                  event.target.seekTo(startTime, true);
                }
              } catch (error) {
                console.log('Error in onReady for video', videoId, ':', error);
              }
            },
            onStateChange: (event: any) => {
              try {
                onPlayerStateChangeRef.current(playerId, event);
              } catch (error) {
                console.log('Error in onStateChange for video', videoId, ':', error);
              }
            },
            onError: (event: any) => {
              console.log('YouTube player error for video', videoId, ':', event.data);
              // Reset player ready state on error
              isPlayerReadyRef.current = false;
            }
          }
          });
        }, 100); // 100ms delay to prevent rapid creation
      } catch (error) {
        console.log('Error creating YouTube player for video', videoId, ':', error);
      }
    };

    // Wait for YouTube API to be ready
    if (window.YT && window.YT.Player) {
      console.log('YouTube API ready, initializing player for video:', videoId);
      initializePlayer();
    } else {
      console.log('Waiting for YouTube API to be ready for video:', videoId);
      // Set up callback for when API loads
      const originalCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API callback triggered for video:', videoId);
        if (originalCallback) originalCallback();
        setPlayerApiReady(true);
        initializePlayer();
      };
    }

    return () => {
      if (initTimeout) {
        clearTimeout(initTimeout);
      }
      if (playerRef.current && window.YT && window.YT.Player) {
        console.log('Cleaning up player for video:', videoId);
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.log('Error destroying player during cleanup:', error);
        }
        isPlayerReadyRef.current = false;
      }
    };
  }, [apiReady, playerId, videoId, startTime]);

  // Fallback: if YouTube API doesn't load, show simple iframe
  if ((!apiReady && !playerApiReady) || !window.YT || !window.YT.Player) {
    return (
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&modestbranding=1&rel=0&showinfo=0&fs=1`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={`YouTube video ${videoId}`}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0
      }}
    />
  );
};

export default YouTubePlayer;

import {
  ChevronLeft,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentItem } from "../types/content";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function isDirectVideo(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url);
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function Html5VideoPlayer({
  url,
  title,
  onBack,
}: { url: string; title: string; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
      setShowSpeedPicker(false);
    }, 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [resetHideTimer]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
    resetHideTimer();
  }

  function skip(sec: number) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec));
    resetHideTimer();
  }

  function changeSpeed(s: number) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSpeedPicker(false);
    resetHideTimer();
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      void el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen();
      setIsFullscreen(false);
    }
    resetHideTimer();
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: video player container
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onMouseMove={resetHideTimer}
      onTouchStart={resetHideTimer}
      onClick={resetHideTimer}
    >
      {/* Top bar — title + speed button */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onBack();
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          data-ocid="video.close_button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-white font-semibold text-sm flex-1 line-clamp-1">
          {title}
        </h1>

        {/* Speed button — top right corner */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSpeedPicker((p) => !p);
              resetHideTimer();
            }}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold min-w-[36px]"
            data-ocid="video.speed_button"
          >
            {speed}x
          </button>

          {/* Speed picker popover */}
          {showSpeedPicker && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: speed picker overlay
            <div
              className="absolute top-full right-0 mt-1 bg-black/90 rounded-xl p-2 z-20 flex flex-col gap-1 min-w-[72px] shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors text-left ${
                    speed === s
                      ? "bg-blue-600 text-white"
                      : "text-white hover:bg-white/20"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video element */}
      {/* biome-ignore lint/a11y/useMediaCaption: video player content */}
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-contain cursor-pointer"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        playsInline
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.stopPropagation();
            togglePlay();
          }
        }}
      />

      {/* Bottom controls — center play row + fullscreen */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: video controls container */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 px-4 py-4 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Centered play/skip controls */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <button
            type="button"
            onClick={() => skip(-10)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            data-ocid="video.secondary_button"
          >
            <RotateCcw className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="p-4 rounded-full bg-white/20 hover:bg-white/30 text-white"
            data-ocid="video.primary_button"
          >
            {playing ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 fill-white" />
            )}
          </button>
          <button
            type="button"
            onClick={() => skip(10)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            data-ocid="video.secondary_button"
          >
            <RotateCw className="h-6 w-6" />
          </button>
        </div>
        {/* Bottom row: fullscreen only */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            data-ocid="video.maximize_button"
          >
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function IframePlayer({
  src,
  title,
  onBack,
}: { src: string; title: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-black">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          data-ocid="video.close_button"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-white font-semibold text-sm flex-1 line-clamp-1">
          {title}
        </h1>
      </div>
      <iframe
        src={src}
        title={title}
        className="flex-1 w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}

export default function VideoPlayer({
  item,
  onBack,
}: { item: ContentItem; onBack: () => void }) {
  const url = item.url;
  const ytId = extractYouTubeId(url);
  if (ytId) {
    const embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`;
    return <IframePlayer src={embedUrl} title={item.name} onBack={onBack} />;
  }
  if (isDirectVideo(url))
    return <Html5VideoPlayer url={url} title={item.name} onBack={onBack} />;
  return <IframePlayer src={url} title={item.name} onBack={onBack} />;
}

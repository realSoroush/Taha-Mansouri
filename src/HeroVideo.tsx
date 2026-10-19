import { useEffect, useRef, useState } from 'react';
import { Maximize, PlayCircle } from 'lucide-react';
import { content as c } from './content';
import { heroVideoUrl } from './config';
import { enterVideoFullscreen } from './videoFullscreen';

type Quality = 'standard' | 'hd';
type Playback = { time: number; playing: boolean; volume: number; muted: boolean; rate: number };

function capturePlayback(video: HTMLVideoElement): Playback {
  return { time: Number.isFinite(video.currentTime) ? video.currentTime : 0,
    playing: !video.paused && !video.ended, volume: video.volume, muted: video.muted, rate: video.playbackRate };
}

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const resume = useRef<Playback | null>(null);
  const generation = useRef(0);
  const [quality, setQuality] = useState<Quality>('standard');
  const [switching, setSwitching] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [fullscreenError, setFullscreenError] = useState(false);
  const url = heroVideoUrl(c.hero.videoBucket, quality === 'hd' ? c.hero.videoHdPath : c.hero.videoPath);

  function changeQuality(next: Quality) {
    const element = video.current;
    if (!element || !ready || switching || next === quality) return;
    generation.current++;
    resume.current = capturePlayback(element);
    element.pause();
    setReady(false);
    setSwitching(true);
    setNotice('');
    setFullscreenError(false);
    setQuality(next);
  }

  function loadFailed() {
    generation.current++;
    setReady(false);
    setFullscreenError(false);
    if (quality === 'hd') {
      // Preserve the original snapshot if the new source never loaded.
      if (!resume.current && video.current) resume.current = capturePlayback(video.current);
      setNotice(c.hero.qualityFallback);
      setSwitching(true);
      setQuality('standard');
    } else {
      resume.current = null;
      setSwitching(false);
      setFailed(true);
    }
  }

  // A stalled quality request may never emit a media error. Bound the wait.
  useEffect(() => {
    if (!switching) return;
    const timeout = window.setTimeout(loadFailed, 15000);
    return () => window.clearTimeout(timeout);
  }, [switching, quality]);
  useEffect(() => () => { generation.current++; }, []);

  function metadataLoaded() {
    const element = video.current;
    if (!element) return;
    const saved = resume.current;
    if (saved) {
      element.volume = saved.volume;
      element.muted = saved.muted;
      element.playbackRate = saved.rate;
      const end = Number.isFinite(element.duration) ? Math.max(0, element.duration - 0.05) : Infinity;
      element.currentTime = Math.min(saved.time, end);
    }
    setReady(true);
  }

  function canPlay() {
    const element = video.current;
    const saved = resume.current;
    if (!element || !saved) return;
    resume.current = null;
    setSwitching(false);
    if (saved.playing) {
      const attempt = generation.current;
      // Some mobile browsers require another Play gesture after changing source.
      element.play().catch(() => {
        if (attempt === generation.current) setNotice(c.hero.qualityResume);
      });
    }
  }

  async function openFullscreen() {
    if (!video.current) return;
    setFullscreenError(false);
    try { await enterVideoFullscreen(video.current); }
    catch { setFullscreenError(true); }
  }

  function retry() {
    generation.current++;
    resume.current = null;
    setQuality('standard');
    setFailed(false);
    setReady(false);
    setSwitching(false);
    setNotice('');
    setFullscreenError(false);
  }

  return <div className="hero-video-slot">
    {url && !failed ? <>
      <video ref={video} className="hero-video" controls playsInline preload="metadata"
        poster={c.hero.photo || undefined} aria-label={c.hero.videoLabel}
        onLoadedMetadata={metadataLoaded} onCanPlay={canPlay} onError={loadFailed} src={url}>
        {c.hero.videoUnsupported}
      </video>
      <div className="video-toolbar" aria-busy={switching}>
        <select className="video-quality" aria-label={c.hero.qualityLabel} value={quality}
          disabled={!ready || switching} onChange={event => changeQuality(event.target.value as Quality)}>
          <option value="standard">{c.hero.qualityStandard}</option>
          <option value="hd">HD · 720p</option>
        </select>
        <button className="video-fullscreen" type="button" aria-label={c.hero.fullscreen} title={c.hero.fullscreen} onClick={openFullscreen} disabled={!ready || switching}>
          <Maximize size={18} aria-hidden="true"/><span>{c.hero.fullscreen}</span>
        </button>
      </div>
      {(switching || notice) && <p className="video-quality-status" role="status">{switching ? c.hero.qualityLoading : notice}</p>}
      {fullscreenError && <p className="video-fullscreen-error" role="status">{c.hero.fullscreenError}</p>}
    </> : <div className="video-unavailable"><PlayCircle size={48} strokeWidth={1}/><span>{failed ? c.hero.videoError : c.hero.videoPlaceholder}</span>{failed && <button className="text-link" type="button" onClick={retry}>{c.hero.videoRetry}</button>}</div>}
  </div>;
}

import { useRef, useState } from 'react';
import { Maximize, PlayCircle } from 'lucide-react';
import { content as c } from './content';
import { heroVideoUrl } from './config';
import { enterVideoFullscreen } from './videoFullscreen';

export function HeroVideo() {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const url = heroVideoUrl(c.hero.videoBucket, c.hero.videoPath);
  async function openFullscreen() {
    if (!video.current) return;
    setFullscreenError(false);
    try { await enterVideoFullscreen(video.current); }
    catch { setFullscreenError(true); }
  }
  return <div className="hero-video-slot">
    {url && !failed ? <>
    <video ref={video} className="hero-video" controls playsInline preload="metadata" poster={c.hero.photo || undefined} aria-label={c.hero.videoLabel} onLoadedMetadata={() => setReady(true)} onError={() => { setFailed(true); setReady(false); }} src={url}>
      {c.hero.videoUnsupported}
    </video>
    <div className="video-toolbar"><button className="video-fullscreen" type="button" onClick={openFullscreen} disabled={!ready}><Maximize size={18} aria-hidden="true"/>{c.hero.fullscreen}</button></div>
    {fullscreenError && <p className="video-fullscreen-error" role="status">{c.hero.fullscreenError}</p>}
    </> : <div className="video-unavailable"><PlayCircle size={48} strokeWidth={1}/><span>{failed ? c.hero.videoError : c.hero.videoPlaceholder}</span>{failed && <button className="text-link" type="button" onClick={() => { setFailed(false); setReady(false); setFullscreenError(false); }}>{c.hero.videoRetry}</button>}</div>}
  </div>;
}

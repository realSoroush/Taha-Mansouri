import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { content as c } from './content';
import { heroVideoUrl } from './config';

export function HeroVideo() {
  const [failed, setFailed] = useState(false);
  const url = heroVideoUrl(c.hero.videoBucket, c.hero.videoPath);
  return <div className="hero-video-slot">
    {url && !failed ? <video className="hero-video" controls playsInline preload="metadata" poster={c.hero.photo || undefined} aria-label={c.hero.videoLabel} onError={() => setFailed(true)} src={url}>
      {c.hero.videoUnsupported}
    </video> : <div className="video-unavailable"><PlayCircle size={48} strokeWidth={1}/><span>{failed ? c.hero.videoError : c.hero.videoPlaceholder}</span>{failed && <button className="text-link" type="button" onClick={() => setFailed(false)}>{c.hero.videoRetry}</button>}</div>}
  </div>;
}

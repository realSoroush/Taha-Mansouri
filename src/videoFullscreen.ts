/** Safari on iPhone exposes fullscreen on the video, not its wrapper. */
export type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitSupportsFullscreen?: boolean;
};

export async function enterVideoFullscreen(video: FullscreenVideo): Promise<void> {
  // Stay in the user's click gesture: do not await playback before this call.
  if (typeof video.webkitEnterFullscreen === 'function' && video.webkitSupportsFullscreen !== false) {
    try {
      video.webkitEnterFullscreen();
      return;
    } catch {
      // Some engines expose the prefixed method but support only the standard one.
    }
  }
  if (typeof video.requestFullscreen === 'function') {
    await video.requestFullscreen();
    return;
  }
  throw new Error('VIDEO_FULLSCREEN_UNAVAILABLE');
}

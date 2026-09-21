/**
 * Centralized Video URL Parser & Normalizer for Amin Raisat Hosiery
 * Supports:
 * - YouTube: watch?v=, youtu.be/, shorts/, embed/
 * - Vimeo: vimeo.com/{id}, player.vimeo.com/video/{id}
 * - Facebook: facebook.com/.../videos/, fb.watch/
 * - Instagram: instagram.com/p/{id}, instagram.com/reel/{id}, instagram.com/tv/{id}
 * - TikTok: tiktok.com/@user/video/{id}, tiktok.com/v/{id}
 * - Direct Video Files: .mp4, .webm, .ogg
 */

export type VideoProvider =
  | 'youtube'
  | 'vimeo'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'direct'
  | 'unsupported';

export type VideoType = 'iframe' | 'video' | 'unsupported';

export interface ParsedVideo {
  isValid: boolean;
  isSupported: boolean;
  provider: VideoProvider;
  type: VideoType;
  rawUrl: string;
  embedUrl?: string;
  directSrc?: string;
  videoId?: string;
  thumbnailUrl?: string;
  providerDisplayName: string;
  errorMessage?: string;
  warningMessage?: string;
}

export function parseVideoUrl(inputUrl?: string | null): ParsedVideo {
  const rawUrl = (inputUrl || '').trim();

  if (!rawUrl) {
    return {
      isValid: false,
      isSupported: false,
      provider: 'unsupported',
      type: 'unsupported',
      rawUrl: '',
      providerDisplayName: 'None',
      errorMessage: 'No video URL provided',
    };
  }

  // Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl);
  } catch {
    // If not a valid URL protocol, try prepending https://
    try {
      parsedUrl = new URL(`https://${rawUrl}`);
    } catch {
      return {
        isValid: false,
        isSupported: false,
        provider: 'unsupported',
        type: 'unsupported',
        rawUrl,
        providerDisplayName: 'Invalid URL',
        errorMessage: 'Invalid URL format',
      };
    }
  }

  const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // 1. DIRECT VIDEO FILES (.mp4, .webm, .ogg)
  const isDirectVideo = /\.(mp4|webm|ogg)($|\?)/i.test(pathname) || /\.(mp4|webm|ogg)($|\?)/i.test(rawUrl);
  if (isDirectVideo) {
    return {
      isValid: true,
      isSupported: true,
      provider: 'direct',
      type: 'video',
      rawUrl,
      directSrc: parsedUrl.toString(),
      providerDisplayName: 'Direct Video File (HTML5)',
    };
  }

  // 2. YOUTUBE
  // Domains: youtube.com, m.youtube.com, youtu.be, youtube-nocookie.com
  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be' || hostname === 'youtube-nocookie.com') {
    let videoId: string | null = null;

    if (hostname === 'youtu.be') {
      // youtu.be/VIDEO_ID
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        videoId = segments[0];
      }
    } else if (pathname.startsWith('/shorts/')) {
      // youtube.com/shorts/VIDEO_ID
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        videoId = segments[1];
      }
    } else if (pathname.startsWith('/embed/')) {
      // youtube.com/embed/VIDEO_ID
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length >= 2) {
        videoId = segments[1];
      }
    } else if (pathname === '/watch') {
      // youtube.com/watch?v=VIDEO_ID
      videoId = searchParams.get('v');
    }

    if (videoId && /^[\w-]{11}$/.test(videoId)) {
      return {
        isValid: true,
        isSupported: true,
        provider: 'youtube',
        type: 'iframe',
        rawUrl,
        videoId,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        providerDisplayName: 'YouTube',
      };
    }

    return {
      isValid: true,
      isSupported: false,
      provider: 'youtube',
      type: 'unsupported',
      rawUrl,
      providerDisplayName: 'YouTube',
      errorMessage: 'Could not extract valid 11-character YouTube video ID.',
    };
  }

  // 3. VIMEO
  // Domains: vimeo.com, player.vimeo.com
  if (hostname === 'vimeo.com' || hostname === 'player.vimeo.com') {
    let videoId: string | null = null;
    const vimeoMatch = pathname.match(/\/(?:video\/)?([0-9]{6,})/);
    if (vimeoMatch && vimeoMatch[1]) {
      videoId = vimeoMatch[1];
    }

    if (videoId) {
      return {
        isValid: true,
        isSupported: true,
        provider: 'vimeo',
        type: 'iframe',
        rawUrl,
        videoId,
        embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=1&dnt=1&playsinline=1`,
        providerDisplayName: 'Vimeo',
      };
    }

    return {
      isValid: true,
      isSupported: false,
      provider: 'vimeo',
      type: 'unsupported',
      rawUrl,
      providerDisplayName: 'Vimeo',
      errorMessage: 'Could not extract Vimeo video ID from URL.',
    };
  }

  // 4. FACEBOOK
  // Domains: facebook.com, web.facebook.com, fb.watch
  if (hostname === 'facebook.com' || hostname === 'web.facebook.com' || hostname === 'fb.watch') {
    const encodedUrl = encodeURIComponent(parsedUrl.toString());
    return {
      isValid: true,
      isSupported: true,
      provider: 'facebook',
      type: 'iframe',
      rawUrl,
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=0&autoplay=1`,
      providerDisplayName: 'Facebook Video',
      warningMessage: 'Facebook video embeds require the video privacy to be set to Public.',
    };
  }

  // 5. INSTAGRAM
  // Domains: instagram.com
  if (hostname === 'instagram.com') {
    // Matches /p/CODE/, /reel/CODE/, /tv/CODE/
    const instaMatch = pathname.match(/\/(p|reel|tv)\/([a-zA-Z0-9_-]+)/);
    if (instaMatch && instaMatch[2]) {
      const code = instaMatch[2];
      const kind = instaMatch[1];
      return {
        isValid: true,
        isSupported: true,
        provider: 'instagram',
        type: 'iframe',
        rawUrl,
        videoId: code,
        embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`,
        providerDisplayName: 'Instagram ' + (kind === 'reel' ? 'Reel' : 'Video'),
        warningMessage: 'Instagram embeds require public post permissions.',
      };
    }

    return {
      isValid: true,
      isSupported: false,
      provider: 'instagram',
      type: 'unsupported',
      rawUrl,
      providerDisplayName: 'Instagram',
      errorMessage: 'Instagram URL must be a public post, reel, or TV video link (e.g. /reel/CODE/).',
    };
  }

  // 6. TIKTOK
  // Domains: tiktok.com, vm.tiktok.com
  if (hostname === 'tiktok.com' || hostname === 'vm.tiktok.com') {
    // Standard: tiktok.com/@user/video/1234567890123456789
    const tiktokMatch = pathname.match(/\/video\/([0-9]+)/);
    if (tiktokMatch && tiktokMatch[1]) {
      const videoId = tiktokMatch[1];
      return {
        isValid: true,
        isSupported: true,
        provider: 'tiktok',
        type: 'iframe',
        rawUrl,
        videoId,
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        providerDisplayName: 'TikTok',
      };
    }

    return {
      isValid: true,
      isSupported: false,
      provider: 'tiktok',
      type: 'unsupported',
      rawUrl,
      providerDisplayName: 'TikTok',
      errorMessage: 'TikTok URL must be a direct video link containing /video/ID.',
    };
  }

  // UNSUPPORTED PROVIDER
  return {
    isValid: true,
    isSupported: false,
    provider: 'unsupported',
    type: 'unsupported',
    rawUrl,
    providerDisplayName: hostname,
    errorMessage: `Unsupported video platform: "${hostname}". Please provide YouTube, Vimeo, Facebook, Instagram, TikTok, or direct .mp4/.webm URL.`,
  };
}

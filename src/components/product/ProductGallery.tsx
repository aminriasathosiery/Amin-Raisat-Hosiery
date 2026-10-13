'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { ProductMedia } from '@/types';
import { Maximize2, X, Play, ChevronLeft, ChevronRight, RotateCcw, AlertCircle, ExternalLink } from 'lucide-react';

import { parseVideoUrl } from '@/lib/videoParser';

interface ProductGalleryProps {
  media: ProductMedia[];
  productName: string;
  selectedSleeve?: string;
  videoUrl?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({
  media,
  productName,
  selectedSleeve,
  videoUrl,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [hasPlaybackError, setHasPlaybackError] = useState(false);

  // Derive the active video URL from prop or media list
  const effectiveVideoUrl = useMemo(() => {
    if (videoUrl && videoUrl.trim()) return videoUrl.trim();
    const videoItem = media?.find((m) => m.type === 'video' || (m as any).media_type === 'video');
    return videoItem?.url ? videoItem.url.trim() : '';
  }, [videoUrl, media]);

  // Gallery items strictly contains PHOTOS (videos are never gallery items or thumbnails)
  const photoMediaList = useMemo(() => {
    let list: ProductMedia[] = (media || []).filter(
      (m) => m.type !== 'video' && (m as any).media_type !== 'video' && m.type !== 'size_guide' && (m as any).media_type !== 'size_guide'
    );

    if (list.length === 0) return [];

    const exactMatch = list.filter(
      (m) => !selectedSleeve || !m.variantSleeve || m.variantSleeve === 'All' || m.variantSleeve === selectedSleeve
    );

    if (exactMatch.length > 0) {
      const others = list.filter((m) => !exactMatch.includes(m));
      return [...exactMatch, ...others];
    }

    return list;
  }, [media, selectedSleeve]);

  // When sleeve switches, reset photo selection and return to photo view
  useEffect(() => {
    setSelectedIndex(0);
    setIsVideoPlaying(false);
    setHasPlaybackError(false);
  }, [selectedSleeve]);

  const handlePrev = useCallback(() => {
    setIsVideoPlaying(false);
    setHasPlaybackError(false);
    setSelectedIndex((prev) => (prev === 0 ? photoMediaList.length - 1 : prev - 1));
  }, [photoMediaList.length]);

  const handleNext = useCallback(() => {
    setIsVideoPlaying(false);
    setHasPlaybackError(false);
    setSelectedIndex((prev) => (prev === photoMediaList.length - 1 ? 0 : prev + 1));
  }, [photoMediaList.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomOpen) {
          setIsZoomOpen(false);
          return;
        }
        if (isVideoPlaying) {
          setIsVideoPlaying(false);
          setHasPlaybackError(false);
          return;
        }
      }
      if (!isZoomOpen && !isVideoPlaying) {
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isZoomOpen, isVideoPlaying, handlePrev, handleNext]);

  // Lock scroll on zoom
  useEffect(() => {
    if (isZoomOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isZoomOpen]);

  const activePhoto = photoMediaList[selectedIndex] || photoMediaList[0];
  const parsedVideo = useMemo(() => {
    return effectiveVideoUrl ? parseVideoUrl(effectiveVideoUrl) : null;
  }, [effectiveVideoUrl]);

  return (
    <div className="w-full space-y-4 select-none">
      {/* Main Product Media Container (Exact same dimensions for Photo & Video) */}
      <div className="relative w-full aspect-square sm:aspect-[4/4.2] md:aspect-square bg-white rounded-2xl overflow-hidden border border-[#D8D0C3] flex items-center justify-center p-2 sm:p-4 group shadow-sm">
        {isVideoPlaying && parsedVideo ? (
          /* Inline Video Player: Replaces product image within the exact same container */
          <div className="relative w-full h-full flex items-center justify-center bg-black rounded-xl overflow-hidden animate-in fade-in duration-200">
            {!hasPlaybackError && parsedVideo.isSupported && parsedVideo.type === 'iframe' && parsedVideo.embedUrl ? (
              <iframe
                src={parsedVideo.embedUrl}
                title={`${productName} Video (${parsedVideo.providerDisplayName})`}
                className="w-full h-full border-0 rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                onError={() => setHasPlaybackError(true)}
              />
            ) : !hasPlaybackError && parsedVideo.isSupported && parsedVideo.type === 'video' && parsedVideo.directSrc ? (
              <video
                src={parsedVideo.directSrc}
                controls
                playsInline
                preload="metadata"
                autoPlay
                onError={() => setHasPlaybackError(true)}
                className="w-full h-full object-contain rounded-xl"
                poster={activePhoto?.url || '/images/products/sleevless high.jpeg'}
              />
            ) : (
              /* Graceful Fallback if provider blocks playback, unhandled error, or unsupported */
              <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3 max-w-sm">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-rose-400">
                  Video unavailable or embedding restricted
                </p>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {parsedVideo.errorMessage ||
                    `${parsedVideo.providerDisplayName} restricted direct playback or the video is currently unavailable.`}
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVideoPlaying(false);
                      setHasPlaybackError(false);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Return to Product Photo
                  </button>
                  {parsedVideo.rawUrl && (
                    <a
                      href={parsedVideo.rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-[#C99A3D] hover:bg-[#b0842f] text-black rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Watch on {parsedVideo.providerDisplayName}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Back to Photo Button */}
            <button
              type="button"
              onClick={() => {
                setIsVideoPlaying(false);
                setHasPlaybackError(false);
              }}
              className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/80 hover:bg-black text-white text-xs font-semibold rounded-xl border border-white/20 backdrop-blur-md shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
              aria-label="Back to product photo"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#C99A3D]" />
              <span>Back to Photo</span>
            </button>
          </div>
        ) : (
          /* Primary Product Image + Optional Play Overlay */
          <div className="relative w-full h-full flex items-center justify-center">
            <Image
              src={activePhoto?.url || '/images/products/sleevless high.jpeg'}
              alt={activePhoto?.alt || productName}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 650px"
              className="object-contain object-center w-full h-full transition-opacity duration-300"
            />

            {/* Subtle, Elegant Play Icon Overlay when a valid supported video exists */}
            {effectiveVideoUrl && parsedVideo && parsedVideo.isValid && parsedVideo.isSupported && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setHasPlaybackError(false);
                  setIsVideoPlaying(true);
                }}
                className="absolute inset-0 m-auto w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#182B3D]/80 hover:bg-[#182B3D] text-white border border-[#C99A3D] flex items-center justify-center shadow-lg hover:shadow-xl backdrop-blur-xs transition-all duration-300 hover:scale-110 active:scale-95 z-10 group/play cursor-pointer"
                aria-label="Play product video"
                title="Play product video"
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-[#C99A3D] text-[#C99A3D] ml-0.5 transition-transform duration-300 group-hover/play:scale-110" />
              </button>
            )}
          </div>
        )}

        {/* Fullscreen Enlarge Trigger (Only for photos) */}
        {!isVideoPlaying && (
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            className="absolute top-3.5 right-3.5 p-2.5 bg-white/90 hover:bg-[#EEE8DC] text-[#1D2730] hover:text-[#C99A3D] rounded-xl border border-[#D8D0C3] shadow-xs opacity-85 group-hover:opacity-100 transition-all hover:scale-105 z-10"
            aria-label="Enlarge image"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {/* Prev / Next Carousel Arrows (Only when multiple photos exist and video is not playing) */}
        {!isVideoPlaying && photoMediaList.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-[#EEE8DC] rounded-full flex items-center justify-center text-[#1D2730] hover:text-[#C99A3D] border border-[#D8D0C3] shadow-sm transition-all active:scale-95 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white/90 hover:bg-[#EEE8DC] rounded-full flex items-center justify-center text-[#1D2730] hover:text-[#C99A3D] border border-[#D8D0C3] shadow-sm transition-all active:scale-95 z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Navigation (Strictly Photos Only) */}
      {photoMediaList.length > 1 && (
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
          {photoMediaList.map((item, idx) => (
            <button
              key={item.id || idx}
              onClick={() => {
                setSelectedIndex(idx);
                setIsVideoPlaying(false);
              }}
              className={`relative w-20 h-20 sm:w-22 sm:h-22 flex-shrink-0 rounded-xl overflow-hidden border bg-white p-1 transition-all duration-200 ${
                !isVideoPlaying && selectedIndex === idx
                  ? 'border-[#C99A3D] ring-2 ring-[#C99A3D]/30 shadow-xs'
                  : 'border-[#D8D0C3] opacity-70 hover:opacity-100 hover:border-[#C99A3D]/40'
              }`}
            >
              <div className="relative w-full h-full">
                <Image
                  src={item.url}
                  alt={item.alt || `${productName} thumbnail ${idx + 1}`}
                  fill
                  loading="lazy"
                  sizes="90px"
                  quality={75}
                  className="object-contain object-center w-full h-full"
                />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Zoom Modal */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-5 right-5 p-2.5 bg-[#23384D] hover:bg-[#182B3D] text-white hover:text-[#C99A3D] rounded-full border border-white/20 shadow-lg transition-transform hover:scale-105 z-50"
            aria-label="Close zoom"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative w-full max-w-4xl max-h-[85vh] aspect-square flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={activePhoto?.url || '/images/products/sleevless high.jpeg'}
              alt={activePhoto?.alt || productName}
              fill
              className="object-contain object-center"
            />
          </div>
        </div>
      )}
    </div>
  );
};

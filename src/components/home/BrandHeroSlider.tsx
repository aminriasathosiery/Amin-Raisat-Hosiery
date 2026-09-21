'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useStore } from '@/context/StoreContext';
import { HeroSlide } from '@/types';
import { INITIAL_HERO_SLIDES } from '@/data/initialData';

const DESKTOP_BANNER_WIDTH = 1920;
const DESKTOP_BANNER_HEIGHT = 800;
const MOBILE_BANNER_WIDTH = 1080;
const MOBILE_BANNER_HEIGHT = 1350;

const SLIDER_ASSET_VERSION = '20260922_v2';

const getVersionedSrc = (src: string): string => {
  if (!src) return src;
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  const separator = src.includes('?') ? '&' : '?';
  return `${src}${separator}v=${SLIDER_ASSET_VERSION}`;
};

export const BrandHeroSlider: React.FC = () => {
  const { heroSlides } = useStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Separate Desktop and Mobile slides
  const allSlides = heroSlides && heroSlides.length > 0 ? heroSlides : INITIAL_HERO_SLIDES;

  const desktopSlides: HeroSlide[] = useMemo(() => {
    const list = allSlides.filter(
      (s) => s.isActive !== false && (s.deviceType === 'desktop' || !s.deviceType)
    );
    return list.length > 0
      ? list
      : INITIAL_HERO_SLIDES.filter((s) => s.deviceType === 'desktop' || !s.deviceType);
  }, [allSlides]);

  const mobileSlides: HeroSlide[] = useMemo(() => {
    const list = allSlides.filter(
      (s) => s.isActive !== false && s.deviceType === 'mobile'
    );
    return list.length > 0
      ? list
      : INITIAL_HERO_SLIDES.filter((s) => s.deviceType === 'mobile');
  }, [allSlides]);

  const maxSlidesCount = Math.max(desktopSlides.length, mobileSlides.length, 1);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev >= maxSlidesCount - 1 ? 0 : prev + 1));
  }, [maxSlidesCount]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev === 0 ? maxSlidesCount - 1 : prev - 1));
  }, [maxSlidesCount]);

  // Premium slow auto-advance timer (5.5 seconds per slide)
  useEffect(() => {
    if (maxSlidesCount <= 1 || isPaused) return;

    const timer = setInterval(() => {
      nextSlide();
    }, 5500);

    return () => clearInterval(timer);
  }, [maxSlidesCount, isPaused, nextSlide]);

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section
      aria-label="Amin Raisat Hosiery Campaign Banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full select-none bg-[#F7F3EA]"
    >
      {/* Container with responsive margins so rounded edges are visible and framed naturally */}
      <div className="mx-auto w-full md:w-[calc(100%-48px)] max-w-[1240px] px-3 sm:px-4 md:px-0 pt-2.5 sm:pt-3 md:pt-4 pb-2 md:pb-3">
        
        {/* ========================================================================= */}
        {/* 1. DESKTOP HERO VIEWPORT (Hidden on mobile < md) */}
        {/* ========================================================================= */}
        <div className="hidden md:block relative w-full aspect-[1920/800] rounded-2xl lg:rounded-[20px] overflow-hidden border border-[#D8D0C3] shadow-sm bg-white group">
          {desktopSlides.map((slide, idx) => {
            const isCurrent = (currentSlide % desktopSlides.length) === idx;
            const rawSrc = slide.desktopImage || `/slider ${idx + 1}.png`;
            const imageSrc = getVersionedSrc(rawSrc);

            return (
              <div
                key={slide.id || `desktop-${idx}`}
                aria-hidden={!isCurrent}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out overflow-hidden ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Link
                  href={slide.link || slide.buttonLink || '/shop'}
                  className="block w-full h-full cursor-pointer overflow-hidden rounded-2xl lg:rounded-[20px] bg-white"
                  tabIndex={isCurrent ? 0 : -1}
                >
                  <Image
                    src={imageSrc}
                    alt={slide.title || `Amin Raisat Hosiery Campaign ${idx + 1}`}
                    fill
                    priority={false}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    sizes="(max-width: 1280px) 100vw, 1240px"
                    quality={85}
                    className="object-cover w-full h-full rounded-2xl lg:rounded-[20px]"
                  />
                </Link>
              </div>
            );
          })}

          {/* Desktop Navigation Arrows */}
          {desktopSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevSlide();
                }}
                aria-label="Previous Slide"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-[#1C2230]/75 hover:bg-[#1C2230] text-white backdrop-blur-sm transition-all shadow-md opacity-0 group-hover:opacity-90 hover:!opacity-100 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  nextSlide();
                }}
                aria-label="Next Slide"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 rounded-full bg-[#1C2230]/75 hover:bg-[#1C2230] text-white backdrop-blur-sm transition-all shadow-md opacity-0 group-hover:opacity-90 hover:!opacity-100 hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Desktop Indicator Dots */}
              <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#1C2230]/65 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20 shadow-sm">
                {desktopSlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      (currentSlide % desktopSlides.length) === idx
                        ? 'w-7 bg-[#C59B27]'
                        : 'w-2 bg-white/50 hover:bg-white/90'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. MOBILE HERO VIEWPORT (Visible on mobile < md) */}
        {/* ========================================================================= */}
        <div className="block md:hidden relative w-full aspect-[1080/1350] rounded-xl sm:rounded-2xl overflow-hidden border border-[#D8D0C3] shadow-xs bg-white">
          {mobileSlides.map((slide, idx) => {
            const isCurrent = (currentSlide % mobileSlides.length) === idx;
            const rawSrc = slide.mobileImage || slide.desktopImage || `/mobile slider ${idx + 1}.png`;
            const imageSrc = getVersionedSrc(rawSrc);

            return (
              <div
                key={slide.id || `mobile-${idx}`}
                aria-hidden={!isCurrent}
                className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out overflow-hidden ${
                  isCurrent ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Link
                  href={slide.link || slide.buttonLink || '/shop'}
                  className="block w-full h-full cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl bg-white"
                  tabIndex={isCurrent ? 0 : -1}
                >
                  <Image
                    src={imageSrc}
                    alt={slide.title || `Amin Raisat Hosiery Mobile Banner ${idx + 1}`}
                    fill
                    priority={idx === 0}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    sizes="(max-width: 768px) 100vw, 1080px"
                    quality={85}
                    className="object-cover w-full h-full rounded-xl sm:rounded-2xl"
                  />
                </Link>
              </div>
            );
          })}

          {/* Mobile Indicator Dots */}
          {mobileSlides.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-[#1C2230]/65 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20 shadow-sm">
              {mobileSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentSlide(idx);
                  }}
                  aria-label={`Go to mobile slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    (currentSlide % mobileSlides.length) === idx
                      ? 'w-5 bg-[#C59B27]'
                      : 'w-1.5 bg-white/50 hover:bg-white/90'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

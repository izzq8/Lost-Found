"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageGalleryProps {
  images: { url: string; alt: string }[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  if (images.length === 0) return null;

  // Single image — no navigation
  if (images.length === 1) {
    return (
      <div className="bg-slate-50 rounded-2xl overflow-hidden relative" style={{ height: "clamp(200px, 40vw, 400px)" }}>
        <Image
          src={images[0].url}
          alt={images[0].alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 66vw"
          priority
        />
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Main Image Container */}
      <div className="bg-slate-50 rounded-2xl overflow-hidden relative" style={{ height: "clamp(200px, 40vw, 400px)" }}>
        {images.map((img, idx) => (
          <Image
            key={idx}
            src={img.url}
            alt={img.alt}
            fill
            className={`object-contain transition-opacity duration-300 ${
              idx === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 768px) 100vw, 66vw"
            priority={idx === 0}
          />
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg flex items-center justify-center text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer"
        aria-label="Foto sebelumnya"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={goNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-white/50 shadow-lg flex items-center justify-center text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer"
        aria-label="Foto berikutnya"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot Indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
              idx === currentIndex
                ? "bg-orange-500 w-5"
                : "bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={`Foto ${idx + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}

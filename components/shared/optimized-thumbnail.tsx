import Image from "next/image";
import { Package } from "lucide-react";
import { isRenderableImageUrl } from "@/lib/utils/image-client";

interface OptimizedThumbnailProps {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  fallbackAlt?: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
}

export function OptimizedThumbnail({
  src,
  fallbackSrc,
  alt,
  fallbackAlt,
  className = "relative overflow-hidden bg-slate-50",
  imageClassName = "object-cover",
  sizes = "96px",
  priority = false,
}: OptimizedThumbnailProps) {
  const imageSrc = isRenderableImageUrl(src) ? src : isRenderableImageUrl(fallbackSrc) ? fallbackSrc : null;
  const imageAlt = imageSrc === src ? alt : fallbackAlt ?? alt;
  const unoptimized = !!imageSrc && (imageSrc.startsWith("blob:") || imageSrc.startsWith("data:"));

  return (
    <div className={className}>
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized}
          className={imageClassName}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Package size={18} className="text-slate-300" />
        </div>
      )}
    </div>
  );
}

import Image from "next/image";
import { Package } from "lucide-react";
import { isHttpImageUrl } from "@/lib/utils/image-client";

interface CategoryIconProps {
  name: string;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  /** When true, image fills its parent container (w-full h-full object-cover) instead of using fixed size */
  fill?: boolean;
}

/**
 * Renders the category icon:
 * - If imageUrl is a valid remote URL → shows the uploaded image
 * - Otherwise → fallback to Package icon
 * 
 * Use fill=true when you want the image to fill its parent container
 * (e.g., in item cards). Use fill=false (default) for inline icons.
 */
export function CategoryIcon({
  name,
  imageUrl,
  size = 24,
  className = "",
  fill = false,
}: CategoryIconProps) {
  const validImageUrl = isHttpImageUrl(imageUrl) ? imageUrl : null;

  if (validImageUrl) {
    if (fill) {
      return (
        <Image
          src={validImageUrl}
          alt={name}
          fill
          sizes="96px"
          className={`w-full h-full object-contain ${className}`}
        />
      );
    }
    return (
      <Image
        src={validImageUrl}
        alt={name}
        width={size}
        height={size}
        className={`object-cover rounded ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return <Package size={size} className={className} />;
}

import { Package } from "lucide-react";

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
  const isValidUrl =
    imageUrl &&
    (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"));

  if (isValidUrl) {
    if (fill) {
      return (
        <img
          src={imageUrl}
          alt={name}
          className={`w-full h-full object-contain ${className}`}
        />
      );
    }
    return (
      <img
        src={imageUrl}
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

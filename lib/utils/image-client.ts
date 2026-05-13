export const CLIENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const CLIENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function isHttpImageUrl(url?: string | null) {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

export function isRenderableImageUrl(url?: string | null) {
  return !!url && (isHttpImageUrl(url) || url.startsWith("blob:") || url.startsWith("data:image/"));
}

export function createImagePreview(file: File) {
  return URL.createObjectURL(file);
}

export function revokeImagePreview(url?: string | null) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

export async function prepareImageForUpload(
  file: File,
  {
    maxDimension = 1600,
    quality = 0.82,
    maxBytes = CLIENT_IMAGE_MAX_BYTES,
  }: {
    maxDimension?: number;
    quality?: number;
    maxBytes?: number;
  } = {}
) {
  if (!CLIENT_IMAGE_TYPES.includes(file.type as (typeof CLIENT_IMAGE_TYPES)[number])) {
    throw new Error(`Format "${file.name}" tidak didukung.`);
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  const image = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });

  if (!blob) return file;

  const optimized =
    blob.size < file.size || file.size > maxBytes
      ? new File([blob], replaceExtension(file.name, "webp"), {
          type: "image/webp",
          lastModified: Date.now(),
        })
      : file;

  if (optimized.size > maxBytes) {
    throw new Error(`File "${file.name}" masih melebihi 5MB setelah dikompresi.`);
  }

  return optimized;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Gagal membaca gambar "${file.name}".`));
    };
    image.src = url;
  });
}

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  return `${baseName}.${extension}`;
}

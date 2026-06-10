"use client";

import Cropper, { Area } from "react-easy-crop";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, RotateCcw, Upload, X } from "lucide-react";
import { uploadImage } from "@/lib/api";
import { cn } from "@/lib/utils";

type UploadType = "product_image" | "profile_picture" | "stall_banner" | "vendor_logo" | "package_photo" | "advertisement_banner" | "exhibition_banner";

type CropPreset = {
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  minWidth: number;
  minHeight: number;
  label: string;
};

const PRESETS: Record<"product" | "profile" | "banner" | "advertisement" | "logo" | "package", CropPreset> = {
  product: {
    aspect: 4 / 5,
    outputWidth: 1200,
    outputHeight: 1500,
    minWidth: 800,
    minHeight: 1000,
    label: "4:5 product image"
  },
  profile: {
    aspect: 1,
    outputWidth: 512,
    outputHeight: 512,
    minWidth: 300,
    minHeight: 300,
    label: "square profile picture"
  },
  banner: {
    aspect: 16 / 9,
    outputWidth: 1600,
    outputHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    label: "16:9 stall banner"
  },
  advertisement: {
    aspect: 16 / 5,
    outputWidth: 1600,
    outputHeight: 500,
    minWidth: 1200,
    minHeight: 375,
    label: "16:5 advertisement banner"
  },
  logo: {
    aspect: 1,
    outputWidth: 512,
    outputHeight: 512,
    minWidth: 300,
    minHeight: 300,
    label: "square vendor logo"
  },
  package: {
    aspect: 4 / 3,
    outputWidth: 1200,
    outputHeight: 900,
    minWidth: 800,
    minHeight: 600,
    label: "package proof photo"
  }
};

export function ImageCropUpload({
  uploadType,
  preset = "product",
  value,
  onUploaded,
  label = "Upload image",
  className
}: {
  uploadType: UploadType;
  preset?: keyof typeof PRESETS;
  value?: string;
  onUploaded: (url: string) => void;
  label?: string;
  className?: string;
}) {
  const cropPreset = PRESETS[preset];
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState(value ?? "");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setPreviewUrl(value ?? "");
  }, [value]);

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    };
  }, [sourceUrl]);

  const helperText = useMemo(() => {
    if (preset === "product") {
      return "JPG, PNG, or WebP. Max 5MB. Crop output: 1200 x 1500.";
    }
    if (preset === "banner") {
      return "JPG, PNG, or WebP. Max 5MB. Crop output: 1600 x 900.";
    }
    if (preset === "advertisement") {
      return "JPG, PNG, or WebP. Max 5MB. Crop output: 1600 x 500. Keep important text within the center area.";
    }
    return "JPG, PNG, or WebP. Max 5MB. Crop output: 512 x 512.";
  }, [preset]);

  const selectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setWarning("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Upload JPG, PNG, or WebP images only.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const dimensions = await readImageDimensions(objectUrl);
    if (dimensions.width < cropPreset.minWidth || dimensions.height < cropPreset.minHeight) {
      setWarning(`Recommended minimum is ${cropPreset.minWidth} x ${cropPreset.minHeight}. This image may look soft after cropping.`);
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(objectUrl);
    setSourceFileName(file.name);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const uploadCroppedImage = async () => {
    if (!sourceUrl || !croppedAreaPixels) {
      setError("Choose and crop an image first.");
      return;
    }
    setIsUploading(true);
    setError("");
    try {
      const blob = await cropImageToBlob(sourceUrl, croppedAreaPixels, cropPreset.outputWidth, cropPreset.outputHeight);
      const response = await uploadImage(uploadType, blob);
      setPreviewUrl(response.url);
      onUploaded(response.url);
      setSourceUrl("");
      setSourceFileName("");
      setWarning("");
    } catch (errorValue) {
      setError(errorValue instanceof Error ? errorValue.message : "Could not upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("rounded-[22px] border border-[color:var(--border)] bg-[var(--surface)] p-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-[var(--text)]">{label}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[var(--muted)]">{helperText}</p>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm font-black text-[var(--text)] transition hover:text-[var(--gold)]">
          <ImagePlus className="h-4 w-4" />
          Choose
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectImage} />
        </label>
      </div>

      {previewUrl ? (
        <div className="mt-4 overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-[var(--bg-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded preview"
            className={cn("w-full object-cover", preset === "advertisement" ? "aspect-[16/5]" : preset === "banner" ? "aspect-video" : preset === "profile" || preset === "logo" ? "aspect-square" : preset === "package" ? "aspect-[4/3]" : "aspect-[4/5]")}
          />
        </div>
      ) : null}

      {sourceUrl ? (
        <div className="mt-4">
          <div className="relative h-[360px] overflow-hidden rounded-[18px] border border-[color:var(--border)] bg-slate-950">
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={cropPreset.aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-1 items-center gap-3 text-sm font-semibold text-[var(--muted)]">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-[var(--coral)]"
              />
            </label>
            <button type="button" onClick={() => setZoom(1)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--border)] px-3 text-sm font-black text-[var(--text)]">
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              disabled={isUploading}
              onClick={uploadCroppedImage}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--coral)] px-4 text-sm font-black text-white disabled:opacity-60"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "Uploading..." : "Crop & Upload"}
            </button>
            <button type="button" onClick={() => setSourceUrl("")} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[color:var(--border)] px-3 text-[var(--muted)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{sourceFileName ? `Selected: ${sourceFileName}` : cropPreset.label}</p>
        </div>
      ) : null}

      {warning ? <p className="mt-3 rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-200">{warning}</p> : null}
      {error ? <p className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}

function readImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  });
}

async function cropImageToBlob(src: string, cropArea: Area, outputWidth: number, outputHeight: number): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare image crop.");
  context.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    outputWidth,
    outputHeight
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create cropped image."));
    }, "image/jpeg", 0.9);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}




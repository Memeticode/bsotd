"use client";

import { useState } from "react";

interface StoryImageProps {
  src: string;
  className?: string;
  /** e.g. "Image: CNN" */
  title?: string;
  /** "eager" for an image at the top of the page. */
  loading?: "lazy" | "eager";
}

/**
 * A story's image, loaded from its outlet. Outlets move and block images,
 * so one that doesn't load is left out rather than shown broken. It's
 * decorative: the headline beside it says what the story is.
 */
export function StoryImage({ src, className, title, loading = "lazy" }: StoryImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  // A plain img, not next/image: outlets' images come from any domain.
  return (
    <img
      src={src}
      alt=""
      title={title}
      className={className}
      loading={loading}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      // An image that failed before the page hydrated fired its error event
      // before anything listened for it.
      ref={(image) => {
        if (image?.complete && image.naturalWidth === 0) {
          setFailed(true);
        }
      }}
    />
  );
}

import type { VideoMetadata } from './ffprobe.service';

export interface HlsVariant {
  index: number;
  label: string;
  width: number;
  height: number;
  bitrate: string;
  bandwidth: number;
}

/**
 * Encode within 16:9 target bounding boxes while preserving the source's aspect ratio.
 * Ultra-wide 1280x544 footage should keep 1280x544 rather than only 854x362;
 * labels describe actual output heights (544p / 362p, not misleading 720p / 480p).
 * Never enlarge source dimensions.
 */
export function selectHlsVariants(
  source: Pick<VideoMetadata, 'width' | 'height'>,
): HlsVariant[] {
  if (source.width < 2 || source.height < 2)
    throw new Error('Invalid video dimensions');
  const presets = [
    { w: 1920, h: 1080, bitrate: '5000k', bandwidth: 5200000 },
    { w: 1280, h: 720, bitrate: '2800k', bandwidth: 3000000 },
    { w: 854, h: 480, bitrate: '1400k', bandwidth: 1600000 },
  ];
  const variants: Omit<HlsVariant, 'index'>[] = [];
  const dimensions = new Set<string>();
  for (const preset of presets) {
    // Tier selection by source width also supports letterboxed/cinematic video.
    if (source.width < preset.w) continue;
    const factor = Math.min(
      1,
      preset.w / source.width,
      preset.h / source.height,
    );
    const width = Math.max(2, Math.floor((source.width * factor) / 2) * 2);
    const height = Math.max(2, Math.floor((source.height * factor) / 2) * 2);
    const key = `${width}x${height}`;
    if (dimensions.has(key)) continue;
    dimensions.add(key);
    variants.push({
      width,
      height,
      label: `${height}p`,
      bitrate: preset.bitrate,
      bandwidth: preset.bandwidth,
    });
  }
  // Preserve the native image when it doesn't fit any predefined width-based tier
  // (e.g. portrait uploads or videos narrower than 854px).
  const nativeWidth = Math.floor(source.width / 2) * 2;
  const nativeHeight = Math.floor(source.height / 2) * 2;
  const nativeKey = `${nativeWidth}x${nativeHeight}`;
  if (!dimensions.has(nativeKey)) {
    variants.unshift({
      width: nativeWidth,
      height: nativeHeight,
      label: `${nativeHeight}p`,
      bitrate: '2800k',
      bandwidth: 3000000,
    });
  }
  return variants.map((variant, index) => ({ ...variant, index }));
}

export interface ContentImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface VideoMetadata {
  youtubeId: string;
  title: string;
  description: string;
  uploadDate: string;
  duration: string;
  thumbnail: ContentImage;
}

export const DEFAULT_SOCIAL_IMAGE: ContentImage = {
  src: '/images/social/site.jpg',
  alt: 'A paper scroll whose ink lines turn into a network of software nodes',
  width: 1200,
  height: 630,
};

export function getPostImage(post: {
  image?: ContentImage;
  videos?: VideoMetadata[];
}): ContentImage {
  return post.image ?? post.videos?.[0]?.thumbnail ?? DEFAULT_SOCIAL_IMAGE;
}

export function durationToSeconds(duration: string): number {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;

  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

export function durationToWatchMinutes(duration?: string): number | null {
  if (!duration) return null;
  const seconds = durationToSeconds(duration);
  return seconds > 0 ? Math.max(1, Math.floor(seconds / 60)) : null;
}

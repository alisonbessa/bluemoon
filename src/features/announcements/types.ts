export interface Announcement {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  publishedAt: string | Date | null;
}

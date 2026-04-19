import type { RoadmapCategory, RoadmapSource, RoadmapStatus } from "@/db/schema/roadmap";

export interface RoadmapAuthor {
  id: string;
  name: string | null;
  image: string | null;
}

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  source: RoadmapSource;
  category: RoadmapCategory | null;
  upvotes: number;
  commentsCount: number;
  createdAt: string;
  implementedAt: string | null;
  adminNotes?: string | null;
  author: RoadmapAuthor | null;
  hasVoted: boolean;
}

export interface RoadmapComment {
  id: string;
  content: string;
  createdAt: string;
  author: RoadmapAuthor | null;
  isTeam: boolean;
  upvotes: number;
  hasVoted: boolean;
}

export const CATEGORY_LABELS: Record<RoadmapCategory, string> = {
  ux: "UX e Design",
  ai: "IA",
  reports: "Relatórios",
  mobile: "Mobile",
  integrations: "Integrações",
  performance: "Performance",
  security: "Segurança",
  other: "Outros",
};

export interface SimilarityMatchItem {
  id: string;
  score: number;
  reason: string;
  item: {
    id: string;
    title: string;
    status: RoadmapStatus;
    upvotes: number;
  } | null;
}

export const STATUS_LABELS: Record<RoadmapStatus, string> = {
  voting: "Em votação",
  planned: "Planejado",
  in_progress: "Em desenvolvimento",
  implemented: "Implementado",
};

export const STATUS_DESCRIPTIONS: Record<RoadmapStatus, string> = {
  voting: "Ideia sob avaliação da comunidade",
  planned: "Aprovado e no backlog",
  in_progress: "Sendo construído agora",
  implemented: "Já disponível no produto",
};

export const STATUS_STYLES: Record<RoadmapStatus, string> = {
  voting: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  planned: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  implemented: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

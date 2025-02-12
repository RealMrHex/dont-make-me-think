export interface Episode {
    number: number;
    title: string;
    description: string;
    status: 'published' | 'coming-soon';
    publishedAt: string | null;
    topicsCount: number;
    tags: string[];
    slug: string;
}

export interface Topic {
    title: string;
    description: string;
    slug: string;
    isInteractive?: boolean;
}

export interface EpisodeModule {
    default: Episode;
}

export interface TopicsModule {
    default: string[];
}

export interface EpisodesModule {
    default: string[];
} 
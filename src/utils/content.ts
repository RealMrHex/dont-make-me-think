import type { Episode, Topic, EpisodeModule, TopicsModule, EpisodesModule } from '../types/content';

/**
 * Load episodes list from src/book/episodes.ts
 */
export async function getEpisodesOrder(): Promise<string[]> {
    // @ts-ignore
    /* @vite-ignore */
    const episodesModule = await import('../book/episodes.ts') as EpisodesModule;
    return episodesModule.default;
}

/**
 * Load episode details from src/book/{episode-dir}/episode.ts
 */
export async function getEpisodeDetails(slug: string): Promise<Episode | null> {
    try {
        // @ts-ignore
        /* @vite-ignore */
        const episodeModule = await import(`../book/${slug}/episode.ts`) as EpisodeModule;
        const topics = await getEpisodeTopics(slug);
        
        return {
            ...episodeModule.default,
            topicsCount: topics.length,
            slug
        };
    } catch (error) {
        console.error(`Failed to load episode: ${slug}`, error);
        return null;
    }
}

/**
 * Load topics list for an episode from src/book/{episode-dir}/topics.ts
 */
export async function getEpisodeTopics(episodeSlug: string): Promise<string[]> {
    try {
        // @ts-ignore
        /* @vite-ignore */
        const topicsModule = await import(`../book/${episodeSlug}/topics.ts`) as TopicsModule;
        return topicsModule.default;
    } catch (error) {
        console.error(`Failed to load topics for episode: ${episodeSlug}`, error);
        return [];
    }
}

/**
 * Load topic details from src/book/{episode-dir}/{topic-dir}/index.astro
 */
export async function getTopicDetails(episodeSlug: string, topicSlug: string): Promise<Topic | null> {
    try {
        // @ts-ignore
        /* @vite-ignore */
        const topicModule = await import(`../book/${episodeSlug}/${topicSlug}/index.astro`);
        return {
            ...topicModule.topic,
            slug: topicSlug
        };
    } catch (error) {
        console.error(`Failed to load topic: ${episodeSlug}/${topicSlug}`, error);
        return null;
    }
}

/**
 * Load all episodes with their details
 */
export async function getAllEpisodes(): Promise<Episode[]> {
    const episodesOrder = await getEpisodesOrder();
    const episodes = await Promise.all(
        episodesOrder.map(slug => getEpisodeDetails(slug))
    );
    return episodes.filter((episode): episode is Episode => episode !== null);
}

/**
 * Load all topics for an episode
 */
export async function getAllTopicsForEpisode(episodeSlug: string): Promise<Topic[]> {
    const topicsSlugs = await getEpisodeTopics(episodeSlug);
    const topics = await Promise.all(
        topicsSlugs.map(topicSlug => getTopicDetails(episodeSlug, topicSlug))
    );
    return topics.filter((topic): topic is Topic => topic !== null);
}

/**
 * Get topic component
 */
export async function getTopicComponent(episodeSlug: string, topicSlug: string) {
    try {
        // @ts-ignore
        /* @vite-ignore */
        return await import(`../book/${episodeSlug}/${topicSlug}/index.astro`);
    } catch (error) {
        console.error(`Failed to load topic component: ${episodeSlug}/${topicSlug}`, error);
        return null;
    }
}

interface NavigationItem {
    type: 'topic' | 'episode';
    slug: string;
    title: string;
    episodeSlug?: string;
}

/**
 * Get next navigation item (topic or episode)
 */
export async function getNextItem(episodeSlug: string, topicSlug?: string): Promise<NavigationItem | null> {
    const topics = await getAllTopicsForEpisode(episodeSlug);
    
    if (topicSlug) {
        // If we're in a topic, first try to get next topic
        const currentIndex = topics.findIndex(t => t.slug === topicSlug);
        if (currentIndex < topics.length - 1) {
            const nextTopic = topics[currentIndex + 1];
            return {
                type: 'topic',
                slug: nextTopic.slug,
                title: nextTopic.title,
                episodeSlug
            };
        }
        
        // If no next topic, try to get first topic of next episode
        const episodes = await getEpisodesOrder();
        const episodeIndex = episodes.indexOf(episodeSlug);
        if (episodeIndex < episodes.length - 1) {
            const nextEpisode = await getEpisodeDetails(episodes[episodeIndex + 1]);
            if (nextEpisode && nextEpisode.status === 'published') {
                const nextEpisodeTopics = await getAllTopicsForEpisode(episodes[episodeIndex + 1]);
                if (nextEpisodeTopics.length > 0) {
                    const firstTopic = nextEpisodeTopics[0];
                    return {
                        type: 'topic',
                        slug: firstTopic.slug,
                        title: firstTopic.title,
                        episodeSlug: episodes[episodeIndex + 1]
                    };
                }
            }
        }
    } else {
        // If we're in an episode list view, get first topic of next episode
        const episodes = await getEpisodesOrder();
        const episodeIndex = episodes.indexOf(episodeSlug);
        if (episodeIndex < episodes.length - 1) {
            const nextEpisode = await getEpisodeDetails(episodes[episodeIndex + 1]);
            if (nextEpisode && nextEpisode.status === 'published') {
                const nextEpisodeTopics = await getAllTopicsForEpisode(episodes[episodeIndex + 1]);
                if (nextEpisodeTopics.length > 0) {
                    const firstTopic = nextEpisodeTopics[0];
                    return {
                        type: 'topic',
                        slug: firstTopic.slug,
                        title: firstTopic.title,
                        episodeSlug: episodes[episodeIndex + 1]
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * Get previous navigation item (topic or episode)
 */
export async function getPrevItem(episodeSlug: string, topicSlug?: string): Promise<NavigationItem | null> {
    const topics = await getAllTopicsForEpisode(episodeSlug);
    
    if (topicSlug) {
        // If we're in a topic, first try to get previous topic
        const currentIndex = topics.findIndex(t => t.slug === topicSlug);
        if (currentIndex > 0) {
            const prevTopic = topics[currentIndex - 1];
            return {
                type: 'topic',
                slug: prevTopic.slug,
                title: prevTopic.title,
                episodeSlug
            };
        }
        
        // If no previous topic, try to get last topic of previous episode
        const episodes = await getEpisodesOrder();
        const episodeIndex = episodes.indexOf(episodeSlug);
        if (episodeIndex > 0) {
            const prevEpisode = await getEpisodeDetails(episodes[episodeIndex - 1]);
            if (prevEpisode && prevEpisode.status === 'published') {
                const prevEpisodeTopics = await getAllTopicsForEpisode(episodes[episodeIndex - 1]);
                if (prevEpisodeTopics.length > 0) {
                    const lastTopic = prevEpisodeTopics[prevEpisodeTopics.length - 1];
                    return {
                        type: 'topic',
                        slug: lastTopic.slug,
                        title: lastTopic.title,
                        episodeSlug: episodes[episodeIndex - 1]
                    };
                }
            }
        }
    } else {
        // If we're in an episode list view, get last topic of previous episode
        const episodes = await getEpisodesOrder();
        const episodeIndex = episodes.indexOf(episodeSlug);
        if (episodeIndex > 0) {
            const prevEpisode = await getEpisodeDetails(episodes[episodeIndex - 1]);
            if (prevEpisode && prevEpisode.status === 'published') {
                const prevEpisodeTopics = await getAllTopicsForEpisode(episodes[episodeIndex - 1]);
                if (prevEpisodeTopics.length > 0) {
                    const lastTopic = prevEpisodeTopics[prevEpisodeTopics.length - 1];
                    return {
                        type: 'topic',
                        slug: lastTopic.slug,
                        title: lastTopic.title,
                        episodeSlug: episodes[episodeIndex - 1]
                    };
                }
            }
        }
    }
    
    return null;
}

/**
 * Get navigation label based on item type
 */
export function getNavigationLabel(item: NavigationItem, direction: 'next' | 'prev'): string {
    if (item.type === 'topic') {
        return direction === 'next' ? 'مطلب بعدی' : 'مطلب قبلی';
    }
    return direction === 'next' ? 'فصل بعدی' : 'فصل قبلی';
}

/**
 * Get navigation URL based on item type
 */
export function getNavigationUrl(item: NavigationItem): string {
    if (item.type === 'topic' && item.episodeSlug) {
        return `/episodes/${item.episodeSlug}/${item.slug}`;
    }
    return `/episodes/${item.slug}`;
} 
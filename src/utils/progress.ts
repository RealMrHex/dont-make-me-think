import { INITIAL_UNLOCKED_EPISODE, STORAGE_KEYS } from '../config';

interface UserProgress {
    completedTopics: {
        [episodeSlug: string]: string[]; // Array of completed topic slugs
    };
    unlockedEpisodes: string[]; // Array of unlocked episode slugs
}

function getProgress(): UserProgress {
    // Debug logging in dev mode
    if (import.meta.env.DEV) {
        console.log('=== getProgress Debug ===');
        console.log('Is Browser:', typeof window !== 'undefined');
        if (typeof window !== 'undefined') {
            console.log('Stored Progress:', localStorage.getItem(STORAGE_KEYS.USER_PROGRESS));
        }
    }

    // Initialize with first episode unlocked
    const initial: UserProgress = {
        completedTopics: {},
        unlockedEpisodes: [INITIAL_UNLOCKED_EPISODE]
    };

    // If we're on the server, return initial state
    if (typeof window === 'undefined') {
        if (import.meta.env.DEV) {
            console.log('Returning initial state (server-side)');
            console.log('------------------------');
        }
        return initial;
    }
    
    // Get stored progress
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PROGRESS);
    if (!stored) {
        if (import.meta.env.DEV) {
            console.log('No stored progress found, saving initial state');
            console.log('------------------------');
        }
        localStorage.setItem(STORAGE_KEYS.USER_PROGRESS, JSON.stringify(initial));
        return initial;
    }
    
    // Parse stored progress
    const progress = JSON.parse(stored);
    
    // Ensure intro episode is always unlocked
    if (!progress.unlockedEpisodes.includes(INITIAL_UNLOCKED_EPISODE)) {
        progress.unlockedEpisodes.push(INITIAL_UNLOCKED_EPISODE);
        localStorage.setItem(STORAGE_KEYS.USER_PROGRESS, JSON.stringify(progress));
    }

    if (import.meta.env.DEV) {
        console.log('Returning stored progress:', progress);
        console.log('------------------------');
    }
    
    return progress;
}

function saveProgress(progress: UserProgress) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USER_PROGRESS, JSON.stringify(progress));
}

export function isTopicCompleted(episodeSlug: string, topicSlug: string): boolean {
    const progress = getProgress();
    return progress.completedTopics[episodeSlug]?.includes(topicSlug) || false;
}

export function isEpisodeUnlocked(episodeSlug: string): boolean {
    const progress = getProgress();
    return progress.unlockedEpisodes.includes(episodeSlug);
}

export function isEpisodeCompleted(episodeSlug: string, totalTopics: number): boolean {
    const progress = getProgress();
    return (progress.completedTopics[episodeSlug]?.length || 0) === totalTopics;
}

export function markTopicCompleted(episodeSlug: string, topicSlug: string) {
    const progress = getProgress();
    
    // Initialize episode's completed topics array if it doesn't exist
    if (!progress.completedTopics[episodeSlug]) {
        progress.completedTopics[episodeSlug] = [];
    }
    
    // Add topic to completed list if not already there
    if (!progress.completedTopics[episodeSlug].includes(topicSlug)) {
        progress.completedTopics[episodeSlug].push(topicSlug);
    }
    
    saveProgress(progress);
}

export function unlockNextEpisode(currentEpisodeSlug: string) {
    const progress = getProgress();
    
    // Get the next episode from the episodes order
    import('../book/episodes').then(({ default: episodes }) => {
        const currentIndex = episodes.indexOf(currentEpisodeSlug);
        if (currentIndex >= 0 && currentIndex < episodes.length - 1) {
            const nextEpisodeSlug = episodes[currentIndex + 1];
            
            // Add to unlocked episodes if not already there
            if (!progress.unlockedEpisodes.includes(nextEpisodeSlug)) {
                progress.unlockedEpisodes.push(nextEpisodeSlug);
                saveProgress(progress);
            }
        }
    });
}

export function resetProgress() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.USER_PROGRESS);
    // Reinitialize with default state
    getProgress();
} 
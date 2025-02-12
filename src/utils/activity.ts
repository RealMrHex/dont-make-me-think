import { STORAGE_KEYS } from '../config';

export interface ActivityLog {
    timestamp: number;
    type: 'page_view' | 'page_leave' | 'topic_complete' | 'episode_unlock' | 'navigation';
    details: {
        page?: string;
        from?: string;
        to?: string;
        episodeSlug?: string;
        topicSlug?: string;
        timeSpent?: number;
        action?: string;
    };
}

interface UserActivity {
    logs: ActivityLog[];
    timeSpent: {
        [key: string]: number; // page path -> total time in seconds
    };
}

class ActivityTracker {
    private static instance: ActivityTracker;
    private pageStartTime: number | null = null;
    private currentPage: string | null = null;
    private initialized = false;

    private constructor() {
        // Private constructor to prevent direct construction calls
        if (typeof window !== 'undefined') {
            this.setupPageLeaveListener();
        }
    }

    public static getInstance(): ActivityTracker {
        if (!ActivityTracker.instance) {
            ActivityTracker.instance = new ActivityTracker();
        }
        return ActivityTracker.instance;
    }

    private getActivity(): UserActivity {
        if (typeof window === 'undefined') return { logs: [], timeSpent: {} };
        
        const stored = localStorage.getItem(STORAGE_KEYS.USER_ACTIVITY);
        if (!stored) {
            const initial: UserActivity = { logs: [], timeSpent: {} };
            localStorage.setItem(STORAGE_KEYS.USER_ACTIVITY, JSON.stringify(initial));
            return initial;
        }
        
        return JSON.parse(stored);
    }

    private saveActivity(activity: UserActivity) {
        if (typeof window === 'undefined') return;
        localStorage.setItem(STORAGE_KEYS.USER_ACTIVITY, JSON.stringify(activity));
    }

    private addLog(type: ActivityLog['type'], details: ActivityLog['details']) {
        const activity = this.getActivity();
        activity.logs.push({
            timestamp: Date.now(),
            type,
            details
        });
        this.saveActivity(activity);
    }

    public startPageView(page: string) {
        // If it's the same page, don't log again
        if (this.currentPage === page) return;

        // Log previous page leave if exists
        if (this.currentPage && this.pageStartTime) {
            const timeSpent = Math.round((Date.now() - this.pageStartTime) / 1000);
            this.logPageLeave(this.currentPage, timeSpent);
        }
        
        // Start new page timer
        this.pageStartTime = Date.now();
        this.currentPage = page;
        
        this.addLog('page_view', { page });
    }

    private logPageLeave(page: string, timeSpent: number) {
        const activity = this.getActivity();
        
        // Update total time spent on this page
        activity.timeSpent[page] = (activity.timeSpent[page] || 0) + timeSpent;
        
        this.addLog('page_leave', { page, timeSpent });
        this.saveActivity(activity);
    }

    public logTopicComplete(episodeSlug: string, topicSlug: string) {
        this.addLog('topic_complete', { episodeSlug, topicSlug });
    }

    public logEpisodeUnlock(episodeSlug: string) {
        this.addLog('episode_unlock', { episodeSlug });
    }

    public logNavigation(from: string, to: string, action: string) {
        this.addLog('navigation', { from, to, action });
    }

    private setupPageLeaveListener() {
        if (this.initialized) return;
        
        window.addEventListener('beforeunload', () => {
            if (this.currentPage && this.pageStartTime) {
                const timeSpent = Math.round((Date.now() - this.pageStartTime) / 1000);
                this.logPageLeave(this.currentPage, timeSpent);
            }
        });

        this.initialized = true;
    }

    // Analytics methods
    public getTimeSpentStats() {
        const activity = this.getActivity();
        return activity.timeSpent;
    }

    public getCompletedTopicsCount() {
        const activity = this.getActivity();
        return activity.logs.filter(log => log.type === 'topic_complete').length;
    }

    public getUnlockedEpisodesCount() {
        const activity = this.getActivity();
        return activity.logs.filter(log => log.type === 'episode_unlock').length;
    }

    public getMostVisitedPages(limit: number = 5) {
        const activity = this.getActivity();
        const pageVisits: { [key: string]: number } = {};
        
        activity.logs
            .filter(log => log.type === 'page_view')
            .forEach(log => {
                if (log.details.page) {
                    pageVisits[log.details.page] = (pageVisits[log.details.page] || 0) + 1;
                }
            });
        
        return Object.entries(pageVisits)
            .sort(([, a], [, b]) => b - a)
            .slice(0, limit);
    }

    public getRecentActivity(limit: number = 10) {
        const activity = this.getActivity();
        return activity.logs
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }
}

// Export singleton instance methods
const tracker = ActivityTracker.getInstance();

export const startPageView = (page: string) => tracker.startPageView(page);
export const logTopicComplete = (episodeSlug: string, topicSlug: string) => tracker.logTopicComplete(episodeSlug, topicSlug);
export const logEpisodeUnlock = (episodeSlug: string) => tracker.logEpisodeUnlock(episodeSlug);
export const logNavigation = (from: string, to: string, action: string) => tracker.logNavigation(from, to, action);
export const getTimeSpentStats = () => tracker.getTimeSpentStats();
export const getCompletedTopicsCount = () => tracker.getCompletedTopicsCount();
export const getUnlockedEpisodesCount = () => tracker.getUnlockedEpisodesCount();
export const getMostVisitedPages = (limit?: number) => tracker.getMostVisitedPages(limit);
export const getRecentActivity = (limit?: number) => tracker.getRecentActivity(limit); 
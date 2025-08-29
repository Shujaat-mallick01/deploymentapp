// API Configuration
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? window.location.origin.replace(':3001', ':3000')
    : 'http://localhost:3000';

export const config = {
    apiUrl: API_BASE_URL,
    githubOAuthUrl: `${API_BASE_URL}/api/auth/github`,
    gitlabOAuthUrl: `${API_BASE_URL}/api/auth/gitlab`,
    bitbucketOAuthUrl: `${API_BASE_URL}/api/auth/bitbucket`,
    webhookUrl: `${API_BASE_URL}/api/git/webhook`,
    wsUrl: process.env.NODE_ENV === 'production'
        ? window.location.origin.replace('http', 'ws').replace(':3001', ':3000')
        : 'ws://localhost:3000'
};

export const endpoints = {
    auth: {
        login: '/api/auth/login',
        register: '/api/auth/register',
        refresh: '/api/auth/refresh',
        logout: '/api/auth/logout',
        verify: '/api/auth/verify',
        forgotPassword: '/api/auth/forgot-password',
        resetPassword: '/api/auth/reset-password'
    },
    projects: {
        list: '/api/projects',
        create: '/api/projects',
        get: (id: string) => `/api/projects/${id}`,
        update: (id: string) => `/api/projects/${id}`,
        delete: (id: string) => `/api/projects/${id}`,
        stats: (id: string) => `/api/projects/${id}/stats`
    },
    deployments: {
        list: '/api/deployments',
        get: (id: string) => `/api/deployments/${id}`,
        create: '/api/deployments',
        cancel: (id: string) => `/api/deployments/${id}/cancel`,
        retry: (id: string) => `/api/deployments/${id}/retry`,
        logs: (id: string) => `/api/deployments/${id}/logs`
    },
    builds: {
        list: '/api/builds',
        get: (id: string) => `/api/builds/${id}`,
        logs: (id: string) => `/api/builds/${id}/logs`,
        artifacts: (id: string) => `/api/builds/${id}/artifacts`
    },
    domains: {
        list: '/api/domains',
        create: '/api/domains',
        verify: (id: string) => `/api/domains/${id}/verify`,
        delete: (id: string) => `/api/domains/${id}`,
        ssl: (id: string) => `/api/domains/${id}/ssl`
    },
    monitoring: {
        metrics: '/api/monitoring/metrics',
        logs: '/api/monitoring/logs',
        alerts: '/api/monitoring/alerts',
        uptime: '/api/monitoring/uptime'
    },
    git: {
        repos: '/api/git/repos',
        connect: '/api/git/connect',
        webhook: '/api/git/webhook',
        branches: (repo: string) => `/api/git/repos/${repo}/branches`
    }
};
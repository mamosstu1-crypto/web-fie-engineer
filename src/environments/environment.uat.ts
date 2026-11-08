export const environment = {
    production: true,
    API_URL:
        (window as any)['__env']?.API_URL || 'https://api.fie-engineer.com',
};

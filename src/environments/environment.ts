// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
    production: true,
    // API_URL: 'http://localhost/work-asha/Backend_BNI/public',
    // API_URL: 'https://fie-api.dev-asha9.com',
    // API_URL: 'https://fie-api-uat.dev-asha9.com',
    API_URL: (window as any)['__env']?.API_URL || 'https://api.fie-engineer.com',
    // API_URL: 'http://localhost/storage_BNI/public',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.

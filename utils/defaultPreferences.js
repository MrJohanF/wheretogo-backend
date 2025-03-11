// utils/defaultPreferences.js
export const DEFAULT_PREFERENCES = {
    themePreference: "System",
    language: "Spanish",
    timezone: "America/Bogota",
    notificationPreferences: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false
    },
    securityOptions: {
      twoFactorAuthentication: false,
      loginAlerts: true
    }
  };
  
  export default DEFAULT_PREFERENCES;
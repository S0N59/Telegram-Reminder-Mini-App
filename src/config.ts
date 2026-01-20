// Конфигурация приложения
// Bot Token теперь хранится ТОЛЬКО на backend (Vercel) - это безопасно!

export const config = {
  // Backend URL for API requests
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://backend-j3udo51oz-norayrs-projects-a813a9d8.vercel.app',
  
  // Always use backend - no bot token on frontend!
  useBackend: true,
};

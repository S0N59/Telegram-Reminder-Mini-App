// Конфигурация приложения
// Bot Token теперь хранится ТОЛЬКО на backend (Vercel) - это безопасно!

export const config = {
  // Backend URL for API requests (stable Vercel production domain)
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://backend-norayrs-projects-a813a9d8.vercel.app',
  
  // Always use backend - no bot token on frontend!
  useBackend: true,
};

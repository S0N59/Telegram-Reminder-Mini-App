// Конфигурация приложения
// Dev-ветка приложения Remigram (девелоперская версия)

export const config = {
  // Backend URL for API requests (DEV line)
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://backend-dev-production-77ac.up.railway.app',
  
  // Always use backend
  useBackend: true,

  // Developer bot username (RemigramDEV)
  botUsername: import.meta.env.VITE_BOT_USERNAME || 'deveremigream_bot',
};

// Конфигурация приложения
// Dev-ветка приложения Remigram (девелоперская версия)

export const config = {
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://backend-dev-production-77ac.up.railway.app',
  useBackend: true,
  botUsername: import.meta.env.VITE_BOT_USERNAME || 'deveremigream_bot',
};










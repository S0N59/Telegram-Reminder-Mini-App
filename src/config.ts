// Конфигурация приложения
// Bot Token теперь хранится ТОЛЬКО на backend (Vercel) - это безопасно!

export const config = {
  // Backend URL для API запросов
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'https://backend-9asrt4ke5-norayrs-projects-a813a9d8.vercel.app',
  
  // Всегда используем backend - никакого bot token на фронтенде!
  useBackend: true,
};

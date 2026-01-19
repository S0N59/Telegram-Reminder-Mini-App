import { Language } from '../i18n';
import './LanguageToggle.css';

interface LanguageToggleProps {
  language: Language;
  onToggle: (language: Language) => void;
  ariaLabel: string;
}

export const LanguageToggle = ({ language, onToggle, ariaLabel }: LanguageToggleProps) => {
  const nextLanguage: Language = language === 'en' ? 'ru' : 'en';
  const currentFlag = language === 'en' ? '🇬🇧' : '🇷🇺';

  const handleClick = () => {
    onToggle(nextLanguage);
  };

  return (
    <button
      className="language-toggle"
      onClick={handleClick}
      aria-label={ariaLabel}
      type="button"
    >
      <span className="language-toggle__value">
        {currentFlag}
      </span>
    </button>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import './LanguageChip.css';

const LANGUAGE_NAMES = {
  en: 'EN',
  'pt-BR': 'PT',
  es: 'ES',
};

const LANGUAGE_FULL_NAMES = {
  en: 'English',
  'pt-BR': 'Português',
  es: 'Español',
};

const LanguageChip = ({
  currentLanguage,
  languageMode,
  allowedLanguages,
  onLanguageChange,
  theme,
  isPremium = false, // Set to true if premium/multilang enabled
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Determine available languages
  const getAvailableLanguages = () => {
    if (languageMode === 'allowed' && allowedLanguages) {
      return allowedLanguages;
    }
    // For 'auto' or 'single' mode, show all supported languages
    return ['en', 'pt-BR', 'es'];
  };

  const availableLanguages = getAvailableLanguages();
  const canChangeLanguage = isPremium && (languageMode === 'auto' || languageMode === 'allowed');

  const handleLanguageSelect = (language) => {
    if (onLanguageChange) {
      onLanguageChange(language);
    }
    setIsOpen(false);
  };

  if (!canChangeLanguage) {
    // Just show the indicator, no interaction
    return (
      <div className="language-chip language-chip-readonly">
        <span className="language-chip-text">{LANGUAGE_NAMES[currentLanguage] || 'EN'}</span>
      </div>
    );
  }

  return (
    <div className="language-chip-container" ref={dropdownRef}>
      <button
        className="language-chip language-chip-interactive"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Current language: ${LANGUAGE_FULL_NAMES[currentLanguage]}`}
        style={{
          '--primary-color': theme?.primaryColor || '#667eea',
        }}
      >
        <span className="language-chip-text">{LANGUAGE_NAMES[currentLanguage] || 'EN'}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`language-chip-arrow ${isOpen ? 'open' : ''}`}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="language-dropdown">
          {availableLanguages.map((lang) => (
            <button
              key={lang}
              className={`language-option ${lang === currentLanguage ? 'active' : ''}`}
              onClick={() => handleLanguageSelect(lang)}
            >
              <span className="language-option-code">{LANGUAGE_NAMES[lang]}</span>
              <span className="language-option-name">{LANGUAGE_FULL_NAMES[lang]}</span>
              {lang === currentLanguage && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13 4L6 11L3 8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageChip;


import React, { useEffect, useState } from 'react';

const themes = [
  { 
    name: 'Light', 
    value: 'light',
    icon: '☀️',
    gradient: 'from-yellow-400 to-orange-500'
  },
  { 
    name: 'Dark', 
    value: 'dark',
    icon: '🌙',
    gradient: 'from-gray-700 to-gray-900'
  },
  { 
    name: 'Blue', 
    value: 'blue',
    icon: '💙',
    gradient: 'from-blue-500 to-indigo-600'
  },
  { 
    name: 'Emerald', 
    value: 'emerald',
    icon: '💚',
    gradient: 'from-emerald-500 to-teal-600'
  },
  { 
    name: 'Rose', 
    value: 'rose',
    icon: '🌹',
    gradient: 'from-rose-500 to-pink-600'
  },
];

export const ThemeSwitcher: React.FC = () => {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Clear all existing theme classes
    document.documentElement.className = '';
    
    // Add the theme class
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Handle dark mode specifically
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', theme);
    
    // Debug log to verify theme is being applied
    console.log('Theme applied:', theme, 'Classes:', document.documentElement.className);
  }, [theme]);

  const currentTheme = themes.find(t => t.value === theme) || themes[0];

  const handleThemeChange = (newTheme: string) => {
    console.log('Changing theme to:', newTheme);
    setTheme(newTheme);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <span className="text-lg">{currentTheme.icon}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {currentTheme.name}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && buttonRect && (
        <>
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsOpen(false)}
          />
          <div 
            className="fixed w-48 rounded-xl backdrop-blur-md bg-white/90 dark:bg-black/90 border border-white/30 dark:border-white/10 shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-top-2 duration-200"
            style={{
              top: buttonRect.bottom + 8,
              right: window.innerWidth - buttonRect.right,
            }}
          >
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-150 ${
                  theme === t.value ? 'bg-white/60 dark:bg-white/20' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${t.gradient} flex items-center justify-center shadow-md`}>
                  <span className="text-sm">{t.icon}</span>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {t.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t.name} theme
                  </div>
                </div>
                {theme === t.value && (
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}; 
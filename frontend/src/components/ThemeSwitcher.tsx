import React, { useEffect } from 'react';
import { useUIPreferences } from '../hooks/useUIPreferences';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const { preferences, updatePreference } = useUIPreferences();

  useEffect(() => {
    // Clear all existing theme classes
    document.documentElement.className = '';
    
    // Add the theme class
    document.documentElement.classList.add(`theme-${preferences.theme}`);
    
    // Handle dark mode specifically
    if (preferences.theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
    
    // Debug log to verify theme is being applied
    console.log('Theme applied:', preferences.theme, 'Classes:', document.documentElement.className);
  }, [preferences.theme]);

  const currentTheme = themes.find(t => t.value === preferences.theme) || themes[0];

  const handleThemeChange = (newTheme: string) => {
    console.log('Changing theme to:', newTheme);
    updatePreference('theme', newTheme);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 px-4 py-2 rounded-xl backdrop-blur-md bg-white/20 dark:bg-black/20 border border-white/30 dark:border-white/10 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-200 shadow-lg hover:shadow-xl">
          <span className="text-lg">{currentTheme.icon}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentTheme.name}
          </span>
          <svg 
            className="w-4 h-4 text-gray-600 dark:text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-2xl" align="end" forceMount>
        {themes.map((t) => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => handleThemeChange(t.value)}
            className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 transition-all duration-150 ${
              preferences.theme === t.value ? 'bg-white/60 dark:bg-white/20' : ''
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
            {preferences.theme === t.value && (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 
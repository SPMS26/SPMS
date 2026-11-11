import React from 'react';
import { useTheme } from '../../context/ThemeContext';

// Sun in dark mode (switch to light), moon in light mode (switch to dark)
const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : 'light';
  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
    </button>
  );
};

export default ThemeToggle;

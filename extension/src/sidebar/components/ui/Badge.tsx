/**
 * Reusable Badge Component
 */

import React from 'react';
import { clsx } from 'clsx';

interface BadgeProps {
  variant?: 'high' | 'medium' | 'low' | 'default';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  children, 
  className 
}) => {
  const variantClasses = {
    high: 'formpilot-badge-high',
    medium: 'formpilot-badge-medium', 
    low: 'formpilot-badge-low',
    default: 'bg-gray-100 text-gray-800'
  };

  return (
    <span className={clsx('formpilot-badge', variantClasses[variant], className)}>
      {children}
    </span>
  );
};
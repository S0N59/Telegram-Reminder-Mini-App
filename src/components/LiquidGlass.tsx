import React from 'react';

export interface LiquidGlassProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'card' | 'pill' | 'bar' | 'modal' | 'island' | 'subtle';
  interactive?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Reusable Liquid Glass physical surface wrapper.
 * Provides frosted glass depth, specular edge highlights, and fallback support.
 */
export const LiquidGlass: React.FC<LiquidGlassProps> = ({
  variant = 'card',
  interactive = false,
  className = '',
  children,
  ...props
}) => {
  const baseClass = `liquid-glass liquid-glass-${variant} ${interactive ? 'liquid-glass-interactive' : ''} ${className}`.trim();

  return (
    <div className={baseClass} {...props}>
      {children}
    </div>
  );
};

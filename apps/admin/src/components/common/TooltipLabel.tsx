import { Tooltip } from '@radix-ui/themes';
import type { ReactNode } from 'react';

interface TooltipLabelProps {
  content: string;
  children: ReactNode;
}

export function TooltipLabel({ content, children }: TooltipLabelProps) {
  return (
    <Tooltip content={content} delayDuration={180}>
      {children}
    </Tooltip>
  );
}

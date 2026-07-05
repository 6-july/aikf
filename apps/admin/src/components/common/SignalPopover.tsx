import { Button, HoverCard } from '@radix-ui/themes';
import { ChevronDown } from 'lucide-react';

interface SignalPopoverProps {
  label: string;
  title: string;
  items?: string[];
  text?: string;
}

export function SignalPopover({ label, title, items, text }: SignalPopoverProps) {
  return (
    <HoverCard.Root closeDelay={120} openDelay={120}>
      <HoverCard.Trigger>
        <Button
          className="qa-signal-trigger"
          color="gray"
          size="1"
          variant="soft"
          onClick={(event) => event.preventDefault()}
          type="button"
        >
          {label}
          <ChevronDown className="qa-signal-chevron" size={12} />
        </Button>
      </HoverCard.Trigger>
      <HoverCard.Content
        align="start"
        avoidCollisions
        className="floating-signal-popover"
        collisionPadding={16}
        side="bottom"
        sideOffset={8}
      >
        <span className="qa-signal-popover-title">{title}</span>
        {items && (
          <span className="qa-signal-popover-list">
            {items.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </span>
        )}
        {text && <span className="qa-signal-popover-text">{text}</span>}
      </HoverCard.Content>
    </HoverCard.Root>
  );
}

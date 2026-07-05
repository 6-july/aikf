import { Checkbox } from '@radix-ui/themes';

interface CheckboxControlProps {
  checked: boolean | 'indeterminate';
  onCheckedChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}

export function CheckboxControl({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled = false,
}: CheckboxControlProps) {
  return (
    <Checkbox
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      highContrast
      onCheckedChange={onCheckedChange}
    />
  );
}

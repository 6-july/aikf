import { Select } from '@radix-ui/themes';
import type { SelectOption } from './types';

interface SelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  disabled?: boolean;
}

export function SelectField({
  value,
  onValueChange,
  options,
  ariaLabel,
  disabled = false,
}: SelectFieldProps) {
  return (
    <Select.Root disabled={disabled} value={value} onValueChange={onValueChange}>
      <Select.Trigger aria-label={ariaLabel} className="control-fill" />
      <Select.Content position="popper">
        {options.map((option) => (
          <Select.Item key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

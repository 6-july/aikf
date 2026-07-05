import * as Toast from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';

interface NoticeToastProps {
  notice: string;
  error: string;
  onClose: () => void;
}

export function NoticeToast({ notice, error, onClose }: NoticeToastProps) {
  return (
    <Toast.Root
      className={`toast ${error ? 'error' : 'success'}`}
      duration={error ? 6000 : 2600}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      open={Boolean(notice || error)}
    >
      <div className="toast-content">
        {error ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
        <Toast.Description asChild>
          <span>{error || notice}</span>
        </Toast.Description>
      </div>
      <Toast.Close className="toast-close" aria-label="关闭提示">
        <X size={14} />
      </Toast.Close>
    </Toast.Root>
  );
}

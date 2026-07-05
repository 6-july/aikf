import { Upload } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ImportProgress } from '../../../types/knowledgeBase';

interface ImportProgressBannerProps {
  progress: ImportProgress;
}

export function ImportProgressBanner({ progress }: ImportProgressBannerProps) {
  if (!progress) {
    return null;
  }

  return (
    <div
      className={`import-progress ${progress.status}`}
      style={{ '--import-progress': `${Math.min(100, Math.max(0, progress.percent))}%` } as CSSProperties}
    >
      <div className="import-progress-copy">
        <Upload size={16} />
        <div>
          <strong>{progress.message}</strong>
          <span>
            {progress.fileName}
            {progress.total > 0
              ? ` · 已处理 ${progress.processed}/${progress.total} 条`
              : ''}
          </span>
        </div>
      </div>
      <div className="import-progress-meta">
        <span>{progress.percent}%</span>
        {progress.total > 0 && (
          <div className="import-progress-stats">
            <span>成功 {progress.success}</span>
            <span>失败 {progress.failed}</span>
          </div>
        )}
      </div>
    </div>
  );
}

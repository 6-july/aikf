import { IconButton } from '@radix-ui/themes';
import { X } from 'lucide-react';
import { TooltipLabel } from '../../../components/common/TooltipLabel';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';
import { DuplicateCheckDrawer } from './DuplicateCheckDrawer';
import { RecallTestDrawer } from './RecallTestDrawer';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface KnowledgeBaseDrawerProps {
  kb: KnowledgeBaseState;
}

export function KnowledgeBaseDrawer({ kb }: KnowledgeBaseDrawerProps) {
  if (!kb.drawer) {
    return null;
  }

  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-backdrop" onClick={() => kb.setDrawer(null)} type="button" />
      <aside className="drawer" aria-label={kb.drawer === 'test' ? '召回测试' : '重复检测'}>
        <div className="drawer-head">
          <div>
            <h2>{kb.drawer === 'test' ? '召回测试' : '重复检测'}</h2>
            <p>
              {kb.drawer === 'test'
                ? '实时调用 test-search'
                : '检测标准问题、相似问法和现有向量索引'}
            </p>
          </div>
          <TooltipLabel content="关闭">
            <IconButton aria-label="关闭" color="gray" onClick={() => kb.setDrawer(null)} type="button" variant="outline">
              <X size={18} />
            </IconButton>
          </TooltipLabel>
        </div>

        <div className="drawer-body">
          {kb.drawer === 'test' ? <RecallTestDrawer kb={kb} /> : <DuplicateCheckDrawer kb={kb} />}
        </div>
      </aside>
    </div>
  );
}

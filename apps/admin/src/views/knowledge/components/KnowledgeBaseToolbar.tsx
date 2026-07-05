import { Button } from '@radix-ui/themes';
import { Download, Plus, RotateCcw, Search, Sparkles, Upload } from 'lucide-react';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface KnowledgeBaseToolbarProps {
  kb: KnowledgeBaseState;
}

export function KnowledgeBaseToolbar({ kb }: KnowledgeBaseToolbarProps) {
  return (
    <header className="topbar">
      <div>
        <div className="eyebrow">Knowledge Base</div>
        <h1>知识库</h1>
      </div>
      <div className="toolbar">
        <Button
          highContrast
          onClick={kb.resetPageState}
          type="button"
          variant="ghost"
          title="刷新页面状态并重新加载数据"
        >
          <RotateCcw size={17} />
          刷新
        </Button>
        <Button highContrast onClick={kb.downloadTemplate} type="button" variant="ghost" title="下载 Excel 模板">
          <Download size={17} />
          下载模板
        </Button>
        <Button
          highContrast
          variant="ghost"
          disabled={kb.importing}
          onClick={() => kb.fileInputRef.current?.click()}
          type="button"
          title="导入 Excel"
        >
          <Upload size={17} />
          {kb.importing ? '导入中' : '导入 Excel'}
        </Button>
        <input
          accept=".xlsx,.xls"
          className="file-input"
          onChange={(event) => void kb.handleImportExcel(event)}
          ref={kb.fileInputRef}
          type="file"
        />
        <Button
          color="gray"
          highContrast
          onClick={() => kb.setDrawer('duplicate')}
          type="button"
          variant="outline"
          title="检测知识库重复 QA"
        >
          <Search size={17} />
          重复检测
        </Button>
        <Button
          color="gray"
          highContrast
          onClick={() => kb.setDrawer('test')}
          type="button"
          variant="outline"
          title="召回测试"
        >
          <Sparkles size={17} />
          召回测试
        </Button>
        <Button highContrast onClick={kb.startCreate} type="button" title="新增 QA">
          <Plus size={17} />
          新增 QA
        </Button>
      </div>
    </header>
  );
}

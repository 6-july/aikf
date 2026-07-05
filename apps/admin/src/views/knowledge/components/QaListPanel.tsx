import { Button, IconButton, TextField } from '@radix-ui/themes';
import { Database, Download, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import { CheckboxControl } from '../../../components/common/CheckboxControl';
import { SelectField } from '../../../components/common/SelectField';
import {
  audienceOptions,
  QA_LIST_MAX_VISIBLE,
  QA_LIST_PAGE_SIZE,
  sortOptions,
} from '../../../constants/knowledgeBase';
import type { SortMode } from '../../../types/knowledgeBase';
import type { useKnowledgeBase } from '../../../hooks/useKnowledgeBase';
import { QaInlineEditor } from './QaInlineEditor';
import { QaRow } from './QaRow';

type KnowledgeBaseState = ReturnType<typeof useKnowledgeBase>;

interface QaListPanelProps {
  kb: KnowledgeBaseState;
}

export function QaListPanel({ kb }: QaListPanelProps) {
  return (
    <div className="qa-list-panel">
      <div className="panel-head">
        <div>
          <h2>知识库列表</h2>
          <p>
            {kb.loading
              ? '加载中'
              : `${kb.filteredQas.length} 条结果 · 已显示 ${kb.visibleQas.length}`}
          </p>
        </div>
        <Search size={18} />
      </div>

      <div className="filters">
        <TextField.Root
          className="search-field"
          value={kb.filter}
          onChange={(event) => kb.setFilter(event.target.value)}
          placeholder="搜索问题、分类"
        >
          <TextField.Slot>
            <Search size={16} />
          </TextField.Slot>
          {kb.filter && (
            <TextField.Slot>
              <IconButton
                aria-label="清空搜索"
                color="gray"
                onClick={() => kb.setFilter('')}
                size="1"
                type="button"
                variant="ghost"
              >
                <X size={15} />
              </IconButton>
            </TextField.Slot>
          )}
        </TextField.Root>
        <SelectField
          ariaLabel="对象筛选"
          options={[{ value: 'all', label: '全部对象' }, ...audienceOptions]}
          value={kb.audienceFilter}
          onValueChange={kb.setAudienceFilter}
        />
        <SelectField
          ariaLabel="排序方式"
          options={sortOptions}
          value={kb.sortMode}
          onValueChange={(value) => kb.setSortMode(value as SortMode)}
        />
      </div>

      {kb.selectedQas.length > 0 && (
        <div className="batch-toolbar">
          <label className="batch-select-all">
            <CheckboxControl
              ariaLabel="选择当前可见 QA"
              checked={kb.isAllVisibleSelected ? true : kb.visibleSelectedCount > 0 ? 'indeterminate' : false}
              onCheckedChange={kb.toggleVisibleSelected}
            />
            已选 {kb.selectedQas.length} 条
          </label>
          <div className="batch-actions">
            <Button color="gray" highContrast size="1" variant="outline" onClick={kb.exportSelectedQas} type="button">
              <Download size={15} />
              导出
            </Button>
            <Button color="red" size="1" variant="outline" onClick={kb.requestBatchDeleteConfirm} type="button">
              <Trash2 size={15} />
              批量删除
            </Button>
            <Button color="gray" highContrast size="1" variant="outline" onClick={kb.clearSelectedQas} type="button">
              <X size={15} />
              取消勾选
            </Button>
          </div>
        </div>
      )}

      <div className="qa-list" onScroll={kb.handleQaListScroll} ref={kb.qaListRef}>
        {kb.editingId === 'new' && <QaInlineEditor kb={kb} />}
        {!kb.loading && kb.editingId !== 'new' && kb.visibleQas.length === 0 ? (
          <div className="empty-state">
            <Database size={28} />
            <h3>{kb.qas.length === 0 ? '还没有知识数据' : '没有匹配的知识'}</h3>
            <p>
              {kb.qas.length === 0
                ? '可以先导入 Excel，或手动新增一条 QA。'
                : '试试调整搜索关键词或适用对象筛选。'}
            </p>
            <div className="empty-actions">
              {kb.qas.length === 0 ? (
                <>
                  <Button color="gray" highContrast variant="outline" onClick={() => kb.fileInputRef.current?.click()} type="button">
                    <Upload size={16} />
                    导入 Excel
                  </Button>
                  <Button highContrast onClick={kb.startCreate} type="button">
                    <Plus size={16} />
                    新增 QA
                  </Button>
                </>
              ) : (
                <Button
                  color="gray"
                  highContrast
                  size="1"
                  variant="outline"
                  onClick={() => {
                    kb.setFilter('');
                    kb.setAudienceFilter('all');
                  }}
                  type="button"
                >
                  <X size={14} />
                  清空筛选
                </Button>
              )}
            </div>
          </div>
        ) : (
          kb.visibleQas.map((qa) => <QaRow key={qa.id} qa={qa} kb={kb} />)
        )}
        {kb.hasMoreQas && (
          <div className="qa-list-loader">
            {kb.reachedVisibleLimit
              ? `已显示前 ${QA_LIST_MAX_VISIBLE} 条，请通过搜索、对象或排序缩小范围`
              : `继续下滑加载更多，每次 ${QA_LIST_PAGE_SIZE} 条`}
          </div>
        )}
      </div>
    </div>
  );
}

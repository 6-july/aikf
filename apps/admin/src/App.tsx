import * as Toast from '@radix-ui/react-toast';
import {
  AlertDialog,
  Button,
  Checkbox,
  HoverCard,
  IconButton,
  Select,
  Slider,
  TextArea,
  TextField,
  Theme,
  Tooltip,
} from '@radix-ui/themes';
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle,
  ChevronDown,
  Database,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  SquarePen,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  ChangeEvent,
  CSSProperties,
  ReactNode,
  UIEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  createQa,
  deleteQa,
  generateSimilarQuestions,
  getImportJob,
  getImportTemplateUrl,
  importExcel,
  listQa,
  testSearch,
  updateQa,
} from './api';
import { ImportQaJobSnapshot, ImportQaJobStatus, KbQa, QaForm, SearchResult } from './types';

const emptyForm: QaForm = {
  businessDomain: '',
  audience: 'runner',
  categoryPath: '',
  standardQuestion: '',
  similarQuestions: '',
  answer: '',
  solutionIdea: '',
};

const menuItems = [
  { label: '工作台', icon: Database },
  { label: '智能体', icon: Bot },
  { label: '知识库', icon: Search, active: true },
  { label: '会话', icon: MessageSquareText },
  { label: '系统设置', icon: Settings },
];

type DrawerType = 'test' | null;
type EditingId = number | 'new' | null;
type ConfirmAction =
  | { type: 'save-form' }
  | { type: 'status'; qa: KbQa; action: 'delete' }
  | { type: 'batch'; qas: KbQa[]; action: 'delete' };
type SortMode = 'default' | 'hit_asc' | 'hit_desc' | 'created_asc' | 'created_desc';
type SelectOption = {
  value: string;
  label: string;
};
type ImportProgress = {
  fileName: string;
  status: ImportQaJobStatus | 'uploading';
  percent: number;
  total: number;
  processed: number;
  success: number;
  failed: number;
  message: string;
  errors: ImportQaJobSnapshot['errors'];
} | null;

const audienceOptions = [
  { value: 'common', label: '通用' },
  { value: 'runner', label: '跑男' },
  { value: 'user', label: '用户' },
];

const sortOptions: SelectOption[] = [
  { value: 'default', label: '默认排序' },
  { value: 'created_desc', label: '创建时间降序' },
  { value: 'created_asc', label: '创建时间升序' },
  { value: 'hit_desc', label: '命中数降序' },
  { value: 'hit_asc', label: '命中数升序' },
];

const QA_LIST_PAGE_SIZE = 50;
const QA_LIST_MAX_VISIBLE = 500;
const maxRecallOptions = [1, 3, 5, 10, 20];

function toForm(qa: KbQa): QaForm {
  return {
    businessDomain: qa.businessDomain,
    audience: qa.audience,
    categoryPath: qa.categoryPath || '',
    standardQuestion: qa.standardQuestion,
    similarQuestions: qa.similarQuestions || '',
    answer: qa.answer,
    solutionIdea: qa.solutionIdea || '',
  };
}

export function App() {
  const [qas, setQas] = useState<KbQa[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<QaForm>(emptyForm);
  const [filter, setFilter] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('default');
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [editingId, setEditingId] = useState<EditingId>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [similarCandidates, setSimilarCandidates] = useState<string[]>([]);
  const [testQuery, setTestQuery] = useState('我想加入UU跑腿怎么接单？');
  const [testAudiences, setTestAudiences] = useState<string[]>(['common', 'runner']);
  const [minScore, setMinScore] = useState(0.5);
  const [minScoreInput, setMinScoreInput] = useState('0.50');
  const [finalTopK, setFinalTopK] = useState(5);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [visibleQaCount, setVisibleQaCount] = useState(QA_LIST_PAGE_SIZE);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedQaIds, setSelectedQaIds] = useState<number[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const qaListRef = useRef<HTMLDivElement | null>(null);

  const selectedQa =
    typeof editingId === 'number'
      ? qas.find((qa) => qa.id === editingId) || null
      : null;

  const filteredQas = useMemo(() => {
    const keyword = filter.trim().toLowerCase();
    const filtered = qas.filter((qa) => {
      if (qa.status === 'deleted') {
        return false;
      }

      const audienceMatched = audienceFilter === 'all' || qa.audience === audienceFilter;
      const keywordMatched =
        !keyword ||
        [qa.categoryPath, qa.standardQuestion]
          .filter(Boolean)
          .some((item) => item!.toLowerCase().includes(keyword));

      return audienceMatched && keywordMatched;
    });

    if (sortMode === 'hit_asc') {
      return [...filtered].sort((left, right) => left.hitCount - right.hitCount);
    }

    if (sortMode === 'hit_desc') {
      return [...filtered].sort((left, right) => right.hitCount - left.hitCount);
    }

    if (sortMode === 'created_asc') {
      return [...filtered].sort(
        (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
      );
    }

    if (sortMode === 'created_desc') {
      return [...filtered].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      );
    }

    return filtered;
  }, [audienceFilter, filter, qas, sortMode]);

  const visibleQaLimit = useMemo(() => {
    const targetId = typeof editingId === 'number' ? editingId : selectedId;
    const targetIndex = filteredQas.findIndex((qa) => qa.id === targetId);
    const baseLimit = Math.min(visibleQaCount, QA_LIST_MAX_VISIBLE);

    return targetIndex >= baseLimit
      ? Math.min(targetIndex + 1, QA_LIST_MAX_VISIBLE)
      : baseLimit;
  }, [editingId, filteredQas, selectedId, visibleQaCount]);

  const visibleQas = useMemo(
    () => filteredQas.slice(0, visibleQaLimit),
    [filteredQas, visibleQaLimit],
  );
  const hasMoreQas = visibleQas.length < filteredQas.length;
  const reachedVisibleLimit =
    visibleQas.length >= QA_LIST_MAX_VISIBLE &&
    filteredQas.length > QA_LIST_MAX_VISIBLE;
  const selectedQas = useMemo(
    () => qas.filter((qa) => selectedQaIds.includes(qa.id) && qa.status !== 'deleted'),
    [qas, selectedQaIds],
  );
  const visibleSelectableQas = useMemo(
    () => visibleQas.filter((qa) => editingId !== qa.id),
    [editingId, visibleQas],
  );
  const visibleSelectedCount = visibleSelectableQas.filter((qa) =>
    selectedQaIds.includes(qa.id),
  ).length;
  const isAllVisibleSelected =
    visibleSelectableQas.length > 0 &&
    visibleSelectedCount === visibleSelectableQas.length;

  useEffect(() => {
    void loadQas();
  }, []);

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setNotice('');
      setError('');
    }, error ? 6000 : 2600);

    return () => window.clearTimeout(timeout);
  }, [error, notice]);

  useEffect(() => {
    setVisibleQaCount(QA_LIST_PAGE_SIZE);
  }, [audienceFilter, filter, sortMode]);

  useEffect(() => {
    if (editingId === 'new') {
      qaListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editingId]);

  async function loadQas(nextSelectedId: number | null = selectedId) {
    setLoading(true);
    setError('');

    try {
      const data = await listQa();
      setQas(data);
      setSelectedQaIds((current) =>
        current.filter((id) => data.some((qa) => qa.id === id && qa.status !== 'deleted')),
      );
      const nextSelected = nextSelectedId;
      setSelectedId(nextSelected);
      const nextQa = data.find((qa) => qa.id === nextSelected);

      if (nextQa) {
        setForm(toForm(nextQa));
      } else {
        setSelectedId(null);
        setForm(emptyForm);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setSelectedId(null);
    setEditingId('new');
    setForm(emptyForm);
    setSimilarCandidates([]);
    setSelectedQaIds([]);
    window.requestAnimationFrame(() => {
      qaListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function startEdit(qa: KbQa) {
    setSelectedId(qa.id);
    setEditingId(qa.id);
    setForm(toForm(qa));
    setSimilarCandidates([]);
  }

  function cancelEdit() {
    setEditingId(null);
    setSimilarCandidates([]);

    if (selectedId) {
      const selectedQaAfterCancel = qas.find((qa) => qa.id === selectedId);
      setForm(selectedQaAfterCancel ? toForm(selectedQaAfterCancel) : emptyForm);
    } else {
      setForm(emptyForm);
    }
  }

  function updateField<Key extends keyof QaForm>(key: Key, value: QaForm[Key]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function loadMoreVisibleQas() {
    setVisibleQaCount((current) =>
      Math.min(current + QA_LIST_PAGE_SIZE, filteredQas.length, QA_LIST_MAX_VISIBLE),
    );
  }

  function handleQaListScroll(event: UIEvent<HTMLDivElement>) {
    if (!hasMoreQas || reachedVisibleLimit) {
      return;
    }

    const list = event.currentTarget;
    const distanceToBottom = list.scrollHeight - list.scrollTop - list.clientHeight;

    if (distanceToBottom < 160) {
      loadMoreVisibleQas();
    }
  }

  function toggleTestAudience(value: string) {
    setTestAudiences((current) => {
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];

      return next.length > 0 ? next : current;
    });
  }

  function updateMinScore(value: number, syncInput = true) {
    if (Number.isNaN(value)) {
      return;
    }

    const nextValue = Math.min(1, Math.max(0, value));
    setMinScore(Number(nextValue.toFixed(2)));

    if (syncInput) {
      setMinScoreInput(nextValue.toFixed(2));
    }
  }

  function updateMinScoreInput(value: string) {
    if (!/^(?:0(?:\.\d{0,2})?|1(?:\.0{0,2})?|\.\d{0,2})?$/.test(value)) {
      return;
    }

    setMinScoreInput(value);

    if (value && value !== '.') {
      updateMinScore(Number(value), false);
    }
  }

  function commitMinScoreInput() {
    if (!minScoreInput || minScoreInput === '.') {
      setMinScoreInput(minScore.toFixed(2));
      return;
    }

    updateMinScore(Number(minScoreInput));
  }

  function toggleSelectedQa(id: number) {
    setSelectedQaIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleVisibleSelected() {
    const visibleIds = visibleSelectableQas.map((qa) => qa.id);

    setSelectedQaIds((current) => {
      if (isAllVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }

      return [...new Set([...current, ...visibleIds])];
    });
  }

  function clearSelectedQas() {
    setSelectedQaIds([]);
  }

  function requestBatchDeleteConfirm() {
    if (selectedQas.length === 0) {
      setNotice('请先选择要删除的 QA');
      return;
    }

    setError('');
    setConfirmAction({ type: 'batch', action: 'delete', qas: selectedQas });
  }

  async function deleteBatchQas(qasToDelete: KbQa[]): Promise<boolean> {
    setError('');
    setNotice('');

    try {
      for (const qa of qasToDelete) {
        await deleteQa(qa.id);
      }

      await loadQas(null);
      setEditingId(null);
      setSelectedQaIds([]);
      setNotice(`已删除 ${qasToDelete.length} 条 QA`);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '批量操作失败');
      return false;
    }
  }

  function exportSelectedQas() {
    if (selectedQas.length === 0) {
      setNotice('请先选择要导出的 QA');
      return;
    }

    const headers = ['编号', '适用对象', '分类路径', '标准问题', '相似问法', '标准答案', '解答思路', '命中次数'];
    const rows = selectedQas.map((qa) => [
      qa.code,
      audienceLabel(qa.audience),
      qa.categoryPath || '',
      qa.standardQuestion,
      qa.similarQuestions || '',
      qa.answer,
      qa.solutionIdea || '',
      String(qa.hitCount),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `kb_qa_export_${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice(`已导出 ${selectedQas.length} 条 QA`);
  }

  function requestSaveConfirm() {
    if (!form.standardQuestion.trim() || !form.answer.trim()) {
      setError('标准问题和答案不能为空');
      return;
    }

    setError('');
    setConfirmAction({ type: 'save-form' });
  }

  function requestDeleteConfirm(qa: KbQa) {
    setError('');
    setConfirmAction({ type: 'status', qa, action: 'delete' });
  }

  async function saveQa(): Promise<boolean> {
    setSaving(true);
    setError('');
    setNotice('');

    try {
      const existingId = typeof editingId === 'number' ? editingId : null;
      const saved = existingId
        ? await updateQa(existingId, form)
        : await createQa(form);
      await loadQas(saved.id);
      setEditingId(null);
      setSelectedId(saved.id);
      setSimilarCandidates([]);
      setNotice(existingId ? '已保存修改' : '已新增 QA');
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '保存失败');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteSingleQa(qa: KbQa): Promise<boolean> {
    setError('');
    setNotice('');

    try {
      await deleteQa(qa.id);
      setNotice('已删除');

      await loadQas(null);
      if (editingId === qa.id) {
        setEditingId(null);
      }
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '操作失败');
      return false;
    }
  }

  async function confirmCurrentAction() {
    if (!confirmAction) {
      return;
    }

    setConfirming(true);

    try {
      const success =
        confirmAction.type === 'save-form'
          ? await saveQa()
          : confirmAction.type === 'batch'
            ? await deleteBatchQas(confirmAction.qas)
            : await deleteSingleQa(confirmAction.qa);

      if (success) {
        setConfirmAction(null);
      }
    } finally {
      setConfirming(false);
    }
  }

  function downloadTemplate() {
    const link = document.createElement('a');
    link.href = getImportTemplateUrl();
    link.download = 'kb_qa_import_template.xlsx';
    link.click();
  }

  function toImportProgress(job: ImportQaJobSnapshot): NonNullable<ImportProgress> {
    return {
      fileName: job.fileName || '导入文件',
      status: job.status,
      percent: job.percent,
      total: job.total,
      processed: job.processed,
      success: job.success,
      failed: job.failed,
      message: job.message,
      errors: job.errors,
    };
  }

  async function waitForImportJob(jobId: string): Promise<ImportQaJobSnapshot> {
    let latest = await getImportJob(jobId);
    setImportProgress(toImportProgress(latest));

    while (latest.status === 'queued' || latest.status === 'running') {
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      latest = await getImportJob(jobId);
      setImportProgress(toImportProgress(latest));
    }

    return latest;
  }

  async function handleImportExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('请上传 .xlsx 或 .xls 文件');
      return;
    }

    setImporting(true);
    setImportProgress({
      fileName: file.name,
      status: 'uploading',
      percent: 0,
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      message: '准备上传',
      errors: [],
    });
    setError('');
    setNotice('');

    try {
      const startedJob = await importExcel(file, (progress) => {
        setImportProgress({
          fileName: file.name,
          status: 'uploading',
          percent: progress.percent,
          total: 0,
          processed: 0,
          success: 0,
          failed: 0,
          message:
            progress.phase === 'uploading'
              ? `上传中 ${progress.percent}%`
              : '文件已上传，正在解析并写入知识库',
          errors: [],
        });
      });
      setImportProgress(toImportProgress(startedJob));
      const result = await waitForImportJob(startedJob.jobId);

      if (result.status === 'failed') {
        throw new Error(result.message || '导入失败');
      }

      await loadQas();

      if (result.failed > 0) {
        const errorSummary = result.errors
          .slice(0, 3)
          .map((item) => `第 ${item.row} 行：${item.message}`)
          .join('；');
        setError(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条。${errorSummary}`);
      } else {
        setNotice(`导入完成：成功 ${result.success}/${result.total} 条`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '导入失败');
    } finally {
      setImporting(false);
      window.setTimeout(() => setImportProgress(null), 1500);
    }
  }

  async function runGenerateSimilar() {
    if (!selectedQa) return;

    setError('');
    setNotice('');

    try {
      const result = await generateSimilarQuestions(selectedQa.id);
      setSimilarCandidates(result.candidates);
      setNotice('已生成相似问法候选');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '生成失败');
    }
  }

  function appendSimilarQuestion(question: string) {
    const current = parseSimilarQuestions(form.similarQuestions);

    if (!current.includes(question)) {
      updateField('similarQuestions', [...current, question].join(';'));
    }
  }

  function parseSimilarQuestions(value?: string) {
    return (value || '')
      .replace(/([?？])\s*/g, '$1\n')
      .split(/[;；\n\r]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function countSimilarQuestions(value?: string) {
    return parseSimilarQuestions(value).length;
  }

  async function runTestSearch() {
    if (!testQuery.trim()) {
      setError('请输入测试问题');
      return;
    }

    setSearching(true);
    setError('');
    setSearchResult(null);

    try {
      const result = await testSearch({
        query: testQuery,
        businessDomain: '',
        audiences: testAudiences.length > 0 ? testAudiences : ['common', 'runner'],
        minScore,
        vectorTopK: Math.max(20, finalTopK * 4),
        finalTopK,
      });
      setSearchResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '测试失败');
    } finally {
      setSearching(false);
    }
  }

  function renderQaRow(qa: KbQa) {
    const isEditing = editingId === qa.id;
    const similarQuestions = parseSimilarQuestions(qa.similarQuestions);
    const similarCount = similarQuestions.length;
    const hasSolutionIdea = Boolean(qa.solutionIdea?.trim());

    return (
      <div className={`qa-row-block ${isEditing ? 'editing' : ''}`} key={qa.id}>
        <div className="qa-row">
          <span className="row-select">
            <CheckboxControl
              ariaLabel="选择 QA"
              checked={selectedQaIds.includes(qa.id)}
              disabled={isEditing}
              onCheckedChange={() => toggleSelectedQa(qa.id)}
            />
          </span>
          <span className="qa-row-content">
            <span className="qa-row-title-line">
              <strong title={qa.standardQuestion}>{qa.standardQuestion}</strong>
              <span
                className="qa-row-meta"
                title={`${qa.categoryPath || '未分类'} · ${audienceLabel(qa.audience)} · ${qa.code}`}
              >
                {qa.categoryPath || '未分类'} · {audienceLabel(qa.audience)} · {qa.code}
              </span>
            </span>
            <span className="qa-answer-preview">{qa.answer}</span>
            {(similarCount > 0 || hasSolutionIdea) && (
              <span className="qa-row-signals">
                {similarCount > 0 && (
                  <SignalPopover
                    items={similarQuestions}
                    label={`相似问题 ${similarCount}`}
                    title="相似问题"
                  />
                )}
                {hasSolutionIdea && (
                  <SignalPopover label="解答思路" text={qa.solutionIdea} title="解答思路" />
                )}
              </span>
            )}
          </span>
          <span className="hit-count">命中 {qa.hitCount} 次</span>
          <div className="row-actions">
            {isEditing ? (
              <>
                <Button
                  highContrast
                  size="1"
                  disabled={saving}
                  onClick={requestSaveConfirm}
                  type="button"
                >
                  <Check size={15} />
                  {saving ? '保存中' : '保存'}
                </Button>
                <Button color="gray" highContrast size="1" variant="outline" onClick={cancelEdit} type="button">
                  <X size={15} />
                  取消
                </Button>
              </>
            ) : (
              <>
                <Button
                  highContrast
                  size="1"
                  variant="ghost"
                  onClick={() => startEdit(qa)}
                  type="button"
                  title="编辑 QA"
                >
                  <SquarePen size={15} />
                  编辑
                </Button>
                <Button
                  color="red"
                  size="1"
                  variant="ghost"
                  onClick={() => requestDeleteConfirm(qa)}
                  type="button"
                  title="删除 QA"
                >
                  <Trash2 size={15} />
                  删除
                </Button>
              </>
            )}
          </div>
        </div>
        {isEditing && renderInlineEditor(qa)}
      </div>
    );
  }

  function renderInlineEditor(qa?: KbQa) {
    const isNew = !qa;

    return (
      <div className={`qa-inline-editor ${isNew ? 'new' : ''}`} key={qa?.id || 'new'}>
        {isNew && (
          <div className="inline-editor-bar">
            <div>
              <h3>新增 QA</h3>
              <p>保存后立即生成索引并生效</p>
            </div>
            <div className="row-actions">
              <Button
                highContrast
                size="1"
                disabled={saving}
                onClick={requestSaveConfirm}
                type="button"
              >
                <Check size={15} />
                {saving ? '保存中' : '保存'}
              </Button>
              <Button color="gray" highContrast size="1" variant="outline" onClick={cancelEdit} type="button">
                <X size={15} />
                取消
              </Button>
            </div>
          </div>
        )}

        <div className="inline-edit-fields">
          <div className="inline-form-grid">
            <Field label="标准问题">
              <TextField.Root
                value={form.standardQuestion}
                onChange={(event) => updateField('standardQuestion', event.target.value)}
                placeholder="注册跑男流程"
              />
            </Field>
            <Field label="分类路径">
              <TextField.Root
                value={form.categoryPath}
                onChange={(event) => updateField('categoryPath', event.target.value)}
                placeholder="跑男注册/注册流程"
              />
            </Field>
            <Field label="适用对象">
              <SelectField
                ariaLabel="适用对象"
                options={audienceOptions}
                value={form.audience}
                onValueChange={(value) => updateField('audience', value)}
              />
            </Field>
          </div>

          <Field label="相似问法">
            <TextArea
              value={form.similarQuestions}
              onChange={(event) => updateField('similarQuestions', event.target.value)}
              placeholder="如何加入跑男;怎么跑单，也支持换行粘贴"
              rows={2}
            />
          </Field>

          <div className="inline-actions">
            <Button
              color="gray"
              highContrast
              variant="outline"
              disabled={!selectedQa}
              onClick={() => void runGenerateSimilar()}
              type="button"
              title="生成相似问法"
            >
              <Sparkles size={17} />
              生成相似问法
            </Button>
            {similarCandidates.map((candidate) => (
              <Button
                color="gray"
                size="1"
                variant="soft"
                key={candidate}
                onClick={() => appendSimilarQuestion(candidate)}
                type="button"
                title="追加到相似问法"
              >
                <Plus size={14} />
                {candidate}
              </Button>
            ))}
          </div>

          <Field label="标准答案">
            <TextArea
              value={form.answer}
              onChange={(event) => updateField('answer', event.target.value)}
              rows={3}
            />
          </Field>

          <Field label="解答思路">
            <TextArea
              value={form.solutionIdea}
              onChange={(event) => updateField('solutionIdea', event.target.value)}
              rows={2}
            />
          </Field>
        </div>
      </div>
    );
  }

  function confirmTitle() {
    if (!confirmAction) return '';

    if (confirmAction.type === 'save-form') {
      return '确认保存这条 QA？';
    }

    if (confirmAction.type === 'batch') {
      return `确认批量删除 ${confirmAction.qas.length} 条 QA？`;
    }

    return '确认删除这条 QA？';
  }

  function confirmDescription() {
    if (!confirmAction) return '';

    if (confirmAction.type === 'save-form') {
      const target = form.standardQuestion.trim() || '当前 QA';
      return `「${target}」保存后会立即生成或更新索引，并生效。`;
    }

    if (confirmAction.type === 'batch') {
      return '选中的 QA 删除后不再出现在知识库列表中，也不再参与知识库召回。';
    }

    const target = `「${confirmAction.qa.standardQuestion}」`;
    return `${target} 删除后不再出现在知识库列表中，也不再参与知识库召回。`;
  }

  function confirmButtonText() {
    if (!confirmAction) return '';

    if (confirmAction.type === 'save-form') {
      return '确认保存';
    }

    if (confirmAction.type === 'batch') {
      return '确认删除';
    }

    return '确认删除';
  }

  function isDangerConfirm() {
    return (
      (confirmAction?.type === 'status' || confirmAction?.type === 'batch') &&
      confirmAction.action === 'delete'
    );
  }

  return (
    <Theme accentColor="gray" grayColor="slate" panelBackground="solid">
      <Toast.Provider swipeDirection="up">
        <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">U</div>
          <div className="brand-copy">
            <div className="brand-title">AI 客服</div>
            <div className="brand-subtitle">UU 跑男</div>
          </div>
          <span className="sidebar-toggle-slot">
            <TooltipLabel content={sidebarCollapsed ? '展开菜单' : '折叠菜单'}>
              <IconButton
                aria-label={sidebarCollapsed ? '展开菜单' : '折叠菜单'}
                color="gray"
                onClick={() => setSidebarCollapsed((current) => !current)}
                size="2"
                type="button"
                variant="outline"
              >
                {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </IconButton>
            </TooltipLabel>
          </span>
        </div>
        <nav className="menu">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`menu-item ${item.active ? 'active' : ''}`}
                key={item.label}
                type="button"
                title={item.active ? item.label : `${item.label}，暂未开放`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Knowledge Base</div>
            <h1>知识库</h1>
          </div>
          <div className="toolbar">
            <Button highContrast onClick={() => void loadQas()} type="button" variant="ghost" title="刷新 QA">
              <RefreshCw size={17} />
              刷新
            </Button>
            <Button highContrast onClick={downloadTemplate} type="button" variant="ghost" title="下载 Excel 模板">
              <Download size={17} />
              下载模板
            </Button>
            <Button
              highContrast
              variant="ghost"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
              type="button"
              title="导入 Excel"
            >
              <Upload size={17} />
              {importing ? '导入中' : '导入 Excel'}
            </Button>
            <input
              accept=".xlsx,.xls"
              className="file-input"
              onChange={(event) => void handleImportExcel(event)}
              ref={fileInputRef}
              type="file"
            />
            <Button
              color="gray"
              highContrast
              onClick={() => setDrawer('test')}
              type="button"
              variant="outline"
              title="召回测试"
            >
              <Sparkles size={17} />
              召回测试
            </Button>
            <Button highContrast onClick={startCreate} type="button" title="新增 QA">
              <Plus size={17} />
              新增 QA
            </Button>
          </div>
        </header>

        {importProgress && (
          <div
            className={`import-progress ${importProgress.status}`}
            style={{ '--import-progress': `${Math.min(100, Math.max(0, importProgress.percent))}%` } as CSSProperties}
          >
            <div className="import-progress-copy">
              <Upload size={16} />
              <div>
                <strong>{importProgress.message}</strong>
                <span>
                  {importProgress.fileName}
                  {importProgress.total > 0
                    ? ` · 已处理 ${importProgress.processed}/${importProgress.total} 条`
                    : ''}
                </span>
              </div>
            </div>
            <div className="import-progress-meta">
              <span>{importProgress.percent}%</span>
              {importProgress.total > 0 && (
                <div className="import-progress-stats">
                  <span>成功 {importProgress.success}</span>
                  <span>失败 {importProgress.failed}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Toast.Root
          className={`toast ${error ? 'error' : 'success'}`}
          duration={error ? 6000 : 2600}
          onOpenChange={(open) => {
            if (!open) {
              setNotice('');
              setError('');
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

        <section className="list-workspace">
          <div className="qa-list-panel">
            <div className="panel-head">
              <div>
                <h2>知识库列表</h2>
                <p>
                  {loading
                    ? '加载中'
                    : `${filteredQas.length} 条结果 · 已显示 ${visibleQas.length}`}
                </p>
              </div>
              <Search size={18} />
            </div>

            <div className="filters">
              <TextField.Root
                className="search-field"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="搜索问题、分类"
              >
                <TextField.Slot>
                  <Search size={16} />
                </TextField.Slot>
                {filter && (
                  <TextField.Slot>
                    <IconButton
                    aria-label="清空搜索"
                    color="gray"
                    onClick={() => setFilter('')}
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
                value={audienceFilter}
                onValueChange={setAudienceFilter}
              />
              <SelectField
                ariaLabel="排序方式"
                options={sortOptions}
                value={sortMode}
                onValueChange={(value) => setSortMode(value as SortMode)}
              />
            </div>

            {selectedQas.length > 0 && (
              <div className="batch-toolbar">
                <label className="batch-select-all">
                  <CheckboxControl
                    ariaLabel="选择当前可见 QA"
                    checked={isAllVisibleSelected ? true : visibleSelectedCount > 0 ? 'indeterminate' : false}
                    onCheckedChange={toggleVisibleSelected}
                  />
                  已选 {selectedQas.length} 条
                </label>
                <div className="batch-actions">
                  <Button color="gray" highContrast size="1" variant="outline" onClick={exportSelectedQas} type="button">
                    <Download size={15} />
                    导出
                  </Button>
                  <Button color="red" size="1" variant="outline" onClick={requestBatchDeleteConfirm} type="button">
                    <Trash2 size={15} />
                    删除
                  </Button>
                  <Button color="gray" highContrast size="1" variant="outline" onClick={clearSelectedQas} type="button">
                    <X size={15} />
                    取消勾选
                  </Button>
                </div>
              </div>
            )}

            <div className="qa-list" onScroll={handleQaListScroll} ref={qaListRef}>
              {editingId === 'new' && renderInlineEditor()}
              {!loading && editingId !== 'new' && visibleQas.length === 0 ? (
                <div className="empty-state">
                  <Database size={28} />
                  <h3>{qas.length === 0 ? '还没有知识数据' : '没有匹配的知识'}</h3>
                  <p>
                    {qas.length === 0
                      ? '可以先导入 Excel，或手动新增一条 QA。'
                      : '试试调整搜索关键词或适用对象筛选。'}
                  </p>
                  <div className="empty-actions">
                    {qas.length === 0 ? (
                      <>
                        <Button color="gray" highContrast variant="outline" onClick={() => fileInputRef.current?.click()} type="button">
                          <Upload size={16} />
                          导入 Excel
                        </Button>
                        <Button highContrast onClick={startCreate} type="button">
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
                          setFilter('');
                          setAudienceFilter('all');
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
                visibleQas.map((qa) => renderQaRow(qa))
              )}
              {hasMoreQas && (
                <div className="qa-list-loader">
                  {reachedVisibleLimit
                    ? `已显示前 ${QA_LIST_MAX_VISIBLE} 条，请通过搜索、对象或排序缩小范围`
                    : `继续下滑加载更多，每次 ${QA_LIST_PAGE_SIZE} 条`}
                </div>
              )}
            </div>
          </div>
        </section>

        {drawer && (
          <div className="drawer-layer" role="presentation">
            <button className="drawer-backdrop" onClick={() => setDrawer(null)} type="button" />
            <aside className="drawer" aria-label="召回测试">
              <div className="drawer-head">
                <div>
                  <h2>召回测试</h2>
                  <p>实时调用 test-search</p>
                </div>
                <TooltipLabel content="关闭">
                  <IconButton aria-label="关闭" color="gray" onClick={() => setDrawer(null)} type="button" variant="outline">
                    <X size={18} />
                  </IconButton>
                </TooltipLabel>
              </div>

              <div className="drawer-body">
                <Field className="test-query-field" label="测试问题">
                  <TextArea
                    value={testQuery}
                    onChange={(event) => setTestQuery(event.target.value)}
                    rows={2}
                  />
                </Field>
                <div className="test-grid">
                  <Field label="测试对象">
                    <div className="check-chip-group">
                      {audienceOptions.map((option) => {
                        const checked = testAudiences.includes(option.value);

                        return (
                          <label className="check-chip" key={option.value}>
                            <Checkbox
                              aria-label={`测试对象：${option.label}`}
                              checked={checked}
                              onCheckedChange={() => toggleTestAudience(option.value)}
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="最大召回数">
                    <SelectField
                      ariaLabel="最大召回数"
                      options={maxRecallOptions.map((option) => ({
                        value: String(option),
                        label: `${option} 条`,
                      }))}
                      value={String(finalTopK)}
                      onValueChange={(value) => setFinalTopK(Number(value))}
                    />
                  </Field>
                </div>
                <div className="score-control">
                  <div className="score-control-head">
                    <span>最低匹配度</span>
                    <TextField.Root
                      aria-label="最低匹配度"
                      className="score-input"
                      inputMode="decimal"
                      onBlur={commitMinScoreInput}
                      onChange={(event) => updateMinScoreInput(event.target.value)}
                      placeholder="0.50"
                      type="text"
                      value={minScoreInput}
                    />
                  </div>
                  <Slider
                    aria-label="最低匹配度"
                    max={1}
                    min={0}
                    onValueChange={([value]) => updateMinScore(value)}
                    step={0.01}
                    value={[minScore]}
                  />
                </div>
                <div className="drawer-actions">
                  <Button className="full" highContrast disabled={searching} onClick={() => void runTestSearch()} type="button">
                    <Search size={17} />
                    {searching ? '测试中' : '开始测试'}
                  </Button>
                </div>

                {searchResult && (
                  <div className="result-list">
                    <div className="result-summary">
                      <span>召回结果</span>
                      <strong>
                        {searchResult.matches.length}/{finalTopK}
                      </strong>
                    </div>
                    {searchResult.matches.length > 0 ? (
                      searchResult.matches.map((match, index) => (
                        <div className="result-box" key={`${match.qaId}-${match.indexType}-${index}`}>
                          <div className="result-score">
                            <span>{index === 0 ? '最佳命中' : `召回 ${index + 1}`}</span>
                            <strong>{match.score.toFixed(4)}</strong>
                          </div>
                          <h3>{match.standardQuestion}</h3>
                          <p>{match.answer}</p>
                          <small>
                            {indexTypeLabel(match.indexType)} · {match.matchedIndexText}
                          </small>
                        </div>
                      ))
                    ) : (
                      <div className="result-empty">没有达到最低匹配度的召回结果</div>
                    )}
                  </div>
                )}

              </div>
            </aside>
          </div>
        )}

        <AlertDialog.Root
          open={Boolean(confirmAction)}
          onOpenChange={(open) => {
            if (!open && !confirming) {
              setConfirmAction(null);
            }
          }}
        >
          {confirmAction && (
            <AlertDialog.Content maxWidth="460px">
                <AlertDialog.Title>{confirmTitle()}</AlertDialog.Title>
                <AlertDialog.Description>{confirmDescription()}</AlertDialog.Description>
                <div className="confirm-actions">
                  <AlertDialog.Cancel>
                    <Button color="gray" highContrast disabled={confirming} type="button" variant="outline">
                      取消
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button
                      color={isDangerConfirm() ? 'red' : 'gray'}
                      highContrast={!isDangerConfirm()}
                      variant={isDangerConfirm() ? 'outline' : 'solid'}
                      disabled={confirming}
                      onClick={(event) => {
                        event.preventDefault();
                        void confirmCurrentAction();
                      }}
                      type="button"
                    >
                      {confirming ? '处理中' : confirmButtonText()}
                    </Button>
                  </AlertDialog.Action>
                </div>
              </AlertDialog.Content>
          )}
        </AlertDialog.Root>
      </main>
        </div>
        <Toast.Viewport className="toast-viewport" />
      </Toast.Provider>
    </Theme>
  );
}

function audienceLabel(value?: string) {
  return audienceOptions.find((option) => option.value === value)?.label || value || '未设置';
}

function indexTypeLabel(value?: string) {
  const labels: Record<string, string> = {
    standard_question: '标准问题',
    manual_alias: '相似问法',
    category_question: '分类组合',
    answer_summary: '答案摘要',
  };

  return labels[value || ''] || value || '未知索引';
}

function SignalPopover({
  label,
  title,
  items,
  text,
}: {
  label: string;
  title: string;
  items?: string[];
  text?: string;
}) {
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

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CheckboxControl({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled = false,
}: {
  checked: boolean | 'indeterminate';
  onCheckedChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <Checkbox
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
    />
  );
}

function TooltipLabel({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  return <Tooltip content={content} delayDuration={180}>{children}</Tooltip>;
}

function SelectField({
  value,
  onValueChange,
  options,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  disabled?: boolean;
}) {
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

import type { ChangeEvent, UIEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  checkDuplicates,
  createQa,
  deleteQa,
  generateSimilarQuestions,
  getImportJob,
  getImportTemplateUrl,
  importExcel,
  listQa,
  testSearch,
  updateQa,
} from '../services/knowledgeBase';
import type {
  DuplicateCheckGroup,
  DuplicateCheckItem,
  DuplicateCheckResult,
  ImportQaJobSnapshot,
  KbQa,
  QaForm,
  SearchResult,
} from '../types/api';
import {
  emptyForm,
  QA_LIST_MAX_VISIBLE,
  QA_LIST_PAGE_SIZE,
} from '../constants/knowledgeBase';
import type {
  ConfirmAction,
  DrawerType,
  EditingId,
  ImportProgress,
  SortMode,
} from '../types/knowledgeBase';
import { audienceLabel, parseSimilarQuestions, toForm } from '../utils/knowledgeBase';

export function useKnowledgeBase() {
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
  const [duplicateAudience, setDuplicateAudience] = useState('all');
  const [duplicateMinScore, setDuplicateMinScore] = useState(0.86);
  const [duplicateResult, setDuplicateResult] = useState<DuplicateCheckResult | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [visibleQaCount, setVisibleQaCount] = useState(QA_LIST_PAGE_SIZE);
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

  function resetPageState() {
    setFilter('');
    setAudienceFilter('all');
    setSortMode('default');
    setVisibleQaCount(QA_LIST_PAGE_SIZE);
    setSelectedQaIds([]);
    setSelectedId(null);
    setEditingId(null);
    setForm(emptyForm);
    setSimilarCandidates([]);
    setSearchResult(null);
    setDuplicateResult(null);
    setDuplicateAudience('all');
    setDuplicateMinScore(0.86);
    setError('');
    setNotice('');
    setConfirmAction(null);
    setDrawer(null);
    void loadQas(null);
    window.requestAnimationFrame(() => {
      qaListRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    });
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

  function publishForm() {
    if (!form.standardQuestion.trim() || !form.answer.trim()) {
      setError('标准问题和答案不能为空');
      return;
    }

    setError('');
    void saveQa();
  }

  function requestDeleteConfirm(qa: KbQa) {
    setError('');
    setConfirmAction({ type: 'status', qa, action: 'delete' });
  }

  function requestDuplicateDeleteConfirm(group: DuplicateCheckGroup, item: DuplicateCheckItem) {
    setError('');
    setConfirmAction({
      type: 'duplicate-delete',
      item,
      groupId: group.id,
      action: 'delete',
    });
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
      setNotice(existingId ? '已发布修改' : '已新增并发布 QA');
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '发布失败');
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

  async function deleteDuplicateQa(
    item: DuplicateCheckItem,
    groupId: string,
  ): Promise<boolean> {
    setError('');
    setNotice('');

    try {
      await deleteQa(item.qaId);
      setQas((current) => current.filter((qa) => qa.id !== item.qaId));
      setSelectedQaIds((current) => current.filter((id) => id !== item.qaId));
      setDuplicateResult((current) => {
        if (!current) {
          return current;
        }

        const groups = current.groups
          .map((group) => {
            if (group.id !== groupId) {
              return group;
            }

            return {
              ...group,
              items: group.items.filter((groupItem) => groupItem.qaId !== item.qaId),
            };
          })
          .filter((group) => group.type !== 'standard_question' || group.items.length > 1);

        return {
          ...current,
          totalGroups: groups.length,
          groups,
        };
      });

      if (editingId === item.qaId) {
        setEditingId(null);
        setSelectedId(null);
        setForm(emptyForm);
      }

      setNotice(`已删除 ${item.code}`);
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
        confirmAction.type === 'batch'
          ? await deleteBatchQas(confirmAction.qas)
          : confirmAction.type === 'duplicate-delete'
            ? await deleteDuplicateQa(confirmAction.item, confirmAction.groupId)
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

  async function runDuplicateCheck() {
    setCheckingDuplicates(true);
    setDuplicateResult(null);
    setError('');

    try {
      const result = await checkDuplicates({
        audience: duplicateAudience,
        minScore: duplicateMinScore,
        limit: 50,
      });
      setDuplicateResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '重复检测失败');
    } finally {
      setCheckingDuplicates(false);
    }
  }

  function clearToast() {
    setNotice('');
    setError('');
  }

  return {
    appendSimilarQuestion,
    audienceFilter,
    cancelEdit,
    checkingDuplicates,
    clearSelectedQas,
    clearToast,
    commitMinScoreInput,
    confirmAction,
    confirmCurrentAction,
    confirming,
    downloadTemplate,
    drawer,
    duplicateAudience,
    duplicateMinScore,
    duplicateResult,
    editingId,
    error,
    exportSelectedQas,
    fileInputRef,
    filter,
    filteredQas,
    finalTopK,
    form,
    handleImportExcel,
    handleQaListScroll,
    hasMoreQas,
    importing,
    importProgress,
    isAllVisibleSelected,
    loading,
    minScore,
    minScoreInput,
    notice,
    publishForm,
    qaListRef,
    qas,
    reachedVisibleLimit,
    requestBatchDeleteConfirm,
    requestDeleteConfirm,
    requestDuplicateDeleteConfirm,
    resetPageState,
    runDuplicateCheck,
    runGenerateSimilar,
    runTestSearch,
    saving,
    searchResult,
    searching,
    selectedQa,
    selectedQaIds,
    selectedQas,
    setAudienceFilter,
    setConfirmAction,
    setDrawer,
    setDuplicateAudience,
    setDuplicateMinScore,
    setFilter,
    setFinalTopK,
    setSortMode,
    setTestQuery,
    similarCandidates,
    sortMode,
    startCreate,
    startEdit,
    testAudiences,
    testQuery,
    toggleSelectedQa,
    toggleTestAudience,
    toggleVisibleSelected,
    updateField,
    updateMinScore,
    updateMinScoreInput,
    visibleQaCount,
    visibleQas,
    visibleSelectableQas,
    visibleSelectedCount,
  };
}

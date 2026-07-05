import { KnowledgeBaseToolbar } from './components/KnowledgeBaseToolbar';
import { ConfirmQaDialog } from './components/ConfirmQaDialog';
import { ImportProgressBanner } from './components/ImportProgressBanner';
import { KnowledgeBaseDrawer } from './components/KnowledgeBaseDrawer';
import { QaListPanel } from './components/QaListPanel';
import { NoticeToast } from '../../components/common/NoticeToast';
import { useKnowledgeBase } from '../../hooks/useKnowledgeBase';

export function KnowledgeView() {
  const kb = useKnowledgeBase();

  return (
    <>
      <KnowledgeBaseToolbar kb={kb} />
      <ImportProgressBanner progress={kb.importProgress} />
      <NoticeToast notice={kb.notice} error={kb.error} onClose={kb.clearToast} />

      <section className="list-workspace">
        <QaListPanel kb={kb} />
      </section>

      <KnowledgeBaseDrawer kb={kb} />
      <ConfirmQaDialog
        confirmAction={kb.confirmAction}
        confirming={kb.confirming}
        onCancel={() => kb.setConfirmAction(null)}
        onConfirm={() => void kb.confirmCurrentAction()}
      />
    </>
  );
}

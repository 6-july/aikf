import { AlertDialog, Button } from '@radix-ui/themes';
import type { ConfirmAction } from '../../../types/knowledgeBase';

interface ConfirmQaDialogProps {
  confirmAction: ConfirmAction | null;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmQaDialog({
  confirmAction,
  confirming,
  onCancel,
  onConfirm,
}: ConfirmQaDialogProps) {
  return (
    <AlertDialog.Root
      open={Boolean(confirmAction)}
      onOpenChange={(open) => {
        if (!open && !confirming) {
          onCancel();
        }
      }}
    >
      {confirmAction && (
        <AlertDialog.Content maxWidth="460px">
          <AlertDialog.Title>{confirmTitle(confirmAction)}</AlertDialog.Title>
          <AlertDialog.Description>{confirmDescription(confirmAction)}</AlertDialog.Description>
          <div className="confirm-actions">
            <AlertDialog.Cancel>
              <Button color="gray" highContrast disabled={confirming} type="button" variant="outline">
                取消
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color={isDangerConfirm(confirmAction) ? 'red' : 'gray'}
                highContrast={!isDangerConfirm(confirmAction)}
                variant={isDangerConfirm(confirmAction) ? 'outline' : 'solid'}
                disabled={confirming}
                onClick={(event) => {
                  event.preventDefault();
                  onConfirm();
                }}
                type="button"
              >
                {confirming ? '处理中' : confirmButtonText(confirmAction)}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      )}
    </AlertDialog.Root>
  );
}

function confirmTitle(confirmAction: ConfirmAction) {
  if (confirmAction.type === 'batch') {
    return `确认删除选中的 ${confirmAction.qas.length} 条 QA？`;
  }

  if (confirmAction.type === 'duplicate-delete') {
    return '确认删除这条重复 QA？';
  }

  return '确认删除这条 QA？';
}

function confirmDescription(confirmAction: ConfirmAction) {
  if (confirmAction.type === 'batch') {
    return '批量删除后，这些 QA 将不再出现在知识库列表中，也不再参与知识库召回。';
  }

  if (confirmAction.type === 'duplicate-delete') {
    return `「${confirmAction.item.code} · ${confirmAction.item.standardQuestion}」删除后将从当前检测结果中移除，也不再参与知识库召回。`;
  }

  const target = `「${confirmAction.qa.standardQuestion}」`;
  return `${target} 删除后不再出现在知识库列表中，也不再参与知识库召回。`;
}

function confirmButtonText(confirmAction: ConfirmAction) {
  if (confirmAction.type === 'batch') {
    return `删除 ${confirmAction.qas.length} 条`;
  }

  return '确认删除';
}

function isDangerConfirm(confirmAction: ConfirmAction) {
  return confirmAction.action === 'delete';
}

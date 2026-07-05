import { Badge, Button, TextArea } from '@radix-ui/themes';
import { Bot, CheckCircle2, SendHorizontal, UserRound } from 'lucide-react';
import type { AgentPreset } from '../types';

interface AgentPreviewColumnProps {
  agent: AgentPreset;
}

export function AgentPreviewColumn({ agent }: AgentPreviewColumnProps) {
  return (
    <section className="agent-studio-column agent-preview-column">
      <div className="studio-column-head">
        <div>
          <span>Preview</span>
          <h2>预览与调试</h2>
        </div>
        <Badge color="gray" variant="soft">模拟对话</Badge>
      </div>

      <div className="agent-chat-thread">
        <div className="chat-message assistant">
          <span className="chat-avatar small"><Bot size={16} /></span>
          <div>
            <strong>{agent.name}-线侧</strong>
            <p>{agent.openingMessage}</p>
          </div>
        </div>
        <div className="chat-message user">
          <span className="chat-avatar user-icon"><UserRound size={16} /></span>
          <div>
            <strong>zhangxl1120</strong>
            <p>转人工</p>
          </div>
        </div>
        <div className="chat-run-card">
          <span>
            <CheckCircle2 size={16} />
            运行完毕
          </span>
          <small>3.0s · 3588 Tokens</small>
        </div>
        <div className="chat-message assistant">
          <span className="chat-avatar small"><Bot size={16} /></span>
          <div>
            <strong>{agent.name}-线侧</strong>
            <p>{agent.fallbackMessage} 您可以继续描述接单、认证、账户或费用问题，我会优先帮您核对规则。</p>
          </div>
        </div>
        <div className="chat-message user">
          <span className="chat-avatar user-icon"><UserRound size={16} /></span>
          <div>
            <strong>zhangxl1120</strong>
            <p>我注册完多久可以接单？</p>
          </div>
        </div>
        <div className="chat-run-card">
          <span>
            <CheckCircle2 size={16} />
            调用知识库检索
          </span>
          <small>命中：注册跑男流程 · 0.8179</small>
        </div>
        <div className="chat-message assistant">
          <span className="chat-avatar small"><Bot size={16} /></span>
          <div>
            <strong>{agent.name}-线侧</strong>
            <p>完成实名认证、培训考试和签约后即可开始接单。具体以跑男端页面提示为准。</p>
          </div>
        </div>
      </div>

      <div className="agent-chat-input">
        <TextArea placeholder="继续对话..." rows={2} />
        <Button highContrast type="button" aria-label="发送">
          <SendHorizontal size={17} />
        </Button>
      </div>
      <p className="agent-chat-note">内容由 AI 生成，无法确保真实性，仅供参考。</p>
    </section>
  );
}

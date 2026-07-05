import { Checkbox, Select, Switch, TextArea, TextField } from '@radix-ui/themes';
import { useState } from 'react';
import { BookOpenCheck, CreditCard, Headphones, ReceiptText, ShieldCheck } from 'lucide-react';
import type { AgentPreset } from '../types';

interface AgentConfigColumnProps {
  agent: AgentPreset;
  onDraftChange: () => void;
}

const modelOptions = ['Doubao Pro 32K', 'Doubao Lite 32K', 'Deepseek-V3-VolcEngine'];
const kbAudienceOptions = ['通用', '跑男', '用户'];
const maxRecallOptions = ['1', '3', '5', '10', '20'];
const toolIcons: Record<string, typeof BookOpenCheck> = {
  知识库检索: BookOpenCheck,
  账户信息查询: CreditCard,
  实名认证查询: ShieldCheck,
  订单查询: ReceiptText,
  转人工: Headphones,
};

export function AgentConfigColumn({ agent, onDraftChange }: AgentConfigColumnProps) {
  const [model, setModel] = useState(agent.model);
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [openingMessage, setOpeningMessage] = useState(agent.openingMessage);
  const [knowledgeEnabled, setKnowledgeEnabled] = useState(true);
  const [knowledgeAudiences, setKnowledgeAudiences] = useState<string[]>(['通用', '跑男']);
  const [minScore, setMinScore] = useState('0.50');
  const [maxRecall, setMaxRecall] = useState('5');
  const [toolEnabled, setToolEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(agent.tools.map((tool) => [tool.name, tool.enabled])),
  );
  const enabledToolCount = Object.values(toolEnabled).filter(Boolean).length;

  return (
    <section className="agent-studio-column agent-config-column">
      <div className="studio-column-head config-head">
        <h2>配置</h2>
        <Select.Root
          value={model}
          onValueChange={(value) => {
            setModel(value);
            onDraftChange();
          }}
        >
          <Select.Trigger className="studio-model-select" aria-label="模型选择" />
          <Select.Content position="popper">
            {modelOptions.map((option) => (
              <Select.Item key={option} value={option}>{option}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </div>

      <div className="studio-config-accordion">
        <details className="studio-config-group" open>
          <summary>
            <span>智能体基础配置</span>
          </summary>
          <div className="studio-form-stack">
            <label className="studio-field">
              <span>名称</span>
              <TextField.Root
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  onDraftChange();
                }}
              />
            </label>
            <label className="studio-field">
              <span>描述</span>
              <TextArea
                value={description}
                rows={2}
                onChange={(event) => {
                  setDescription(event.target.value);
                  onDraftChange();
                }}
              />
            </label>
          </div>
        </details>

        <details className="studio-config-group" open>
          <summary>
            <span>开场白</span>
          </summary>
          <div className="studio-form-stack">
            <label className="studio-field">
              <span>用户进入会话后先看到的第一句话</span>
              <TextArea
                value={openingMessage}
                rows={2}
                onChange={(event) => {
                  setOpeningMessage(event.target.value);
                  onDraftChange();
                }}
              />
            </label>
          </div>
        </details>

        <details className="studio-config-group" open>
          <summary>
            <span>知识库配置</span>
            <span
              className="studio-summary-switch"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <Switch
                aria-label="启用知识库召回"
                checked={knowledgeEnabled}
                highContrast
                onCheckedChange={(checked) => {
                  setKnowledgeEnabled(checked);
                  onDraftChange();
                }}
                size="1"
              />
            </span>
          </summary>
          <div className="studio-form-stack">
            <label className="studio-field">
              <span>对象范围</span>
              <div className="studio-option-grid">
                {kbAudienceOptions.map((option) => {
                  const checked = knowledgeAudiences.includes(option);

                  return (
                    <label className={`studio-toggle-pill${checked ? ' selected' : ''}`} key={option}>
                      <Checkbox
                        checked={checked}
                        highContrast
                        onCheckedChange={(nextChecked) => {
                          setKnowledgeAudiences((current) => {
                            if (nextChecked === true) {
                              return current.includes(option) ? current : [...current, option];
                            }

                            return current.filter((item) => item !== option);
                          });
                          onDraftChange();
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </label>
            <div className="studio-field-grid">
              <label className="studio-field">
                <span>最小分值</span>
                <TextField.Root
                  value={minScore}
                  onChange={(event) => {
                    setMinScore(event.target.value);
                    onDraftChange();
                  }}
                />
              </label>
              <label className="studio-field">
                <span>最大召回</span>
                <Select.Root
                  value={maxRecall}
                  onValueChange={(value) => {
                    setMaxRecall(value);
                    onDraftChange();
                  }}
                >
                  <Select.Trigger />
                  <Select.Content position="popper">
                    {maxRecallOptions.map((option) => (
                      <Select.Item key={option} value={option}>{option} 条</Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </label>
            </div>
          </div>
        </details>

        <details className="studio-config-group" open>
          <summary>
            <span>Tool 选择</span>
            <span className="studio-summary-note">{enabledToolCount} 个启用</span>
          </summary>
          <div className="studio-tool-list compact">
            {agent.tools.map((tool) => {
              const Icon = toolIcons[tool.name] || BookOpenCheck;

              return (
                <label className="studio-tool-item" key={tool.name}>
                  <Checkbox
                    checked={toolEnabled[tool.name]}
                    highContrast
                    onCheckedChange={(checked) => {
                      setToolEnabled((current) => ({ ...current, [tool.name]: checked === true }));
                      onDraftChange();
                    }}
                  />
                  <span className="studio-tool-icon"><Icon size={15} /></span>
                  <span className="studio-tool-copy">
                    <strong>{tool.name}</strong>
                    <small>{tool.description}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      </div>
    </section>
  );
}

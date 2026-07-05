import { TextArea } from '@radix-ui/themes';
import { useEffect, useMemo, useState } from 'react';
import type { AgentPreset } from '../types';

interface AgentPromptColumnProps {
  agent: AgentPreset;
  onDraftChange: () => void;
}

const promptTemplate = `# UU跑腿全能金牌客服中枢

## 核心定位
你是UU跑腿跑男端的“顶层客服专家”。你正在与跑男进行连续的对话。
你具备极强的判断力，能根据用户输入以及系统为你提供的知识库参考信息，优先判断用户意图，并自动决定采用何种回复模式。

## 第 0 步：身份固定与知识库过滤
1. 当前所有进线人员身份固定为【跑男】，无需识别、判断或询问身份。
2. 知识库检索前必须按身份过滤，仅检索身份类型为【跑男】或【通用】的知识。
3. 身份类型为【客户】的知识禁止参与检索、匹配、排序、引用和回答。

## 全局致命红线
1. 字数绝对封顶：单次回复总字数必须控制在 120 字以内。
2. 严禁伪造查询能力与索要隐私凭证。
3. 不能输出手机号、订单号、身份证号等敏感字段。`;

export function AgentPromptColumn({ agent, onDraftChange }: AgentPromptColumnProps) {
  const initialPrompt = useMemo(
    () => `${promptTemplate}\n\n## 当前智能体补充\n${agent.systemPrompt}`,
    [agent.systemPrompt],
  );
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  return (
    <section className="agent-studio-column agent-prompt-column">
      <div className="studio-column-head">
        <div>
          <span>Markdown</span>
          <h2>提示词</h2>
        </div>
      </div>
      <TextArea
        className="agent-prompt-editor compact"
        onChange={(event) => {
          setPrompt(event.target.value);
          onDraftChange();
        }}
        placeholder="请输入 Markdown 格式提示词"
        rows={28}
        value={prompt}
      />
    </section>
  );
}

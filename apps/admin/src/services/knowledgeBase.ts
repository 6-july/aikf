import {
  DuplicateCheckResult,
  ImportQaJobSnapshot,
  KbQa,
  QaForm,
  QaStatus,
  SearchResult,
} from '../types/api';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    let message = detail;

    try {
      const parsed = JSON.parse(detail) as { message?: string };
      message = parsed.message || detail;
    } catch {
      message = detail;
    }

    throw new Error(`${options.method || 'GET'} ${path} 返回 ${response.status}：${message || '请求失败'}`);
  }

  return response.json() as Promise<T>;
}

export function listQa(status?: QaStatus) {
  const query = status ? `?status=${status}` : '';
  return request<KbQa[]>(`/knowledge-base/qa${query}`);
}

export function createQa(form: QaForm) {
  return request<KbQa>('/knowledge-base/qa', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

export function updateQa(id: number, form: QaForm) {
  return request<KbQa>(`/knowledge-base/qa/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(form),
  });
}

export function offlineQa(id: number) {
  return request<KbQa>(`/knowledge-base/qa/${id}/offline`, {
    method: 'POST',
  });
}

export function publishQa(id: number) {
  return request<KbQa>(`/knowledge-base/qa/${id}/publish`, {
    method: 'POST',
  });
}

export function deleteQa(id: number) {
  return request<KbQa>(`/knowledge-base/qa/${id}`, {
    method: 'DELETE',
  });
}

export function rebuildIndexes() {
  return request<{ total: number; rebuilt: number }>(
    '/knowledge-base/rebuild-indexes',
    { method: 'POST' },
  );
}

export function getImportTemplateUrl() {
  return `${API_BASE_URL}/knowledge-base/import-template`;
}

export type ImportProgressPhase = 'uploading' | 'processing';

export interface ImportProgressEvent {
  phase: ImportProgressPhase;
  percent: number;
}

export async function importExcel(
  file: File,
  onProgress?: (progress: ImportProgressEvent) => void,
) {
  const body = new FormData();
  body.append('file', file);

  return new Promise<ImportQaJobSnapshot>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open('POST', `${API_BASE_URL}/knowledge-base/import-excel`);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      onProgress?.({
        phase: 'uploading',
        percent: Math.round((event.loaded / event.total) * 100),
      });
    };

    xhr.upload.onload = () => {
      onProgress?.({ phase: 'processing', percent: 100 });
    };

    xhr.onload = () => {
      const detail = xhr.responseText || '';

      if (xhr.status < 200 || xhr.status >= 300) {
        let message = detail;

        try {
          const parsed = JSON.parse(detail) as { message?: string };
          message = parsed.message || detail;
        } catch {
          message = detail;
        }

        reject(new Error(`POST /knowledge-base/import-excel 返回 ${xhr.status}：${message || '导入失败'}`));
        return;
      }

      try {
        resolve(JSON.parse(detail) as ImportQaJobSnapshot);
      } catch {
        reject(new Error('导入结果解析失败'));
      }
    };

    xhr.onerror = () => {
      reject(new Error('导入请求失败，请检查服务是否可用'));
    };

    xhr.onabort = () => {
      reject(new Error('导入已取消'));
    };

    onProgress?.({ phase: 'uploading', percent: 0 });
    xhr.send(body);
  });
}

export function getImportJob(jobId: string) {
  return request<ImportQaJobSnapshot>(`/knowledge-base/import-jobs/${jobId}`);
}

export function generateSimilarQuestions(id: number) {
  return request<{
    qaId: number;
    standardQuestion: string;
    candidates: string[];
  }>(`/knowledge-base/qa/${id}/generate-similar-questions`, {
    method: 'POST',
    body: JSON.stringify({ limit: 8 }),
  });
}

export function testSearch(payload: {
  query: string;
  businessDomain: string;
  audiences: string[];
  minScore: number;
  vectorTopK: number;
  finalTopK: number;
}) {
  return request<SearchResult>('/knowledge-base/test-search', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function checkDuplicates(payload: {
  audience: string;
  minScore: number;
  limit: number;
}) {
  return request<DuplicateCheckResult>('/knowledge-base/duplicate-check', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

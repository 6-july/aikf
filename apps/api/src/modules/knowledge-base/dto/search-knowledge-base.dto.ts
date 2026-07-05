export class SearchKnowledgeBaseDto {
  query: string;
  businessDomain?: string;
  audience?: string | string[];
  audiences?: string[];
  minScore?: number;
  vectorTopK?: number;
  finalTopK?: number;
  includeOffline?: boolean;

  // Compatible with snake_case requests.
  business_domain?: string;
  min_score?: number;
  vector_top_k?: number;
  final_top_k?: number;
  include_offline?: boolean;
}

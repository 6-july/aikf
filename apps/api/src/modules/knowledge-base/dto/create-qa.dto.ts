export class CreateQaDto {
  code?: string;
  businessDomain?: string;
  audience?: string;
  categoryPath?: string;
  standardQuestion: string;
  similarQuestions?: string;
  answer: string;
  solutionIdea?: string;
}


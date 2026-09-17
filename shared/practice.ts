export type Practice = {
  scenario: string;
  level: "入门" | "有基础";
  audience: string;
  result: string;
  preparation: string[];
  deliverables: string[];
  steps: { actions: string[]; check: string }[];
  pitfalls: { problem: string; solution: string }[];
  prompt: string;
  toolRoles: { id: string; role: string }[];
};

export type DiseaseId = 'heart' | 'diabetes' | 'breast-cancer';

export type NavView =
  | 'home'
  | 'heart'
  | 'diabetes'
  | 'breast-cancer'
  | 'datasets'
  | 'performance'
  | 'about';

export type AppView = NavView | 'knowledge' | 'feedback';

export interface SyntheticPrefillPayload {
  diseaseId: DiseaseId;
  inputs: Record<string, number>;
  label: string;
  nonce: number;
}

export interface SelectOption {
  value: number;
  label: string;
}

export interface FeatureDefinition {
  key: string;
  label: string;
  shortLabel: string;
  type: 'number' | 'select';
  unit?: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  description: string;
  options?: SelectOption[];
  referenceMean: number;
  referenceStd: number;
}

export interface SampleRecord {
  id: string;
  profileLabel: string;
  target: 0 | 1;
  targetLabel: string;
  features: Record<string, number>;
}

export interface DemoPreset {
  id: string;
  name: string;
  description: string;
  values: Record<string, number>;
}

export interface FeatureContribution {
  key: string;
  label: string;
  value: number;
  unit?: string;
  impact: number; // -1 to +1 normalized contribution for demonstration explanation
  direction: 'elevating' | 'reducing' | 'neutral';
}

export interface PredictionResult {
  diseaseId: DiseaseId;
  source: 'educational_demo_simulator' | 'python_sklearn_api';
  isTrainedModel: boolean;
  modelName?: string;
  algorithm?: string;
  predictedClass: 0 | 1;
  predictedLabel: string;
  probability: number; // 0 to 1
  riskTier: string;
  summaryNote: string;
  contributions: FeatureContribution[];
  timestampIso: string;
}

export interface ConfusionMatrixCounts {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
}

export interface ModelEvaluationState {
  diseaseId: DiseaseId;
  modelName: string;
  plannedAlgorithm: string;
  algorithm?: string;
  endpointPath: string;
  status: 'untrained_demo' | 'connected_sklearn' | 'backend_unavailable';
  statusLabel: string;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  f1Score: number | null;
  rocAuc?: number | null;
  confusionMatrix: ConfusionMatrixCounts | null;
  trainRows?: number;
  testRows?: number;
  totalRows?: number;
  datasetSource?: string;
  splitStrategy?: string;
  trainedAtIso?: string;
  errorMessage?: string;
  lastCheckedIso?: string;
}

export interface DatasetMetadata {
  id: DiseaseId;
  title: string;
  shortTitle: string;
  referenceSource: string;
  benchmarkRowCount: number;
  featureCount: number;
  positiveClassLabel: string;
  negativeClassLabel: string;
  benchmarkPositiveCount: number;
  benchmarkNegativeCount: number;
  plannedAlgorithm: string;
  endpointPath: string;
  overview: string;
}

export interface DiseaseModule {
  metadata: DatasetMetadata;
  features: FeatureDefinition[];
  presets: DemoPreset[];
  sampleRecords: SampleRecord[];
  runDemoPrediction: (inputs: Record<string, number>) => PredictionResult;
}

import { DiseaseId, DiseaseModule } from '../types/ml';
import { heartDatasetMetadata, heartFeatures } from './heart/schema';
import { heartPresets, heartSampleRecords } from './heart/sampleData';
import { runHeartDemoPrediction } from './heart/demoModel';
import { diabetesDatasetMetadata, diabetesFeatures } from './diabetes/schema';
import { diabetesPresets, diabetesSampleRecords } from './diabetes/sampleData';
import { runDiabetesDemoPrediction } from './diabetes/demoModel';
import { breastCancerDatasetMetadata, breastCancerFeatures } from './breastCancer/schema';
import { breastCancerPresets, breastCancerSampleRecords } from './breastCancer/sampleData';
import { runBreastCancerDemoPrediction } from './breastCancer/demoModel';

export const DISEASE_MODULES: Record<DiseaseId, DiseaseModule> = {
  heart: {
    metadata: heartDatasetMetadata,
    features: heartFeatures,
    presets: heartPresets,
    sampleRecords: heartSampleRecords,
    runDemoPrediction: runHeartDemoPrediction,
  },
  diabetes: {
    metadata: diabetesDatasetMetadata,
    features: diabetesFeatures,
    presets: diabetesPresets,
    sampleRecords: diabetesSampleRecords,
    runDemoPrediction: runDiabetesDemoPrediction,
  },
  'breast-cancer': {
    metadata: breastCancerDatasetMetadata,
    features: breastCancerFeatures,
    presets: breastCancerPresets,
    sampleRecords: breastCancerSampleRecords,
    runDemoPrediction: runBreastCancerDemoPrediction,
  },
};

export const DISEASE_LIST: DiseaseModule[] = [
  DISEASE_MODULES.heart,
  DISEASE_MODULES.diabetes,
  DISEASE_MODULES['breast-cancer'],
];

import { DISEASE_MODULES } from '../modules/registry';
import { DiseaseId, FeatureDefinition } from '../types/ml';

export interface FeatureImportanceEntry {
  key: string;
  label: string;
  shortLabel: string;
  unit?: string;
  demoWeight: number; // Illustrative normalized sensitivity weight from demo formula
  direction: 'elevating' | 'reducing' | 'bidirectional';
  sampleClass0Mean: number;
  sampleClass1Mean: number;
  separationZ: number; // Standardized mean difference across synthetic sample slice
  rationale: string;
  feature: FeatureDefinition;
}

const DEMO_FORMULA_WEIGHTS: Record<DiseaseId, Record<string, { weight: number; direction: FeatureImportanceEntry['direction']; rationale: string }>> = {
  heart: {
    exang: {
      weight: 0.56,
      direction: 'elevating',
      rationale: 'Exercise-induced angina carries a strong positive weight in the illustrative cardiac formula.',
    },
    oldpeak: {
      weight: 0.54,
      direction: 'elevating',
      rationale: 'Higher ST depression relative to rest scales smoothly upward above 1.0 mm.',
    },
    cp: {
      weight: 0.52,
      direction: 'bidirectional',
      rationale: 'Asymptomatic chest pain category shifts the illustrative logit upward compared to typical profiles.',
    },
    thalach: {
      weight: 0.48,
      direction: 'reducing',
      rationale: 'Higher achieved max heart rate exercises a negative (risk-lowering) term around 150 bpm.',
    },
    thal: {
      weight: 0.48,
      direction: 'bidirectional',
      rationale: 'Thalassemia stress defect encoding modulates the categorical risk offset.',
    },
    age: {
      weight: 0.42,
      direction: 'elevating',
      rationale: 'Centered at 54 years with a 15-year scaling denominator.',
    },
    ca: {
      weight: 0.42,
      direction: 'elevating',
      rationale: 'Number of colored major vessels scales linearly above 0.5.',
    },
    slope: {
      weight: 0.34,
      direction: 'bidirectional',
      rationale: 'Upsloping vs downsloping ST segment shifts the categorical demonstration offset.',
    },
    trestbps: {
      weight: 0.28,
      direction: 'elevating',
      rationale: 'Resting systolic blood pressure above 130 mmHg contributes a moderate upward term.',
    },
    chol: {
      weight: 0.22,
      direction: 'elevating',
      rationale: 'Serum cholesterol normalized around 240 mg/dL with a gentle slope.',
    },
    sex: {
      weight: 0.18,
      direction: 'bidirectional',
      rationale: 'Binary categorical indicator demonstrating demographic covariate adjustment.',
    },
    restecg: {
      weight: 0.18,
      direction: 'elevating',
      rationale: 'Left ventricular hypertrophy indicator adds a small positive offset.',
    },
    fbs: {
      weight: 0.14,
      direction: 'elevating',
      rationale: 'Elevated fasting blood sugar (>120 mg/dL) adds a mild upward offset.',
    },
  },
  diabetes: {
    glucose: {
      weight: 1.15,
      direction: 'elevating',
      rationale: 'Primary metabolic driver in the demo formula, centered at 122 mg/dL.',
    },
    bmi: {
      weight: 0.72,
      direction: 'elevating',
      rationale: 'Body mass index normalized around 30.0 kg/m2 drives the second largest sensitivity.',
    },
    dpf: {
      weight: 0.44,
      direction: 'elevating',
      rationale: 'Diabetes pedigree function reflects hereditary risk scoring above 0.50.',
    },
    age: {
      weight: 0.36,
      direction: 'elevating',
      rationale: 'Age term centered at 35 years across a 14-year scale.',
    },
    pregnancies: {
      weight: 0.34,
      direction: 'elevating',
      rationale: 'Count centered at 3.5 with a moderate linear gradient.',
    },
    insulin: {
      weight: 0.22,
      direction: 'elevating',
      rationale: '2-hour serum insulin normalized across a wide 150 mu U/ml spread.',
    },
    bloodPressure: {
      weight: 0.14,
      direction: 'elevating',
      rationale: 'Diastolic blood pressure contributes a subtle secondary adjustment around 72 mmHg.',
    },
    skinThickness: {
      weight: 0.12,
      direction: 'elevating',
      rationale: 'Triceps skinfold thickness provides a gentle covariate term centered at 22 mm.',
    },
  },
  'breast-cancer': {
    meanConcavePoints: {
      weight: 0.92,
      direction: 'elevating',
      rationale: 'Strongest nuclear contour concavity feature in the WDBC demonstration formula.',
    },
    meanRadius: {
      weight: 0.85,
      direction: 'elevating',
      rationale: 'Mean nuclear radius centered at 14.5 units strongly separates synthetic profiles.',
    },
    meanPerimeter: {
      weight: 0.82,
      direction: 'elevating',
      rationale: 'Closely correlated with radius; scaled around 94.0 units.',
    },
    meanArea: {
      weight: 0.78,
      direction: 'elevating',
      rationale: 'Nuclear cross-sectional area scaled around 675 units.',
    },
    meanConcavity: {
      weight: 0.72,
      direction: 'elevating',
      rationale: 'Severity of concave contour portions scaled around 0.095.',
    },
    meanCompactness: {
      weight: 0.46,
      direction: 'elevating',
      rationale: 'Perimeter-to-area compactness ratio centered at 0.11.',
    },
    meanTexture: {
      weight: 0.42,
      direction: 'elevating',
      rationale: 'Gray-scale intensity standard deviation centered at 19.5.',
    },
    meanSmoothness: {
      weight: 0.28,
      direction: 'elevating',
      rationale: 'Local radius variation normalized around 0.098.',
    },
    meanSymmetry: {
      weight: 0.22,
      direction: 'elevating',
      rationale: 'Cell nucleus symmetry offset normalized around 0.183.',
    },
    meanFractalDimension: {
      weight: 0.08,
      direction: 'elevating',
      rationale: 'Coastline approximation metric with minimal demo weight around 0.063.',
    },
  },
};

export function getFeatureImportanceForDisease(diseaseId: DiseaseId): FeatureImportanceEntry[] {
  const mod = DISEASE_MODULES[diseaseId];
  const class0 = mod.sampleRecords.filter((r) => r.target === 0);
  const class1 = mod.sampleRecords.filter((r) => r.target === 1);

  return mod.features
    .map((feat) => {
      const m0 =
        class0.length > 0
          ? class0.reduce((s, r) => s + (r.features[feat.key] ?? feat.defaultValue), 0) /
            class0.length
          : feat.referenceMean;
      const m1 =
        class1.length > 0
          ? class1.reduce((s, r) => s + (r.features[feat.key] ?? feat.defaultValue), 0) /
            class1.length
          : feat.referenceMean;
      const sep = feat.referenceStd > 0 ? Math.abs(m1 - m0) / feat.referenceStd : 0;
      const meta = DEMO_FORMULA_WEIGHTS[diseaseId][feat.key] || {
        weight: 0.2,
        direction: 'elevating' as const,
        rationale: feat.description,
      };

      return {
        key: feat.key,
        label: feat.label,
        shortLabel: feat.shortLabel,
        unit: feat.unit,
        demoWeight: meta.weight,
        direction: meta.direction,
        sampleClass0Mean: Number(m0.toFixed(2)),
        sampleClass1Mean: Number(m1.toFixed(2)),
        separationZ: Number(sep.toFixed(2)),
        rationale: meta.rationale,
        feature: feat,
      };
    })
    .sort((a, b) => b.demoWeight - a.demoWeight);
}

export interface SyntheticDemoHistoryItem {
  id: string;
  diseaseId: DiseaseId;
  profileName: string;
  predictedLabel: string;
  probability: number;
  riskTier: string;
  createdAtLabel: string;
  inputs: Record<string, number>;
}

export function buildInitialSyntheticHistory(): SyntheticDemoHistoryItem[] {
  const seeds: Array<{ diseaseId: DiseaseId; presetIndex: number; ageOffsetMinutes: number }> = [
    { diseaseId: 'heart', presetIndex: 0, ageOffsetMinutes: 14 },
    { diseaseId: 'diabetes', presetIndex: 1, ageOffsetMinutes: 38 },
    { diseaseId: 'breast-cancer', presetIndex: 0, ageOffsetMinutes: 72 },
    { diseaseId: 'heart', presetIndex: 1, ageOffsetMinutes: 125 },
  ];

  return seeds
    .map((seed, idx): SyntheticDemoHistoryItem | null => {
      const mod = DISEASE_MODULES[seed.diseaseId];
      const preset = mod.presets[seed.presetIndex] ?? mod.presets[0];
      if (!preset) return null;
      const result = mod.runDemoPrediction(preset.values);
      return {
        id: `syn-demo-${seed.diseaseId}-${idx}`,
        diseaseId: seed.diseaseId,
        profileName: preset.name,
        predictedLabel: result.predictedLabel,
        probability: result.probability,
        riskTier: result.riskTier,
        createdAtLabel: `${seed.ageOffsetMinutes}m ago (Synthetic)`,
        inputs: { ...preset.values },
      };
    })
    .filter((item): item is SyntheticDemoHistoryItem => item !== null);
}

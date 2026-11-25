import { DemoPreset, SampleRecord } from '../../types/ml';

export const diabetesPresets: DemoPreset[] = [
  {
    id: 'diab-low',
    name: 'Illustrative Normoglycemic Profile',
    description: 'Synthetic textbook profile with normal glucose, healthy BMI, and moderate age.',
    values: {
      pregnancies: 1,
      glucose: 92,
      bloodPressure: 68,
      skinThickness: 20,
      insulin: 66,
      bmi: 23.8,
      dpf: 0.24,
      age: 26,
    },
  },
  {
    id: 'diab-elevated',
    name: 'Illustrative Hyperglycemic Profile',
    description: 'Synthetic textbook profile illustrating elevated glucose, higher BMI, and higher pedigree index.',
    values: {
      pregnancies: 6,
      glucose: 168,
      bloodPressure: 84,
      skinThickness: 35,
      insulin: 210,
      bmi: 37.6,
      dpf: 0.94,
      age: 49,
    },
  },
];

// Synthetic educational rows modeled after Pima Diabetes schema (zero real patient records)
export const diabetesSampleRecords: SampleRecord[] = [
  { id: 'DBT-SYN-001', profileLabel: 'Synthetic Profile 01', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 1, glucose: 89, bloodPressure: 66, skinThickness: 21, insulin: 64, bmi: 24.1, dpf: 0.21, age: 24 } },
  { id: 'DBT-SYN-002', profileLabel: 'Synthetic Profile 02', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 6, glucose: 162, bloodPressure: 82, skinThickness: 34, insulin: 195, bmi: 36.8, dpf: 0.88, age: 48 } },
  { id: 'DBT-SYN-003', profileLabel: 'Synthetic Profile 03', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 2, glucose: 104, bloodPressure: 70, skinThickness: 24, insulin: 78, bmi: 26.5, dpf: 0.32, age: 29 } },
  { id: 'DBT-SYN-004', profileLabel: 'Synthetic Profile 04', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 8, glucose: 179, bloodPressure: 88, skinThickness: 38, insulin: 240, bmi: 39.2, dpf: 1.12, age: 54 } },
  { id: 'DBT-SYN-005', profileLabel: 'Synthetic Profile 05', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 0, glucose: 96, bloodPressure: 64, skinThickness: 18, insulin: 58, bmi: 22.9, dpf: 0.19, age: 22 } },
  { id: 'DBT-SYN-006', profileLabel: 'Synthetic Profile 06', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 4, glucose: 148, bloodPressure: 78, skinThickness: 31, insulin: 168, bmi: 34.5, dpf: 0.72, age: 41 } },
  { id: 'DBT-SYN-007', profileLabel: 'Synthetic Profile 07', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 3, glucose: 110, bloodPressure: 72, skinThickness: 22, insulin: 86, bmi: 27.9, dpf: 0.39, age: 33 } },
  { id: 'DBT-SYN-008', profileLabel: 'Synthetic Profile 08', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 5, glucose: 155, bloodPressure: 80, skinThickness: 33, insulin: 184, bmi: 35.4, dpf: 0.81, age: 45 } },
  { id: 'DBT-SYN-009', profileLabel: 'Synthetic Profile 09', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 1, glucose: 98, bloodPressure: 68, skinThickness: 19, insulin: 70, bmi: 25.2, dpf: 0.28, age: 27 } },
  { id: 'DBT-SYN-010', profileLabel: 'Synthetic Profile 10', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 7, glucose: 171, bloodPressure: 86, skinThickness: 36, insulin: 215, bmi: 38.1, dpf: 0.96, age: 51 } },
  { id: 'DBT-SYN-011', profileLabel: 'Synthetic Profile 11', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 0, glucose: 84, bloodPressure: 62, skinThickness: 16, insulin: 52, bmi: 21.8, dpf: 0.16, age: 21 } },
  { id: 'DBT-SYN-012', profileLabel: 'Synthetic Profile 12', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 9, glucose: 188, bloodPressure: 90, skinThickness: 41, insulin: 265, bmi: 41.0, dpf: 1.28, age: 57 } },
  { id: 'DBT-SYN-013', profileLabel: 'Synthetic Profile 13', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 2, glucose: 101, bloodPressure: 71, skinThickness: 23, insulin: 74, bmi: 25.9, dpf: 0.30, age: 30 } },
  { id: 'DBT-SYN-014', profileLabel: 'Synthetic Profile 14', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 3, glucose: 138, bloodPressure: 76, skinThickness: 29, insulin: 152, bmi: 32.8, dpf: 0.64, age: 38 } },
  { id: 'DBT-SYN-015', profileLabel: 'Synthetic Profile 15', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 1, glucose: 93, bloodPressure: 67, skinThickness: 20, insulin: 68, bmi: 24.4, dpf: 0.25, age: 25 } },
  { id: 'DBT-SYN-016', profileLabel: 'Synthetic Profile 16', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 5, glucose: 166, bloodPressure: 84, skinThickness: 35, insulin: 204, bmi: 37.3, dpf: 0.91, age: 47 } },
  { id: 'DBT-SYN-017', profileLabel: 'Synthetic Profile 17', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 4, glucose: 114, bloodPressure: 74, skinThickness: 25, insulin: 92, bmi: 28.6, dpf: 0.42, age: 35 } },
  { id: 'DBT-SYN-018', profileLabel: 'Synthetic Profile 18', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 6, glucose: 159, bloodPressure: 81, skinThickness: 32, insulin: 188, bmi: 36.0, dpf: 0.85, age: 44 } },
  { id: 'DBT-SYN-019', profileLabel: 'Synthetic Profile 19', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 2, glucose: 99, bloodPressure: 69, skinThickness: 21, insulin: 72, bmi: 25.0, dpf: 0.27, age: 28 } },
  { id: 'DBT-SYN-020', profileLabel: 'Synthetic Profile 20', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 7, glucose: 174, bloodPressure: 87, skinThickness: 37, insulin: 228, bmi: 38.7, dpf: 1.04, age: 52 } },
  { id: 'DBT-SYN-021', profileLabel: 'Synthetic Profile 21', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 1, glucose: 91, bloodPressure: 65, skinThickness: 18, insulin: 61, bmi: 23.4, dpf: 0.22, age: 23 } },
  { id: 'DBT-SYN-022', profileLabel: 'Synthetic Profile 22', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 4, glucose: 144, bloodPressure: 77, skinThickness: 30, insulin: 160, bmi: 33.9, dpf: 0.69, age: 40 } },
  { id: 'DBT-SYN-023', profileLabel: 'Synthetic Profile 23', target: 0, targetLabel: 'Negative (0)', features: { pregnancies: 3, glucose: 108, bloodPressure: 73, skinThickness: 24, insulin: 82, bmi: 27.1, dpf: 0.35, age: 31 } },
  { id: 'DBT-SYN-024', profileLabel: 'Synthetic Profile 24', target: 1, targetLabel: 'Positive (1)', features: { pregnancies: 8, glucose: 182, bloodPressure: 89, skinThickness: 39, insulin: 248, bmi: 40.1, dpf: 1.18, age: 55 } },
];

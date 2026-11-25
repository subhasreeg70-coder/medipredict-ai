export interface GlossaryEntry {
  term: string;
  shortTitle: string;
  definition: string;
  formula?: string;
}

export const ML_GLOSSARY = {
  accuracy: {
    term: 'Accuracy',
    shortTitle: 'Classification Accuracy',
    definition:
      'Fraction of total predictions that match the true label. Useful for balanced datasets, but can be misleading when one class is much rarer than the other.',
    formula: '(TP + TN) / (TP + TN + FP + FN)',
  },
  precision: {
    term: 'Precision',
    shortTitle: 'Precision (Positive Predictive Value)',
    definition:
      'Of all cases predicted as positive (Class 1), the proportion that actually belong to Class 1. High precision reduces false alarms.',
    formula: 'TP / (TP + FP)',
  },
  recall: {
    term: 'Recall',
    shortTitle: 'Recall (Sensitivity / True Positive Rate)',
    definition:
      'Of all actual positive cases (Class 1), the proportion the model successfully caught. High recall minimizes missed positive cases.',
    formula: 'TP / (TP + FN)',
  },
  f1Score: {
    term: 'F1-Score',
    shortTitle: 'F1-Score (Harmonic Mean)',
    definition:
      'Combines Precision and Recall into a single balanced metric. Penalizes extreme trade-offs when either Precision or Recall is very low.',
    formula: '2 × (Precision × Recall) / (Precision + Recall)',
  },
  confusionMatrix: {
    term: 'Confusion Matrix',
    shortTitle: '2×2 Binary Confusion Matrix',
    definition:
      'A diagnostic table comparing predicted classifications (columns) against actual ground-truth labels (rows) to show exact error patterns.',
  },
  trueNegative: {
    term: 'True Negative (TN)',
    shortTitle: 'True Negative (TN)',
    definition:
      'Model correctly predicted Class 0 (negative/benign) when the actual ground-truth label was Class 0.',
  },
  falsePositive: {
    term: 'False Positive (FP)',
    shortTitle: 'False Positive · Type I Error',
    definition:
      'Model predicted Class 1 (positive) when the actual ground-truth label was Class 0—often called a false alarm.',
  },
  falseNegative: {
    term: 'False Negative (FN)',
    shortTitle: 'False Negative · Type II Error',
    definition:
      'Model predicted Class 0 (negative) when the actual ground-truth label was Class 1—a missed detection.',
  },
  truePositive: {
    term: 'True Positive (TP)',
    shortTitle: 'True Positive (TP)',
    definition:
      'Model correctly predicted Class 1 (positive) when the actual ground-truth label was Class 1.',
  },
  plannedEstimator: {
    term: 'Planned Estimator',
    shortTitle: 'Scikit-learn Classifier Pipeline',
    definition:
      'A supervised machine learning algorithm (e.g., Logistic Regression, Random Forest, Gradient Boosting, or RBF SVM) wrapped with preprocessing steps like feature scaling.',
  },
  holdoutEvaluation: {
    term: 'Holdout Evaluation',
    shortTitle: 'Holdout / Test Set Evaluation',
    definition:
      'Evaluating a trained model on unseen test records held back from training to measure how well it generalizes beyond memorized examples.',
  },
  histogram: {
    term: 'Histogram',
    shortTitle: 'Binned Feature Histogram',
    definition:
      'Groups continuous numeric values into equal-width intervals (bins) to reveal distribution shape, skewness, and overlap between Class 0 and Class 1.',
  },
  scatterPlot: {
    term: 'Scatter Plot',
    shortTitle: '2D Feature Scatter Plot',
    definition:
      'Plots two features along X and Y axes simultaneously so you can spot correlations, clusters, and linear or non-linear class boundaries.',
  },
  boxPlot: {
    term: 'Box Plot',
    shortTitle: 'Five-Number Summary Box Plot',
    definition:
      'Summarizes spread using Minimum, 25th percentile (Q1), Median (Q2), 75th percentile (Q3), Maximum, and potential outliers across classes.',
  },
  sampleMean: {
    term: 'Sample Mean',
    shortTitle: 'Arithmetic Mean (μ)',
    definition:
      'Sum of all observed values for a feature divided by the number of records. Comparing Class 0 vs Class 1 means highlights informative features.',
    formula: 'μ = (Σ xᵢ) / N',
  },
  stdDev: {
    term: 'Std Dev',
    shortTitle: 'Standard Deviation (σ)',
    definition:
      'Measures average dispersion around the mean. Features with very different scales often require StandardScaler normalization before training.',
    formula: 'σ = √[ Σ(xᵢ − μ)² / N ]',
  },
  targetClasses: {
    term: 'Target Classes',
    shortTitle: 'Supervised Target Labels (y)',
    definition:
      'The binary outcome variable (0 or 1) that a classification model learns to predict from the input feature columns.',
  },
  inputFeatures: {
    term: 'Input Features',
    shortTitle: 'Predictor Variables (X)',
    definition:
      'Structured numeric or encoded categorical measurements supplied to a model as inputs during training and inference.',
  },
} as const satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof ML_GLOSSARY;

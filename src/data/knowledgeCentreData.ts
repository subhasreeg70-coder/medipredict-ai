import { AppView } from '../types/ml';

export interface KnowledgeModule {
  id: string;
  stageNumber: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  summary: string;
  keyTakeaways: string[];
  formulaLabel?: string;
  formulaExpr?: string;
  linkedView: AppView;
  linkedCta: string;
  checkQuestion: {
    prompt: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
}

export const KNOWLEDGE_MODULES: KnowledgeModule[] = [
  {
    id: 'stage-1-deid',
    stageNumber: '01',
    title: 'Synthetic & De-Identified Clinical Schemas',
    subtitle: 'Why educational ML sandboxes isolate disease tables and avoid PHI',
    durationLabel: '3 min read',
    summary:
      'Healthcare ML begins with strict schema governance. Heart Disease (13 features), Diabetes (8 features), and Breast Cancer (10 features) measure distinct physiological and morphological signals and must remain in separate pipelines without collecting real patient identifiers.',
    keyTakeaways: [
      'Never mix incompatible clinical populations into a single feature matrix.',
      'Separate protected health information (PHI) from numeric feature vectors.',
      'Synthetic non-PHI sampling lets learners test boundary conditions safely.',
    ],
    linkedView: 'datasets',
    linkedCta: 'Inspect Dataset Schemas',
    checkQuestion: {
      prompt: 'Why does MEDIPREDICT AI keep Heart, Diabetes, and Breast Cancer models strictly separate?',
      options: [
        'Each domain has distinct clinical features, target classes, and feature distributions',
        'Combining all diseases into one table always increases accuracy',
        'To hide input variables from Scikit-learn',
      ],
      correctIndex: 0,
      explanation:
        'Each benchmark dataset uses a unique feature vector and target definition, so each classifier must be trained and evaluated independently.',
    },
  },
  {
    id: 'stage-2-scaling',
    stageNumber: '02',
    title: 'Feature Scaling & Z-Score Normalization',
    subtitle: 'Preventing large-unit variables like Cholesterol from dominating gradients',
    durationLabel: '4 min read',
    summary:
      'Clinical features span wildly different numeric scales—from Diabetes Pedigree Function (0.1–2.4) to Serum Cholesterol (120–560 mg/dL). StandardScaler centers every feature around zero with unit variance before feeding Logistic Regression or SVM classifiers.',
    keyTakeaways: [
      'Compute mean and standard deviation on the training fold only to prevent data leakage.',
      'Tree ensembles (Random Forest) are scale-invariant, whereas Logistic Regression and RBF SVM require scaling.',
      'Z-scores express how many standard deviations an input sits above or below the benchmark mean.',
    ],
    formulaLabel: 'StandardScaler Transformation',
    formulaExpr: 'z = (x - mean_train) / std_train',
    linkedView: 'datasets',
    linkedCta: 'Try Synthetic Z-Score Generator',
    checkQuestion: {
      prompt: 'When should StandardScaler parameters (mean and std) be fitted in a Scikit-learn Pipeline?',
      options: [
        'On the entire dataset including the test set',
        'Only on the training split inside Pipeline / Cross-Validation',
        'After computing the confusion matrix',
      ],
      correctIndex: 1,
      explanation:
        'Fitting the scaler on test data leaks distribution statistics into training and produces overly optimistic evaluation metrics.',
    },
  },
  {
    id: 'stage-3-classifiers',
    stageNumber: '03',
    title: 'Interpretable Classifiers vs Non-Linear Ensembles',
    subtitle: 'Choosing Logistic Regression, Random Forest, or RBF SVM per disease domain',
    durationLabel: '5 min read',
    summary:
      'Different healthcare datasets suit different estimator families. Logistic Regression provides directly interpretable log-odds coefficients for cardiac risk factors, Random Forest captures non-linear thresholds in metabolic diabetes indicators, and RBF SVM separates smooth morphological clusters in WDBC breast mass measurements.',
    keyTakeaways: [
      'Logistic Regression outputs calibrated probabilities via the logistic sigmoid function.',
      'Random Forest averages multiple decorrelated decision trees to reduce variance.',
      'Support Vector Machines with RBF kernels maximize the margin between classes in scaled space.',
    ],
    formulaLabel: 'Logistic Sigmoid Probability',
    formulaExpr: 'P(y=1 | x) = 1 / (1 + exp(-(w^T z + b)))',
    linkedView: 'heart',
    linkedCta: 'Test Heart Classifier Demo',
    checkQuestion: {
      prompt: 'Which model property makes Logistic Regression popular for introductory clinical modeling?',
      options: [
        'Every scaled feature receives an interpretable signed coefficient',
        'It requires zero numeric features',
        'It guarantees 100% recall on unseen hospitals',
      ],
      correctIndex: 0,
      explanation:
        'Signed coefficients in Logistic Regression show whether increasing a feature elevates or lowers predicted log-odds.',
    },
  },
  {
    id: 'stage-4-metrics',
    stageNumber: '04',
    title: 'Confusion Matrix, Recall & Screening Trade-offs',
    subtitle: 'Why Accuracy alone fails on imbalanced clinical datasets',
    durationLabel: '4 min read',
    summary:
      'In Pima Diabetes (~34.9% positive) or screening workflows, Accuracy can hide missed positive cases. Recall (Sensitivity) measures how many true positive cases were detected, while Precision measures how reliable positive alerts are. F1-score balances both via harmonic mean.',
    keyTakeaways: [
      'False Negatives (missed positives) reduce Recall and are critical in medical screening studies.',
      'False Positives increase follow-up burden and reduce Precision.',
      'Never report fabricated metrics—leave scores Pending until evaluated on an empirical holdout split.',
    ],
    formulaLabel: 'Harmonic Mean (F1-Score)',
    formulaExpr: 'F1 = 2 * (Precision * Recall) / (Precision + Recall)',
    linkedView: 'performance',
    linkedCta: 'Open Confusion Matrix Sandbox',
    checkQuestion: {
      prompt: 'If a model produces 40 True Positives and 10 False Negatives, what is its Recall?',
      options: ['80.0% (40 / 50)', '75.0% (40 / 53)', '90.0% (40 / 44)'],
      correctIndex: 0,
      explanation: 'Recall = TP / (TP + FN) = 40 / (40 + 10) = 0.80 (80.0%).',
    },
  },
  {
    id: 'stage-5-deployment',
    stageNumber: '05',
    title: 'Exporting & Serving Python Scikit-learn Pipelines',
    subtitle: 'Bridging React frontends to FastAPI + joblib endpoints safely',
    durationLabel: '4 min read',
    summary:
      'Once a Scikit-learn Pipeline(StandardScaler + Classifier) is trained in Python, serialize the entire pipeline with joblib.dump() so preprocessing and inference stay coupled. FastAPI validates incoming JSON feature vectors and returns empirical probabilities and holdout evaluation metrics.',
    keyTakeaways: [
      'Bundle preprocessing and the estimator inside a single Scikit-learn Pipeline before calling joblib.dump().',
      'Validate feature ordering and ranges with Pydantic models on the FastAPI endpoint.',
      'Switch MEDIPREDICT AI between Educational Demo mode and Scikit-learn API mode cleanly.',
    ],
    formulaLabel: 'Pipeline Serialization',
    formulaExpr: 'joblib.dump(make_pipeline(StandardScaler(), clf), "model.joblib")',
    linkedView: 'about',
    linkedCta: 'Inspect FastAPI Contract',
    checkQuestion: {
      prompt: 'Why should StandardScaler be saved inside the same joblib Pipeline as the classifier?',
      options: [
        'So incoming API predictions use the exact training mean and variance automatically',
        'Because JSON cannot transmit floating-point numbers otherwise',
        'To disable cross-validation',
      ],
      correctIndex: 0,
      explanation:
        'Bundling the scaler guarantees every inference request receives the exact transformation learned during training.',
    },
  },
];

export interface WorkflowGuidanceItem {
  id: string;
  question: string;
  keywords: string[];
  answer: string;
  recommendedView?: AppView;
  actionLabel?: string;
}

export const WORKFLOW_GUIDANCE_ITEMS: WorkflowGuidanceItem[] = [
  {
    id: 'guide-pipeline',
    question: 'How does the end-to-end educational ML workflow work?',
    keywords: ['workflow', 'pipeline', 'steps', 'how', 'overview', 'start'],
    answer:
      'MEDIPREDICT AI follows 5 transparent stages: (1) Select an isolated disease schema (Heart, Diabetes, or Breast Cancer), (2) Inspect synthetic sample distributions in Dataset Explorer, (3) Simulate inputs or generate synthetic non-PHI profiles, (4) Observe feature sensitivity and logistic probability outputs, and (5) Inspect Confusion Matrix equations or connect python_backend/app.py for trained Scikit-learn metrics.',
    recommendedView: 'knowledge',
    actionLabel: 'Open Knowledge Centre',
  },
  {
    id: 'guide-demo-vs-trained',
    question: 'Are the built-in predictions from a trained clinical model?',
    keywords: ['trained', 'real', 'demo', 'accuracy', 'pending', 'clinical', 'fake'],
    answer:
      'No. Built-in predictions use transparent, deterministic illustrative formulas so you can study how input features shift probabilities. Model Accuracy, Precision, Recall, and F1 remain marked Pending until you connect a real trained Python Scikit-learn backend via Model Performance.',
    recommendedView: 'performance',
    actionLabel: 'Check Model Status',
  },
  {
    id: 'guide-synthetic',
    question: 'How can I generate synthetic non-PHI test inputs?',
    keywords: ['synthetic', 'generate', 'simulate', 'data', 'phi', 'noise', 'z-score'],
    answer:
      'Open Dataset Explorer and switch to the Synthetic Data Simulator tab. Pick any disease module, choose a risk-profile bias and noise level, and generate non-PHI feature vectors derived from benchmark means and standard deviations—then send them straight into the prediction simulator.',
    recommendedView: 'datasets',
    actionLabel: 'Open Synthetic Simulator',
  },
  {
    id: 'guide-metrics',
    question: 'Why use Precision, Recall, and F1 instead of only Accuracy?',
    keywords: ['precision', 'recall', 'f1', 'confusion', 'matrix', 'accuracy', 'imbalance'],
    answer:
      'When target classes are imbalanced (like Pima Diabetes at 34.9% positive), high accuracy can mask missed positive cases. Recall (TP / (TP + FN)) tracks sensitivity to positive cases, Precision (TP / (TP + FP)) tracks positive predictive reliability, and F1 balances both.',
    recommendedView: 'performance',
    actionLabel: 'Try Formula Sandbox',
  },
  {
    id: 'guide-python',
    question: 'How do I connect a real Python Scikit-learn backend?',
    keywords: ['python', 'scikit', 'sklearn', 'fastapi', 'joblib', 'backend', 'api'],
    answer:
      'Train separate Scikit-learn pipelines using python_backend/app.py, start FastAPI on port 8000 (uvicorn app:app --reload --port 8000), and switch Inference Mode in Model Performance from Demo Simulator to Scikit-learn API.',
    recommendedView: 'about',
    actionLabel: 'View Python Bridge Docs',
  },
];

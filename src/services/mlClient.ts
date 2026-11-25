import { DISEASE_MODULES } from '../modules/registry';
import { DiseaseId, ModelEvaluationState, PredictionResult } from '../types/ml';

export interface BackendConnectionConfig {
  mode: 'demo' | 'sklearn_api';
  baseUrl: string;
}

export interface BackendHealthStatus {
  status: 'healthy' | 'degraded';
  service: string;
  modelsReady: boolean;
  loadedModels: string[];
  missingModels: string[];
  timestampIso: string;
}

const DEFAULT_BASE_URL = (import.meta.env.VITE_SKLEARN_API_URL as string | undefined) ?? '';

export function getDefaultBackendConfig(): BackendConnectionConfig {
  return {
    mode: 'sklearn_api',
    baseUrl: DEFAULT_BASE_URL,
  };
}

function buildUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  return cleanBase ? `${cleanBase}${path}` : path;
}

function formatBackendTarget(baseUrl: string): string {
  const cleanBase = baseUrl.trim().replace(/\/+$/, '');
  return cleanBase || 'same-origin /api proxy';
}

async function extractErrorDetail(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string; message?: string };
    if (typeof body?.detail === 'string' && body.detail.trim()) {
      return body.detail;
    }
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Response body is not JSON
  }
  return fallback;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function checkBackendHealth(
  config: BackendConnectionConfig
): Promise<BackendHealthStatus> {
  const url = buildUrl(config.baseUrl, '/health');
  const targetDesc = formatBackendTarget(config.baseUrl);
  let response: Response;
  try {
    response = await fetchWithTimeout(url, { method: 'GET' }, 5000);
  } catch (err) {
    const reason =
      err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out'
        : 'Network connection refused or unreachable';
    throw new Error(
      `FastAPI ML backend is unavailable at ${targetDesc} (${reason}). Start python_backend/app.py.`
    );
  }

  if (!response.ok) {
    const detail = await extractErrorDetail(
      response,
      `Health endpoint returned HTTP ${response.status}.`
    );
    throw new Error(`FastAPI ML backend unavailable (${detail}).`);
  }

  const data = (await response.json()) as BackendHealthStatus;
  if (!data || !Array.isArray(data.loadedModels)) {
    throw new Error(`Unexpected response from ${url}. Ensure FastAPI app.py is running.`);
  }
  return data;
}

/**
 * Runs prediction against the live Python Scikit-learn FastAPI backend when in `sklearn_api` mode.
 * Never silently falls back to local demo formulas when the backend is unavailable.
 */
export async function executeDiseasePrediction(
  diseaseId: DiseaseId,
  inputs: Record<string, number>,
  config: BackendConnectionConfig
): Promise<PredictionResult> {
  const module = DISEASE_MODULES[diseaseId];

  if (config.mode === 'sklearn_api') {
    const url = buildUrl(config.baseUrl, module.metadata.endpointPath);
    const targetDesc = formatBackendTarget(config.baseUrl);

    let response: Response;
    try {
      response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: inputs }),
        },
        10000
      );
    } catch (err) {
      const reason =
        err instanceof Error && err.name === 'AbortError'
          ? 'Connection timed out'
          : 'Backend unreachable';
      throw new Error(
        `FastAPI backend unavailable at ${targetDesc} (${reason}). Verify python_backend/app.py is running.`
      );
    }

    if (!response.ok) {
      const detail = await extractErrorDetail(
        response,
        `FastAPI endpoint returned HTTP ${response.status} at ${url}.`
      );
      throw new Error(detail);
    }

    const data = (await response.json()) as Partial<PredictionResult>;
    if (typeof data.predictedClass !== 'number' || typeof data.probability !== 'number') {
      throw new Error(`Invalid prediction payload received from ${url}.`);
    }

    return {
      diseaseId,
      source: 'python_sklearn_api',
      isTrainedModel: true,
      modelName: data.modelName,
      algorithm: data.algorithm,
      predictedClass: data.predictedClass === 1 ? 1 : 0,
      predictedLabel:
        data.predictedLabel ||
        (data.predictedClass === 1 ? 'Model Class 1 (Positive)' : 'Model Class 0 (Negative)'),
      probability: data.probability,
      riskTier:
        data.riskTier ||
        (data.probability >= 0.65
          ? 'Elevated Model Probability'
          : data.probability >= 0.35
          ? 'Moderate Model Probability'
          : 'Low Model Probability'),
      summaryNote:
        data.summaryNote ||
        `Response served by Python Scikit-learn FastAPI (${url}).`,
      contributions: Array.isArray(data.contributions) ? data.contributions : [],
      timestampIso: data.timestampIso || new Date().toISOString(),
    };
  }

  return module.runDemoPrediction(inputs);
}

/**
 * Fetches real held-out test-set evaluation metrics from the FastAPI backend.
 * Never fabricates accuracy or silently falls back to demo mode on failure.
 */
export async function fetchModelEvaluation(
  diseaseId: DiseaseId,
  config: BackendConnectionConfig
): Promise<ModelEvaluationState> {
  const module = DISEASE_MODULES[diseaseId];

  if (config.mode === 'sklearn_api') {
    const url = buildUrl(config.baseUrl, `/api/models/${diseaseId}/metrics`);
    const targetDesc = formatBackendTarget(config.baseUrl);

    let response: Response;
    try {
      response = await fetchWithTimeout(url, { method: 'GET' }, 8000);
    } catch (err) {
      const reason =
        err instanceof Error && err.name === 'AbortError'
          ? 'Connection timed out'
          : 'Backend unreachable';
      throw new Error(
        `FastAPI backend unavailable at ${targetDesc} (${reason}). Start python_backend/app.py to load real test-set metrics.`
      );
    }

    if (!response.ok) {
      const detail = await extractErrorDetail(
        response,
        `Metrics endpoint returned HTTP ${response.status} at ${url}.`
      );
      throw new Error(detail);
    }

    const payload = (await response.json()) as Partial<ModelEvaluationState>;
    return {
      diseaseId,
      modelName: payload.modelName || `${module.metadata.shortTitle} Scikit-learn Model`,
      plannedAlgorithm: payload.plannedAlgorithm || module.metadata.plannedAlgorithm,
      algorithm: payload.algorithm,
      endpointPath: payload.endpointPath || module.metadata.endpointPath,
      status: 'connected_sklearn',
      statusLabel:
        payload.statusLabel ||
        `Connected to Trained Scikit-learn Pipeline${payload.algorithm ? ` (${payload.algorithm})` : ''}`,
      accuracy: typeof payload.accuracy === 'number' ? payload.accuracy : null,
      precision: typeof payload.precision === 'number' ? payload.precision : null,
      recall: typeof payload.recall === 'number' ? payload.recall : null,
      f1Score: typeof payload.f1Score === 'number' ? payload.f1Score : null,
      rocAuc: typeof payload.rocAuc === 'number' ? payload.rocAuc : null,
      confusionMatrix: payload.confusionMatrix || null,
      trainRows: typeof payload.trainRows === 'number' ? payload.trainRows : undefined,
      testRows: typeof payload.testRows === 'number' ? payload.testRows : undefined,
      totalRows: typeof payload.totalRows === 'number' ? payload.totalRows : undefined,
      datasetSource: payload.datasetSource,
      splitStrategy: payload.splitStrategy,
      trainedAtIso: payload.trainedAtIso,
      lastCheckedIso: new Date().toISOString(),
    };
  }

  return {
    diseaseId,
    modelName: `${module.metadata.shortTitle} Educational Simulator`,
    plannedAlgorithm: module.metadata.plannedAlgorithm,
    endpointPath: module.metadata.endpointPath,
    status: 'untrained_demo',
    statusLabel: 'Manual Demo Simulator Mode (No Scikit-learn Model Active)',
    accuracy: null,
    precision: null,
    recall: null,
    f1Score: null,
    rocAuc: null,
    confusionMatrix: null,
  };
}

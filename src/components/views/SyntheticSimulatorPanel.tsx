import { useMemo, useState } from 'react';
import { ArrowUpRight, Dices, ShieldCheck, Sliders } from 'lucide-react';
import { motion } from 'motion/react';
import { useToast } from '../../context/ToastContext';
import { DISEASE_MODULES } from '../../modules/registry';
import { DiseaseId } from '../../types/ml';
import { GlossaryTooltip } from '../common/GlossaryTooltip';
import { MagneticButton } from '../interactive/MagneticButton';

type BiasProfile = 'low' | 'balanced' | 'elevated';

interface SyntheticSimulatorPanelProps {
  diseaseId: DiseaseId;
  onLaunchInPredictor: (
    diseaseId: DiseaseId,
    inputs: Record<string, number>,
    label: string,
    sourceEl?: HTMLElement | null
  ) => void;
}

function clampToStep(val: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, val));
  const steps = Math.round((clamped - min) / step);
  const rounded = min + steps * step;
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 2 : 0;
  return Number(Math.min(max, Math.max(min, rounded)).toFixed(decimals));
}

function generateSyntheticVector(
  diseaseId: DiseaseId,
  bias: BiasProfile,
  noisePct: number
): Record<string, number> {
  const mod = DISEASE_MODULES[diseaseId];
  const vector: Record<string, number> = {};
  const biasSign = bias === 'elevated' ? 0.65 : bias === 'low' ? -0.65 : 0;
  const scale = noisePct / 100;

  mod.features.forEach((feat) => {
    if (feat.type === 'select' && feat.options && feat.options.length > 0) {
      if (bias === 'elevated') {
        const last = feat.options[feat.options.length - 1];
        vector[feat.key] = last.value;
      } else if (bias === 'low') {
        vector[feat.key] = feat.options[0].value;
      } else {
        const pick = feat.options[Math.floor(Math.random() * feat.options.length)];
        vector[feat.key] = pick.value;
      }
      return;
    }

    // Box-Muller approximate Gaussian sample around referenceMean + bias shift
    const u1 = Math.max(1e-5, Math.random());
    const u2 = Math.random();
    const zRand = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const inverseDirection = diseaseId === 'heart' && feat.key === 'thalach' ? -1 : 1;
    const raw =
      feat.referenceMean +
      biasSign * inverseDirection * feat.referenceStd * 0.7 +
      zRand * feat.referenceStd * scale;

    vector[feat.key] = clampToStep(raw, feat.min, feat.max, feat.step);
  });

  return vector;
}

export function SyntheticSimulatorPanel({
  diseaseId,
  onLaunchInPredictor,
}: SyntheticSimulatorPanelProps) {
  const { showToast } = useToast();
  const mod = DISEASE_MODULES[diseaseId];

  const [bias, setBias] = useState<BiasProfile>('balanced');
  const [noisePct, setNoisePct] = useState<number>(65);
  const [syntheticVector, setSyntheticVector] = useState<Record<string, number>>(() =>
    generateSyntheticVector(diseaseId, 'balanced', 65)
  );

  // Sync vector when diseaseId changes
  const [lastDisease, setLastDisease] = useState<DiseaseId>(diseaseId);
  if (lastDisease !== diseaseId) {
    setLastDisease(diseaseId);
    setSyntheticVector(generateSyntheticVector(diseaseId, bias, noisePct));
  }

  const demoPreview = useMemo(
    () => mod.runDemoPrediction(syntheticVector),
    [mod, syntheticVector]
  );

  const handleRegenerate = () => {
    const next = generateSyntheticVector(diseaseId, bias, noisePct);
    setSyntheticVector(next);
    showToast({
      title: 'Generated synthetic profile',
      description: `Sampled ${mod.features.length} non-PHI features for ${mod.metadata.shortTitle}.`,
      variant: 'info',
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-200/80 dark:border-cyan-500/25 mp-glass-panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-cyan-700 dark:text-cyan-400">
              <ShieldCheck className="h-4 w-4" />
              Non-PHI Synthetic Data Simulation Engine
            </div>
            <h3 className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              Parametric Synthetic Vector Generator ({mod.metadata.shortTitle})
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              Samples artificial feature vectors from published{' '}
              <GlossaryTooltip termKey="sampleMean" placement="bottom">
                benchmark means
              </GlossaryTooltip>{' '}
              and{' '}
              <GlossaryTooltip termKey="stdDev" placement="bottom">
                standard deviations
              </GlossaryTooltip>{' '}
              to test classifier boundary sensitivity without using real patient records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <MagneticButton
              onClick={handleRegenerate}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/90 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-cyan-400 whitespace-nowrap"
            >
              <Dices className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Generate Synthetic Sample
            </MagneticButton>
            <MagneticButton
              onClick={(e) =>
                onLaunchInPredictor(
                  diseaseId,
                  syntheticVector,
                  `Synthetic ${bias} profile`,
                  e.currentTarget
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap"
            >
              Launch in Predictor
              <ArrowUpRight className="h-4 w-4" />
            </MagneticButton>
          </div>
        </div>

        {/* Simulation Controls */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
          <div className="md:col-span-5">
            <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Target Distribution Bias
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 p-1">
              {(
                [
                  ['low', 'Low Bias'],
                  ['balanced', 'Balanced'],
                  ['elevated', 'Elevated Bias'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setBias(key);
                    setSyntheticVector(generateSyntheticVector(diseaseId, key, noisePct));
                  }}
                  className={`rounded-lg px-2.5 py-2 text-xs font-semibold transition-all whitespace-nowrap ${
                    bias === key
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-cyan-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="md:col-span-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                Dispersion Scale
              </span>
              <span className="font-mono tabular-nums text-cyan-700 dark:text-cyan-300">
                {noisePct}% σ
              </span>
            </div>
            <input
              type="range"
              aria-label="Synthetic dispersion percentage"
              min={15}
              max={130}
              step={5}
              value={noisePct}
              onChange={(e) => {
                const next = Number(e.target.value);
                setNoisePct(next);
                setSyntheticVector(generateSyntheticVector(diseaseId, bias, next));
              }}
              className="mt-2 w-full accent-violet-600 dark:accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="md:col-span-3 rounded-xl border border-violet-200/80 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-950/35 p-3.5">
            <div className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
              Preview Demo Index (Formula Only)
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                {(demoPreview.probability * 100).toFixed(1)}%
              </span>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                Class {demoPreview.predictedClass}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-violet-500"
                initial={false}
                animate={{ width: `${Math.round(demoPreview.probability * 100)}%` }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </div>
        </div>

        {/* Z-score Feature Vector Preview Grid */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mod.features.map((feat) => {
            const val = syntheticVector[feat.key] ?? feat.defaultValue;
            const z =
              feat.referenceStd > 0 ? (val - feat.referenceMean) / feat.referenceStd : 0;
            const pct = Math.min(100, Math.max(4, ((val - feat.min) / (feat.max - feat.min || 1)) * 100));

            return (
              <div
                key={feat.key}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {feat.shortLabel}
                  </span>
                  <span className="font-mono text-xs font-bold tabular-nums text-blue-700 dark:text-cyan-300">
                    {val} {feat.unit || ''}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  <span>Mean: {feat.referenceMean}</span>
                  <span>
                    z = {z >= 0 ? '+' : ''}
                    {z.toFixed(2)}σ
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

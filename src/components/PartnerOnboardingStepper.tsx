import type { PartnerOnboardingWizardStep } from '../data/partnerOnboardingWizard';
import { ONBOARDING_WIZARD_STEPS } from '../data/partnerOnboardingWizard';
import './PartnerOnboardingStepper.css';

type Props = {
  current: PartnerOnboardingWizardStep;
};

export function PartnerOnboardingStepper({ current }: Props) {
  return (
    <nav className="onb-stepper" aria-label="Progresso do cadastro">
      <ol
        className="onb-stepper-list"
        style={{ gridTemplateColumns: `repeat(${ONBOARDING_WIZARD_STEPS.length}, minmax(0, 1fr))` }}
      >
        {ONBOARDING_WIZARD_STEPS.map(({ step, label }) => {
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={step}
              className={
                active ? 'onb-stepper-item onb-stepper-item-active' : done ? 'onb-stepper-item onb-stepper-item-done' : 'onb-stepper-item'
              }
              aria-current={active ? 'step' : undefined}
            >
              <span className="onb-stepper-marker" aria-hidden>
                {done ? '✓' : step}
              </span>
              <span className="onb-stepper-label">{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

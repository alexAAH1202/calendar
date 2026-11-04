/** Renders a step's symbol. Only "emoji:" placeholders exist in phase 1. */
export function StepImage({ image }: { image?: string }) {
  if (image?.startsWith('emoji:')) {
    return <span className="step-image" aria-hidden="true">{image.slice(6)}</span>;
  }
  return <span className="step-image step-image--blank" aria-hidden="true" />;
}

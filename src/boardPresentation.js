// These are the same coordinates used by BoardCanvas on first mount. Never
// capture an inspection pose as the landing pose when controls are recreated.
export function setBoardPresentationHome(controls, cameraZ) {
  if (!controls) return;
  controls.target0.set(0, 0, 0);
  controls.position0.set(0, 0.05, cameraZ);
  controls.zoom0 = 1;
}

export function restoreBoardPresentation(controls, cameraZ) {
  if (!controls) return;
  const damping = controls.enableDamping;
  const autoRotate = controls.autoRotate;

  // Flush residual drag inertia only during the hidden model hand-off. A
  // plain reset applies that inertia again and can leave the next board skewed.
  controls.enableDamping = false;
  controls.autoRotate = false;
  controls.update();
  setBoardPresentationHome(controls, cameraZ);
  controls.reset();
  controls.enableDamping = damping;
  controls.autoRotate = autoRotate;
}

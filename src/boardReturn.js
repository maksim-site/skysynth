import { Spherical, Vector3 } from "three";
export { BOARD_RETURN_SECONDS } from "./heroMotion.js";

export function createBoardReturn(position, target, cameraZ) {
  const from = new Spherical().setFromVector3(position.clone().sub(target));
  const home = new Spherical().setFromVector3(new Vector3(0, .05, cameraZ));
  return {
    from, home, target: target.clone(), sample: new Spherical(),
    // Unwrap to the nearest front-facing pose, without cutting through the PCB.
    turn: Math.atan2(Math.sin(home.theta - from.theta), Math.cos(home.theta - from.theta)),
  };
}

export function sampleBoardReturn(path, progress, position, target) {
  const t = Math.min(1, Math.max(0, progress));
  const eased = t ** 3 * (t * (t * 6 - 15) + 10);
  path.sample.set(
    path.from.radius + (path.home.radius - path.from.radius) * eased,
    path.from.phi + (path.home.phi - path.from.phi) * eased,
    path.from.theta + path.turn * eased,
  );
  target.copy(path.target).multiplyScalar(1 - eased);
  position.setFromSpherical(path.sample).add(target);
}

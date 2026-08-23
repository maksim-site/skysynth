import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdaptiveDpr,
  Center,
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

function PreparedBoard({ baseRotation = 0.29, board, dracoPath, onReady }) {
  const { scene } = useGLTF(board.model, dracoPath);
  const prepared = useMemo(() => {
    const object = scene.clone(true);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const longestSide = Math.max(size.x, size.y, size.z) || 1;
    const thicknessAxis = [size.x, size.y, size.z].indexOf(
      Math.min(size.x, size.y, size.z),
    );
    const frontRotation =
      thicknessAxis === 1
        ? [Math.PI / 2, 0, 0]
        : thicknessAxis === 0
          ? [0, -Math.PI / 2, 0]
          : [0, 0, 0];

    object.position.sub(center);
    object.traverse((child) => {
      if (child.isMesh) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const polished = materials.map((source) => {
          const material = source.clone();
          const name = material.name.toLowerCase();
          const color = material.color;
          const brightness = color
            ? Math.max(color.r, color.g, color.b)
            : 0.5;
          const spread = color
            ? Math.max(color.r, color.g, color.b) -
              Math.min(color.r, color.g, color.b)
            : 0;

          if (name.includes("copper")) {
            material.color?.set("#d1a356");
            material.metalness = 0.32;
            material.roughness = 0.3;
          } else if (name.includes("solder") || name.includes("core")) {
            material.color?.set("#222829");
            material.metalness = 0.04;
            material.roughness = 0.42;
          } else if (name.includes("silk")) {
            material.color?.set("#ddd9cf");
            material.metalness = 0;
            material.roughness = 0.5;
          } else if (spread < 0.08 && brightness < 0.82) {
            material.color?.set(brightness < 0.22 ? "#202526" : "#3b4243");
            material.metalness = 0.05;
            material.roughness = 0.36;
          } else if (spread < 0.12 && brightness >= 0.82) {
            material.metalness = 0.08;
            material.roughness = 0.38;
          } else {
            material.metalness = Math.min(material.metalness || 0, 0.16);
            material.roughness = 0.38;
          }

          if (material.emissive && material.color) {
            material.emissive.copy(material.color).multiplyScalar(0.055);
            material.emissiveIntensity = 1;
          }

          material.side = THREE.DoubleSide;
          material.envMapIntensity = 0.82;
          material.needsUpdate = true;
          return material;
        });

        child.material = Array.isArray(child.material) ? polished : polished[0];
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
      }
    });

    return {
      object,
      rotation: frontRotation,
      scale: ((board.sceneScale || 3.5) * 0.64) / longestSide,
    };
  }, [board.sceneScale, scene]);

  useEffect(() => {
    onReady();
  }, [onReady, prepared]);

  return (
    <Center>
      <group rotation={[0, 0, baseRotation]}>
        <group scale={prepared.scale} rotation={prepared.rotation}>
          <primitive object={prepared.object} />
        </group>
      </group>
    </Center>
  );
}

const SELECTOR_IDLE_YAW = 0.105;

function IdleBoardMotion({
  children,
  enabled,
  mode = "stage",
  transitionDirection = -1,
  transitionMotion = "idle",
}) {
  const groupRef = useRef(null);
  const phaseRef = useRef(0);
  const floatGainRef = useRef(0);
  const wasEnabledRef = useRef(false);
  const yawVelocityRef = useRef(-SELECTOR_IDLE_YAW);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (enabled && !wasEnabledRef.current) {
      phaseRef.current = 0;
      floatGainRef.current = 0;
    }
    wasEnabledRef.current = enabled;

    if (enabled) phaseRef.current += delta;
    const gainBlend = 1 - Math.exp(-delta * 2.7);
    floatGainRef.current = THREE.MathUtils.lerp(
      floatGainRef.current,
      enabled ? 1 : 0,
      gainBlend,
    );

    const time = phaseRef.current;
    const gain = floatGainRef.current;
    const blend = 1 - Math.exp(-delta * 3.8);
    const selector = mode === "selector";
    const targetY = enabled
      ? Math.sin(time * 0.62) * (selector ? 0.055 : 0.035) * gain
      : 0;
    const targetX = enabled
      ? Math.sin(time * 0.47) * (selector ? 0.018 : 0.008) * gain
      : 0;
    const targetZ = enabled && !selector
      ? Math.sin(time * 0.38) * 0.012 * gain
      : 0;

    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      blend,
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      blend,
    );
    if (selector) {
      if (enabled) {
        // The slow base turn never stops under the speed ramp. For the reverse
        // arrow it follows that direction during the fast turn, then eases back
        // to the gallery's normal clockwise drift during the dissolve.
        const targetYawVelocity =
          transitionMotion === "spin"
            ? transitionDirection * SELECTOR_IDLE_YAW
            : -SELECTOR_IDLE_YAW;
        const yawBlend = 1 - Math.exp(-delta * (transitionMotion === "spin" ? 9 : 4.2));
        yawVelocityRef.current = THREE.MathUtils.lerp(
          yawVelocityRef.current,
          targetYawVelocity,
          yawBlend,
        );
        groupRef.current.rotation.y += yawVelocityRef.current * delta;
      }
    } else {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        0,
        blend,
      );
    }
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetZ,
      blend,
    );
  });

  return <group ref={groupRef}>{children}</group>;
}

function TransitionSpinMotion({ children, direction = 1, motion = "idle" }) {
  const groupRef = useRef(null);
  const elapsedRef = useRef(0);

  useLayoutEffect(() => {
    elapsedRef.current = 0;
    if (motion !== "spin" && groupRef.current) {
      // A completed 360° turn is visually identical to zero. Normalise before
      // the next frame so the idle drift never winds the board backwards.
      groupRef.current.rotation.y = 0;
    }
  }, [direction, motion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    // Keep transition time tied to wall-clock time. Capping a long frame here
    // made a model decode look like a tiny pause followed by resumed motion.
    elapsedRef.current += delta;

    if (motion === "spin") {
      // Finish the fast relative turn shortly before the 1.1 s baked clip.
      // The independent slow yaw keeps moving underneath, so the board reaches
      // idle speed instead of stopping and restarting at the hand-off.
      const progress = Math.min(elapsedRef.current / 1.04, 1);
      // Smootherstep has zero velocity and zero acceleration at both ends.
      // Feeding that same curve into the lift envelope removes the final
      // downward kick that a linear sine envelope produced.
      const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
      const velocityWindow = Math.sin(Math.PI * eased);

      // One continuous 360° turn. The gallery swaps models at the first
      // edge-on quarter-turn, under the fastest part of the baked blur ramp,
      // without resetting this parent transform.
      group.rotation.y = direction * Math.PI * 2 * eased;
      group.rotation.z = direction * 0.032 * velocityWindow;
      group.position.y = 0.045 * velocityWindow;
      group.scale.setScalar(1 - 0.018 * velocityWindow ** 2);
      return;
    }

    const blend = 1 - Math.exp(-delta * 14);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, 0, blend);
    group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, 0, blend);
    group.position.y = THREE.MathUtils.lerp(group.position.y, 0, blend);
    const scale = THREE.MathUtils.lerp(group.scale.x, 1, blend);
    group.scale.setScalar(scale);
  });

  return <group ref={groupRef}>{children}</group>;
}

const orbitPresets = {
  // The hero board stays inside the photographed stage, so its travel is tight.
  stage: {
    minPolarAngle: Math.PI / 2 - 0.18,
    maxPolarAngle: Math.PI / 2 + 0.18,
    minAzimuthAngle: -0.34,
    maxAzimuthAngle: 0.34,
    minDistance: 5.65,
    maxDistance: 7.25,
  },
  // The gallery viewer is a free inspection turntable.
  free: {
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    minDistance: 4.8,
    maxDistance: 12,
  },
  // The selector behaves like a character-pick screen: enough movement to
  // inspect the board, never enough to flip it onto its side.
  selector: {
    minPolarAngle: Math.PI / 2 - 0.24,
    maxPolarAngle: Math.PI / 2 + 0.24,
    minAzimuthAngle: -0.48,
    maxAzimuthAngle: 0.48,
    minDistance: 5.8,
    maxDistance: 7.8,
  },
};

export function BoardScene({
  autoRotate,
  board,
  dracoPath,
  floating,
  onReady,
  orbit = "stage",
  reducedMotion,
  theme,
  transitionDirection = 1,
  transitionMotion = "idle",
}) {
  const controlsRef = useRef(null);
  const previousModelRef = useRef(board.model);
  const previousTransitionMotionRef = useRef(transitionMotion);
  const isDark = theme === "dark";
  const limits = orbitPresets[orbit] || orbitPresets.stage;

  useLayoutEffect(() => {
    const modelChanged = previousModelRef.current !== board.model;
    const transitionStarted =
      previousTransitionMotionRef.current === "idle" &&
      transitionMotion === "spin";

    previousModelRef.current = board.model;
    previousTransitionMotionRef.current = transitionMotion;

    // Canonicalise the camera before the speed ramp starts, not when the GLB is
    // swapped halfway through it. That keeps left/right transitions independent
    // of the angle at which the visitor left the current board and avoids a
    // visible camera jump at peak motion.
    if (transitionStarted || (modelChanged && transitionMotion === "idle")) {
      controlsRef.current?.reset();
    }
  }, [board.model, transitionMotion]);
  // The selector sits inside a photographed lab. Keep its render close to the
  // subdued practical light in that image, so it does not read as a pasted cutout.
  const boost = orbit === "free" ? 1.34 : orbit === "selector" ? 1.5 : 1;

  return (
    <>
      <hemisphereLight
        color={isDark ? "#f5e7d1" : "#ffffff"}
        groundColor={isDark ? "#050607" : "#d7d3c9"}
        intensity={(isDark ? 1.3 : 1.36) * boost}
      />
      <directionalLight
        color={isDark ? "#fff0d7" : "#fffaf2"}
        castShadow
        intensity={(isDark ? 2.28 : 1.72) * boost}
        position={[-3.8, 4.6, 6.8]}
        shadow-bias={-0.00012}
        shadow-camera-bottom={-4}
        shadow-camera-far={14}
        shadow-camera-left={-4}
        shadow-camera-near={1}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      <directionalLight
        color={isDark ? "#8ba3a9" : "#dce4e5"}
        intensity={(isDark ? 0.92 : 0.56) * boost}
        position={[3.4, -3.2, 4.2]}
      />

      <Environment resolution={128}>
        <Lightformer
          color="#fff2da"
          form="rect"
          intensity={2.4}
          position={[-2.8, 3.2, 4.6]}
          scale={[4, 2, 1]}
        />
        <Lightformer
          color="#a9c3c8"
          form="rect"
          intensity={1.1}
          position={[3.6, -1.6, 3.2]}
          rotation={[0, -0.65, 0]}
          scale={[2.5, 2.5, 1]}
        />
      </Environment>

      <TransitionSpinMotion
        direction={transitionDirection}
        motion={transitionMotion}
      >
        <IdleBoardMotion
          enabled={floating && !reducedMotion}
          mode={orbit === "stage" ? "stage" : "selector"}
          transitionDirection={transitionDirection}
          transitionMotion={transitionMotion}
        >
          <Suspense fallback={null}>
            <PreparedBoard
              key={board.model}
              baseRotation={
                Number.isFinite(board.baseRotation)
                  ? board.baseRotation
                  : orbit === "stage"
                    ? 0.29
                    : 0
              }
              board={board}
              dracoPath={dracoPath}
              onReady={onReady}
            />
          </Suspense>
        </IdleBoardMotion>
      </TransitionSpinMotion>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={transitionMotion === "idle"}
        autoRotate={orbit === "stage" ? Boolean(autoRotate) : false}
        autoRotateSpeed={0.55}
        enablePan={false}
        enableDamping
        // The wheel belongs to the page, not to the board.
        enableZoom={false}
        dampingFactor={0.075}
        rotateSpeed={0.48}
        target={[0, 0, 0]}
        {...limits}
      />

      <AdaptiveDpr />
    </>
  );
}

export { useGLTF };

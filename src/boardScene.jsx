import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import {
  AdaptiveDpr,
  Center,
  Environment,
  Lightformer,
  OrbitControls,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import { restoreBoardPresentation, setBoardPresentationHome } from "./boardPresentation.js";
import { BOARD_RETURN_SECONDS, createBoardReturn, sampleBoardReturn } from "./boardReturn.js";

const preparedBoardCache = new Map();

function prepareBoard(board, scene) {
  const cacheKey = `${board.model}:${board.sceneScale || 3.5}`;
  const cached = preparedBoardCache.get(cacheKey);
  if (cached) return cached;

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
  const materialCopies = new Map();
  object.traverse((child) => {
    if (!child.isMesh) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const polished = materials.map((source) => {
      if (materialCopies.has(source)) return materialCopies.get(source);
      const material = source.clone();
      const name = material.name.toLowerCase();
      const color = material.color;
      const brightness = color ? Math.max(color.r, color.g, color.b) : 0.5;
      const spread = color
        ? Math.max(color.r, color.g, color.b) -
          Math.min(color.r, color.g, color.b)
        : 0;

      if (name.includes("copper")) {
        material.color?.set("#d1a356");
        material.metalness = 0.32;
        material.roughness = 0.3;
      } else if (name.includes("solder")) {
        material.color?.set("#222829");
        material.metalness = 0.04;
        material.roughness = 0.42;
        // Client reference: the solder mask is the same opaque black on both
        // faces. Several source GLBs store solder_b as translucent green.
        material.opacity = 1;
        material.transparent = false;
        material.alphaTest = 0;
        material.depthWrite = true;
      } else if (name.includes("core")) {
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
      materialCopies.set(source, material);
      return material;
    });

    child.material = Array.isArray(child.material) ? polished : polished[0];
    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = true;
  });

  const prepared = {
    object,
    rotation: frontRotation,
    scale: ((board.sceneScale || 3.5) * 0.64) / longestSide,
  };
  preparedBoardCache.set(cacheKey, prepared);
  return prepared;
}

function PreparedBoard({ active = true, baseRotation = 0.29, board, dracoPath, onReady }) {
  const { gl, camera, scene: renderScene, invalidate } = useThree();
  const [compiled, setCompiled] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const warmFrames = useRef(0);
  const hostRef = useRef(null);
  const [resident] = useState(() => new THREE.Group());
  const { scene } = useGLTF(board.model, dracoPath);
  const prepared = useMemo(
    () => prepareBoard(board, scene),
    [board, scene],
  );
  const instance = useMemo(() => {
    const clone = prepared.object.clone(true);
    // The warm-up copy lives under its own transform group. Keep the reusable
    // object itself neutral so an active model can never inherit a second
    // scale or front-facing rotation from the preloader.
    clone.scale.set(1, 1, 1);
    clone.rotation.set(0, 0, 0);
    // These client CAD models have no skeletal/local animation. Their local
    // matrices are static; only the outer presentation groups ever move.
    clone.traverse((node) => {
      node.updateMatrix();
      node.matrixAutoUpdate = false;
    });
    return clone;
  }, [prepared]);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host || !compiled || (!active && uploaded)) return;
    // Keep the exact mounted/compiled model in its own portal. Once warm,
    // detach inactive trees so Three does not walk thousands of hidden CAD
    // nodes on every frame. Reattaching never rebuilds geometry or Center.
    host.add(resident);
    invalidate();
    return () => { host.remove(resident); };
  }, [active, compiled, uploaded, resident, invalidate]);

  useEffect(() => {
    let cancelled = false;
    // Compile against the actual lights/environment of this Canvas. Network
    // completion alone is not readiness, and a different Canvas cannot warm it.
    const frame = requestAnimationFrame(() => {
      gl.compileAsync(instance, camera, renderScene).then(() => {
        if (!cancelled) { setCompiled(true); invalidate(); }
      });
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [camera, gl, instance, invalidate, renderScene]);

  useFrame(() => {
    if (!compiled || uploaded) return;
    warmFrames.current += 1;
    // useFrame runs BEFORE rendering. The third callback means that two
    // actual renders have uploaded the geometry and the shadow materials.
    if (warmFrames.current >= 3) {
      setUploaded(true);
      onReady?.(board.model);
    } else invalidate();
  });

  return (
    <group ref={hostRef} scale={active ? 1 : .00001} dispose={null}>
      {createPortal(<Center dispose={null}>
        <group rotation={[0, 0, baseRotation]}>
          <group scale={prepared.scale} rotation={prepared.rotation}>
            <primitive object={instance} />
          </group>
        </group>
      </Center>, resident)}
    </group>
  );
}

// Six degrees per second keeps the accepted slow showroom rotation readable
// without competing with manual inspection or the faster selector transition.
const SELECTOR_IDLE_YAW = 0.105;
const SELECTOR_IDLE_RESUME_DELAY = 0.8;

function IdleBoardMotion({
  children,
  enabled,
  modelKey,
  mode = "stage",
  transitionDirection = -1,
  transitionMotion = "idle",
}) {
  const groupRef = useRef(null);
  const phaseRef = useRef(0);
  const floatGainRef = useRef(0);
  const wasEnabledRef = useRef(false);
  const yawVelocityRef = useRef(-SELECTOR_IDLE_YAW);
  const idleElapsedRef = useRef(0);
  const previousModelRef = useRef(modelKey);
  const previousTransitionMotionRef = useRef(transitionMotion);

  useLayoutEffect(() => {
    const modelChanged = previousModelRef.current !== modelKey;
    previousModelRef.current = modelKey;

    if (!modelChanged || !groupRef.current) return;

    // This runs at the model hand-off under peak motion blur, not when the
    // visitor presses an arrow. The outgoing board therefore keeps its actual
    // pose, while the incoming board completes the remaining turn face-on.
    phaseRef.current = 0;
    floatGainRef.current = 0;
    idleElapsedRef.current = 0;
    yawVelocityRef.current = transitionDirection * SELECTOR_IDLE_YAW;
    groupRef.current.position.set(0, 0, 0);
    groupRef.current.rotation.set(0, 0, 0);
  }, [modelKey, transitionDirection]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const resumedFromTransition =
      previousTransitionMotionRef.current !== "idle" &&
      transitionMotion === "idle";
    previousTransitionMotionRef.current = transitionMotion;

    if (resumedFromTransition) {
      // The settle phase brings the incoming board to its canonical pose.
      // Start the quiet showroom motion from zero on the next frame instead
      // of revealing a float amplitude accumulated behind the transition.
      phaseRef.current = 0;
      floatGainRef.current = 0;
      idleElapsedRef.current = 0;
    }

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
    const transitioning = transitionMotion !== "idle";
    const blend = 1 - Math.exp(-delta * 3.8);
    const selector = mode === "selector";
    const targetY = enabled && !transitioning
      ? Math.sin(time * 0.62) * (selector ? 0.055 : 0.035) * gain
      : 0;
    const targetX = enabled && !transitioning
      ? Math.sin(time * 0.47) * (selector ? 0.018 : 0.008) * gain
      : 0;
    const targetZ = enabled && !selector && !transitioning
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
        // Prepare the next idle velocity under the speed ramp. The orientation
        // itself stays canonical until the settle is over, so every incoming
        // board is presented straight-on before its quiet clockwise drift.
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
        // Keep the fast turn independent from the visitor's inspection pose.
        // The incoming GLB stays exactly face-on until the 360-degree parent
        // turn is complete; only then does the quiet idle yaw resume.
        if (transitionMotion === "idle") {
          idleElapsedRef.current += delta;
        } else {
          idleElapsedRef.current = 0;
        }
        if (
          transitionMotion === "idle" &&
          idleElapsedRef.current >= SELECTOR_IDLE_RESUME_DELAY
        ) {
          groupRef.current.rotation.y += yawVelocityRef.current * delta;
        }
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

function TransitionSpinMotion({
  children,
  direction = 1,
  modelKey,
  motion = "idle",
}) {
  const groupRef = useRef(null);
  const elapsedRef = useRef(0);
  const camera = useThree((state) => state.camera);
  const spinAxisRef = useRef(new THREE.Vector3(0, 1, 0));
  const identityQuaternionRef = useRef(new THREE.Quaternion());
  const pendingAxisResetRef = useRef(false);
  const previousModelRef = useRef(modelKey);

  const captureScreenVertical = () => {
    // Camera-local Y is the vertical direction on screen. Rotating around that
    // world-space axis keeps right/left motion visually stable even after the
    // visitor has inspected the board from above, below or either side.
    spinAxisRef.current
      .set(0, 1, 0)
      .applyQuaternion(camera.quaternion)
      .normalize();
  };

  useLayoutEffect(() => {
    elapsedRef.current = 0;
    if (motion === "spin") {
      captureScreenVertical();
    } else if (groupRef.current) {
      // A completed 360° turn is visually identical to zero. Normalise before
      // the next frame so the idle drift never winds the board backwards.
      groupRef.current.quaternion.identity();
    }
  }, [camera, direction, motion]);

  useLayoutEffect(() => {
    const modelChanged = previousModelRef.current !== modelKey;
    previousModelRef.current = modelKey;
    if (modelChanged && motion === "spin") {
      // BoardScene resets OrbitControls at the hidden model hand-off. Capture
      // the new screen vertical on the following render frame, after that
      // reset has placed the incoming board on the canonical camera.
      pendingAxisResetRef.current = true;
    }
  }, [modelKey, motion]);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (pendingAxisResetRef.current) {
      captureScreenVertical();
      pendingAxisResetRef.current = false;
    }

    // Keep transition time tied to wall-clock time. Capping a long frame here
    // made a model decode look like a tiny pause followed by resumed motion.
    elapsedRef.current += delta;

    if (motion === "spin") {
      // Start from the visitor's exact inspection pose on the first frame.
      // The camera is canonicalised only at the edge-on model hand-off, so the
      // outgoing board never visibly returns home before it starts turning.
      const progress = Math.min(elapsedRef.current / 1.12, 1);
      // Smootherstep has zero velocity and zero acceleration at both ends.
      // Feeding that same curve into the lift envelope removes the final
      // downward kick that a linear sine envelope produced.
      const eased = progress ** 3 * (progress * (progress * 6 - 15) + 10);
      const velocityWindow = Math.sin(Math.PI * eased);

      // One continuous 360° turn. The gallery swaps models at the first
      // edge-on quarter-turn, under the fastest part of the baked blur ramp,
      // without resetting this parent transform.
      group.quaternion.setFromAxisAngle(
        spinAxisRef.current,
        direction * Math.PI * 2 * eased,
      );
      group.position.y = 0.045 * velocityWindow;
      return;
    }

    const blend = 1 - Math.exp(-delta * 14);
    group.quaternion.slerp(identityQuaternionRef.current, blend);
    group.position.y = THREE.MathUtils.lerp(group.position.y, 0, blend);
  });

  return <group ref={groupRef}>{children}</group>;
}

const orbitPresets = {
  // The hero keeps its lighting/scale but allows the same full inspection as
  // the gallery. Small pole margins avoid OrbitControls' vertical singularity.
  stage: {
    minPolarAngle: 0.05,
    maxPolarAngle: Math.PI - 0.05,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
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

function ReturnToFixture({ controlsRef, cameraZ, motion, reducedMotion, onRest }) {
  const pathRef = useRef(null);
  const elapsed = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (motion !== "returning" || !controls) return;
    const position = controls.object.position.clone();
    const target = controls.target.clone();
    const damping = controls.enableDamping;
    const rotating = controls.autoRotate;
    controls.enableDamping = false;
    controls.autoRotate = false;
    // Clear latent pointer inertia, but restore the exact visible starting
    // pose before the next paint. A plain controls.reset() would snap here.
    controls.update();
    controls.object.position.copy(position);
    controls.target.copy(target);
    controls.update();
    pathRef.current = createBoardReturn(position, target, cameraZ);
    elapsed.current = 0;
    invalidate();
    return () => {
      pathRef.current = null;
      controls.enableDamping = damping;
      controls.autoRotate = rotating;
    };
  }, [cameraZ, controlsRef, invalidate, motion]);

  useFrame((_, delta) => {
    const path = pathRef.current;
    const controls = controlsRef.current;
    if (!path || !controls) return;
    elapsed.current += delta;
    const progress = reducedMotion ? 1 : Math.min(1, elapsed.current / BOARD_RETURN_SECONDS);
    sampleBoardReturn(path, progress, controls.object.position, controls.target);
    controls.update();
    if (progress === 1) {
      pathRef.current = null;
      setBoardPresentationHome(controls, cameraZ);
      onRest?.();
    }
  });
  return null;
}

export function BoardScene({
  autoRotate,
  board,
  cameraZ = 6.4,
  compact,
  dracoPath,
  floating,
  onReady,
  onPreloadReady,
  preloadBoards,
  presentationMotion = "idle",
  onPresentationRest,
  orbit = "stage",
  reducedMotion,
  theme,
  transitionDirection = 1,
  transitionMotion = "idle",
}) {
  const controlsRef = useRef(null);
  const previousModelRef = useRef(board.model);
  const isDark = theme === "dark";
  const limits = orbitPresets[orbit] || orbitPresets.stage;

  useLayoutEffect(() => {
    const modelChanged = previousModelRef.current !== board.model;
    previousModelRef.current = board.model;
    setBoardPresentationHome(controlsRef.current, cameraZ);

    // Preserve the visitor's current pose during departure. Canonicalise only
    // at the GLB hand-off, while the board is edge-on and hidden by peak blur;
    // the incoming model then finishes the turn in the straight-on pose.
    if (modelChanged) {
      restoreBoardPresentation(controlsRef.current, cameraZ);
    }
  }, [board.model, cameraZ]);
  // The selector sits inside a photographed lab. Keep its render close to the
  // subdued practical light in that image, so it does not read as a pasted cutout.
  const boost = orbit === "free" ? 1.34 : orbit === "selector" ? 1.5 : 1;
  const galleryInspection = orbit === "free";

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
        shadow-mapSize-height={compact ? 512 : 1024}
        shadow-mapSize-width={compact ? 512 : 1024}
      />
      <directionalLight
        color={isDark ? "#8ba3a9" : "#dce4e5"}
        intensity={(isDark ? 0.92 : 0.56) * boost}
        position={[3.4, -3.2, 4.2]}
      />
      {galleryInspection ? (
        // Rear fill has no shadow map: components remain readable on the back
        // without adding another expensive shadow pass or changing the hero.
        <directionalLight
          name="gallery-rear-fill"
          color={isDark ? "#fff1dc" : "#fffaf2"}
          intensity={(isDark ? 1.35 : 1.15) * boost}
          position={[2.8, 3.6, -6.2]}
        />
      ) : null}

      <Environment resolution={compact ? 64 : 128}>
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
        {galleryInspection ? (
          <Lightformer
            color="#fff2df"
            form="rect"
            intensity={0.85}
            position={[-2.8, 2.4, -4.8]}
            rotation={[0, Math.PI, 0]}
            scale={[4.5, 3.5, 1]}
          />
        ) : null}
      </Environment>

      <TransitionSpinMotion
        direction={transitionDirection}
        modelKey={board.model}
        motion={transitionMotion}
      >
        <IdleBoardMotion
          enabled={floating && !reducedMotion}
          modelKey={board.model}
          mode={orbit === "stage" ? "stage" : "selector"}
          transitionDirection={transitionDirection}
          transitionMotion={transitionMotion}
        >
          {(preloadBoards || [board]).map((item) => <Suspense key={item.model} fallback={null}>
            <PreparedBoard
              active={item.model === board.model}
              baseRotation={
                Number.isFinite(item.baseRotation)
                  ? item.baseRotation
                  : orbit === "stage"
                    ? 0.29
                    : 0
              }
              board={item}
              dracoPath={dracoPath}
              onReady={onPreloadReady || onReady}
            />
          </Suspense>)}
        </IdleBoardMotion>
      </TransitionSpinMotion>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={transitionMotion === "idle" && presentationMotion === "idle"}
        autoRotate={orbit === "stage" ? Boolean(autoRotate) : false}
        autoRotateSpeed={0.55}
        enablePan={false}
        enableDamping
        // The wheel belongs to the page, not to the board.
        enableZoom={false}
        dampingFactor={0.075}
        rotateSpeed={compact ? 0.78 : 0.48}
        target={[0, 0, 0]}
        {...limits}
      />

      <ReturnToFixture
        controlsRef={controlsRef}
        cameraZ={cameraZ}
        motion={presentationMotion}
        reducedMotion={reducedMotion}
        onRest={onPresentationRest}
      />

      <AdaptiveDpr />
    </>
  );
}

export { useGLTF };

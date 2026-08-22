import { Suspense, useEffect, useMemo, useRef } from "react";
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

function IdleBoardMotion({ children, enabled, mode = "stage" }) {
  const groupRef = useRef(null);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    const time = clock.getElapsedTime();
    const blend = 1 - Math.exp(-delta * 3.8);
    const selector = mode === "selector";
    const targetY = enabled ? Math.sin(time * 0.62) * (selector ? 0.055 : 0.035) : 0;
    const targetX = enabled ? Math.sin(time * 0.47) * (selector ? 0.018 : 0.008) : 0;
    const targetZ = enabled && !selector ? Math.sin(time * 0.38 + 0.8) * 0.012 : 0;
    const targetYaw = enabled && selector ? Math.sin(time * 0.34) * 0.13 : 0;

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
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetYaw,
      blend,
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetZ,
      blend,
    );
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
}) {
  const controlsRef = useRef(null);
  const isDark = theme === "dark";
  const limits = orbitPresets[orbit] || orbitPresets.stage;

  // Every board opens from the same angle, however the previous one was left.
  useEffect(() => {
    controlsRef.current?.reset();
  }, [board.model]);
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

      <IdleBoardMotion
        enabled={floating && !reducedMotion}
        mode={orbit === "stage" ? "stage" : "selector"}
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

      <OrbitControls
        ref={controlsRef}
        makeDefault
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

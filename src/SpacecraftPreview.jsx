import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';

function Rocket({ commandModule, fuelTank, engine }) {
  const tankHeight =
  fuelTank === 'Large' ? 2.6 :
  fuelTank === 'Medium' ? 2 :
  1.4;

  const moduleHeight = 1.2;
  const engineHeight = 0.8;
  const rocketRef = useRef();

  useFrame((_, delta) => {
    if (rocketRef.current) {
      rocketRef.current.rotation.y += delta * 0.3;
    }
  });

  return (
    <group ref={rocketRef}>
      {/* Command module */}
      {commandModule && (
        <mesh position={[0, tankHeight / 2 + moduleHeight / 2, 0]}>
          <coneGeometry args={[
            commandModule === 'Orion' ? 0.65 : 0.5,
            1.2,
            32
          ]} />
          <meshStandardMaterial color="#dce5ed" metalness={0.5} />
        </mesh>
      )}

      {/* Fuel tank */}
      {fuelTank && (
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[
            0.55,
            0.55,
            fuelTank === 'Large' ? 2.6 :
            fuelTank === 'Medium' ? 2 : 1.4,
            32
          ]} />
          <meshStandardMaterial
            color="#dce3e8"
            metalness={0.7}
            roughness={0.3}
            />
        </mesh>
      )}
      {fuelTank && (
  <>
    <mesh position={[0, tankHeight / 2 - 0.15, 0]}>
      <cylinderGeometry args={[0.565, 0.565, 0.15, 32]} />
      <meshStandardMaterial color="#253441" metalness={0.7} />
    </mesh>

    <mesh position={[0, -tankHeight / 2 + 0.15, 0]}>
      <cylinderGeometry args={[0.565, 0.565, 0.15, 32]} />
      <meshStandardMaterial color="#253441" metalness={0.7} />
    </mesh>
  </>
    )}

      {/* Engine */}
      {engine && (
        <mesh
            position={[0, -tankHeight / 2 - engineHeight / 2, 0]}
            rotation={[Math.PI, 0, 0]}
            >
          <coneGeometry args={[
            engine === 'Chemical' ? 0.5 : 0.3,
            0.8,
            32
          ]} />
          <meshStandardMaterial color="#697b8b" metalness={0.8} />
        </mesh>                
      )}

      {engine && (
  <mesh position={[0, -tankHeight / 2 - engineHeight - 0.12, 0]}>
    <cylinderGeometry args={[0.25, 0.45, 0.25, 32]} />
    <meshStandardMaterial
      color="#303a43"
      metalness={0.9}
      roughness={0.25}
    />
  </mesh>
    )}
    </group>
  );
}

export default function SpacecraftPreview({
  commandModule,
  fuelTank,
  engine
}) {
  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [5, 3, 6], fov: 45 }}>
        <color attach="background" args={['#07111c']} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 8, 5]} intensity={3} />

        <Rocket
          commandModule={commandModule}
          fuelTank={fuelTank}
          engine={engine}
        />

        <OrbitControls enablePan={false} />
      </Canvas>
    </div>
  );
}
/* eslint-disable react/no-unknown-property */
import React, { useCallback, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Float, RoundedBox, SoftShadows } from '@react-three/drei'
import * as THREE from 'three'
import { LEGACY_HAT_ID } from './domain/hats'

const PET_OBSTACLES = [
  { x: -4, z: -4, radius: 2.5 },
  { x: 6, z: -5, radius: 3.5 },
  { x: -2, z: 0.5, radius: 1.5 },
  { x: 3.5, z: -1, radius: 1.5 },
  { x: 7.5, z: 2.5, radius: 2.0 },
];

// --- Интерактивные 3D Предметы ---

function AnimatedSteak() {
   const steak = useRef();
   useFrame((state) => {
       const time = state.clock.elapsedTime * 6;
       if (steak.current) {
          steak.current.position.y = 0.5 + Math.abs(Math.sin(time)) * 0.15; // Парит перед ртом
          steak.current.rotation.y += 0.03; 
          steak.current.rotation.z = Math.sin(time) * 0.1;
       }
   });
   return (
      <group ref={steak} position={[0, 0.5, 1.2]} scale={0.6}>
         {/* Кость */}
         <mesh castShadow position={[0,0,0]}><boxGeometry args={[1.5, 0.2, 0.3]} /><meshStandardMaterial color="#f8fafc" /></mesh>
         <mesh castShadow position={[-0.7,0,0]}><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#f8fafc" /></mesh>
         <mesh castShadow position={[0.7,0,0]}><boxGeometry args={[0.4, 0.4, 0.4]} /><meshStandardMaterial color="#f8fafc" /></mesh>
         {/* Мясо */}
         <mesh castShadow position={[0,0,0]}><boxGeometry args={[0.8, 0.6, 0.6]} /><meshStandardMaterial color="#ef4444" roughness={0.5} /></mesh>
      </group>
   )
}

function AnimatedBall() {
   const ball = useRef();
   useFrame((state) => {
      const time = state.clock.elapsedTime * 12;
      if (ball.current) {
         // Эпично скачет перед собакой
         ball.current.position.y = 0.3 + Math.abs(Math.sin(time)) * 2.0;
         ball.current.position.z = 2.0 + Math.cos(state.clock.elapsedTime * 3) * 1.5;
         ball.current.position.x = Math.sin(state.clock.elapsedTime * 3) * 1.5;
         ball.current.rotation.x -= 0.15;
         ball.current.rotation.y += 0.1;
      }
   });
   return (
      // Воксельный мячик-многогранник
      <mesh ref={ball} position={[0, 1, 2]} castShadow receiveShadow>
         <sphereGeometry args={[0.4, 8, 8]} />
         <meshStandardMaterial color="#3b82f6" roughness={0.3} />
      </mesh>
   )
}

function DiggingTreasure() {
   const group = useRef();
   useFrame(() => {
      if (group.current) {
          group.current.children.forEach((coin, i) => {
              coin.position.y += 0.08 + (i * 0.02);
              coin.rotation.y += 0.2;
              coin.rotation.x += 0.1;
              if (coin.position.y > 2.5) {
                // Возвращаем в землю
                coin.position.y = -0.5;
                coin.position.x = (Math.random() - 0.5) * 2;
                coin.position.z = 1 + Math.random();
              }
          });
      }
   });
   return (
      <group ref={group} position={[0, 0, 0]}>
         {/* Воксельные квадратные монетки летящие из-под лап */}
         <mesh position={[-0.5, -0.5, 1.5]} castShadow><boxGeometry args={[0.4, 0.4, 0.1]} /><meshStandardMaterial color="#fbbf24" /></mesh>
         <mesh position={[0.5, 0, 1.8]} castShadow><boxGeometry args={[0.4, 0.4, 0.1]} /><meshStandardMaterial color="#fbbf24" /></mesh>
         <mesh position={[0, -1.0, 1.2]} castShadow><boxGeometry args={[0.4, 0.4, 0.1]} /><meshStandardMaterial color="#fbbf24" /></mesh>
      </group>
   )
}

// НОВЫЙ КОМПОНЕНТ: Пиксельный Дворик
function PixelYard({ environment, onGroundClick }) {
  const isNight = environment === 'night';
  const isSunset = environment === 'sunset';
  
  const grassColor = isNight ? '#064e3b' : (isSunset ? '#166534' : '#4ade80');
  const houseColor = isNight ? '#78350f' : (isSunset ? '#b45309' : '#fcd34d');
  const roofColor = isNight ? '#7f1d1d' : (isSunset ? '#991b1b' : '#ef4444');
  const trunkColor = isNight ? '#451a03' : '#78350f';
  const leavesColor = isNight ? '#065f46' : (isSunset ? '#047857' : '#10b981');
  const pathColor = isNight ? '#a8a29e' : (isSunset ? '#d6d3d1' : '#e7e5e4');
  const grassTuftColor = isNight ? '#022c22' : (isSunset ? '#14532d' : '#22c55e');

  const cloudsRef = useRef();

  // Генерация небольших кустиков травинок
  const grassBlades = React.useMemo(() => {
      return Array.from({ length: 90 }).map(() => ({
          x: (Math.random() - 0.5) * 45,
          z: (Math.random() - 0.5) * 20,
          h: 0.1 + Math.random() * 0.4
      }))
  }, []);

  useFrame((state) => {
    if (cloudsRef.current) {
        // Медленно плывущие облака
        cloudsRef.current.position.x = Math.sin(state.clock.elapsedTime * 0.02) * 6;
    }
  });

  return (
    <group position={[0, -0.05, -2]}>
      {/* Трава. Верхняя грань находится точно на Y = 0 */}
      <mesh position={[0, -0.2, 0]} receiveShadow onClick={onGroundClick} onPointerOver={() => document.body.style.cursor='crosshair'} onPointerOut={() => document.body.style.cursor='auto'}>
         <boxGeometry args={[60, 0.4, 60]} />
         <meshStandardMaterial color={grassColor} roughness={1} />
      </mesh>

      {/* Мелкая травичка вокселями */}
      <group>
         {grassBlades.map((g, i) => (
            <mesh key={i} position={[g.x, 0.05, g.z]} receiveShadow castShadow>
               <boxGeometry args={[0.1, g.h, 0.1]} />
               <meshStandardMaterial color={grassTuftColor} roughness={1} />
            </mesh>
         ))}
      </group>

      {/* Солнце или Луна */}
      <Float speed={1} floatIntensity={0.2} rotationIntensity={0}>
        <mesh position={[12, 16, -18]}>
           <boxGeometry args={[4, 4, 1]} />
           <meshBasicMaterial color={isNight ? '#e2e8f0' : (isSunset ? '#f97316' : '#fef08a')} />
        </mesh>
      </Float>

      {/* Плывущие кубические облака */}
      <group ref={cloudsRef} position={[0, 10, -15]}>
         <group position={[-8, 0, 0]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[4, 1.5, 1.5]} /><meshBasicMaterial color={isSunset ? '#fca5a5' : '#ffffff'} transparent opacity={isNight ? 0.1 : 0.8} /></mesh>
            <mesh position={[0.5, 1, 0]}><boxGeometry args={[2, 1.5, 1.5]} /><meshBasicMaterial color={isSunset ? '#fca5a5' : '#ffffff'} transparent opacity={isNight ? 0.1 : 0.8} /></mesh>
         </group>
         <group position={[5, 2, -5]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[5, 1.5, 1.5]} /><meshBasicMaterial color={isSunset ? '#fca5a5' : '#ffffff'} transparent opacity={isNight ? 0.1 : 0.8} /></mesh>
            <mesh position={[-1, 1, 0]}><boxGeometry args={[2.5, 1.5, 1.5]} /><meshBasicMaterial color={isSunset ? '#fca5a5' : '#ffffff'} transparent opacity={isNight ? 0.1 : 0.8} /></mesh>
         </group>
      </group>
      
      {/* Полая деревянная будка для питомца, в которую он может залезть! */}
      <group position={[-4, 1.0, -4]} 
          onClick={(e) => { 
             e.stopPropagation(); 
             // Имитируем объект события, чтобы Scene3D смог правильно прочитать e.point
             onGroundClick({ 
                 stopPropagation: () => {}, 
                 point: { x: -4, y: 0, z: -3.4, isDoghouse: true } 
             });
          }}
          onPointerOver={() => document.body.style.cursor='pointer'} 
          onPointerOut={() => document.body.style.cursor='auto'}
      >
        {/* Стены будки (Шире, чтобы пролезла собака!) */}
        <mesh position={[-1.7, 0, 0]} receiveShadow castShadow><boxGeometry args={[0.2, 2, 3]} /><meshStandardMaterial color={houseColor} /></mesh>
        <mesh position={[1.7, 0, 0]} receiveShadow castShadow><boxGeometry args={[0.2, 2, 3]} /><meshStandardMaterial color={houseColor} /></mesh>
        <mesh position={[0, 0, -1.4]} receiveShadow castShadow><boxGeometry args={[3.6, 2, 0.4]} /><meshStandardMaterial color={houseColor} /></mesh>
        
        {/* Передний входной фасад с проходом (Отверстие 1.6 вместо 1.0) */}
        <mesh position={[-1.3, 0, 1.4]} receiveShadow castShadow><boxGeometry args={[1.0, 2, 0.2]} /><meshStandardMaterial color={houseColor} /></mesh>
        <mesh position={[1.3, 0, 1.4]} receiveShadow castShadow><boxGeometry args={[1.0, 2, 0.2]} /><meshStandardMaterial color={houseColor} /></mesh>
        <mesh position={[0, 0.6, 1.4]} receiveShadow castShadow><boxGeometry args={[1.6, 0.8, 0.2]} /><meshStandardMaterial color={houseColor} /></mesh>
        
        {/* Улучшенная двускатная крыша (без зазоров) */}
        <mesh position={[-1.0, 1.45, 0]} rotation={[0, 0, Math.PI/4]} receiveShadow castShadow>
           <boxGeometry args={[3.0, 0.2, 3.4]} />
           <meshStandardMaterial color={roofColor} roughness={0.8} />
        </mesh>
        <mesh position={[1.0, 1.45, 0]} rotation={[0, 0, -Math.PI/4]} receiveShadow castShadow>
           <boxGeometry args={[3.0, 0.2, 3.4]} />
           <meshStandardMaterial color={roofColor} roughness={0.8} />
        </mesh>
        {/* Фронтон (закрытие дырки под крышей) */}
        <mesh position={[0, 1.1, 0]} receiveShadow castShadow>
           <boxGeometry args={[2.5, 0.8, 2.8]} />
           <meshStandardMaterial color={houseColor} />
        </mesh>

        {/* Глубокий черный фон внутри */}
        <mesh position={[0, -0.4, -1.15]}>
          <boxGeometry args={[3.2, 1.2, 0.1]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>

      {/* Деревце */}
      <group position={[6, 1.5, -5]} onClick={(e) => e.stopPropagation()}>
        <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.8, 2, 0.8]} />
          <meshStandardMaterial color={trunkColor} />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
           <boxGeometry args={[3, 3, 3]} />
           <meshStandardMaterial color={leavesColor} roughness={0.9} />
        </mesh>
        <mesh position={[0, 3, 0]} castShadow receiveShadow>
           <boxGeometry args={[2, 2, 2]} />
           <meshStandardMaterial color={leavesColor} roughness={0.9} />
        </mesh>
      </group>

      {/* Кустик в нижнем правом углу */}
      <group position={[7.5, 0.5, 2.5]} onClick={(e) => e.stopPropagation()}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}><boxGeometry args={[2, 1, 1.5]} /><meshStandardMaterial color={leavesColor} roughness={0.9} /></mesh>
        <mesh castShadow receiveShadow position={[-1.2, 0.2, -0.5]}><boxGeometry args={[1.5, 1.2, 1.5]} /><meshStandardMaterial color={leavesColor} roughness={0.9} /></mesh>
      </group>

      {/* Воксельная миска с кормом около тропинки */}
      <group position={[-2, 0.1, 0.5]} onClick={(e) => e.stopPropagation()}>
         {/* Миска */}
         <mesh castShadow receiveShadow><boxGeometry args={[0.7, 0.2, 0.7]} /><meshStandardMaterial color={isNight ? '#94a3b8' : '#f1f5f9'} /></mesh>
         {/* Корм */}
         <mesh castShadow receiveShadow position={[0, 0.05, 0]}><boxGeometry args={[0.5, 0.2, 0.5]} /><meshStandardMaterial color="#78350f" /></mesh>
      </group>

      {/* Почтовый ящик */}
      <group position={[3.5, 0.6, -1]} onClick={(e) => e.stopPropagation()}>
         <mesh castShadow receiveShadow position={[0,-0.3,0]}><boxGeometry args={[0.2, 0.8, 0.2]} /><meshStandardMaterial color={trunkColor} /></mesh>
         <mesh castShadow receiveShadow position={[0,0.2,0]}><boxGeometry args={[0.6, 0.5, 0.8]} /><meshStandardMaterial color={isNight ? '#7f1d1d' : '#ef4444'} /></mesh>
      </group>

      {/* Ограждение (Деревянный штакетник) */}
      <group position={[0, 0.4, -12]} onClick={(e) => e.stopPropagation()}>
         {/* Задний забор */}
         <group>
           {/* Перекладины */}
           <mesh castShadow receiveShadow position={[0, 0.1, 0]}><boxGeometry args={[30, 0.1, 0.1]} /><meshStandardMaterial color={trunkColor} /></mesh>
           <mesh castShadow receiveShadow position={[0, -0.2, 0]}><boxGeometry args={[30, 0.1, 0.1]} /><meshStandardMaterial color={trunkColor} /></mesh>
           {/* Доски */}
           {Array.from({ length: 21 }).map((_, i) => (
             <mesh key={`back-${i}`} castShadow receiveShadow position={[-15 + i * 1.5, 0, 0.1]}>
               <boxGeometry args={[0.3, 1, 0.1]} />
               <meshStandardMaterial color={trunkColor} />
             </mesh>
           ))}
         </group>

         {/* Левый забор */}
         <group position={[-15, 0, 10]}>
           <mesh castShadow receiveShadow position={[0, 0.1, 0]}><boxGeometry args={[0.1, 0.1, 20]} /><meshStandardMaterial color={trunkColor} /></mesh>
           <mesh castShadow receiveShadow position={[0, -0.2, 0]}><boxGeometry args={[0.1, 0.1, 20]} /><meshStandardMaterial color={trunkColor} /></mesh>
           {Array.from({ length: 14 }).map((_, i) => (
             <mesh key={`left-${i}`} castShadow receiveShadow position={[0.1, 0, -9.5 + i * 1.5]}>
               <boxGeometry args={[0.1, 1, 0.3]} />
               <meshStandardMaterial color={trunkColor} />
             </mesh>
           ))}
         </group>

         {/* Правый забор */}
         <group position={[15, 0, 10]}>
           <mesh castShadow receiveShadow position={[0, 0.1, 0]}><boxGeometry args={[0.1, 0.1, 20]} /><meshStandardMaterial color={trunkColor} /></mesh>
           <mesh castShadow receiveShadow position={[0, -0.2, 0]}><boxGeometry args={[0.1, 0.1, 20]} /><meshStandardMaterial color={trunkColor} /></mesh>
           {Array.from({ length: 14 }).map((_, i) => (
             <mesh key={`right-${i}`} castShadow receiveShadow position={[-0.1, 0, -9.5 + i * 1.5]}>
               <boxGeometry args={[0.1, 1, 0.3]} />
               <meshStandardMaterial color={trunkColor} />
             </mesh>
           ))}
         </group>
      </group>

      {/* Тропинка. Чуть выше травы */}
      <mesh position={[0, 0.02, 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
         <planeGeometry args={[2.5, 15]} />
         <meshStandardMaterial color={pathColor} roughness={1} />
      </mesh>
    </group>
  );
}

function PetHat({ hatId }) {
  if (!hatId) {
    return null;
  }

  switch (hatId) {
    case 'baseball_cap':
      return (
        <group position={[0, 0.45, 0.08]} rotation={[0.14, 0, 0]} scale={0.88}>
          <mesh position={[0, 0.05, -0.08]} castShadow>
            <sphereGeometry args={[0.34, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#2563eb" roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.04, 0.3]} rotation={[0.24, 0, 0]} castShadow>
            <boxGeometry args={[0.48, 0.04, 0.22]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.14, -0.2]} castShadow>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial color="#60a5fa" roughness={0.4} />
          </mesh>
        </group>
      );
    case 'beanie':
      return (
        <group position={[0, 0.43, 0.03]} scale={0.9}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.31, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ef4444" roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.04, 0]} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.16, 20]} />
            <meshStandardMaterial color="#dc2626" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.29, 0]} castShadow>
            <sphereGeometry args={[0.065, 12, 12]} />
            <meshStandardMaterial color="#fee2e2" roughness={0.6} />
          </mesh>
        </group>
      );
    case 'bucket_hat':
      return (
        <group position={[0, 0.41, 0.03]} rotation={[0.08, 0, 0]} scale={0.9}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.32, 0.24, 20]} />
            <meshStandardMaterial color="#f59e0b" roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.03, 0.03]} castShadow>
            <cylinderGeometry args={[0.42, 0.36, 0.06, 24]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.5} />
          </mesh>
        </group>
      );
    case 'antlers':
      return (
        <group position={[0, 0.45, 0.01]} scale={0.9}>
          <RoundedBox args={[0.5, 0.07, 0.14]} radius={0.03} smoothness={2} position={[0, -0.06, 0]}>
            <meshPhysicalMaterial color="#8b5a2b" roughness={0.75} />
          </RoundedBox>
          <group position={[-0.21, 0.08, 0]} rotation={[0, 0, 0.16]}>
            <RoundedBox args={[0.08, 0.46, 0.08]} radius={0.03} smoothness={2} position={[0, 0.08, 0]} castShadow>
              <meshPhysicalMaterial color="#d6b37a" roughness={0.85} />
            </RoundedBox>
            <RoundedBox args={[0.22, 0.06, 0.06]} radius={0.02} smoothness={2} position={[0.08, 0.1, 0]} rotation={[0, 0, 0.72]} castShadow>
              <meshPhysicalMaterial color="#d6b37a" roughness={0.85} />
            </RoundedBox>
            <RoundedBox args={[0.2, 0.06, 0.06]} radius={0.02} smoothness={2} position={[0.08, 0.22, 0]} rotation={[0, 0, 0.38]} castShadow>
              <meshPhysicalMaterial color="#d6b37a" roughness={0.85} />
            </RoundedBox>
          </group>
          <group position={[0.21, 0.08, 0]} rotation={[0, 0, -0.16]}>
            <RoundedBox args={[0.08, 0.46, 0.08]} radius={0.03} smoothness={2} position={[0, 0.08, 0]} castShadow>
              <meshPhysicalMaterial color="#d6b37a" roughness={0.85} />
            </RoundedBox>
            <RoundedBox args={[0.22, 0.06, 0.06]} radius={0.02} smoothness={2} position={[-0.08, 0.1, 0]} rotation={[0, 0, -0.72]} castShadow>
              <meshPhysicalMaterial color="#d6b37a" roughness={0.85} />
            </RoundedBox>
            <RoundedBox args={[0.2, 0.06, 0.06]} radius={0.02} smoothness={2} position={[-0.08, 0.22, 0]} rotation={[0, 0, -0.38]} castShadow>
              <meshPhysicalMaterial color="#d6b37a" roughness={0.85} />
            </RoundedBox>
          </group>
        </group>
      );
    case 'beer_hat':
      return (
        <group position={[0, 0.45, 0.02]} scale={0.88}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <sphereGeometry args={[0.3, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#22c55e" roughness={0.45} />
          </mesh>
          <mesh position={[0, -0.03, 0]} castShadow>
            <cylinderGeometry args={[0.33, 0.33, 0.08, 20]} />
            <meshStandardMaterial color="#16a34a" roughness={0.4} />
          </mesh>
          <mesh position={[-0.36, 0.08, 0]} castShadow rotation={[0, 0, 0.1]}>
            <cylinderGeometry args={[0.12, 0.12, 0.36, 16]} />
            <meshStandardMaterial color="#ef4444" roughness={0.35} />
          </mesh>
          <mesh position={[0.36, 0.08, 0]} castShadow rotation={[0, 0, -0.1]}>
            <cylinderGeometry args={[0.12, 0.12, 0.36, 16]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.35} />
          </mesh>
          <mesh position={[-0.36, 0.31, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 10]} />
            <meshStandardMaterial color="#fde68a" roughness={0.5} />
          </mesh>
          <mesh position={[0.36, 0.31, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.1, 10]} />
            <meshStandardMaterial color="#fde68a" roughness={0.5} />
          </mesh>
        </group>
      );
    case LEGACY_HAT_ID:
      return (
        <group position={[0, 0.47, 0.02]} scale={0.88}>
          <mesh position={[0, -0.02, 0]} castShadow rotation={[0.08, 0, 0]}>
            <cylinderGeometry args={[0.52, 0.58, 0.08, 24]} />
            <meshPhysicalMaterial color="#6d28d9" roughness={0.45} clearcoat={0.2} />
          </mesh>
          <mesh position={[0, 0.31, 0]} castShadow rotation={[0.1, 0.08, 0]}>
            <coneGeometry args={[0.28, 0.66, 24]} />
            <meshPhysicalMaterial color="#7c3aed" roughness={0.4} clearcoat={0.3} />
          </mesh>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.28, 0.08, 20]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.35} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

// Геометрическая 3D модель питомца
function PetModel({ userTarget, isSick, actionState, ageScale, activeHat, hasHat, genetics, onPetClick }) {
  const rootGroup = useRef()
  const group = useRef()
  const headGroup = useRef()
  const tail = useRef()
  const tongue = useRef()
  const jaw = useRef()
  const body = useRef()
  
  const fLegs = useRef()
  const bLegs = useRef()
  const lfLeg = useRef()
  const rfLeg = useRef()
  const lbLeg = useRef()
  const rbLeg = useRef()
  
  const lEar = useRef()
  const rEar = useRef()

  const targetGlobalPos = useRef(new THREE.Vector3(0, 0, 0));
  const doghousePhase = useRef(0);
  const [idleAnim, setIdleAnim] = useState('stand')
  
  const checkCollision = useCallback((nx, nz) => {
       if (nx < -12 || nx > 12) return true; // Боковые заборы
       if (nz < -8 || nz > 6) return true;   // Задний забор и камера
       for (let o of PET_OBSTACLES) {
           const dist = Math.sqrt((nx - o.x)**2 + (nz - o.z)**2);
           if (dist < o.radius) return true;
       }
       return false;
  }, [])

  useEffect(() => {
     if (userTarget && actionState === 'idle') {
         if (userTarget.isDoghouse) {
             doghousePhase.current = 1;
         } else {
             doghousePhase.current = 0;
             targetGlobalPos.current.set(userTarget.x, 0, userTarget.z);
         }
         setIdleAnim('run');
     }
  }, [userTarget, actionState]);

  useEffect(() => {
    if (actionState !== 'idle') return;
    const interval = setInterval(() => {
       if (doghousePhase.current > 0) return; // Собака сидит в будке, не начинать случайные действия
       
       const anims = ['stand', 'stand', 'walk', 'sit', 'tiltHead', 'tongue', 'walk'];
       const nextAnim = anims[Math.floor(Math.random() * anims.length)];
       
       if (nextAnim === 'walk') {
           for (let i = 0; i < 15; i++) {
               const nx = rootGroup.current.position.x + (Math.random() - 0.5) * 8;
               const nz = rootGroup.current.position.z + (Math.random() - 0.5) * 8;
               if (!checkCollision(nx, nz)) {
                   targetGlobalPos.current.set(nx, 0, nz);
                   setIdleAnim('walk');
                   return;
               }
           }
           setIdleAnim('stand'); 
       } else {
           setIdleAnim(nextAnim);
       }
    }, 3500);
    return () => clearInterval(interval);
  }, [actionState, checkCollision]);
  
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    const lerp = THREE.MathUtils.lerp;
    
    let showTongue = false;

    let targetHeadZ = 0;
    let targetHeadX = 0;
    let targetRootY = 0; 
    let targetRootRotX = 0; 
    let targetFLegsX = 0;
    let targetBLegsX = 0;
    let targetEarDrop = 0;
    
    let targetLFX = 0;
    let targetRFX = 0;
    let targetLBX = 0;
    let targetRBX = 0;

    let tailSpeed = 5;
    let tailAmp = 0.3;
    let isMoving = false;

    // --- ЛОГИКА ХОДЬБЫ И БЕГА / ROAMING --- //
    if (rootGroup.current) {
        if (actionState === 'idle') {
            if (doghousePhase.current > 0) {
                 if (doghousePhase.current === 1) { // Шаг 1: Бежим прямо ко входу
                     const dx = -4 - rootGroup.current.position.x;
                     const dz = -1.0 - rootGroup.current.position.z;
                     const dist = Math.sqrt(dx*dx + dz*dz);
                     if (dist > 0.2) {
                         isMoving = true;
                         rootGroup.current.position.x += (dx / dist) * delta * 6.0;
                         rootGroup.current.position.z += (dz / dist) * delta * 6.0;
                         const targetRot = Math.atan2(dx, dz);
                         const diff = targetRot - rootGroup.current.rotation.y;
                         rootGroup.current.rotation.y += Math.atan2(Math.sin(diff), Math.cos(diff)) * delta * 8;
                     } else {
                         doghousePhase.current = 2; // Переходим к входу внутрь
                     }
                 } else if (doghousePhase.current === 2) { // Шаг 2: Идем вглубь будки строго по прямой
                     // Принудительно выравниваем по X чтобы пролезть идеально в центр прохода
                     rootGroup.current.position.x = THREE.MathUtils.lerp(rootGroup.current.position.x, -4, delta * 15);
                     
                     const dz = -3.4 - rootGroup.current.position.z;
                     if (Math.abs(dz) > 0.05) {
                         isMoving = true;
                         rootGroup.current.position.z += Math.sign(dz) * delta * 2.0;
                         
                         // Принудительно смотрим "внутрь" будки (прочь от камеры)
                         const targetRot = Math.PI;
                         const diff = targetRot - rootGroup.current.rotation.y;
                         rootGroup.current.rotation.y += Math.atan2(Math.sin(diff), Math.cos(diff)) * delta * 12;
                     } else {
                         doghousePhase.current = 3; // Дошли
                     }
                 } else if (doghousePhase.current === 3) {
                     // Шаг 3: Собака разворачивается и смотрит из будки во двор
                     isMoving = false;
                     const diff = 0 - rootGroup.current.rotation.y;
                     rootGroup.current.rotation.y += Math.atan2(Math.sin(diff), Math.cos(diff)) * delta * 5;
                 }
            } else if (idleAnim === 'walk' || idleAnim === 'run') {
                const dx = targetGlobalPos.current.x - rootGroup.current.position.x;
                const dz = targetGlobalPos.current.z - rootGroup.current.position.z;
                const dist = Math.sqrt(dx*dx + dz*dz);
                if (dist > 0.2) {
                    isMoving = true;
                    const currentSpeed = idleAnim === 'run' ? 6.0 : 1.5;
                    rootGroup.current.position.x += (dx / dist) * delta * currentSpeed;
                    rootGroup.current.position.z += (dz / dist) * delta * currentSpeed;
                    const targetRot = Math.atan2(dx, dz);
                    const diff = targetRot - rootGroup.current.rotation.y;
                    const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                    rootGroup.current.rotation.y += normalizedDiff * delta * 8;
                }
            }
        } else if (actionState !== 'idle' && actionState !== 'sleep') {
            doghousePhase.current = 0; // Сбрасываем фазу будки если начали кушать или играть!
            // При активных действиях Питомец разворачивается лицом к камере
            const diff = 0 - rootGroup.current.rotation.y;
            const normalizedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
            rootGroup.current.rotation.y += normalizedDiff * delta * 8;
            
            // И стремительно возвращается в центр экрана, чтобы лучше было видно предметы (мяч, стейк)!
            rootGroup.current.position.x = THREE.MathUtils.lerp(rootGroup.current.position.x, 0, delta * 5);
            rootGroup.current.position.z = THREE.MathUtils.lerp(rootGroup.current.position.z, 0, delta * 5);
        }
    }


    if (actionState === 'sleep') {
       targetRootY = -0.27; 
       targetRootRotX = 0; 
       targetHeadX = 0.35; 
       targetFLegsX = -1.2; 
       targetBLegsX = 1.2; 
       targetEarDrop = 1.0; 
       tailAmp = 0.05;
       tailSpeed = 1;
       const breath = Math.sin(time * 2);
       if(body.current) body.current.scale.set(1 + breath * 0.02, 1 + breath * 0.05, 1 + breath * 0.03); 
    } else if (actionState === 'feed') {
       targetRootY = 0;
       targetRootRotX = 0.15; 
       targetHeadX = 0.2 + Math.sin(time * 15) * 0.3; 
       targetFLegsX = -0.2; 
       targetBLegsX = 0.1;
       tailAmp = 0.8;
       tailSpeed = 25;
       showTongue = true;
       if(body.current) body.current.scale.setScalar(1);
    } else if (actionState === 'play') {
       targetRootY = Math.max(0, Math.sin(time * 15)) * 0.6; 
       targetRootRotX = -0.1; 
       const inAir = targetRootY > 0.2;
       targetFLegsX = inAir ? 0.6 : 0; 
       targetBLegsX = inAir ? 0.4 : 0; 
       targetEarDrop = -0.3; 
       tailAmp = 1.2;
       tailSpeed = 35;
       showTongue = true;
       if(body.current) body.current.scale.setScalar(1);
    } else if (actionState === 'work') {
       targetRootY = 0;
       targetRootRotX = 0.3; 
       targetHeadX = 0.5; 
       if(group.current) group.current.rotation.z = Math.sin(time * 30) * 0.05; 
       targetFLegsX = Math.sin(time * 30) * 0.8; 
       targetBLegsX = -0.1; 
       tailAmp = 0.6;
       tailSpeed = 20;
       if(body.current) body.current.scale.setScalar(1);
    } else if (actionState === 'bark') {
       targetRootY = -0.16; 
       targetRootRotX = -0.25; 
       targetHeadX = -0.2 + Math.abs(Math.sin(time * 20)) * 0.15; 
       targetFLegsX = 0.25; 
       targetBLegsX = -1.2; 
       targetEarDrop = -0.2; 
       tailAmp = 0.7;
       tailSpeed = 25;
       if(body.current) body.current.scale.set(1, 1 + Math.sin(time * 20) * 0.05, 1); 
    } else {
       if(group.current) group.current.rotation.z = lerp(group.current.rotation.z, 0, 0.1);
       
       if (idleAnim === 'run' && isMoving) {
         targetRootY = Math.abs(Math.sin(time * 25)) * 0.3; // Прыжки галопа
         targetRootRotX = Math.cos(time * 25) * 0.15; // Наклон туловища
         const runPhase = time * 25;
         targetLFX = Math.sin(runPhase) * 0.8;
         targetRFX = Math.sin(runPhase) * 0.8;
         targetLBX = Math.sin(runPhase + Math.PI) * 0.8; 
         targetRBX = Math.sin(runPhase + Math.PI) * 0.8;
         targetHeadZ = 0; 
         tailSpeed = 30;
       } else if (idleAnim === 'walk' && isMoving) {
         targetRootY = Math.abs(Math.sin(time * 12)) * 0.08; 
         const walkPhase = time * 14;
         targetLFX = Math.sin(walkPhase) * 0.5;
         targetRFX = Math.sin(walkPhase + Math.PI) * 0.5;
         targetLBX = Math.sin(walkPhase + Math.PI) * 0.5;  
         targetRBX = Math.sin(walkPhase) * 0.5;
         targetHeadZ = Math.sin(time * 4) * 0.15; 
         tailSpeed = 15;
       } else if (idleAnim === 'sit') {
         targetRootY = -0.16; 
         targetRootRotX = -0.25;
         targetFLegsX = 0.25; 
         targetBLegsX = -1.2; 
       } else if (idleAnim === 'tiltHead') {
         targetHeadZ = 0.35; 
         targetEarDrop = Math.sin(time * 5) * 0.2; 
         targetFLegsX = 0; targetBLegsX = 0;
       } else if (idleAnim === 'tongue') {
         showTongue = true;
         if(body.current) body.current.scale.set(1 + Math.sin(time*25)*0.015, 1 + Math.sin(time*25)*0.02, 1);
       } else {
         if(body.current) body.current.scale.setScalar(1 + Math.sin(time * 3.5) * 0.01);
       }
    }

    if(group.current) {
      group.current.position.y = lerp(group.current.position.y, targetRootY, 0.15);
      group.current.rotation.x = lerp(group.current.rotation.x, targetRootRotX, 0.15);
    }
    
    if(headGroup.current){
      headGroup.current.rotation.z = lerp(headGroup.current.rotation.z, targetHeadZ, 0.15);
      headGroup.current.rotation.x = lerp(headGroup.current.rotation.x, targetHeadX, 0.15);
    }

    if (fLegs.current) fLegs.current.rotation.x = lerp(fLegs.current.rotation.x, targetFLegsX, 0.2);
    if (bLegs.current) bLegs.current.rotation.x = lerp(bLegs.current.rotation.x, targetBLegsX, 0.2);

    if (lfLeg.current) lfLeg.current.rotation.x = lerp(lfLeg.current.rotation.x, targetLFX, 0.3);
    if (rfLeg.current) rfLeg.current.rotation.x = lerp(rfLeg.current.rotation.x, targetRFX, 0.3);
    if (lbLeg.current) lbLeg.current.rotation.x = lerp(lbLeg.current.rotation.x, targetLBX, 0.3);
    if (rbLeg.current) rbLeg.current.rotation.x = lerp(rbLeg.current.rotation.x, targetRBX, 0.3);

    const targetTailRotX = (isSick || actionState === 'sleep') ? 1.0 : 0.6; 
    if(tail.current){
      tail.current.rotation.x = lerp(tail.current.rotation.x, targetTailRotX, 0.1);
      tail.current.rotation.y = Math.sin(time * tailSpeed) * tailAmp;
    }

    const isFloppy = genetics?.earType === 'floppy';
    const headwearEarDrop = resolvedHat ? (isFloppy ? 0.12 : 0.55) : 0;
    const baseEarDrop = isFloppy ? 1.5 : 0.2; 
    if (lEar.current) lEar.current.rotation.x = lerp(lEar.current.rotation.x, baseEarDrop + targetEarDrop + headwearEarDrop, 0.1);
    if (rEar.current) rEar.current.rotation.x = lerp(rEar.current.rotation.x, baseEarDrop + targetEarDrop + headwearEarDrop, 0.1);

    if (jaw.current) {
        if (actionState === 'bark') {
            jaw.current.rotation.x = 0.1 + Math.abs(Math.sin(time * 20)) * 0.6; 
        } else if (actionState === 'play' || actionState === 'feed') {
            jaw.current.rotation.x = lerp(jaw.current.rotation.x, 0.2, 0.2); 
        } else if (idleAnim === 'tongue') {
            jaw.current.rotation.x = lerp(jaw.current.rotation.x, 0.15, 0.2); 
        } else {
            jaw.current.rotation.x = lerp(jaw.current.rotation.x, 0, 0.2); 
        }
    }

    if (isSick && actionState !== 'sleep') {
      targetRootY -= 0.04;
      targetHeadX = Math.max(targetHeadX, 0.18);
      targetEarDrop += 0.12;
      tailAmp *= 0.3;
      tailSpeed = Math.max(1.5, tailSpeed * 0.35);
    }

    if(group.current) {
        group.current.position.x = lerp(group.current.position.x, 0, 0.1);
    }

    if (tongue.current) {
       const wantTongue = showTongue || actionState === 'bark';
       tongue.current.scale.z = lerp(tongue.current.scale.z, wantTongue ? 1 : 0.01, 0.2);
       tongue.current.scale.x = lerp(tongue.current.scale.x, wantTongue ? 1 : 0.01, 0.2);
    }
  })

  const setPointer = (active) => {
      document.body.style.cursor = active ? 'pointer' : 'auto';
  };

  const savedColor = genetics?.color; 
  const baseColor = (savedColor && savedColor !== '#fbbf24') ? savedColor : '#df7720'; 
  const color = isSick ? '#4ade80' : baseColor;
  
  const secondaryColor = '#fffbeb'; 
  const snoutExt = genetics?.snoutLength || 0.4;
  const isSleeping = actionState === 'sleep';
  const resolvedHat = activeHat || (hasHat ? LEGACY_HAT_ID : null);
  const earYOffset = resolvedHat ? -0.1 : 0;

  return (
    <group 
      ref={rootGroup} 
      scale={ageScale} 
      position={[0, 0, 0]} 
      onClick={(e) => { e.stopPropagation(); onPetClick && onPetClick(); }}
      onPointerOver={() => setPointer(true)}
      onPointerOut={() => setPointer(false)}
    >
      {/* Главный контейнер питомца (для тряски и подскоков без смещения центра) */}
      <group ref={group}>
        {/* Тело */}
        <RoundedBox ref={body} args={[0.7, 0.8, 1.1]} radius={0.3} smoothness={4} position={[0, 0.5, 0]} castShadow>
          <meshPhysicalMaterial color={color} roughness={0.9} clearcoat={0.1} />
        </RoundedBox>
        
        {/* Голова */}
        <group ref={headGroup} position={[0, 1.0, 0.5]}>
          <RoundedBox args={[0.75, 0.7, 0.7]} radius={0.3} smoothness={4} castShadow>
            <meshPhysicalMaterial color={color} roughness={0.9} clearcoat={0.1} />
          </RoundedBox>
          
          {isSleeping ? (
             <group position={[0, 0, 0.36]}>
               <mesh position={[-0.18, 0.05, 0]}>
                 <boxGeometry args={[0.15, 0.02, 0.02]} />
                 <meshPhysicalMaterial color="#0f172a" roughness={0.8} />
               </mesh>
               <mesh position={[0.18, 0.05, 0]}>
                 <boxGeometry args={[0.15, 0.02, 0.02]} />
                 <meshPhysicalMaterial color="#0f172a" roughness={0.8} />
               </mesh>
             </group>
          ) : (
             <group position={[0, 0, 0.35]}>
               <RoundedBox args={
                 (actionState === 'idle' && idleAnim === 'sit') ? [0.08, 0.02, 0.02] : 
                 (actionState === 'play' || actionState === 'feed') ? [0.1, 0.04, 0.02] : 
                 [0.08, 0.1, 0.02] 
               } radius={0.02} smoothness={4} position={[-0.18, 0.1, 0]}>
                 <meshPhysicalMaterial color="#0f172a" roughness={0.1} clearcoat={1.0} />
               </RoundedBox>
               <RoundedBox args={
                  (actionState === 'idle' && idleAnim === 'sit') ? [0.08, 0.02, 0.02] : 
                  (actionState === 'play' || actionState === 'feed') ? [0.1, 0.04, 0.02] : 
                  [0.08, 0.1, 0.02]
               } radius={0.02} smoothness={4} position={[0.18, 0.1, 0]}>
                 <meshPhysicalMaterial color="#0f172a" roughness={0.1} clearcoat={1.0} />
               </RoundedBox>
             </group>
          )}

          <RoundedBox args={[0.3, 0.25, snoutExt]} radius={0.1} smoothness={4} position={[0, -0.05, 0.35 + (snoutExt / 2)]}>
            <meshPhysicalMaterial color={secondaryColor} roughness={0.9} />
          </RoundedBox>

          <RoundedBox args={[0.12, 0.1, 0.1]} radius={0.05} smoothness={4} position={[0, 0.05, 0.35 + snoutExt + 0.02]}>
            <meshPhysicalMaterial color="#111" roughness={0.2} clearcoat={0.8} />
          </RoundedBox>

          <group ref={jaw} position={[0, -0.15, 0.35]}>
              <RoundedBox args={[0.26, 0.08, snoutExt - 0.04]} radius={0.03} smoothness={4} position={[0, -0.02, snoutExt/2 - 0.02]}>
                  <meshPhysicalMaterial color={secondaryColor} roughness={0.9} />
              </RoundedBox>
              <RoundedBox ref={tongue} args={[0.12, 0.03, 0.15]} radius={0.015} smoothness={4} position={[0, 0.03, snoutExt/2 + 0.02]} rotation={[0.05, 0, 0]}>
                 <meshPhysicalMaterial color="#fb7185" roughness={0.8} clearcoat={0.5} />
              </RoundedBox>
          </group>

          <group position={[-0.25, 0.35 + earYOffset, 0]} ref={lEar}>
            <RoundedBox args={[0.2, 0.4, 0.15]} radius={0.05} smoothness={4} position={[0, 0.1, 0]} rotation={[0, 0, 0.3]}>
              <meshPhysicalMaterial color={color} roughness={0.9} />
            </RoundedBox>
          </group>
          <group position={[0.25, 0.35 + earYOffset, 0]} ref={rEar}>
             <RoundedBox args={[0.2, 0.4, 0.15]} radius={0.05} smoothness={4} position={[0, 0.1, 0]} rotation={[0, 0, -0.3]}>
              <meshPhysicalMaterial color={color} roughness={0.9} />
            </RoundedBox>
          </group>

          <PetHat hatId={resolvedHat} />
        </group>

        <RoundedBox ref={tail} args={[0.15, 0.15, 0.4]} radius={0.05} smoothness={4} position={[0, 0.8, -0.55]} rotation={[0.6, 0, 0]}>
          <meshPhysicalMaterial color={color} roughness={0.9} />
        </RoundedBox>
        
        <group ref={fLegs} position={[0, 0.25, 0.4]}>
          <group ref={lfLeg} position={[-0.25, 0, 0]}><RoundedBox args={[0.15, 0.3, 0.15]} radius={0.05} smoothness={4} position={[0, -0.1, 0]} castShadow><meshPhysicalMaterial color={color} roughness={0.9}/></RoundedBox></group>
          <group ref={rfLeg} position={[0.25, 0, 0]}><RoundedBox args={[0.15, 0.3, 0.15]} radius={0.05} smoothness={4} position={[0, -0.1, 0]} castShadow><meshPhysicalMaterial color={color} roughness={0.9}/></RoundedBox></group>
        </group>
        <group ref={bLegs} position={[0, 0.25, -0.4]}>
          <group ref={lbLeg} position={[-0.25, 0, 0]}><RoundedBox args={[0.15, 0.3, 0.15]} radius={0.05} smoothness={4} position={[0, -0.1, 0]} castShadow><meshPhysicalMaterial color={color} roughness={0.9}/></RoundedBox></group>
          <group ref={rbLeg} position={[0.25, 0, 0]}><RoundedBox args={[0.15, 0.3, 0.15]} radius={0.05} smoothness={4} position={[0, -0.1, 0]} castShadow><meshPhysicalMaterial color={color} roughness={0.9}/></RoundedBox></group>
        </group>
      </group>

      {/* Интерактивные предметы теперь привязаны к корню питомца! */}
      {actionState === 'feed' && <AnimatedSteak />}
      {actionState === 'play' && <AnimatedBall />}
      {actionState === 'work' && <DiggingTreasure />}

    </group>
  )
}

export default function Scene3D({ isSick, aliveMins, activeHat, hasHat, genetics, environment, actionState, onPetClick }) {
  const [userTarget, setUserTarget] = useState(null);

  const getAgeScale = () => {
    if (!aliveMins || aliveMins < 1) return 0.5 
    if (aliveMins < 5) return 0.8 
    if (aliveMins < 10) return 1.0 
    return 1.25 
  }

  const environmentPreset = environment === 'night'
    ? 'night'
    : environment === 'sunset'
      ? 'sunset'
      : 'city';

  return (
    <Canvas shadows camera={{ position: [0, 3, 10], fov: 50 }}>
      {environmentPreset === 'night' ? (
         <color attach="background" args={['#0f172a']} />
      ) : environmentPreset === 'sunset' ? (
         <color attach="background" args={['#fdba74']} />
      ) : (
         <color attach="background" args={['#7dd3fc']} />
      )}

      <SoftShadows size={15} samples={16} focus={0.5} />
      <Environment preset={environmentPreset} />

      <ambientLight intensity={environmentPreset === 'night' ? 0.3 : 0.8} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={environmentPreset === 'night' ? 0.8 : 2.5} 
         castShadow 
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      />

      <PixelYard environment={environment} onGroundClick={(e) => {
         e.stopPropagation();
         setUserTarget(e.point);
      }} />

      <PetModel userTarget={userTarget} isSick={isSick} actionState={actionState} ageScale={getAgeScale()} activeHat={activeHat} hasHat={hasHat} genetics={genetics} onPetClick={onPetClick} />

      {/* Площадь тени расширена, чтобы покрывать двор */}
      <ContactShadows position={[0, 0.03]} opacity={0.6} scale={40} blur={2.5} far={4} color="#000000" />

      <OrbitControls 
        enablePan={false} 
        enableZoom={false} 
        minPolarAngle={Math.PI/2 - 0.25} 
        maxPolarAngle={Math.PI/2 - 0.25} 
        minAzimuthAngle={-0.3}
        maxAzimuthAngle={0.3}
      />
    </Canvas>
  )
}

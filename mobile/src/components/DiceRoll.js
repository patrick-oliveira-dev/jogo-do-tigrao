import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Canvas, RoundedRect, Circle, Group, Shadow, BlurMask, LinearGradient, vec } from '@shopify/react-native-skia';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring, 
  withRepeat,
  withSequence,
  Easing,
  interpolate
} from 'react-native-reanimated';
import { triggerHaptic } from '../services/SoundService';

const { width } = Dimensions.get('window');
const DICE_SIZE = 140;
const RADIUS = 28;

const DiceFace = ({ number, size }) => {
  const pips = useMemo(() => {
    const p = size * 0.25;
    const c = size / 2;
    const l = p;
    const h = size - p;
    
    switch (number) {
      case 1: return [{ x: c, y: c }];
      case 2: return [{ x: l, y: l }, { x: h, y: h }];
      case 3: return [{ x: l, y: l }, { x: c, y: c }, { x: h, y: h }];
      case 4: return [{ x: l, y: l }, { x: h, y: l }, { x: l, y: h }, { x: h, y: h }];
      case 5: return [{ x: l, y: l }, { x: h, y: l }, { x: c, y: c }, { x: l, y: h }, { x: h, y: h }];
      case 6: return [{ x: l, y: l }, { x: h, y: l }, { x: l, y: c }, { x: h, y: c }, { x: l, y: h }, { x: h, y: h }];
      default: return [];
    }
  }, [number, size]);

  return (
    <Group>
      {pips.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={size / 10} color="white">
            <Shadow dx={1} dy={1} blur={2} color="rgba(0,0,0,0.5)" />
        </Circle>
      ))}
    </Group>
  );
};

export default function DiceRoll({ number, visible }) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const glow = useSharedValue(0);
  const [displayNumber, setDisplayNumber] = useState(number);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      glow.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
      
      // Animação de Giro
      rotation.value = withTiming(1080, { 
        duration: 1500, 
        easing: Easing.bezier(0.25, 1, 0.5, 1) 
      });

      let count = 0;
      const interval = setInterval(() => {
        setDisplayNumber(Math.floor(Math.random() * 6) + 1);
        triggerHaptic('LIGHT');
        count++;
        if (count > 12) {
            clearInterval(interval);
            setDisplayNumber(number);
            triggerHaptic('HEAVY');
        }
      }, 110);

      return () => clearInterval(interval);
    } else {
      scale.value = withTiming(0);
      rotation.value = 0;
      glow.value = 0;
    }
  }, [visible, number]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
      { perspective: 1000 }
    ],
    opacity: scale.value
  }));

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.diceWrapper, animatedStyle]}>
        <Canvas style={styles.canvas}>
          {/* Enhanced Outer Glow */}
          <RoundedRect 
            x={10} y={10} 
            width={DICE_SIZE - 20} height={DICE_SIZE - 20} 
            r={RADIUS} 
            color="#ff52a1"
          >
            <BlurMask blur={20} style="outer" />
          </RoundedRect>

          {/* Dice Body with Gradient */}
          <RoundedRect 
            x={0} y={0} 
            width={DICE_SIZE} height={DICE_SIZE} 
            r={RADIUS}
            color="#ff52a1"
          >
            <LinearGradient 
              start={vec(0, 0)} 
              end={vec(DICE_SIZE, DICE_SIZE)} 
              colors={["#ff7eb3", "#ff52a1", "#d10056"]} 
            />
            <Shadow dx={6} dy={6} blur={12} color="rgba(0,0,0,0.6)" />
          </RoundedRect>

          <DiceFace number={displayNumber} size={DICE_SIZE} />
        </Canvas>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 180,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceWrapper: {
    width: DICE_SIZE,
    height: DICE_SIZE,
  },
  canvas: {
    width: DICE_SIZE + 20,
    height: DICE_SIZE + 20,
    margin: -10, // Compensar o blur externo
  }
});

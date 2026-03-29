import React, { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, View as RNView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DiceRoll({ number, visible }) {
  const rotateAnim = useRef(new RNAnimated.Value(0)).current;
  const scale = useRef(new RNAnimated.Value(0)).current;
  const [displayNumber, setDisplayNumber] = useState(number);

  useEffect(() => {
    if (visible) {
      scale.setValue(0);
      rotateAnim.setValue(0);
      
      // Shuffle Frenético e Efeito de Sorteio
      let ticks = 0;
      const interval = setInterval(() => {
          setDisplayNumber(Math.floor(Math.random() * 6) + 1);
          ticks++;
          if (ticks > 8) clearInterval(interval);
      }, 100);

      // Salto Físico e Rotação Centrifugada de 720 graus
      RNAnimated.parallel([
        RNAnimated.timing(rotateAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true
        }),
        RNAnimated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 10,
          useNativeDriver: true
        })
      ]).start(() => setDisplayNumber(number));
    }
  }, [number, visible]);

  if (!visible) return null;

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg']
  });

  return (
    <RNView style={styles.diceContainer}>
      <RNAnimated.View style={{ transform: [{ scale }, { rotate: spin }] }}>
        <MaterialCommunityIcons name={`dice-${displayNumber}`} size={110} color="#ff52a1" style={{textShadowColor: '#ffb7e6', textShadowRadius: 10}} />
      </RNAnimated.View>
    </RNView>
  );
}

const styles = StyleSheet.create({
  diceContainer: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    elevation: 10,
    shadowColor: '#ff52a1',
    shadowOpacity: 0.8,
    shadowRadius: 15,
  }
});

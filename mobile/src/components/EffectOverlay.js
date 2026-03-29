import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const ANIMATIONS = {
  WIN: 'https://assets2.lottiefiles.com/packages/lf20_u4yrau.json',
  LOSS: 'https://assets1.lottiefiles.com/packages/lf20_26ezun.json',
  GAMEOVER: 'https://assets8.lottiefiles.com/packages/lf20_m6vpsfnu.json'
};

export default function EffectOverlay({ type, onFinish }) {
  const animationRef = useRef(null);

  if (!type) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <LottieView
        ref={animationRef}
        source={{ uri: ANIMATIONS[type] }}
        autoPlay
        loop={false}
        style={styles.lottie}
        onAnimationFinish={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottie: {
    width: width * 1.2,
    height: height * 1.2,
  }
});

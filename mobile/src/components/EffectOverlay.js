import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text, Image } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { MotiView } from 'moti';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Assets Gerados (Locais em assets/ com Transparência REAL)
const ASSETS = {
  HAPPY: require('../../assets/tiger_happy-removebg-preview.png'),
  SAD: require('../../assets/tiger_sad-removebg-preview.png'),
  CRYING: require('../../assets/tiger_crying-removebg-preview.png')
};

// Chuva de Moedas realista (Ganhou)
const WinCoinRain = () => {
  return (
    <View style={StyleSheet.absoluteFill}>
      {[...Array(30)].map((_, i) => (
        <MotiView
          key={i}
          from={{ 
            translateY: -100, 
            translateX: Math.random() * width,
            rotate: '0deg',
            opacity: 1
          }}
          animate={{ 
            translateY: height + 100,
            rotate: '720deg'
          }}
          transition={{
            type: 'timing',
            duration: 2000 + Math.random() * 2000,
            loop: true,
            delay: Math.random() * 2000
          }}
          style={styles.absoluteCoin}
        >
          <MaterialCommunityIcons name="circle-double" size={24} color="#ffd700" />
        </MotiView>
      ))}
    </View>
  );
};

// Moedas para a Banca (Perdeu)
const LossCoinToBank = () => {
  return (
    <View style={StyleSheet.absoluteFill}>
       {[...Array(15)].map((_, i) => (
        <MotiView
          key={i}
          from={{ 
            translateY: height - 100, 
            translateX: (width / 15) * i,
            scale: 1,
            opacity: 1
          }}
          animate={{ 
            translateY: 50, // Vai para o topo na direção da banca
            scale: 0.2,
            opacity: 0
          }}
          transition={{
            type: 'timing',
            duration: 1200,
            delay: i * 50
          }}
          style={styles.absoluteCoin}
        >
          <MaterialCommunityIcons name="circle-double" size={20} color="#ffd700" />
        </MotiView>
      ))}
    </View>
  );
};

export default function EffectOverlay({ type, onFinish }) {
  const translateY = useSharedValue(200);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (type) {
      translateY.value = withTiming(0, { duration: 500 });
      opacity.value = withTiming(1, { duration: 400 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(200, { duration: 500 });
        opacity.value = withTiming(0, { duration: 400 }, () => {
          if (onFinish) runOnJS(onFinish)();
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [type]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  if (!type || type === 'ROLLING') return null;

  const isWin = type === 'WIN';
  const mascotSource = isWin ? ASSETS.HAPPY : ASSETS.SAD;

  return (
    <View style={styles.masterContainer} pointerEvents="none">
      
      {/* Camada das Animações Globais */}
      {isWin ? <WinCoinRain /> : <LossCoinToBank />}

      <Animated.View style={[styles.toastContainer, animatedStyle]}>
        <View style={[styles.toastCard, { borderColor: isWin ? '#ffd700' : '#ff52a1' }]}>
          
          <Image 
             source={mascotSource} 
             style={styles.mascotImage}
             resizeMode="contain"
          />

          <View style={styles.textContainer}>
            <Text style={[styles.statusText, { color: isWin ? '#ffd700' : '#ffb7e6' }]}>
              {isWin ? "ACERTOU!" : "TENTE DE NOVO!"}
            </Text>
            <Text style={styles.subText}>
              {isWin ? "Muitas moedas pra você!" : "O saldo foi para a Banca..."}
            </Text>
          </View>

          {isWin && (
             <MaterialCommunityIcons name="trophy-variant" size={28} color="#ffd700" style={{marginLeft: 10}} />
          )}
        </View>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  masterContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 100, // Elevamos para escapar da barra nav
    width: '100%',
    alignItems: 'center',
  },
  toastCard: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 8, 40, 0.98)',
    borderRadius: 25,
    padding: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 25,
  },
  mascotImage: {
    width: 70, 
    height: 70,
    marginRight: 5,
  },
  textContainer: {
    flex: 1,
    marginLeft: 15,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subText: {
    color: '#888',
    fontSize: 12,
    fontWeight: 'bold',
  },
  absoluteCoin: {
    position: 'absolute',
  }
});

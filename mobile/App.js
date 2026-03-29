import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { useGameStore } from './src/store/gameStore';
import HomeScreen from './src/screens/HomeScreen';
import GameScreen from './src/screens/GameScreen';

export default function App() {
  const room = useGameStore((state) => state.room);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e1e" />
      {room ? <GameScreen /> : <HomeScreen />}
    </SafeAreaView>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
};

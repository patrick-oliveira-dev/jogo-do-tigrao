import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, StatusBar, ActivityIndicator, Image } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { sendAction } from '../services/socket';
import DiceRoll from '../components/DiceRoll';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { playSound, triggerHaptic } from '../services/SoundService';
import EffectOverlay from '../components/EffectOverlay';
import { MotiView, AnimatePresence } from 'moti';

const { width, height } = Dimensions.get('window');
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 0;

// Asset Feliz Gerado (Local em assets/ com Transparência REAL)
const TIGER_HAPPY = require('../../assets/tiger_happy-removebg-preview.png');
const TIGER_POINTING = require('../../assets/tiger_pointing-removebg-preview.png');
const TIGER_CRYING = require('../../assets/tiger_crying-removebg-preview.png');

export default function GameScreen() {
  const { room, playerId, backendIp, setRoom, lastEvent, playerName } = useGameStore();
  const [betChoice, setBetChoice] = useState('HIGH');
  const [luckyNumber, setLuckyNumber] = useState(1);
  const [amount, setAmount] = useState(10);
  const [diceVisible, setDiceVisible] = useState(false);
  const [showResultMsg, setShowResultMsg] = useState(false);
  const [activeEffect, setActiveEffect] = useState(null);
  const [starting, setStarting] = useState(false);

  const lastTurn = useRef(room?.turnCounter || 0);
  const nextRoomData = useRef(null);
  const isRolling = useRef(false);

  useEffect(() => {
    useGameStore.getState().setLastEvent(null);
    setActiveEffect(null);
    return () => useGameStore.getState().setLastEvent(null);
  }, []);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`http://${backendIp}:8080/api/game/room/${room?.roomCode}?t=${Date.now()}`);
        if (response.ok) {
          const updatedRoom = await response.json();
          if (!playerId) {
            const findMe = updatedRoom.players.find(p => p.name?.trim().toLowerCase() === playerName?.trim().toLowerCase());
            if (findMe) useGameStore.getState().setPlayerId(findMe.id);
          }
          if (updatedRoom.turnCounter && updatedRoom.turnCounter > lastTurn.current) {
            lastTurn.current = updatedRoom.turnCounter;
            nextRoomData.current = updatedRoom;
            isRolling.current = true;
            useGameStore.getState().setLastEvent({ type: 'DICE_ROLLED', diceResult: updatedRoom.lastDiceResult, message: updatedRoom.lastMessage });
            playSound('DICE');
          } else if (!isRolling.current) {
            setRoom(updatedRoom);
          }
        }
      } catch (e) { }
    };
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [room?.roomCode, backendIp, playerId, playerName]);

  useEffect(() => {
    if (lastEvent?.type === 'DICE_ROLLED') {
      setDiceVisible(false); setShowResultMsg(false); setActiveEffect('ROLLING');
      setTimeout(() => setDiceVisible(true), 100);
      setTimeout(() => {
        setShowResultMsg(true);
        if (nextRoomData.current) {
          const oldMe = room.players.find(p => p.id === playerId);
          const newMe = nextRoomData.current.players.find(p => p.id === playerId);
          if (newMe && oldMe) {
            if (newMe.balance > oldMe.balance) { setActiveEffect('WIN'); playSound('WIN'); }
            else if (newMe.balance < oldMe.balance) { setActiveEffect('LOSS'); playSound('LOSS'); }
          }
          setRoom(nextRoomData.current);
          nextRoomData.current = null;
          isRolling.current = false;
          setTimeout(() => useGameStore.getState().setLastEvent(null), 4500);
        }
      }, 4000); // 4.0s: Tempo de sobra para ver o dado parar
    }
  }, [lastEvent]);

  if (!room) return <View style={styles.loading}><ActivityIndicator size="large" color="#ff52a1" /></View>;

  const me = room.players.find(p => p.id === playerId || p.name === playerName);
  const isHost = me?.isHost || (room.players[0]?.id === playerId);
  const currentPlayer = room.players[room.currentPlayerIndex];
  const isMyTurn = room.status === 'IN_PROGRESS' && (currentPlayer?.id === playerId || currentPlayer?.name === playerName);
  const isFinished = room.status === 'FINISHED';

  const startGame = async () => {
    setStarting(true);
    try {
      const response = await fetch(`http://${backendIp}:8080/api/game/start/${room.roomCode}`, { method: 'POST' });
      if (response.ok) setRoom(await response.json());
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setStarting(false); }
  };

  const replayGame = async () => {
    try {
      const response = await fetch(`http://${backendIp}:8080/api/game/replay/${room.roomCode}?requesterId=${playerId}`, { method: 'POST' });
      if (response.ok) setRoom(await response.json());
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const closeRoom = async () => {
    try {
      await fetch(`http://${backendIp}:8080/api/game/close/${room.roomCode}?requesterId=${playerId}`, { method: 'POST' });
      useGameStore.getState().setRoom(null);
    } catch (e) { Alert.alert('Erro', e.message); }
  };

  const handleBet = async () => {
    if (amount > me.balance) {
      Alert.alert("Saldo Insuficiente", `Seu saldo é R$ ${me.balance}.`);
      return;
    }
    try {
      const payload = { playerId, roomCode: room.roomCode, choice: betChoice, luckyNumber, amount };
      const res = await fetch(`http://${backendIp}:8080/api/game/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        sendAction('bet', payload);
        triggerHaptic('MEDIUM');
        playSound('CLICK');
      } else { Alert.alert("Erro", "Confira seu saldo."); }
    } catch (e) { Alert.alert("Erro", "Conexão perdida."); }
  };

  const leaveRoom = async () => {
    try { await fetch(`http://${backendIp}:8080/api/game/leave/${room.roomCode}/${playerName}`, { method: 'POST' }); } catch (e) { }
    useGameStore.getState().setRoom(null);
  };

  if (room.status === 'WAITING_PLAYERS') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.lobbyContent}>
          <Image source={TIGER_HAPPY} style={styles.lobbyMascotImg} resizeMode="contain" />
          <Text style={styles.lobbyTitle}>AGUARDANDO...</Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>CÓDIGO DA SALA</Text>
            <Text style={styles.codeValue}>{room.roomCode}</Text>
            {room.lastDiceResult > 0 && (
              <View style={styles.lastResultBadge}>
                <MaterialCommunityIcons name="dice-5" size={16} color="#ffd700" />
                <Text style={styles.lastResultText}>ÚLTIMA PARTIDA: {room.lastDiceResult}</Text>
              </View>
            )}
          </View>
          <View style={styles.playerList}>
            {room.players.map((p, idx) => (
              <View key={idx} style={styles.playerRow}>
                <MaterialCommunityIcons name="account" size={20} color={p.isHost ? "#ff52a1" : "#fff"} />
                <Text style={styles.playerRowName}>{p.name}</Text>
              </View>
            ))}
          </View>
          {isHost ? (
            <TouchableOpacity style={styles.startBtn} onPress={startGame} disabled={starting}>
              {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.startBtnText}>COMEÇAR PARTIDA</Text>}
            </TouchableOpacity>
          ) : (
            <Text style={styles.waitingText}>AGUARDANDO HOST...</Text>
          )}
        </MotiView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <EffectOverlay type={activeEffect} onFinish={() => setActiveEffect(null)} />
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 100 }}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>SALA {room.roomCode}</Text>
          <TouchableOpacity onPress={leaveRoom} style={styles.exitBtn}><MaterialCommunityIcons name="logout" size={20} color="#fff" /></TouchableOpacity>
        </View>

        <MotiView
          from={{ translateY: -20, opacity: 0 }}
          animate={{
            translateY: isMyTurn ? [0, -10, 0] : 0,
            opacity: 1
          }}
          transition={{
            translateY: isMyTurn ? { type: 'timing', duration: 1500, loop: true } : { type: 'timing' }
          }}
          style={styles.mascotBanner}
        >
          <Image
            source={isFinished ? (room.bankBalance <= 0 ? TIGER_HAPPY : TIGER_CRYING) : (isMyTurn ? TIGER_POINTING : TIGER_HAPPY)}
            style={styles.mascotBadgeImg}
            resizeMode="contain"
          />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>
              {isFinished ? (room.bankBalance <= 0 ? "A BANCA QUEBROU!" : "GAME OVER...") : (isMyTurn ? "SUA VEZ MÃO DE VACA! JOGA AÍ!" : `${currentPlayer?.name.toUpperCase()} PENSANDO...`)}
            </Text>
          </View>
        </MotiView>

        <MotiView from={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={styles.bankCard}>
          <Text style={styles.bankTitle}>BANCA DO TIGRÃO</Text>
          <Text style={styles.bankVal}>R$ {Math.max(0, room.bankBalance)}</Text>
          {room.lastDiceResult > 0 && (
            <View style={styles.bankLastResultBadge}>
              <MaterialCommunityIcons name="dice-multiple" size={14} color="#ffd700" />
              <Text style={styles.bankLastResultText}>ÚLTIMO: {room.lastDiceResult}</Text>
            </View>
          )}
        </MotiView>

        {/* DADO CENTRALIZADO E VISÍVEL */}
        {lastEvent?.type === 'DICE_ROLLED' && (
          <View style={styles.diceSection}>
            <DiceRoll visible={diceVisible} number={lastEvent.diceResult} />
            <Text style={styles.rollingText}>{showResultMsg ? lastEvent.message : "SORTEANDO..."}</Text>
          </View>
        )}

        {isFinished && (
          <MotiView 
            from={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            style={[styles.finishedCard, { borderColor: room.bankBalance <= 0 ? '#ffd700' : '#888' }]}
          >
             {room.bankBalance <= 0 ? (
               <MaterialCommunityIcons name="trophy" size={48} color="#ffd700" />
             ) : (
               <MaterialCommunityIcons name="emoticon-cry-outline" size={48} color="#888" />
             )}
             <Text style={[styles.finishedTitle, { color: room.bankBalance <= 0 ? '#ffd700' : '#888' }]}>
               {room.bankBalance <= 0 ? "VITÓRIA DA MESA!" : "O TIGRÃO LEVOU TUDO"}
             </Text>
             <Text style={styles.finishedMsg}>{room.lastMessage}</Text>

            {isHost ? (
              <View style={styles.finishedActions}>
                <TouchableOpacity style={[styles.btnAction, styles.replayBtn]} onPress={replayGame}><Text style={styles.btnActionText}>NOVA RODADA</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, styles.closeBtn]} onPress={closeRoom}><Text style={styles.btnActionText}>FECHAR SALA</Text></TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={[styles.btnAction, styles.closeBtn]} onPress={() => useGameStore.getState().setRoom(null)}><Text style={styles.btnActionText}>SAIR DA SALA</Text></TouchableOpacity>
            )}
          </MotiView>
        )}

        <View style={styles.participantsContainer}>
          {room.players.map((p, idx) => (
            <View key={p.id} style={[styles.playerCard, p.id === currentPlayer?.id ? styles.activePlayerCard : null]}>
              <View style={styles.playerInfo}><Text style={[styles.playerName, p.isBankrupt && { textDecorationLine: 'line-through' }]}>{p.name}</Text></View>
              <Text style={styles.playerBalance}>R$ {p.balance}</Text>
            </View>
          ))}
        </View>

        {isMyTurn && !lastEvent && (
          <MotiView from={{ translateY: 50, opacity: 0 }} animate={{ translateY: 0, opacity: 1 }} style={styles.betCard}>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceBtn, betChoice === 'LOW' && styles.selectedChoice]}
                onPress={() => { setBetChoice('LOW'); playSound('CLICK'); triggerHaptic('LIGHT'); }}
              >
                <Text style={styles.choiceBtnText}>BAIXO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceBtn, betChoice === 'HIGH' && styles.selectedChoice]}
                onPress={() => { setBetChoice('HIGH'); playSound('CLICK'); triggerHaptic('LIGHT'); }}
              >
                <Text style={styles.choiceBtnText}>ALTO</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.numGrid}>
              {[1, 2, 3, 4, 5, 6].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.numBtn, luckyNumber === n && styles.selectedNum]}
                  onPress={() => { setLuckyNumber(n); playSound('CLICK'); triggerHaptic('LIGHT'); }}
                >
                  <Text style={styles.numText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.amountRow}>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={() => { setAmount(Math.max(10, amount - 10)); playSound('CLICK'); triggerHaptic('LIGHT'); }}
              >
                <MaterialCommunityIcons name="minus" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.amountText}>R$ {amount}</Text>
              <TouchableOpacity
                style={styles.roundBtn}
                onPress={() => { setAmount(Math.min(me.balance, amount + 10)); playSound('CLICK'); triggerHaptic('LIGHT'); }}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.allInBtn} onPress={() => { setAmount(me.balance); playSound('CLICK'); }}>
              <Text style={styles.allInText}>APOSTAR TUDO (R$ {me.balance})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmBetBtn} onPress={handleBet}><Text style={styles.confirmBetText}>APOSTAR AGORA!</Text></TouchableOpacity>
          </MotiView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a0624', paddingTop: STATUS_BAR_HEIGHT },
  loading: { flex: 1, backgroundColor: '#1a0624', justifyContent: 'center', alignItems: 'center' },
  lobbyContent: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' },
  lobbyMascotImg: { width: 180, height: 180, marginBottom: 10 },
  lobbyTitle: { color: '#ffb7e6', fontSize: 24, fontWeight: 'bold' },
  codeContainer: { backgroundColor: '#2e0c3a', padding: 20, borderRadius: 20, width: '100%', alignItems: 'center', marginVertical: 30, borderWidth: 1, borderColor: '#ff52a1' },
  codeLabel: { color: '#ffb7e6', fontSize: 10, letterSpacing: 2 },
  codeValue: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  playerList: { width: '100%', marginBottom: 30 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 15, marginBottom: 10 },
  playerRowName: { color: '#fff', fontSize: 16, marginLeft: 15, flex: 1 },
  startBtn: { backgroundColor: '#ff52a1', width: '100%', padding: 20, borderRadius: 20, alignItems: 'center' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  waitingText: { color: '#ffb7e6', fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', width: '90%', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 10, alignSelf: 'center' },
  header: { fontSize: 18, color: '#ffb7e6', fontWeight: 'bold' },
  exitBtn: { padding: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 10 },
  mascotBanner: { flexDirection: 'row', alignItems: 'center', width: '90%', marginBottom: 15, alignSelf: 'center' },
  mascotBadgeImg: { width: 70, height: 70, marginRight: 5 },
  bubble: { backgroundColor: '#ff52a1', padding: 12, borderRadius: 20, flex: 1, borderBottomLeftRadius: 0 },
  bubbleText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  bankCard: { width: '90%', padding: 20, backgroundColor: '#ff52a1', borderRadius: 25, alignItems: 'center', marginBottom: 20, alignSelf: 'center' },
  bankTitle: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  bankVal: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  bankLastResultBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(0, 0, 0, 0.2)', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  bankLastResultText: { color: '#ffd700', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  lastResultBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  lastResultText: { color: '#ffd700', fontSize: 10, fontWeight: 'bold', marginLeft: 8 },
  diceSection: { width: '90%', alignItems: 'center', marginVertical: 20 },
  rollingText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginTop: 15 },
  participantsContainer: { width: '90%', marginVertical: 10, alignSelf: 'center' },
  playerCard: { flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  activePlayerCard: { backgroundColor: 'rgba(255, 82, 161, 0.2)', borderColor: '#ff52a1', borderWidth: 1 },
  playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  playerName: { color: '#fff', fontSize: 14, fontWeight: '500' },
  playerBalance: { color: '#ff52a1', fontWeight: 'bold', fontSize: 14 },
  betCard: { width: '90%', backgroundColor: '#2e0c3a', padding: 25, borderRadius: 30, marginTop: 10, borderWidth: 2, borderColor: '#ff52a1', alignSelf: 'center' },
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  choiceBtn: { flex: 0.48, padding: 15, borderRadius: 15, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center' },
  selectedChoice: { backgroundColor: '#ff52a1' },
  choiceBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  numGrid: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  numBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 4 },
  selectedNum: { backgroundColor: '#ff52a1' },
  numText: { color: '#fff', fontWeight: 'bold' },
  amountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ff52a1', justifyContent: 'center', alignItems: 'center' },
  amountText: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginHorizontal: 30 },
  allInBtn: { alignSelf: 'center', marginTop: 15, paddingHorizontal: 20, paddingVertical: 8, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  allInText: { color: '#ffb7e6', fontSize: 12, fontWeight: 'bold' },
  confirmBetBtn: { width: '100%', backgroundColor: '#ff52a1', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 20 },
  confirmBetText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  finishedCard: { width: '90%', backgroundColor: 'rgba(46, 12, 58, 0.98)', padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 3, borderColor: '#ffd700', marginTop: 10, alignSelf: 'center' },
  finishedTitle: { color: '#ffd700', fontSize: 24, fontWeight: '900', marginTop: 10 },
  finishedMsg: { color: '#fff', fontSize: 16, textAlign: 'center', marginVertical: 20, fontWeight: 'bold' },
  finishedActions: { width: '100%', flexDirection: 'column' },
  btnAction: { width: '100%', padding: 18, borderRadius: 20, alignItems: 'center', marginBottom: 10 },
  replayBtn: { backgroundColor: '#ffd700' },
  closeBtn: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: '#fff' },
  btnActionText: { fontWeight: '900', fontSize: 16, color: '#1a0624' }
});

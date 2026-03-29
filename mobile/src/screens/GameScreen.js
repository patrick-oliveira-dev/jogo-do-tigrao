import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { sendAction } from '../services/socket';
import DiceRoll from '../components/DiceRoll';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { playSound } from '../services/SoundService';
import EffectOverlay from '../components/EffectOverlay';

export default function GameScreen() {
  const { room, playerId, backendIp, setRoom, lastEvent, playerName } = useGameStore();
  const [betChoice, setBetChoice] = useState('HIGH');
  const [luckyNumber, setLuckyNumber] = useState(1);
  const [amount, setAmount] = useState(10);
  const [diceVisible, setDiceVisible] = useState(false);
  const [showResultMsg, setShowResultMsg] = useState(false);
  const [activeEffect, setActiveEffect] = useState(null); // 'WIN' ou 'LOSS'
  const isRolling = React.useRef(false); // Trava para não atualizar saldo antes do tempo

  const lastTurn = useRef(room?.turnCounter || 0);
  const nextRoomData = useRef(null); // Para o atraso na sincronia de saldo

  // Limpa eventos antigos ao entrar/sair
  useEffect(() => {
    useGameStore.getState().setLastEvent(null);
    return () => useGameStore.getState().setLastEvent(null);
  }, []);

  // Poller de Resiliência: Puxa o estado atual da sala a cada 2 segundos se falhar WS.
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`http://${backendIp}:8080/api/game/room/${room?.roomCode}?t=${Date.now()}`);
        if(response.ok) {
           const updatedRoom = await response.json();
           
           // Auto-cura do PlayerID se por acaso o estado sumir
           if (!playerId) {
              const findMe = updatedRoom.players.find(p => p.name?.trim().toLowerCase() === playerName?.trim().toLowerCase());
              if (findMe) useGameStore.getState().setPlayerId(findMe.id);
           }

            if (updatedRoom.turnCounter && updatedRoom.turnCounter > lastTurn.current) {
               lastTurn.current = updatedRoom.turnCounter;
               nextRoomData.current = updatedRoom;
               isRolling.current = true;
               
               // Engatilha animação do dado e mensagem do vencedor via poller!
               useGameStore.getState().setLastEvent({
                   type: 'DICE_ROLLED',
                   diceResult: updatedRoom.lastDiceResult,
                   message: updatedRoom.lastMessage
               });
               
               playSound('DICE');
            } else if (!isRolling.current) {
               // Se não houve turno novo E não está rolando dado, atualiza normal
               setRoom(updatedRoom);
            }
        } else if (response.status === 404) {
           Alert.alert("Sala Encerrada", "O criador da sala fechou a mesa.");
           leaveRoom();
        }
      } catch(e) {}
    };
    
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [room?.roomCode, backendIp]);

  // Exibe animação do dado se for o evento
  useEffect(() => {
    if (lastEvent?.type === 'DICE_ROLLED') {
      setDiceVisible(false);
      setShowResultMsg(false);
      
      setTimeout(() => setDiceVisible(true), 100);
      playSound('DICE');
      
      // O dado demora 900ms na física. Revelamos a mensagem e atualizamos SALDO logo depois!
      setTimeout(() => {
          setShowResultMsg(true);
          if (nextRoomData.current) {
              // Verifica se eu ganhei ou perdi para soltar o efeito visual
              const oldMe = room.players.find(p => p.id === playerId);
              const newMe = nextRoomData.current.players.find(p => p.id === playerId);
              
              if (newMe && oldMe) {
                 console.log(`[AudioCheck] Balanço: ${oldMe.balance} -> ${newMe.balance}`);
                 if (newMe.balance > oldMe.balance) {
                     setActiveEffect('WIN');
                     playSound('WIN');
                 } else if (newMe.balance < oldMe.balance) {
                     setActiveEffect('LOSS');
                     playSound('LOSS');
                 }
              }
              
              setRoom(nextRoomData.current);
              nextRoomData.current = null;
              isRolling.current = false;
              
              // Aguarda mais 4 segundos para o jogador ver o resultado antes de limpar
              setTimeout(() => {
                 useGameStore.getState().setLastEvent(null);
              }, 4000);
          }
      }, 1200);

    } else if(lastEvent?.type === 'GAME_OVER') {
      // Alert.alert('Fim de Jogo', lastEvent.message); // Substituído pela Tela Final
    }
  }, [lastEvent]);

  if (!room) return <Text style={{color: 'white'}}>Carregando...</Text>;

  let currentPlayer = room?.players ? room.players[room.currentPlayerIndex] : null;
  let me = room?.players?.find(p => p.id === playerId || p.name?.toLowerCase() === playerName?.toLowerCase());
  
  let isMyTurn = false;
  if(room?.status === 'IN_PROGRESS') {
      if(currentPlayer?.id === playerId || currentPlayer?.name?.trim().toLowerCase() === playerName?.trim().toLowerCase()) {
          isMyTurn = true;
      }
  }

  const startGame = async () => {
    try {
      const response = await fetch(`http://${backendIp}:8080/api/game/start/${room.roomCode}`, { method: 'POST' });
      if(response.ok) {
        const updatedRoom = await response.json();
        useGameStore.getState().setRoom(updatedRoom);
      }
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  };

  const handleBet = async () => {
    try {
      const payload = {
        playerId,
        roomCode: room.roomCode,
        choice: betChoice,
        luckyNumber,
        amount
      };
      
      const res = await fetch(`http://${backendIp}:8080/api/game/bet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      
      if(!res.ok) {
          const errorMsg = await res.text();
          Alert.alert("Erro na Aposta", errorMsg || "Erro desconhecido no servidor.");
          return;
      }
      
      sendAction('bet', payload);
    } catch(e) {
        Alert.alert("Erro de Conexão", "Não foi possível falar com o servidor.");
    }
  };

  const changeAmount = (delta) => {
    if (!me) return;
    const maxVal = Math.floor(me.balance / 10) * 10;
    setAmount(prev => {
        let val = prev + delta;
        if (val < 10) return 10;
        if (val > maxVal) return maxVal || 10;
        return val;
    });
  };

  const handleLoan = async () => {
    const loanAmount = 10;
    const lender = room.players.find(p => p.id !== playerId && p.balance >= loanAmount * 2);
    if (!lender) {
      Alert.alert("Aviso", "Ninguém da mesa tem dinheiro suficiente para emprestar 10.");
      return;
    }
    const payload = { requesterId: playerId, lenderId: lender.id, amount: loanAmount, roomCode: room.roomCode };
    try {
      await fetch(`http://${backendIp}:8080/api/game/loan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      sendAction('loan', payload);
    } catch(e) {}
  };

  const handleLoanResponse = async (accepted) => {
    try {
      await fetch(`http://${backendIp}:8080/api/game/loan/respond?roomCode=${room.roomCode}&accepted=${accepted}`, {
        method: 'POST'
      });
    } catch(e) {}
  };

  const leaveRoom = async () => {
    try {
      await fetch(`http://${backendIp}:8080/api/game/leave/${room.roomCode}/${playerName}`, { method: 'POST' });
    } catch(e) {}
    useGameStore.getState().setRoom(null);
  };

  const handleReplay = async () => {
     try {
        const response = await fetch(`http://${backendIp}:8080/api/game/replay/${room.roomCode}?requesterId=${playerId}`, { method: 'POST' });
        if(response.ok) {
           const newRoom = await response.json();
           setRoom(newRoom);
        } else {
           const err = await response.text();
           Alert.alert("Erro na Revanche", err);
        }
     } catch(e) {
        Alert.alert("Erro de Conexão", "Servidor fora do ar?");
     }
  };

  const handleCloseRoom = async () => {
     try {
        const url = `http://${backendIp}:8080/api/game/close/${room.roomCode}?requesterId=${playerId}`;
        const response = await fetch(url, { method: 'POST' });
        if(response.ok) { 
           leaveRoom(); 
        } else {
           const errorMsg = await response.text();
           Alert.alert("Erro ao Fechar Sala", errorMsg || "Erro desconhecido.");
        }
     } catch(e) {
        Alert.alert("Erro de Conexão", "Não foi possível falar com o servidor ao fechar a sala.");
     }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{alignItems: 'center', paddingBottom: 80}}>
      <EffectOverlay type={activeEffect} onFinish={() => setActiveEffect(null)} />
      <View style={{flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10}}>
        <Text style={styles.header}>Sala {room.roomCode}</Text>
        <TouchableOpacity onPress={leaveRoom} style={{padding: 10, backgroundColor: '#5c2d91', borderRadius: 12}}>
           <MaterialCommunityIcons name="exit-to-app" size={24} color="#ffb7e6" />
        </TouchableOpacity>
      </View>
      
      {room.status === 'WAITING_PLAYERS' && (
        <View style={styles.waitingContainer}>
          <Text style={{color: '#fff', fontSize: 18, marginBottom: 10}}>Aguardando jogadores...</Text>
          <TouchableOpacity style={styles.btnAction} onPress={startGame}>
             <Text style={styles.btnActionText}>INICIAR PARTIDA</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* TELA DE JOGO */}
      {room.status === 'IN_PROGRESS' || room.status === 'FINISHED' ? (
        <View style={{width: '100%', alignItems: 'center'}}>
          <View style={styles.bankCard}>
            <Text style={styles.bankTitle}>BANCA DO TIGRÃO</Text>
            <Text style={styles.bankVal}>R$ {room.bankBalance}</Text>
          </View>

          <View style={{alignItems: 'center', marginVertical: 10}}>
            <Text style={{color: '#ffb7e6', fontSize: 16}}>
              Vez de: <Text style={{fontWeight: 'bold', color: '#ff52a1'}}>{currentPlayer?.name}</Text>
            </Text>
            {room.lastDiceResult > 0 && (
               <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 5}}>
                  <MaterialCommunityIcons name="dice-5" size={18} color="#ffb7e6" />
                  <Text style={{color: '#ffb7e6', marginLeft: 5, fontSize: 14}}>
                    Último sorteado: <Text style={{fontWeight: 'bold', color: '#fff'}}>{room.lastDiceResult}</Text>
                  </Text>
               </View>
            )}
          </View>

          {lastEvent?.type === 'DICE_ROLLED' && (
            <View style={{alignItems: 'center', marginVertical: 15, padding: 15, backgroundColor: '#4a148c', borderRadius: 16, width: '100%', borderWidth: 2, borderColor: '#ff52a1'}}>
              <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15}}>
                 {showResultMsg ? lastEvent.message : "Sorteando..."}
              </Text>
              <DiceRoll visible={diceVisible} number={lastEvent.diceResult} />
            </View>
          )}

          {/* PAINEL DE EMPRÉSTIMO COM CONSENTIMENTO */}
          {room.pendingLoanLenderId === playerId && (
            <View style={{width: '100%', backgroundColor: '#4a148c', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 2, borderColor: '#ff52a1'}}>
              <Text style={{color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 15}}>
                {room.players.find(p => p.id === room.pendingLoanRequesterId)?.name} pediu R$ {room.pendingLoanAmount} emprestado. Você ajuda?
              </Text>
              <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#10b981', flex: 0.48}]} onPress={() => handleLoanResponse(true)}>
                  <Text style={styles.btnActionText}>ACEITAR 👍</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#ef4444', flex: 0.48}]} onPress={() => handleLoanResponse(false)}>
                  <Text style={styles.btnActionText}>RECUSAR 👎</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {room.pendingLoanRequesterId === playerId && (
            <View style={{width: '100%', backgroundColor: '#5c2d91', padding: 15, borderRadius: 16, marginBottom: 20, alignItems: 'center'}}>
               <ActivityIndicator size="small" color="#ff52a1" />
               <Text style={{color: '#fff', marginTop: 10}}>Aguardando resposta do amigo...</Text>
            </View>
          )}

          {/* STATUS DOS PLAYERS */}
          <View style={{width: '100%', marginVertical: 10}}>
            {room.players.map(p => (
              <View key={p.id} style={[styles.playerRow, p.id === currentPlayer?.id ? styles.activeRow : null]}>
                <Text style={{color: p.isBankrupt ? '#ef4444' : '#ffb7e6', flex: 1}}>{p.name} {p.id === playerId ? '(Você)' : ''}</Text>
                <Text style={{color: p.isBankrupt ? '#ef4444' : '#ff52a1', fontWeight: 'bold'}}>R$ {p.balance}</Text>
              </View>
            ))}
          </View>

          {/* CONTROLES DA APOSTA SE FOR MINHA VEZ E JOGO ROLANDO */}
          {isMyTurn && (
            <View style={styles.betCard}>
              <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 18, marginBottom: 15}}>SUA VEZ DE APOSTAR</Text>
              
              <View style={styles.choiceRow}>
                 <TouchableOpacity style={[styles.choiceBtn, betChoice === 'LOW' && styles.selectedChoice]} onPress={() => setBetChoice('LOW')}>
                    <Text style={{color: '#fff'}}>BAIXO (1-3)</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={[styles.choiceBtn, betChoice === 'HIGH' && styles.selectedChoice]} onPress={() => setBetChoice('HIGH')}>
                    <Text style={{color: '#fff'}}>ALTO (4-6)</Text>
                 </TouchableOpacity>
              </View>
              
              <Text style={styles.label}>Nº da Sorte: {luckyNumber}</Text>
              <View style={{flexDirection: 'row', justifyContent: 'center'}}>
                 {[1,2,3,4,5,6].map(n => (
                   <TouchableOpacity key={n} style={[styles.numWrap, luckyNumber===n && styles.selNum]} onPress={() => { setLuckyNumber(n); playSound('CLICK'); }}>
                    <Text style={{color: '#fff'}}>{n}</Text>
                  </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.label}>Valor da Aposta</Text>
            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center'}}>
                <TouchableOpacity style={styles.amtBtn} onPress={() => { changeAmount(-10); playSound('CLICK'); }}>
                  <Text style={{color: '#fff', fontSize: 24, fontWeight: 'bold'}}>-</Text>
                </TouchableOpacity>

                <Text style={{color: '#ffb7e6', fontSize: 28, fontWeight: 'bold', marginHorizontal: 20}}>R$ {amount}</Text>

                <TouchableOpacity style={styles.amtBtn} onPress={() => { changeAmount(10); playSound('CLICK'); }}>
                  <Text style={{color: '#fff', fontSize: 24, fontWeight: 'bold'}}>+</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.amtBtn, {backgroundColor: '#9b59b6', marginLeft: 15, width: 'auto', paddingHorizontal: 15}]} onPress={() => { if(me) { setAmount(Math.floor(me.balance/10)*10 || 10); playSound('CLICK'); }}}>
                  <Text style={{color: '#fff', fontWeight: 'bold'}}>MÁX</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.betBtn} onPress={() => { handleBet(); playSound('CLICK'); }}>
                 <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 16}}>APOSTAR!</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isMyTurn && room.status === 'IN_PROGRESS' && (
             <Text style={{color: '#888', marginTop: 20}}>Aguarde sua vez...</Text>
          )}

          {room.status === 'FINISHED' && (
              <View style={{width: '100%', backgroundColor: '#ff52a1', padding: 25, borderRadius: 20, marginTop: 20, alignItems: 'center', elevation: 10}}>
                 <MaterialCommunityIcons name="crown" size={60} color="#fff" style={{marginBottom: 10}} />
                 <Text style={{color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 10}}>FIM DE JOGO!</Text>
                 <Text style={{color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 20}}>
                    {room.lastMessage}
                 </Text>
                 
                 {me?.isHost ? (
                    <>
                       <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#10b981', width: '100%', marginBottom: 15}]} onPress={handleReplay}>
                          <Text style={[styles.btnActionText, {textAlign: 'center'}]}>JOGAR NOVAMENTE 🔄</Text>
                       </TouchableOpacity>
                       <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#ef4444', width: '100%'}]} onPress={handleCloseRoom}>
                          <Text style={[styles.btnActionText, {textAlign: 'center'}]}>FECHAR SALA 🚪</Text>
                       </TouchableOpacity>
                    </>
                 ) : (
                    <TouchableOpacity style={[styles.btnAction, {backgroundColor: '#5c2d91', width: '100%'}]} onPress={leaveRoom}>
                       <Text style={[styles.btnActionText, {textAlign: 'center'}]}>BOA PARTIDA! VOLTAR AO INÍCIO</Text>
                    </TouchableOpacity>
                 )}
              </View>
          )}

          {me?.balance <= 10 && room.status === 'IN_PROGRESS' && !me?.isBankrupt && (
              <TouchableOpacity style={styles.loanBtn} onPress={handleLoan}>
                <Text style={{color: '#fff', fontWeight: 'bold'}}>PEDIR EMPRÉSTIMO (R$ 10)</Text>
              </TouchableOpacity>
          )}
        </View>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2e0c3a', padding: 20 },
  header: { fontSize: 24, color: '#ffb7e6', fontWeight: 'bold' },
  waitingContainer: {
    padding: 20, alignItems: 'center', backgroundColor: '#5c2d91', borderRadius: 16, marginTop: 20
  },
  btnAction: { backgroundColor: '#ff52a1', padding: 15, borderRadius: 16 },
  btnActionText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  bankCard: { width: '100%', padding: 20, backgroundColor: '#ff52a1', borderRadius: 20, alignItems: 'center', marginBottom: 20, elevation: 8 },
  bankTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  bankVal: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  playerRow: { flexDirection: 'row', width: '100%', padding: 15, borderBottomWidth: 1, borderColor: '#5c2d91' },
  activeRow: { backgroundColor: '#4a148c', borderRadius: 12, borderColor: 'transparent' },
  betCard: { width: '100%', backgroundColor: '#5c2d91', padding: 20, borderRadius: 20, marginTop: 10, elevation: 5 },
  choiceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  choiceBtn: { flex: 0.48, padding: 15, borderRadius: 12, backgroundColor: '#3e0f5e', alignItems: 'center' },
  selectedChoice: { backgroundColor: '#ff52a1', borderColor: '#ffb7e6', borderWidth: 2 },
  label: { color: '#ffb7e6', marginVertical: 10, alignSelf: 'center', fontWeight: 'bold' },
  numWrap: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#3e0f5e', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
  selNum: { backgroundColor: '#ff52a1' },
  amtBtn: { height: 45, width: 45, borderRadius: 12, backgroundColor: '#3e0f5e', justifyContent: 'center', alignItems: 'center' },
  selAmount: { backgroundColor: '#ff52a1' },
  betBtn: { width: '100%', backgroundColor: '#ff52a1', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 20 },
  loanBtn: { width: '100%', backgroundColor: '#9b59b6', padding: 15, borderRadius: 16, alignItems: 'center', marginTop: 20 }
});

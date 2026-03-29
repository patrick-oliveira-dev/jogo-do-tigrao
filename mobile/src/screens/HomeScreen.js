import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { connectWebSocket } from '../services/socket';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { playSound } from '../services/SoundService';
import { MotiView, AnimatePresence } from 'moti';

export default function HomeScreen() {
  const { setPlayerName, setBackendIp, setRoom, setPlayerId, setLastEvent } = useGameStore();

  const [name, setName] = useState('');
  const [ip, setIp] = useState('192.168.3.38');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PLAY'); // PLAY, LOBBY, RANKING
  const [openRooms, setOpenRooms] = useState([]);
  const [ranking, setRanking] = useState({ winners: [], gold: [] });

  // Busca dados dinâmicos ao trocar de aba
  React.useEffect(() => {
    if (activeTab === 'LOBBY') fetchRooms();
    if (activeTab === 'RANKING') fetchRanking();
  }, [activeTab, ip]);

  const fetchRooms = async () => {
    try {
      const res = await fetch(`http://${ip}:8080/api/game/rooms`);
      if (res.ok) setOpenRooms(await res.json());
    } catch (e) {}
  };

  const fetchRanking = async () => {
    try {
      const res = await fetch(`http://${ip}:8080/api/game/ranking`);
      if (res.ok) {
        const data = await res.json();
        setRanking(data);
      }
    } catch (e) {}
  };

  const startGameConnection = async (isCreate) => {
    if (!name || !ip || !roomCode) {
      Alert.alert('Erro', 'Preencha todos os campos!');
      return;
    }
    setLoading(true);

    const url = `http://${ip}:8080/api/game/${isCreate ? 'create' : 'join'}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name, roomCode: roomCode })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const roomData = await response.json();
      
      const me = roomData.players.find(p => p.name?.trim().toLowerCase() === name.trim().toLowerCase());
      if(me) setPlayerId(me.id);
      
      setPlayerName(name);
      setBackendIp(ip);
      setRoom(roomData);

      connectWebSocket(ip, roomCode, (event) => {
          setLastEvent(event);
          if (event.room) {
              setRoom(event.room); 
          }
      });
      
    } catch (e) {
      Alert.alert('Falha', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Mascote com Animação Flutuante */}
        <MotiView
          from={{ translateY: 0, opacity: 0, scale: 0.5 }}
          animate={{ translateY: -15, opacity: 1, scale: 1.1 }}
          transition={{
            type: 'timing',
            duration: 1200,
            translateY: {
              type: 'timing',
              duration: 2500,
              loop: true,
              repeatReverse: true,
            },
          }}
          style={styles.logoContainer}
        >
          <Image source={require('../../assets/tiger_biceps-removebg-preview.png')} style={styles.logo} resizeMode="contain" />
        </MotiView>

        <MotiView
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 300 }}
        >
          <Text style={styles.title}>Jogo do Tigrão</Text>
        </MotiView>
        
        <MotiView 
          style={styles.tabBar}
          from={{ translateY: 50, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{ delay: 500 }}
        >
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'PLAY' && styles.activeTab]} onPress={() => { setActiveTab('PLAY'); playSound('CLICK'); }}>
            <MaterialCommunityIcons name="controller-classic" size={24} color={activeTab === 'PLAY' ? '#fff' : '#ffb7e6'} />
            <Text style={[styles.tabText, activeTab === 'PLAY' && styles.activeTabText]}>JOGAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'LOBBY' && styles.activeTab]} onPress={() => { setActiveTab('LOBBY'); playSound('CLICK'); }}>
            <MaterialCommunityIcons name="account-group" size={24} color={activeTab === 'LOBBY' ? '#fff' : '#ffb7e6'} />
            <Text style={[styles.tabText, activeTab === 'LOBBY' && styles.activeTabText]}>LOBBY</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBtn, activeTab === 'RANKING' && styles.activeTab]} onPress={() => { setActiveTab('RANKING'); playSound('CLICK'); }}>
            <MaterialCommunityIcons name="trophy" size={24} color={activeTab === 'RANKING' ? '#fff' : '#ffb7e6'} />
            <Text style={[styles.tabText, activeTab === 'RANKING' && styles.activeTabText]}>RANKING</Text>
          </TouchableOpacity>
        </MotiView>

        <AnimatePresence exitBeforeEnter>
          {activeTab === 'PLAY' && (
            <MotiView 
              key="play-card"
              from={{ opacity: 0, scale: 0.9, translateX: -20 }}
              animate={{ opacity: 1, scale: 1, translateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, translateX: 20 }}
              style={styles.card}
            >
              <TextInput
                style={styles.input}
                placeholder="Seu Nome"
                placeholderTextColor="#888"
                value={name}
                onChangeText={setName}
              />
              <TextInput
                style={styles.input}
                placeholder="Código da Sala (Ex: 1234)"
                placeholderTextColor="#888"
                value={roomCode}
                onChangeText={setRoomCode}
              />
              <TextInput
                style={styles.input}
                placeholder="IP da Máquina (Backend)"
                placeholderTextColor="#888"
                value={ip}
                onChangeText={setIp}
                keyboardType="numeric"
              />

              {loading ? (
                <ActivityIndicator size="large" color="#ff52a1" style={{marginTop: 20}} />
              ) : (
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={[styles.btn, styles.joinBtn]} onPress={() => startGameConnection(false)}>
                    <Text style={styles.btnText}>ENTRAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.createBtn]} onPress={() => startGameConnection(true)}>
                    <Text style={styles.btnText}>CRIAR SALA</Text>
                  </TouchableOpacity>
                </View>
              )}
            </MotiView>
          )}

          {activeTab === 'LOBBY' && (
            <MotiView 
              key="lobby-card"
              from={{ opacity: 0, scale: 0.9, translateX: -20 }}
              animate={{ opacity: 1, scale: 1, translateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, translateX: 20 }}
              style={styles.card}
            >
              <Text style={styles.cardTitle}>Salas Ativas</Text>
              
              {openRooms.length === 0 ? (
                <Text style={{color: '#ffb7e6', textAlign: 'center', marginVertical: 20}}>Nenhuma sala no momento...</Text>
              ) : (
                openRooms.map((r, idx) => (
                  <MotiView 
                    key={r.roomCode}
                    from={{ opacity: 0, translateY: 10 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ delay: 100 * idx }}
                  >
                    <TouchableOpacity style={styles.roomItem} onPress={() => { setRoomCode(r.roomCode); setActiveTab('PLAY'); playSound('CLICK'); }}>
                      <View style={{flex: 1}}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                          <Text style={styles.roomCodeText}>Sala {r.roomCode}</Text>
                          <View style={[
                            styles.statusBadge, 
                            r.status === 'WAITING_PLAYERS' ? styles.badgeWaiting : 
                            r.status === 'IN_PROGRESS' ? styles.badgePlaying : styles.badgeFinished
                          ]}>
                            <Text style={styles.badgeText}>
                              {r.status === 'WAITING_PLAYERS' ? 'ESPERANDO' : 
                               r.status === 'IN_PROGRESS' ? 'JOGANDO' : 'FIM'}
                            </Text>
                          </View>
                          {r.lastDiceResult > 0 && (
                            <View style={styles.lobbyDiceBadge}>
                              <MaterialCommunityIcons name="dice-5" size={14} color="#ffd700" />
                              <Text style={styles.lobbyDiceText}>{r.lastDiceResult}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{color: '#ffb7e6', fontSize: 13}}>{r.players?.length || 0} Jogadores • Banca: R$ {r.bankBalance || '-'}</Text>
                      </View>
                      <MaterialCommunityIcons name="login-variant" size={24} color="#ff52a1" />
                    </TouchableOpacity>
                  </MotiView>
                ))
              )}
              <TouchableOpacity style={[styles.refreshBtn, {flexDirection: 'row'}]} onPress={() => { fetchRooms(); playSound('CLICK'); }}>
                 <MaterialCommunityIcons name="refresh" size={20} color="#fff" style={{marginRight: 8}} />
                 <Text style={{color: '#fff', fontWeight: 'bold'}}>ATUALIZAR LOBBY</Text>
              </TouchableOpacity>
            </MotiView>
          )}

          {activeTab === 'RANKING' && (
            <MotiView 
              key="ranking-card"
              from={{ opacity: 0, scale: 0.9, translateX: -20 }}
              animate={{ opacity: 1, scale: 1, translateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, translateX: 20 }}
              style={{width: '100%'}}
            >
              <View style={[styles.card, {marginBottom: 20}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15}}>
                  <MaterialCommunityIcons name="medal" size={28} color="#ffb7e6" style={{marginRight: 10}} />
                  <Text style={[styles.cardTitle, {marginBottom: 0}]}>Mais Vitoriosos</Text>
                </View>
                {ranking.winners?.length === 0 ? (
                  <Text style={{color: '#ffb7e6', textAlign: 'center', marginVertical: 10}}>Nenhuma vitória registrada ainda...</Text>
                ) : (
                  ranking.winners.map((res, idx) => (
                    <MotiView 
                      key={`win-${idx}`}
                      from={{ opacity: 0, translateX: -10 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ delay: 100 * idx }}
                      style={styles.rankItem}
                    >
                       <Text style={[styles.rankIdx, idx < 3 && styles.topRank]}>{idx + 1}º</Text>
                       <Text style={styles.rankName}>{res.name}</Text>
                       <Text style={styles.rankValue}>{res.score} Vit</Text>
                    </MotiView>
                  ))
                )}
              </View>

              <View style={styles.card}>
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15}}>
                  <MaterialCommunityIcons name="diamond-stone" size={28} color="#ffb7e6" style={{marginRight: 10}} />
                  <Text style={[styles.cardTitle, {marginBottom: 0}]}>Maiores Recordes</Text>
                </View>
                {ranking.gold?.length === 0 ? (
                  <Text style={{color: '#ffb7e6', textAlign: 'center', marginVertical: 10}}>Nenhum recorde de ouro...</Text>
                ) : (
                  ranking.gold.map((res, idx) => (
                    <MotiView 
                      key={`gold-${idx}`}
                      from={{ opacity: 0, translateX: -10 }}
                      animate={{ opacity: 1, translateX: 0 }}
                      transition={{ delay: 100 * idx }}
                      style={styles.rankItem}
                    >
                       <Text style={[styles.rankIdx, idx < 3 && styles.topRank]}>{idx + 1}º</Text>
                       <Text style={styles.rankName}>{res.name}</Text>
                       <Text style={styles.rankValue}>R$ {res.score}</Text>
                    </MotiView>
                  ))
                )}
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#2e0c3a',
  },
  scroll: {
    flexGrow: 1, alignItems: 'center', padding: 20, paddingTop: 40
  },
  logoContainer: {
    marginTop: 0, marginBottom: -20, alignItems: 'center'
  },
  logo: {
    width: 280, height: 280,
  },
  title: {
    fontSize: 34, fontWeight: '900', color: '#ffb7e6', marginBottom: 20, textAlign: 'center', textShadowColor: '#ff52a1', textShadowRadius: 10
  },
  tabBar: {
    flexDirection: 'row', width: '100%', marginBottom: 20, backgroundColor: '#3e0f5e', borderRadius: 20, padding: 5
  },
  tabBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 15
  },
  activeTab: {
    backgroundColor: '#ff52a1',
  },
  tabText: {
    color: '#ffb7e6', fontSize: 10, fontWeight: 'bold', marginTop: 3
  },
  activeTabText: {
    color: '#fff'
  },
  card: {
    width: '100%', backgroundColor: '#5c2d91', padding: 20, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 8,
  },
  cardTitle: {
    fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 20
  },
  input: {
    backgroundColor: '#3e0f5e', color: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, fontSize: 16, borderBottomWidth: 2, borderColor: '#9b59b6'
  },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 10,
  },
  btn: {
    flex: 1, padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3
  },
  joinBtn: {
    backgroundColor: '#ff52a1', marginRight: 10,
  },
  createBtn: {
    backgroundColor: '#9b59b6', marginLeft: 10,
  },
  btnText: {
    color: '#fff', fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase'
  },
  roomItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3e0f5e', padding: 15, borderRadius: 16, marginBottom: 10
  },
  roomCodeText: {
    fontSize: 18, fontWeight: 'bold', color: '#fff'
  },
  refreshBtn: {
    marginTop: 10, padding: 15, borderRadius: 12, backgroundColor: '#9b59b6', alignItems: 'center'
  },
  rankItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#3e0f5e', padding: 15, borderRadius: 16, marginBottom: 10
  },
  rankIdx: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#5c2d91', color: '#fff', textAlign: 'center', lineHeight: 40, fontWeight: 'bold', marginRight: 15
  },
  topRank: {
    backgroundColor: '#ff52a1'
  },
  rankName: {
    flex: 1, color: '#fff', fontSize: 18, fontWeight: 'bold'
  },
  rankValue: {
    color: '#ff52a1', fontSize: 18, fontWeight: '900'
  },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 10
  },
  badgeWaiting: {
    backgroundColor: '#3498db'
  },
  badgePlaying: {
    backgroundColor: '#f1c40f'
  },
  badgeFinished: {
    backgroundColor: '#2ecc71'
  },
  badgeText: {
    color: '#fff', fontSize: 10, fontWeight: '900'
  },
  lobbyDiceBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 215, 0, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 8
  },
  lobbyDiceText: {
    color: '#ffd700', fontSize: 10, fontWeight: 'bold', marginLeft: 4
  }
});

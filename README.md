# Tigrão Royale Multiplayer 🐯

Um jogo multiplayer local de apostas criado com Spring Boot (Backend) e React Native + Expo (Frontend).

## Requisitos
- **Java 17+**
- **Node.js 18+**
- **Maven** (Opcional, você pode usar os scripts na sua IDE)
- Celulares e Computador conectados na **MESMA REDE Wi-Fi**.

---

## 🚀 Como Iniciar o Servidor (Backend)

O backend do Spring Boot roda em `0.0.0.0` para ficar acessível na rede local, e conta com WebSocket STOMP.

1. Abra um terminal na pasta `backend`.
2. Rode no Linux/Mac: `./mvnw spring-boot:run` ou no Windows: `.\mvnw.cmd spring-boot:run`
   - *(Ou caso tenha Maven global instalado: `mvn spring-boot:run`)*
3. O servidor abrirá na porta **`8080`**.
4. **IMPORTANTE:** Descubra o IP local do seu computador rodando `ipconfig` (Windows) ou `ifconfig` (Mac/Linux). Guarde esse IP (ex: `192.168.1.5`).

---

## 📱 Como Iniciar o App Celular (Frontend)

O frontend foi desenvolvido em React Native focado na tela mobile.

1. Abra um terminal na pasta `mobile`.
2. Inicie o instalador via npm para baixar as deps se ainda não fez: `npm install`.
3. Rode `npx expo start`.
4. Um QR Code aparecerá no terminal ou navegador.
5. No seu celular Android/iOS, instale o aplicativo **Expo Go**.
6. Escaneie o QR Code na aba "Scan" do aplicativo (ou com a câmera no iOS).
7. Na tela inicial do app, digite:
   - Seu Nome.
   - Um Código de Sala (Para criar ou entrar numa mesma sala).
   - O **IP DA SUA MÁQUINA** (Descoberto no passo anterior do backend).

---

## 🎲 Regras do Jogo

- **A Banca:** A sala (Tigrão) é criada começando com `R$ 1000` multiplicados pela quantidade de jogadores.
- **Jogadores:** O saldo inicial é `R$ 50` por jogador. A aposta mínima é `R$ 10`.
- **A aposta:** 
   Você indica: (Alto = 4 a 6 | Baixo = 1 a 3), um Valor da Vizinhança e seu *Número da Sorte* (Qualquer de 1 a 6).
   Acontecerá uma ROLAGEM de `1 a 6`.
   - Se acertar o Lado e o Número da sorte: Você ganha o DOBRO 💰
   - Se acertar apenas o Lado: Ganha o valor normalmente.
   - Se Errar o lado, Tiver acertado o Número: Empate de proteção! O tigre te perdoa e você não perde a aposta.
   - Qualquer outro cenário: Você perde a aposta.
- **Empréstimos:** Só pode pedir ao parceiro quando estiver na corda-bamba (R$ 10 ou menos). Quem empresta deverá ter no minimo o dobro (R$ 20 para doar 10).
- **Vencedor Final:** O jogo termina apenas quando a banca Quebrar (os jogadores ganham!) ou os Jogadores Falirem (Tigrão Vence!).

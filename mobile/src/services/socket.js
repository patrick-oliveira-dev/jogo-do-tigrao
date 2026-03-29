import { Client } from '@stomp/stompjs';
// Polyfill manual para React Native
import { TextEncoder, TextDecoder } from 'text-encoding';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

let stompClient = null;

export const connectWebSocket = (ip, roomCode, onMessageReceived) => {
    if (stompClient) {
        stompClient.deactivate();
    }

    stompClient = new Client({
        // Se usar ws:// IP tem que ser exato. Se for emulador pode ser 10.0.2.2.
        brokerURL: `ws://${ip}:8080/ws-tigrao`,
        forceWebsockets: true,
        reconnectDelay: 2000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        onConnect: () => {
            console.log('--- Conectado ao WebSocket ---');
            stompClient.subscribe(`/topic/room/${roomCode}`, (message) => {
                if (message.body) {
                    try {
                        const event = JSON.parse(message.body);
                        onMessageReceived(event);
                    } catch (e) {
                        console.error("Erro no parse do WS:", e);
                    }
                }
            });
        },
        onStompError: (frame) => {
            console.error('STOMP erro: ' + frame.headers['message']);
            console.error('Detalhes: ' + frame.body);
        },
        onWebSocketError: (event) => {
            console.error("WebSocket Error:", event);
        }
    });

    stompClient.activate();
};

export const disconnectWebSocket = () => {
    if (stompClient) {
        stompClient.deactivate();
    }
};

export const sendAction = (action, payload) => {
    if (stompClient && stompClient.connected) {
        stompClient.publish({
            destination: `/app/game.action`,
            body: JSON.stringify({ action, ...payload })
        });
    } else {
        console.log('Info: WebSocket desconectado no momento. Utilizando modo HTTP Fallback.');
    }
};

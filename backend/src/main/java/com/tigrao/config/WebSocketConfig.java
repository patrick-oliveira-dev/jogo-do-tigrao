package com.tigrao.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita um broker em memória para o cliente se inscrever nos tópicos
        config.enableSimpleBroker("/topic");
        
        // Prefixo para as mensagens enviadas do cliente para o servidor (e.g., /app/rollDice)
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint que o cliente mobile vai se conectar. setAllowedOriginPatterns("*") permite acesso da rede LAN
        registry.addEndpoint("/ws-tigrao")
                .setAllowedOriginPatterns("*")
                .withSockJS();
        
        // Também expõe um endpoint puro STOMP sem SockJS para maior compatibilidade com alguns libs React Native
        registry.addEndpoint("/ws-tigrao")
                .setAllowedOriginPatterns("*");
    }
}

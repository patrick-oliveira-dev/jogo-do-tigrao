package com.tigrao.repository;

import com.tigrao.model.GameRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tigrao.model.GameStatus;
import java.util.List;

@Repository
public interface GameRoomRepository extends JpaRepository<GameRoom, String> {
    List<GameRoom> findByStatus(GameStatus status);
}

package com.tigrao.repository;

import com.tigrao.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import java.util.List;
import com.tigrao.dto.RankingDTO;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    
    @Query("SELECT new com.tigrao.dto.RankingDTO(p.name, CAST(COUNT(p.id) AS int)) " +
           "FROM Player p " +
           "WHERE (p.room.status = 'FINISHED' OR p.room.status = 'CLOSED') " +
           "AND (p.isBankrupt = false OR p.isBankrupt IS NULL) " +
           "GROUP BY p.name " +
           "ORDER BY COUNT(p.id) DESC LIMIT 10")
    List<RankingDTO> findTopWinners();

    @Query("SELECT new com.tigrao.dto.RankingDTO(p.name, MAX(p.maxBalanceRecord)) " +
           "FROM Player p " +
           "WHERE (p.room.status = 'FINISHED' OR p.room.status = 'CLOSED') " +
           "GROUP BY p.name " +
           "ORDER BY MAX(p.maxBalanceRecord) DESC LIMIT 10")
    List<RankingDTO> findTopBalances();
}

package br.com.menufacil.repository;

import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import br.com.menufacil.domain.models.WhatsappMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface WhatsappMessageRepository extends JpaRepository<WhatsappMessage, UUID> {

    List<WhatsappMessage> findByTenantIdAndPhoneOrderByCreatedAtDesc(UUID tenantId, String phone);

    /**
     * Retorna telefones distintos do tenant com a data da última mensagem,
     * ordenados pela mensagem mais recente primeiro.
     * Cada linha: [phone (String), lastMessageAt (LocalDateTime)].
     */
    @Query("SELECT m.phone AS phone, MAX(m.createdAt) AS lastMessageAt "
            + "FROM WhatsappMessage m WHERE m.tenantId = :tenantId "
            + "GROUP BY m.phone ORDER BY MAX(m.createdAt) DESC")
    List<Object[]> findDistinctPhonesWithLastMessage(@Param("tenantId") UUID tenantId);

    /**
     * Retorna a ultima mensagem (mais recente) de cada conversa (telefone distinto)
     * para o tenant informado.
     */
    @Query("SELECT m FROM WhatsappMessage m " +
            "WHERE m.tenantId = :tenantId " +
            "AND m.createdAt = (SELECT MAX(m2.createdAt) FROM WhatsappMessage m2 " +
            "                   WHERE m2.tenantId = :tenantId AND m2.phone = m.phone) " +
            "ORDER BY m.createdAt DESC")
    List<WhatsappMessage> findDistinctPhoneByTenantId(@Param("tenantId") UUID tenantId);

    long countByTenantIdAndDirection(UUID tenantId, WhatsappMessageDirection direction);
}

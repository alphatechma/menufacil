package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Wallet;
import br.com.menufacil.domain.models.WalletTransaction;
import br.com.menufacil.dto.WalletResponse;
import br.com.menufacil.dto.WalletTransactionResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface WalletConverter {

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "customerId", expression = "java(entity.getCustomerId().toString())")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    WalletResponse toResponse(Wallet entity);

    @Mapping(target = "id", expression = "java(entity.getId().toString())")
    @Mapping(target = "walletId", expression = "java(entity.getWalletId().toString())")
    @Mapping(target = "orderId", expression = "java(entity.getOrderId() != null ? entity.getOrderId().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(entity.getCreatedAt() != null ? entity.getCreatedAt().toString() : null)")
    WalletTransactionResponse toTransactionResponse(WalletTransaction entity);
}

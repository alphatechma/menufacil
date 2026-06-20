package br.com.menufacil.converter;

import br.com.menufacil.domain.models.PaymentTransaction;
import br.com.menufacil.dto.PaymentResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface PaymentConverter {

    @Mapping(target = "id", expression = "java(payment.getId() != null ? payment.getId().toString() : null)")
    @Mapping(target = "orderId", expression = "java(payment.getOrderId() != null ? payment.getOrderId().toString() : null)")
    @Mapping(target = "method", expression = "java(payment.getMethod() != null ? payment.getMethod().name() : null)")
    @Mapping(target = "status", expression = "java(payment.getStatus() != null ? payment.getStatus().name() : null)")
    @Mapping(target = "createdAt", expression = "java(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null)")
    @Mapping(target = "updatedAt", expression = "java(payment.getUpdatedAt() != null ? payment.getUpdatedAt().toString() : null)")
    PaymentResponse toResponse(PaymentTransaction payment);
}

package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.NotificationChannel;
import br.com.menufacil.domain.models.Notification;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.NotificationResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.UUID;

@Mapper(componentModel = "spring")
public interface NotificationConverter {

    @Mapping(target = "id", expression = "java(notification.getId() != null ? notification.getId().toString() : null)")
    @Mapping(target = "orderId", expression = "java(notification.getOrderId() != null ? notification.getOrderId().toString() : null)")
    @Mapping(target = "channel", expression = "java(notification.getChannel() != null ? notification.getChannel().name() : null)")
    @Mapping(target = "status", expression = "java(notification.getStatus() != null ? notification.getStatus().name() : null)")
    NotificationResponse toResponse(Notification notification);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "sentAt", ignore = true)
    @Mapping(target = "orderId", expression = "java(request.getOrderId() != null && !request.getOrderId().isBlank() ? java.util.UUID.fromString(request.getOrderId()) : null)")
    @Mapping(target = "channel", expression = "java(request.getChannel() != null ? br.com.menufacil.domain.enums.NotificationChannel.valueOf(request.getChannel()) : null)")
    Notification toEntity(CreateNotificationRequest request);
}

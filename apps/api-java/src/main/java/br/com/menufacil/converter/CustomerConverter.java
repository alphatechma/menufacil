package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.dto.CreateCustomerRequest;
import br.com.menufacil.dto.CustomerResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CustomerConverter {

    @Mapping(target = "id", expression = "java(customer.getId().toString())")
    @Mapping(target = "birthDate", expression = "java(customer.getBirthDate() != null ? customer.getBirthDate().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(customer.getCreatedAt() != null ? customer.getCreatedAt().toString() : null)")
    CustomerResponse toResponse(Customer customer);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "loyaltyPoints", ignore = true)
    @Mapping(target = "birthDate", expression = "java(request.getBirthDate() != null ? java.time.LocalDate.parse(request.getBirthDate()) : null)")
    Customer toEntity(CreateCustomerRequest request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    @Mapping(target = "passwordHash", ignore = true)
    @Mapping(target = "loyaltyPoints", ignore = true)
    @Mapping(target = "birthDate", expression = "java(request.getBirthDate() != null ? java.time.LocalDate.parse(request.getBirthDate()) : null)")
    void updateFromRequest(CreateCustomerRequest request, @MappingTarget Customer customer);
}

from app.infrastructure.database.models.masters import (
    AddressType,
    CommunicationType,
    Currency,
    DocumentType,
    IdentificationType,
    Industry,
    Language,
    TimeZone,
    UnitOfMeasure,
)
from app.modules.masters.common.crud_router import create_master_router
from app.modules.masters.schemas.address_type import (
    AddressTypeCreate,
    AddressTypeResponse,
    AddressTypeUpdate,
)
from app.modules.masters.schemas.communication_type import (
    CommunicationTypeCreate,
    CommunicationTypeResponse,
    CommunicationTypeUpdate,
)
from app.modules.masters.schemas.currency import (
    CurrencyCreate,
    CurrencyResponse,
    CurrencyUpdate,
)
from app.modules.masters.schemas.document_type import (
    DocumentTypeCreate,
    DocumentTypeResponse,
    DocumentTypeUpdate,
)
from app.modules.masters.schemas.identification_type import (
    IdentificationTypeCreate,
    IdentificationTypeResponse,
    IdentificationTypeUpdate,
)
from app.modules.masters.schemas.industry import (
    IndustryCreate,
    IndustryResponse,
    IndustryUpdate,
)
from app.modules.masters.schemas.language import (
    LanguageCreate,
    LanguageResponse,
    LanguageUpdate,
)
from app.modules.masters.schemas.time_zone import (
    TimeZoneCreate,
    TimeZoneResponse,
    TimeZoneUpdate,
)
from app.modules.masters.schemas.unit_of_measure import (
    UnitOfMeasureCreate,
    UnitOfMeasureResponse,
    UnitOfMeasureUpdate,
)

currency_router = create_master_router(
    model=Currency,
    create_schema=CurrencyCreate,
    update_schema=CurrencyUpdate,
    response_schema=CurrencyResponse,
    prefix="/masters/currencies",
    tag="Master Data - Currencies",
)

address_type_router = create_master_router(
    model=AddressType,
    create_schema=AddressTypeCreate,
    update_schema=AddressTypeUpdate,
    response_schema=AddressTypeResponse,
    prefix="/masters/address-types",
    tag="Master Data - Address Types",
)

communication_type_router = create_master_router(
    model=CommunicationType,
    create_schema=CommunicationTypeCreate,
    update_schema=CommunicationTypeUpdate,
    response_schema=CommunicationTypeResponse,
    prefix="/masters/communication-types",
    tag="Master Data - Communication Types",
)

document_type_router = create_master_router(
    model=DocumentType,
    create_schema=DocumentTypeCreate,
    update_schema=DocumentTypeUpdate,
    response_schema=DocumentTypeResponse,
    prefix="/masters/document-types",
    tag="Master Data - Document Types",
)

identification_type_router = create_master_router(
    model=IdentificationType,
    create_schema=IdentificationTypeCreate,
    update_schema=IdentificationTypeUpdate,
    response_schema=IdentificationTypeResponse,
    prefix="/masters/identification-types",
    tag="Master Data - Identification Types",
)

industry_router = create_master_router(
    model=Industry,
    create_schema=IndustryCreate,
    update_schema=IndustryUpdate,
    response_schema=IndustryResponse,
    prefix="/masters/industries",
    tag="Master Data - Industries",
)

language_router = create_master_router(
    model=Language,
    create_schema=LanguageCreate,
    update_schema=LanguageUpdate,
    response_schema=LanguageResponse,
    prefix="/masters/languages",
    tag="Master Data - Languages",
)

time_zone_router = create_master_router(
    model=TimeZone,
    create_schema=TimeZoneCreate,
    update_schema=TimeZoneUpdate,
    response_schema=TimeZoneResponse,
    prefix="/masters/time-zones",
    tag="Master Data - Time Zones",
)

unit_of_measure_router = create_master_router(
    model=UnitOfMeasure,
    create_schema=UnitOfMeasureCreate,
    update_schema=UnitOfMeasureUpdate,
    response_schema=UnitOfMeasureResponse,
    prefix="/masters/units-of-measure",
    tag="Master Data - Units of Measure",
)
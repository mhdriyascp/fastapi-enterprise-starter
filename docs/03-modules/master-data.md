# 03. Modules — Master Data Registry

## Overview

The Master Data module manages reference lookup catalogs required by enterprise business systems.

- **Module Path**: [`app/modules/masters/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/masters/)
- **Database Models**: [`app/infrastructure/database/models/general_master/`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/infrastructure/database/models/general_master/)
- **Registry & Router Factory**: [`app/modules/masters/registry.py`](file:///Users/mr/Documents/My-Workspace/Python%20Learning%20/crm-platform/app/modules/masters/registry.py)

---

## 11 Supported Lookup Catalogs

The platform exposes standardized endpoints under `/api/v1/masters/<catalog>`:

| Registry Catalog | Endpoint Prefix | Purpose |
|---|---|---|
| **Countries** | `/api/v1/masters/countries` | ISO 3166 country codes, names, calling codes. |
| **States / Provinces**| `/api/v1/masters/states` | Subdivisions linked to countries. |
| **Cities** | `/api/v1/masters/cities` | Municipalities linked to states. |
| **Currencies** | `/api/v1/masters/currencies` | ISO 4217 currencies with symbol & decimal places. |
| **Time Zones** | `/api/v1/masters/time-zones` | IANA standard time zone identifiers. |
| **Languages** | `/api/v1/masters/languages` | ISO 639 language codes. |
| **Industries** | `/api/v1/masters/industries` | Standard industrial classification categories. |
| **Address Types** | `/api/v1/masters/address-types` | Billing, Shipping, Headquarters, Warehouse. |
| **Document Types**| `/api/v1/masters/document-types` | Contract, Invoice, PO, NDA, Certification. |
| **Communication Types**| `/api/v1/masters/communication-types` | Work Email, Personal Phone, Mobile, Slack. |
| **Units of Measure** | `/api/v1/masters/units-of-measure` | Pieces, Kilograms, Liters, Hours, Meters. |

---

## Dynamic Router Factory Pattern

To adhere to DRY (Don't Repeat Yourself), lookup catalogs utilize `create_master_router`:

```python
from app.modules.masters.common.router_factory import create_master_router
from app.infrastructure.database.models.general_master.currency import Currency
from app.modules.masters.schemas.currency import CurrencyCreate, CurrencyResponse

currency_router = create_master_router(
    model=Currency,
    create_schema=CurrencyCreate,
    response_schema=CurrencyResponse,
    prefix="/masters/currencies",
    tag="Master Data - Currencies",
)
```

Each generated router automatically provides:
- `POST /` — Create record
- `GET /` — Paginated list
- `GET /{public_id}` — Fetch by UUID
- `PUT /{public_id}` — Update record
- `DELETE /{public_id}` — Soft or hard delete

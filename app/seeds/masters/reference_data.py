from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database.models.masters import (
    AddressType,
    City,
    CommunicationType,
    Country,
    Currency,
    DocumentType,
    IdentificationType,
    Industry,
    Language,
    State,
    TimeZone,
    UnitOfMeasure,
)
from app.seeds.helpers import get_or_create


async def seed_reference_data(db: AsyncSession) -> None:
    """Seed common global reference data, including GCC countries."""

    # ---------------------------------------------------------
    # 1. CURRENCIES
    # ---------------------------------------------------------
    currencies = [
        {"code": "INR", "name": "Indian Rupee", "symbol": "₹", "decimal_places": 2},
        {"code": "USD", "name": "US Dollar", "symbol": "$", "decimal_places": 2},
        {"code": "GBP", "name": "British Pound", "symbol": "£", "decimal_places": 2},
        {"code": "EUR", "name": "Euro", "symbol": "€", "decimal_places": 2},
        {"code": "AED", "name": "UAE Dirham", "symbol": "د.إ", "decimal_places": 2},
        {"code": "SAR", "name": "Saudi Riyal", "symbol": "ر.س", "decimal_places": 2},
        {"code": "QAR", "name": "Qatari Riyal", "symbol": "ر.ق", "decimal_places": 2},
        {"code": "KWD", "name": "Kuwaiti Dinar", "symbol": "د.ك", "decimal_places": 3},
        {"code": "BHD", "name": "Bahraini Dinar", "symbol": "د.ب", "decimal_places": 3},
        {"code": "OMR", "name": "Omani Rial", "symbol": "ر.ع.", "decimal_places": 3},
        {"code": "CAD", "name": "Canadian Dollar", "symbol": "C$", "decimal_places": 2},
        {"code": "AUD", "name": "Australian Dollar", "symbol": "A$", "decimal_places": 2},
        {"code": "JPY", "name": "Japanese Yen", "symbol": "¥", "decimal_places": 0},
    ]

    currency_ids: dict[str, int] = {}

    for item in currencies:
        currency, _created = await get_or_create(
            db,
            Currency,
            lookup={"code": item["code"]},
            defaults=item,
        )
        currency_ids[item["code"]] = currency.id

    # ---------------------------------------------------------
    # 2. COUNTRIES
    # ---------------------------------------------------------
    countries = [
        {"code": "IN", "iso3_code": "IND", "name": "India", "phone_code": "+91", "currency": "INR"},
        {"code": "US", "iso3_code": "USA", "name": "United States", "phone_code": "+1", "currency": "USD"},
        {"code": "GB", "iso3_code": "GBR", "name": "United Kingdom", "phone_code": "+44", "currency": "GBP"},
        {"code": "CA", "iso3_code": "CAN", "name": "Canada", "phone_code": "+1", "currency": "CAD"},
        {"code": "AU", "iso3_code": "AUS", "name": "Australia", "phone_code": "+61", "currency": "AUD"},

        # Gulf Cooperation Council (GCC)
        {"code": "SA", "iso3_code": "SAU", "name": "Saudi Arabia", "phone_code": "+966", "currency": "SAR"},
        {"code": "AE", "iso3_code": "ARE", "name": "United Arab Emirates", "phone_code": "+971", "currency": "AED"},
        {"code": "QA", "iso3_code": "QAT", "name": "Qatar", "phone_code": "+974", "currency": "QAR"},
        {"code": "KW", "iso3_code": "KWT", "name": "Kuwait", "phone_code": "+965", "currency": "KWD"},
        {"code": "BH", "iso3_code": "BHR", "name": "Bahrain", "phone_code": "+973", "currency": "BHD"},
        {"code": "OM", "iso3_code": "OMN", "name": "Oman", "phone_code": "+968", "currency": "OMR"},
    ]

    country_ids: dict[str, int] = {}

    for item in countries:
        country, _created = await get_or_create(
            db,
            Country,
            lookup={"code": item["code"]},
            defaults={
                "code": item["code"],
                "iso3_code": item["iso3_code"],
                "name": item["name"],
                "phone_code": item["phone_code"],
                "is_active": True,
            },
        )
        country_ids[item["code"]] = country.id

    # ---------------------------------------------------------
    # 3. STATES, PROVINCES, REGIONS, AND GOVERNORATES
    # ---------------------------------------------------------
    states = [
        # India
        ("IN", "KL", "Kerala"),
        ("IN", "KA", "Karnataka"),
        ("IN", "TN", "Tamil Nadu"),
        ("IN", "MH", "Maharashtra"),

        # United States
        ("US", "CA", "California"),
        ("US", "NY", "New York"),

        # Canada
        ("CA", "ON", "Ontario"),

        # Australia
        ("AU", "NSW", "New South Wales"),

        # Saudi Arabia — 13 administrative regions
        ("SA", "RIY", "Riyadh Region"),
        ("SA", "MAK", "Makkah Region"),
        ("SA", "MAD", "Madinah Region"),
        ("SA", "EAS", "Eastern Province"),
        ("SA", "QAS", "Al-Qassim Region"),
        ("SA", "ASA", "Asir Region"),
        ("SA", "TAB", "Tabuk Region"),
        ("SA", "HAI", "Hail Region"),
        ("SA", "NOR", "Northern Borders Region"),
        ("SA", "JAZ", "Jazan Region"),
        ("SA", "NAJ", "Najran Region"),
        ("SA", "BAH", "Al-Bahah Region"),
        ("SA", "JAW", "Al-Jawf Region"),

        # United Arab Emirates — 7 emirates
        ("AE", "AUH", "Abu Dhabi"),
        ("AE", "DXB", "Dubai"),
        ("AE", "SHJ", "Sharjah"),
        ("AE", "AJM", "Ajman"),
        ("AE", "UAQ", "Umm Al Quwain"),
        ("AE", "RAK", "Ras Al Khaimah"),
        ("AE", "FUJ", "Fujairah"),

        # Qatar — 8 municipalities
        ("QA", "DAW", "Doha"),
        ("QA", "RAY", "Al Rayyan"),
        ("QA", "WAK", "Al Wakrah"),
        ("QA", "KHO", "Al Khor and Al Thakhira"),
        ("QA", "SHM", "Al Shamal"),
        ("QA", "ZAY", "Al Daayen"),
        ("QA", "SHA", "Al Shahaniya"),
        ("QA", "DHK", "Umm Salal"),

        # Kuwait — 6 governorates
        ("KW", "CAP", "Capital Governorate"),
        ("KW", "HAW", "Hawalli Governorate"),
        ("KW", "FAR", "Farwaniya Governorate"),
        ("KW", "MUB", "Mubarak Al-Kabeer Governorate"),
        ("KW", "AHM", "Ahmadi Governorate"),
        ("KW", "JAH", "Jahra Governorate"),

        # Bahrain — 4 governorates
        ("BH", "CAP", "Capital Governorate"),
        ("BH", "MUH", "Muharraq Governorate"),
        ("BH", "NOR", "Northern Governorate"),
        ("BH", "SOU", "Southern Governorate"),

        # Oman — 11 governorates
        ("OM", "MUS", "Muscat Governorate"),
        ("OM", "DHO", "Dhofar Governorate"),
        ("OM", "MUSANDAM", "Musandam Governorate"),
        ("OM", "BUR", "Al Buraimi Governorate"),
        ("OM", "DAK", "Ad Dakhiliyah Governorate"),
        ("OM", "NORTHBAT", "North Al Batinah Governorate"),
        ("OM", "SOUTHBAT", "South Al Batinah Governorate"),
        ("OM", "NORTHSH", "North Al Sharqiyah Governorate"),
        ("OM", "SOUTHSH", "South Al Sharqiyah Governorate"),
        ("OM", "DHIRA", "Al Dhahirah Governorate"),
        ("OM", "WUSTA", "Al Wusta Governorate"),
    ]

    state_ids: dict[tuple[str, str], int] = {}

    for country_code, state_code, name in states:
        state, _created = await get_or_create(
            db,
            State,
            lookup={
                "country_id": country_ids[country_code],
                "code": state_code,
            },
            defaults={
                "country_id": country_ids[country_code],
                "code": state_code,
                "name": name,
                "is_active": True,
            },
        )
        state_ids[(country_code, state_code)] = state.id

    # ---------------------------------------------------------
    # 4. CITIES — STARTER DATASET
    # ---------------------------------------------------------
    cities = [
        ("IN", "KL", "Kochi"),
        ("IN", "KL", "Thiruvananthapuram"),
        ("IN", "KA", "Bengaluru"),
        ("IN", "TN", "Chennai"),
        ("IN", "MH", "Mumbai"),
        ("US", "CA", "Los Angeles"),
        ("US", "NY", "New York City"),
        ("CA", "ON", "Toronto"),
        ("AU", "NSW", "Sydney"),

        # Saudi Arabia
        ("SA", "RIY", "Riyadh"),
        ("SA", "MAK", "Jeddah"),
        ("SA", "MAK", "Makkah"),
        ("SA", "MAD", "Madinah"),
        ("SA", "EAS", "Dammam"),
        ("SA", "EAS", "Al Khobar"),

        # UAE
        ("AE", "AUH", "Abu Dhabi"),
        ("AE", "DXB", "Dubai"),
        ("AE", "SHJ", "Sharjah"),
        ("AE", "AJM", "Ajman"),
        ("AE", "RAK", "Ras Al Khaimah"),
        ("AE", "FUJ", "Fujairah"),

        # Qatar
        ("QA", "DAW", "Doha"),
        ("QA", "RAY", "Al Rayyan"),
        ("QA", "WAK", "Al Wakrah"),

        # Kuwait
        ("KW", "CAP", "Kuwait City"),
        ("KW", "HAW", "Hawalli"),
        ("KW", "AHM", "Al Ahmadi"),

        # Bahrain
        ("BH", "CAP", "Manama"),
        ("BH", "MUH", "Muharraq"),
        ("BH", "SOU", "Riffa"),

        # Oman
        ("OM", "MUS", "Muscat"),
        ("OM", "DHO", "Salalah"),
        ("OM", "BUR", "Al Buraimi"),
        ("OM", "DAK", "Nizwa"),
        ("OM", "NORTHBAT", "Sohar"),
        ("OM", "SOUTHSH", "Sur"),
    ]

    for country_code, state_code, name in cities:
        await get_or_create(
            db,
            City,
            lookup={
                "country_id": country_ids[country_code],
                "state_id": state_ids[(country_code, state_code)],
                "name": name,
            },
            defaults={
                "country_id": country_ids[country_code],
                "state_id": state_ids[(country_code, state_code)],
                "name": name,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 5. TIME ZONES
    # ---------------------------------------------------------
    time_zones = [
        ("Asia/Kolkata", "India Standard Time", "+05:30"),
        ("UTC", "Coordinated Universal Time", "+00:00"),
        ("Europe/London", "United Kingdom Time", None),
        ("America/New_York", "Eastern Time", None),
        ("America/Los_Angeles", "Pacific Time", None),
        ("Asia/Riyadh", "Arabia Standard Time", "+03:00"),
        ("Asia/Dubai", "Gulf Standard Time", "+04:00"),
        ("Asia/Qatar", "Qatar Time", "+03:00"),
        ("Asia/Kuwait", "Kuwait Time", "+03:00"),
        ("Asia/Bahrain", "Bahrain Time", "+03:00"),
        ("Asia/Muscat", "Oman Time", "+04:00"),
        ("Australia/Sydney", "Australian Eastern Time", None),
    ]

    for name, label, utc_offset in time_zones:
        await get_or_create(
            db,
            TimeZone,
            lookup={"name": name},
            defaults={
                "name": name,
                "label": label,
                "utc_offset": utc_offset,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 6. LANGUAGES
    # ---------------------------------------------------------
    languages = [
        ("en", "English", "English"),
        ("ml", "Malayalam", "മലയാളം"),
        ("hi", "Hindi", "हिन्दी"),
        ("ta", "Tamil", "தமிழ்"),
        ("kn", "Kannada", "ಕನ್ನಡ"),
        ("ar", "Arabic", "العربية"),
        ("fr", "French", "Français"),
        ("es", "Spanish", "Español"),
    ]

    for code, name, native_name in languages:
        await get_or_create(
            db,
            Language,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "native_name": native_name,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 7. INDUSTRIES
    # ---------------------------------------------------------
    industries = [
        ("IT", "Information Technology"),
        ("MANUFACTURING", "Manufacturing"),
        ("HEALTHCARE", "Healthcare"),
        ("EDUCATION", "Education"),
        ("FINANCE", "Financial Services"),
        ("RETAIL", "Retail"),
        ("CONSTRUCTION", "Construction"),
        ("LOGISTICS", "Logistics and Transportation"),
        ("HOSPITALITY", "Hospitality"),
        ("AGRICULTURE", "Agriculture"),
        ("ENERGY", "Energy"),
        ("OIL_GAS", "Oil and Gas"),
        ("REAL_ESTATE", "Real Estate"),
        ("TELECOMMUNICATIONS", "Telecommunications"),
        ("GOVERNMENT", "Government"),
    ]

    for code, name in industries:
        await get_or_create(
            db,
            Industry,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "description": None,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 8. ADDRESS TYPES
    # ---------------------------------------------------------
    address_types = [
        ("HOME", "Home"),
        ("OFFICE", "Office"),
        ("BILLING", "Billing"),
        ("SHIPPING", "Shipping"),
        ("REGISTERED", "Registered Address"),
        ("MAILING", "Mailing Address"),
        ("OTHER", "Other"),
    ]

    for code, name in address_types:
        await get_or_create(
            db,
            AddressType,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 9. DOCUMENT TYPES
    # ---------------------------------------------------------
    document_types = [
        ("INVOICE", "Invoice"),
        ("RECEIPT", "Receipt"),
        ("CONTRACT", "Contract"),
        ("AGREEMENT", "Agreement"),
        ("CERTIFICATE", "Certificate"),
        ("REPORT", "Report"),
        ("PURCHASE_ORDER", "Purchase Order"),
        ("DELIVERY_NOTE", "Delivery Note"),
        ("OTHER", "Other"),
    ]

    for code, name in document_types:
        await get_or_create(
            db,
            DocumentType,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 10. IDENTIFICATION TYPES
    # ---------------------------------------------------------
    identification_types = [
        ("PASSPORT", "Passport"),
        ("NATIONAL_ID", "National Identity Card"),
        ("DRIVING_LICENSE", "Driving Licence"),
        ("TAX_ID", "Tax Identification Number"),
        ("VOTER_ID", "Voter Identity Card"),
        ("RESIDENCE_PERMIT", "Residence Permit"),
        ("OTHER", "Other"),
    ]

    for code, name in identification_types:
        await get_or_create(
            db,
            IdentificationType,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 11. UNITS OF MEASURE
    # ---------------------------------------------------------
    units = [
        ("PCS", "Pieces", "pc", "COUNT"),
        ("KG", "Kilogram", "kg", "WEIGHT"),
        ("G", "Gram", "g", "WEIGHT"),
        ("TONNE", "Metric Tonne", "t", "WEIGHT"),
        ("M", "Metre", "m", "LENGTH"),
        ("KM", "Kilometre", "km", "LENGTH"),
        ("L", "Litre", "L", "VOLUME"),
        ("ML", "Millilitre", "mL", "VOLUME"),
        ("SQM", "Square Metre", "m²", "AREA"),
        ("HOUR", "Hour", "h", "TIME"),
        ("DAY", "Day", "d", "TIME"),
        ("BOX", "Box", "box", "COUNT"),
        ("DOZEN", "Dozen", "doz", "COUNT"),
    ]

    for code, name, symbol, category in units:
        await get_or_create(
            db,
            UnitOfMeasure,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "symbol": symbol,
                "category": category,
                "is_active": True,
            },
        )

    # ---------------------------------------------------------
    # 12. COMMUNICATION TYPES
    # ---------------------------------------------------------
    communication_types = [
        ("EMAIL", "Email"),
        ("PHONE", "Phone"),
        ("MOBILE", "Mobile Phone"),
        ("FAX", "Fax"),
        ("WEBSITE", "Website"),
        ("OTHER", "Other"),
    ]

    for code, name in communication_types:
        await get_or_create(
            db,
            CommunicationType,
            lookup={"code": code},
            defaults={
                "code": code,
                "name": name,
                "is_active": True,
            },
        )
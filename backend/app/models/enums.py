import enum

class MaterialCategory(str, enum.Enum):
    CRT = "CRT"
    LCD_PANEL = "LCD_PANEL"
    PCB = "PCB"
    CABLE = "CABLE"
    BATTERY = "BATTERY"
    MOTOR_MAGNET = "MOTOR_MAGNET"
    MIXED_PLASTIC = "MIXED_PLASTIC"

class MaterialCondition(str, enum.Enum):
    intact = "intact"
    damaged = "damaged"
    stripped = "stripped"

class MaterialSource(str, enum.Enum):
    household = "household"
    commercial = "commercial"
    mixed_scrap = "mixed_scrap"

class TransactionStatus(str, enum.Enum):
    draft = "draft"
    quoted = "quoted"
    matched = "matched"
    handed_over = "handed_over"
    confirmed = "confirmed"
    paid = "paid"
    closed = "closed"

class PaymentMethod(str, enum.Enum):
    cash = "cash"
    upi = "upi"
    pending = "pending"

class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    paid = "paid"

class AuthorizationStatus(str, enum.Enum):
    pending = "pending"
    verified = "verified"
    rejected = "rejected"
    suspended = "suspended"

class CollectionAuthStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"

class ObservationUnit(str, enum.Enum):
    per_kg = "per_kg"
    per_unit = "per_unit"
    per_piece = "per_piece"

class ObservationSource(str, enum.Enum):
    transaction_derived = "transaction_derived"
    manual_admin_entry = "manual_admin_entry"

class PriceChannel(str, enum.Enum):
    formal = "formal"
    informal = "informal"

class AccountType(str, enum.Enum):
    independent = "independent"
    shop = "shop"
    sub_collector = "sub_collector"

class EventActor(str, enum.Enum):
    collector = "collector"
    recycler = "recycler"
    system = "system"
    admin = "admin"

class PreferredLanguage(str, enum.Enum):
    hi = "hi"
    mr = "mr"
    en = "en"

class MineralEnum(str, enum.Enum):
    lithium = "lithium"
    cobalt = "cobalt"
    neodymium = "neodymium"
    tantalum = "tantalum"
    gallium = "gallium"
    indium = "indium"
    copper = "copper"
    other = "other"

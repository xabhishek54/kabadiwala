import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.recycler import Recycler
from app.models.collector import Collector
from app.models.price import PriceObservation
from app.models.enums import AuthorizationStatus, MaterialCategory, PriceChannel, ObservationSource, ObservationUnit, AccountType, PreferredLanguage

logger = logging.getLogger("seed")

def seed_database(db: Session):
    # Check if recyclers already exist
    existing_count = db.query(Recycler).count()
    if existing_count > 0:
        return

    logger.info("Seeding initial collectors, shop SHOP-9876, recyclers and price observations...")

    # Seed default shop owner & feriwalas
    shop_owner = Collector(
        collector_id="col-demo-101",
        phone_number="9876543210",
        display_name="Ramesh Kumar (Ganesh Kabadi Shop)",
        preferred_language=PreferredLanguage.hi,
        operating_locality="Hadapsar, Pune",
        account_type=AccountType.shop,
        shop_code="SHOP-9876",
    )
    db.add(shop_owner)
    db.commit()
    db.refresh(shop_owner)

    feriwala1 = Collector(
        collector_id="col-sub-001",
        phone_number="9822011223",
        display_name="Suresh Patil (Feriwala)",
        preferred_language=PreferredLanguage.mr,
        operating_locality="Hadapsar, Pune",
        account_type=AccountType.sub_collector,
        parent_shop_id=shop_owner.collector_id,
    )
    feriwala2 = Collector(
        collector_id="col-sub-002",
        phone_number="9822044556",
        display_name="Vikram Singh (Feriwala)",
        preferred_language=PreferredLanguage.hi,
        operating_locality="Kothrud, Pune",
        account_type=AccountType.sub_collector,
        parent_shop_id=shop_owner.collector_id,
    )
    feriwala3 = Collector(
        collector_id="col-ind-001",
        phone_number="9800033333",
        display_name="Anil Deshmukh (Independent Collector)",
        preferred_language=PreferredLanguage.mr,
        operating_locality="Shivajinagar, Pune",
        account_type=AccountType.independent,
    )
    db.add(feriwala1)
    db.add(feriwala2)
    db.add(feriwala3)
    db.commit()

    recyclers_data = [
        # Pune Recyclers
        {
            "recycler_id": "rec-pune-001",
            "name": "EcoRecycle India (Pune Hub)",
            "facility_lat": 18.5204,
            "facility_lng": 73.8567,
            "service_radius_km": 25.0,
            "materials_accepted": ["PCB", "BATTERY", "CABLE", "LCD_PANEL", "CRT", "MOTOR_MAGNET", "MIXED_PLASTIC"],
            "authorization_status": AuthorizationStatus.verified,
            "authorization_ref_no": "MPCB/E-WASTE/2024/089",
            "contact_phone": "9876543210",
            "offered_rates": {"PCB": 260.0, "BATTERY": 90.0, "CABLE": 150.0, "LCD_PANEL": 110.0, "CRT": 40.0, "MOTOR_MAGNET": 70.0, "MIXED_PLASTIC": 25.0},
            "pickup_available": True,
        },
        {
            "recycler_id": "rec-pune-002",
            "name": "Chinchwad Aggregators & Metal Works",
            "facility_lat": 18.6298,
            "facility_lng": 73.7997,
            "service_radius_km": 30.0,
            "materials_accepted": ["PCB", "CABLE", "MOTOR_MAGNET", "BATTERY"],
            "authorization_status": AuthorizationStatus.verified,
            "authorization_ref_no": "MPCB/E-WASTE/2024/045",
            "contact_phone": "9765432109",
            "offered_rates": {"PCB": 255.0, "CABLE": 155.0, "MOTOR_MAGNET": 75.0, "BATTERY": 95.0},
            "pickup_available": True,
        },

        # Mumbai Recyclers
        {
            "recycler_id": "rec-mum-001",
            "name": "GreenTech E-Waste Recyclers Mumbai",
            "facility_lat": 19.0760,
            "facility_lng": 72.8777,
            "service_radius_km": 35.0,
            "materials_accepted": ["PCB", "BATTERY", "CABLE", "LCD_PANEL", "CRT", "MOTOR_MAGNET", "MIXED_PLASTIC"],
            "authorization_status": AuthorizationStatus.verified,
            "authorization_ref_no": "MPCB/E-WASTE/2024/112",
            "contact_phone": "9812345678",
            "offered_rates": {"PCB": 285.0, "BATTERY": 105.0, "CABLE": 165.0, "LCD_PANEL": 125.0, "CRT": 45.0, "MOTOR_MAGNET": 80.0, "MIXED_PLASTIC": 28.0},
            "pickup_available": True,
        },
        {
            "recycler_id": "rec-mum-002",
            "name": "Dharavi Metal & E-Resource Processors",
            "facility_lat": 19.0400,
            "facility_lng": 72.8500,
            "service_radius_km": 20.0,
            "materials_accepted": ["PCB", "BATTERY", "CABLE"],
            "authorization_status": AuthorizationStatus.verified,
            "authorization_ref_no": "MPCB/E-WASTE/2024/198",
            "contact_phone": "9833445566",
            "offered_rates": {"PCB": 290.0, "BATTERY": 110.0, "CABLE": 170.0},
            "pickup_available": False,
        },

        # Thane Recyclers
        {
            "recycler_id": "rec-thane-001",
            "name": "Thane E-Scrap Solutions",
            "facility_lat": 19.2183,
            "facility_lng": 72.9781,
            "service_radius_km": 25.0,
            "materials_accepted": ["PCB", "BATTERY", "CABLE", "LCD_PANEL"],
            "authorization_status": AuthorizationStatus.verified,
            "authorization_ref_no": "MPCB/E-WASTE/2024/204",
            "contact_phone": "9844556677",
            "offered_rates": {"PCB": 270.0, "BATTERY": 98.0, "CABLE": 158.0, "LCD_PANEL": 115.0},
            "pickup_available": True,
        },

        # Nagpur Recyclers
        {
            "recycler_id": "rec-nag-001",
            "name": "Nagpur CleanTech Recovery",
            "facility_lat": 21.1458,
            "facility_lng": 79.0882,
            "service_radius_km": 40.0,
            "materials_accepted": ["PCB", "BATTERY", "CABLE", "CRT"],
            "authorization_status": AuthorizationStatus.verified,
            "authorization_ref_no": "MPCB/E-WASTE/2024/310",
            "contact_phone": "9855667788",
            "offered_rates": {"PCB": 240.0, "BATTERY": 85.0, "CABLE": 140.0, "CRT": 35.0},
            "pickup_available": True,
        },
    ]

    for r in recyclers_data:
        rec = Recycler(**r)
        db.add(rec)

    db.commit()

    # Seed Price Observations across districts (Pune, Mumbai, Thane, Pimpri-Chinchwad, Nagpur, Nashik)
    districts = [
        ("Pune", {"PCB": 260, "BATTERY": 90, "CABLE": 150, "LCD_PANEL": 110, "CRT": 40, "MOTOR_MAGNET": 70, "MIXED_PLASTIC": 25}),
        ("Mumbai", {"PCB": 285, "BATTERY": 105, "CABLE": 165, "LCD_PANEL": 125, "CRT": 45, "MOTOR_MAGNET": 80, "MIXED_PLASTIC": 28}),
        ("Pimpri-Chinchwad", {"PCB": 255, "BATTERY": 95, "CABLE": 155, "LCD_PANEL": 112, "CRT": 42, "MOTOR_MAGNET": 75, "MIXED_PLASTIC": 26}),
        ("Thane", {"PCB": 270, "BATTERY": 98, "CABLE": 158, "LCD_PANEL": 115, "CRT": 42, "MOTOR_MAGNET": 72, "MIXED_PLASTIC": 26}),
        ("Nagpur", {"PCB": 240, "BATTERY": 85, "CABLE": 140, "LCD_PANEL": 100, "CRT": 35, "MOTOR_MAGNET": 65, "MIXED_PLASTIC": 22}),
        ("Nashik", {"PCB": 245, "BATTERY": 88, "CABLE": 142, "LCD_PANEL": 105, "CRT": 38, "MOTOR_MAGNET": 68, "MIXED_PLASTIC": 23}),
    ]

    now = datetime.now(timezone.utc)
    for dist_name, rates in districts:
        for cat_str, formal_price in rates.items():
            cat_enum = MaterialCategory[cat_str]

            # Formal observation
            obs_formal = PriceObservation(
                material_category=cat_enum,
                sub_category=cat_str,
                location_district=dist_name,
                observed_at=now - timedelta(days=1),
                buying_price=float(formal_price),
                quoted_price=float(formal_price),
                unit=ObservationUnit.per_kg,
                market_range_low=float(formal_price * 0.92),
                market_range_high=float(formal_price * 1.08),
                source=ObservationSource.manual_admin_entry,
                channel=PriceChannel.formal,
            )
            db.add(obs_formal)

            # Informal reference observation
            obs_informal = PriceObservation(
                material_category=cat_enum,
                sub_category=cat_str,
                location_district=dist_name,
                observed_at=now - timedelta(days=2),
                buying_price=float(round(formal_price * 0.82, 1)),
                quoted_price=float(round(formal_price * 0.82, 1)),
                unit=ObservationUnit.per_kg,
                source=ObservationSource.manual_admin_entry,
                channel=PriceChannel.informal,
            )
            db.add(obs_informal)

    db.commit()
    logger.info("Database seeding complete!")

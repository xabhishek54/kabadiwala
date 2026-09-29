import logging
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.recycler import Recycler
from app.models.collector import Collector
from app.models.material import Material
from app.models.transaction import Transaction
from app.models.traceability import TraceabilityEvent
from app.models.price import PriceObservation
from app.models.enums import (
    AuthorizationStatus, MaterialCategory, MaterialCondition, MaterialSource,
    PriceChannel, ObservationSource, ObservationUnit, AccountType, PreferredLanguage,
    TransactionStatus, PaymentMethod, PaymentStatus, EventActor,
)

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
            "contact_phone": "9888888888",
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

    # ─── Demo Lots & Transactions ──────────────────────────────────────────────
    # Covers every lifecycle stage so every demo account has rich data to explore.
    # Collector phone numbers:
    #   9876543210 → col-demo-101 (shop owner, Ramesh Kumar)
    #   9822011223 → col-sub-001 (Suresh Patil, feriwala)
    #   9822044556 → col-sub-002 (Vikram Singh, feriwala)
    #   9800033333 → col-ind-001 (Anil Deshmukh, independent)

    demo_lots = [
        # ── Ramesh's lots ──────────────────────────────────────────────────────
        {
            "lot_id": "lot-demo-r1",
            "collector_id": "col-demo-101",
            "material_category": MaterialCategory.PCB,
            "sub_category": "PCB",
            "description": "Mixed PCBs from old desktops collected from Hadapsar",
            "approx_weight_kg": 12.5,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.commercial,
            "estimated_value": 3250.0,
            "days_ago": 7,
            # Transaction fields
            "recycler_id": "rec-pune-001",
            "status": TransactionStatus.closed,
            "quoted_price": 3200.0,
            "final_sale_value": 3200.0,
            "payment_method": PaymentMethod.upi,
            "payment_status": PaymentStatus.paid,
            "collection_address": "Hadapsar MIDC, Pune",
            "collection_lat": 18.5100,
            "collection_lng": 73.9300,
        },
        {
            "lot_id": "lot-demo-r2",
            "collector_id": "col-demo-101",
            "material_category": MaterialCategory.BATTERY,
            "sub_category": "BATTERY",
            "description": "Lithium-ion batteries from e-waste drive",
            "approx_weight_kg": 8.0,
            "condition": MaterialCondition.damaged,
            "source_type": MaterialSource.household,
            "estimated_value": 720.0,
            "days_ago": 3,
            "recycler_id": "rec-pune-001",
            "status": TransactionStatus.confirmed,
            "quoted_price": 720.0,
            "final_sale_value": None,
            "payment_method": PaymentMethod.cash,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Hadapsar, Pune",
            "collection_lat": 18.5120,
            "collection_lng": 73.9250,
        },
        {
            "lot_id": "lot-demo-r3",
            "collector_id": "col-demo-101",
            "material_category": MaterialCategory.CABLE,
            "sub_category": "CABLE",
            "description": "Copper cables — stripped, approx 5 kg",
            "approx_weight_kg": 5.0,
            "condition": MaterialCondition.stripped,
            "source_type": MaterialSource.commercial,
            "estimated_value": 775.0,
            "days_ago": 1,
            "recycler_id": None,
            "status": TransactionStatus.quoted,
            "quoted_price": 775.0,
            "final_sale_value": None,
            "payment_method": PaymentMethod.pending,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Hadapsar, Pune",
            "collection_lat": 18.5110,
            "collection_lng": 73.9270,
        },
        {
            "lot_id": "lot-demo-r4",
            "collector_id": "col-demo-101",
            "material_category": MaterialCategory.LCD_PANEL,
            "sub_category": "LCD_PANEL",
            "description": "Flat-screen LCD panels, 6 units",
            "approx_weight_kg": 18.0,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.commercial,
            "estimated_value": 1980.0,
            "days_ago": 0,
            "recycler_id": None,
            "status": TransactionStatus.draft,
            "quoted_price": None,
            "final_sale_value": None,
            "payment_method": PaymentMethod.pending,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Hadapsar, Pune",
            "collection_lat": 18.5115,
            "collection_lng": 73.9280,
        },

        # ── Suresh's lots (feriwala) ──────────────────────────────────────────
        {
            "lot_id": "lot-demo-s1",
            "collector_id": "col-sub-001",
            "material_category": MaterialCategory.CRT,
            "sub_category": "CRT",
            "description": "Old CRT monitors from school e-waste drive",
            "approx_weight_kg": 35.0,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.commercial,
            "estimated_value": 1400.0,
            "days_ago": 10,
            "recycler_id": "rec-pune-001",
            "status": TransactionStatus.paid,
            "quoted_price": 1400.0,
            "final_sale_value": 1380.0,
            "payment_method": PaymentMethod.cash,
            "payment_status": PaymentStatus.paid,
            "collection_address": "Kothrud, Pune",
            "collection_lat": 18.5074,
            "collection_lng": 73.8077,
        },
        {
            "lot_id": "lot-demo-s2",
            "collector_id": "col-sub-001",
            "material_category": MaterialCategory.MOTOR_MAGNET,
            "sub_category": "MOTOR_MAGNET",
            "description": "Hard drive motors and rare-earth magnets",
            "approx_weight_kg": 6.0,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.mixed_scrap,
            "estimated_value": 420.0,
            "days_ago": 2,
            "recycler_id": "rec-pune-001",
            "status": TransactionStatus.handed_over,
            "quoted_price": 420.0,
            "final_sale_value": None,
            "payment_method": PaymentMethod.upi,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Kothrud, Pune",
            "collection_lat": 18.5060,
            "collection_lng": 73.8100,
        },
        {
            "lot_id": "lot-demo-s3",
            "collector_id": "col-sub-001",
            "material_category": MaterialCategory.MIXED_PLASTIC,
            "sub_category": "MIXED_PLASTIC",
            "description": "Mixed plastic housings from consumer electronics",
            "approx_weight_kg": 22.0,
            "condition": MaterialCondition.damaged,
            "source_type": MaterialSource.household,
            "estimated_value": 550.0,
            "days_ago": 0,
            "recycler_id": None,
            "status": TransactionStatus.draft,
            "quoted_price": None,
            "final_sale_value": None,
            "payment_method": PaymentMethod.pending,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Kothrud, Pune",
            "collection_lat": 18.5055,
            "collection_lng": 73.8095,
        },

        # ── Vikram's lots (feriwala) ──────────────────────────────────────────
        {
            "lot_id": "lot-demo-v1",
            "collector_id": "col-sub-002",
            "material_category": MaterialCategory.PCB,
            "sub_category": "PCB",
            "description": "Server motherboards, high-grade PCBs",
            "approx_weight_kg": 9.5,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.commercial,
            "estimated_value": 2470.0,
            "days_ago": 5,
            "recycler_id": "rec-pune-002",
            "status": TransactionStatus.matched,
            "quoted_price": 2470.0,
            "final_sale_value": None,
            "payment_method": PaymentMethod.upi,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Kothrud, Pune",
            "collection_lat": 18.5044,
            "collection_lng": 73.8080,
        },
        {
            "lot_id": "lot-demo-v2",
            "collector_id": "col-sub-002",
            "material_category": MaterialCategory.CABLE,
            "sub_category": "CABLE",
            "description": "Network cables and power cords",
            "approx_weight_kg": 14.0,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.commercial,
            "estimated_value": 2170.0,
            "days_ago": 4,
            "recycler_id": "rec-pune-002",
            "status": TransactionStatus.closed,
            "quoted_price": 2170.0,
            "final_sale_value": 2100.0,
            "payment_method": PaymentMethod.upi,
            "payment_status": PaymentStatus.paid,
            "collection_address": "Kothrud, Pune",
            "collection_lat": 18.5042,
            "collection_lng": 73.8082,
        },

        # ── Anil's lots (independent) ──────────────────────────────────────────
        {
            "lot_id": "lot-demo-a1",
            "collector_id": "col-ind-001",
            "material_category": MaterialCategory.BATTERY,
            "sub_category": "BATTERY",
            "description": "Vehicle lead-acid batteries",
            "approx_weight_kg": 30.0,
            "condition": MaterialCondition.damaged,
            "source_type": MaterialSource.household,
            "estimated_value": 2700.0,
            "days_ago": 6,
            "recycler_id": "rec-pune-001",
            "status": TransactionStatus.closed,
            "quoted_price": 2700.0,
            "final_sale_value": 2700.0,
            "payment_method": PaymentMethod.cash,
            "payment_status": PaymentStatus.paid,
            "collection_address": "Shivajinagar, Pune",
            "collection_lat": 18.5308,
            "collection_lng": 73.8474,
        },
        {
            "lot_id": "lot-demo-a2",
            "collector_id": "col-ind-001",
            "material_category": MaterialCategory.PCB,
            "sub_category": "PCB",
            "description": "Mixed PCBs from mobile phone repair shops",
            "approx_weight_kg": 4.5,
            "condition": MaterialCondition.damaged,
            "source_type": MaterialSource.commercial,
            "estimated_value": 1170.0,
            "days_ago": 1,
            "recycler_id": None,
            "status": TransactionStatus.quoted,
            "quoted_price": 1170.0,
            "final_sale_value": None,
            "payment_method": PaymentMethod.pending,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Shivajinagar, Pune",
            "collection_lat": 18.5315,
            "collection_lng": 73.8480,
        },
        {
            "lot_id": "lot-demo-a3",
            "collector_id": "col-ind-001",
            "material_category": MaterialCategory.LCD_PANEL,
            "sub_category": "LCD_PANEL",
            "description": "LCD panels from old TVs",
            "approx_weight_kg": 25.0,
            "condition": MaterialCondition.intact,
            "source_type": MaterialSource.household,
            "estimated_value": 2750.0,
            "days_ago": 0,
            "recycler_id": None,
            "status": TransactionStatus.draft,
            "quoted_price": None,
            "final_sale_value": None,
            "payment_method": PaymentMethod.pending,
            "payment_status": PaymentStatus.unpaid,
            "collection_address": "Shivajinagar, Pune",
            "collection_lat": 18.5320,
            "collection_lng": 73.8470,
        },
    ]

    for ld in demo_lots:
        days = ld.pop("days_ago")
        created = now - timedelta(days=days)

        material = Material(
            lot_id=ld["lot_id"],
            material_category=ld["material_category"],
            sub_category=ld["sub_category"],
            description=ld.get("description"),
            approx_weight_kg=ld["approx_weight_kg"],
            condition=ld["condition"],
            source_type=ld["source_type"],
            estimated_value=ld["estimated_value"],
            collector_id=ld["collector_id"],
            created_at=created,
            condition_ml_used=False,
            classifier_used=False,
        )
        db.add(material)
        db.flush()  # ensure FK before transaction insert

        tx = Transaction(
            lot_id=ld["lot_id"],
            collector_id=ld["collector_id"],
            recycler_id=ld.get("recycler_id"),
            status=ld["status"],
            quoted_price=ld.get("quoted_price"),
            final_sale_value=ld.get("final_sale_value"),
            payment_method=ld["payment_method"],
            payment_status=ld["payment_status"],
            collection_address=ld.get("collection_address"),
            collection_lat=ld.get("collection_lat"),
            collection_lng=ld.get("collection_lng"),
            created_at=created,
            updated_at=created,
        )
        db.add(tx)
        db.flush()

        # Traceability events for each stage the lot has passed through
        stage_sequence = [
            (TransactionStatus.draft, EventActor.collector, "Lot created by collector", created),
        ]
        if ld["status"] not in (TransactionStatus.draft,):
            stage_sequence.append((TransactionStatus.quoted, EventActor.system, "Price quote generated", created + timedelta(hours=2)))
        if ld["status"] in (TransactionStatus.matched, TransactionStatus.handed_over, TransactionStatus.confirmed, TransactionStatus.paid, TransactionStatus.closed):
            stage_sequence.append((TransactionStatus.matched, EventActor.system, f"Matched to recycler {ld.get('recycler_id','')}", created + timedelta(hours=4)))
        if ld["status"] in (TransactionStatus.handed_over, TransactionStatus.confirmed, TransactionStatus.paid, TransactionStatus.closed):
            stage_sequence.append((TransactionStatus.handed_over, EventActor.collector, "Materials handed over to recycler", created + timedelta(hours=6)))
        if ld["status"] in (TransactionStatus.confirmed, TransactionStatus.paid, TransactionStatus.closed):
            stage_sequence.append((TransactionStatus.confirmed, EventActor.recycler, "Recycler confirmed receipt", created + timedelta(hours=8)))
        if ld["status"] in (TransactionStatus.paid, TransactionStatus.closed):
            stage_sequence.append((TransactionStatus.paid, EventActor.recycler, "Payment processed", created + timedelta(hours=10)))
        if ld["status"] == TransactionStatus.closed:
            stage_sequence.append((TransactionStatus.closed, EventActor.system, "Transaction closed", created + timedelta(hours=12)))

        for event_type, actor, notes, ts in stage_sequence:
            evt = TraceabilityEvent(
                event_id=str(uuid.uuid4()),
                lot_id=ld["lot_id"],
                event_type=event_type,
                actor=actor,
                timestamp=ts,
                notes=notes,
            )
            db.add(evt)

    db.commit()
    logger.info("Database seeding complete!")

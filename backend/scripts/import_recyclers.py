import sys
import csv
import json
from pathlib import Path

# Add backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, engine, Base
from app.models.recycler import Recycler
from app.models.enums import AuthorizationStatus

def import_recyclers(csv_path: str):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    imported = 0

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            existing = db.query(Recycler).filter(Recycler.authorization_ref_no == row['authorization_ref_no']).first()
            if existing:
                continue

            materials = [m.strip() for m in row['materials_accepted'].split(',')]
            rates = json.loads(row['offered_rates'])

            recycler = Recycler(
                name=row['name'],
                facility_lat=float(row['facility_lat']),
                facility_lng=float(row['facility_lng']),
                service_radius_km=float(row['service_radius_km']),
                materials_accepted=materials,
                authorization_status=AuthorizationStatus(row['authorization_status']),
                authorization_ref_no=row['authorization_ref_no'],
                contact_phone=row['contact_phone'],
                offered_rates=rates,
                pickup_available=row['pickup_available'].lower() in ('true', '1', 'yes'),
            )
            db.add(recycler)
            imported += 1

    db.commit()
    db.close()
    print(f"Successfully imported {imported} recyclers from {csv_path}")

if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "seed/recyclers.csv"
    import_recyclers(csv_file)

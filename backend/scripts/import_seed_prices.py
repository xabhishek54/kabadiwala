import sys
import csv
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, engine, Base
from app.models.price import PriceObservation
from app.models.enums import MaterialCategory, ObservationUnit, ObservationSource, PriceChannel

def import_seed_prices(csv_path: str):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    imported = 0

    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            obs = PriceObservation(
                material_category=MaterialCategory(row['material_category']),
                sub_category=row['sub_category'],
                location_district=row['location_district'],
                buying_price=float(row['buying_price']),
                quoted_price=float(row['quoted_price']) if row.get('quoted_price') else None,
                unit=ObservationUnit(row.get('unit', 'per_kg')),
                market_range_low=float(row['market_range_low']) if row.get('market_range_low') else None,
                market_range_high=float(row['market_range_high']) if row.get('market_range_high') else None,
                source=ObservationSource(row.get('source', 'manual_admin_entry')),
                channel=PriceChannel(row.get('channel', 'formal')),
            )
            db.add(obs)
            imported += 1

    db.commit()
    db.close()
    print(f"Successfully imported {imported} price observations from {csv_path}")

if __name__ == "__main__":
    csv_file = sys.argv[1] if len(sys.argv) > 1 else "seed/prices.csv"
    import_seed_prices(csv_file)

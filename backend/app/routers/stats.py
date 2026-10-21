from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import MedicalRecord, Pet
from app.schemas import RecentRecordOut, StatsOut

router = APIRouter(prefix="/api/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
def stats(db: Session = Depends(get_db)):
    by_species = {"dog": 0, "cat": 0}
    for species, count in db.query(Pet.species, func.count(Pet.id)).group_by(Pet.species):
        by_species[species] = count

    avg = db.query(func.avg(Pet.weight_kg)).scalar()
    recent = (
        db.query(MedicalRecord, Pet.name)
        .join(Pet, Pet.id == MedicalRecord.pet_id)
        .order_by(MedicalRecord.visit_date.desc(), MedicalRecord.id.desc())
        .limit(5)
        .all()
    )
    return StatsOut(
        total_pets=sum(by_species.values()),
        by_species=by_species,
        avg_weight_kg=round(float(avg), 2) if avg is not None else None,
        records_total=db.query(func.count(MedicalRecord.id)).scalar(),
        recent_records=[
            RecentRecordOut(
                id=r.id,
                pet_id=r.pet_id,
                pet_name=name,
                visit_date=r.visit_date,
                diagnosis=r.diagnosis,
                vaccination=r.vaccination,
            )
            for r, name in recent
        ],
    )

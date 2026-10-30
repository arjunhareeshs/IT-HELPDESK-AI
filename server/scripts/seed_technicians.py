"""
Create the technician roster (users + category/subcategory skills + buildings) in the database.

Safe to re-run: existing technicians (matched by email) are kept and only missing skills/buildings are added.
Dry-run by default; pass --apply to write.

    python scripts/seed_technicians.py            # show what would change
    python scripts/seed_technicians.py --apply    # write it
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db.seed_data import TECHNICIANS  # noqa: E402
from app.db.session import get_db_session  # noqa: E402
from app.models.technician import TechnicianBuildingAssignment, TechnicianSkill  # noqa: E402
from app.models.user import User  # noqa: E402

# users_role_check in the live schema only allows: Master, IT-Technician, User
TECHNICIAN_ROLE = "IT-Technician"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write the changes (default is a dry run)")
    args = parser.parse_args()

    with get_db_session() as session:
        for spec in TECHNICIANS:
            user = session.execute(select(User).where(User.email == spec["email"])).scalar_one_or_none()
            if user is None:
                print(f"+ user      {spec['full_name']} <{spec['email']}> ({TECHNICIAN_ROLE})")
                user = User(
                    full_name=spec["full_name"],
                    email=spec["email"],
                    role=TECHNICIAN_ROLE,
                    department=spec["department"],
                    building=spec["buildings"][0],
                    is_active=True,
                )
                session.add(user)
                session.flush()
            else:
                print(f"= user      {spec['full_name']} already exists (id {user.user_id})")

            have_skills = {
                (s.category, s.subcategory)
                for s in session.execute(
                    select(TechnicianSkill).where(TechnicianSkill.technician_user_id == user.user_id)
                ).scalars()
            }
            for category, subs in spec["skills"].items():
                for sub in subs:
                    if (category, sub) not in have_skills:
                        print(f"  + skill   {category} / {sub}")
                        session.add(TechnicianSkill(technician_user_id=user.user_id, category=category, subcategory=sub))

            have_buildings = set(
                session.execute(
                    select(TechnicianBuildingAssignment.building).where(
                        TechnicianBuildingAssignment.technician_user_id == user.user_id
                    )
                ).scalars()
            )
            for building in spec["buildings"]:
                if building not in have_buildings:
                    print(f"  + building {building}")
                    session.add(TechnicianBuildingAssignment(technician_user_id=user.user_id, building=building))

        if args.apply:
            session.commit()
            print("\nApplied.")
        else:
            session.rollback()
            print("\nDry run only - nothing written. Re-run with --apply.")


if __name__ == "__main__":
    main()

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, generate_invite_code, hash_password, verify_password
from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import Family, FamilyMember, User
from ..schemas import LoginRequest, MeResponse, SignupRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _unique_invite_code(db: Session) -> str:
    while True:
        code = generate_invite_code()
        if not db.query(Family).filter(Family.invite_code == code).first():
            return code


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    if bool(payload.family_name) == bool(payload.invite_code):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Provide either family_name to create a workspace or invite_code to join one.",
        )
    if db.query(User).filter(User.email == payload.email.lower()).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    if payload.family_name:
        family = Family(name=payload.family_name, invite_code=_unique_invite_code(db), owner_user_id=user.id)
        db.add(family)
        db.flush()
        db.add(FamilyMember(family_id=family.id, user_id=user.id, role="owner"))
    else:
        family = db.query(Family).filter(Family.invite_code == payload.invite_code.upper()).first()
        if not family:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite code not found")
        db.add(FamilyMember(family_id=family.id, user_id=user.id, role="member"))

    db.commit()
    db.refresh(user)
    db.refresh(family)
    return {"access_token": create_access_token(str(user.id)), "user": user, "family": family}


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    membership = db.query(FamilyMember).filter(FamilyMember.user_id == user.id).first()
    family = db.get(Family, membership.family_id) if membership else None
    if not family:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is not assigned to a family")
    return {"access_token": create_access_token(str(user.id)), "user": user, "family": family}


@router.get("/me", response_model=MeResponse)
def me(current: CurrentUser = Depends(get_current_user)):
    return {"user": current.user, "family": current.family, "role": current.role}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies import CurrentUser, get_current_user
from ..models import ExpenseCategory
from ..schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(include_inactive: bool = False, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(ExpenseCategory).filter(ExpenseCategory.family_id == current.family_id)
    if not include_inactive:
        query = query.filter(ExpenseCategory.is_active.is_(True))
    return query.order_by(ExpenseCategory.name).all()


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    category = ExpenseCategory(family_id=current.family_id, **payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(category_id: int, payload: CategoryUpdate, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id, ExpenseCategory.family_id == current.family_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(category, key, value)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, current: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id, ExpenseCategory.family_id == current.family_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    category.is_active = False
    db.commit()

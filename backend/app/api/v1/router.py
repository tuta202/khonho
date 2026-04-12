from fastapi import APIRouter

from app.api.v1 import auth, dashboard, products, reports, suppliers, transactions, users, warehouses

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
# NOTE: /users/me/password must be declared BEFORE /{id} in users.py
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(products.router, prefix="/products", tags=["products"])
router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
# NOTE: /warehouses/summary must be declared BEFORE /{warehouse_id} in warehouses.py
router.include_router(warehouses.router, prefix="/warehouses", tags=["warehouses"])
# NOTE: /transactions/import|export|transfer must be declared BEFORE /{id} in transactions.py
router.include_router(transactions.router, prefix="/transactions", tags=["transactions"])
router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
router.include_router(reports.router, prefix="/reports", tags=["reports"])

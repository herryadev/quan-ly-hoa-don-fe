# Inventory Frontend

Frontend Next.js de goi cac API quan ly kho:

- `GET/POST /api/items`
- `GET/POST /api/partners`
- `GET/POST /api/warehouses`
- `GET/POST /api/receipts`

## Setup

1. Tao file `.env.local`:

```bash
cp .env.local.example .env.local
```

2. Chinh `NEXT_PUBLIC_API_BASE_URL` tro den backend (mac dinh: `http://localhost:3000/api`).

3. Chay frontend:

```bash
pnpm dev
```

4. Mo `http://localhost:3001` (hoac port Next.js hien thi tren terminal).

## Chuc nang da co

- Dashboard tong quan so luong ban ghi.
- Form tao nhanh `Item`, `Partner`, `Warehouse`.
- Form tao `Receipt` (1 dong item).
- Danh sach ban ghi moi nhat de theo doi ket qua goi API.

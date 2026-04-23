/* eslint-disable react-hooks/purity */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ApiEnvelope<T> = { success: boolean; message: string; data: T };
type Paginated<T> = { page: number; limit: number; total: number; totalPages: number; items: T[] };
type Item = { id: number; code: string; name: string; unit: string; description?: string | null };
type Partner = { id: number; name: string; phone?: string | null; address?: string | null };
type Warehouse = { id: number; name: string; location?: string | null };
type Receipt = {
  id: number;
  receiptCode: string;
  receiptDate: string;
  totalAmount: number;
  note?: string | null;
  warehouseName?: string;
  partnerName?: string;
};
type ReceiptDetailItem = {
  id: number;
  quantityDocument: number;
  quantityActual: number;
  unitPrice: number;
  totalPrice: number;
  item: { id: number; code: string; name: string; unit: string } | null;
};
type ReceiptDetail = {
  id: number;
  receiptCode: string;
  receiptDate: string;
  totalAmount: number;
  note?: string | null;
  warehouse: { id: number; name: string; location?: string | null } | null;
  partner: { id: number; name: string; phone?: string | null; address?: string | null } | null;
  receiptItems: ReceiptDetailItem[];
};
type DeleteKind = "item" | "partner" | "warehouse";
type DeleteConfirmState = { kind: DeleteKind; id: number; label: string } | null;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api";
const inputClassName =
  "rounded border border-gray-300 bg-white px-3 py-2 text-black placeholder:text-gray-500 focus:border-black focus:outline-none";
const buttonClassName =
  "rounded border border-black bg-black px-3 py-2 font-medium text-white transition hover:bg-white hover:text-black";

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "API request failed");
  }
  return payload;
}

export default function Home() {
  const now = new Date();
  const printDate = {
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
  const [items, setItems] = useState<Item[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [status, setStatus] = useState("Ready");
  const [exportingReceiptId, setExportingReceiptId] = useState<number | null>(null);
  const [deletingEntityKey, setDeletingEntityKey] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>(null);

  const [itemForm, setItemForm] = useState({ code: "", name: "", unit: "", description: "" });
  const [partnerForm, setPartnerForm] = useState({ name: "", phone: "", address: "" });
  const [warehouseForm, setWarehouseForm] = useState({ name: "", location: "" });
  const [receiptForm, setReceiptForm] = useState({
    warehouseId: "",
    partnerId: "",
    note: "",
    itemId: "",
    quantityDocument: "0",
    quantityActual: "0",
    unitPrice: "0",
  });

  const reloadAll = async () => {
    try {
      setStatus("Loading data...");
      const [itemRes, partnerRes, warehouseRes, receiptRes] = await Promise.all([
        request<Paginated<Item>>("/items?page=1&limit=20"),
        request<Paginated<Partner>>("/partners?page=1&limit=20"),
        request<Paginated<Warehouse>>("/warehouses?page=1&limit=20"),
        request<Paginated<Receipt>>("/receipts?page=1&limit=20"),
      ]);
      setItems(itemRes.data.items);
      setPartners(partnerRes.data.items);
      setWarehouses(warehouseRes.data.items);
      setReceipts(receiptRes.data.items);
      setStatus("Data synced");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to load");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadAll();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Items", value: items.length },
      { label: "Partners", value: partners.length },
      { label: "Warehouses", value: warehouses.length },
      { label: "Receipts", value: receipts.length },
    ],
    [items.length, partners.length, receipts.length, warehouses.length]
  );

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request<Item>("/items", { method: "POST", body: JSON.stringify(itemForm) });
      setItemForm({ code: "", name: "", unit: "", description: "" });
      await reloadAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create item failed");
    }
  };

  const submitPartner = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request<Partner>("/partners", { method: "POST", body: JSON.stringify(partnerForm) });
      setPartnerForm({ name: "", phone: "", address: "" });
      await reloadAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create partner failed");
    }
  };

  const submitWarehouse = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request<Warehouse>("/warehouses", { method: "POST", body: JSON.stringify(warehouseForm) });
      setWarehouseForm({ name: "", location: "" });
      await reloadAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create warehouse failed");
    }
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await request<Receipt>("/receipts", {
        method: "POST",
        body: JSON.stringify({
          warehouseId: Number(receiptForm.warehouseId),
          partnerId: Number(receiptForm.partnerId),
          note: receiptForm.note || null,
          items: [
            {
              itemId: Number(receiptForm.itemId),
              quantityDocument: Number(receiptForm.quantityDocument),
              quantityActual: Number(receiptForm.quantityActual),
              unitPrice: Number(receiptForm.unitPrice),
            },
          ],
        }),
      });
      setReceiptForm({
        warehouseId: "",
        partnerId: "",
        note: "",
        itemId: "",
        quantityDocument: "0",
        quantityActual: "0",
        unitPrice: "0",
      });
      await reloadAll();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Create receipt failed");
    }
  };

  const openDeleteConfirm = (kind: DeleteKind, id: number, label: string) => {
    setDeleteConfirm({ kind, id, label });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    const { kind, id, label } = deleteConfirm;
    const endpointMap: Record<DeleteKind, string> = {
      item: "/items",
      partner: "/partners",
      warehouse: "/warehouses",
    };

    try {
      setDeletingEntityKey(`${kind}-${id}`);
      setStatus(`Dang xoa ${label}...`);
      await request<null>(`${endpointMap[kind]}/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await reloadAll();
      setStatus(`Da xoa ${label}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Delete failed");
    } finally {
      setDeletingEntityKey(null);
    }
  };

  const toNumberText = (value: number) => Number(value || 0).toLocaleString("vi-VN");
  const escapeHtml = (text?: string | null) =>
    (text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const exportReceiptPdf = async (receiptId: number) => {
    try {
      setExportingReceiptId(receiptId);
      setStatus("Dang tao file PDF...");
      const receiptRes = await request<ReceiptDetail>(`/receipts/${receiptId}`);
      const receipt = receiptRes.data;
      const receiptDate = new Date(receipt.receiptDate || Date.now());
      const rows = receipt.receiptItems
        .map((line, index) => {
          const itemLabel = line.item
            ? `${escapeHtml(line.item.name)} (${escapeHtml(line.item.code)})`
            : "Khong co du lieu";
          return `
            <tr>
              <td class="center">${index + 1}</td>
              <td>${itemLabel}</td>
              <td>${escapeHtml(line.item?.code || "")}</td>
              <td>${escapeHtml(line.item?.unit || "")}</td>
              <td class="right">${toNumberText(line.quantityDocument)}</td>
              <td class="right">${toNumberText(line.quantityActual)}</td>
              <td class="right">${toNumberText(line.unitPrice)}</td>
              <td class="right">${toNumberText(line.totalPrice)}</td>
            </tr>
          `;
        })
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(receipt.receiptCode)}</title>
            <style>
              * { box-sizing: border-box; font-family: "Times New Roman", serif; }
              body { margin: 16px; color: #000; }
              .top { display: flex; justify-content: space-between; gap: 16px; }
              .muted { font-size: 13px; line-height: 1.5; }
              .title { text-align: center; margin-top: 16px; }
              .title h1 { margin: 0; font-size: 28px; letter-spacing: 1px; }
              .title p { margin: 6px 0 0; font-size: 18px; }
              .meta { margin-top: 16px; font-size: 16px; line-height: 1.5; }
              table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 14px; }
              th, td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
              th { text-align: center; }
              .right { text-align: right; }
              .center { text-align: center; }
              .total { margin-top: 10px; font-size: 16px; }
              .sign { margin-top: 30px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
              .sign-item { text-align: center; font-size: 15px; min-height: 82px; }
              .sign-item b { display: block; margin-bottom: 6px; }
              @media print {
                @page { size: A4 portrait; margin: 10mm; }
                body { margin: 0; }
              }
            </style>
          </head>
          <body>
            <div class="top">
              <div class="muted">
                <div>Don vi: ..................................................</div>
                <div>Bo phan: ................................................</div>
              </div>
              <div class="muted" style="text-align:right">
                <div><b>Mau so 01 - VT</b></div>
                <div>(Ban hanh theo Thong tu 200/2014/TT-BTC)</div>
              </div>
            </div>

            <div class="title">
              <h1>PHIEU NHAP KHO</h1>
              <p>Ngay ${receiptDate.getDate()} thang ${receiptDate.getMonth() + 1} nam ${receiptDate.getFullYear()}</p>
            </div>

            <div class="meta">
              <div>So: <b>${escapeHtml(receipt.receiptCode)}</b></div>
              <div>Ho va ten nguoi giao: ${escapeHtml(receipt.partner?.name || "")}</div>
              <div>Nhap tai kho: ${escapeHtml(receipt.warehouse?.name || "")}</div>
              <div>Dia diem: ${escapeHtml(receipt.warehouse?.location || "")}</div>
              <div>Ghi chu: ${escapeHtml(receipt.note || "")}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ten, nhan hieu, quy cach</th>
                  <th>Ma so</th>
                  <th>Don vi tinh</th>
                  <th>Theo chung tu</th>
                  <th>Thuc nhap</th>
                  <th>Don gia</th>
                  <th>Thanh tien</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td class="center" colspan="8">Khong co du lieu</td></tr>'}
              </tbody>
            </table>

            <div class="total"><b>Tong so tien:</b> ${toNumberText(receipt.totalAmount)} VND</div>

            <div class="sign">
              <div class="sign-item"><b>Nguoi lap phieu</b><i>(Ky, ho ten)</i></div>
              <div class="sign-item"><b>Nguoi giao hang</b><i>(Ky, ho ten)</i></div>
              <div class="sign-item"><b>Thu kho</b><i>(Ky, ho ten)</i></div>
              <div class="sign-item"><b>Ke toan truong</b><i>(Ky, ho ten)</i></div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank", "width=1024,height=768");
      if (!printWindow) {
        throw new Error("Khong mo duoc cua so in. Hay cho phep popup va thu lai.");
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setStatus(`Da mo hop thoai PDF cho ${receipt.receiptCode}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Xuat PDF that bai");
    } finally {
      setExportingReceiptId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 text-black">
      <h1 className="text-3xl font-semibold text-black">Inventory API Dashboard</h1>
      <p className="mt-1 text-sm text-gray-700">Base URL: {API_BASE_URL}</p>
      <p className="mt-1 text-sm font-medium text-black">{status}</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">{stat.label}</p>
            <p className="text-2xl font-semibold text-black">{stat.value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitItem} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Create Item</h2>
          <div className="mt-3 grid gap-2">
            <input className={inputClassName} placeholder="Code" value={itemForm.code} onChange={(e) => setItemForm((s) => ({ ...s, code: e.target.value }))} required />
            <input className={inputClassName} placeholder="Name" value={itemForm.name} onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))} required />
            <input className={inputClassName} placeholder="Unit" value={itemForm.unit} onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))} required />
            <textarea className={inputClassName} placeholder="Description" value={itemForm.description} onChange={(e) => setItemForm((s) => ({ ...s, description: e.target.value }))} />
            <button className={buttonClassName} type="submit">Add Item</button>
          </div>
        </form>

        <form onSubmit={submitPartner} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Create Partner</h2>
          <div className="mt-3 grid gap-2">
            <input className={inputClassName} placeholder="Name" value={partnerForm.name} onChange={(e) => setPartnerForm((s) => ({ ...s, name: e.target.value }))} required />
            <input className={inputClassName} placeholder="Phone" value={partnerForm.phone} onChange={(e) => setPartnerForm((s) => ({ ...s, phone: e.target.value }))} />
            <input className={inputClassName} placeholder="Address" value={partnerForm.address} onChange={(e) => setPartnerForm((s) => ({ ...s, address: e.target.value }))} />
            <button className={buttonClassName} type="submit">Add Partner</button>
          </div>
        </form>

        <form onSubmit={submitWarehouse} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Create Warehouse</h2>
          <div className="mt-3 grid gap-2">
            <input className={inputClassName} placeholder="Name" value={warehouseForm.name} onChange={(e) => setWarehouseForm((s) => ({ ...s, name: e.target.value }))} required />
            <input className={inputClassName} placeholder="Location" value={warehouseForm.location} onChange={(e) => setWarehouseForm((s) => ({ ...s, location: e.target.value }))} />
            <button className={buttonClassName} type="submit">Add Warehouse</button>
          </div>
        </form>

        <form onSubmit={submitReceipt} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Create Receipt</h2>
          <p className="mt-2 text-sm text-gray-700">
            Print date: Ngày {printDate.day} tháng {printDate.month} năm {printDate.year}
          </p>
          <div className="mt-3 grid gap-2">
            <select className={inputClassName} value={receiptForm.warehouseId} onChange={(e) => setReceiptForm((s) => ({ ...s, warehouseId: e.target.value }))} required>
              <option value="">Warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
            <select className={inputClassName} value={receiptForm.partnerId} onChange={(e) => setReceiptForm((s) => ({ ...s, partnerId: e.target.value }))} required>
              <option value="">Partner</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </select>
            <select className={inputClassName} value={receiptForm.itemId} onChange={(e) => setReceiptForm((s) => ({ ...s, itemId: e.target.value }))} required>
              <option value="">Item</option>
              {items.map((item) => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
            </select>
            <input className={inputClassName} placeholder="Quantity document" type="number" step="0.01" value={receiptForm.quantityDocument} onChange={(e) => setReceiptForm((s) => ({ ...s, quantityDocument: e.target.value }))} required />
            <input className={inputClassName} placeholder="Quantity actual" type="number" step="0.01" value={receiptForm.quantityActual} onChange={(e) => setReceiptForm((s) => ({ ...s, quantityActual: e.target.value }))} required />
            <input className={inputClassName} placeholder="Unit price" type="number" step="0.01" value={receiptForm.unitPrice} onChange={(e) => setReceiptForm((s) => ({ ...s, unitPrice: e.target.value }))} required />
            <textarea className={inputClassName} placeholder="Note" value={receiptForm.note} onChange={(e) => setReceiptForm((s) => ({ ...s, note: e.target.value }))} />
            <button className={buttonClassName} type="submit">Add Receipt</button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-gray-300 bg-white p-6">
        <h2 className="mt-4 text-center text-2xl font-bold uppercase">Phieu nhap kho</h2>
        <p className="mt-2 text-center text-base">
          Ngay {printDate.day} thang {printDate.month} nam {printDate.year}
        </p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ListCard
          title="Latest Items"
          rows={items.map((item) => ({
            id: item.id,
            label: `${item.code} - ${item.name} (${item.unit})`,
            deleting: deletingEntityKey === `item-${item.id}`,
          }))}
          onDelete={(row) => openDeleteConfirm("item", row.id, row.label)}
        />
        <ListCard
          title="Latest Partners"
          rows={partners.map((partner) => ({
            id: partner.id,
            label: `${partner.name} (${partner.phone || "n/a"})`,
            deleting: deletingEntityKey === `partner-${partner.id}`,
          }))}
          onDelete={(row) => openDeleteConfirm("partner", row.id, row.label)}
        />
        <ListCard
          title="Latest Warehouses"
          rows={warehouses.map((warehouse) => ({
            id: warehouse.id,
            label: `${warehouse.name} - ${warehouse.location || "n/a"}`,
            deleting: deletingEntityKey === `warehouse-${warehouse.id}`,
          }))}
          onDelete={(row) => openDeleteConfirm("warehouse", row.id, row.label)}
        />
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-lg font-semibold">Latest Receipts</h3>
          {receipts.length === 0 ? (
            <p className="mt-2 text-sm text-gray-700">No data yet</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {receipts.slice(0, 8).map((receipt) => (
                <li key={receipt.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-2">
                  <span>{receipt.receiptCode} - {Number(receipt.totalAmount).toLocaleString()} VND</span>
                  <button
                    type="button"
                    className="rounded border border-black px-2 py-1 text-xs font-medium transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => void exportReceiptPdf(receipt.id)}
                    disabled={exportingReceiptId === receipt.id}
                  >
                    {exportingReceiptId === receipt.id ? "Dang xuat..." : "Xuat PDF"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {deleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-black">Xac nhan xoa</h3>
            <p className="mt-2 text-sm text-gray-700">
              Ban co chac muon xoa <b>{deleteConfirm.label}</b> khong?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100"
                onClick={() => setDeleteConfirm(null)}
                disabled={Boolean(deletingEntityKey)}
              >
                Huy
              </button>
              <button
                type="button"
                className="rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void confirmDelete()}
                disabled={Boolean(deletingEntityKey)}
              >
                {deletingEntityKey ? "Dang xoa..." : "Xoa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ListCard({
  title,
  rows,
  onDelete,
}: {
  title: string;
  rows: { id: number; label: string; deleting?: boolean }[];
  onDelete?: (row: { id: number; label: string }) => void;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-gray-700">No data yet</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {rows.slice(0, 8).map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 rounded bg-gray-50 px-2 py-2">
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
              {onDelete ? (
                <button
                  type="button"
                  className="rounded border border-red-600 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onDelete({ id: row.id, label: row.label })}
                  disabled={Boolean(row.deleting)}
                >
                  {row.deleting ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

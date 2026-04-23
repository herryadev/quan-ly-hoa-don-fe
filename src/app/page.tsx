/* eslint-disable react-hooks/purity */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

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
const tableShellClass = "overflow-x-auto rounded border border-gray-200";
const dataTableClass = "w-full min-w-[280px] border-collapse text-sm";
const dataThClass =
  "border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-700";
const dataTdClass = "border-b border-gray-100 px-3 py-2 align-middle text-gray-900";
const formTableClass = "mt-3 w-full border-collapse text-sm";
const formLabelCellClass =
  "w-[150px] max-w-[38%] border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-800 align-middle whitespace-nowrap";
const formFieldCellClass = "border border-gray-200 px-3 py-2 align-middle";

async function request<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Yêu cầu API thất bại");
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
  const [status, setStatus] = useState("Sẵn sàng");
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
      setStatus("Đang tải dữ liệu...");
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
      setStatus("Đã đồng bộ dữ liệu");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tải dữ liệu thất bại");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadAll();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Vật tư", value: items.length },
      { label: "Đối tác", value: partners.length },
      { label: "Kho", value: warehouses.length },
      { label: "Phiếu nhập", value: receipts.length },
    ],
    [items.length, partners.length, receipts.length, warehouses.length]
  );

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const createdName = itemForm.name;
      await request<Item>("/items", { method: "POST", body: JSON.stringify(itemForm) });
      setItemForm({ code: "", name: "", unit: "", description: "" });
      await reloadAll();
      toast.success(`Đã tạo vật tư "${createdName}" thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tạo vật tư thất bại");
    }
  };

  const submitPartner = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const createdName = partnerForm.name;
      await request<Partner>("/partners", { method: "POST", body: JSON.stringify(partnerForm) });
      setPartnerForm({ name: "", phone: "", address: "" });
      await reloadAll();
      toast.success(`Đã tạo đối tác "${createdName}" thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tạo đối tác thất bại");
    }
  };

  const submitWarehouse = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const createdName = warehouseForm.name;
      await request<Warehouse>("/warehouses", { method: "POST", body: JSON.stringify(warehouseForm) });
      setWarehouseForm({ name: "", location: "" });
      await reloadAll();
      toast.success(`Đã tạo kho "${createdName}" thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tạo kho thất bại");
    }
  };

  const submitReceipt = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const res = await request<Receipt>("/receipts", {
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
      toast.success(`Đã tạo phiếu nhập ${res.data.receiptCode} thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tạo phiếu nhập thất bại");
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
      setStatus(`Đang xóa ${label}...`);
      await request<null>(`${endpointMap[kind]}/${id}`, { method: "DELETE" });
      setDeleteConfirm(null);
      await reloadAll();
      setStatus(`Đã xóa ${label}`);
      toast.success(`Đã xóa ${label} thành công.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Xóa thất bại");
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
      setStatus("Đang tạo file PDF...");
      const receiptRes = await request<ReceiptDetail>(`/receipts/${receiptId}`);
      const receipt = receiptRes.data;
      const receiptDate = new Date(receipt.receiptDate || Date.now());
      const rows = receipt.receiptItems
        .map((line, index) => {
          const itemLabel = line.item
            ? `${escapeHtml(line.item.name)} (${escapeHtml(line.item.code)})`
            : "Không có dữ liệu";
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
                <div>Đơn vị: ..................................................</div>
                <div>Bộ phận: ................................................</div>
              </div>
              <div class="muted" style="text-align:right">
                <div><b>Mẫu số 01 - VT</b></div>
                <div>(Ban hành theo Thông tư 200/2014/TT-BTC)</div>
              </div>
            </div>

            <div class="title">
              <h1>PHIẾU NHẬP KHO</h1>
              <p>Ngày ${receiptDate.getDate()} tháng ${receiptDate.getMonth() + 1} năm ${receiptDate.getFullYear()}</p>
            </div>

            <div class="meta">
              <div>Số: <b>${escapeHtml(receipt.receiptCode)}</b></div>
              <div>Họ và tên người giao: ${escapeHtml(receipt.partner?.name || "")}</div>
              <div>Nhập tại kho: ${escapeHtml(receipt.warehouse?.name || "")}</div>
              <div>Địa điểm: ${escapeHtml(receipt.warehouse?.location || "")}</div>
              <div>Ghi chú: ${escapeHtml(receipt.note || "")}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên, nhãn hiệu, quy cách</th>
                  <th>Mã số</th>
                  <th>Đơn vị tính</th>
                  <th>Theo chứng từ</th>
                  <th>Thực nhập</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${rows || '<tr><td class="center" colspan="8">Không có dữ liệu</td></tr>'}
              </tbody>
            </table>

            <div class="total"><b>Tổng số tiền:</b> ${toNumberText(receipt.totalAmount)} VND</div>

            <div class="sign">
              <div class="sign-item"><b>Người lập phiếu</b><i>(Ký, họ tên)</i></div>
              <div class="sign-item"><b>Người giao hàng</b><i>(Ký, họ tên)</i></div>
              <div class="sign-item"><b>Thủ kho</b><i>(Ký, họ tên)</i></div>
              <div class="sign-item"><b>Kế toán trưởng</b><i>(Ký, họ tên)</i></div>
            </div>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank", "width=1024,height=768");
      if (!printWindow) {
        throw new Error("Không mở được cửa sổ in. Hãy cho phép popup và thử lại.");
      }
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      setStatus(`Đã mở hộp thoại in cho ${receipt.receiptCode}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Xuất PDF thất bại");
    } finally {
      setExportingReceiptId(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8 text-black">
      <h1 className="text-3xl font-semibold text-black">Bảng điều khiển quản lý kho</h1>
      <p className="mt-1 text-sm text-gray-700">Địa chỉ API: {API_BASE_URL}</p>
      <p className="mt-1 text-sm font-medium text-black">{status}</p>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Tổng quan</h2>
        <div className={`${tableShellClass} mt-3`}>
          <table className={dataTableClass}>
            <thead>
              <tr>
                {stats.map((stat) => (
                  <th key={stat.label} className={dataThClass}>
                    {stat.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {stats.map((stat) => (
                  <td key={stat.label} className={`${dataTdClass} text-xl font-semibold`}>
                    {stat.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitItem} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Thêm vật tư</h2>
          <table className={formTableClass}>
            <tbody>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Mã
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={itemForm.code} onChange={(e) => setItemForm((s) => ({ ...s, code: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Tên
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={itemForm.name} onChange={(e) => setItemForm((s) => ({ ...s, name: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Đơn vị tính
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={itemForm.unit} onChange={(e) => setItemForm((s) => ({ ...s, unit: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Mô tả
                </th>
                <td className={formFieldCellClass}>
                  <textarea className={`${inputClassName} w-full`} rows={3} value={itemForm.description} onChange={(e) => setItemForm((s) => ({ ...s, description: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-200 bg-gray-50/50 px-3 py-3 text-right">
                  <button className={buttonClassName} type="submit">
                    Thêm vật tư
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>

        <form onSubmit={submitPartner} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Thêm đối tác</h2>
          <table className={formTableClass}>
            <tbody>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Tên
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={partnerForm.name} onChange={(e) => setPartnerForm((s) => ({ ...s, name: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Số điện thoại
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={partnerForm.phone} onChange={(e) => setPartnerForm((s) => ({ ...s, phone: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Địa chỉ
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={partnerForm.address} onChange={(e) => setPartnerForm((s) => ({ ...s, address: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-200 bg-gray-50/50 px-3 py-3 text-right">
                  <button className={buttonClassName} type="submit">
                    Thêm đối tác
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>

        <form onSubmit={submitWarehouse} className="rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-lg font-semibold">Thêm kho</h2>
          <table className={formTableClass}>
            <tbody>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Tên kho
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={warehouseForm.name} onChange={(e) => setWarehouseForm((s) => ({ ...s, name: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Vị trí / địa điểm
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} value={warehouseForm.location} onChange={(e) => setWarehouseForm((s) => ({ ...s, location: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-200 bg-gray-50/50 px-3 py-3 text-right">
                  <button className={buttonClassName} type="submit">
                    Thêm kho
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>

        <form onSubmit={submitReceipt} className="rounded-lg border border-gray-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Tạo phiếu nhập</h2>
          <p className="mt-2 text-sm text-gray-700">
            Ngày in: Ngày {printDate.day} tháng {printDate.month} năm {printDate.year}
          </p>
          <table className={formTableClass}>
            <tbody>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Kho
                </th>
                <td className={formFieldCellClass}>
                  <select className={`${inputClassName} w-full`} value={receiptForm.warehouseId} onChange={(e) => setReceiptForm((s) => ({ ...s, warehouseId: e.target.value }))} required>
                    <option value="">Chọn kho</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Đối tác
                </th>
                <td className={formFieldCellClass}>
                  <select className={`${inputClassName} w-full`} value={receiptForm.partnerId} onChange={(e) => setReceiptForm((s) => ({ ...s, partnerId: e.target.value }))} required>
                    <option value="">Chọn đối tác</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Vật tư
                </th>
                <td className={formFieldCellClass}>
                  <select className={`${inputClassName} w-full`} value={receiptForm.itemId} onChange={(e) => setReceiptForm((s) => ({ ...s, itemId: e.target.value }))} required>
                    <option value="">Chọn vật tư</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  SL theo chứng từ
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} type="number" step="0.01" value={receiptForm.quantityDocument} onChange={(e) => setReceiptForm((s) => ({ ...s, quantityDocument: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  SL thực nhập
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} type="number" step="0.01" value={receiptForm.quantityActual} onChange={(e) => setReceiptForm((s) => ({ ...s, quantityActual: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Đơn giá
                </th>
                <td className={formFieldCellClass}>
                  <input className={`${inputClassName} w-full`} type="number" step="0.01" value={receiptForm.unitPrice} onChange={(e) => setReceiptForm((s) => ({ ...s, unitPrice: e.target.value }))} required />
                </td>
              </tr>
              <tr>
                <th scope="row" className={formLabelCellClass}>
                  Ghi chú
                </th>
                <td className={formFieldCellClass}>
                  <textarea className={`${inputClassName} w-full`} rows={2} value={receiptForm.note} onChange={(e) => setReceiptForm((s) => ({ ...s, note: e.target.value }))} />
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="border border-gray-200 bg-gray-50/50 px-3 py-3 text-right">
                  <button className={buttonClassName} type="submit">
                    Tạo phiếu nhập
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-gray-300 bg-white p-6">
        <h2 className="mt-4 text-center text-2xl font-bold uppercase">Phiếu nhập kho</h2>
        <p className="mt-2 text-center text-base">
          Ngày {printDate.day} tháng {printDate.month} năm {printDate.year}
        </p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Vật tư gần đây"
          headers={["Mã", "Tên", "ĐVT"]}
          rows={items.slice(0, 8).map((item) => ({
            id: item.id,
            cells: [item.code, item.name, item.unit],
            label: `${item.code} - ${item.name} (${item.unit})`,
            deleting: deletingEntityKey === `item-${item.id}`,
          }))}
          onDelete={(row) => openDeleteConfirm("item", row.id, row.label)}
        />
        <DataTable
          title="Đối tác gần đây"
          headers={["Tên", "Số điện thoại", "Địa chỉ"]}
          rows={partners.slice(0, 8).map((partner) => ({
            id: partner.id,
            cells: [partner.name, partner.phone || "—", partner.address || "—"],
            label: `${partner.name} (${partner.phone || "—"})`,
            deleting: deletingEntityKey === `partner-${partner.id}`,
          }))}
          onDelete={(row) => openDeleteConfirm("partner", row.id, row.label)}
        />
        <DataTable
          title="Kho gần đây"
          headers={["Tên kho", "Vị trí"]}
          rows={warehouses.slice(0, 8).map((warehouse) => ({
            id: warehouse.id,
            cells: [warehouse.name, warehouse.location || "—"],
            label: `${warehouse.name} - ${warehouse.location || "—"}`,
            deleting: deletingEntityKey === `warehouse-${warehouse.id}`,
          }))}
          onDelete={(row) => openDeleteConfirm("warehouse", row.id, row.label)}
        />
        <article className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-lg font-semibold">Phiếu nhập gần đây</h3>
          <div className={`${tableShellClass} mt-3`}>
            {receipts.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-700">Chưa có dữ liệu</p>
            ) : (
              <table className={dataTableClass}>
                <thead>
                  <tr>
                    <th className={dataThClass}>STT</th>
                    <th className={dataThClass}>Mã phiếu</th>
                    <th className={`${dataThClass} text-right`}>Tổng tiền (VND)</th>
                    <th className={`${dataThClass} w-[120px]`}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.slice(0, 8).map((receipt, index) => (
                    <tr key={receipt.id}>
                      <td className={dataTdClass}>{index + 1}</td>
                      <td className={`${dataTdClass} font-medium`}>{receipt.receiptCode}</td>
                      <td className={`${dataTdClass} text-right tabular-nums`}>{Number(receipt.totalAmount).toLocaleString("vi-VN")}</td>
                      <td className={dataTdClass}>
                        <button
                          type="button"
                          className="rounded border border-black px-2 py-1 text-xs font-medium transition hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          onClick={() => void exportReceiptPdf(receipt.id)}
                          disabled={exportingReceiptId === receipt.id}
                        >
                          {exportingReceiptId === receipt.id ? "Đang xuất..." : "Xuất PDF"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>
      </section>

      {deleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-4 shadow-lg">
            <h3 className="text-lg font-semibold text-black">Xác nhận xóa</h3>
            <p className="mt-2 text-sm text-gray-700">
              Bạn có chắc muốn xóa <b>{deleteConfirm.label}</b> không?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-100"
                onClick={() => setDeleteConfirm(null)}
                disabled={Boolean(deletingEntityKey)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded border border-red-600 bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-white hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => void confirmDelete()}
                disabled={Boolean(deletingEntityKey)}
              >
                {deletingEntityKey ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

type DataTableRow = { id: number; cells: string[]; label: string; deleting?: boolean };

function DataTable({
  title,
  headers,
  rows,
  onDelete,
}: {
  title: string;
  headers: string[];
  rows: DataTableRow[];
  onDelete?: (row: { id: number; label: string }) => void;
}) {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className={`${tableShellClass} mt-3`}>
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-700">Chưa có dữ liệu</p>
        ) : (
          <table className={dataTableClass}>
            <thead>
              <tr>
                <th className={`${dataThClass} w-12`}>STT</th>
                {headers.map((header) => (
                  <th key={header} className={dataThClass}>
                    {header}
                  </th>
                ))}
                {onDelete ? <th className={`${dataThClass} w-[88px]`}>Thao tác</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className={dataTdClass}>{index + 1}</td>
                  {row.cells.map((cell, i) => (
                    <td key={i} className={`${dataTdClass} max-w-[200px] truncate`} title={cell}>
                      {cell}
                    </td>
                  ))}
                  {onDelete ? (
                    <td className={dataTdClass}>
                      <button
                        type="button"
                        className="rounded border border-red-600 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => onDelete({ id: row.id, label: row.label })}
                        disabled={Boolean(row.deleting)}
                      >
                        {row.deleting ? "Đang xóa..." : "Xóa"}
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </article>
  );
}

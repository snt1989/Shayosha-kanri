'use client';

import { useRef, useState } from 'react';
import { AppData, Driver } from '@/lib/types';
import { previewEmpId } from '@/lib/empId';
import { genId } from '@/lib/utils';
import { loadTesseract } from '@/lib/ocr';
import Modal from './Modal';

function extractFields(text: string) {
  const result: Partial<Driver> = {};
  const norm = text.replace(/\s+/g, ' ');

  const nameMatch = norm.match(/氏名[\s:：]*([一-龠ぁ-んァ-ヶー]{1,4})[\s　]+([一-龠ぁ-んァ-ヶー]{1,6})/);
  if (nameMatch) {
    result.lastName = nameMatch[1];
    result.firstName = nameMatch[2];
  }

  const licenseNoMatch = norm.match(/第?\s*(\d{10,12})\s*号?/);
  if (licenseNoMatch) {
    result.licenseNo = `第${licenseNoMatch[1]}号`;
  }

  const dateMatches = [...norm.matchAll(/(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})/g)];
  if (dateMatches.length > 0) {
    const last = dateMatches[dateMatches.length - 1];
    const y = last[1];
    const m = last[2].padStart(2, '0');
    const d = last[3].padStart(2, '0');
    result.licenseExpiry = `${y}-${m}-${d}`;
  }

  return result;
}

export default function DriverOcrModal({
  data,
  onClose,
  onSave,
}: {
  data: AppData;
  onClose: () => void;
  onSave: (d: Driver) => Promise<unknown>;
}) {
  const [photo, setPhoto] = useState<string>('');
  const [ocrText, setOcrText] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<Driver>({
    id: '',
    lastName: '',
    firstName: '',
    empId: '',
    dept: data.masters.departments[0] || '',
    licenseType: data.masters.licenseTypes[0] || '',
    licenseExpiry: '',
    phone: '',
    licenseNo: '',
    notes: '本人登録（OCR）',
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function runOcr() {
    if (!photo) return;
    setRunning(true);
    setProgress(0);
    setOcrText('');
    try {
      const Tesseract = await loadTesseract();
      const res = await Tesseract.recognize(photo, 'jpn+eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      const text = res?.data?.text || '';
      setOcrText(text);
      const extracted = extractFields(text);
      setForm((f) => ({ ...f, ...extracted }));
    } catch (e) {
      alert('OCR処理に失敗しました。手入力で登録してください。');
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    if (!form.lastName || !form.firstName) {
      alert('氏名（姓・名）は必須です。OCRで読み取れなかった場合は手入力してください。');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, id: form.id || genId('d') });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="免許証写真で自動登録（本人登録）"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            キャンセル
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中…' : 'この内容で登録する'}
          </button>
        </>
      }
    >
      <div className="notice-box">
        写真から氏名・免許証番号・有効期限の自動読み取りを試みます（ブラウザ内でOCR処理、外部送信なし）。読み取り精度は写真の状態により変動するため、登録前に必ず内容をご確認・修正してください。
      </div>

      {!photo ? (
        <div className="photo-drop" onClick={() => fileRef.current?.click()}>
          📷 タップして免許証の写真をアップロード
        </div>
      ) : (
        <div>
          <img src={photo} alt="免許証プレビュー" className="photo-preview" />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn btn-sm" onClick={() => fileRef.current?.click()}>
              写真を変更
            </button>
            <button className="btn btn-sm btn-primary" onClick={runOcr} disabled={running}>
              {running ? `解析中…${progress}%` : '🔍 OCRで読み取る'}
            </button>
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0] || null)} />

      {ocrText && (
        <>
          <div className="section-heading">OCR読み取り結果（テキスト）</div>
          <div className="ocr-text-preview">{ocrText.trim() || '(テキストを検出できませんでした)'}</div>
        </>
      )}

      <div className="section-heading">登録内容の確認・修正</div>
      <div className="field-row">
        <div className="field">
          <label>氏名（姓）</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
        </div>
        <div className="field">
          <label>氏名（名）</label>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>社員番号</label>
          <input
            value={form.empId}
            placeholder={`空欄で自動採番（${previewEmpId(data)}）`}
            onChange={(e) => setForm({ ...form, empId: e.target.value })}
          />
        </div>
        <div className="field">
          <label>所属事業部</label>
          <select value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })}>
            {data.masters.departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>免許種別</label>
          <select value={form.licenseType} onChange={(e) => setForm({ ...form, licenseType: e.target.value })}>
            {data.masters.licenseTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>免許更新期日</label>
          <input type="date" value={form.licenseExpiry} onChange={(e) => setForm({ ...form, licenseExpiry: e.target.value })} />
        </div>
      </div>
      <div className="field-row">
        <div className="field">
          <label>連絡先電話番号</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <label>免許証番号</label>
          <input value={form.licenseNo} onChange={(e) => setForm({ ...form, licenseNo: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}

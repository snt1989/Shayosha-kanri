export type MaintRecord = {
  date: string;
  type: string;
  km: number;
  note: string;
  // 整備台帳で記録する任意項目（既存データには無いので optional）
  cost?: number;
  shop?: string;
};

export type Report = {
  id: string;
  date: string;
  dept: string;
  driverId?: string;
  driverLast: string;
  driverFirst: string;
  driver: string;
  vehicleId: string;
  vehicleName: string;
  plate: string;
  destination: string;
  purpose: string;
  preTime: string;
  preAlcohol: string;
  preChecker: string;
  preMethod?: string;
  alcoholSkipped?: boolean;
  tireOk: boolean;
  brakeOk: boolean;
  postDone: boolean;
  postTime: string;
  postAlcohol: string;
  postChecker: string;
  postMethod?: string;
  startKm: number;
  endKm: number;
  tripKm: number;
  notes: string;
  inspectionPhoto?: string;
  // 帰着登録時の整備依頼（既存の日報には無いので optional）
  maintRequest?: boolean;
  maintRequestType?: string;
  maintRequestUrgency?: string;
  maintRequestNote?: string;
  // 整備台帳で対応を記録すると true（対応待ち → 対応済）
  maintRequestDone?: boolean;
  maintRequestDoneAt?: string;
};

export const MAINT_URGENCIES = ['通常', '早めに', '至急（使用不可）'] as const;

export type Vehicle = {
  id: string;
  name: string;
  plate: string;
  modelType: string;
  shakenDate: string;
  checkDate: string;
  odometer: number;
  oilKm: number;
  tire: string;
  maintHistory: MaintRecord[];
};

export type Driver = {
  id: string;
  lastName: string;
  firstName: string;
  empId: string;
  dept: string;
  licenseType: string;
  licenseExpiry: string;
  phone: string;
  licenseNo: string;
  notes: string;
};

export const MASTER_KEYS = [
  'departments',
  'checkers',
  'checkMethods',
  'maintTypes',
  'tireTypes',
  'licenseTypes',
  'rentalCompanies',
  'rentalCarClasses',
] as const;
export type MasterKey = (typeof MASTER_KEYS)[number];
export type Masters = Record<MasterKey, string[]>;

export const MASTER_LABELS: Record<MasterKey, string> = {
  departments: '事業部・部署',
  checkers: '確認者（安全運転管理者等）',
  checkMethods: '確認方法',
  maintTypes: '整備種別',
  tireTypes: 'タイヤ種別',
  licenseTypes: '免許種別',
  rentalCompanies: 'レンタカー会社',
  rentalCarClasses: 'レンタカー車種クラス',
};

export type LogEntry = {
  id: string;
  at: string;
  actor: 'admin' | 'user';
  action: string;
  target: string;
  detail?: string;
};

// 車両の予約（使用予定）。日報とは別に、事前に押さえる使用枠を持つ。
export type Reservation = {
  id: string;
  vehicleId: string;
  vehicleName: string;
  plate: string;
  driverId?: string;
  driver: string;
  driverLast: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD（1日だけの予約は startDate と同じ）
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  destination: string;
  purpose: string;
  note: string;
  createdAt: string;
};

export const RENTAL_STATUSES = ['予約済', '貸出中', '返却済', 'キャンセル'] as const;
export type RentalStatus = (typeof RENTAL_STATUSES)[number];

// レンタカーを実際に運転した人（利用者＝予約者とは別に、複数人を記録できる）
export type RentalOperator = { driverId?: string; name: string };

// レンタカーの利用記録（社用車とは別管理）
export type Rental = {
  id: string;
  status: RentalStatus;
  company: string; // レンタカー会社
  carClass: string; // 車種クラス
  carModel: string; // 車種（例: ヤリス）
  plate: string; // 借りた車のナンバー（貸出時に判明）
  reservationNo: string; // 予約番号
  driverId?: string;
  driver: string;
  dept: string;
  operators?: RentalOperator[]; // 運転した人（運転者台帳から選ぶ＋台帳にない人）
  purpose: string;
  destination: string;
  startDate: string;
  endDate: string;
  pickupPlace: string; // 出発店舗
  returnPlace: string; // 返却店舗
  estimateCost: number; // 見積金額
  cost: number; // 確定金額（返却後）
  startKm: number;
  endKm: number;
  fuelFull: boolean; // 満タン返却
  damageNote: string; // 傷・事故等の申告
  notes: string;
  returnedAt?: string;
  createdAt: string;
};

export type EmpIdRule = {
  prefix: string; // 例: EMP-
  digits: number; // 数字部分の桁数（ゼロ埋め）
  next: number; // 次に振る番号
};
export const DEFAULT_EMP_ID_RULE: EmpIdRule = { prefix: 'EMP-', digits: 3, next: 1 };

export type AppData = {
  reports: Report[];
  empIdRule: EmpIdRule;
  reservations: Reservation[];
  rentals: Rental[];
  vehicles: Vehicle[];
  drivers: Driver[];
  masters: Masters;
  logs: LogEntry[];
  persistent: boolean;
};

export const DEFAULT_MASTERS: Masters = {
  departments: ['営業第1部', '営業第2部', '物流管理課', '総務管理課', 'その他'],
  checkers: ['安全運転管理者 田中', '副安全運転管理者 佐藤', '総務担当 鈴木', '所属長・代行者'],
  checkMethods: ['対面', '電話・通話', 'ビデオ通話', '直行直帰（遠隔指示）'],
  maintTypes: ['オイル交換', '車検完了', '12ヶ月点検', 'タイヤ交換', '修理・洗車', 'その他'],
  tireTypes: ['夏タイヤ（ノーマル）', 'スタッドレス（冬用）', 'オールシーズン'],
  licenseTypes: ['普通第一種', '準中型（5t限定含む）', '中型（8t限定含む）', '大型第一種', '第二種免許'],
  rentalCompanies: ['トヨタレンタカー', 'ニッポンレンタカー', 'オリックスレンタカー', 'タイムズカー', 'その他'],
  rentalCarClasses: ['軽自動車', 'コンパクト', 'セダン', 'ミニバン・ワゴン', 'SUV', 'トラック・バン', 'その他'],
};

export const DEFAULT_VEHICLES: Vehicle[] = [
  {
    id: 'v1',
    name: '社用車1号（プリウス 白）',
    plate: '品川 500 さ 12-34',
    modelType: '6AA-ZVW51',
    shakenDate: '2026-10-15',
    checkDate: '2026-11-20',
    odometer: 35245,
    oilKm: 38000,
    tire: '夏タイヤ（ノーマル）',
    maintHistory: [],
  },
  {
    id: 'v2',
    name: '社用車2号（プロボックス 銀）',
    plate: '品川 400 た 56-78',
    modelType: '3BD-NCP160V',
    shakenDate: '2027-03-25',
    checkDate: '2026-12-10',
    odometer: 78120,
    oilKm: 79500,
    tire: '夏タイヤ（ノーマル）',
    maintHistory: [],
  },
  {
    id: 'v3',
    name: '社用車3号（ハイエース 白）',
    plate: '品川 400 す 99-01',
    modelType: '3DF-GDH201V',
    shakenDate: '2027-01-20',
    checkDate: '2027-01-20',
    odometer: 54300,
    oilKm: 56000,
    tire: '夏タイヤ（ノーマル）',
    maintHistory: [],
  },
];

export const DEFAULT_DRIVERS: Driver[] = [
  {
    id: 'd1',
    lastName: '山田',
    firstName: '太郎',
    empId: 'EMP-001',
    dept: '営業第1部',
    licenseType: '普通第一種',
    licenseExpiry: '2026-10-25',
    phone: '090-1234-5678',
    licenseNo: '第301234567890号',
    notes: 'ゴールド免許',
  },
  {
    id: 'd2',
    lastName: '佐藤',
    firstName: '次郎',
    empId: 'EMP-005',
    dept: '物流管理課',
    licenseType: '準中型（5t限定含む）',
    licenseExpiry: '2027-05-18',
    phone: '090-8765-4321',
    licenseNo: '第301987654321号',
    notes: 'リーダー',
  },
];

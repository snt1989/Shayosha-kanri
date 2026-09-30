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
};

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
};

export type LogEntry = {
  id: string;
  at: string;
  actor: 'admin' | 'user';
  action: string;
  target: string;
  detail?: string;
};

export type AppData = {
  reports: Report[];
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

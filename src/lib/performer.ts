export const PERFORMER_TYPES = ["악화사례자", "성공사례자", "체험단", "지인", "기타"] as const;
export type PerformerType = (typeof PERFORMER_TYPES)[number];

export const ATTACHMENT_CATEGORIES = [
  { key: "photo", label: "사진", desc: "출연자 프로필·현장 사진", accept: "image/*" },
  { key: "id", label: "신분증", desc: "주민등록증, 운전면허증 등", accept: "image/*,.pdf" },
  { key: "doc", label: "기타 서류", desc: "출연 동의서, 진단서 등", accept: undefined },
] as const;
export type AttachmentCategory = (typeof ATTACHMENT_CATEGORIES)[number]["key"];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export type Attachment = {
  category: AttachmentCategory;
  name: string;
  size: number;
  type: string;
  blob: Blob;
};

export type Performer = {
  id: string;
  createdAt: number;
  episode: number;
  /** YYYY-MM-DD */
  airDate: string;
  item: string;
  name: string;
  type: PerformerType;
  /** 유형이 "기타"일 때 직접 적은 유형 */
  typeEtc: string;
  /** 유형이 "지인"일 때 남기는 메모 (예: 누구의 지인인지). 이 필드가 생기기 전 기록에는 없다. */
  friendMemo?: string;
  /** YYYY-MM-DD */
  birth: string;
  attachments: Attachment[];
  /** 수정했을 때만 */
  updatedAt?: number;
};

/** 출연자 한 명에 여러 개 남길 수 있는 메모. 출연자와 따로 저장하고 performerId로 연결한다. */
export type Memo = {
  id: string;
  performerId: string;
  body: string;
  createdAt: number;
  /** 수정했을 때만 */
  updatedAt?: number;
};

export type PerformerInput = Omit<Performer, "id" | "createdAt" | "updatedAt" | "attachments">;
export type PerformerErrors = Partial<Record<keyof PerformerInput, string>>;

export function validatePerformer(v: PerformerInput, today: string): PerformerErrors {
  const errors: PerformerErrors = {};
  if (!Number.isInteger(v.episode) || v.episode < 1)
    errors.episode = "방송회차를 1 이상의 숫자로 입력해 주세요.";
  if (!v.airDate) errors.airDate = "방송일을 선택해 주세요.";
  if (!v.item) errors.item = "아이템을 입력해 주세요.";
  if (!v.name) errors.name = "출연자 이름을 입력해 주세요.";
  if (!PERFORMER_TYPES.includes(v.type)) errors.type = "출연자 유형을 하나 골라 주세요.";
  if (!v.birth) errors.birth = "생년월일을 선택해 주세요.";
  else if (v.birth > today) errors.birth = "생년월일이 오늘보다 뒤입니다. 날짜를 확인해 주세요.";
  return errors;
}

export function typeLabel(p: Pick<Performer, "type" | "typeEtc">): string {
  return p.type === "기타" && p.typeEtc ? `기타 · ${p.typeEtc}` : p.type;
}

export const PERFORMER_TYPES = ["악화사례자", "성공사례자", "체험단", "의사", "지인", "기타"] as const;
export type PerformerType = (typeof PERFORMER_TYPES)[number];

/** 프로그램명 입력 칸에 띄우는 추천 목록. 목록에 없는 이름도 직접 적을 수 있다. */
export const PROGRAM_SUGGESTIONS = ["인생의 연장전", "질병의 법칙", "중독자들"];

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
  /** 프로그램명 (예: 인생의 연장전). 이 필드가 생기기 전 기록에는 없다. */
  program?: string;
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
  // 아래 세 필드는 이 필드가 생기기 전 기록에는 없다.
  /** 출연료. 필수 입력이고 금액과 조건을 자유롭게 적는다 (예: 100만원, 지인 출연 포함) */
  fee?: string;
  /** 질병 유형 (예: 폐암 4기). 선택 입력 */
  disease?: string;
  /** 제작진 메모 (예: 까다로움, 블랙리스트). 선택 입력 */
  memo?: string;
  attachments: Attachment[];
};

export type PerformerInput = Omit<Performer, "id" | "createdAt" | "attachments">;
export type PerformerErrors = Partial<Record<keyof PerformerInput, string>>;

export function validatePerformer(v: PerformerInput, today: string): PerformerErrors {
  const errors: PerformerErrors = {};
  if (!v.program) errors.program = "프로그램명을 입력해 주세요.";
  if (!Number.isInteger(v.episode) || v.episode < 1)
    errors.episode = "방송회차를 1 이상의 숫자로 입력해 주세요.";
  if (!v.airDate) errors.airDate = "방송일을 선택해 주세요.";
  if (!v.item) errors.item = "아이템을 입력해 주세요.";
  if (!v.name) errors.name = "출연자 이름을 입력해 주세요.";
  if (!PERFORMER_TYPES.includes(v.type)) errors.type = "출연자 유형을 하나 골라 주세요.";
  if (!v.fee) errors.fee = "출연료를 입력해 주세요.";
  if (!v.birth) errors.birth = "생년월일을 선택해 주세요.";
  else if (v.birth > today) errors.birth = "생년월일이 오늘보다 뒤입니다. 날짜를 확인해 주세요.";
  return errors;
}

export function typeLabel(p: Pick<Performer, "type" | "typeEtc">): string {
  return p.type === "기타" && p.typeEtc ? `기타 · ${p.typeEtc}` : p.type;
}

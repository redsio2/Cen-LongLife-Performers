// 컴포넌트 안에서 직접 부르면 React 순수성 규칙에 걸리므로 여기서 만든다.
export const newId = () => crypto.randomUUID();
export const now = () => Date.now();

// 문장 속 이더리움 주소 · 거래 해시를 고정폭 글꼴로 그립니다.
// Pretendard는 숫자 사이의 "x"를 곱하기 기호(×)로 그려서 "0x"가 "0×"로 보이기 때문입니다 (글꼴 설정으로는 끌 수 없음).
const ADDRESS = /(0x[0-9a-fA-F]+(?:…[0-9a-fA-F]+)?)/g;

export function AddressText({ text }: { text: string }) {
  const parts = text.split(ADDRESS);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code key={index} className="addr">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

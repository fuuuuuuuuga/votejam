// バリデーション関連の定数と関数
export const ERROR_MESSAGES = {
  ALREADY_VOTED: '既に投票済みです',
  SESSION_NOT_FOUND: 'セッションが見つかりません',
  SESSION_CLOSED: '投票は終了しています',
  VOTE_FAILED: '投票に失敗しました',
  INVALID_CHOICE_COUNT: '無効な選択肢数です',
  NETWORK_ERROR: '通信エラーが発生しました',
};

export const isValidSessionId = (sessionId) => {
  if (!sessionId) return false;
  // UUIDの形式チェック（簡易版）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(sessionId);
};

export const isValidChoiceCount = (count) => {
  const numCount = Number(count);
  return !isNaN(numCount) && numCount >= 2 && numCount <= 4;
}; 
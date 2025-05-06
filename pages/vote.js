import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

const LoadingSpinner = () => (
  <div className="flex flex-col items-center gap-3">
    <div className="w-10 h-10 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
    <p className="text-gray-500 text-sm animate-pulse">読み込み中</p>
  </div>
);

export default function VotePage() {
  const router = useRouter();
  const { count, session } = router.query;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://votejam.vercel.app';
  const voteUrl = `${baseUrl}/voter?count=${count}&session=${session}`;
  const [elapsed, setElapsed] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [sessionExists, setSessionExists] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [isEndingVote, setIsEndingVote] = useState(false);

  // 経過時間カウント
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // セッションチェック & 初期登録
  useEffect(() => {
    if (!session || !count) return;

    const validateAndInsertSession = async () => {
      try {
        // セッションの状態確認
        const { data: sessionData, error: sessionError } = await supabase
          .from('sessions')
          .select('status, created_at, choice_count')
          .eq('session_id', session)
          .single();

        if (sessionError && sessionError.code === 'PGRST116') {
          // セッションが存在しない場合は新規作成
          const choiceCount = Number(count);
          if (isNaN(choiceCount) || choiceCount < 2 || choiceCount > 4) {
            setErrorMessage('無効な選択肢数です');
            setSessionChecked(true);
            return;
          }

          const { error: insertError } = await supabase.from('sessions').upsert([
            {
              session_id: session,
              status: 'open',
              choice_count: choiceCount,
            },
          ]);

          if (insertError) {
            throw new Error('セッション初期登録エラー');
          }

          setSessionChecked(true);
          return;
        }

        if (sessionError) {
          throw new Error('セッション確認エラー');
        }

        // セッション存在していた場合（更新確認）
        const { status, created_at, choice_count } = sessionData;

        if (status === 'closed') {
          router.replace(`/result?session=${session}&from=host`);
          return;
        }

        const createdAt = new Date(created_at);
        const now = new Date();
        const hoursPassed = (now - createdAt) / (1000 * 60 * 60);

        if (hoursPassed >= 24) {
          setIsExpired(true);
          setSessionChecked(true);
          return;
        }

        // URLのcountパラメータと保存されている選択肢数が異なる場合はリダイレクト
        if (Number(count) !== choice_count) {
          router.replace(`/vote?count=${choice_count}&session=${session}`);
          return;
        }

        setSessionChecked(true);
      } catch (err) {
        console.error('エラー:', err);
        setNetworkError(true);
        setSessionChecked(true);
      }
    };

    validateAndInsertSession();
  }, [session, count, router]);

  // 投票終了処理
  const handleEndVote = async () => {
    if (isEndingVote) return;

    try {
      setIsEndingVote(true);

      const { error } = await supabase
        .from('sessions')
        .update({ status: 'closed' })
        .eq('session_id', session);

      if (error) {
        throw new Error('投票終了処理に失敗しました');
      }

      await router.push(`/result?session=${session}&from=host`);
    } catch (err) {
      console.error('投票終了エラー:', err);
      setErrorMessage('投票終了に失敗しました。もう一度お試しください');
      setTimeout(() => setErrorMessage(''), 2000);
      setIsEndingVote(false);
    }
  };

  // ネットワークエラーからのリトライ処理
  const handleRetry = () => {
    setNetworkError(false);
    setSessionChecked(false);
    router.reload();
  };

  // URLコピー処理
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(voteUrl);
      setSuccessMessage('URLをコピーしました！');
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (err) {
      console.error('クリップボードコピー失敗:', err);
      setErrorMessage('コピーに失敗しました');
      setTimeout(() => setErrorMessage(''), 2000);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 text-center">
        <p className="text-lg text-gray-700">通信エラーが発生しました</p>
        <button
          onClick={handleRetry}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          再試行する
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center">
        <p className="text-lg text-gray-700">この投票は終了しています</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50 text-center animate-fade-in">
      {errorMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap text-sm">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap text-sm">
          {successMessage}
        </div>
      )}

      <div className="absolute top-4 left-4">
        <p className="text-sm text-gray-400">ちょうどいい投票アプリ</p>
      </div>

      <h1 className="text-xl mb-2">
        選択肢数：
        <span className="text-3xl font-bold text-green-600">{count}</span>択
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        投票開始から {formatTime(elapsed)} 経過
      </p>

      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full mb-6">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-600 mb-6">QRコードを読み取ると投票画面が開きます</p>
          <QRCodeCanvas value={voteUrl} size={200} className="mb-6" />
          <button
            onClick={handleCopy}
            className="w-full px-4 py-2.5 text-sm font-medium text-green-600 border border-green-600 rounded-lg transition-all duration-150 ease-in-out hover:bg-green-50 active:scale-95"
          >
            URLを直接共有する
          </button>
        </div>
      </div>

      <button
        onClick={handleEndVote}
        disabled={isEndingVote}
        className={clsx(
          "w-full max-w-sm px-6 py-3.5 text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl text-lg font-semibold transition-all duration-150 ease-in-out shadow-lg shadow-green-600/20",
          isEndingVote && "opacity-50 cursor-default pointer-events-none"
        )}
      >
        {isEndingVote ? "終了処理中..." : "投票を終了して結果を見る"}
      </button>
    </div>
  );
}

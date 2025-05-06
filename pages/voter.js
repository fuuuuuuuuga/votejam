import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { isValidSessionId, isValidChoiceCount, ERROR_MESSAGES } from '../lib/validation';
import clsx from 'clsx';

const LoadingSpinner = ({ message = "読み込み中" }) => (
  <div className="flex flex-col items-center gap-3">
    <div className="w-10 h-10 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
    <p className="text-gray-500 text-sm animate-pulse">{message}</p>
  </div>
);

export default function VoterPage() {
  const router = useRouter();
  const count = Number(router.query.count);
  const sessionId = router.query.session;

  const [choices, setChoices] = useState([]);
  const [votes, setVotes] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [votedChoice, setVotedChoice] = useState(null);
  const [expired, setExpired] = useState(false);
  const [sessionStatusChecked, setSessionStatusChecked] = useState(false);
  const [isRevoting, setIsRevoting] = useState(false);
  const [sessionExists, setSessionExists] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [fadeOutVoting, setFadeOutVoting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase
          .from('sessions')
          .select('status, created_at, choice_count')
          .eq('session_id', sessionId)
          .single();

        if (error) {
          console.error('セッション取得エラー:', error);
          setSessionExists(false);
          setSessionStatusChecked(true);
          return;
        }

        const { status, created_at, choice_count } = data;
        const createdAt = new Date(created_at);
        const now = new Date();
        const hoursPassed = (now - createdAt) / (1000 * 60 * 60);

        if (status === 'closed') {
          router.replace(`/result?session=${sessionId}`);
          return;
        }

        if (hoursPassed >= 24) {
          setExpired(true);
        }

        if (Number(router.query.count) !== choice_count) {
          router.replace(`/voter?count=${choice_count}&session=${sessionId}`);
          return;
        }

        const storedVotes = localStorage.getItem('votejam_votes');
        if (storedVotes) {
          try {
            const parsed = JSON.parse(storedVotes);
            const storedSessionId = localStorage.getItem('votejam_session_id');
            if (storedSessionId === sessionId) {
              const selected = Object.keys(parsed).find((key) => parsed[key] > 0);
              if (selected) {
                setHasVoted(true);
                setVotedChoice(selected);
              }
            } else {
              localStorage.removeItem('votejam_votes');
              localStorage.removeItem('votejam_session_id');
            }
          } catch (e) {
            console.error('localStorage パース失敗:', e);
          }
        }

        setSessionStatusChecked(true);
      } catch (err) {
        console.error('ネットワークエラー:', err);
        setNetworkError(true);
        setSessionStatusChecked(true);
      }
    };

    checkSession();
  }, [sessionId, router]);

  useEffect(() => {
    if (!isNaN(count) && (count < 2 || count > 4)) {
      setErrorMessage('無効な選択肢数です');
      setShowError(true);
      return;
    }

    if (!isNaN(count) && count > 0) {
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const choiceList = [];
      const initialVotes = {};

      for (let i = 0; i < count; i++) {
        const letter = alphabet[i];
        choiceList.push(letter);
        initialVotes[letter] = 0;
      }

      setChoices(choiceList);
      setVotes(initialVotes);
    }
  }, [count]);

  const handleVote = async (choice) => {
    if (hasVoted) {
      setErrorMessage(ERROR_MESSAGES.ALREADY_VOTED);
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }
    
    if (expired || isVoting) return;

    try {
      setIsVoting(true);

      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('status')
        .eq('session_id', sessionId)
        .single();

      if (sessionError) {
        setErrorMessage(ERROR_MESSAGES.SESSION_NOT_FOUND);
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        return;
      }

      if (sessionData.status === 'closed') {
        setErrorMessage(ERROR_MESSAGES.SESSION_CLOSED);
        setShowError(true);
        setTimeout(() => {
          router.replace(`/result?session=${sessionId}`);
        }, 1500);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('vote')
        .select('count')
        .eq('session_id', sessionId)
        .eq('choice', choice)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error('投票データの取得に失敗しました');
      }

      const currentCount = data?.count || 0;
      const newCount = currentCount + 1;

      const { error: upsertError } = await supabase
        .from('vote')
        .upsert(
          [{ session_id: sessionId, choice: choice, count: newCount }],
          { onConflict: ['session_id', 'choice'] }
        );

      if (upsertError) {
        console.error('保存エラー:', upsertError);
        return;
      }

      localStorage.setItem('votejam_session_id', sessionId);
      localStorage.setItem('votejam_votes', JSON.stringify({ [choice]: 1 }));
      setVotes({ [choice]: newCount });
      
      // 投票成功時のスムーズな遷移
      setFadeOutVoting(true);
      await new Promise(resolve => setTimeout(resolve, 400));
      setVotedChoice(choice);
      setHasVoted(true);
      setFadeOutVoting(false);

    } catch (err) {
      console.error('投票処理中にエラー:', err);
      setErrorMessage(ERROR_MESSAGES.VOTE_FAILED);
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    } finally {
      setIsVoting(false);
    }
  };

  const handleResultCheck = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('status')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      console.error('ステータス確認エラー', error);
      setErrorMessage('セッションの確認に失敗しました');
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      return;
    }

    if (data.status === 'closed') {
      router.push(`/result?session=${sessionId}`);
    } else {
      setErrorMessage('投票終了までお待ちください');
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
    }
  };

  const handleRevote = async () => {
    try {
      setIsRevoting(true);

      const { data, error } = await supabase
        .from('sessions')
        .select('status, choice_count')
        .eq('session_id', sessionId)
        .single();

      if (error) {
        console.error('ステータス確認エラー', error);
        setErrorMessage('セッションの確認に失敗しました');
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        setIsRevoting(false);
        return;
      }

      if (data.status === 'closed') {
        setErrorMessage('投票は終了しています');
        setShowError(true);
        setTimeout(() => setShowError(false), 2000);
        setIsRevoting(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      localStorage.removeItem('votejam_votes');
      localStorage.removeItem('votejam_session_id');

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const choiceList = [];
      const initialVotes = {};

      for (let i = 0; i < data.choice_count; i++) {
        const letter = alphabet[i];
        choiceList.push(letter);
        initialVotes[letter] = 0;
      }

      setChoices(choiceList);
      setVotes(initialVotes);
      setHasVoted(false);
      setVotedChoice(null);
      setIsRevoting(false);

    } catch (err) {
      console.error('再投票処理中にエラー:', err);
      setErrorMessage('エラーが発生しました');
      setShowError(true);
      setTimeout(() => setShowError(false), 2000);
      setIsRevoting(false);
    }
  };

  const choiceColors = [
    'bg-blue-400/90 hover:bg-blue-400',     // A: 柔らかい青
    'bg-emerald-400/90 hover:bg-emerald-400', // B: 柔らかい緑
    'bg-violet-400/90 hover:bg-violet-400',   // C: 柔らかい紫
    'bg-amber-400/90 hover:bg-amber-400',     // D: 柔らかい黄
  ];

  const handleRetry = () => {
    setNetworkError(false);
    setSessionStatusChecked(false);
    router.reload();
  };

  if (!sessionStatusChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="読み込み中" />
      </div>
    );
  }

  if (networkError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
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

  if (!sessionExists) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-700">この投票は存在しません</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-700">この投票は終了しています</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50 text-center animate-fade-in">
      {showError && errorMessage && (
        <div className="fixed bottom-4 md:bottom-4 sm:top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap text-sm">
          {errorMessage}
        </div>
      )}
      
      <div className="absolute top-4 left-4">
        <p className="text-sm text-gray-400">ちょうどいい投票アプリ</p>
      </div>

      {isRevoting ? (
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner message="投票画面を準備中..." />
        </div>
      ) : !hasVoted ? (
        <div className={clsx(
          'w-full max-w-md transition-opacity duration-300',
          fadeOutVoting ? 'opacity-0' : 'opacity-100'
        )}>
          <h1 className="text-xl font-bold text-gray-800 mb-4">投票してください👇</h1>
          <div className="bg-white p-6 rounded-2xl shadow-lg w-full flex flex-col gap-3">
            {choices.map((choice, index) => (
              <button
                key={choice}
                onClick={() => handleVote(choice)}
                disabled={isVoting}
                className={clsx(
                  'w-full py-4 px-4 text-lg font-semibold tracking-wide rounded-lg shadow-sm ring-1 ring-gray-200/50 transition-all duration-150 ease-in-out',
                  choiceColors[index % choiceColors.length],
                  'text-white transform hover:scale-[1.02] active:scale-95',
                  isVoting && 'opacity-50 cursor-default pointer-events-none'
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={clsx(
          'w-full max-w-md transition-opacity duration-300',
          !fadeOutVoting ? 'opacity-100' : 'opacity-0'
        )}>
          {votedChoice && (
            <h2 className="text-xl font-semibold text-gray-800 mb-4 animate-fade-in">
              「{votedChoice}」を選択しました👍
            </h2>
          )}
          <p className="text-sm text-gray-600 mb-8 animate-fade-in">
            投票終了後に「結果を見る」を押してください
          </p>
          <div className="w-full max-w-sm flex flex-col items-center gap-6">
            <button
              onClick={handleResultCheck}
              className="w-full px-6 py-3.5 text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl text-lg font-semibold transition-transform duration-150 ease-in-out shadow-lg shadow-green-600/20"
            >
              結果を見る
            </button>
            <button
              onClick={handleRevote}
              disabled={isRevoting}
              className={clsx(
                "text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150 underline underline-offset-2",
                isRevoting && "opacity-50 cursor-default pointer-events-none"
              )}
            >
              再投票する
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

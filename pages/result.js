import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

const LoadingSpinner = () => (
  <div className="flex flex-col items-center gap-3">
    <div className="w-10 h-10 border-4 border-green-600/30 border-t-green-600 rounded-full animate-spin" />
    <p className="text-gray-500 text-sm animate-pulse">読み込み中</p>
  </div>
);

ChartJS.register(BarElement, CategoryScale, LinearScale, ChartDataLabels);

export default function ResultPage() {
  const router = useRouter();
  const { session, from } = router.query;
  const isHost = from === 'host';

  const [votes, setVotes] = useState({});
  const [expired, setExpired] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedCount, setSelectedCount] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!session) return;

    const fetchSessionAndVotes = async () => {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('created_at, choice_count')
        .eq('session_id', session)
        .single();

      if (sessionError || !sessionData) {
        console.error('セッション取得エラー:', sessionError);
        setSessionChecked(true);
        return;
      }

      const { created_at, choice_count } = sessionData;
      const createdAt = new Date(created_at);
      const now = new Date();
      const hoursPassed = (now - createdAt) / (1000 * 60 * 60);

      if (hoursPassed >= 24) {
        setExpired(true);
        setSessionChecked(true);
        return;
      }

      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const allChoices = Array.from({ length: choice_count }, (_, i) => alphabet[i]);

      const { data: voteData, error: voteError } = await supabase
        .from('vote')
        .select('choice, count')
        .eq('session_id', session);

      const votesData = {};
      allChoices.forEach(choice => {
        const found = voteData?.find(item => item.choice === choice);
        votesData[choice] = found ? found.count : 0;
      });

      setVotes(votesData);
      setSessionChecked(true);
    };

    fetchSessionAndVotes();
  }, [session]);

  const handleRestartVote = () => {
    setTimeout(() => {
      setShowModal(true);
    }, 150);
    setSelectedCount(null);
  };

  const handleConfirmRestart = async () => {
    if (!selectedCount || !session) return;
    setIsUpdating(true);
  
    const { error: deleteError } = await supabase
      .from('vote')
      .delete()
      .eq('session_id', session);
  
    if (deleteError) {
      console.error('旧投票データ削除エラー:', deleteError);
      setErrorMessage('再スタートに失敗しました（削除）');
      setIsUpdating(false);
      return;
    }
  
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ status: 'open', choice_count: selectedCount })
      .eq('session_id', session);
  
    if (updateError) {
      setErrorMessage('再スタートに失敗しました（更新）');
      console.error(updateError);
      setIsUpdating(false);
      return;
    }
  
    // 🔽 ゆるやかな遷移のために少し待つ
    await new Promise((resolve) => setTimeout(resolve, 600));
  
    setIsUpdating(false);
    setShowModal(false);
    router.push(`/vote?count=${selectedCount}&session=${session}`);
  };

  const handleJoinNewVote = async () => {
    setIsUpdating(true);
    
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('status, choice_count')
        .eq('session_id', session)
        .single();

      if (sessionError) {
        setErrorMessage('セッションの確認に失敗しました');
        setTimeout(() => setErrorMessage(''), 2000);
        setIsUpdating(false);
        return;
      }

      if (sessionData.status === 'closed') {
        setErrorMessage('投票は終了しています');
        setTimeout(() => setErrorMessage(''), 2000);
        setIsUpdating(false);
        return;
      }

      // LocalStorageから投票履歴をクリア
      localStorage.removeItem(`votejam_votes`);
      
      // voterページへリダイレクト
      await router.push(`/voter?session=${session}&count=${sessionData.choice_count}`);
    } catch (error) {
      console.error('エラー:', error);
      setErrorMessage('エラーが発生しました');
      setTimeout(() => setErrorMessage(''), 2000);
    } finally {
      setIsUpdating(false);
    }
  };

  const choiceColors = {
    A: 'rgba(96, 165, 250, 0.9)',  // blue-400 with 0.9 opacity
    B: 'rgba(52, 211, 153, 0.9)',  // emerald-400 with 0.9 opacity
    C: 'rgba(167, 139, 250, 0.9)', // violet-400 with 0.9 opacity
    D: 'rgba(251, 191, 36, 0.9)',  // amber-400 with 0.9 opacity
  };

  const sortedChoices = Object.keys(votes).sort();
  const sortedCounts = sortedChoices.map(choice => votes[choice]);
  const maxCount = Math.max(...sortedCounts, 0);
  const totalVotes = sortedCounts.reduce((sum, count) => sum + count, 0);

  const data = {
    labels: sortedChoices,
    datasets: [
      {
        label: '投票数',
        data: sortedCounts,
        backgroundColor: sortedChoices.map(
          choice => choiceColors[choice] || 'rgba(203,213,225,0.7)'
        ),
        borderRadius: 8,
      },
    ],
  };

  const options = {
    indexAxis: 'x',
    maintainAspectRatio: false,
    animation: {
      duration: 800,
      easing: 'easeOutBack',
    },
    plugins: {
      datalabels: {
        anchor: 'end',
        align: 'top',
        font: { weight: 'bold' },
        color: '#333',
        formatter: (value) => value || '',
      },
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: maxCount + 1,
        precision: 0,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50 dark:bg-gray-900 text-center animate-fade-in">
      {!sessionChecked ? (
        <LoadingSpinner />
      ) : expired ? (
        <p className="text-lg text-gray-700 dark:text-gray-300">この投票の閲覧期限は終了しました。</p>
      ) : (
        <>
          {errorMessage && (
            <div className="fixed bottom-4 md:bottom-4 sm:top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap text-sm">
              {errorMessage}
            </div>
          )}

          <div className="absolute top-4 left-4">
            <p className="text-sm text-gray-400 dark:text-gray-500">ちょうどいい投票アプリ</p>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">投票結果はこちら🤲</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">投票数：{totalVotes}票</p>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg max-w-md w-full mb-8">
            <div className="h-[300px]">
              <Bar data={data} options={options} />
            </div>
          </div>

          {isHost ? (
            <>
              <button
                onClick={handleRestartVote}
                className="w-full max-w-sm px-6 py-3 text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl text-lg font-semibold transition-transform duration-150 ease-in-out disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none"
                disabled={isUpdating}
              >
                投票を新しく始める
              </button>

              <div className="mt-8 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150 underline underline-offset-2"
                >
                  またのご利用をお待ちしています
                </Link>
              </div>

              {showModal && (
                <div
                  className="fixed inset-0 bg-white/60 dark:bg-white/10 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
                  onClick={() => setShowModal(false)}
                >
                  <div
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl shadow-black/30 p-8 text-center w-full max-w-md transform transition-all duration-300 ease-out scale-95 opacity-0 animate-modal-in"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 className="text-lg font-bold mb-6 text-gray-800 dark:text-white leading-relaxed">
                      選択肢数を選んでください👇
                    </h2>
                    <div className="flex justify-center gap-3 mb-6">
                      {[2, 3, 4].map(n => (
                        <button
                          key={n}
                          onClick={() => setSelectedCount(n)}
                          className={`px-4 py-2 rounded border font-semibold transition ${
                            selectedCount === n
                              ? 'bg-green-600 text-white'
                              : 'bg-white text-gray-800 dark:bg-gray-700 dark:text-white border-gray-300'
                          }`}
                        >
                          {n}択
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleConfirmRestart}
                      disabled={!selectedCount || isUpdating}
                      className="w-full max-w-sm px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none"
                    >
                      {isUpdating ? '...' : 'リセットして再開する'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleJoinNewVote}
                disabled={isUpdating}
                className="w-full max-w-sm px-6 py-3 text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl text-lg font-semibold transition-transform duration-150 ease-in-out disabled:opacity-50 disabled:cursor-default disabled:pointer-events-none"
              >
                {isUpdating ? '確認中...' : '新しい投票に参加する'}
              </button>

              <div className="mt-8 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150 underline underline-offset-2"
                >
                  ホストとして利用したい場合はこちらから
                </Link>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
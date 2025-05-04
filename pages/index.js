import { useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [inputPassword, setInputPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [choiceCount, setChoiceCount] = useState(2);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const correctPassword = 'vote';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputPassword === correctPassword) {
      setAuthenticated(true);
    } else {
      setErrorMessage('パスワードが違います');
      setTimeout(() => setErrorMessage(''), 2000);
    }
  };

  const handleStartVote = () => {
    const sessionId = uuidv4();
    router.push(`/vote?count=${choiceCount}&session=${sessionId}`);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50 text-center animate-fade-in">
        {errorMessage && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-lg shadow-lg z-50 animate-fade-in whitespace-nowrap text-sm">
            {errorMessage}
          </div>
        )}

        <h1 className="text-2xl font-bold text-gray-800 mb-4">パスワードを入力してください</h1>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
          <input
            type="password"
            value={inputPassword}
            onChange={(e) => setInputPassword(e.target.value)}
            placeholder="パスワード"
            className="border border-gray-300 rounded px-4 py-2 text-lg w-64"
          />
          <button
            type="submit"
            className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl text-lg font-semibold transition-transform duration-150 ease-in-out"
          >
            ログイン
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50 text-center animate-fade-in">
      {/* 
      色のバリエーション案：
      1. text-gray-800 - 落ち着いたダークグレー（シンプルで読みやすい）
      2. text-blue-700 - 信頼感のある濃いブルー
      3. text-slate-700 - モダンで洗練された印象のスレート
      4. text-indigo-700 - 上品で知的な印象のインディゴ
      
      現在は案1のダークグレーを適用しています
      */}
      <h1 className="text-3xl font-bold text-gray-800 mb-8">ちょうどいい投票アプリ 🗳️</h1>
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
        <h2 className="text-lg font-bold mb-6 text-gray-800 dark:text-white leading-relaxed">
          選択肢数を選んでください👇
        </h2>
        <div className="flex gap-4 justify-center mb-8">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setChoiceCount(n)}
              className={`px-4 py-2 rounded font-semibold border transition-all duration-200 ease-in-out active:scale-95 ${
                choiceCount === n
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-white text-gray-800 border-gray-300'
              }`}
            >
              {n}択
            </button>
          ))}
        </div>
        <button
          onClick={handleStartVote}
          className="w-full px-6 py-3 text-white bg-green-600 hover:bg-green-700 active:scale-95 rounded-xl text-lg font-semibold transition-transform duration-150 ease-in-out"
        >
          投票を開始する
        </button>
      </div>
    </div>
  );
}

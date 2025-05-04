import { useState } from 'react';
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [choiceCount, setChoiceCount] = useState(2);
  const router = useRouter();

  const handleStartVote = () => {
    const sessionId = uuidv4();
    router.push(`/vote?count=${choiceCount}&session=${sessionId}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 bg-gray-50 text-center animate-fade-in">
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

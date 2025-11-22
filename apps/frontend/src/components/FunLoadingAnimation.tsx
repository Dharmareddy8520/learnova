import React, { useState, useEffect } from 'react';

const FunLoadingAnimation: React.FC = () => {
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotation, setRotation] = useState(0);

  const funFacts = [
    "Did you know? Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible! 🍯",
    "Bananas are berries, but strawberries aren't! 🍌",
    "Octopuses have three hearts - two pump blood to the gills, one to the rest of the body 🐙",
    "A group of flamingos is called a 'flamboyance' 🦩",
    "Cats have over 20 vocalizations to communicate with humans 🐱",
    "Penguins propose to their mates with a pebble 💍🐧",
    "Cows have best friends and get stressed when separated 🐄",
    "A jiffy is an actual unit of time = 1 trillionth of a second ⏱️",
    "Wombats poop cubes to mark territory 🟫",
    "Tardigrades (water bears) can survive in space 🌌",
    "The smell of petrichor (rain on earth) is actually bacteria's perfume! 🌧️",
    "Dolphins call each other by name 🐬",
    "A cockroach can live for a week without its head 🪳",
    "Butterflies taste with their feet 🦋",
    "Sea otters hold hands while sleeping so they don't drift apart 🦦",
    "Sloths only poop once a week 🦥",
    "A group of pugs is called a 'grumble' 🐶",
    "Carrots weren't originally orange - they were purple! 🥕",
    "Your nose can remember 50,000 different smells 👃",
    "Snakes smell through their mouths 🐍",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % funFacts.length);
      setIsFlipped(false);
      setRotation((prev) => (prev + 360) % 360);
    }, 4000);

    return () => clearInterval(interval);
  }, [funFacts.length]);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center z-50 overflow-hidden">
      {/* Animated background circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-40 h-40 bg-purple-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-40 h-40 bg-indigo-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Spinning cards container */}
        <div className="relative w-80 h-96 mb-8 perspective">
          {/* Card 1 */}
          <div
            className="absolute inset-0 flex items-center justify-center transform transition-all duration-500"
            style={{
              transform: `rotateZ(${rotation + 0}deg) rotateX(20deg)`,
              opacity: Math.abs((rotation + 0) % 360 - 180) < 90 ? 1 : 0.3,
            }}
          >
            <div
              onClick={handleCardClick}
              className={`w-64 h-80 rounded-2xl shadow-2xl cursor-pointer transform transition-all duration-500 flex items-center justify-center p-6 text-center ${
                isFlipped
                  ? 'bg-gradient-to-br from-yellow-300 to-yellow-400'
                  : 'bg-gradient-to-br from-red-500 to-red-600'
              }`}
            >
              {isFlipped ? (
                <p className="text-2xl font-bold text-gray-800">
                  {funFacts[currentFactIndex]}
                </p>
              ) : (
                <div className="text-5xl font-bold text-white">?</div>
              )}
            </div>
          </div>

          {/* Card 2 */}
          <div
            className="absolute inset-0 flex items-center justify-center transform transition-all duration-500"
            style={{
              transform: `rotateZ(${rotation + 120}deg) rotateX(20deg)`,
              opacity: Math.abs((rotation + 120) % 360 - 180) < 90 ? 1 : 0.3,
            }}
          >
            <div className="w-64 h-80 rounded-2xl shadow-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-6 text-center">
              <div className="text-5xl font-bold text-white">?</div>
            </div>
          </div>

          {/* Card 3 */}
          <div
            className="absolute inset-0 flex items-center justify-center transform transition-all duration-500"
            style={{
              transform: `rotateZ(${rotation + 240}deg) rotateX(20deg)`,
              opacity: Math.abs((rotation + 240) % 360 - 180) < 90 ? 1 : 0.3,
            }}
          >
            <div className="w-64 h-80 rounded-2xl shadow-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center p-6 text-center">
              <div className="text-5xl font-bold text-white">?</div>
            </div>
          </div>
        </div>

        {/* Text below */}
        <div className="text-center mt-8">
          <h2 className="text-3xl font-bold text-white mb-2">Analyzing Your Document</h2>
          <p className="text-purple-200 mb-4">Click the cards to reveal fun facts! 🎯</p>
          
          {/* Loading dots */}
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce animation-delay-200"></div>
            <div className="w-3 h-3 bg-indigo-400 rounded-full animate-bounce animation-delay-400"></div>
          </div>
        </div>

        {/* Fun message */}
        <div className="mt-10 text-center">
          <p className="text-lg text-purple-300 animate-pulse">
            Stay entertained while we work our magic... ✨
          </p>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
        }
        .perspective {
          perspective: 1200px;
        }
      `}</style>
    </div>
  );
};

export default FunLoadingAnimation;

import React, { useState, useEffect } from 'react';

const CAPOO_GIFS = [
  "https://media.giphy.com/media/DVwUa7CmyEqAERURvo/giphy.gif",
  "https://media.giphy.com/media/kom58KCfnj8iGYGIdm/giphy.gif",
  "https://media.giphy.com/media/BvVHOQO7bLpN6zTwHH/giphy.gif",
  "https://media.giphy.com/media/Idx3Hj8UkVvkrOWNUN/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bW9qcXkxcGM0NnJiYmdjNGZ1Nzh6bm84cHFnZzRta2trZjVuMHBkdCZlcD12MV9zdGlja2Vyc19yZWxhdGVkJmN0PXM/SvK7Gxcq4QS4fNNjYH/giphy.gif",
  "https://media.giphy.com/media/jUKgHmzGqEo37AxKmq/giphy.gif",
  "https://media.giphy.com/media/9XY4f3FgFTT4QlaYqa/giphy.gif",
  "https://media.giphy.com/media/SL8v0BVfcT8kDPC1Na/giphy.gif",
  "https://media.giphy.com/media/5Yfcn9JO3ZMN6YtXPJ/giphy.gif",
  "https://media.giphy.com/media/ulLgsbxE3suN8LzK65/giphy.gif",
  "https://media.giphy.com/media/1wPCSFeSSKMAiXBFQi/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MDd3NTU1Mm1tbWd4MDVra3I2cm83ZnZrYm56aXg2NjVhMGN4cWF5cCZlcD12MV9zdGlja2Vyc19yZWxhdGVkJmN0PXM/5b5tgCP2Kja3JkcftU/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MDd3NTU1Mm1tbWd4MDVra3I2cm83ZnZrYm56aXg2NjVhMGN4cWF5cCZlcD12MV9zdGlja2Vyc19yZWxhdGVkJmN0PXM/2A6uZ0XlO5UIy6OiEM/giphy.gif"
];

export default function FeedbackOverlay({ isVisible }) {
  const [randomGif, setRandomGif] = useState(() => {
    return CAPOO_GIFS[Math.floor(Math.random() * CAPOO_GIFS.length)];
  });

  useEffect(() => {
    const img = new Image();
    img.src = randomGif;
  }, [randomGif]);

  useEffect(() => {
    if (!isVisible) {
      const nextIndex = Math.floor(Math.random() * CAPOO_GIFS.length);
      setRandomGif(CAPOO_GIFS[nextIndex]);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/90 ">
      <div className="animate-in zoom-in-95 fade-in duration-300">
        <div className="w-96 h-96 flex items-center justify-center">
          <img
            src={randomGif}
            alt="Capoo Feedback"
            className="w-full h-full object-contain drop-shadow-xl"
          />
        </div>
      </div>
    </div>
  );
}
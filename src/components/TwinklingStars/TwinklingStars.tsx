import React, { useEffect, useState } from 'react';
import './TwinklingStars.css';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  animationDelay: number;
}

const TwinklingStars: React.FC = () => {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const generateStars = () => {
      const starCount = 200;
      const newStars: Star[] = [];

      for (let i = 0; i < starCount; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 1.5 + 1,
          animationDelay: Math.random() * 6,
        });
      }

      setStars(newStars);
    };

    generateStars();
  }, []);

  return (
    <div className="twinkling-stars">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.animationDelay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default TwinklingStars;
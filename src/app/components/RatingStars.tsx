import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
}

export function RatingStars({ rating }: RatingStarsProps) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${
            i < rating
              ? 'fill-primary text-primary'
              : 'text-muted-foreground/20'
          }`}
        />
      ))}
    </div>
  );
}

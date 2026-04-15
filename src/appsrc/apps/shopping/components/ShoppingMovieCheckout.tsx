import React from 'react';
import {
  DEFAULT_STORE_MOVIE_CHECKOUT_LABELS,
  DEFAULT_STORE_MOVIE_SESSION_OPTIONS,
} from '../../../shared/business/commerce/domain/storeDecoration';
import type { Movie } from '../uiTypes';
import { formatMoney } from '../utils';
import styles from '../ShoppingApp.module.css';

interface ShoppingMovieCheckoutProps {
  movie: Movie | null;
  movieCinema: string;
  movieDate: string;
  movieSession: string;
  movieQty: number;
  movieCheckoutLabels?: string[];
  movieSessionOptions?: string[];
  onCinemaChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onSessionChange: (value: string) => void;
  onQtyChange: (value: number) => void;
  onPlaceOrder: () => void;
  onBackToMovies: () => void;
}

export const ShoppingMovieCheckout: React.FC<ShoppingMovieCheckoutProps> = ({
  movie,
  movieCinema,
  movieDate,
  movieSession,
  movieQty,
  movieCheckoutLabels,
  movieSessionOptions,
  onCinemaChange,
  onDateChange,
  onSessionChange,
  onQtyChange,
  onPlaceOrder,
  onBackToMovies
}) => {
  const resolvedCheckoutLabels = DEFAULT_STORE_MOVIE_CHECKOUT_LABELS.map(
    (label, index) => (movieCheckoutLabels?.[index] || '').trim() || label
  );
  const resolvedSessionOptions = DEFAULT_STORE_MOVIE_SESSION_OPTIONS.map(
    (label, index) => (movieSessionOptions?.[index] || '').trim() || label
  );

  if (!movie) {
    return (
      <section className={styles.section}>
        <div className={styles.empty}>
          <p>{resolvedCheckoutLabels[0]}</p>
          <button className={styles.primaryBtn} onClick={onBackToMovies}>
            {resolvedCheckoutLabels[1]}
          </button>
        </div>
      </section>
    );
  }

  const total = movie.price * movieQty;

  return (
    <section className={styles.section}>
      <div className={styles.ticketPreview}>
        <div className={styles.ticketTop}>
          <div>
            <strong>{movie.title}</strong>
            <p>{movie.tagline}</p>
          </div>
          <div className={styles.ticketPrice}>{formatMoney(total)}</div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.formRow}>
            <label>{resolvedCheckoutLabels[2]}</label>
            <input
              value={movieCinema}
              placeholder={resolvedCheckoutLabels[8]}
              onChange={(e) => onCinemaChange(e.target.value)}
            />
          </div>
          <div className={styles.formRow}>
            <label>{resolvedCheckoutLabels[3]}</label>
            <input type="date" value={movieDate} onChange={(e) => onDateChange(e.target.value)} />
          </div>
          <div className={styles.formRow}>
            <label>{resolvedCheckoutLabels[4]}</label>
            <select value={movieSession} onChange={(e) => onSessionChange(e.target.value)}>
              {resolvedSessionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.formRow}>
            <label>{resolvedCheckoutLabels[5]}</label>
            <input
              type="number"
              min={1}
              max={6}
              value={movieQty}
              onChange={(e) => onQtyChange(Number(e.target.value))}
            />
          </div>
          <button className={styles.primaryBtn} onClick={onPlaceOrder}>
            {resolvedCheckoutLabels[6]}
          </button>
        </div>
      </div>
    </section>
  );
};

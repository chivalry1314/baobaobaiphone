import React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Film } from 'lucide-react';
import { DEFAULT_STORE_MOVIE_TEXT_LABELS, toStoreBackgroundImage } from '../../../shared/business/commerce/domain/storeDecoration';
import type { Movie } from '../uiTypes';
import { formatMoney } from '../utils';
import styles from '../ShoppingApp.module.css';

const toPosterBackground = (value: string | undefined) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:') || /^https?:\/\//.test(trimmed)) return `url(${trimmed})`;
  return trimmed;
};

interface ShoppingMoviesProps {
  query: string;
  movies: Movie[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onQueryChange: (value: string) => void;
  onSelectMovie: (movie: Movie) => void;
  storeSignboard?: string;
  storeTypeName?: string;
  storeLogo?: string;
  storeCover?: string;
  storeTheme?: string;
  movieTextLabels?: string[];
  disableVirtualization?: boolean;
}

export const ShoppingMovies: React.FC<ShoppingMoviesProps> = ({
  query,
  movies,
  scrollRef,
  onQueryChange,
  onSelectMovie,
  storeSignboard,
  storeTypeName,
  storeLogo,
  storeCover,
  storeTheme,
  movieTextLabels,
  disableVirtualization = false,
}) => {
  const rowCount = Math.ceil(movies.length / 2);
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 224,
    overscan: 6,
  });
  const shouldVirtualize = !disableVirtualization;
  const resolvedMovieTextLabels = DEFAULT_STORE_MOVIE_TEXT_LABELS.map(
    (label, index) => (movieTextLabels?.[index] || '').trim() || label
  );
  const storeTitle = (storeSignboard || '淘票票').trim() || '淘票票';
  const storeSubtitle = (storeTypeName || '选片购票 · 电子票券').trim() || '选片购票 · 电子票券';
  const storeAvatarText = storeTitle.slice(0, 2).toUpperCase();
  const heroBackground = storeCover
    ? toStoreBackgroundImage(storeCover, storeTheme || 'linear-gradient(135deg, #a78bfa, #fb7185)')
    : toStoreBackgroundImage(storeTheme, 'linear-gradient(135deg, #a78bfa, #fb7185)');

  return (
    <section className={styles.section}>
      <section className={styles.movieStoreHero} style={{ backgroundImage: heroBackground }}>
        <div className={styles.movieStoreHeroMask} />
        <div className={styles.movieStoreHeroContent}>
          <div className={styles.movieStoreHeroProfile}>
            <div className={styles.movieStoreHeroAvatar}>
              {storeLogo ? (
                <img src={storeLogo} alt={storeTitle} className={styles.movieStoreHeroAvatarImage} />
              ) : (
                storeAvatarText
              )}
            </div>
            <div className={styles.movieStoreHeroText}>
              <strong>{storeTitle}</strong>
              <span>{storeSubtitle}</span>
            </div>
          </div>
        </div>
      </section>
      <div className={styles.sectionHeader}>
        <h2>{resolvedMovieTextLabels[0]}</h2>
        <p>{resolvedMovieTextLabels[1]}</p>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formRow}>
          <label>{resolvedMovieTextLabels[2]}</label>
          <input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={resolvedMovieTextLabels[3]} />
        </div>
      </div>

      {shouldVirtualize ? (
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const startIndex = virtualItem.index * 2;
            const rowItems = movies.slice(startIndex, startIndex + 2);
            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                  paddingBottom: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <div className={styles.movieGrid}>
                  {rowItems.map((movie) => (
                    <button key={movie.id} className={styles.movieCard} onClick={() => onSelectMovie(movie)}>
                      <div className={styles.moviePoster} style={{ backgroundImage: toPosterBackground(movie.poster) }}>
                        <div className={styles.moviePosterMask} />
                        <Film size={22} />
                      </div>
                      <div className={styles.movieInfo}>
                        <strong>{movie.title}</strong>
                        <span>{movie.tagline}</span>
                        <em>{formatMoney(movie.price)} 起</em>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '12px' }}>
          {Array.from({ length: rowCount }).map((_, rowIndex) => {
            const startIndex = rowIndex * 2;
            const rowItems = movies.slice(startIndex, startIndex + 2);
            return (
              <div key={`movie-row-${rowIndex}`} className={styles.movieGrid}>
                {rowItems.map((movie) => (
                  <button key={movie.id} className={styles.movieCard} onClick={() => onSelectMovie(movie)}>
                    <div className={styles.moviePoster} style={{ backgroundImage: toPosterBackground(movie.poster) }}>
                      <div className={styles.moviePosterMask} />
                      <Film size={22} />
                    </div>
                    <div className={styles.movieInfo}>
                      <strong>{movie.title}</strong>
                      <span>{movie.tagline}</span>
                      <em>{formatMoney(movie.price)} 起</em>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

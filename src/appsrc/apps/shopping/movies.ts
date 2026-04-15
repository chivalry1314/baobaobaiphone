import type { ProductItem } from './types';
import type { Movie } from './uiTypes';
import { initialMovieProducts } from '../../shared/business/commerce/domain/seedProducts';

export const toMovie = (product: ProductItem): Movie => ({
  id: product.id,
  title: product.name,
  tagline: product.desc,
  price: product.price,
  poster: product.img || '',
});

export const defaultMovies: Movie[] = initialMovieProducts.map(toMovie);

export const toMovieStoreProducts = (storeId: string): ProductItem[] =>
  initialMovieProducts.map((movie) => ({
    ...movie,
    storeId,
  }));

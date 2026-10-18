import type { Title, TitleDto } from '../types';
import { mapCastMember } from './person-mapper';

export function normalizeId(id: string): string {
  return id.trim().toLowerCase();
}

export function mapTitle(dto: TitleDto): Title {
  return {
    id: normalizeId(dto.id),
    name: dto.title,
    synopsis: dto.synopsis,
    year: dto.release_year,
    genres: dto.genres,
    cast: dto.cast.map(mapCastMember).sort((a, b) => a.order - b.order),
    similarIds: dto.similar.map(normalizeId),
  };
}

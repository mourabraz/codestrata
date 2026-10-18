import type { CastMember, CastMemberDto } from '../types';
import { normalizeId } from './title-mapper';

export function mapCastMember(dto: CastMemberDto): CastMember {
  return {
    personId: normalizeId(dto.person_id),
    character: dto.character,
    order: dto.billing,
  };
}

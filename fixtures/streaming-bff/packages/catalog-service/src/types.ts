/** Title as returned by the catalog REST API. */
export interface TitleDto {
  id: string;
  title: string;
  synopsis: string | null;
  release_year: number | null;
  genres: string[];
  cast: CastMemberDto[];
  similar: string[];
}

export interface CastMemberDto {
  person_id: string;
  character: string | null;
  billing: number;
}

/** Title in the BFF domain model. */
export interface Title {
  id: string;
  name: string;
  synopsis: string | null;
  year: number | null;
  genres: string[];
  cast: CastMember[];
  similarIds: string[];
}

export interface CastMember {
  personId: string;
  character: string | null;
  order: number;
}

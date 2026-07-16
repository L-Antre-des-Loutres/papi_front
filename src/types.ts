// ── Pagination ───────────────────────────────────────────────────────────────

export interface Page<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
    first: boolean;
    last: boolean;
    numberOfElements: number;
    empty: boolean;
}

export interface PageQuery {
    page?: number;
    size?: number;
    sort?: string | string[];
}

// ── Enums ────────────────────────────────────────────────────────────────────

export type Language = 'FR' | 'EN';

export type Effectiveness =
    | 'EFFECTIVE'
    | 'SUPER_EFFECTIVE'
    | 'NOT_VERY_EFFECTIVE'
    | 'NO_EFFECT';

export type EggGroup =
    | 'MONSTER' | 'FAIRY' | 'DRAGON' | 'FLYING' | 'FIELD'
    | 'MINERAL' | 'GRASS' | 'BUG' | 'WATER_1' | 'WATER_2'
    | 'WATER_3' | 'HUMAN_LIKE' | 'AMORPHOUS' | 'DITTO' | 'NO_EGGS';

export type ExperienceGroup =
    | 'MEDIUM_FAST' | 'MEDIUM_SLOW' | 'FAST' | 'SLOW' | 'ERRATIC' | 'FLUCTUATING';

export type MoveLearnMethod = 'LEVEL_UP' | 'MACHINE' | 'EGG' | 'TUTOR';

// ── Translations ──────────────────────────────────────────────────────────────

export interface AbilityTranslation {
    id: number;
    language: Language;
    name: string;
    description: string;
}

export interface MoveTranslation {
    id: number;
    language: Language;
    name: string;
    description: string;
}

export interface PkmnTranslation {
    id: number;
    language: Language;
    pkmnName: string;
    formName: string;
    description: string;
}

export interface TypeTranslation {
    id: number;
    language: Language;
    name: string;
}

// ── Core models ───────────────────────────────────────────────────────────────

export interface Ability {
    id: number;
    symbol: string;
    lang?: AbilityTranslation[];
}

export interface Type {
    id: number;
    symbol: string;
    color: string;
    tags: string[];
    lang?: TypeTranslation[];
}

export interface Move {
    id: number;
    symbol: string;
    type: Type | null;
    power: number;
    accuracy: number;
    pp: number;
    lang?: MoveTranslation[];
}

export interface Moveset {
    id: number;
    move: Move;
    learnMethod: MoveLearnMethod;
    learnLevel: number | null;
}

export interface Pkmn {
    id: number;
    symbol: string;
    nationalDexNumber: number | null;
    primaryType: Type | null;
    secondaryType: Type | null;
    primaryAbility: Ability | null;
    secondaryAbility: Ability | null;
    hiddenAbility: Ability | null;
    tags: string[];
    height: number;
    weight: number;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeAttack: number;
    baseSpeDefense: number;
    baseSpeed: number;
    evHp: number;
    evAttack: number;
    evDefense: number;
    evSpeAttack: number;
    evSpeDefense: number;
    evSpeed: number;
    experienceYield: number;
    experienceGroup: ExperienceGroup | null;
    catchRate: number;
    maleRatio: number;
    eggCycles: number;
    eggGroups: EggGroup[];
    baseFriendship: number;
    lang?: PkmnTranslation[];
}

export interface TypeMatchup {
    id: number;
    attackingType: Type;
    defendingType: Type;
    effectiveness: Effectiveness;
}

export interface User {
    id: number;
    username: string;
    role: string;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
    username: string;
    password: string;
}

export interface MovesetRequest {
    moveId: number;
    learnMethod: MoveLearnMethod;
    learnLevel: number | null;
}

export interface PkmnUpdateDto {
    symbol: string;
    primaryTypeId: number | null;
    secondaryTypeId: number | null;
    primaryAbilityId: number | null;
    secondaryAbilityId: number | null;
    hiddenAbilityId: number | null;
    height: number;
    weight: number;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeAttack: number;
    baseSpeDefense: number;
    baseSpeed: number;
    evHp: number;
    evAttack: number;
    evDefense: number;
    evSpeAttack: number;
    evSpeDefense: number;
    evSpeed: number;
    experienceYield: number;
    experienceGroup: ExperienceGroup | null;
    baseFriendship: number;
    eggGroups: EggGroup[];
    eggCycles: number;
    catchRate: number;
    maleRatio: number;
    tags: string[];
}

export interface TypeMatchupDto {
    attackingTypeId: number;
    defendingTypeId: number;
    effectiveness: Effectiveness;
}

export interface ErrorResponse {
    status: number;
    error: string;
    message: string;
    timestamp: string;
}

// ── PkmnImage ─────────────────────────────────────────────────────────────────

export interface PkmnImage {
    id: number;
    url: string;
    name: string | null;
    tags: string[];
    main: boolean;
    addedAt: string;
}

export interface PkmnImageRequest {
    url: string;
    name?: string | null;
    tags?: string[] | null;
    main: boolean;
}

// ── Image generation ────────────────────────────────────────────────────────

export interface ImageResponse {
    filename: string;
    contentType: string;
    size: number;
    url: string;
}

export interface TemplateSummary {
    id: string;
    name: string;
}

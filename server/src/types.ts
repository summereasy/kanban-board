export type Column = {
  id: string;
  title: string;
  order: number;
};

export type Card = {
  /** 8-char nanoid */
  id: string;
  columnId: string;
  title: string;
  description: string;
  order: number;
};

export type Board = {
  columns: Column[];
  cards: Card[];
};

export type Project = {
  /** 8-char nanoid */
  id: string;
  name: string;
  createdAt: string;
};

export type Database = {
  projects: Project[];
  boards: Record<string, Board>;
};

export type Team = {
  id: string;
  name: string;
  score: number;
  active: boolean;
};

export type Quiz = {
  id: string;
  name: string;
  teams: Team[];
  started: boolean;
};

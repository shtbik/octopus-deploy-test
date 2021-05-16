export interface IReleaseRetentionProps {
  amountOfReleases: number;
}

export type TRetainedReleases = {
  [key: string]: {
    [key: string]: string[];
  };
};

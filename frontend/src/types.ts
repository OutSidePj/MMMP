export type MusicRequest = {
  prompt: string;
  bpm: number;
  duration: number;
  genre: string;
  mood: string;
  vocal: boolean;
  lyrics: string | null;
};

export type Generation = {
  id: string;
  status: "completed";
  audioUrl: string;
  title?: string;
  metadata: {
    bpm: number;
    duration: number;
    genre: string;
    mood: string;
  };
  createdAt?: string;
};


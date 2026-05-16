export type RootStackParamList = {
  Home: undefined;
  Scanner: undefined;
  Results:
    | {
        capturedFrames: number;
        processingMs: number;
        extractedMarkers: {
          dataUrl: string;
          width: number;
          height: number;
          sourceUri: string;
        }[];
      }
    | undefined;
};

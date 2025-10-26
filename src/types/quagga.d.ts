declare module "quagga" {
  export interface QuaggaConfig {
    inputStream: {
      type: string;
      target?: string | HTMLElement;
      constraints: MediaTrackConstraints;
    };
    decoder: { readers: string[] };
  }

  export interface CodeResult {
    code: string;
    format: string;
  }

  export interface QuaggaResult {
    codeResult?: CodeResult; // ← オプショナルに
    [key: string]: any;
  }

  export type InitCallback = (err: Error | null) => void;

  const Quagga: {
    init(config: QuaggaConfig, cb: InitCallback): void;
    start(): void;
    stop(): void;
    onDetected(cb: (result: QuaggaResult) => void): void;
  };

  export default Quagga;
}
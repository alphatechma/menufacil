declare module 'qz-tray' {
  interface QZ {
    websocket: {
      connect(options?: any): Promise<void>;
      disconnect(): Promise<void>;
      isActive(): boolean;
      setClosedCallbacks(callback: (evt?: any) => void): void;
      setErrorCallbacks(callback: (evt?: any) => void): void;
    };
    security: {
      setCertificatePromise(
        fn:
          | ((resolve: (cert: string) => void, reject: (err: any) => void) => void)
          | (() => Promise<string>)
          | Promise<string>,
      ): void;
      setSignatureAlgorithm(algorithm: string): void;
      setSignaturePromise(
        fn:
          | ((toSign: string) => (resolve: (sig: string) => void, reject: (err: any) => void) => void)
          | ((toSign: string) => Promise<string>),
      ): void;
    };
    printers: {
      find(query?: string): Promise<string | string[]>;
      getDefault(): Promise<string>;
    };
    configs: {
      create(printer: string, options?: any): any;
    };
    print(config: any, data: any[]): Promise<void>;
  }

  const qz: QZ;
  export default qz;
}

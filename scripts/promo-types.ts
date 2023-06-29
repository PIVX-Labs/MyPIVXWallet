export interface PromoWorker extends Worker {
    progress: string;
    key: Uint8Array;
    code: string;
}

export interface PromoThread {
    code: string;
    amount: number;
    thread: PromoWorker;
    txid: string;
    update: (this: PromoWorker, ev: MessageEvent<any>) => void;
    end_state: string;
    progress: any;
    key: any;
}

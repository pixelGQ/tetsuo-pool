export interface TetsuoRpcConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  wallet?: string;
}

export interface BlockchainInfo {
  chain: string;
  blocks: number;
  headers: number;
  bestblockhash: string;
  difficulty: number;
  initialblockdownload: boolean;
}

export interface Block {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  merkleroot: string;
  time: number;
  nonce: number;
  bits: string;
  difficulty: number;
  previousblockhash: string;
  nextblockhash?: string;
  tx: string[];
}

export interface Transaction {
  txid: string;
  confirmations: number;
  blockhash?: string;
  blockheight?: number;
  amount: number;
  fee?: number;
}

export interface WalletInfo {
  walletname: string;
  balance: number;
  unconfirmed_balance: number;
  txcount: number;
}

interface RpcResponse<T> {
  result: T;
  error: {
    code: number;
    message: string;
  } | null;
  id: number;
}

export class TetsuoRpc {
  private config: TetsuoRpcConfig;
  private idCounter = 0;

  constructor(config: TetsuoRpcConfig) {
    this.config = config;
  }

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const url = `http://${this.config.host}:${this.config.port}${
      this.config.wallet ? `/wallet/${this.config.wallet}` : ""
    }`;

    const auth = Buffer.from(`${this.config.user}:${this.config.pass}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        jsonrpc: "1.0",
        id: ++this.idCounter,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as RpcResponse<T>;

    if (data.error) {
      throw new Error(`RPC error: ${data.error.code} - ${data.error.message}`);
    }

    return data.result;
  }

  // Blockchain methods
  async getBlockchainInfo(): Promise<BlockchainInfo> {
    return this.call<BlockchainInfo>("getblockchaininfo");
  }

  async getBlockCount(): Promise<number> {
    return this.call<number>("getblockcount");
  }

  async getBestBlockHash(): Promise<string> {
    return this.call<string>("getbestblockhash");
  }

  async getBlockHash(height: number): Promise<string> {
    return this.call<string>("getblockhash", [height]);
  }

  async getBlock(hash: string, verbosity = 1): Promise<Block> {
    return this.call<Block>("getblock", [hash, verbosity]);
  }

  async getBlockByHeight(height: number): Promise<Block> {
    const hash = await this.getBlockHash(height);
    return this.getBlock(hash);
  }

  async getDifficulty(): Promise<number> {
    return this.call<number>("getdifficulty");
  }

  // Network methods
  async getNetworkHashPs(nblocks = 120, height = -1): Promise<number> {
    return this.call<number>("getnetworkhashps", [nblocks, height]);
  }

  async getConnectionCount(): Promise<number> {
    return this.call<number>("getconnectioncount");
  }

  // Wallet methods
  async getBalance(minconf = 1): Promise<number> {
    return this.call<number>("getbalance", ["*", minconf]);
  }

  async getNewAddress(label = ""): Promise<string> {
    return this.call<string>("getnewaddress", [label]);
  }

  async sendToAddress(address: string, amount: number, comment = ""): Promise<string> {
    return this.call<string>("sendtoaddress", [address, amount, comment]);
  }

  async getTransaction(txid: string): Promise<Transaction> {
    return this.call<Transaction>("gettransaction", [txid]);
  }

  async getWalletInfo(): Promise<WalletInfo> {
    return this.call<WalletInfo>("getwalletinfo");
  }

  async validateAddress(address: string): Promise<{ isvalid: boolean; address?: string }> {
    return this.call<{ isvalid: boolean; address?: string }>("validateaddress", [address]);
  }

  // Mining methods
  async getBlockTemplate(): Promise<unknown> {
    return this.call("getblocktemplate", [{ rules: ["segwit"] }]);
  }

  async submitBlock(hexdata: string): Promise<string | null> {
    return this.call<string | null>("submitblock", [hexdata]);
  }
}

export function createTetsuoRpc(config?: Partial<TetsuoRpcConfig>): TetsuoRpc {
  return new TetsuoRpc({
    host: config?.host ?? process.env.TETSUO_RPC_HOST ?? "127.0.0.1",
    port: config?.port ?? parseInt(process.env.TETSUO_RPC_PORT ?? "8337"),
    user: config?.user ?? process.env.TETSUO_RPC_USER ?? "",
    pass: config?.pass ?? process.env.TETSUO_RPC_PASS ?? "",
    wallet: config?.wallet ?? process.env.TETSUO_RPC_WALLET,
  });
}

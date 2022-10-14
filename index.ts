import { ApiPromise, WsProvider } from "@polkadot/api";
import { Codec } from "@polkadot/types-codec/types";
import { hexToNumber, hexToU8a, formatBalance } from "@polkadot/util";

// const ENDPOINT = "ws://localhost:9944/ws";
const ENDPOINT = "wss://rpc.parami.io/ws";

async function main() {
    await asset_price_in_five_days();
}

async function asset_price_in_five_days() {
    let api = await createApi();
    let assetIds = [7];
    let assetId2PriceList = new Map<any, any[]>();

    const lastHdr = await api.rpc.chain.getHeader();
    
    let curBlockNum = lastHdr.number.toBigInt();


    for (let assetId of assetIds) {
      assetId2PriceList.set(assetId, []);
      for (let i = 0; i < 5; i ++) {
          let blockNum = curBlockNum - BigInt(i * 24 * 60 * 5);
          const blockHash = await api.rpc.chain.getBlockHash(blockNum);
          console.log(`blockHash is ${blockHash}`);
          console.log(`current assetId is ${assetId}`);
          let price  = await (api.rpc as any).swap.drylySellTokens(assetId, 1n * 10n ** 18n, blockHash);
          console.log(`current price is ${price.toHuman()}`);
          let originValue = assetId2PriceList.get(assetId)||[];
          assetId2PriceList.set(assetId, [formatBalance(price.toHuman(), { withUnit: 'AD3', decimals: 18 }), ...originValue]);
      }
    }
    console.log(`asset_price_in_five_days: ${JSON.stringify(Object.fromEntries(assetId2PriceList), null, 2)}`)
}

async function state_call_ad_cal_reward() {
    let api = await createApi();
    let res = await api.call.adRuntimeApi.calReward("0x9cefa96e26ba9767a8c21fcc73d3b0912850e712b1a38945a1d2aaf8ccff5c58", 3, "0x5bc69eda41a4e6cf8b0a257b1c16b0d451eb95ee", null);
    let res1 = await api.call.nftRuntimeApi.getClaimInfo(5, "0x0278b9e643fdd9c38a76215f31c7030d9913c361");
    let res2 = await api.call.swapRuntimeApi.drylySellTokens(5, "100000000000000000000");
    console.log(`res is ${res.toHuman()}, ${res.toString()}`);
    console.log(`getClaimInfo is ${res1.toHuman()}`);
    console.log(`drylySellTokens is ${res2.toHuman()}`);
}

async function state_call_account_nounce() {
    let api = await createApi();
    
    const [gid, gau, non] = await Promise.all([
    (api as any).call.grandpaApi.currentSetId(),
    (api as any).call.grandpaApi.grandpaAuthorities(),
    (api as any).call.accountNonceApi.accountNonce('EQBwtmKWCyRrQ8yGWg7LkB8p7hpEKXZz4qUg9WR8hZmieCM')
    ]);

    console.log(
    'setId=', gid.toHuman(),
    'nonce=', non.toHuman(),
    'authorities=', gau.toHuman()
    );
}

async function loadLinkEntries() {
    let apiWs = await createApi();
    console.log("start searching");
    const entries = await apiWs.query.linker.linksOf.entries();
    console.log("loaded all entries");

    entries.forEach(([{args: [did, network]}, value]) => {
        console.log("found: ", did.toHuman(), value.toHuman(), network.toHuman());
    })

    console.log("done searching");
}

async function createApi(): Promise<ApiPromise> {
    const providerWs = new WsProvider(ENDPOINT);
    
    let apiWs = await ApiPromise.create({ 
        provider: providerWs,
        runtime: {
            AccountNonceApi: [
              {
                methods: {
                  account_nonce: {
                    description: 'The API to query account nonce (aka transaction index)',
                    params: [
                      {
                        name: 'accountId',
                        type: 'AccountId'
                      }
                    ],
                    type: 'Index'
                  }
                },
                version: 3
              }
            ],
            GrandpaApi: [
              {
                methods: {
                  current_set_id: {
                    description: 'Get current GRANDPA authority set id.',
                    params: [],
                    type: 'SetId'
                  },
                  grandpa_authorities: {
                    description: 'Get the current GRANDPA authorities and weights. This should not change except for when changes are scheduled and the corresponding delay has passed.',
                    params: [],
                    type: 'AuthorityList'
                  }
                },
                version: 3
              }
            ],
            SwapRuntimeApi: [
              {
                methods: {
                  dryly_add_liquidity: {
                    description: 'Dryly add liquidity to the pool',
                    params: [
                      {
                        // Token ID
                        name: 'token_id',
                        type: 'u64',
                      },
                      {
                        //  AD3
                        name: 'currency',
                        type: 'String',
                      },
                      {
                        //  max_tokens=  0
                        name: 'max_tokens',
                        type: 'String',
                      },
                    ],
                    // Token Balance, LP* Balance
                    type: '(String, String)',
                  },
                  dryly_remove_liquidity: {
                    description: 'Dryly remove liquidity from the pool',
                    params: [
                      {
                        // Token ID
                        name: 'lp_token_id',
                        type: 'u64',
                      },
                    ],
                    // Token ID, LP* Balance, Token Balance, AD3 Balance
                    type: '(u64, String, String, String)',
                  },
                  dryly_buy_tokens: {
                    description: 'Dryly buy tokens from the pool',
                    params: [
                      {
                        // Token ID
                        name: 'token_id',
                        type: 'u64',
                      },
                      {
                        // Token amount
                        name: 'tokens',
                        type: 'String',
                      }
                    ],
                    // AD3 needed
                    type: 'String',
                  },
                  dryly_sell_tokens: {
                    description: 'Dryly sell tokens to the pool',
                    params: [
                      {
                        // Token ID
                        name: 'token_id',
                        type: 'u32',
                      },
                      {
                        //  Token amount
                        name: 'tokens',
                        type: 'Balance',
                      }
                    ],
                    //  AD3 Balance
                    type: 'Balance',
                  },
                  drylySellCurrency: {
                    description: 'Dryly sell currency to the pool',
                    params: [
                      {
                        // Token ID
                        name: 'token_id',
                        type: 'u64',
                      },
                      {
                        //  AD3
                        name: 'currency',
                        type: 'String',
                      },
                      {
                        // RPC igonre
                        name: 'at',
                        type: 'Hash',
                      },
                    ],
                    //  Token
                    type: 'String',
                  },
                  drylyBuyCurrency: {
                    description: 'Dryly buy currency from the pool',
                    params: [
                      {
                        // Token ID
                        name: 'token_id',
                        type: 'u64',
                      },
                      {
                        //  AD3
                        name: 'currency',
                        type: 'String',
                      },
                      {
                        // RPC igonre
                        name: 'at',
                        type: 'Hash',
                      },
                    ],
                    //  Token
                    type: 'String',
                  },
                  calculateReward: {
                    description: 'Calculate staking reward',
                    params: [
                      {
                        // Token ID
                        name: 'lp_token_id',
                        type: 'u64',
                      },
                      {
                        // RPC igonre
                        name: 'at',
                        type: 'Hash',
                      },
                    ],
                    //  Token
                    type: 'Compact(Balance)',
                  },
                },
                version: 1
              }
            ],
            NftRuntimeApi: [
              {
                methods: {
                  get_claim_info: {
                    description: 'getClaimInfo',
                    params: [
                      {
                        name: 'nft_id',
                        type: 'u32',
                      },
                      {
                        name: 'claimer',
                        type: 'H160',
                      }
                    ],
                    type: '(String, String, String)',
                  }, 
                },
                version: 1
              }
            ],
            AdRuntimeApi: [
                {
                    methods: {
                        cal_reward: {
                            description: 'pre calculate reward of this did, adId, nftId pair',
                            params: [
                                {
                                    name: 'ad_id',
                                    type: 'H256',
                                },
                                {
                                    name: 'nft_id',
                                    type: 'u32',
                                },
                                {
                                    name: 'visitor',
                                    type: 'H160',
                                },
                                {
                                    name: 'referrer',
                                    type: 'Option<H160>',
                                }
                            ],
                            type: 'String',
                        }
                    },
                    version: 1
                }
            ]
          },
          rpc: {
            did: {
              getMetadata: {
                description: 'Get metadata of a DID',
                params: [
                  {
                    // DID
                    name: 'did',
                    type: 'H160',
                  },
                  {
                    // Meta key
                    name: 'key',
                    type: 'String',
                  },
                  {
                    // RPC ignore
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                // Meta value
                type: 'String',
              },
              batchGetMetadata: {
                description: 'Get metadata of a DID',
                params: [
                  {
                    // DID
                    name: 'did',
                    type: 'H160',
                  },
                  {
                    // List of meta keys
                    name: 'keys',
                    type: 'Vec<String>',
                  },
                  {
                    // RPC ignore
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                // List of meta values
                type: 'Vec<String>',
              },
            } as any,
            nft: {
              getClaimInfo: {
                description: 'getClaimInfo',
                params: [
                  {
                    name: 'nft_id',
                    type: 'u64',
                  },
                  {
                    name: 'claimer',
                    type: 'H160',
                  }
                ],
                type: '(String, String, String)',
              }
            } as any,
            swap: {
              drylyAddLiquidity: {
                description: 'Dryly add liquidity to the pool',
                params: [
                  {
                    // Token ID
                    name: 'token_id',
                    type: 'u64',
                  },
                  {
                    //  AD3
                    name: 'currency',
                    type: 'String',
                  },
                  {
                    //  max_tokens=  0
                    name: 'max_tokens',
                    type: 'String',
                  },
                  {
                    // RPC ignore
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                // Token Balance, LP* Balance
                type: '(String, String)',
              },
              drylyRemoveLiquidity: {
                description: 'Dryly remove liquidity from the pool',
                params: [
                  {
                    // Token ID
                    name: 'lp_token_id',
                    type: 'u64',
                  },
                  {
                    // RPC igonre
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                // Token ID, LP* Balance, Token Balance, AD3 Balance
                type: '(u64, String, String, String)',
              },
              drylyBuyTokens: {
                description: 'Dryly buy tokens from the pool',
                params: [
                  {
                    // Token ID
                    name: 'token_id',
                    type: 'u64',
                  },
                  {
                    // Token amount
                    name: 'tokens',
                    type: 'String',
                  },
                  {
                    // RPC igonre
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                // AD3 needed
                type: 'String',
              },
              drylySellTokens: {
                description: 'Dryly sell tokens to the pool',
                params: [
                  {
                    // Token ID
                    name: 'token_id',
                    type: 'u32',
                  },
                  {
                    //  Token amount
                    name: 'tokens',
                    type: 'String',
                  },
                  {
                    // RPC igonre
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                //  AD3 Balance
                type: 'String',
              },
              drylySellCurrency: {
                description: 'Dryly sell currency to the pool',
                params: [
                  {
                    // Token ID
                    name: 'token_id',
                    type: 'u64',
                  },
                  {
                    //  AD3
                    name: 'currency',
                    type: 'String',
                  },
                  {
                    // RPC igonre
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                //  Token
                type: 'String',
              },
              drylyBuyCurrency: {
                description: 'Dryly buy currency from the pool',
                params: [
                  {
                    // Token ID
                    name: 'token_id',
                    type: 'u64',
                  },
                  {
                    //  AD3
                    name: 'currency',
                    type: 'String',
                  },
                  {
                    // RPC igonre
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                //  Token
                type: 'String',
              },
              calculateReward: {
                description: 'Calculate staking reward',
                params: [
                  {
                    // Token ID
                    name: 'lp_token_id',
                    type: 'u64',
                  },
                  {
                    // RPC igonre
                    name: 'at',
                    type: 'Hash',
                    isOptional: true,
                  },
                ],
                //  Token
                type: 'Compact(Balance)',
              },
            },
          },
    });
    await apiWs.isReady;
    return apiWs;
}

main().catch((err) => console.error(err));


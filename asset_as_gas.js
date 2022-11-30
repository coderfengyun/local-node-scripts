"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("@polkadot/api");
const config_json_1 = __importDefault(require("./config.json"));
const ENDPOINT = "ws://localhost:9944/ws";
async function main() {
    await contructSignedExtra();
}
async function contructSignedExtra() {
    const apiWs = await createApi();
    let sudoMnemonic = config_json_1.default['sudoMnemonic'];
    const keyring = new api_1.Keyring({ type: "sr25519" });
    const sudo = keyring.addFromUri(sudoMnemonic);
    await apiWs.tx.sudo.sudo(apiWs.tx.assets.forceCreate(10, sudo.address, true, 1000000n * 10n ** 18n)).signAndSend(sudo);
    // const ex = apiWs.tx.linker.linkSociality('Ethereum', '0x884FabC1D7C8d43A9639672690eD20F5f4cC16e1');
    // await ex.signAndSend(sudo, {assetId: 10});
}
async function createApi() {
    const providerWs = new api_1.WsProvider(ENDPOINT);
    let apiWs = await api_1.ApiPromise.create({
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
            },
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
            },
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

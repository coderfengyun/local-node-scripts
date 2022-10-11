import { ApiPromise, WsProvider } from "@polkadot/api";
import { Codec } from "@polkadot/types-codec/types";
import { hexToNumber, hexToU8a } from "@polkadot/util";

const ENDPOINT = "ws://localhost:9944/ws";
// const ENDPOINT = "wss://rpc.parami.io/ws";

async function main() {
    await state_call_ad_cal_reward();
}

async function state_call_ad_cal_reward() {
    let api = await createApi();
    let res = await api.call.adRuntimeApi.calReward("0xbfd45ecbd972a88ab3cc15f858015e82456bf22916db11c9f073f003759dddfc", 42, "0x5df7305540f04f4b99cb911593e334df531d53a6", null);
    console.log(`res is ${res.toHuman()}`);
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
                            type: 'u128'
                        }
                    },
                    version: 1
                }
            ]
          }
    });
    await apiWs.isReady;
    return apiWs;
}

main().catch((err) => console.error(err));


// Constants.mo
// Mainnet configuration for IC SPICY Modular Dapp
// Real mainnet canister IDs and admin principals

import Principal "mo:base/Principal";

module {
  public let ADMIN_PRINCIPAL_TEXT : Text = "lgd5r-y4x7q-lbrfa-mabgw-xurgu-4h3at-sw4sl-yyr3k-5kwgt-vlkao-jae";
  public func ADMIN_PRINCIPAL() : Principal { Principal.fromText(ADMIN_PRINCIPAL_TEXT) };
  // Additional admin principal (e.g., OISY wallet principal for the same admin)
  public let ADMIN_OISY_PRINCIPAL_TEXT : Text = "yyirv-5pjkg-oupac-gzja4-ljzfn-6mvon-r5w2i-6e7wm-sde75-wuses-nqe";
  public func ADMIN_OISY_PRINCIPAL() : Principal { Principal.fromText(ADMIN_OISY_PRINCIPAL_TEXT) };
  // NFID wallet principals for the same admin
  public let ADMIN_NFID_PRINCIPAL_TEXT : Text = "2trnz-yo65l-waa2z-alhn3-ip5ob-eweh7-c464w-utzem-fmwrr-ih7ma-hqe";
  public func ADMIN_NFID_PRINCIPAL() : Principal { Principal.fromText(ADMIN_NFID_PRINCIPAL_TEXT) };
  public let ADMIN_NFID2_PRINCIPAL_TEXT : Text = "hd54c-crxgi-574kw-thrtf-yw4xx-xs3hl-t44h3-viz6c-qlb5u-3wnbt-nqe";
  public func ADMIN_NFID2_PRINCIPAL() : Principal { Principal.fromText(ADMIN_NFID2_PRINCIPAL_TEXT) };
  public let CHILI_CANISTER_ID : Text = "l3hu7-laaaa-aaaap-qp5mq-cai";
  public let GAME_CANISTER_ID : Text = "lvfzx-qqaaa-aaaap-qp5nq-cai";
  public let MEMBERSHIP_CANISTER_ID : Text = "laci2-ryaaa-aaaap-qp5oa-cai";
  public let PORTAL_CANISTER_ID : Text = "lhdoo-4aaaa-aaaap-qp5oq-cai";
  public let PROFILE_CANISTER_ID : Text = "loafs-kiaaa-aaaap-qp5pa-cai";
  public let SHOP_CANISTER_ID : Text = "ljbdg-hqaaa-aaaap-qp5pq-cai";
  public let USER_CANISTER_ID : Text = "os37x-baaaa-aaaap-qp5qq-cai";
  public let WALLET_CANISTER_ID : Text = "o3yul-xiaaa-aaaap-qp5ra-cai";
  public let WALLET2_CANISTER_ID : Text = "o3yul-xiaaa-aaaap-qp5ra-cai";
  public let WHITEPAPER_CANISTER_ID : Text = "o4zs7-2qaaa-aaaap-qp5rq-cai";
  // Add more as needed
} 
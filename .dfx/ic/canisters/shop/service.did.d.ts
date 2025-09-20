import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Product {
  'id' : bigint,
  'image_url' : [] | [string],
  'icon' : string,
  'name' : string,
  'description' : string,
  'stock' : bigint,
  'category' : string,
  'rarity' : string,
  'price' : bigint,
}
export interface Purchase {
  'id' : bigint,
  'product_id' : bigint,
  'purchased_at' : bigint,
  'redeemed' : boolean,
  'user' : Principal,
  'product_name' : string,
  'redeemed_at' : [] | [bigint],
  'price' : bigint,
}
export interface _SERVICE {
  'addProduct' : ActorMethod<
    [string, bigint, string, bigint, string, string, string, [] | [string]],
    bigint
  >,
  'getAvailableProducts' : ActorMethod<[], Array<Product>>,
  'getProduct' : ActorMethod<[bigint], [] | [Product]>,
  'getShopStats' : ActorMethod<
    [],
    {
      'total_products' : bigint,
      'total_revenue' : bigint,
      'total_purchases' : bigint,
    }
  >,
  'getUserPurchases' : ActorMethod<[Principal], Array<Purchase>>,
  'purchaseProduct' : ActorMethod<[Principal, bigint, bigint], boolean>,
  'redeemNFT' : ActorMethod<[Principal, bigint], boolean>,
  'updateProductStock' : ActorMethod<[bigint, bigint], boolean>,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];

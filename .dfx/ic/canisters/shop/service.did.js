export const idlFactory = ({ IDL }) => {
  const Product = IDL.Record({
    'id' : IDL.Nat,
    'image_url' : IDL.Opt(IDL.Text),
    'icon' : IDL.Text,
    'name' : IDL.Text,
    'description' : IDL.Text,
    'stock' : IDL.Nat,
    'category' : IDL.Text,
    'rarity' : IDL.Text,
    'price' : IDL.Nat,
  });
  const Purchase = IDL.Record({
    'id' : IDL.Nat,
    'product_id' : IDL.Nat,
    'purchased_at' : IDL.Int,
    'redeemed' : IDL.Bool,
    'user' : IDL.Principal,
    'product_name' : IDL.Text,
    'redeemed_at' : IDL.Opt(IDL.Int),
    'price' : IDL.Nat,
  });
  return IDL.Service({
    'addProduct' : IDL.Func(
        [
          IDL.Text,
          IDL.Nat,
          IDL.Text,
          IDL.Nat,
          IDL.Text,
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
        ],
        [IDL.Nat],
        [],
      ),
    'getAvailableProducts' : IDL.Func([], [IDL.Vec(Product)], ['query']),
    'getProduct' : IDL.Func([IDL.Nat], [IDL.Opt(Product)], ['query']),
    'getShopStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_products' : IDL.Nat,
            'total_revenue' : IDL.Nat,
            'total_purchases' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getUserPurchases' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(Purchase)],
        ['query'],
      ),
    'purchaseProduct' : IDL.Func(
        [IDL.Principal, IDL.Nat, IDL.Nat],
        [IDL.Bool],
        [],
      ),
    'redeemNFT' : IDL.Func([IDL.Principal, IDL.Nat], [IDL.Bool], []),
    'updateProductStock' : IDL.Func([IDL.Nat, IDL.Nat], [IDL.Bool], []),
  });
};
export const init = ({ IDL }) => { return []; };

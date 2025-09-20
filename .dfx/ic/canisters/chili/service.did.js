export const idlFactory = ({ IDL }) => {
  const ChiliNFT = IDL.Record({
    'id' : IDL.Nat,
    'image_url' : IDL.Opt(IDL.Text),
    'owner' : IDL.Principal,
    'name' : IDL.Text,
    'heat_level' : IDL.Nat,
    'description' : IDL.Text,
    'attributes' : IDL.Vec(IDL.Text),
    'rarity' : IDL.Text,
    'variety' : IDL.Text,
    'minted_at' : IDL.Int,
  });
  const ChiliFact = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'source' : IDL.Text,
    'fact' : IDL.Text,
    'timestamp' : IDL.Int,
    'category' : IDL.Text,
  });
  const ChiliVariety = IDL.Record({
    'shu' : IDL.Nat,
    'fruit_size' : IDL.Text,
    'days_to_maturity' : IDL.Nat,
    'name' : IDL.Text,
    'origin' : IDL.Text,
    'growing_difficulty' : IDL.Text,
    'flavor_profile' : IDL.Text,
    'plant_height' : IDL.Text,
  });
  return IDL.Service({
    'addChiliFact' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Text, IDL.Text],
        [IDL.Nat],
        [],
      ),
    'getAllChiliNFTs' : IDL.Func([], [IDL.Vec(ChiliNFT)], ['query']),
    'getChiliFacts' : IDL.Func([], [IDL.Vec(ChiliFact)], ['query']),
    'getChiliNFT' : IDL.Func([IDL.Nat], [IDL.Opt(ChiliNFT)], ['query']),
    'getChiliStats' : IDL.Func(
        [],
        [
          IDL.Record({
            'total_varieties' : IDL.Nat,
            'total_nfts' : IDL.Nat,
            'total_owners' : IDL.Nat,
            'total_facts' : IDL.Nat,
          }),
        ],
        ['query'],
      ),
    'getChiliVarieties' : IDL.Func([], [IDL.Vec(ChiliVariety)], ['query']),
    'getChiliVariety' : IDL.Func(
        [IDL.Text],
        [IDL.Opt(ChiliVariety)],
        ['query'],
      ),
    'getNFTsByRarity' : IDL.Func([IDL.Text], [IDL.Vec(ChiliNFT)], ['query']),
    'getNFTsByVariety' : IDL.Func([IDL.Text], [IDL.Vec(ChiliNFT)], ['query']),
    'getUserChiliNFTs' : IDL.Func(
        [IDL.Principal],
        [IDL.Vec(ChiliNFT)],
        ['query'],
      ),
    'mintChiliNFT' : IDL.Func(
        [
          IDL.Text,
          IDL.Text,
          IDL.Nat,
          IDL.Text,
          IDL.Text,
          IDL.Opt(IDL.Text),
          IDL.Vec(IDL.Text),
        ],
        [IDL.Nat],
        [],
      ),
    'transferChiliNFT' : IDL.Func([IDL.Nat, IDL.Principal], [IDL.Bool], []),
  });
};
export const init = ({ IDL }) => { return []; };

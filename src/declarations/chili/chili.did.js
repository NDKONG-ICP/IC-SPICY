export const idlFactory = ({ IDL }) => {
  const ChiliFact = IDL.Record({
    'id' : IDL.Nat,
    'title' : IDL.Text,
    'fact' : IDL.Text,
    'author' : IDL.Text,
    'timestamp' : IDL.Int,
  });
  return IDL.Service({
    'add_fact' : IDL.Func([IDL.Text, IDL.Text, IDL.Text], [IDL.Nat], []),
    'get_chili_fact' : IDL.Func([], [IDL.Text], []),
    'get_fact' : IDL.Func([IDL.Nat], [IDL.Opt(ChiliFact)], ['query']),
    'list_facts' : IDL.Func([], [IDL.Vec(ChiliFact)], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };

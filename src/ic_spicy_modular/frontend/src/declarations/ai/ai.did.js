export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'ask_ai' : IDL.Func([IDL.Text], [IDL.Text], ['query']),
  });
};
export const init = ({ IDL }) => { return []; };

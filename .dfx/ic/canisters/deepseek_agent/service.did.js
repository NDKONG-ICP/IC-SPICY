export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'ask_deepseek' : IDL.Func([IDL.Text], [IDL.Text], []),
    'clear_gateway_url' : IDL.Func([], [IDL.Text], []),
    'get_gateway_url' : IDL.Func([], [IDL.Opt(IDL.Text)], ['query']),
    'greet' : IDL.Func([], [IDL.Text], ['query']),
    'has_api_key' : IDL.Func([], [IDL.Bool], ['query']),
    'set_api_key' : IDL.Func([IDL.Text], [IDL.Text], []),
    'set_gateway_url' : IDL.Func([IDL.Text], [IDL.Text], []),
  });
};
export const init = ({ IDL }) => { return []; };
